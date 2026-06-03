import { db } from "../db";
import { user, account } from "../db/schema/auth";

async function main() {
    console.log("Fetching users...");
    const users = await db.select().from(user);
    console.log("Users:", users);

    console.log("Fetching accounts...");
    const accounts = await db.select().from(account);
    console.log("Accounts (without password hashes):", accounts.map(a => ({
        id: a.id,
        userId: a.userId,
        providerId: a.providerId,
        accountId: a.accountId,
        hasPassword: !!a.password
    })));
}

main().catch(console.error);
