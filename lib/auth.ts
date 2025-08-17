import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User } from './models/user';
import { getJwtSecret, validateAuthConfig, getAuthCookieOptions } from './auth-config';

// Validate auth configuration on module load (except during build)
if (!process.env.NEXT_PHASE) {
  try {
    validateAuthConfig();
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast on configuration errors
      throw error;
    } else {
      // In development/test, log warning but continue
      console.warn('Auth configuration warning:', error);
    }
  }
}

const getSecret = () => {
  const jwtSecret = process.env.NEXT_PHASE 
    ? (process.env.JWT_SECRET || 'build-time-placeholder')
    : getJwtSecret();
  return new TextEncoder().encode(jwtSecret);
};

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function generateToken(user: User): Promise<string> {
  const payload = {
    userId: user._id!.toString(),
    email: user.email,
    role: user.role,
  };

  // Generate unique jti to ensure tokens are unique even for same user at same time
  const jti = `${user._id!.toString()}-${Date.now()}-${Math.random().toString(36).substring(2)}`;

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setJti(jti) // Add unique JWT ID
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    // Validate the payload has our expected fields
    if (!payload.userId || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, getAuthCookieOptions());
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  return token?.value || null;
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

// Sanitize user object to remove sensitive data before sending to client
export function sanitizeUser(user: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...sanitized } = user;
  return sanitized;
}
