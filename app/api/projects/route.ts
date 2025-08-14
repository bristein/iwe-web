import { NextRequest, NextResponse } from 'next/server';
import { getProjectsCollection } from '@/lib/mongodb';
import { Project, CreateProjectInput } from '@/lib/models/project';
import { ObjectId } from 'mongodb';

// GET /api/projects - Get all projects or projects for a specific user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const id = searchParams.get('id');

    const projectsCollection = await getProjectsCollection();

    if (id) {
      const project = await projectsCollection.findOne({ _id: new ObjectId(id) });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json(project);
    }

    if (userId) {
      const projects = await projectsCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .toArray();
      return NextResponse.json(projects);
    }

    const projects = await projectsCollection.find({}).sort({ updatedAt: -1 }).toArray();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectInput = await request.json();

    if (!body.userId || !body.title || !body.description || !body.genre) {
      return NextResponse.json(
        { error: 'userId, title, description, and genre are required' },
        { status: 400 }
      );
    }

    const projectsCollection = await getProjectsCollection();

    const newProject: Project = {
      userId: new ObjectId(body.userId),
      title: body.title,
      description: body.description,
      genre: body.genre,
      status: body.status || 'planning',
      wordCount: 0,
      wordCountGoal: body.wordCountGoal || 50000,
      settings: {
        isPublic: false,
        collaborators: [],
        tags: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastOpenedAt: new Date(),
    };

    const result = await projectsCollection.insertOne(newProject);

    return NextResponse.json({ ...newProject, _id: result.insertedId }, { status: 201 });
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

    const body = await request.json();
    const projectsCollection = await getProjectsCollection();

    const updateData = {
      ...body,
      updatedAt: new Date(),
    };

    delete updateData._id; // Remove _id from update data
    delete updateData.userId; // Prevent changing userId

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
