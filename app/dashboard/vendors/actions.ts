"use server";

import { db } from "@/db";
import { vendors } from "@/db/schema/schema";
import { eq, desc } from "drizzle-orm";

export async function getVendors() {
    try {
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
        const deleted = await db.delete(vendors).where(eq(vendors.id, id)).returning();
        if (deleted.length === 0) {
            return { success: false, error: "Vendor not found." };
        }
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
