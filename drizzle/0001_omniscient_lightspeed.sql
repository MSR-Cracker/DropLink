CREATE TABLE `uploadIntents` (
	`id` varchar(36) NOT NULL,
	`ownerHash` varchar(64) NOT NULL,
	`status` enum('pending','uploading') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploadIntents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` varchar(36) NOT NULL,
	`ownerHash` varchar(64) NOT NULL,
	`ownerType` enum('account','guest') NOT NULL,
	`originalName` varchar(255) NOT NULL,
	`category` enum('image','pdf','audio','video','document','archive','other') NOT NULL,
	`contentType` varchar(127) NOT NULL,
	`sizeBytes` bigint NOT NULL,
	`objectKey` varchar(127) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `uploads_id` PRIMARY KEY(`id`),
	CONSTRAINT `uploads_objectKey_unique` UNIQUE(`objectKey`)
);
--> statement-breakpoint
CREATE INDEX `upload_intents_owner_expiry_idx` ON `uploadIntents` (`ownerHash`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `uploads_owner_created_idx` ON `uploads` (`ownerHash`,`createdAt`);--> statement-breakpoint
CREATE INDEX `uploads_owner_name_idx` ON `uploads` (`ownerHash`,`originalName`);--> statement-breakpoint
CREATE INDEX `uploads_owner_category_idx` ON `uploads` (`ownerHash`,`category`);