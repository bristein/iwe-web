import { ObjectId } from 'mongodb';

export interface Project {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description?: string;
  genre?: string;
  status: 'active' | 'draft' | 'completed' | 'archived' | 'planning' | 'drafting' | 'editing';
  wordCount?: number;
  wordCountGoal?: number;
  tags?: string[];
  settings?: {
    isPublic?: boolean;
    allowComments?: boolean;
    collaborators?: ObjectId[];
    language?: string;
  };
  metadata?: {
    coverImage?: string;
    synopsis?: string;
    targetAudience?: string;
    publishingGoals?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
}

export interface CreateProjectInput {
  userId: string | ObjectId; // Accept both string and ObjectId
  title: string;
  description?: string;
  genre?: string;
  wordCountGoal?: number;
  status?: 'active' | 'draft' | 'completed' | 'archived' | 'planning' | 'drafting' | 'editing';
  tags?: string[];
  settings?: {
    isPublic?: boolean;
    allowComments?: boolean;
  };
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  genre?: string;
  status?: 'active' | 'draft' | 'completed' | 'archived' | 'planning' | 'drafting' | 'editing';
  wordCount?: number;
  wordCountGoal?: number;
  tags?: string[];
  settings?: Project['settings'];
  metadata?: Project['metadata'];
}
