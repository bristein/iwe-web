import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Convert the secret to a Uint8Array for jose
const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);

    // Validate the payload has our expected fields
    if (!payload.userId || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
    };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
