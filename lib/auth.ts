import bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Sanitize user object by removing sensitive fields like password
 */
export function sanitizeUser(user: Record<string, unknown> | null) {
  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...sanitized } = user;
  return sanitized;
}
