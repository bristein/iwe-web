import { describe, test, expect, beforeEach } from 'vitest';
import { SuperTest, Test } from 'supertest';
import { createApiClient } from '../utils/api-client';

describe('Health Check API', () => {
  let client: SuperTest<Test>;

  beforeEach(async () => {
    client = await createApiClient();
  });

  describe('Basic Health Check', () => {
    test('should return healthy status', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
    });

    test('should include database connection status', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.database).toBe('connected');
    });

    test('should include timestamp in ISO format', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body.timestamp).toBeDefined();
      
      // Verify timestamp is valid ISO string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });
  });

  describe('Response Format', () => {
    test('should return JSON content type', async () => {
      const response = await client.get('/api/health');
      
      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should include security headers', async () => {
      const response = await client.get('/api/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    test('should have consistent response structure', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      expect(typeof response.body).toBe('object');
      expect(Array.isArray(response.body)).toBe(false);
      
      // Required fields
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database');
      
      // Field types
      expect(typeof response.body.status).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.database).toBe('string');
    });
  });

  describe('Performance', () => {
    test('should respond quickly', async () => {
      const startTime = Date.now();
      const response = await client.get('/api/health');
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // 1 second limit
    });

    test('should handle concurrent health checks', async () => {
      const promises = Array(5).fill(null).map(() => 
        client.get('/api/health')
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('HTTP Methods', () => {
    test('should only accept GET requests', async () => {
      const methods = ['post', 'put', 'delete', 'patch'] as const;
      
      for (const method of methods) {
        const response = await client[method]('/api/health');
        expect(response.status).toBe(405); // Method Not Allowed
      }
    });

    test('should handle HEAD requests', async () => {
      const response = await client.head('/api/health');
      
      // HEAD should return same status as GET but no body
      expect(response.status).toBe(200);
      expect(response.text || '').toBe(''); // Handle undefined text property
    });
  });

  describe('Error Scenarios', () => {
    test('should handle malformed requests gracefully', async () => {
      // Test with query parameters (should still work)
      const response = await client.get('/api/health?invalid=param');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });

    test('should handle requests with headers', async () => {
      const response = await client
        .get('/api/health')
        .set('X-Custom-Header', 'test-value');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Monitoring Integration', () => {
    test('should provide consistent health status for monitoring', async () => {
      // Make multiple requests to ensure consistency
      const responses = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await client.get('/api/health');
        responses.push(response);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // All responses should be healthy
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.database).toBe('connected');
      });
    });

    test('should include all necessary monitoring fields', async () => {
      const response = await client.get('/api/health');
      
      expect(response.status).toBe(200);
      
      // Core monitoring fields
      const requiredFields = ['status', 'timestamp', 'database'];
      requiredFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
        expect(response.body[field]).toBeDefined();
        expect(response.body[field]).not.toBe('');
      });
    });
  });
});