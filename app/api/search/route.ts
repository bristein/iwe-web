import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import {
  getWorldBiblesCollection,
  getManuscriptsCollection,
  getProjectsCollection,
} from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z, ZodError } from 'zod';
import { createMongoRegexQuery } from '@/lib/utils/regex-escape';

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  projectId: z.string().optional(),
  type: z.enum(['all', 'worldbible', 'manuscript']).default('all'),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
});

interface SearchResult {
  _id: ObjectId;
  type: 'worldbible' | 'manuscript';
  title: string;
  excerpt: string;
  projectId: ObjectId;
  category?: string;
  status?: string;
  score?: number;
}

export async function GET(request: NextRequest) {
  const identifier =
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
  if (!checkRateLimit(identifier)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let user;
    try {
      user = await verifyToken(authToken);
    } catch (error) {
      console.error('Auth verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedSearch = searchSchema.parse(searchParams);

    const projectsCollection = await getProjectsCollection();

    let projectIds: ObjectId[];

    if (validatedSearch.projectId) {
      const project = await projectsCollection.findOne({
        _id: new ObjectId(validatedSearch.projectId),
        userId: new ObjectId(user.userId),
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
      }

      projectIds = [new ObjectId(validatedSearch.projectId)];
    } else {
      const userProjects = await projectsCollection
        .find({ userId: new ObjectId(user.userId) })
        .project({ _id: 1 })
        .toArray();

      projectIds = userProjects.map((p) => p._id);
    }

    const results: SearchResult[] = [];

    const createExcerpt = (text: string, query: string, maxLength = 200): string => {
      if (!text) return '';

      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const index = lowerText.indexOf(lowerQuery);

      if (index === -1) {
        return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
      }

      const start = Math.max(0, index - 50);
      const end = Math.min(text.length, index + query.length + 150);

      let excerpt = text.substring(start, end);

      if (start > 0) excerpt = '...' + excerpt;
      if (end < text.length) excerpt = excerpt + '...';

      return excerpt;
    };

    if (validatedSearch.type === 'all' || validatedSearch.type === 'worldbible') {
      const worldBibleCollection = await getWorldBiblesCollection();

      const regexQuery = createMongoRegexQuery(validatedSearch.query);
      const worldBibleQuery: Record<string, unknown> = {
        projectId: { $in: projectIds },
        $or: [
          { title: regexQuery },
          { content: regexQuery },
          { tags: { $in: [validatedSearch.query] } },
        ],
      };

      const worldBibleDocs = await worldBibleCollection
        .find(worldBibleQuery)
        .limit(
          validatedSearch.type === 'worldbible'
            ? validatedSearch.limit
            : Math.floor(validatedSearch.limit / 2)
        )
        .skip(validatedSearch.type === 'worldbible' ? validatedSearch.skip : 0)
        .toArray();

      for (const doc of worldBibleDocs) {
        results.push({
          _id: doc._id!,
          type: 'worldbible',
          title: doc.title,
          excerpt: createExcerpt(doc.content, validatedSearch.query),
          projectId: doc.projectId,
          category: doc.category,
        });
      }
    }

    if (validatedSearch.type === 'all' || validatedSearch.type === 'manuscript') {
      const manuscriptCollection = await getManuscriptsCollection();

      const regexQuery = createMongoRegexQuery(validatedSearch.query);
      const manuscriptQuery: Record<string, unknown> = {
        projectId: { $in: projectIds },
        $or: [{ title: regexQuery }, { outline: regexQuery }, { draft: regexQuery }],
      };

      const manuscriptDocs = await manuscriptCollection
        .find(manuscriptQuery)
        .limit(
          validatedSearch.type === 'manuscript'
            ? validatedSearch.limit
            : Math.floor(validatedSearch.limit / 2)
        )
        .skip(validatedSearch.type === 'manuscript' ? validatedSearch.skip : 0)
        .toArray();

      for (const doc of manuscriptDocs) {
        const content = doc.draft || doc.outline || '';
        results.push({
          _id: doc._id!,
          type: 'manuscript',
          title: doc.title,
          excerpt: createExcerpt(content, validatedSearch.query),
          projectId: doc.projectId,
          status: doc.status,
        });
      }
    }

    const projects = await projectsCollection
      .find({ _id: { $in: [...new Set(results.map((r) => r.projectId))] } })
      .project({ title: 1, _id: 1 })
      .toArray();

    const projectMap = new Map(projects.map((p) => [p._id.toString(), p.title]));

    const enrichedResults = results.map((result) => ({
      ...result,
      projectTitle: projectMap.get(result.projectId.toString()) || 'Unknown Project',
    }));

    return NextResponse.json({
      results: enrichedResults,
      total: results.length,
      query: validatedSearch.query,
      type: validatedSearch.type,
    });
  } catch (error) {
    console.error('Error searching content:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
