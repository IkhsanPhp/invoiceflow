ALTER TABLE "invoices" ADD COLUMN "gr_details" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "shipping_details" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "finance_notes" text;