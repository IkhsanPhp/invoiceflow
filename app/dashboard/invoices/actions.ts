"use server";

import { db } from "@/db";
import { invoices } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { eq, desc } from "drizzle-orm";

export async function getInvoicesMaster() {
    try {
        const list = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            vendorName: user.name,
            vendorEmail: user.email,
            createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(user, eq(invoices.vendorId, user.id))
        .orderBy(desc(invoices.createdAt));

        return { success: true, invoices: list };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch invoices";
        console.error("Failed to fetch invoices:", error);
        return { success: false, error: errorMessage };
    }
}
