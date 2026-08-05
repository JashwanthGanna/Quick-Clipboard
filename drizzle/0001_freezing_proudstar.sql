CREATE TABLE `clipboards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(6) NOT NULL,
	`content` text NOT NULL,
	`selfDestruct` int NOT NULL DEFAULT 0,
	`viewed` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `clipboards_id` PRIMARY KEY(`id`),
	CONSTRAINT `clipboards_code_unique` UNIQUE(`code`)
);
