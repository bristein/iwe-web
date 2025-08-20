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
 * Enhanced to handle contractions, hyphenated words, and punctuation more accurately
 * @param text The text to count words in
 * @returns Number of words
 */
export function calculateWordCount(text?: string): number {
  if (!text || typeof text !== 'string') return 0;

  // Remove excess whitespace and normalize
  let normalized = text
    .trim()
    .replace(/[\r\n\t]+/g, ' ') // Replace line breaks and tabs with space
    .replace(/\s+/g, ' '); // Replace multiple whitespace with single space

  if (normalized.length === 0) return 0;

  // Handle special cases for more accurate word counting:
  // 1. Preserve contractions (don't, won't, it's, etc.) as single words
  // 2. Preserve hyphenated words (mother-in-law, twenty-one) as single words
  // 3. Remove standalone punctuation but keep apostrophes and hyphens within words

  // Remove punctuation except apostrophes and hyphens that are part of words
  normalized = normalized.replace(/[^\w\s'-]/g, ' ');

  // Split on whitespace and filter out empty strings
  const words = normalized.split(/\s+/).filter((word) => {
    // Filter out empty strings and standalone punctuation
    if (word.length === 0) return false;

    // Filter out strings that are only punctuation (like standalone apostrophes or hyphens)
    if (/^['-]+$/.test(word)) return false;

    // Keep everything else (including contractions and hyphenated words)
    return true;
  });

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
