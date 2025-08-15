import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import { User } from '@/lib/models/user';
import { ObjectId } from 'mongodb';
import { hashPassword, sanitizeUser } from '@/lib/auth';
import { createUserSchema, updateUserSchema } from '@/lib/validation/schemas';
import { validateRequest, validateObjectId } from '@/lib/validation/helpers';
import { z } from 'zod';

// GET /api/users - Get all users or a specific user by email
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const id = searchParams.get('id');

    const usersCollection = await getUsersCollection();

    if (id) {
      // Validate ObjectId format
      if (!validateObjectId(id)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
      }

      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(sanitizeUser(user));
    }

    if (email) {
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json(sanitizeUser(user));
    }

    const users = await usersCollection.find({}).toArray();
    return NextResponse.json(users.map(sanitizeUser));
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Add password to validation schema for user creation
    const createUserWithPasswordSchema = createUserSchema.extend({
      password: z.string().min(8, 'Password must be at least 8 characters'),
      username: z.string().min(3).max(50).optional(),
      role: z.enum(['user', 'admin']).default('user'),
    });

    // Validate request body
    const validation = validateRequest(body, createUserWithPasswordSchema);
    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;
    const usersCollection = await getUsersCollection();

    // Use MongoDB unique index or upsert to handle race condition
    try {
      // Hash the password
      const hashedPassword = await hashPassword(validatedData.password);

      const newUser: User = {
        email: validatedData.email,
        name: validatedData.name,
        username: validatedData.username,
        password: hashedPassword,
        role: validatedData.role || 'user',
        avatar: validatedData.avatar,
        preferences: validatedData.preferences || {
          theme: 'light',
          notifications: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      const createdUser = { ...newUser, _id: result.insertedId };

      return NextResponse.json(sanitizeUser(createdUser), { status: 201 });
    } catch (error) {
      // Handle duplicate key error (unique constraint violation)
      if ((error as { code?: number }).code === 11000) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// PUT /api/users - Update a user
export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate ObjectId format
    if (!validateObjectId(id)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    const body = await request.json();

    // Validate request body
    const validation = validateRequest(body, updateUserSchema);
    if (!validation.success) {
      return validation.error;
    }

    const validatedData = validation.data;
    const usersCollection = await getUsersCollection();

    const updateData = {
      ...validatedData,
      updatedAt: new Date(),
    };

    const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    return NextResponse.json(sanitizeUser(updatedUser));
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
