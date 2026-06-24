"use server";

import { db } from "@/db";
import { invoices, invoiceDocuments, ocrResults, verifications, auditLogs, vendors, notifications } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { desc, eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { sendEmail } from "@/lib/email";

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
            // Fetch vendor directly by userId
            const vendorRecord = allVendors.find(v => v.userId === inv.vendorId);
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
    extractedData?: unknown;
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
        let days = 30; // Default term
        let topLabel = "Net 30";
        
        const [vendorRecord] = await db.select().from(vendors).where(eq(vendors.userId, userId)).limit(1);
        if (vendorRecord && vendorRecord.termsOfPayment) {
                topLabel = vendorRecord.termsOfPayment;
                // Parse numbers from TOP string (e.g. "Net 30" -> 30, "0015" -> 15)
                const parsedDays = parseInt(topLabel.replace(/\D/g, ""), 10);
                if (!isNaN(parsedDays) && parsedDays > 0) {
                    days = parsedDays;
                }
        }

        // Calculate Due Date based on receipt date (upload date) + TOP days with scheduled ranges
        const issueDateObj = new Date(payload.issueDate);
        const uploadDateObj = new Date();
        const dueDateObj = calculateScheduledDueDate(uploadDateObj, days);

        // 2. Insert Invoice Record
        await db.insert(invoices).values({
            id: invoiceId,
            vendorId: userId,
            invoiceNumber: payload.invoiceNumber,
            taxInvoiceNumber: payload.taxInvoiceNumber || null,
            issueDate: issueDateObj,
            dueDate: dueDateObj,
            totalAmount: payload.totalAmount,
            status: "Pending OCR", // Sets Pending OCR initially for async processing
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

                // Pre-fill OCR result
                if (doc.docType === "invoice") {
                    let finalExtractedData = payload.extractedData;
                    if (!finalExtractedData || typeof finalExtractedData !== "object" || !("documents" in finalExtractedData)) {
                        finalExtractedData = {
                            documents: [
                                {
                                    id: "doc-1",
                                    type: "invoice",
                                    pages: [1],
                                    data: {
                                        invoiceNumber: payload.invoiceNumber,
                                        taxInvoiceNumber: payload.taxInvoiceNumber || null,
                                        issueDate: issueDateObj.toISOString().split("T")[0],
                                        dueDate: dueDateObj.toISOString().split("T")[0],
                                        totalAmount: payload.totalAmount,
                                        vendorName: session.user.name,
                                    }
                                }
                            ]
                        };
                    }
                    await db.insert(ocrResults).values({
                        id: crypto.randomUUID(),
                        documentId: docId,
                        extractedData: finalExtractedData,
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

        // Pemicu pemrosesan OCR latar belakang secara asinkron (non-blocking)
        const { triggerBackgroundOcr } = await import("@/app/dashboard/invoice-hub/actions");
        const invoiceDoc = payload.documents?.find(d => d.docType === "invoice");
        if (invoiceDoc) {
            triggerBackgroundOcr(invoiceId, invoiceDoc.fileUrl).catch(err => {
                console.error("Background OCR trigger failed:", err);
            });
        }

        // Send Email to Vendor and Admin
        const adminEmail = "admin@invoiceflow.com";
        await sendEmail({
            to: session.user.email,
            bcc: adminEmail,
            templateName: "invoice_uploaded",
            placeholders: {
                vendorName: session.user.name,
                invoiceNumber: payload.invoiceNumber,
                status: "Pending OCR",
            },
            subjectOverride: "Invoice Terkirim - Menunggu Pemrosesan",
            bodyOverride: `<p>Halo {{vendorName}},</p><p>Invoice Anda dengan nomor <strong>{{invoiceNumber}}</strong> telah berhasil kami terima dan saat ini berstatus <strong>{{status}}</strong> untuk diproses oleh sistem.</p><p>Kami akan memberitahu Anda kembali jika ada perubahan status.</p>`,
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

export async function submitVendorRevision(
    invoiceId: string,
    payload: {
        invoiceNumber: string;
        taxInvoiceNumber?: string;
        issueDate: Date;
        totalAmount: string;
        baseAmount?: string;
        ppnRate?: string;
        ppnAmount?: string;
        documents: { fileUrl: string; fileSize: number; docType: string }[];
    }
) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        if (!session || !session.user) return { success: false, error: "Unauthorized" };

        const userId = session.user.id;
        const role = (session.user as CustomUserSession).role || "vendor";

        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        if (!invoice) return { success: false, error: "Invoice not found" };

        if (invoice.vendorId !== userId && role !== "admin" && role !== "superadmin") {
            return { success: false, error: "Unauthorized to revise this invoice" };
        }

        // 1. Resolve TOP (Terms of Payment)
        let days = 30;
        let topLabel = "30 Hari";
        const [vendorRec] = await db.select().from(vendors).where(eq(vendors.userId, session.user.id)).limit(1);
        if (vendorRec && vendorRec.termsOfPayment) {
            topLabel = vendorRec.termsOfPayment;
            const parsedDays = parseInt(vendorRec.termsOfPayment.replace(/\D/g, ""));
            if (!isNaN(parsedDays) && parsedDays > 0) {
                days = parsedDays;
            }
        }

        const issueDateObj = new Date(payload.issueDate);
        const uploadDateObj = new Date();
        const dueDateObj = calculateScheduledDueDate(uploadDateObj, days);

        // 2. Update Invoice Record
        await db.update(invoices).set({
            invoiceNumber: payload.invoiceNumber,
            taxInvoiceNumber: payload.taxInvoiceNumber || null,
            issueDate: issueDateObj,
            dueDate: dueDateObj,
            totalAmount: payload.totalAmount,
            status: "Pending OCR", // Reset back to Pending OCR
            updatedAt: new Date()
        }).where(eq(invoices.id, invoiceId));

        // 3. Delete old documents and ocrResults
        await db.delete(ocrResults).where(inArray(ocrResults.documentId, db.select({ id: invoiceDocuments.id }).from(invoiceDocuments).where(eq(invoiceDocuments.invoiceId, invoiceId))));
        await db.delete(invoiceDocuments).where(eq(invoiceDocuments.invoiceId, invoiceId));

        // 4. Insert new documents
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

                // Pre-fill OCR result
                if (doc.docType === "invoice") {
                    await db.insert(ocrResults).values({
                        id: crypto.randomUUID(),
                        documentId: docId,
                        extractedData: {
                            documents: [
                                {
                                    id: "doc-1",
                                    type: "invoice",
                                    pages: [1],
                                    data: {
                                        invoiceNumber: payload.invoiceNumber,
                                        taxInvoiceNumber: payload.taxInvoiceNumber || null,
                                        issueDate: issueDateObj.toISOString().split("T")[0],
                                        dueDate: dueDateObj.toISOString().split("T")[0],
                                        totalAmount: payload.totalAmount,
                                        vendorName: session.user.name,
                                    }
                                }
                            ]
                        },
                    });
                }
            }
        }

        // 5. Write Audit Trail Log
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: userId,
            action: "VENDOR_REVISION",
            targetType: "Invoice",
            targetId: invoiceId,
            metadata: {
                invoiceNumber: payload.invoiceNumber,
                taxInvoiceNumber: payload.taxInvoiceNumber || null,
                totalAmount: payload.totalAmount,
                documentCount: payload.documents?.length || 0,
            },
        });

        // 6. Trigger OCR
        const { triggerBackgroundOcr } = await import("@/app/dashboard/invoice-hub/actions");
        const invoiceDoc = payload.documents?.find(d => d.docType === "invoice");
        if (invoiceDoc) {
            triggerBackgroundOcr(invoiceId, invoiceDoc.fileUrl).catch(err => {
                console.error("Background OCR trigger failed:", err);
            });
        }

        // Send Email to Admin
        const adminEmail = "admin@invoiceflow.com";
        await sendEmail({
            to: adminEmail,
            templateName: "invoice_uploaded",
            placeholders: {
                vendorName: session.user.name,
                invoiceNumber: payload.invoiceNumber,
                status: "Pending OCR (Revisi Vendor)",
            },
            subjectOverride: `Vendor Revisi Invoice ${payload.invoiceNumber}`,
            bodyOverride: `<p>Vendor <strong>${session.user.name}</strong> telah mengirimkan revisi untuk invoice <strong>${payload.invoiceNumber}</strong>.</p><p>Status saat ini: <strong>Pending OCR</strong>.</p>`,
        });

        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);

        return { success: true, invoiceId };
    } catch (error: unknown) {
        console.error("submitVendorRevision error:", error);
        return { success: false, error: error instanceof Error ? error.message : "Failed to submit revision" };
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
    finalDecision: string,
    forceEmail: boolean = false,
    optionalNotes: string = ""
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

        if (role !== "admin" && role !== "procurement" && role !== "finance") {
            return { success: false, error: "Only admins, procurement, or finance verifiers are allowed to perform audits." };
        }

        const [invoice] = await db.select({
            vendorEmail: user.email,
            vendorName: user.name,
            invoiceNumber: invoices.invoiceNumber,
            oldStatus: invoices.status,
        }).from(invoices).leftJoin(user, eq(invoices.vendorId, user.id)).where(eq(invoices.id, invoiceId)).limit(1);

        if (!invoice) {
            return { success: false, error: "Invoice not found" };
        }

        // Determine target status and audit action based on role
        let targetStatus = "";
        let auditAction = "VERIFY";

        if (role === "finance") {
            if (finalDecision === "Verified") {
                targetStatus = "Verified";
                auditAction = "FINANCE_VERIFY";
            } else if (finalDecision === "Needs Finance Revision") {
                targetStatus = "Needs Finance Revision";
                auditAction = "FINANCE_REVISION_REQUEST";
            } else if (finalDecision === "Rejected") {
                targetStatus = "Rejected";
                auditAction = "FINANCE_REJECT";
            } else {
                targetStatus = finalDecision;
            }
        } else {
            // Admin or Procurement
            if (finalDecision === "Verified") {
                targetStatus = "Procurement Verified";
                auditAction = "PROCUREMENT_VERIFY";
            } else if (finalDecision === "Needs Revision") {
                targetStatus = "Needs Revision";
                auditAction = "REVISION_REQUEST";
            } else if (finalDecision === "Rejected") {
                targetStatus = "Rejected";
                auditAction = "REJECT";
            } else {
                targetStatus = finalDecision;
            }
        }

        // 1. Update Invoice Details (Corrected OCR results + Status decision)
        await db.update(invoices)
            .set({
                invoiceNumber: ocrData.invoiceNumber,
                taxInvoiceNumber: ocrData.taxInvoiceNumber || null,
                issueDate: new Date(ocrData.issueDate),
                dueDate: new Date(ocrData.dueDate),
                totalAmount: ocrData.totalAmount,
                status: targetStatus,
                updatedAt: new Date(),
            })
            .where(eq(invoices.id, invoiceId));

        // 2. Clear verifications based on role
        if (role === "finance") {
            // Finance only clears the finance_revision section
            await db.delete(verifications).where(
                and(
                    eq(verifications.invoiceId, invoiceId),
                    eq(verifications.section, "finance_revision")
                )
            );

            // 3. Insert Finance Revision record if applicable
            for (const check of checklistPayload) {
                if (check.section === "finance_revision") {
                    await db.insert(verifications).values({
                        id: crypto.randomUUID(),
                        invoiceId: invoiceId,
                        section: "finance_revision",
                        passed: check.passed,
                        comments: check.comments || "",
                        checkedBy: userId,
                    });
                }
            }
        } else {
            // Procurement / Admin clears all verifications (starting a fresh audit cycle)
            await db.delete(verifications).where(eq(verifications.invoiceId, invoiceId));

            // 3. Insert Checklist verification results (A-E)
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
        }

        // 4. Log Audit Trail
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
                comments: optionalNotes,
            },
        });

        // 5. Send Email to Vendor about status change (Skip for Needs Finance Revision as it's an internal process)
        if ((invoice.oldStatus !== targetStatus || forceEmail) && invoice.vendorEmail && targetStatus !== "Needs Finance Revision") {
            let rejectComments = "";
            let alertColor = "#ef4444"; // red for rejection
            let alertBg = "#fef2f2";
            let alertTitle = "Catatan Auditor:";

            if (finalDecision === "Needs Revision" || finalDecision === "Needs Finance Revision" || finalDecision === "Rejected") {
                const sectionMap: Record<string, string> = {
                    "A": "Kelengkapan Berkas Dokumen",
                    "B": "Validasi Rekening / NPWP",
                    "C": "Pencocokan Item barang & PO",
                    "D": "Validasi e-Faktur PPN",
                    "E": "Perhitungan Finansial",
                    "finance_revision": "Pengecekan Internal Finance"
                };
                
                const failedChecks = checklistPayload.filter(c => !c.passed && c.comments);
                if (failedChecks.length > 0) {
                    rejectComments = "<ul style='margin-top: 8px; margin-bottom: 0; padding-left: 20px; line-height: 1.6;'>";
                    for (const c of failedChecks) {
                        const title = sectionMap[c.section] || c.section;
                        rejectComments += `<li><strong>${c.section !== "finance_revision" ? c.section + ". " : ""}${title}:</strong> ${c.comments}</li>`;
                    }
                    rejectComments += "</ul>";
                }
            } else if (optionalNotes) {
                rejectComments = optionalNotes;
                alertColor = "#3b82f6"; // blue for informational
                alertBg = "#eff6ff";
                alertTitle = "Catatan Tambahan Verifikator:";
            }

            // Also send notification to superadmin
            const adminEmail = "admin@invoiceflow.com";
            
            const statusToTemplate: Record<string, string> = {
                "In Review": "invoice_in_review",
                "Procurement Verified": "invoice_procurement_verified",
                "Needs Revision": "invoice_needs_revision",
                "Document in Transit": "invoice_document_in_transit",
                "In Finance Verification": "invoice_in_finance_verification",
                "Needs Finance Revision": "invoice_needs_finance_revision",
                "Rejected": "invoice_rejected",
                "Paid": "invoice_paid",
                "Verified": "invoice_procurement_verified" // fallback mapping since Finance Verified leads to In Finance Verification/Paid in other places
            };
            const templateName = statusToTemplate[targetStatus] || "invoice_status_updated";

            await sendEmail({
                to: invoice.vendorEmail,
                bcc: adminEmail,
                templateName: templateName,
                placeholders: {
                    vendorName: invoice.vendorName || "Vendor",
                    invoiceNumber: invoice.invoiceNumber,
                    status: targetStatus,
                    comments: rejectComments ? `<div style="background-color: ${alertBg}; border-left: 4px solid ${alertColor}; padding: 16px; margin: 24px 0;"><strong>${alertTitle}</strong><br/>${rejectComments}</div>` : ""
                },
                subjectOverride: `Update Status Invoice ${invoice.invoiceNumber} - ${targetStatus}`,
            });
        }
        
        // Also log an in-app notification for the superadmin
        if (invoice.oldStatus !== targetStatus) {
            try {
                // Find admin user
                const [adminUser] = await db.select().from(user).where(eq(user.role, 'admin')).limit(1);
                if (adminUser) {
                    await db.insert(notifications).values({
                        userId: adminUser.id,
                        channel: 'in_app',
                        eventType: 'invoice_status_changed',
                        payload: {
                            invoiceId: invoiceId,
                            invoiceNumber: invoice.invoiceNumber,
                            status: targetStatus,
                            vendorName: invoice.vendorName
                        }
                    });
                }
            } catch (notifErr) {
                console.error("Failed to insert notification:", notifErr);
            }
        }

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
            shippingDetails: invoices.shippingDetails,
            financeNotes: invoices.financeNotes,
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
        
        // Fetch OCR results for the documents
        const docIds = docs.map(d => d.id);
        const ocr = docIds.length > 0 
            ? await db.select().from(ocrResults).where(inArray(ocrResults.documentId, docIds))
            : [];

        const checks = await db.select().from(verifications).where(eq(verifications.invoiceId, invoiceId));
        const allVendors = await db.select().from(vendors);

        const vendorRecord = allVendors.find(v => v.userId === inv.vendorId);
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
            ocrResults: ocr,
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

export async function updateOcrResults(
    invoiceId: string,
    extractedData: unknown
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user) {
            return { success: false, error: "Unauthorized" };
        }

        const role = (session.user as CustomUserSession).role || "vendor";

        if (role !== "admin" && role !== "procurement") {
            return { success: false, error: "Hanya admin atau verifikator procurement yang dapat mengoreksi hasil OCR." };
        }

        // Query the document linked to this invoice of type invoice
        const [docRecord] = await db.select()
            .from(invoiceDocuments)
            .where(
                and(
                    eq(invoiceDocuments.invoiceId, invoiceId),
                    eq(invoiceDocuments.docType, "invoice")
                )
            )
            .limit(1);

        if (!docRecord) {
            return { success: false, error: "Dokumen utama invoice tidak ditemukan." };
        }

        // Check if ocrResults record exists
        const [ocrRecord] = await db.select()
            .from(ocrResults)
            .where(eq(ocrResults.documentId, docRecord.id))
            .limit(1);

        if (ocrRecord) {
            await db.update(ocrResults)
                .set({
                    extractedData: extractedData,
                    processedAt: new Date(),
                })
                .where(eq(ocrResults.id, ocrRecord.id));
        } else {
            await db.insert(ocrResults).values({
                id: crypto.randomUUID(),
                documentId: docRecord.id,
                extractedData: extractedData,
                processedAt: new Date(),
            });
        }

        // Sync dynamic invoice fields from the first "invoice" type document card to the main invoices table
        const dataObj = extractedData as { documents?: { type: string; data: Record<string, string | null | undefined> }[] };
        const firstInvoice = dataObj?.documents?.find(d => d.type === "invoice");
        if (firstInvoice && firstInvoice.data) {
            const invoiceNum = firstInvoice.data.invoiceNumber;
            const taxInvoiceNum = firstInvoice.data.taxInvoiceNumber;
            const issueDateStr = firstInvoice.data.issueDate;
            const totalAmt = firstInvoice.data.totalAmount;

            await db.update(invoices)
                .set({
                    ...(invoiceNum ? { invoiceNumber: invoiceNum } : {}),
                    ...(taxInvoiceNum !== undefined ? { taxInvoiceNumber: taxInvoiceNum } : {}),
                    ...(issueDateStr ? { issueDate: new Date(issueDateStr) } : {}),
                    ...(totalAmt ? { totalAmount: totalAmt } : {}),
                    updatedAt: new Date()
                })
                .where(eq(invoices.id, invoiceId));
        }

        revalidatePath("/dashboard/invoice-hub");
        revalidatePath("/dashboard/invoices");

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Gagal menyimpan hasil koreksi OCR";
        console.error("updateOcrResults error:", error);
        return { success: false, error: errorMessage };
    }
}

export async function triggerBackgroundOcr(invoiceId: string, _fileUrl: string) {
    try {
        // Cari record dokumen invoice utama di DB untuk dijadikan sebagai target ocrResults
        const [docRecord] = await db.select()
            .from(invoiceDocuments)
            .where(
                and(
                    eq(invoiceDocuments.invoiceId, invoiceId),
                    eq(invoiceDocuments.docType, "invoice")
                )
            )
            .limit(1);

        if (!docRecord) {
            throw new Error(`No invoice document record found in DB for invoiceId: ${invoiceId}`);
        }

        // Ambil semua dokumen yang terasosiasi dengan invoice ini
        const allDocs = await db.select()
            .from(invoiceDocuments)
            .where(eq(invoiceDocuments.invoiceId, invoiceId));

        const { extractFieldsWithGeminiVision } = await import("@/lib/ocr/ocr");
        console.log(`triggerBackgroundOcr: Starting OCR text extraction for ${allDocs.length} documents under invoice ${invoiceId}`);

        const visionDocs: { docType: string; mimeType: string; base64: string }[] = [];

        for (const doc of allDocs) {
            try {
                let arrayBuffer: ArrayBuffer;
                
                if (doc.fileUrl.startsWith("/uploads/")) {
                    console.log(`triggerBackgroundOcr: Reading local file ${doc.fileUrl}`);
                    const fs = require('fs');
                    const path = require('path');
                    const localPath = path.join(process.cwd(), "public", doc.fileUrl);
                    const fileData = fs.readFileSync(localPath);
                    arrayBuffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength);
                } else {
                    console.log(`triggerBackgroundOcr: Downloading and processing document ${doc.id} of type ${doc.docType} from URL: ${doc.fileUrl}`);
                    const res = await fetch(doc.fileUrl);
                    if (!res.ok) {
                        console.error(`Failed to download document ${doc.id} (${doc.docType}): HTTP status ${res.status}`);
                        continue;
                    }
                    arrayBuffer = await res.arrayBuffer();
                }

                const buffer = Buffer.from(arrayBuffer);
                const base64 = buffer.toString('base64');
                const isPdf = doc.fileUrl.toLowerCase().endsWith('.pdf');
                const mimeType = isPdf ? 'application/pdf' : 'image/jpeg';

                visionDocs.push({
                    docType: doc.docType || 'invoice',
                    mimeType,
                    base64
                });
            } catch (docErr) {
                console.error(`Error processing document ${doc.id} (${doc.docType}) in triggerBackgroundOcr:`, docErr);
            }
        }

        if (visionDocs.length === 0) {
            throw new Error("Failed to load any documents for OCR extraction.");
        }

        console.log(`triggerBackgroundOcr: Starting Gemini Vision classification and fields extraction on ${visionDocs.length} documents...`);
        const extractedData = await extractFieldsWithGeminiVision(visionDocs);
        console.log("triggerBackgroundOcr: Gemini Vision extraction complete.");

        // Simpan hasil ke ocr_results
        const [ocrRecord] = await db.select()
            .from(ocrResults)
            .where(eq(ocrResults.documentId, docRecord.id))
            .limit(1);

        if (ocrRecord) {
            await db.update(ocrResults)
                .set({
                    extractedData: extractedData,
                    processedAt: new Date(),
                })
                .where(eq(ocrResults.id, ocrRecord.id));
        } else {
            await db.insert(ocrResults).values({
                id: crypto.randomUUID(),
                documentId: docRecord.id,
                extractedData: extractedData,
                processedAt: new Date(),
            });
        }

        // Sinkronisasikan field-field dinamis ke invoices dan ubah status ke In Review
        const dataObj = extractedData as { documents?: { type: string; data: Record<string, string | null | undefined> }[] };
        const firstInvoice = dataObj?.documents?.find(d => d.type === "invoice");
        const invoiceNum = firstInvoice?.data?.invoiceNumber;
        const taxInvoiceNum = firstInvoice?.data?.taxInvoiceNumber;
        const issueDateStr = firstInvoice?.data?.issueDate;
        const totalAmt = firstInvoice?.data?.totalAmount;

        await db.update(invoices)
            .set({
                status: "In Review", // Ubah status dari Pending OCR ke In Review
                ...(invoiceNum ? { invoiceNumber: invoiceNum } : {}),
                ...(taxInvoiceNum !== undefined ? { taxInvoiceNumber: taxInvoiceNum } : {}),
                ...(issueDateStr ? { issueDate: new Date(issueDateStr) } : {}),
                ...(totalAmt ? { totalAmount: totalAmt } : {}),
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));

        console.log(`triggerBackgroundOcr: Successfully processed and updated invoice ${invoiceId} status to 'In Review'.`);
        try {
            revalidatePath("/dashboard/invoice-hub");
            revalidatePath("/dashboard/invoices");
        } catch (revalErr) {
            console.warn("revalidatePath warning in background task:", revalErr);
        }
    } catch (err: unknown) {
        console.error("triggerBackgroundOcr: Background OCR processing failed:", err);
        
        // Opsional: jika OCR gagal total, tetap set status invoice menjadi In Review agar bisa diverifikasi manual
        await db.update(invoices)
            .set({
                status: "In Review",
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
            
        try {
            revalidatePath("/dashboard/invoice-hub");
            revalidatePath("/dashboard/invoices");
        } catch {
            // ignore
        }
    }
}

function calculateScheduledDueDate(createdAt: Date, topDays: number): Date {
    const date = new Date(createdAt);
    const day = date.getDate();
    let recordMonth = date.getMonth(); // 0-indexed
    let recordYear = date.getFullYear();

    // Tutup buku penerimaan invoice di tanggal 20 setiap bulannya.
    // Jika setelah tanggal 20, dicatat pada bulan berikutnya.
    if (day > 20) {
        recordMonth += 1;
        if (recordMonth > 11) {
            recordMonth = 0;
            recordYear += 1;
        }
    }

    // Perhitungan TOP berdasarkan bulan pencatatan invoice (N30 = +1 bulan, N60 = +2 bulan, dll)
    const topMonths = Math.max(1, Math.round(topDays / 30));
    let payMonth = recordMonth + topMonths;
    let payYear = recordYear;

    while (payMonth > 11) {
        payMonth -= 12;
        payYear += 1;
    }

    // Pembayaran dilakukan setiap tanggal 28–30 (simpan tanggal 28 sebagai default nilai Date)
    return new Date(payYear, payMonth, 28);
}


async function notifyStatusChange(invoiceId: string, newStatus: string, comments: string = "") {
    // Internal process: do not email vendor when Finance sends back to Procurement
    if (newStatus === "Needs Finance Revision") {
        return;
    }

    try {
        const [invoice] = await db.select({
            invoiceNumber: invoices.invoiceNumber,
            vendorName: user.name,
            vendorEmail: user.email,
        }).from(invoices).leftJoin(user, eq(invoices.vendorId, user.id)).where(eq(invoices.id, invoiceId)).limit(1);

        const statusToTemplate: Record<string, string> = {
            "In Review": "invoice_in_review",
            "Procurement Verified": "invoice_procurement_verified",
            "Needs Revision": "invoice_needs_revision",
            "Document in Transit": "invoice_document_in_transit",
            "In Finance Verification": "invoice_in_finance_verification",
            "Needs Finance Revision": "invoice_needs_finance_revision",
            "Rejected": "invoice_rejected",
            "Paid": "invoice_paid"
        };
        const templateName = statusToTemplate[newStatus] || "invoice_status_updated";

        if (invoice && invoice.vendorEmail) {
            await sendEmail({
                to: invoice.vendorEmail,
                bcc: "admin@invoiceflow.com",
                templateName: templateName,
                placeholders: {
                    vendorName: invoice.vendorName || "Vendor",
                    invoiceNumber: invoice.invoiceNumber,
                    status: newStatus,
                    comments: comments ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 24px 0;"><strong>Catatan Tambahan/Revisi:</strong><br/>${comments}</div>` : ""
                },
                subjectOverride: `Update Status Invoice ${invoice.invoiceNumber} - ${newStatus}`,
            });
        }
    } catch (e) {
        console.error("Failed to send status change email", e);
    }
}

export async function submitGRCheck(invoiceId: string, grData: any) {
    try {
        await db.update(invoices)
            .set({
                status: "Procurement Verified",
                grDetails: grData,
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/verify/${invoiceId}`);
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        await notifyStatusChange(invoiceId, "Procurement Verified");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function submitShippingConfirmation(invoiceId: string, shippingData: any) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;

        await db.update(invoices)
            .set({
                status: "Document in Transit",
                shippingDetails: shippingData,
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        if (userId) {
            await db.insert(auditLogs).values({
                id: crypto.randomUUID(),
                userId: userId,
                action: "SHIPPING_SUBMITTED",
                targetType: "Invoice",
                targetId: invoiceId,
                metadata: shippingData
            });
        }
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        await notifyStatusChange(invoiceId, "Document in Transit");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
export async function rejectShippingReceipt(invoiceId: string, notes: string, receiptDate?: string, receiptFileUrl?: string | null) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;

        // Fetch current shipping details to append notes
        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        if (!invoice) throw new Error("Invoice tidak ditemukan");

        const currentShippingDetails = (invoice.shippingDetails as any) || {};
        const updatedShippingDetails = {
            ...currentShippingDetails,
            rejectionNotes: notes,
            rejectedAt: new Date().toISOString(),
            receiptDate: receiptDate || null,
            receiptFileUrl: receiptFileUrl || null
        };

        await db.update(invoices)
            .set({
                status: "Procurement Verified", // Send back to the state where vendor can re-submit
                shippingDetails: updatedShippingDetails,
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        if (userId) {
            await db.insert(auditLogs).values({
                id: crypto.randomUUID(),
                userId: userId,
                action: "SHIPPING_INCOMPLETE",
                targetType: "Invoice",
                targetId: invoiceId,
                metadata: { notes, receiptDate, receiptFileUrl }
            });
        }
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        // We notify using 'Needs Revision' template but custom status because the template allows us to pass comments
        await notifyStatusChange(invoiceId, "Procurement Verified", notes); 
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function confirmPhysicalReceipt(invoiceId: string, receiptData: any) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;

        const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
        if (!invoice) throw new Error("Invoice tidak ditemukan");

        const currentShippingDetails = (invoice.shippingDetails as any) || {};
        const updatedShippingDetails = {
            ...currentShippingDetails,
            receiptData: receiptData,
            receiptConfirmedAt: new Date().toISOString()
        };

        await db.update(invoices)
            .set({
                status: "In Finance Verification",
                shippingDetails: updatedShippingDetails,
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        if (userId) {
            await db.insert(auditLogs).values({
                id: crypto.randomUUID(),
                userId: userId,
                action: "PHYSICAL_RECEIVED",
                targetType: "Invoice",
                targetId: invoiceId,
                metadata: receiptData
            });
        }
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        await notifyStatusChange(invoiceId, "In Finance Verification");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function financeRevision(invoiceId: string, notes: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;

        await db.update(invoices)
            .set({
                status: "Needs Revision",
                financeNotes: notes,
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        if (userId) {
            await db.insert(auditLogs).values({
                id: crypto.randomUUID(),
                userId: userId,
                action: "FINANCE_REVISION_REQUEST",
                targetType: "Invoice",
                targetId: invoiceId,
                metadata: { notes }
            });
        }
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/verify/${invoiceId}`);
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        await notifyStatusChange(invoiceId, "Needs Revision", notes);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function financeApprove(invoiceId: string) {
    try {
        const session = await auth.api.getSession({ headers: await headers() });
        const userId = session?.user?.id;

        await db.update(invoices)
            .set({
                status: "Paid",
                updatedAt: new Date()
            })
            .where(eq(invoices.id, invoiceId));
        
        if (userId) {
            await db.insert(auditLogs).values({
                id: crypto.randomUUID(),
                userId: userId,
                action: "FINANCE_VERIFY",
                targetType: "Invoice",
                targetId: invoiceId,
            });
        }
        
        revalidatePath("/dashboard/invoice-hub");
        revalidatePath(`/dashboard/invoice-hub/details/${invoiceId}`);
        await notifyStatusChange(invoiceId, "Paid");
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
