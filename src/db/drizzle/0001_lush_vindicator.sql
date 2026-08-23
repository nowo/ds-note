CREATE TABLE `vault_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title_enc` text NOT NULL,
	`content_enc` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_vault_notes_updated_at` ON `vault_notes` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_vault_notes_deleted_at` ON `vault_notes` (`deleted_at`);