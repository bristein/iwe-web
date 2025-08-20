import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getWorldBiblesCollection, getProjectsCollection } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { worldBibleUpdateSchema } from '@/lib/validation/world-bible';
import { safeObjectIdArray } from '@/lib/utils/mongodb-helpers';
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
    } catch (error) {
      console.error('Auth verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const collection = await getWorldBiblesCollection();
    const projectsCollection = await getProjectsCollection();

    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: document.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error('Error fetching world bible document:', error);
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
    } catch (error) {
      console.error('Auth verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = worldBibleUpdateSchema.parse(body);

    const collection = await getWorldBiblesCollection();
    const projectsCollection = await getProjectsCollection();

    const existingDocument = await collection.findOne({ _id: new ObjectId(id) });

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: existingDocument.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      ...validatedData,
      updatedAt: new Date(),
    };

    if (validatedData.metadata?.relatedDocuments) {
      const validIds = safeObjectIdArray(validatedData.metadata.relatedDocuments);
      if (validIds.length !== validatedData.metadata.relatedDocuments.length) {
        return NextResponse.json(
          { error: 'Invalid related document IDs provided' },
          { status: 400 }
        );
      }
      updateData.metadata = {
        ...validatedData.metadata,
        relatedDocuments: validIds,
      };
    }

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return NextResponse.json({ error: 'No changes made' }, { status: 304 });
    }

    const updatedDocument = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedDocument);
  } catch (error) {
    console.error('Error updating world bible document:', error);

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
    } catch (error) {
      console.error('Auth verification failed:', error);
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 });
    }

    const collection = await getWorldBiblesCollection();
    const projectsCollection = await getProjectsCollection();

    const document = await collection.findOne({ _id: new ObjectId(id) });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const project = await projectsCollection.findOne({
      _id: document.projectId,
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting world bible document:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
