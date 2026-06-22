import { db } from './db';
import { emailLogs } from './db/schema/schema';
import { desc } from 'drizzle-orm';

async function run() {
    try {
        const logs = await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(5);
        console.log("LAST 5 EMAIL LOGS:");
        console.dir(logs, { depth: null });
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
