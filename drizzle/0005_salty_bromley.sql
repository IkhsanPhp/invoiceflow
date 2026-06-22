CREATE TABLE "vendor_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"file_name" text NOT NULL,
	"uploaded_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "supplier" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "vendor_type" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "npwp" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "nik" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "nib" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "pkp_status" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "classification" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "flag_personal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "flag_ex_employee" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "flag_principal" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "province" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "email_company" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "telephone_company" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "pic_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "pic_email" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "pic_phone" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "bank_account_no" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "bank_account_name" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "is_bank_account_diff_name" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "is_asset_owner_diff" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "watchlist_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "blacklist_flag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "blacklist_reason" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "verification_comments" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "verified_by" text;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "vendor_documents" ADD CONSTRAINT "vendor_documents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;