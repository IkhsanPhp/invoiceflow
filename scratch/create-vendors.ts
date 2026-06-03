import { db } from "@/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Executing CREATE TABLE \"vendors\" raw SQL...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "vendors" (
                "id" text PRIMARY KEY NOT NULL,
                "supplier" text NOT NULL,
                "name_of_vendor" text NOT NULL,
                "street" text,
                "country" text,
                "postal_code" text,
                "city" text,
                "account_group" text DEFAULT 'NCAD' NOT NULL,
                "search_term" text,
                "purch_organization" text DEFAULT '2000' NOT NULL,
                "purch_org_descr" text DEFAULT 'Chitra (Central)' NOT NULL,
                "terms_of_payment" text,
                "incoterms" text,
                "minimum_order_value" numeric(16, 2) DEFAULT '0.00',
                "order_currency" text DEFAULT 'USD' NOT NULL,
                "salesperson" text,
                "telephone" text,
                "num_purchasing_orgs" integer DEFAULT 1 NOT NULL,
                "status" text DEFAULT 'Active' NOT NULL,
                "created_at" timestamp NOT NULL DEFAULT NOW(),
                "updated_at" timestamp NOT NULL DEFAULT NOW(),
                CONSTRAINT "vendors_supplier_unique" UNIQUE("supplier")
            );
        `);
        console.log("SQL Execution SUCCESSFUL! Vendors table is created.");
    } catch (error) {
        console.error("SQL Execution FAILED:", error);
    }
}

main();
