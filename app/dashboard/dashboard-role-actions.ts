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

        // Charts data
        const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
        const chartQuery = await db.execute(sql`
            SELECT DATE(created_at) as date, status, COUNT(*) as count
            FROM invoices WHERE created_at >= ${thirtyDaysAgo.toISOString()}
            GROUP BY DATE(created_at), status ORDER BY DATE(created_at) ASC
        `);

        const chartMap = new Map();
        for (let i = 29; i >= 0; i--) {
            const dateStr = startOfDay(subDays(new Date(), i)).toISOString().split('T')[0];
            const displayDate = new Date(dateStr).toLocaleDateString("id-ID", { month: "short", day: "numeric" });
            chartMap.set(dateStr, { date: displayDate, "Verified": 0, "Rejected": 0, "Pending": 0 });
        }
        chartQuery.rows.forEach((row: any) => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (!chartMap.has(dateStr)) return;
            const item = chartMap.get(dateStr);
            if (row.status === "Verified" || row.status === "Paid") item["Verified"] += Number(row.count);
            else if (row.status === "Rejected") item["Rejected"] += Number(row.count);
            else item["Pending"] += Number(row.count);
        });
        const chartData = Array.from(chartMap.values());

        const statusDistributionRes = await db.execute(sql`SELECT status as name, COUNT(*) as value FROM invoices GROUP BY status`);
        const statusDistribution = statusDistributionRes.rows.map(r => ({ name: r.name, value: Number(r.value) }));

        const topVendorsRes = await db.execute(sql`
            SELECT u.name, SUM(CAST(i.total_amount AS DECIMAL)) as total_value 
            FROM invoices i JOIN "user" u ON i.vendor_id = u.id 
            GROUP BY u.name ORDER BY total_value DESC NULLS LAST LIMIT 5
        `);
        const topVendors = topVendorsRes.rows.map(r => ({ name: r.name || 'Unknown', totalValue: Number(r.total_value) }));
        
        return {
            success: true,
            totalOutstanding, overdue, upcoming7Days,
            bottleneckProcurement, bottleneckFinance, pendingVendors,
            recentActivity: recentActivityRes.rows as any[],
            chartData, statusDistribution, topVendors
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

        const recentInvoicesRes = await db.execute(sql`
            SELECT i.id, i.invoice_number as "invoiceNumber", u.name as "vendorName", i.total_amount as "totalAmount", i.status, i.created_at as "createdAt"
            FROM invoices i LEFT JOIN "user" u ON i.vendor_id = u.id
            WHERE i.status IN ('Pending OCR', 'In Review', 'Needs Revision')
            ORDER BY i.created_at DESC LIMIT 5
        `);

        const last7Days = startOfDay(subDays(new Date(), 7));
        const chartQuery = await db.execute(sql`
            SELECT DATE(created_at) as date, status, COUNT(*) as count
            FROM invoices WHERE created_at >= ${last7Days.toISOString()} AND status IN ('Pending OCR', 'In Review', 'Needs Revision', 'Procurement Verified', 'Document in Transit', 'In Finance Verification', 'Verified', 'Paid')
            GROUP BY DATE(created_at), status ORDER BY DATE(created_at) ASC
        `);

        const chartMap = new Map();
        for (let i = 6; i >= 0; i--) {
            const dateStr = startOfDay(subDays(new Date(), i)).toISOString().split('T')[0];
            const displayDate = new Date(dateStr).toLocaleDateString("id-ID", { month: "short", day: "numeric" });
            chartMap.set(dateStr, { date: displayDate, "Pending": 0, "Processed": 0 });
        }
        chartQuery.rows.forEach((row: any) => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (!chartMap.has(dateStr)) return;
            const item = chartMap.get(dateStr);
            if (row.status === "Pending OCR" || row.status === "In Review" || row.status === "Needs Revision") {
                item["Pending"] += Number(row.count);
            } else {
                item["Processed"] += Number(row.count);
            }
        });
        const chartData = Array.from(chartMap.values());

        return {
            success: true,
            pendingVendors: pendingVendorsRes[0].count,
            pendingInitial: Number(pendingInitialRes.rows[0]?.count || 0),
            waitingRevision: waitingRevisionRes[0].count,
            documentsInTransit: documentsInTransitRes[0].count,
            recentInvoices: recentInvoicesRes.rows,
            chartData
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

        const recentInvoicesRes = await db.execute(sql`
            SELECT i.id, i.invoice_number as "invoiceNumber", u.name as "vendorName", i.total_amount as "totalAmount", i.due_date as "dueDate"
            FROM invoices i LEFT JOIN "user" u ON i.vendor_id = u.id
            WHERE i.status IN ('Document in Transit', 'In Finance Verification', 'Verified')
            ORDER BY i.due_date ASC NULLS LAST LIMIT 5
        `);

        const chartMap = new Map();
        for (let i = 0; i < 7; i++) {
            const dateStr = startOfDay(addDays(new Date(), i)).toISOString().split('T')[0];
            const displayDate = new Date(dateStr).toLocaleDateString("id-ID", { month: "short", day: "numeric" });
            chartMap.set(dateStr, { date: displayDate, "Projected CashOut": 0 });
        }
        
        const next7DaysEnd = endOfDay(addDays(new Date(), 6));
        const cashflowQuery = await db.execute(sql`
            SELECT DATE(due_date) as date, SUM(CAST(total_amount AS DECIMAL)) as total
            FROM invoices WHERE due_date >= NOW() AND due_date <= ${next7DaysEnd.toISOString()} AND status NOT IN ('Paid', 'Rejected')
            GROUP BY DATE(due_date)
        `);

        cashflowQuery.rows.forEach((row: any) => {
            const dateStr = new Date(row.date).toISOString().split('T')[0];
            if (chartMap.has(dateStr)) {
                chartMap.get(dateStr)["Projected CashOut"] += parseFloat(String(row.total));
            }
        });
        const cashflowChart = Array.from(chartMap.values());

        return {
            success: true,
            readyForFinal: readyForFinalRes[0].count,
            readyForPayment: Number(readyForPaymentRes.rows[0]?.count || 0),
            cashflowThisWeek: thisWeekRes.rows[0]?.total ? parseFloat(String(thisWeekRes.rows[0].total)) : 0,
            paymentFailed: Number(paymentFailedRes.rows[0]?.count || 0),
            recentInvoices: recentInvoicesRes.rows,
            cashflowChart
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to fetch stats" };
    }
}
