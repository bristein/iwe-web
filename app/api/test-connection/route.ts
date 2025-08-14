import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    // Test MongoDB connection
    const client = await clientPromise;
    const db = client.db('iwe-backend');

    // Ping the database
    await db.command({ ping: 1 });

    // Get collections info
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((col) => col.name);

    // Get counts for existing collections
    const stats: {
      database: string;
      connected: boolean;
      collections: string[];
      counts: Record<string, number>;
    } = {
      database: 'iwe-backend',
      connected: true,
      collections: collectionNames,
      counts: {},
    };

    if (collectionNames.includes('users')) {
      stats.counts.users = await db.collection('users').countDocuments();
    }

    if (collectionNames.includes('projects')) {
      stats.counts.projects = await db.collection('projects').countDocuments();
    }

    return NextResponse.json({
      message: 'MongoDB connection successful',
      ...stats,
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to MongoDB',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
