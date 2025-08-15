import { NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { ObjectId } from 'mongodb';

export function validateObjectId(id: string): boolean {
  try {
    new ObjectId(id);
    return true;
  } catch {
    return false;
  }
}

export function validateRequest<T>(
  data: unknown,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: NextResponse } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        ),
      };
    }
    return {
      success: false,
      error: NextResponse.json({ error: 'Invalid request data' }, { status: 400 }),
    };
  }
}

export function sanitizeUserResponse(user: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safeUser } = user;
  return safeUser;
}
