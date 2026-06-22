const fs = require('fs');

const path = 'app/dashboard/invoice-hub/actions.ts';
let content = fs.readFileSync(path, 'utf8');

const target1 = `            await sendEmail({
                to: invoice.vendorEmail,
                templateName: "invoice_status_updated",`;

const replacement1 = `            // Also send notification to superadmin
            const adminEmail = "admin@invoiceflow.com";
            
            await sendEmail({
                to: invoice.vendorEmail,
                bcc: adminEmail,
                templateName: "invoice_status_updated",`;

content = content.replace(target1, replacement1);

const target2 = `        // Send Email to Vendor
        await sendEmail({
            to: session.user.email,
            templateName: "invoice_uploaded",`;

const replacement2 = `        // Send Email to Vendor and Admin
        const adminEmail = "admin@invoiceflow.com";
        await sendEmail({
            to: session.user.email,
            bcc: adminEmail,
            templateName: "invoice_uploaded",`;

content = content.replace(target2, replacement2);

// Add the notification insert logic after the email sending in submitVerificationAndOCRCorrection
const target3 = `        }

        revalidatePath("/dashboard/invoice-hub");`;

const replacement3 = `        }
        
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

        revalidatePath("/dashboard/invoice-hub");`;

content = content.replace(target3, replacement3);

// Make sure notifications is imported
if (!content.includes('notifications')) {
    content = content.replace('import { invoices, invoiceDocuments, verifications, auditLogs, user } from "@/db/schema/schema";', 'import { invoices, invoiceDocuments, verifications, auditLogs, user, notifications } from "@/db/schema/schema";');
}

fs.writeFileSync(path, content);
console.log('actions.ts updated successfully with BCC and notifications.');
