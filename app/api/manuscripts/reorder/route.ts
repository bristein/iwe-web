import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getManuscriptsCollection, getProjectsCollection } from '@/lib/mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { manuscriptReorderSchema } from '@/lib/validation/manuscript';
import { ZodError } from 'zod';

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
    const validatedData = manuscriptReorderSchema.parse(body);

    const collection = await getManuscriptsCollection();
    const projectsCollection = await getProjectsCollection();

    const sectionIds = validatedData.items.map((item) => new ObjectId(item.id));

    const sections = await collection.find({ _id: { $in: sectionIds } }).toArray();

    if (sections.length !== validatedData.items.length) {
      return NextResponse.json({ error: 'Some sections not found' }, { status: 404 });
    }

    const projectIds = [...new Set(sections.map((s) => s.projectId.toString()))];

    if (projectIds.length !== 1) {
      return NextResponse.json(
        { error: 'All sections must belong to the same project' },
        { status: 400 }
      );
    }

    const project = await projectsCollection.findOne({
      _id: new ObjectId(projectIds[0]),
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Use a transaction for atomic reordering
    const client = await clientPromise;
    const session = client.startSession();

    try {
      const result = await session.withTransaction(async () => {
        const bulkOps = validatedData.items.map((item) => ({
          updateOne: {
            filter: { _id: new ObjectId(item.id) },
            update: {
              $set: {
                order: item.order,
                ...(item.parentId !== undefined && {
                  parentId: item.parentId ? new ObjectId(item.parentId) : null,
                }),
                updatedAt: new Date(),
              },
            },
          },
        }));

        const writeResult = await collection.bulkWrite(bulkOps, { session });

        return {
          message: 'Sections reordered successfully',
          modified: writeResult.modifiedCount,
        };
      });

      return NextResponse.json(result);
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error reordering manuscript sections:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
