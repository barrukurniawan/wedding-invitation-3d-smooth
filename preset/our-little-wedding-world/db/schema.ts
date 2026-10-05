import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const players=sqliteTable('garden_players',{
 site:text('site').notNull().default('faris-eliza'),id:text('id').primaryKey(),token:text('token').notNull(),state:text('state').notNull(),seen:integer('seen').notNull(),message:text('message').notNull().default(''),messageAt:integer('message_at').notNull().default(0)
},t=>[index('garden_players_seen').on(t.seen),index('garden_players_site_seen').on(t.site,t.seen)]);
export const wishes=sqliteTable('wedding_wishes',{
 site:text('site').notNull().default('faris-eliza'),hidden:integer('hidden').notNull().default(0),id:integer('id').primaryKey({autoIncrement:true}),requestId:text('request_id').notNull().unique(),name:text('name').notNull(),message:text('message').notNull(),createdAt:integer('created_at').notNull()
},t=>[index('wedding_wishes_site_id').on(t.site,t.id)]);
export const sites=sqliteTable('cms_sites',{
 slug:text('slug').primaryKey(),title:text('title').notNull(),draft:text('draft').notNull(),published:text('published'),revision:integer('revision').notNull().default(1),active:integer('active').notNull().default(1),updatedAt:integer('updated_at').notNull()
});
export const media=sqliteTable('cms_media',{
 key:text('key').primaryKey(),site:text('site').notNull(),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),createdAt:integer('created_at').notNull()
});
