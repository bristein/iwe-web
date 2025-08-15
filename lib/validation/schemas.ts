import { z } from 'zod';
import { ObjectId } from 'mongodb';

// Custom ObjectId validation
const objectIdSchema = z.string().refine(
  (val) => {
    try {
      new ObjectId(val);
      return true;
    } catch {
      return false;
    }
  },
  {
    message: 'Invalid ObjectId format',
  }
);

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).default('light'),
      notifications: z.boolean().default(true),
    })
    .optional(),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

// Project schemas
export const createProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  userId: objectIdSchema,
  genre: z.string().max(100).optional(),
  wordCountGoal: z.number().positive().optional(),
  status: z
    .enum(['active', 'draft', 'completed', 'archived', 'planning', 'drafting', 'editing'])
    .default('draft'),
  tags: z.array(z.string().max(50)).max(20, 'Too many tags').optional(),
  settings: z
    .object({
      isPublic: z.boolean().default(false),
      allowComments: z.boolean().default(true),
    })
    .optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  genre: z.string().max(100).optional(),
  wordCount: z.number().positive().optional(),
  wordCountGoal: z.number().positive().optional(),
  status: z
    .enum(['active', 'draft', 'completed', 'archived', 'planning', 'drafting', 'editing'])
    .optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  settings: z
    .object({
      isPublic: z.boolean().optional(),
      allowComments: z.boolean().optional(),
    })
    .optional(),
  metadata: z
    .object({
      coverImage: z.string().url().optional(),
      synopsis: z.string().max(2000).optional(),
      targetAudience: z.string().max(200).optional(),
      publishingGoals: z.string().max(500).optional(),
    })
    .optional(),
});

// Query parameter schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const userQuerySchema = paginationSchema.extend({
  email: z.string().email().optional(),
  name: z.string().optional(),
});

export const projectQuerySchema = paginationSchema.extend({
  userId: objectIdSchema.optional(),
  status: z.enum(['active', 'draft', 'completed', 'archived']).optional(),
  tags: z.string().optional(), // comma-separated tags
});

// Export type inference
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
