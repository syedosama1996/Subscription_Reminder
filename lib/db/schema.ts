import { sql } from '@vercel/postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const activity_logs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  action: text('action').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'success', 'warning', 'info'
  metadata: text('metadata'), // JSON string for additional data
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Create the table if it doesn't exist
export async function createTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        metadata TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `;
    console.log('Activity logs table created successfully');
  } catch (error) {
    console.error('Error creating activity logs table:', error);
  }
} 