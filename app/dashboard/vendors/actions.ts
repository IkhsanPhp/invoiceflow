"use server";

import { db } from "@/db";
import { vendors, vendorDocuments, auditLogs, userPermissions, invoices, notifications } from "@/db/schema/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";

async function checkPermission(userId: string, role: string | null | undefined, action: "canAccess" | "canCreate" | "canUpdate" | "canDelete") {
    if (role === "admin") return true;

    // Fetch custom override for vendors-master
    const perm = await db.select().from(userPermissions).where(
        and(
            eq(userPermissions.userId, userId),
            eq(userPermissions.menuKey, "vendors-master")
        )
    ).limit(1);

    if (perm.length > 0) {
        return perm[0][action];
    }

    // Default fallback rules for procurement role
    if (role === "procurement") {
        if (action === "canAccess" || action === "canCreate" || action === "canUpdate") {
            return true;
        }
    }

    return false;
}

export async function getVendors() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canAccess");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to view vendors." };
        }

        const list = await db.select().from(vendors).orderBy(desc(vendors.createdAt));
        return { success: true, vendors: list };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to fetch vendors";
        console.error("Failed to fetch vendors:", error);
        return { success: false, error: errMsg };
    }
}

export async function createVendor(data: {
    supplier: string;
    nameOfVendor: string;
    street?: string | null;
    country?: string | null;
    postalCode?: string | null;
    city?: string | null;
    accountGroup: string;
    searchTerm?: string | null;
    purchOrganization: string;
    purchOrgDescr: string;
    termsOfPayment?: string | null;
    incoterms?: string | null;
    minimumOrderValue?: string | null;
    orderCurrency: string;
    salesperson?: string | null;
    telephone?: string | null;
    numPurchasingOrgs: number;
    status: string;
}) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canCreate");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to create vendors." };
        }

        // Simple duplicate check
        const existing = await db.select().from(vendors).where(eq(vendors.supplier, data.supplier)).limit(1);
        if (existing.length > 0) {
            return { success: false, error: `Supplier code ${data.supplier} already exists.` };
        }

        const newVendor = await db.insert(vendors).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        return { success: true, vendor: newVendor[0] };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to create vendor";
        console.error("Failed to create vendor:", error);
        return { success: false, error: errMsg };
    }
}

export async function updateVendor(id: string, data: {
    supplier: string;
    nameOfVendor: string;
    street?: string | null;
    country?: string | null;
    postalCode?: string | null;
    city?: string | null;
    accountGroup: string;
    searchTerm?: string | null;
    purchOrganization: string;
    purchOrgDescr: string;
    termsOfPayment?: string | null;
    incoterms?: string | null;
    minimumOrderValue?: string | null;
    orderCurrency: string;
    salesperson?: string | null;
    telephone?: string | null;
    numPurchasingOrgs: number;
    status: string;
}) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canUpdate");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to update vendors." };
        }

        // Check for other vendor with same supplier code
        const duplicates = await db.select().from(vendors).where(eq(vendors.supplier, data.supplier));
        const hasDuplicate = duplicates.some(v => v.id !== id);
        if (hasDuplicate) {
            return { success: false, error: `Supplier code ${data.supplier} is already in use by another vendor.` };
        }

        const updated = await db.update(vendors)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(vendors.id, id))
            .returning();

        if (updated.length === 0) {
            return { success: false, error: "Vendor not found or no changes made." };
        }

        return { success: true, vendor: updated[0] };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to update vendor";
        console.error("Failed to update vendor:", error);
        return { success: false, error: errMsg };
    }
}

export async function deleteVendor(id: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canDelete");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to delete vendors." };
        }

        // Fetch vendor first to get userId for cascading deletes
        const vendorRecord = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
        if (vendorRecord.length === 0) {
            return { success: false, error: "Vendor not found." };
        }
        const vendor = vendorRecord[0];

        // If this vendor has a linked user account, delete all related data:
        // invoices (cascade: invoice_documents, ocr_results, verifications, batch_items)
        // notifications, userPermissions
        if (vendor.userId) {
            await db.delete(invoices).where(eq(invoices.vendorId, vendor.userId));
            await db.delete(notifications).where(eq(notifications.userId, vendor.userId));
            await db.delete(userPermissions).where(eq(userPermissions.userId, vendor.userId));
        }

        // Delete vendor documents and the vendor record itself
        // (vendorDocuments already cascade from vendors.id in DB, but we delete explicitly to be safe)
        await db.delete(vendorDocuments).where(eq(vendorDocuments.vendorId, id));
        const deleted = await db.delete(vendors).where(eq(vendors.id, id)).returning();

        // Log audit trace
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: "Delete Vendor",
            targetType: "Vendor",
            targetId: id,
            metadata: {
                vendorName: vendor.nameOfVendor,
                supplierCode: vendor.supplier,
                deletedBy: session.user.email
            },
            loggedAt: new Date()
        });

        return { success: true, vendor: deleted[0] };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to delete vendor";
        console.error("Failed to delete vendor:", error);
        return { success: false, error: errMsg };
    }
}

interface ImportVendorRow {
    supplier?: string | number | null;
    nameOfVendor?: string | null;
    street?: string | null;
    country?: string | null;
    postalCode?: string | number | null;
    city?: string | null;
    accountGroup?: string | null;
    searchTerm?: string | null;
    purchOrganization?: string | null;
    purchOrgDescr?: string | null;
    termsOfPayment?: string | null;
    incoterms?: string | null;
    minimumOrderValue?: string | number | null;
    orderCurrency?: string | null;
    salesperson?: string | null;
    telephone?: string | null;
    numPurchasingOrgs?: string | number | null;
    status?: string | null;
}

export async function importVendors(list: ImportVendorRow[]) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canCreate");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to import vendors." };
        }

        const results = [];
        for (const data of list) {
            const supplierStr = String(data.supplier || "").trim();
            if (!supplierStr) continue;

            const res = await db.insert(vendors).values({
                id: crypto.randomUUID(),
                supplier: supplierStr,
                nameOfVendor: String(data.nameOfVendor || "").trim() || "Unnamed Vendor",
                street: data.street ? String(data.street).trim() : null,
                country: data.country ? String(data.country).trim() : null,
                postalCode: data.postalCode ? String(data.postalCode).trim() : null,
                city: data.city ? String(data.city).trim() : null,
                accountGroup: data.accountGroup ? String(data.accountGroup).trim() : "NCAD",
                searchTerm: data.searchTerm ? String(data.searchTerm).trim() : null,
                purchOrganization: data.purchOrganization ? String(data.purchOrganization).trim() : "2000",
                purchOrgDescr: data.purchOrgDescr ? String(data.purchOrgDescr).trim() : "Chitra (Central)",
                termsOfPayment: data.termsOfPayment ? String(data.termsOfPayment).trim() : null,
                incoterms: data.incoterms ? String(data.incoterms).trim() : null,
                minimumOrderValue: data.minimumOrderValue ? String(data.minimumOrderValue).trim() : "0.00",
                orderCurrency: data.orderCurrency ? String(data.orderCurrency).trim() : "USD",
                salesperson: data.salesperson ? String(data.salesperson).trim() : null,
                telephone: data.telephone ? String(data.telephone).trim() : null,
                numPurchasingOrgs: Number(data.numPurchasingOrgs || 1),
                status: data.status ? String(data.status).trim() : "Active",
                createdAt: new Date(),
                updatedAt: new Date(),
            }).onConflictDoUpdate({
                target: vendors.supplier,
                set: {
                    nameOfVendor: String(data.nameOfVendor || "").trim() || "Unnamed Vendor",
                    street: data.street ? String(data.street).trim() : null,
                    country: data.country ? String(data.country).trim() : null,
                    postalCode: data.postalCode ? String(data.postalCode).trim() : null,
                    city: data.city ? String(data.city).trim() : null,
                    accountGroup: data.accountGroup ? String(data.accountGroup).trim() : "NCAD",
                    searchTerm: data.searchTerm ? String(data.searchTerm).trim() : null,
                    purchOrganization: data.purchOrganization ? String(data.purchOrganization).trim() : "2000",
                    purchOrgDescr: data.purchOrgDescr ? String(data.purchOrgDescr).trim() : "Chitra (Central)",
                    termsOfPayment: data.termsOfPayment ? String(data.termsOfPayment).trim() : null,
                    incoterms: data.incoterms ? String(data.incoterms).trim() : null,
                    minimumOrderValue: data.minimumOrderValue ? String(data.minimumOrderValue).trim() : "0.00",
                    orderCurrency: data.orderCurrency ? String(data.orderCurrency).trim() : "USD",
                    salesperson: data.salesperson ? String(data.salesperson).trim() : null,
                    telephone: data.telephone ? String(data.telephone).trim() : null,
                    numPurchasingOrgs: Number(data.numPurchasingOrgs || 1),
                    status: data.status ? String(data.status).trim() : "Active",
                    updatedAt: new Date(),
                }
            }).returning();
            results.push(res[0]);
        }
        return { success: true, count: results.length };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to import vendors";
        console.error("Failed to import vendors:", error);
        return { success: false, error: errMsg };
    }
}

export async function getVendorDocuments(vendorId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canAccess");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to view vendor documents." };
        }

        const docs = await db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, vendorId));
        return { success: true, documents: docs };
    } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : "Failed to fetch vendor documents";
        console.error("Failed to fetch vendor documents:", error);
        return { success: false, error: errMsg };
    }
}

export async function approveVendor(vendorId: string, termsOfPayment: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canUpdate");
        if (!hasPerm) {
            return { success: false, error: "Access denied: you do not have permission to verify/approve vendors." };
        }

        // Auto-generate supplier code starting from 200001
        const allVendors = await db.select({ supplier: vendors.supplier }).from(vendors);
        let maxSupplierCode = 200000;
        for (const v of allVendors) {
            if (v.supplier && !isNaN(Number(v.supplier))) {
                const num = parseInt(v.supplier, 10);
                if (num > maxSupplierCode) {
                    maxSupplierCode = num;
                }
            }
        }
        const supplierCode = (maxSupplierCode + 1).toString();

        const formattedTop = `${termsOfPayment} Hari`;

        const updated = await db.update(vendors)
            .set({
                supplier: supplierCode,
                termsOfPayment: formattedTop,
                status: "Active",
                verifiedBy: session.user.id,
                verifiedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(vendors.id, vendorId))
            .returning();

        if (updated.length === 0) {
            return { success: false, error: "Vendor not found." };
        }

        // Log audit trace
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            action: "Approve Vendor",
            targetType: "Vendor",
            targetId: vendorId,
            metadata: {
                supplierCode,
                vendorName: updated[0].nameOfVendor,
                verifiedBy: session.user.email
            },
            loggedAt: new Date()
        });

        // Send approval email asynchronously
        if (updated[0].emailCompany) {
            sendEmail({
                to: updated[0].emailCompany,
                templateName: "vendor_approved",
                placeholders: {
                    vendorName: updated[0].nameOfVendor,
                    supplierCode: supplierCode
                }
            }).catch(err => console.error("Failed to send vendor approval email:", err));
        }

        return { success: true, vendor: updated[0] };
    } catch (error: any) {
        console.error("Failed to approve vendor:", error);
        return { success: false, error: error.message || "Failed to approve vendor" };
    }
}

export async function getPendingUpdates() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canAccess");
        if (!hasPerm) {
            return { success: false, error: "Access denied" };
        }

        const { vendorProfileUpdates } = await import("@/db/schema/schema");
        // We fetch pending updates and join with vendors to get the vendor name/email
        const pendingList = await db.select({
            id: vendorProfileUpdates.id,
            vendorId: vendorProfileUpdates.vendorId,
            status: vendorProfileUpdates.status,
            submittedData: vendorProfileUpdates.submittedData,
            submittedAt: vendorProfileUpdates.submittedAt,
            vendorName: vendors.nameOfVendor,
            vendorEmail: vendors.emailCompany,
            picEmail: vendors.picEmail,
            supplier: vendors.supplier,
        })
        .from(vendorProfileUpdates)
        .leftJoin(vendors, eq(vendorProfileUpdates.vendorId, vendors.id))
        .where(eq(vendorProfileUpdates.status, "pending"))
        .orderBy(desc(vendorProfileUpdates.submittedAt));

        // Fetch current master data for each vendor to enable diff comparison
        const enrichedList = await Promise.all(pendingList.map(async (update) => {
            const currentVendor = await db.select().from(vendors).where(eq(vendors.id, update.vendorId)).limit(1);
            const currentDocs = await db.select().from(vendorDocuments).where(eq(vendorDocuments.vendorId, update.vendorId));
            return {
                ...update,
                currentData: currentVendor.length > 0 ? currentVendor[0] : null,
                currentDocs: currentDocs,
            };
        }));

        return { success: true, pendingUpdates: enrichedList };
    } catch (error: any) {
        console.error("Failed to fetch pending updates:", error);
        return { success: false, error: error.message || "Failed to fetch pending updates" };
    }
}


export async function approveVendorUpdate(updateId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) return { success: false, error: "Unauthorized" };
        
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canUpdate");
        if (!hasPerm) return { success: false, error: "Access denied" };

        const { vendorProfileUpdates } = await import("@/db/schema/schema");
        
        const updateRecs = await db.select().from(vendorProfileUpdates).where(eq(vendorProfileUpdates.id, updateId)).limit(1);
        if (updateRecs.length === 0) throw new Error("Update request not found");
        const updateReq = updateRecs[0];
        if (updateReq.status !== "pending") throw new Error("Request is not pending");

        const data: any = updateReq.submittedData;
        
        // 1. Update the master vendors table
        const vendorUpdateData = {
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

        await db.update(vendors).set(vendorUpdateData).where(eq(vendors.id, updateReq.vendorId));

        // 2. Update documents
        if (data.documents && Array.isArray(data.documents)) {
            await db.delete(vendorDocuments).where(eq(vendorDocuments.vendorId, updateReq.vendorId));
            if (data.documents.length > 0) {
                await db.insert(vendorDocuments).values(
                    data.documents.map((doc: any) => ({
                        vendorId: updateReq.vendorId,
                        docType: doc.docType,
                        fileUrl: doc.fileUrl,
                        fileName: doc.fileName,
                        fileSize: doc.fileSize,
                        uploadedAt: new Date(),
                    }))
                );
            }
        }

        // 3. Mark update as approved
        await db.update(vendorProfileUpdates).set({
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
        }).where(eq(vendorProfileUpdates.id, updateId));

        // 4. Notify vendor
        const vendorData = await db.select().from(vendors).where(eq(vendors.id, updateReq.vendorId)).limit(1);
        if (vendorData.length > 0) {
            await db.insert(notifications).values({
                userId: vendorData[0].userId!,
                channel: "in_app",
                eventType: "vendor_update_approved",
                payload: { message: "Your profile update has been approved and your master data is updated." },
            });
            await sendEmail({
                to: vendorData[0].emailCompany || vendorData[0].picEmail || "vendor@example.com",
                subject: "[InvoiceFlow] Profile Update Approved",
                body: `<p>Hello ${vendorData[0].nameOfVendor},</p><p>Your requested profile updates have been approved by the Procurement team. Your master data is now up to date in the system.</p>`,
            }).catch(e => console.error("Email failed:", e));
        }
        // 5. Add audit log entry
        await db.insert(auditLogs).values({
            action: "VENDOR_UPDATE_APPROVED",
            userId: session.user.id,
            targetType: "Vendor",
            targetId: updateReq.vendorId,
            metadata: { updateId, approvedBy: session.user.name || session.user.email },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to approve update:", error);
        return { success: false, error: error.message };
    }
}

export async function rejectVendorUpdate(updateId: string, notes: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) return { success: false, error: "Unauthorized" };
        const hasPerm = await checkPermission(session.user.id, session.user.role, "canUpdate");
        if (!hasPerm) return { success: false, error: "Access denied" };

        const { vendorProfileUpdates } = await import("@/db/schema/schema");
        
        const updateRecs = await db.select().from(vendorProfileUpdates).where(eq(vendorProfileUpdates.id, updateId)).limit(1);
        if (updateRecs.length === 0) throw new Error("Update request not found");
        const updateReq = updateRecs[0];

        // 1. Mark as rejected
        await db.update(vendorProfileUpdates).set({
            status: "rejected",
            revisionNotes: notes,
            reviewedAt: new Date(),
            reviewedBy: session.user.id,
        }).where(eq(vendorProfileUpdates.id, updateId));

        // 2. Notify vendor
        const vendorData = await db.select().from(vendors).where(eq(vendors.id, updateReq.vendorId)).limit(1);
        if (vendorData.length > 0) {
            await db.insert(notifications).values({
                userId: vendorData[0].userId!,
                channel: "in_app",
                eventType: "vendor_update_rejected",
                payload: { message: "Your profile update requires revision. Please check your profile." },
            });
            await sendEmail({
                to: vendorData[0].emailCompany || vendorData[0].picEmail || "vendor@example.com",
                subject: "[InvoiceFlow] Profile Update Requires Revision",
                body: `<p>Hello ${vendorData[0].nameOfVendor},</p><p>Your profile update was reviewed by the Procurement team and requires revisions.</p><p><strong>Revision Notes:</strong> ${notes}</p><p>Please log into InvoiceFlow and resubmit your update.</p>`,
            }).catch(e => console.error("Email failed:", e));
        }

        // 3. Add audit log entry
        await db.insert(auditLogs).values({
            action: "VENDOR_UPDATE_REVISION",
            userId: session.user.id,
            targetType: "Vendor",
            targetId: updateReq.vendorId,
            metadata: { updateId, revisionNotes: notes, reviewedBy: session.user.name || session.user.email },
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to reject update:", error);
        return { success: false, error: error.message };
    }
}

export async function getVendorHistory(vendorId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        if (!session || !session.user) return { success: false, error: "Unauthorized" };

        const { auditLogs, vendorProfileUpdates } = await import("@/db/schema/schema");
        
        const logs = await db.select().from(auditLogs).where(eq(auditLogs.targetId, vendorId)).orderBy(desc(auditLogs.loggedAt));
        const updates = await db.select().from(vendorProfileUpdates).where(eq(vendorProfileUpdates.vendorId, vendorId)).orderBy(desc(vendorProfileUpdates.submittedAt));
        
        return { success: true, logs, updates };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
