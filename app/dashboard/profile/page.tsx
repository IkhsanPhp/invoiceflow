import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProfileClient } from "./profile-client";
import { db } from "@/db";
import { invoices, vendors } from "@/db/schema/schema";
import { eq, desc } from "drizzle-orm";

export default async function ProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect("/sign-in");
    }

    // Fetch invoices for notifications tab
    const userInvoices = await db.select()
        .from(invoices)
        .where(eq(invoices.vendorId, session.user.id))
        .orderBy(desc(invoices.updatedAt))
        .limit(10);

    let vendorDetails = null;
    if (session.user.role === "vendor") {
        const vendorRec = await db.select()
            .from(vendors)
            .where(eq(vendors.userId, session.user.id))
            .limit(1);
        if (vendorRec.length > 0) {
            vendorDetails = vendorRec[0];
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Account Settings</h2>
            </div>
            <p className="text-muted-foreground mb-8">
                Manage your profile information and account security.
            </p>
            <ProfileClient user={session.user} recentInvoices={userInvoices} vendorDetails={vendorDetails} />
        </div>
    );
}
