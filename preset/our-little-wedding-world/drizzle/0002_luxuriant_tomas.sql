CREATE TABLE `cms_media` (
	`key` text PRIMARY KEY NOT NULL,
	`site` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cms_sites` (
	`slug` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`draft` text NOT NULL,
	`published` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `garden_players` ADD `site` text DEFAULT 'faris-eliza' NOT NULL;--> statement-breakpoint
ALTER TABLE `wedding_wishes` ADD `site` text DEFAULT 'faris-eliza' NOT NULL;--> statement-breakpoint
ALTER TABLE `wedding_wishes` ADD `hidden` integer DEFAULT 0 NOT NULL;