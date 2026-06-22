import { db } from './db';
import { user } from './db/schema/auth';
import { eq } from 'drizzle-orm';

async function run() {
    try {
        const admins = await db.select().from(user).where(eq(user.role, 'superadmin'));
        console.log("SUPER ADMINS:");
        console.dir(admins, { depth: null });
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
