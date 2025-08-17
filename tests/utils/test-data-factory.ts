import { hashPassword } from '../../lib/auth';
import { User } from '../../lib/models/user';
import { ObjectId } from 'mongodb';
import { TEST_PASSWORDS } from '../../lib/test-constants';

/**
 * Test data factory for creating consistent test data for MongoDB
 */
export class TestDataFactory {
  private static userCounter = 0;
  private static projectCounter = 0;

  /**
   * Reset counters (useful between test suites)
   */
  static resetCounters() {
    this.userCounter = 0;
    this.projectCounter = 0;
  }

  /**
   * Create a test user with optional overrides
   */
  static async createUser(overrides: Partial<User> = {}): Promise<User> {
    const timestamp = Date.now();
    const counter = ++this.userCounter;

    const defaultUser: User = {
      _id: new ObjectId(),
      email: overrides.email || `test-user-${counter}-${timestamp}@example.com`,
      name: overrides.name || `Test User ${counter}`,
      username: overrides.username || `testuser${counter}`,
      password: await hashPassword(overrides.password || TEST_PASSWORDS.VALID_STRONG),
      role: overrides.role || 'user',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      stats: overrides.stats || {
        totalProjects: 0,
        totalWords: 0,
        lastActive: new Date(),
      },
      preferences: overrides.preferences || {
        theme: 'light',
        notifications: true,
      },
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * Create multiple test users
   */
  static async createUsers(count: number, overrides: Partial<User> = {}): Promise<User[]> {
    const users: User[] = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.createUser(overrides));
    }
    return users;
  }

  /**
   * Create a test project
   */
  static createProject(userId: ObjectId | string, overrides: Record<string, unknown> = {}) {
    const counter = ++this.projectCounter;

    return {
      _id: new ObjectId(),
      userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
      title: overrides.title || `Test Project ${counter}`,
      description: overrides.description || `Description for test project ${counter}`,
      type: overrides.type || 'book',
      genre: overrides.genre || 'fiction',
      status: overrides.status || 'draft',
      visibility: overrides.visibility || 'private',
      chapters: overrides.chapters || [],
      worldBible: overrides.worldBible || {
        characters: [],
        locations: [],
        events: [],
        items: [],
        notes: [],
      },
      metadata: overrides.metadata || {
        wordCount: 0,
        chapterCount: 0,
        lastEdited: new Date(),
        version: '1.0.0',
      },
      collaborators: overrides.collaborators || [],
      tags: overrides.tags || ['test', 'automated'],
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides,
    };
  }

  /**
   * Create multiple test projects for a user
   */
  static createProjects(
    userId: ObjectId | string,
    count: number,
    overrides: Record<string, unknown> = {}
  ) {
    const projects = [];
    for (let i = 0; i < count; i++) {
      projects.push(this.createProject(userId, overrides));
    }
    return projects;
  }

  /**
   * Create test authentication data
   */
  static createAuthData(email?: string, password?: string) {
    const timestamp = Date.now();
    return {
      email: email || `test-auth-${timestamp}@example.com`,
      password: password || TEST_PASSWORDS.VALID_STRONG,
      name: 'Auth Test User',
    };
  }

  /**
   * Create a complete test scenario with user and projects
   */
  static async createScenario(
    options: {
      userCount?: number;
      projectsPerUser?: number;
      userOverrides?: Partial<User>;
      projectOverrides?: Record<string, unknown>;
    } = {}
  ) {
    const {
      userCount = 1,
      projectsPerUser = 2,
      userOverrides = {},
      projectOverrides = {},
    } = options;

    const scenario = {
      users: [] as User[],
      projects: [] as Record<string, unknown>[],
    };

    for (let i = 0; i < userCount; i++) {
      const user = await this.createUser(userOverrides);
      scenario.users.push(user);

      const projects = this.createProjects(user._id!, projectsPerUser, projectOverrides);
      scenario.projects.push(...projects);
    }

    return scenario;
  }

  /**
   * Create test data for API testing
   */
  static createApiTestData() {
    const timestamp = Date.now();

    return {
      validSignup: {
        email: `api-test-${timestamp}@example.com`,
        password: 'ValidPass123!',
        name: 'API Test User',
        username: `apiuser${timestamp}`,
      },
      invalidSignup: {
        missingEmail: {
          password: 'ValidPass123!',
          name: 'API Test User',
        },
        invalidEmail: {
          email: 'not-an-email',
          password: 'ValidPass123!',
          name: 'API Test User',
        },
        shortPassword: {
          email: `short-pass-${timestamp}@example.com`,
          password: '123',
          name: 'API Test User',
        },
      },
      validLogin: {
        email: `login-test-${timestamp}@example.com`,
        password: 'LoginPass123!',
      },
      invalidLogin: {
        wrongPassword: {
          email: `login-test-${timestamp}@example.com`,
          password: 'WrongPass123!',
        },
        nonExistentUser: {
          email: 'nonexistent@example.com',
          password: 'SomePass123!',
        },
      },
    };
  }

  /**
   * Create large payload for testing limits
   */
  static createLargePayload(sizeMB: number) {
    const sizeBytes = sizeMB * 1024 * 1024;
    const largeString = 'a'.repeat(sizeBytes);

    return {
      email: 'large-payload@example.com',
      password: 'ValidPass123!',
      name: 'Large Payload User',
      data: largeString,
    };
  }

  /**
   * Clean up test data (by email pattern)
   */
  static getTestDataPattern() {
    return {
      emailPattern: /^(test|api-test|login-test|rate-limit|token-test).*@example\.com$/,
      usernamePattern: /^(testuser|apiuser)\d+$/,
    };
  }
}

/**
 * Test data seeder for populating database with initial data
 */
export class TestDataSeeder {
  /**
   * Seed basic test data
   */
  static async seedBasicData() {
    const adminUser = await TestDataFactory.createUser({
      email: 'admin@example.com',
      name: 'Admin User',
      username: 'admin',
      role: 'admin',
      password: await hashPassword('Admin123!@#'),
    });

    const regularUser = await TestDataFactory.createUser({
      email: 'user@example.com',
      name: 'Regular User',
      username: 'regularuser',
      role: 'user',
      password: await hashPassword('User123!@#'),
    });

    const projects = [
      TestDataFactory.createProject(regularUser._id!, {
        title: 'The Great Adventure',
        description: 'An epic tale of courage and discovery',
        type: 'book',
        genre: 'adventure',
        status: 'in-progress',
      }),
      TestDataFactory.createProject(regularUser._id!, {
        title: 'Mystery at Midnight',
        description: 'A thrilling mystery novel',
        type: 'book',
        genre: 'mystery',
        status: 'draft',
      }),
    ];

    return {
      collections: {
        users: [adminUser, regularUser],
        projects,
      },
    };
  }

  /**
   * Seed performance test data
   */
  static async seedPerformanceData(userCount = 100, projectsPerUser = 10) {
    const users = await TestDataFactory.createUsers(userCount);
    const projects: Record<string, unknown>[] = [];

    for (const user of users) {
      projects.push(...TestDataFactory.createProjects(user._id!, projectsPerUser));
    }

    return {
      collections: {
        users,
        projects,
      },
    };
  }
}
