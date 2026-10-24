import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('records', {id:text('id').primaryKey(), owner:text('owner').notNull(), kind:text('kind').notNull(), data:text('data').notNull(), revision:integer('revision').notNull().default(1), created:text('created').notNull()});
export const events = sqliteTable('events', {id:text('id').primaryKey(), owner:text('owner').notNull(), action:text('action').notNull(), subject:text('subject').notNull(), created:text('created').notNull()});
