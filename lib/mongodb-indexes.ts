import { connectToDatabase } from './mongodb';

/**
 * Creates database indexes for optimal query performance
 * This should be run during application initialization or as a migration script
 */
export async function createIndexes() {
  try {
    const { db } = await connectToDatabase();

    // User collection indexes
    const usersCollection = db.collection('users');

    // Unique index on email for fast lookups and uniqueness constraint
    await usersCollection.createIndex(
      { email: 1 },
      {
        unique: true,
        name: 'email_unique_idx',
      }
    );

    // Index on createdAt for sorting users by creation date
    await usersCollection.createIndex({ createdAt: -1 }, { name: 'createdAt_idx' });

    // Project collection indexes
    const projectsCollection = db.collection('projects');

    // Compound index on userId and updatedAt for user's projects queries
    await projectsCollection.createIndex(
      { userId: 1, updatedAt: -1 },
      { name: 'userId_updatedAt_idx' }
    );

    // Index on status for filtering projects by status
    await projectsCollection.createIndex({ status: 1 }, { name: 'status_idx' });

    // Index on tags for tag-based searches (multikey index)
    await projectsCollection.createIndex({ tags: 1 }, { name: 'tags_idx' });

    // Compound index on userId and status for filtered user projects
    await projectsCollection.createIndex({ userId: 1, status: 1 }, { name: 'userId_status_idx' });

    // Index on createdAt for sorting projects
    await projectsCollection.createIndex({ createdAt: -1 }, { name: 'createdAt_idx' });

    // Text index for full-text search on title and description
    await projectsCollection.createIndex(
      { title: 'text', description: 'text' },
      {
        name: 'title_description_text_idx',
        weights: {
          title: 10,
          description: 5,
        },
      }
    );

    console.log('✅ Database indexes created successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    throw error;
  }
}

/**
 * Lists all indexes for debugging purposes
 */
export async function listIndexes() {
  try {
    const { db } = await connectToDatabase();

    const collections = ['users', 'projects'];
    const indexes: Record<string, unknown[]> = {};

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      const collectionIndexes = await collection.listIndexes().toArray();
      indexes[collectionName] = collectionIndexes;
    }

    return indexes;
  } catch (error) {
    console.error('Error listing indexes:', error);
    throw error;
  }
}
