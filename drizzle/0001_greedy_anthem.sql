CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"metadata" jsonb,
	"logged_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "batch_items" (
	"batch_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	CONSTRAINT "batch_items_batch_id_invoice_id_pk" PRIMARY KEY("batch_id","invoice_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" timestamp,
	"due_date" timestamp,
	"total_amount" numeric(16, 2),
	"status" text DEFAULT 'Pending OCR' NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"channel" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"sent_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocr_results" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"extracted_data" jsonb,
	"processed_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"batch_date" timestamp NOT NULL,
	"status" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"section" text NOT NULL,
	"passed" boolean NOT NULL,
	"comments" text,
	"checked_by" text NOT NULL,
	"checked_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'vendor' NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_batch_id_payment_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."payment_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch_items" ADD CONSTRAINT "batch_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_documents" ADD CONSTRAINT "invoice_documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendor_id_user_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_document_id_invoice_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."invoice_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_batches" ADD CONSTRAINT "payment_batches_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_checked_by_user_id_fk" FOREIGN KEY ("checked_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;