import { db } from "@/db";
import { invoices, vendors, auditLogs, verifications } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { count, eq, sql, desc, or, and, gte, lte } from "drizzle-orm";
import { subDays, addDays, startOfDay, endOfDay } from "date-fns";

export async function getSuperAdminDashboardStats() {
    try {
        const totalOutstandingRes = await db.execute(sql`SELECT SUM(CAST(total_amount AS DECIMAL)) as total FROM invoices WHERE status NOT IN ('Paid', 'Rejected')`);
        const totalOutstanding = totalOutstandingRes.rows[0]?.total ? parseFloat(String(totalOutstandingRes.rows[0].total)) : 0;

        const overdueRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE due_date < NOW() AND status NOT IN ('Paid', 'Rejected')`);
        const overdue = Number(overdueRes.rows[0]?.count || 0);

        const upcoming7DaysRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE due_date >= NOW() AND due_date <= ${endOfDay(addDays(new Date(), 7)).toISOString()} AND status NOT IN ('Paid', 'Rejected')`);
        const upcoming7Days = Number(upcoming7DaysRes.rows[0]?.count || 0);

        const bottleneckProcurementRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE status IN ('Pending OCR', 'In Review', 'Needs Revision')`);
        const bottleneckProcurement = Number(bottleneckProcurementRes.rows[0]?.count || 0);

        const bottleneckFinanceRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE status IN ('Procurement Verified', 'In Finance Verification')`);
        const bottleneckFinance = Number(bottleneckFinanceRes.rows[0]?.count || 0);

        const pendingVendorsRes = await db.select({ count: count() }).from(vendors).where(eq(vendors.status, "Pending Audit"));
        const pendingVendors = pendingVendorsRes[0].count;

        const recentActivityRes = await db.execute(sql`
            SELECT a.action, a.target_type as "targetType", a.logged_at as "loggedAt", u.name as "userName", u.role as "userRole"
            FROM audit_logs a
            LEFT JOIN "user" u ON a.user_id = u.id
            ORDER BY a.logged_at DESC LIMIT 15
        `);
        
        return {
            success: true,
            totalOutstanding,
            overdue,
            upcoming7Days,
            bottleneckProcurement,
            bottleneckFinance,
            pendingVendors,
            recentActivity: recentActivityRes.rows as any[]
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to fetch stats" };
    }
}

export async function getProcurementAdminDashboardStats() {
    try {
        const pendingVendorsRes = await db.select({ count: count() }).from(vendors).where(eq(vendors.status, "Pending Audit"));
        const pendingInitialRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE status IN ('Pending OCR', 'In Review')`);
        const waitingRevisionRes = await db.select({ count: count() }).from(invoices).where(eq(invoices.status, "Needs Revision"));
        
        const documentsInTransitRes = await db.select({ count: count() }).from(invoices).where(eq(invoices.status, "Document in Transit"));

        return {
            success: true,
            pendingVendors: pendingVendorsRes[0].count,
            pendingInitial: Number(pendingInitialRes.rows[0]?.count || 0),
            waitingRevision: waitingRevisionRes[0].count,
            documentsInTransit: documentsInTransitRes[0].count
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to fetch stats" };
    }
}

export async function getFinanceAdminDashboardStats() {
    try {
        const readyForFinalRes = await db.select({ count: count() }).from(invoices).where(or(eq(invoices.status, "Document in Transit"), eq(invoices.status, "In Finance Verification")));
        const readyForPaymentRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE status = 'Procurement Verified'`); 
        
        const thisWeekRes = await db.execute(sql`SELECT SUM(CAST(total_amount AS DECIMAL)) as total FROM invoices WHERE due_date >= NOW() AND due_date <= ${endOfDay(addDays(new Date(), 7)).toISOString()} AND status NOT IN ('Paid', 'Rejected')`);
        
        const paymentFailedRes = await db.execute(sql`SELECT COUNT(*) as count FROM invoices WHERE status = 'Payment Failed'`);

        return {
            success: true,
            readyForFinal: readyForFinalRes[0].count,
            readyForPayment: Number(readyForPaymentRes.rows[0]?.count || 0),
            cashflowThisWeek: thisWeekRes.rows[0]?.total ? parseFloat(String(thisWeekRes.rows[0].total)) : 0,
            paymentFailed: Number(paymentFailedRes.rows[0]?.count || 0)
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to fetch stats" };
    }
}
