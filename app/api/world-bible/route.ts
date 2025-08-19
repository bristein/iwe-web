import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getWorldBiblesCollection, getProjectsCollection } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { worldBibleInputSchema, worldBibleSearchSchema } from '@/lib/validation/world-bible';
import { WorldBible } from '@/lib/models/world-bible';
import { ZodError } from 'zod';

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
    const validatedSearch = worldBibleSearchSchema.parse(searchParams);

    const collection = await getWorldBiblesCollection();
    const projectsCollection = await getProjectsCollection();

    const query: Record<string, unknown> = {};

    if (validatedSearch.projectId) {
      const project = await projectsCollection.findOne({
        _id: new ObjectId(validatedSearch.projectId),
        userId: new ObjectId(user.userId),
      });

      if (!project) {
        return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
      }

      query.projectId = new ObjectId(validatedSearch.projectId);
    } else {
      const userProjects = await projectsCollection
        .find({ userId: new ObjectId(user.userId) })
        .project({ _id: 1 })
        .toArray();

      query.projectId = { $in: userProjects.map((p) => p._id) };
    }

    if (validatedSearch.category) {
      query.category = validatedSearch.category;
    }

    if (validatedSearch.tags && validatedSearch.tags.length > 0) {
      query.tags = { $in: validatedSearch.tags };
    }

    if (validatedSearch.query) {
      query.$text = { $search: validatedSearch.query };
    }

    const documents = await collection
      .find(query)
      .sort({ updatedAt: -1 })
      .skip(validatedSearch.skip)
      .limit(validatedSearch.limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return NextResponse.json({
      documents,
      total,
      skip: validatedSearch.skip,
      limit: validatedSearch.limit,
    });
  } catch (error) {
    console.error('Error fetching world bible documents:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = worldBibleInputSchema.parse(body);

    const projectsCollection = await getProjectsCollection();
    const project = await projectsCollection.findOne({
      _id: new ObjectId(validatedData.projectId),
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    const collection = await getWorldBiblesCollection();

    const newDocument: WorldBible = {
      projectId: new ObjectId(validatedData.projectId),
      title: validatedData.title,
      category: validatedData.category,
      content: validatedData.content,
      frontmatter: validatedData.frontmatter,
      metadata: validatedData.metadata
        ? {
            ...validatedData.metadata,
            relatedDocuments: validatedData.metadata.relatedDocuments?.map(
              (id) => new ObjectId(id)
            ),
          }
        : undefined,
      tags: validatedData.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newDocument);

    return NextResponse.json(
      {
        id: result.insertedId,
        ...newDocument,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating world bible document:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
