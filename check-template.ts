import { db } from './db';
import { emailTemplates } from './db/schema/schema';
import { eq } from 'drizzle-orm';

async function run() {
    try {
        const templates = await db.select().from(emailTemplates).where(eq(emailTemplates.name, 'invoice_status_updated'));
        console.log("TEMPLATE:");
        console.dir(templates, { depth: null });
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
