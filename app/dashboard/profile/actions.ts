"use server";

import { db } from "@/db";
import { vendors, vendorDocuments } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function updateVendorProfile(data: any) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user || session.user.role !== "vendor") {
            return { error: "Unauthorized access or not a vendor" };
        }

        const vendorRecs = await db.select()
            .from(vendors)
            .where(eq(vendors.userId, session.user.id))
            .limit(1);

        if (vendorRecs.length === 0) {
            return { error: "Vendor record not found" };
        }
        const vendorRecord = vendorRecs[0];

        // Update the user name if provided
        if (data.name) {
            await db.update(user)
                .set({ name: data.name })
                .where(eq(user.id, session.user.id));
        }

        // Prepare the vendor data to update
        const vendorUpdateData = {
            // Info Umum
            accountGroup: data.accountGroup,
            orderCurrency: data.orderCurrency,
            termsOfPayment: data.termsOfPayment,
            incoterms: data.incoterms,
            minimumOrderValue: data.minimumOrderValue,
            searchTerm: data.searchTerm,
            street: data.street,
            city: data.city,
            country: data.country,
            postalCode: data.postalCode,
            salesperson: data.salesperson,
            telephone: data.telephone,
            purchOrganization: data.purchOrganization,
            purchOrgDescr: data.purchOrgDescr,

            // Data SOP
            vendorType: data.vendorType,
            npwp: data.npwp,
            nik: data.nik,
            nib: data.nib,
            pkpStatus: data.pkpStatus,
            classification: data.classification,
            flagPersonal: data.flagPersonal,
            flagExEmployee: data.flagExEmployee,
            flagPrincipal: data.flagPrincipal,
            province: data.province,
            emailCompany: data.emailCompany,
            telephoneCompany: data.telephoneCompany,
            picName: data.picName,
            picEmail: data.picEmail,
            picPhone: data.picPhone,
            bankName: data.bankName,
            bankAccountNo: data.bankAccountNo,
            bankAccountName: data.bankAccountName,
            isBankAccountDiffName: data.isBankAccountDiffName,
            isAssetOwnerDiff: data.isAssetOwnerDiff,
            
            // Documents
            documents: data.documents || [],
        };

        // Check if there's already a pending update, we can either overwrite it or reject the action.
        // Let's overwrite any existing pending updates for this vendor to keep only the latest request.
        const { vendorProfileUpdates } = await import("@/db/schema/schema");
        await db.delete(vendorProfileUpdates).where(
            eq(vendorProfileUpdates.vendorId, vendorRecord.id) && eq(vendorProfileUpdates.status, "pending")
        );

        // Insert new pending update
        await db.insert(vendorProfileUpdates).values({
            vendorId: vendorRecord.id,
            status: "pending",
            submittedData: vendorUpdateData,
        });

        // Trigger Notification to Procurement
        const { notifications } = await import("@/db/schema/schema");
        // We insert a system notification for the vendor themselves
        await db.insert(notifications).values({
            userId: vendorRecord.userId,
            channel: "in_app",
            eventType: "vendor_update_submitted",
            payload: { message: "Your profile update has been submitted and is pending procurement review." },
        });

        // Trigger Email to Procurement (mock email log or real sending if configured)
        const { sendEmail } = await import("@/lib/email");
        await sendEmail({
            to: "procurement@tmt.co.id", // Generic procurement email
            subject: `[InvoiceFlow] Vendor Profile Update Pending Audit - ${vendorRecord.nameOfVendor}`,
            body: `
                <p>Hello Procurement Team,</p>
                <p>Vendor <strong>${vendorRecord.nameOfVendor}</strong> has submitted profile updates.</p>
                <p>Please log in to InvoiceFlow to review the changes and approve or reject them.</p>
                <br/>
                <p>Regards,<br/>InvoiceFlow System</p>
            `,
        }).catch(err => console.error("Email send failed (might be expected if SMTP not configured):", err));
        
        // Return success with a flag that it's pending audit
        return { success: true, pendingAudit: true };
    } catch (error: any) {
        console.error("Failed to update vendor profile:", error);
        return { error: error.message || "Failed to update profile" };
    }
}
