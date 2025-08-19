import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getManuscriptsCollection, getProjectsCollection } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { Manuscript } from '@/lib/models/manuscript';

interface ManuscriptNode extends Manuscript {
  children?: ManuscriptNode[];
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
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId || !ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Valid project ID is required' }, { status: 400 });
    }

    const projectsCollection = await getProjectsCollection();
    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectId),
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    const collection = await getManuscriptsCollection();

    const sections = (await collection
      .find({ projectId: new ObjectId(projectId) })
      .sort({ order: 1, createdAt: 1 })
      .toArray()) as Manuscript[];

    const buildTree = (sections: Manuscript[], parentId?: ObjectId): ManuscriptNode[] => {
      const tree: ManuscriptNode[] = [];

      for (const section of sections) {
        const sectionParentId = section.parentId?.toString();
        const compareParentId = parentId?.toString();

        if (sectionParentId === compareParentId) {
          const node: ManuscriptNode = {
            ...section,
            children: buildTree(sections, section._id),
          };

          if (node.children?.length === 0) {
            delete node.children;
          }

          tree.push(node);
        }
      }

      return tree;
    };

    const tree = buildTree(sections);

    const stats = {
      totalSections: sections.length,
      totalWords: sections.reduce((sum, s) => sum + s.wordCount, 0),
      byStatus: {
        outline: sections.filter((s) => s.status === 'outline').length,
        drafting: sections.filter((s) => s.status === 'drafting').length,
        revision: sections.filter((s) => s.status === 'revision').length,
        complete: sections.filter((s) => s.status === 'complete').length,
      },
      byType: {
        chapter: sections.filter((s) => s.type === 'chapter').length,
        scene: sections.filter((s) => s.type === 'scene').length,
        act: sections.filter((s) => s.type === 'act').length,
        section: sections.filter((s) => s.type === 'section').length,
      },
    };

    return NextResponse.json({
      tree,
      stats,
    });
  } catch (error) {
    console.error('Error fetching manuscript tree:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
