import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/mongodb';
import { Project } from '@/lib/models/project';
import { ObjectId } from 'mongodb';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation/schemas';
import { validateRequest, validateObjectId } from '@/lib/validation/helpers';
import { verifyToken } from '@/lib/auth';

// GET /api/projects - Get all projects or filter by query params
export async function GET(request: NextRequest) {
  try {
    // Verify authentication token and get user info
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let tokenPayload;
    try {
      tokenPayload = await verifyToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const projectsCollection = await getProjectsCollection();

    // Get specific project by ID
    if (id) {
      // Validate ObjectId format
      if (!validateObjectId(id)) {
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
      }

      const project = await projectsCollection.findOne({ _id: new ObjectId(id) });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json(project);
    }

    // Build filter query
    const filter: Record<string, unknown> = {};

    if (userId) {
      // Validate ObjectId format for userId
      if (!validateObjectId(userId)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      // Security: Ensure users can only access their own projects
      // unless they have admin privileges
      if (tokenPayload.userId !== userId && tokenPayload.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized access to projects' }, { status: 403 });
      }

      filter.userId = new ObjectId(userId);
    } else {
      // If no userId specified, default to the authenticated user's projects
      filter.userId = new ObjectId(tokenPayload.userId);
    }

    if (status) {
      filter.status = status;
    }

    const projects = await projectsCollection.find(filter).toArray();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    // Verify authentication token
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let tokenPayload;
    try {
      tokenPayload = await verifyToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(body, createProjectSchema);
    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;
    const projectsCollection = await getProjectsCollection();

    // Security: Ensure userId matches the authenticated user
    if (validatedData.userId && validatedData.userId !== tokenPayload.userId) {
      return NextResponse.json(
        { error: 'Cannot create projects for other users' },
        { status: 403 }
      );
    }

    const newProject: Project = {
      title: validatedData.title,
      description: validatedData.description,
      userId: new ObjectId(tokenPayload.userId), // Always use authenticated user's ID
      status: validatedData.status || 'draft',
      tags: validatedData.tags || [],
      settings: validatedData.settings || {
        isPublic: false,
        allowComments: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await projectsCollection.insertOne(newProject);
    const createdProject = { ...newProject, _id: result.insertedId };

    return NextResponse.json(createdProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

// PUT /api/projects - Update a project
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication token
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let tokenPayload;
    try {
      tokenPayload = await verifyToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(body, updateProjectSchema);
    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;
    const projectsCollection = await getProjectsCollection();

    // Security: Verify user owns this project before allowing update
    const existingProject = await projectsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (
      existingProject.userId.toString() !== tokenPayload.userId &&
      tokenPayload.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Unauthorized to update this project' }, { status: 403 });
    }

    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
    };

    const result = await projectsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updatedProject = await projectsCollection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects - Delete a project
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication token
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let tokenPayload;
    try {
      tokenPayload = await verifyToken(authToken);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
    }

    const projectsCollection = await getProjectsCollection();

    // Security: Verify user owns this project before allowing deletion
    const existingProject = await projectsCollection.findOne({ _id: new ObjectId(id) });
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (
      existingProject.userId.toString() !== tokenPayload.userId &&
      tokenPayload.role !== 'admin'
    ) {
      return NextResponse.json({ error: 'Unauthorized to delete this project' }, { status: 403 });
    }

    const result = await projectsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
