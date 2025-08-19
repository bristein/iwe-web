import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getManuscriptsCollection, getProjectsCollection } from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { manuscriptInputSchema, manuscriptSearchSchema } from '@/lib/validation/manuscript';
import { Manuscript, calculateWordCount } from '@/lib/models/manuscript';
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
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validatedSearch = manuscriptSearchSchema.parse(searchParams);

    const collection = await getManuscriptsCollection();
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

    if (validatedSearch.type) {
      query.type = validatedSearch.type;
    }

    if (validatedSearch.status) {
      query.status = validatedSearch.status;
    }

    if (validatedSearch.parentId !== undefined) {
      query.parentId = validatedSearch.parentId ? new ObjectId(validatedSearch.parentId) : null;
    }

    if (validatedSearch.query) {
      query.$or = [
        { title: { $regex: validatedSearch.query, $options: 'i' } },
        { outline: { $regex: validatedSearch.query, $options: 'i' } },
        { draft: { $regex: validatedSearch.query, $options: 'i' } },
      ];
    }

    const sections = await collection
      .find(query)
      .sort({ order: 1, createdAt: 1 })
      .skip(validatedSearch.skip)
      .limit(validatedSearch.limit)
      .toArray();

    const total = await collection.countDocuments(query);

    return NextResponse.json({
      sections,
      total,
      skip: validatedSearch.skip,
      limit: validatedSearch.limit,
    });
  } catch (error) {
    console.error('Error fetching manuscript sections:', error);

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
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = manuscriptInputSchema.parse(body);

    const projectsCollection = await getProjectsCollection();
    const project = await projectsCollection.findOne({
      _id: new ObjectId(validatedData.projectId),
      userId: new ObjectId(user.userId),
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    const collection = await getManuscriptsCollection();

    if (validatedData.parentId) {
      const parent = await collection.findOne({
        _id: new ObjectId(validatedData.parentId),
        projectId: new ObjectId(validatedData.projectId),
      });

      if (!parent) {
        return NextResponse.json({ error: 'Parent section not found' }, { status: 404 });
      }
    }

    let order = validatedData.order;
    if (order === undefined || order === 0) {
      const maxOrder = await collection.findOne(
        {
          projectId: new ObjectId(validatedData.projectId),
          parentId: validatedData.parentId ? new ObjectId(validatedData.parentId) : undefined,
        },
        { sort: { order: -1 }, projection: { order: 1 } }
      );

      order = maxOrder ? maxOrder.order + 1 : 0;
    }

    const wordCount =
      calculateWordCount(validatedData.outline) + calculateWordCount(validatedData.draft);

    const newSection: Manuscript = {
      projectId: new ObjectId(validatedData.projectId),
      type: validatedData.type,
      title: validatedData.title,
      order,
      parentId: validatedData.parentId ? new ObjectId(validatedData.parentId) : undefined,
      outline: validatedData.outline,
      draft: validatedData.draft,
      status: validatedData.status || 'outline',
      wordCount,
      metadata: validatedData.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collection.insertOne(newSection);

    return NextResponse.json(
      {
        id: result.insertedId,
        ...newSection,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating manuscript section:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
