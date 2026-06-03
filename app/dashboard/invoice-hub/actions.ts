"use server";

import { db } from "@/db";
import { invoices, invoiceDocuments, ocrResults, verifications, auditLogs, vendors } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { desc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

interface CustomUserSession {
    role?: string;
}

export async function getInvoiceHubData() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role || "vendor";

        // Query base invoices
        const q = db.select({
            id: invoices.id,
            vendorId: invoices.vendorId,
            invoiceNumber: invoices.invoiceNumber,
            taxInvoiceNumber: invoices.taxInvoiceNumber,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
            vendorName: user.name,
            vendorEmail: user.email,
        })
        .from(invoices)
        .leftJoin(user, eq(invoices.vendorId, user.id));

        // If vendor, restrict to their own invoices
        let invoicesList;
        if (role === "vendor") {
            invoicesList = await q.where(eq(invoices.vendorId, userId)).orderBy(desc(invoices.createdAt));
        } else {
            invoicesList = await q.orderBy(desc(invoices.createdAt));
        }

        // Query documents, verifications, vendors, and audit logs
        const docs = await db.select().from(invoiceDocuments);
        const checks = await db.select().from(verifications);
        const allVendors = await db.select().from(vendors);
        const logs = await db.select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            metadata: auditLogs.metadata,
            loggedAt: auditLogs.loggedAt,
            userName: user.name,
            userEmail: user.email,
        })
        .from(auditLogs)
        .leftJoin(user, eq(auditLogs.userId, user.id))
        .where(eq(auditLogs.targetType, "Invoice"));

        const mappedResult = invoicesList.map(inv => {
            const email = inv.vendorEmail || "";
            const supplierMatch = email.match(/vendor\.(\d+)@/);
            const supplierCode = supplierMatch ? supplierMatch[1] : null;
            const vendorRecord = supplierCode ? allVendors.find(v => v.supplier === supplierCode) : null;
            const termsOfPayment = vendorRecord ? vendorRecord.termsOfPayment : null;

            return {
                ...inv,
                termsOfPayment,
                documents: docs.filter(d => d.invoiceId === inv.id),
                verifications: checks.filter(v => v.invoiceId === inv.id),
                auditLogs: logs
                    .filter(l => l.targetId === inv.id)
                    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()),
            };
        });

        return { success: true, invoices: mappedResult };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load invoice hub data";
        console.error("getInvoiceHubData error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function createInvoiceWithDocs(payload: {
    invoiceNumber: string;
    taxInvoiceNumber?: string;
    issueDate: Date;
    totalAmount: string;
    baseAmount?: string;
    ppnRate?: string;
    ppnAmount?: string;
    documents: { fileUrl: string; fileSize: number; docType: string }[];
}) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role || "vendor";

        // Check specific vendor permissions
        if (role === "vendor") {
            const { getMyPermissions } = await import("@/app/dashboard/users/actions");
            const perms = await getMyPermissions();
            if (perms.success && perms.permissions) {
                if (!perms.permissions["invoice-hub"]?.canCreate) {
                    return { success: false, error: "Access Denied: You do not have permission to create invoices." };
                }
            }
        }

        const invoiceId = crypto.randomUUID();

        // 1. Resolve TOP (Terms of Payment) from Vendors Master Data
        const email = session.user.email;
        const supplierMatch = email.match(/vendor\.(\d+)@/);
        const supplierCode = supplierMatch ? supplierMatch[1] : null;

        let days = 30; // Default term
        let topLabel = "Net 30";
        
        if (supplierCode) {
            const [vendorRecord] = await db.select().from(vendors).where(eq(vendors.supplier, supplierCode)).limit(1);
            if (vendorRecord && vendorRecord.termsOfPayment) {
                topLabel = vendorRecord.termsOfPayment;
                // Parse numbers from TOP string (e.g. "Net 30" -> 30, "0015" -> 15)
                const parsedDays = parseInt(topLabel.replace(/\D/g, ""), 10);
                if (!isNaN(parsedDays) && parsedDays > 0) {
                    days = parsedDays;
                }
            }
        }

        // Calculate Due Date based on issueDate + TOP days
        const issueDateObj = new Date(payload.issueDate);
        const dueDateObj = new Date(issueDateObj.getTime() + days * 24 * 60 * 60 * 1000);

        // 2. Insert Invoice Record
        await db.insert(invoices).values({
            id: invoiceId,
            vendorId: userId,
            invoiceNumber: payload.invoiceNumber,
            taxInvoiceNumber: payload.taxInvoiceNumber || null,
            issueDate: issueDateObj,
            dueDate: dueDateObj,
            totalAmount: payload.totalAmount,
            status: "In Review", // Sets In Review immediately
        });

        // 3. Insert Documents
        if (payload.documents && payload.documents.length > 0) {
            for (const doc of payload.documents) {
                const docId = crypto.randomUUID();
                await db.insert(invoiceDocuments).values({
                    id: docId,
                    invoiceId: invoiceId,
                    docType: doc.docType,
                    fileUrl: doc.fileUrl,
                    fileSize: doc.fileSize,
                });

                // Pre-fill mock OCR result
                if (doc.docType === "invoice") {
                    await db.insert(ocrResults).values({
                        id: crypto.randomUUID(),
                        documentId: docId,
                        extractedData: {
                            invoiceNumber: payload.invoiceNumber,
                            taxInvoiceNumber: payload.taxInvoiceNumber || null,
                            issueDate: issueDateObj.toISOString(),
                            dueDate: dueDateObj.toISOString(),
                            totalAmount: payload.totalAmount,
                            vendorName: session.user.name,
                            termsOfPayment: topLabel,
                        },
                    });
                }
            }
        }

        // 4. Write Audit Trail Log
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: userId,
            action: "CREATE",
            targetType: "Invoice",
            targetId: invoiceId,
            metadata: {
                invoiceNumber: payload.invoiceNumber,
                taxInvoiceNumber: payload.taxInvoiceNumber || null,
                totalAmount: payload.totalAmount,
                baseAmount: payload.baseAmount || null,
                ppnRate: payload.ppnRate || null,
                ppnAmount: payload.ppnAmount || null,
                termsOfPayment: topLabel,
                documentCount: payload.documents?.length || 0,
            },
        });

        revalidatePath("/dashboard/invoice-hub");
        revalidatePath("/dashboard/invoices");

        return { success: true, invoiceId };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create invoice";
        console.error("createInvoiceWithDocs error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function submitVerificationAndOCRCorrection(
    invoiceId: string,
    ocrData: {
        invoiceNumber: string;
        taxInvoiceNumber?: string;
        issueDate: string;
        dueDate: string;
        totalAmount: string;
    },
    checklistPayload: {
        section: string;
        passed: boolean;
        comments?: string;
    }[],
    finalDecision: "Verified" | "Needs Revision" | "Rejected"
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role;

        if (role !== "admin" && role !== "procurement") {
            return { success: false, error: "Only admins or procurement verifiers are allowed to perform audits." };
        }

        // 1. Update Invoice Details (Corrected OCR results + Status decision)
        await db.update(invoices)
            .set({
                invoiceNumber: ocrData.invoiceNumber,
                taxInvoiceNumber: ocrData.taxInvoiceNumber || null,
                issueDate: new Date(ocrData.issueDate),
                dueDate: new Date(ocrData.dueDate),
                totalAmount: ocrData.totalAmount,
                status: finalDecision,
                updatedAt: new Date(),
            })
            .where(eq(invoices.id, invoiceId));

        // 2. Clear old verifications for this invoice
        await db.delete(verifications).where(eq(verifications.invoiceId, invoiceId));

        // 3. Insert Checklist verification results
        for (const check of checklistPayload) {
            await db.insert(verifications).values({
                id: crypto.randomUUID(),
                invoiceId: invoiceId,
                section: check.section,
                passed: check.passed,
                comments: check.comments || "",
                checkedBy: userId,
            });
        }

        // 4. Log Audit Trail
        let auditAction = "VERIFY";
        if (finalDecision === "Needs Revision") auditAction = "REVISION_REQUEST";
        if (finalDecision === "Rejected") auditAction = "REJECT";

        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: userId,
            action: auditAction,
            targetType: "Invoice",
            targetId: invoiceId,
            metadata: {
                ocrData,
                finalDecision,
                checklist: checklistPayload,
            },
        });

        revalidatePath("/dashboard/invoice-hub");
        revalidatePath("/dashboard/invoices");

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to verify invoice";
        console.error("submitVerificationAndOCRCorrection error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function deleteInvoice(invoiceId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role || "vendor";

        // Query the invoice to verify ownership
        const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);

        if (!inv) {
            return { success: false, error: "Invoice not found" };
        }

        // Vendors can only delete their own invoices that are In Review or Needs Revision
        if (role === "vendor") {
            if (inv.vendorId !== userId) {
                return { success: false, error: "You are not authorized to delete this invoice." };
            }
            if (inv.status !== "In Review" && inv.status !== "Needs Revision") {
                return { success: false, error: "You cannot delete invoices that have been audited." };
            }
            
            // Check specific vendor permissions
            const { getMyPermissions } = await import("@/app/dashboard/users/actions");
            const perms = await getMyPermissions();
            if (perms.success && perms.permissions) {
                if (!perms.permissions["invoice-hub"]?.canDelete) {
                    return { success: false, error: "Access Denied: You do not have permission to delete invoices." };
                }
            }
        }

        // Execute deletes
        await db.delete(invoices).where(eq(invoices.id, invoiceId));

        // Log Action
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: userId,
            action: "DELETE",
            targetType: "Invoice",
            targetId: invoiceId,
            metadata: {
                invoiceNumber: inv.invoiceNumber,
            },
        });

        revalidatePath("/dashboard/invoice-hub");
        revalidatePath("/dashboard/invoices");

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to delete invoice";
        console.error("deleteInvoice error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function getInvoiceById(invoiceId: string) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role || "vendor";

        // Query invoice
        const [inv] = await db.select({
            id: invoices.id,
            vendorId: invoices.vendorId,
            invoiceNumber: invoices.invoiceNumber,
            taxInvoiceNumber: invoices.taxInvoiceNumber,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            createdAt: invoices.createdAt,
            updatedAt: invoices.updatedAt,
            vendorName: user.name,
            vendorEmail: user.email,
        })
        .from(invoices)
        .leftJoin(user, eq(invoices.vendorId, user.id))
        .where(eq(invoices.id, invoiceId))
        .limit(1);

        if (!inv) {
            return { success: false, error: "Invoice not found" };
        }

        // If vendor, restrict to their own invoice
        if (role === "vendor" && inv.vendorId !== userId) {
            return { success: false, error: "Access Denied: You are not authorized to view this invoice." };
        }

        // Fetch related documents, verifications, and audit logs
        const docs = await db.select().from(invoiceDocuments).where(eq(invoiceDocuments.invoiceId, invoiceId));
        const checks = await db.select().from(verifications).where(eq(verifications.invoiceId, invoiceId));
        const allVendors = await db.select().from(vendors);

        const email = inv.vendorEmail || "";
        const supplierMatch = email.match(/vendor\.(\d+)@/);
        const supplierCode = supplierMatch ? supplierMatch[1] : null;
        const vendorRecord = supplierCode ? allVendors.find(v => v.supplier === supplierCode) : null;
        const termsOfPayment = vendorRecord ? vendorRecord.termsOfPayment : null;

        const logs = await db.select({
            id: auditLogs.id,
            userId: auditLogs.userId,
            action: auditLogs.action,
            targetType: auditLogs.targetType,
            targetId: auditLogs.targetId,
            metadata: auditLogs.metadata,
            loggedAt: auditLogs.loggedAt,
            userName: user.name,
            userEmail: user.email,
        })
        .from(auditLogs)
        .leftJoin(user, eq(auditLogs.userId, user.id))
        .where(
            and(
                eq(auditLogs.targetType, "Invoice"),
                eq(auditLogs.targetId, invoiceId)
            )
        );

        const result = {
            ...inv,
            termsOfPayment,
            documents: docs,
            verifications: checks,
            auditLogs: logs
                .filter(l => l.targetId === inv.id)
                .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()),
        };

        return { success: true, invoice: result };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load invoice";
        console.error("getInvoiceById error:", error);
        return { success: false, error: errorMessage };
    }
}

