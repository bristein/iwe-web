import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUsersCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sanitizeUser } from '@/lib/auth';

export async function GET() {
  try {
    // Get current user from JWT
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      const response = NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

      // Add security headers even for authentication error responses
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');

      return response;
    }

    // Fetch full user data from database
    const usersCollection = await getUsersCollection();
    const user = await usersCollection.findOne({
      _id: new ObjectId(currentUser.userId),
    });

    if (!user) {
      const response = NextResponse.json({ error: 'User not found' }, { status: 404 });

      // Add security headers even for error responses
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');

      return response;
    }

    // Return sanitized user data
    const response = NextResponse.json({
      user: sanitizeUser(user),
    });

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  } catch (error) {
    console.error('Get current user error:', error);
    const response = NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );

    // Add security headers even for error responses
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');

    return response;
  }
}
