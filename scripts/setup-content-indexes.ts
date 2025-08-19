import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function setupContentIndexes() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in environment variables');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('iwe-backend');

    // World Bible indexes
    console.log('\n📚 Setting up World Bible indexes...');
    const worldBibleCollection = db.collection('worldbibles');

    await worldBibleCollection.createIndex({ projectId: 1 });
    console.log('  ✅ Created index on projectId');

    await worldBibleCollection.createIndex({ projectId: 1, category: 1 });
    console.log('  ✅ Created compound index on projectId and category');

    await worldBibleCollection.createIndex({ tags: 1 });
    console.log('  ✅ Created index on tags');

    await worldBibleCollection.createIndex(
      {
        title: 'text',
        content: 'text',
      },
      {
        weights: {
          title: 10,
          content: 5,
        },
      }
    );
    console.log('  ✅ Created text index for search');

    await worldBibleCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Created index on createdAt');

    await worldBibleCollection.createIndex({ updatedAt: -1 });
    console.log('  ✅ Created index on updatedAt');

    // Manuscript indexes
    console.log('\n📝 Setting up Manuscript indexes...');
    const manuscriptCollection = db.collection('manuscripts');

    await manuscriptCollection.createIndex({ projectId: 1 });
    console.log('  ✅ Created index on projectId');

    await manuscriptCollection.createIndex({ projectId: 1, parentId: 1 });
    console.log('  ✅ Created compound index on projectId and parentId');

    await manuscriptCollection.createIndex({ projectId: 1, order: 1 });
    console.log('  ✅ Created compound index on projectId and order');

    await manuscriptCollection.createIndex({ projectId: 1, type: 1 });
    console.log('  ✅ Created compound index on projectId and type');

    await manuscriptCollection.createIndex({ projectId: 1, status: 1 });
    console.log('  ✅ Created compound index on projectId and status');

    await manuscriptCollection.createIndex({ parentId: 1 });
    console.log('  ✅ Created index on parentId');

    await manuscriptCollection.createIndex(
      {
        title: 'text',
        outline: 'text',
        draft: 'text',
      },
      {
        weights: {
          title: 10,
          outline: 5,
          draft: 3,
        },
      }
    );
    console.log('  ✅ Created text index for search');

    await manuscriptCollection.createIndex({ createdAt: -1 });
    console.log('  ✅ Created index on createdAt');

    await manuscriptCollection.createIndex({ updatedAt: -1 });
    console.log('  ✅ Created index on updatedAt');

    console.log('\n🎉 All content indexes created successfully!');
  } catch (error) {
    console.error('❌ Error setting up indexes:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('👋 Disconnected from MongoDB');
  }
}

setupContentIndexes();
