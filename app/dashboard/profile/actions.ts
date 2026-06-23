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
            
            updatedAt: new Date(),
        };

        // Update the vendors table
        await db.update(vendors)
            .set(vendorUpdateData)
            .where(eq(vendors.id, vendorRecord.id));

        // Update vendor documents if provided
        if (data.documents && Array.isArray(data.documents)) {
            // Delete old documents
            await db.delete(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorRecord.id));
            
            // Insert new documents
            if (data.documents.length > 0) {
                await db.insert(vendorDocuments).values(
                    data.documents.map((doc: any) => ({
                        vendorId: vendorRecord.id,
                        docType: doc.docType,
                        fileUrl: doc.fileUrl,
                        fileName: doc.fileName,
                        fileSize: doc.fileSize,
                        uploadedAt: new Date(),
                    }))
                );
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Failed to update vendor profile:", error);
        return { error: error.message || "Failed to update profile" };
    }
}
