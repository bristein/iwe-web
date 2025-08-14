import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import { verifyPassword, generateToken, setAuthCookie, sanitizeUser } from '@/lib/auth';
import { User } from '@/lib/models/user';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    const usersCollection = await getUsersCollection();

    // Find user by email
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check if user has a password (for backwards compatibility)
    if (!user.password) {
      return NextResponse.json(
        {
          error:
            'This account was created before password authentication was enabled. Please contact support.',
        },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update last active timestamp
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          'stats.lastActive': new Date(),
          updatedAt: new Date(),
        },
      }
    );

    // Generate JWT token
    const token = generateToken(user as User);

    // Set auth cookie
    await setAuthCookie(token);

    // Return sanitized user data
    return NextResponse.json({
      message: 'Login successful',
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
