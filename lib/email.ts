import nodemailer from 'nodemailer';
import { db } from '@/db';
import { systemSettings, emailTemplates, emailLogs } from '@/db/schema/schema';
import { eq } from 'drizzle-orm';

export interface EmailPlaceholderData {
    [key: string]: string | number | boolean | null | undefined;
}

export async function sendEmail({
    to,
    bcc,
    templateName,
    placeholders,
    subjectOverride,
    bodyOverride,
}: {
    to: string;
    bcc?: string | string[];
    templateName?: string;
    placeholders?: EmailPlaceholderData;
    subjectOverride?: string;
    bodyOverride?: string;
}) {
    try {
        // Fetch SMTP settings
        const settings = await db.select().from(systemSettings);
        const settingsMap: Record<string, string> = {};
        for (const s of settings) {
            if (s.value) settingsMap[s.key] = s.value;
        }

        const host = settingsMap['smtp_host'];
        const port = parseInt(settingsMap['smtp_port'] || '587');
        const user = settingsMap['smtp_user'];
        const pass = settingsMap['smtp_pass'];
        const from = settingsMap['smtp_from'] || user;

        if (!host || !user || !pass) {
            throw new Error("SMTP settings are incomplete. Please configure them in Settings.");
        }

        const transporter = nodemailer.createTransport({
            host,
            port,
            secure: port === 465,
            auth: {
                user,
                pass,
            },
        });

        let subject = subjectOverride || "No Subject";
        let html = bodyOverride || "";

        if (templateName) {
            const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.name, templateName)).limit(1);
            if (template) {
                subject = template.subject;
                html = template.body;

                // Replace placeholders
                if (placeholders) {
                    for (const [key, value] of Object.entries(placeholders)) {
                        const regex = new RegExp(`{{${key}}}`, 'g');
                        subject = subject.replace(regex, String(value || ''));
                        html = html.replace(regex, String(value || ''));
                    }
                }
            } else {
                if (!subjectOverride && !bodyOverride) {
                    throw new Error(`Email template '${templateName}' not found.`);
                }
            }
        }

        const info = await transporter.sendMail({
            from,
            to,
            bcc,
            subject,
            html,
        });

        // Log success
        await db.insert(emailLogs).values({
            recipient: to,
            subject: subject,
            status: 'sent',
        });

        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        console.error("Failed to send email:", error);
        
        // Log failure
        await db.insert(emailLogs).values({
            recipient: to,
            subject: subjectOverride || templateName || "Unknown",
            status: 'failed',
            errorMsg: error.message || String(error),
        });

        return { success: false, error: error.message };
    }
}
