import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import { vi } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

/**
 * Creates a test Express app instance without starting the actual server
 */
export async function createTestApp(): Promise<Express> {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Import and register routes
  // Note: This is a simplified version for testing
  // In a real scenario, you'd mock the database and external dependencies

  return app;
}

/**
 * Creates a test HTTP server instance
 */
export async function createTestServer(): Promise<{ app: Express; server: Server }> {
  const app = await createTestApp();
  const server = createServer(app);

  return { app, server };
}

/**
 * Closes the test server
 */
export async function closeTestServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
