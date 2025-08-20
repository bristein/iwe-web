import { z } from 'zod';
import { WORLD_BIBLE_CATEGORIES } from '../models/world-bible';

export const worldBibleInputSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  category: z.enum(WORLD_BIBLE_CATEGORIES, {
    errorMap: () => ({ message: 'Invalid category' }),
  }),
  content: z.string().min(1, 'Content is required'),
  frontmatter: z.record(z.any()).optional(),
  metadata: z
    .object({
      characterKnowledge: z.array(z.string()).optional(),
      relatedDocuments: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
  tags: z.array(z.string()).default([]),
});

export const worldBibleUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.enum(WORLD_BIBLE_CATEGORIES).optional(),
  content: z.string().min(1).optional(),
  frontmatter: z.record(z.any()).optional(),
  metadata: z
    .object({
      characterKnowledge: z.array(z.string()).optional(),
      relatedDocuments: z.array(z.string()).optional(),
    })
    .passthrough()
    .optional(),
  tags: z.array(z.string()).optional(),
});

export const worldBibleSearchSchema = z.object({
  projectId: z.string().optional(),
  query: z.string().optional(),
  category: z.enum(WORLD_BIBLE_CATEGORIES).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
});

export type WorldBibleInputData = z.infer<typeof worldBibleInputSchema>;
export type WorldBibleUpdateData = z.infer<typeof worldBibleUpdateSchema>;
export type WorldBibleSearchData = z.infer<typeof worldBibleSearchSchema>;
