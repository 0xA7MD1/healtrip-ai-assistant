CREATE TABLE `doctors` (
	`id` text PRIMARY KEY NOT NULL,
	`is_synthetic` integer NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text NOT NULL,
	`gender` text NOT NULL,
	`title` text NOT NULL,
	`specialty_code` text NOT NULL,
	`hospital_id` text NOT NULL,
	`years_experience` integer NOT NULL,
	`languages` text NOT NULL,
	`consultation_fee` real NOT NULL,
	`currency` text NOT NULL,
	`offers_second_opinion` integer NOT NULL,
	`offers_telemedicine` integer NOT NULL,
	`next_available_in_days` integer NOT NULL,
	FOREIGN KEY (`specialty_code`) REFERENCES `specialties`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `doctors_specialty_idx` ON `doctors` (`specialty_code`);--> statement-breakpoint
CREATE INDEX `doctors_hospital_idx` ON `doctors` (`hospital_id`);--> statement-breakpoint
CREATE TABLE `emergency_numbers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_code` text NOT NULL,
	`service` text NOT NULL,
	`number` text NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text NOT NULL,
	`source_urls` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fee_benchmarks` (
	`country_code` text PRIMARY KEY NOT NULL,
	`currency` text NOT NULL,
	`min_fee` real NOT NULL,
	`max_fee` real NOT NULL,
	`notes` text,
	`source_urls` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hospital_specialties` (
	`hospital_id` text NOT NULL,
	`specialty_code` text NOT NULL,
	PRIMARY KEY(`hospital_id`, `specialty_code`),
	FOREIGN KEY (`hospital_id`) REFERENCES `hospitals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`specialty_code`) REFERENCES `specialties`(`code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hospitals` (
	`id` text PRIMARY KEY NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text NOT NULL,
	`country_code` text NOT NULL,
	`city_code` text NOT NULL,
	`city_en` text NOT NULL,
	`city_ar` text NOT NULL,
	`ownership` text,
	`has_24_7_emergency` integer,
	`serves_international_patients` integer,
	`accreditations` text NOT NULL,
	`website` text,
	`source_urls` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hospitals_city_idx` ON `hospitals` (`city_code`);--> statement-breakpoint
CREATE TABLE `specialties` (
	`code` text PRIMARY KEY NOT NULL,
	`name_en` text NOT NULL,
	`name_ar` text NOT NULL
);
