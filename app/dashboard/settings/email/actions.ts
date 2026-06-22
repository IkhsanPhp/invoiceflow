"use server";

import { db } from "@/db";
import { systemSettings, emailTemplates, emailLogs } from "@/db/schema/schema";
import { eq, desc } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";

export async function getSmtpSettings() {
    const settings = await db.select().from(systemSettings);
    const result: Record<string, string> = {};
    for (const s of settings) {
        if (s.value) result[s.key] = s.value;
    }
    return result;
}

export async function saveSmtpSettings(formData: FormData) {
    const host = formData.get("smtp_host") as string;
    const port = formData.get("smtp_port") as string;
    const user = formData.get("smtp_user") as string;
    const pass = formData.get("smtp_pass") as string;
    const from = formData.get("smtp_from") as string;

    const keys = { smtp_host: host, smtp_port: port, smtp_user: user, smtp_pass: pass, smtp_from: from };

    for (const [key, value] of Object.entries(keys)) {
        if (value !== null) {
            const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key)).limit(1);
            if (existing.length > 0) {
                await db.update(systemSettings).set({ value, updatedAt: new Date() }).where(eq(systemSettings.key, key));
            } else {
                await db.insert(systemSettings).values({ key, value, updatedAt: new Date() });
            }
        }
    }
    revalidatePath("/dashboard/settings/email");
    return { success: true };
}

export async function testSmtpConnection(emailTo: string) {
    if (!emailTo) return { success: false, error: "Recipient email is required" };
    
    const result = await sendEmail({
        to: emailTo,
        subjectOverride: "SMTP Connection Test",
        bodyOverride: "<h3>Hello!</h3><p>If you receive this, your SMTP settings in InvoiceFlow are working correctly.</p>"
    });

    revalidatePath("/dashboard/settings/email/logs");
    return result;
}

export async function getEmailTemplates() {
    return await db.select().from(emailTemplates).orderBy(emailTemplates.name);
}

export async function saveEmailTemplate(id: string | null, data: { name: string, subject: string, body: string, description?: string }) {
    if (id) {
        await db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.id, id));
    } else {
        await db.insert(emailTemplates).values({ ...data, updatedAt: new Date() });
    }
    revalidatePath("/dashboard/settings/email/templates");
    return { success: true };
}

export async function getEmailLogs() {
    return await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt)).limit(100);
}
