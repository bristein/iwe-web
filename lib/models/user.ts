import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  username?: string;
  password?: string; // Hashed password - never send to client
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
  password: string; // Plain text password - will be hashed
  username?: string;
  role?: 'user' | 'admin' | 'editor';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  preferences?: User['preferences'];
}
