import { z } from 'zod';
import { MANUSCRIPT_TYPES, MANUSCRIPT_STATUSES } from '../models/manuscript';

export const manuscriptInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  type: z.enum(MANUSCRIPT_TYPES, {
    errorMap: () => ({ message: 'Invalid manuscript type' }),
  }),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  order: z.coerce.number().min(0).default(0),
  parentId: z.string().optional(),
  outline: z.string().optional(),
  draft: z.string().optional(),
  status: z.enum(MANUSCRIPT_STATUSES).default('outline'),
  metadata: z
    .object({
      characters: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      plotPoints: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
});

export const manuscriptUpdateSchema = z.object({
  type: z.enum(MANUSCRIPT_TYPES).optional(),
  title: z.string().min(1).max(200).optional(),
  order: z.coerce.number().min(0).optional(),
  parentId: z.string().nullable().optional(),
  outline: z.string().optional(),
  draft: z.string().optional(),
  status: z.enum(MANUSCRIPT_STATUSES).optional(),
  metadata: z
    .object({
      characters: z.array(z.string()).optional(),
      locations: z.array(z.string()).optional(),
      plotPoints: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
});

export const manuscriptReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        order: z.number().min(0),
        parentId: z.string().nullable().optional(),
      })
    )
    .min(1, 'At least one item is required'),
});

export const manuscriptSearchSchema = z.object({
  projectId: z.string().optional(),
  query: z.string().optional(),
  type: z.enum(MANUSCRIPT_TYPES).optional(),
  status: z.enum(MANUSCRIPT_STATUSES).optional(),
  parentId: z.string().nullable().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
});

export type ManuscriptInputData = z.infer<typeof manuscriptInputSchema>;
export type ManuscriptUpdateData = z.infer<typeof manuscriptUpdateSchema>;
export type ManuscriptReorderData = z.infer<typeof manuscriptReorderSchema>;
export type ManuscriptSearchData = z.infer<typeof manuscriptSearchSchema>;
