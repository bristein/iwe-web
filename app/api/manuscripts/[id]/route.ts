import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getManuscriptsCollection, getProjectsCollection } from '@/lib/mongodb';
import clientPromise from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { manuscriptUpdateSchema } from '@/lib/validation/manuscript';
import { calculateWordCount } from '@/lib/models/manuscript';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
    }

    const collection = await getManuscriptsCollection();
    const projectsCollection = await getProjectsCollection();

    const section = await collection.findOne({ _id: new ObjectId(id) });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: section.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error fetching manuscript section:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = manuscriptUpdateSchema.parse(body);

    const collection = await getManuscriptsCollection();
    const projectsCollection = await getProjectsCollection();

    const existingSection = await collection.findOne({ _id: new ObjectId(id) });

    if (!existingSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: existingSection.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (validatedData.parentId !== undefined) {
      if (validatedData.parentId) {
        const parent = await collection.findOne({
          _id: new ObjectId(validatedData.parentId),
          projectId: existingSection.projectId,
        });

        if (!parent) {
          return NextResponse.json({ error: 'Parent section not found' }, { status: 404 });
        }

        if (id === validatedData.parentId) {
          return NextResponse.json({ error: 'Section cannot be its own parent' }, { status: 400 });
        }
      }
    }

    const outline =
      validatedData.outline !== undefined ? validatedData.outline : existingSection.outline;
    const draft = validatedData.draft !== undefined ? validatedData.draft : existingSection.draft;
    const wordCount = calculateWordCount(outline) + calculateWordCount(draft);

    const updateData: Record<string, unknown> = {
      ...validatedData,
      wordCount,
      updatedAt: new Date(),
    };

    if (validatedData.parentId !== undefined) {
      updateData.parentId = validatedData.parentId ? new ObjectId(validatedData.parentId) : null;
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'No changes made' }, { status: 304 });
    }

    const updatedSection = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedSection);
  } catch (error) {
    console.error('Error updating manuscript section:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid section ID' }, { status: 400 });
    }

    const collection = await getManuscriptsCollection();
    const projectsCollection = await getProjectsCollection();

    const section = await collection.findOne({ _id: new ObjectId(id) });

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: section.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Use transaction to ensure atomic deletion with child check
    const client = await clientPromise;
    const session = client.startSession();

    try {
      const result = await session.withTransaction(async () => {
        // Check for child sections within the transaction
        const childSections = await collection.countDocuments(
          { parentId: new ObjectId(id) },
          { session }
        );

        if (childSections > 0) {
          throw new Error(
            'Cannot delete section with child sections. Delete child sections first.'
          );
        }

        const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) }, { session });

        if (deleteResult.deletedCount === 0) {
          throw new Error('Failed to delete section');
        }

        return { message: 'Section deleted successfully' };
      });

      return NextResponse.json(result);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message?.includes('Cannot delete section with child sections')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error; // Re-throw for general error handling
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error deleting manuscript section:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
