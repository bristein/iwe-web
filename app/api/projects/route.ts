import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/mongodb';
import { Project } from '@/lib/models/project';
import { ObjectId } from 'mongodb';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation/schemas';
import { validateRequest, validateObjectId } from '@/lib/validation/helpers';

// GET /api/projects - Get all projects or filter by query params
export async function GET(request: NextRequest) {
  try {
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
      filter.userId = new ObjectId(userId);
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
    const body = await request.json();

    // Validate request body
    const validation = validateRequest(body, createProjectSchema);
    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;
    const projectsCollection = await getProjectsCollection();

    const newProject: Project = {
      title: validatedData.title,
      description: validatedData.description,
      userId: new ObjectId(validatedData.userId), // Convert string to ObjectId
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
