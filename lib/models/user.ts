import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'admin' | 'editor';
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
  };
  stats?: {
    totalProjects?: number;
    totalWords?: number;
    lastActive?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  username?: string;
  role?: 'user' | 'admin' | 'editor';
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  preferences?: User['preferences'];
}
