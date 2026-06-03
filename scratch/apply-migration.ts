import { db } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating user_permissions table...");
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "user_permissions" (
            "id" text PRIMARY KEY NOT NULL,
            "user_id" text NOT NULL,
            "menu_key" text NOT NULL,
            "can_access" boolean DEFAULT false NOT NULL,
            "can_create" boolean DEFAULT false NOT NULL,
            "can_update" boolean DEFAULT false NOT NULL,
            "can_delete" boolean DEFAULT false NOT NULL,
            "created_at" timestamp NOT NULL DEFAULT NOW(),
            "updated_at" timestamp NOT NULL DEFAULT NOW()
        );
    `);
    console.log("Adding foreign key constraint...");
    try {
        await db.execute(sql`
            ALTER TABLE "user_permissions" 
            ADD CONSTRAINT "user_permissions_user_id_user_id_fk" 
            FOREIGN KEY ("user_id") 
            REFERENCES "user"("id") 
            ON DELETE cascade ON UPDATE no action;
        `);
        console.log("Constraint added successfully.");
    } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.log("Constraint might already exist or failed:", errMsg);
    }
    console.log("Migration applied successfully!");
}

main().catch(console.error);
