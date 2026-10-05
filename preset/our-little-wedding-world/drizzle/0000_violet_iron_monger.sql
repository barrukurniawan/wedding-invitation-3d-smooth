CREATE TABLE `garden_players` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`state` text NOT NULL,
	`seen` integer NOT NULL,
	`message` text DEFAULT '' NOT NULL,
	`message_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `garden_players_seen` ON `garden_players` (`seen`);