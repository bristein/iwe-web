import { describe, test, expect, beforeEach, beforeAll } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient, jsonRequest } from './utils/api-client';
import { ApiAuthHelper } from './utils/auth-helpers';
import { TestUserFactory } from './utils/test-factories';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

describe('Manuscript API', () => {
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
    const user = TestUserFactory.create('manuscript-test');
    authToken = await authHelper.signup(user);

    // Create a test project
    const projectResponse = await jsonRequest(
      client,
      'post',
      '/api/projects',
      {
        title: 'Test Novel Project',
        description: 'A test project for manuscripts',
        type: 'novel',
        genre: 'fantasy',
        status: 'drafting',
      },
      { Cookie: `auth-token=${authToken}` }
    );

    testProjectId = projectResponse.body._id || projectResponse.body.id;

    if (!testProjectId) {
      throw new Error('Failed to create test project');
    }

    // Clean up manuscripts collection before each test
    const db = await getDatabase();
    await db.collection('manuscripts').deleteMany({});
  });

  describe('POST /api/manuscripts', () => {
    test('should create a new manuscript section', async () => {
      const response = await jsonRequest(
        client,
        'post',
        '/api/manuscripts',
        {
          projectId: testProjectId,
          type: 'chapter',
          title: 'Chapter 1: The Beginning',
          outline: 'The hero discovers their powers...',
          status: 'outline',
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('Chapter 1: The Beginning');
      expect(response.body.type).toBe('chapter');
      expect(response.body.status).toBe('outline');
      expect(response.body.wordCount).toBeGreaterThan(0);
    });

    test('should create nested sections', async () => {
      const db = await getDatabase();
      const parentResult = await db.collection('manuscripts').insertOne({
        projectId: new ObjectId(testProjectId),
        type: 'chapter',
        title: 'Chapter 1',
        order: 0,
        status: 'outline',
        wordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await jsonRequest(
        client,
        'post',
        '/api/manuscripts',
        {
          projectId: testProjectId,
          parentId: parentResult.insertedId.toString(),
          type: 'scene',
          title: 'Scene 1',
          draft: 'The morning sun rose over the mountains...',
          status: 'drafting',
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(201);
      expect(response.body.parentId).toBe(parentResult.insertedId.toString());
      expect(response.body.type).toBe('scene');
    });

    test('should auto-increment order', async () => {
      const db = await getDatabase();
      await db.collection('manuscripts').insertMany([
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 1',
          order: 0,
          status: 'complete',
          wordCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 2',
          order: 1,
          status: 'drafting',
          wordCount: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const response = await jsonRequest(
        client,
        'post',
        '/api/manuscripts',
        {
          projectId: testProjectId,
          type: 'chapter',
          title: 'Chapter 3',
          status: 'outline',
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(201);
      expect(response.body.order).toBe(2);
    });
  });

  describe('GET /api/manuscripts', () => {
    beforeEach(async () => {
      const db = await getDatabase();
      await db.collection('manuscripts').insertMany([
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 1',
          order: 0,
          status: 'complete',
          wordCount: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 2',
          order: 1,
          status: 'drafting',
          wordCount: 800,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'scene',
          title: 'Scene 1',
          order: 0,
          parentId: new ObjectId(),
          status: 'outline',
          wordCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test('should retrieve all manuscript sections', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/manuscripts?projectId=${testProjectId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.sections).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    test('should filter by type', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/manuscripts?projectId=${testProjectId}&type=chapter`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.sections).toHaveLength(2);
      expect(response.body.sections.every((s: { type: string }) => s.type === 'chapter')).toBe(
        true
      );
    });

    test('should filter by status', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/manuscripts?projectId=${testProjectId}&status=complete`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.sections).toHaveLength(1);
      expect(response.body.sections[0].title).toBe('Chapter 1');
    });
  });

  describe('GET /api/manuscripts/tree', () => {
    beforeEach(async () => {
      const db = await getDatabase();
      const chapter1 = await db.collection('manuscripts').insertOne({
        projectId: new ObjectId(testProjectId),
        type: 'chapter',
        title: 'Chapter 1',
        order: 0,
        status: 'complete',
        wordCount: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection('manuscripts').insertMany([
        {
          projectId: new ObjectId(testProjectId),
          type: 'scene',
          title: 'Scene 1.1',
          order: 0,
          parentId: chapter1.insertedId,
          status: 'complete',
          wordCount: 500,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'scene',
          title: 'Scene 1.2',
          order: 1,
          parentId: chapter1.insertedId,
          status: 'complete',
          wordCount: 1000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 2',
          order: 1,
          status: 'drafting',
          wordCount: 800,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    test('should return hierarchical tree structure', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/manuscripts/tree?projectId=${testProjectId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.tree).toHaveLength(2);
      expect(response.body.tree[0].title).toBe('Chapter 1');
      expect(response.body.tree[0].children).toHaveLength(2);
      expect(response.body.tree[0].children[0].title).toBe('Scene 1.1');
      expect(response.body.tree[1].title).toBe('Chapter 2');
      expect(response.body.tree[1].children).toBeUndefined();
    });

    test('should include statistics', async () => {
      const response = await jsonRequest(
        client,
        'get',
        `/api/manuscripts/tree?projectId=${testProjectId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);
      expect(response.body.stats.totalSections).toBe(4);
      expect(response.body.stats.totalWords).toBe(3800);
      expect(response.body.stats.byStatus.complete).toBe(3);
      expect(response.body.stats.byStatus.drafting).toBe(1);
      expect(response.body.stats.byType.chapter).toBe(2);
      expect(response.body.stats.byType.scene).toBe(2);
    });
  });

  describe('POST /api/manuscripts/reorder', () => {
    let section1Id: string;
    let section2Id: string;
    let section3Id: string;

    beforeEach(async () => {
      const db = await getDatabase();
      const results = await db.collection('manuscripts').insertMany([
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 1',
          order: 0,
          status: 'complete',
          wordCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 2',
          order: 1,
          status: 'drafting',
          wordCount: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          projectId: new ObjectId(testProjectId),
          type: 'chapter',
          title: 'Chapter 3',
          order: 2,
          status: 'outline',
          wordCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      section1Id = results.insertedIds[0].toString();
      section2Id = results.insertedIds[1].toString();
      section3Id = results.insertedIds[2].toString();
    });

    test('should reorder sections', async () => {
      const response = await jsonRequest(
        client,
        'post',
        '/api/manuscripts/reorder',
        {
          items: [
            { id: section3Id, order: 0 },
            { id: section1Id, order: 1 },
            { id: section2Id, order: 2 },
          ],
        },
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);

      const db = await getDatabase();
      const sections = await db
        .collection('manuscripts')
        .find({ projectId: new ObjectId(testProjectId) })
        .sort({ order: 1 })
        .toArray();

      expect(sections[0].title).toBe('Chapter 3');
      expect(sections[1].title).toBe('Chapter 1');
      expect(sections[2].title).toBe('Chapter 2');
    });
  });

  describe('DELETE /api/manuscripts/[id]', () => {
    test('should prevent deletion of sections with children', async () => {
      const db = await getDatabase();
      const parentResult = await db.collection('manuscripts').insertOne({
        projectId: new ObjectId(testProjectId),
        type: 'chapter',
        title: 'Chapter with Children',
        order: 0,
        status: 'outline',
        wordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection('manuscripts').insertOne({
        projectId: new ObjectId(testProjectId),
        parentId: parentResult.insertedId,
        type: 'scene',
        title: 'Child Scene',
        order: 0,
        status: 'outline',
        wordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await jsonRequest(
        client,
        'delete',
        `/api/manuscripts/${parentResult.insertedId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Cannot delete section with child sections');
    });

    test('should delete a section without children', async () => {
      const db = await getDatabase();
      const result = await db.collection('manuscripts').insertOne({
        projectId: new ObjectId(testProjectId),
        type: 'chapter',
        title: 'To Delete',
        order: 0,
        status: 'outline',
        wordCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await jsonRequest(
        client,
        'delete',
        `/api/manuscripts/${result.insertedId}`,
        undefined,
        { Cookie: `auth-token=${authToken}` }
      );

      expect(response.status).toBe(200);

      const doc = await db.collection('manuscripts').findOne({ _id: result.insertedId });
      expect(doc).toBeNull();
    });
  });
});
