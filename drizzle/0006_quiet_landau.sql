CREATE TABLE "email_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"status" text NOT NULL,
	"error_msg" text,
	"sent_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"description" text,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
