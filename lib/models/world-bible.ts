import { ObjectId } from 'mongodb';

export interface WorldBible {
  _id?: ObjectId;
  projectId: ObjectId;
  title: string;
  category: 'Characters' | 'Locations' | 'Magic/Technology' | 'History' | 'Relationships' | 'Other';
  content: string;
  frontmatter?: Record<string, unknown>;
  metadata?: {
    characterKnowledge?: string[];
    relatedDocuments?: ObjectId[];
    [key: string]: unknown;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorldBibleInput {
  projectId: string;
  title: string;
  category: WorldBible['category'];
  content: string;
  frontmatter?: Record<string, unknown>;
  metadata?: WorldBible['metadata'];
  tags?: string[];
}

export interface WorldBibleUpdate {
  title?: string;
  category?: WorldBible['category'];
  content?: string;
  frontmatter?: Record<string, unknown>;
  metadata?: WorldBible['metadata'];
  tags?: string[];
}

export const WORLD_BIBLE_CATEGORIES = [
  'Characters',
  'Locations',
  'Magic/Technology',
  'History',
  'Relationships',
  'Other',
] as const;
