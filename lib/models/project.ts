import { ObjectId } from 'mongodb';

export interface Project {
  _id?: ObjectId;
  userId: ObjectId;
  title: string;
  description: string;
  genre: string;
  status: 'planning' | 'drafting' | 'editing' | 'completed';
  wordCount: number;
  wordCountGoal: number;
  settings?: {
    isPublic?: boolean;
    collaborators?: ObjectId[];
    tags?: string[];
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
  userId: string;
  title: string;
  description: string;
  genre: string;
  wordCountGoal?: number;
  status?: 'planning' | 'drafting' | 'editing' | 'completed';
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  genre?: string;
  status?: 'planning' | 'drafting' | 'editing' | 'completed';
  wordCount?: number;
  wordCountGoal?: number;
  settings?: Project['settings'];
  metadata?: Project['metadata'];
}
