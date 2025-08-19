import { ObjectId } from 'mongodb';

export interface Manuscript {
  _id?: ObjectId;
  projectId: ObjectId;
  type: 'chapter' | 'scene' | 'act' | 'section';
  title: string;
  order: number;
  parentId?: ObjectId;
  outline?: string;
  draft?: string;
  status: 'outline' | 'drafting' | 'revision' | 'complete';
  wordCount: number;
  metadata?: {
    characters?: string[];
    locations?: string[];
    plotPoints?: string[];
    [key: string]: unknown;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ManuscriptInput {
  projectId: string;
  type: Manuscript['type'];
  title: string;
  order?: number;
  parentId?: string;
  outline?: string;
  draft?: string;
  status?: Manuscript['status'];
  metadata?: Manuscript['metadata'];
}

export interface ManuscriptUpdate {
  type?: Manuscript['type'];
  title?: string;
  order?: number;
  parentId?: string | null;
  outline?: string;
  draft?: string;
  status?: Manuscript['status'];
  metadata?: Manuscript['metadata'];
}

export const MANUSCRIPT_TYPES = ['chapter', 'scene', 'act', 'section'] as const;
export const MANUSCRIPT_STATUSES = ['outline', 'drafting', 'revision', 'complete'] as const;

/**
 * Calculates word count for manuscript content
 * Handles edge cases like multiple spaces, tabs, newlines, and punctuation
 * @param text The text to count words in
 * @returns Number of words
 */
export function calculateWordCount(text?: string): number {
  if (!text || typeof text !== 'string') return 0;

  // Remove excess whitespace and normalize
  const normalized = text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/[\r\n\t]+/g, ' '); // Replace line breaks and tabs with space

  if (normalized.length === 0) return 0;

  // Split on whitespace and filter out empty strings
  const words = normalized.split(' ').filter((word) => word.length > 0);

  return words.length;
}

/**
 * Calculates combined word count for outline and draft
 * @param outline The outline text
 * @param draft The draft text
 * @returns Combined word count
 */
export function calculateTotalWordCount(outline?: string, draft?: string): number {
  return calculateWordCount(outline) + calculateWordCount(draft);
}
