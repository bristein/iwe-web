import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient, jsonRequest } from './utils/api-client';
import { ApiAuthHelper } from './utils/auth-helpers';
import { TestUserFactory } from './utils/test-factories';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

describe('World Bible API', () => {
  let client: SuperTest<Test>;
  let authHelper: ApiAuthHelper;
  let authToken: string;
  let testProjectId: string;

  beforeAll(async () => {
    client = await createApiClient();
    authHelper = new ApiAuthHelper(client);
  });

  beforeEach(async () => {
    // Create a test user and project
    const user = TestUserFactory.create('worldbible-test');
    authToken = await authHelper.signup(user);

    // Create a test project
    const projectResponse = await jsonRequest(
      client,
      'post',
      '/api/projects',
      {
        title: 'Test Fantasy Novel',
        description: 'A test project for world bible',
        type: 'novel',
        genre: 'fantasy',
        status: 'drafting',
      },
      { Cookie: `auth-token=${authToken}` }
    );

    // Check the response has an _id (MongoDB) or id field
    testProjectId = projectResponse.body._id || projectResponse.body.id;

    if (!testProjectId) {
      console.error('Project response status:', projectResponse.status);
      console.error('Project response body:', projectResponse.body);
      throw new Error('Failed to create test project - no ID returned');
    }

    // Clean up world bible collection before each test
    const db = await getDatabase();
    await db.collection('worldbibles').deleteMany({});
  });

  describe('POST /api/world-bible', () => {
    test('should create a new world bible document', async () => {
      const response = await jsonRequest(
        client,
        'post',
        '/api/world-bible',
        {
          projectId: testProjectId,
          title: 'Magic System Overview',
          category: 'Magic/Technology',
          content: '# Magic System\n\nThe magic system is based on elemental manipulation...',
          tags: ['magic', 'elements', 'worldbuilding'],
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Magic System Overview');
      expect(response.body.category).toBe('Magic/Technology');
      expect(response.body.tags).toEqual(['magic', 'elements', 'worldbuilding']);
    });

    test('should validate required fields', async () => {
      const response = await jsonRequest(
        client,
        'post',
        '/api/world-bible',
        {
          projectId: testProjectId,
          title: '',
          category: 'Characters',
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid input data');
    });

    test('should require authentication', async () => {
      const response = await jsonRequest(client, 'post', '/api/world-bible', {
        projectId: testProjectId,
        title: 'Test Document',
        category: 'Characters',
        content: 'Test content',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/world-bible', () => {
    beforeEach(async () => {
      const db = await getDatabase();
      await db.collection('worldbibles').insertMany([
        {
          projectId: new ObjectId(testProjectId),
          title: 'Main Character',
          category: 'Characters',
          content: 'The protagonist of our story...',
          tags: ['protagonist', 'hero'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          title: 'Ancient Forest',
          category: 'Locations',
          content: 'A mystical forest where magic flows...',
          tags: ['forest', 'location'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test('should retrieve all world bible documents for a project', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/world-bible?projectId=${testProjectId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.documents).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    test('should filter by category', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/world-bible?projectId=${testProjectId}&category=Characters`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.documents[0].title).toBe('Main Character');
    });

    test('should support pagination', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/world-bible?projectId=${testProjectId}&limit=1&skip=1`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.documents).toHaveLength(1);
      expect(response.body.skip).toBe(1);
      expect(response.body.limit).toBe(1);
    });
  });

  describe('GET /api/world-bible/[id]', () => {
    let documentId: string;

    beforeEach(async () => {
      const db = await getDatabase();
      const result = await db.collection('worldbibles').insertOne({
        projectId: new ObjectId(testProjectId),
        title: 'Test Document',
        category: 'History',
        content: 'Historical events...',
        tags: ['history'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      documentId = result.insertedId.toString();
    });

    test('should retrieve a specific document', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/world-bible/${documentId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Test Document');
      expect(response.body.category).toBe('History');
    });

    test('should return 404 for non-existent document', async () => {
      const fakeId = new ObjectId().toString();
      const response = await jsonRequest(client, 'get', `/api/world-bible/${fakeId}`, undefined, {
        Cookie: `auth-token=${authToken}`,
      });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/world-bible/[id]', () => {
    let documentId: string;

    beforeEach(async () => {
      const db = await getDatabase();
      const result = await db.collection('worldbibles').insertOne({
        projectId: new ObjectId(testProjectId),
        title: 'Original Title',
        category: 'Characters',
        content: 'Original content',
        tags: ['original'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      documentId = result.insertedId.toString();
    });

    test('should update a document', async () => {
      const response = await jsonRequest(
        client,
        'put',
        `/api/world-bible/${documentId}`,
        {
          title: 'Updated Title',
          content: 'Updated content',
          tags: ['updated', 'modified'],
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Title');
      expect(response.body.content).toBe('Updated content');
      expect(response.body.tags).toEqual(['updated', 'modified']);
    });
  });

  describe('DELETE /api/world-bible/[id]', () => {
    let documentId: string;

    beforeEach(async () => {
      const db = await getDatabase();
      const result = await db.collection('worldbibles').insertOne({
        projectId: new ObjectId(testProjectId),
        title: 'To Delete',
        category: 'Other',
        content: 'This will be deleted',
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      documentId = result.insertedId.toString();
    });

    test('should delete a document', async () => {
      const response = await jsonRequest(
        client,
        'delete',
        `/api/world-bible/${documentId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);

      const db = await getDatabase();
      const doc = await db.collection('worldbibles').findOne({ _id: new ObjectId(documentId) });
      expect(doc).toBeNull();
    });
  });
});
