import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection } from '@/lib/mongodb';
import { verifyPassword, generateToken, setAuthCookie, sanitizeUser } from '@/lib/auth';
import { User } from '@/lib/models/user';
import { z } from 'zod';
import { authRateLimit } from '@/lib/rate-limit';
import { authLogger } from '@/lib/logger';
import { parseJsonWithSizeLimit, PayloadTooLargeError } from '@/lib/payload-limit';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse JSON with size limit check
    let body;
    try {
      body = await parseJsonWithSizeLimit(request);
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return error.response;
      }
      // Handle JSON parsing errors
      const response = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }

    // Validate input
    const validationResult = loginSchema.safeParse(body);
    if (!validationResult.success) {
      const response = NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }

    const { email, password } = validationResult.data;

    const usersCollection = await getUsersCollection();

    // Find user by email (case-insensitive)
    const user = await usersCollection.findOne({
      email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });
    if (!user) {
      authLogger.info('Login attempt failed - user not found', { email });
      const response = NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }

    // Check if user has a password (for backwards compatibility)
    if (!user.password) {
      const response = NextResponse.json(
        {
          error:
            'This account was created before password authentication was enabled. Please contact support.',
        },
        { status: 401 }
      );
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      authLogger.info('Login attempt failed - invalid password', { email });
      const response = NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
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
    const token = await generateToken(user as User);

    // Set auth cookie
    await setAuthCookie(token);

    // Return sanitized user data
    authLogger.info('User logged in successfully', { userId: user._id?.toString(), email });
    const response = NextResponse.json({
      message: 'Login successful',
      user: sanitizeUser(user),
    });
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
  } catch (error) {
    authLogger.error('Login error', error, { endpoint: '/api/auth/login' });
    const response = NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    return response;
  }
}
