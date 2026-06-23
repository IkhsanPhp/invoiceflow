import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { EditProfileClient } from "./edit-client";
import { db } from "@/db";
import { invoices, vendors, vendorDocuments } from "@/db/schema/schema";
import { eq, desc } from "drizzle-orm";

export default async function EditProfilePage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || session.user.role !== "vendor") {
        redirect("/dashboard/profile");
    }

    let vendorDetails = null;
    let vendorDocs: any[] = [];
    const vendorRec = await db.select()
        .from(vendors)
        .where(eq(vendors.userId, session.user.id))
        .limit(1);
    if (vendorRec.length > 0) {
        vendorDetails = vendorRec[0];
        
        vendorDocs = await db.select()
            .from(vendorDocuments)
            .where(eq(vendorDocuments.vendorId, vendorDetails.id));
    }

    let pendingUpdate = null;
    if (vendorDetails) {
        const { vendorProfileUpdates } = await import("@/db/schema/schema");
        const updates = await db.select()
            .from(vendorProfileUpdates)
            .where(eq(vendorProfileUpdates.vendorId, vendorDetails.id))
            .orderBy(desc(vendorProfileUpdates.submittedAt))
            .limit(1);
        if (updates.length > 0 && (updates[0].status === "pending" || updates[0].status === "rejected")) {
            pendingUpdate = updates[0];
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Profil Vendor</h2>
            </div>
            <p className="text-muted-foreground mb-8">
                Perbarui informasi perusahaan dan dokumen pendukung Anda.
            </p>
            <EditProfileClient user={session.user} vendorDetails={vendorDetails} vendorDocs={vendorDocs} pendingUpdate={pendingUpdate} />
        </div>
    );
}
