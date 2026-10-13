-- Target business tables for the reviewed SQLite migration. Generated from schema.sqlite.ts.
CREATE TABLE `ai_generation` (
	`id` text PRIMARY KEY NOT NULL,
	`ai_task_id` text NOT NULL,
	`user_id` text NOT NULL,
	`vehicle_slug` text NOT NULL,
	`template_version` text NOT NULL,
	`mode` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`style` text,
	`base_color` text,
	`input_assets_json` text DEFAULT '[]' NOT NULL,
	`provider_prediction_id` text,
	`idempotency_key` text NOT NULL,
	`cost_credits` integer NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`output_key` text,
	`output_url` text,
	`completion_claim` text,
	`completion_claimed_at` integer,
	`error_summary` text,
	`refund_status` text DEFAULT 'not-required' NOT NULL,
	`last_polled_at` integer,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`ai_task_id`) REFERENCES `ai_task`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `ai_generation_ai_task_id_unique` ON `ai_generation` (`ai_task_id`);
CREATE UNIQUE INDEX `ai_generation_provider_prediction_id_unique` ON `ai_generation` (`provider_prediction_id`);
CREATE UNIQUE INDEX `ai_generation_idempotency_key_unique` ON `ai_generation` (`idempotency_key`);
CREATE INDEX `idx_ai_generation_user_status` ON `ai_generation` (`user_id`,`status`);
CREATE TABLE `design` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_wrap_id` text,
	`vehicle_slug` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`snapshot_json` text NOT NULL,
	`texture_key` text,
	`texture_url` text,
	`cover_key` text,
	`cover_url` text,
	`finish` text DEFAULT 'gloss' NOT NULL,
	`template_version` text DEFAULT 'legacy' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`uses_ai` integer DEFAULT false NOT NULL,
	`public_prompt` integer DEFAULT false NOT NULL,
	`prompt` text,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`publish_key` text NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`remix_count` integer DEFAULT 0 NOT NULL,
	`share_count` integer DEFAULT 0 NOT NULL,
	`published_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_wrap_id`) REFERENCES `user_wrap`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE UNIQUE INDEX `design_slug_unique` ON `design` (`slug`);
CREATE UNIQUE INDEX `design_publish_key_unique` ON `design` (`publish_key`);
CREATE INDEX `idx_design_public_feed` ON `design` (`visibility`,`moderation_status`,`published_at`);
CREATE INDEX `idx_design_owner` ON `design` (`owner_id`,`published_at`);
CREATE INDEX `idx_design_vehicle` ON `design` (`vehicle_slug`,`published_at`);
CREATE TABLE `design_remix` (
	`id` text PRIMARY KEY NOT NULL,
	`source_design_id` text NOT NULL,
	`target_wrap_id` text,
	`user_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`source_design_id`) REFERENCES `design`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_wrap_id`) REFERENCES `user_wrap`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `design_remix_idempotency_key_unique` ON `design_remix` (`idempotency_key`);
CREATE UNIQUE INDEX `uq_design_remix_target` ON `design_remix` (`target_wrap_id`);
CREATE TABLE `user_asset` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`storage_key` text NOT NULL,
	`public_url` text,
	`mime_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`width` integer,
	`height` integer,
	`content_hash` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_user_asset_owner_key` ON `user_asset` (`owner_id`,`storage_key`);
CREATE INDEX `idx_user_asset_owner` ON `user_asset` (`owner_id`,`deleted_at`);
CREATE TABLE `user_wrap` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`vehicle_slug` text NOT NULL,
	`name` text NOT NULL,
	`template_version` text NOT NULL,
	`canvas_json` text DEFAULT '{}' NOT NULL,
	`texture_key` text,
	`texture_url` text,
	`cover_key` text,
	`cover_url` text,
	`finish` text DEFAULT 'gloss' NOT NULL,
	`source_design_id` text,
	`idempotency_key` text,
	`version` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX `user_wrap_idempotency_key_unique` ON `user_wrap` (`idempotency_key`);
CREATE INDEX `idx_user_wrap_user_status` ON `user_wrap` (`user_id`,`status`);
CREATE INDEX `idx_user_wrap_vehicle` ON `user_wrap` (`vehicle_slug`);
