import { createTables } from './schema';

export async function initializeDatabase() {
  try {
    await createTables();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
} 