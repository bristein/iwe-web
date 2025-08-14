import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import { CreateUserInput, User } from '@/lib/models/user';
import { hashPassword, generateToken, setAuthCookie, sanitizeUser } from '@/lib/auth';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password, name, username } = validationResult.data;

    const usersCollection = await getUsersCollection();

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await usersCollection.findOne({ username });
      if (existingUsername) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
      }
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the new user
    const newUser: User = {
      email,
      name,
      username,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);
    const createdUser = { ...newUser, _id: result.insertedId };

    // Generate JWT token
    const token = generateToken(createdUser);

    // Set auth cookie
    await setAuthCookie(token);

    // Return sanitized user data
    return NextResponse.json(
      {
        message: 'User created successfully',
        user: sanitizeUser(createdUser),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'An error occurred during signup' }, { status: 500 });
  }
}
