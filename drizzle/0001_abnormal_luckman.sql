CREATE TABLE `footer_link` (
	`id` text PRIMARY KEY NOT NULL,
	`group` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`image_url` text,
	`alt_text` text,
	`rel` text DEFAULT '' NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_footer_link_group_sort` ON `footer_link` (`group`,`sort`);