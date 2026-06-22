import { db } from "@/db";
import { invoices, vendors, auditLogs, verifications } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { count, eq, sql, desc, or, and, gte } from "drizzle-orm";
import { subDays, startOfDay } from "date-fns";

export async function getSuperAdminDashboardStats() {
    try {
        // 1. Total Invoices
        const totalInvoicesRes = await db.select({ count: count() }).from(invoices);
        const totalInvoices = totalInvoicesRes[0].count;

        // 2. Pending Verification (Pending OCR & In Review & Needs Revision)
        const pendingVerificationsRes = await db.select({ count: count() }).from(invoices).where(
            or(
                eq(invoices.status, "Pending OCR"),
                eq(invoices.status, "In Review"),
                eq(invoices.status, "Needs Revision")
            )
        );
        const pendingVerifications = pendingVerificationsRes[0].count;

        // 3. Active Vendors
        const activeVendorsRes = await db.select({ count: count() }).from(vendors).where(eq(vendors.status, "Active"));
        const activeVendors = activeVendorsRes[0].count;

        // 4. Total Users
        const totalUsersRes = await db.select({ count: count() }).from(user);
        const totalUsers = totalUsersRes[0].count;

        // 5. Total Invoice Value (Verified or Paid, last 30 days)
        // using raw SQL sum
        const totalValueRes = await db.execute(sql`
            SELECT SUM(CAST(total_amount AS DECIMAL)) as total 
            FROM invoices 
            WHERE status IN ('Verified', 'Paid')
        `);
        const totalValue = totalValueRes.rows[0]?.total ? parseFloat(String(totalValueRes.rows[0].total)) : 0;

        // 6. Recent Invoices (last 5)
        const recentInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            vendorName: user.name,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(user, eq(invoices.vendorId, user.id))
        .orderBy(desc(invoices.createdAt))
        .limit(5);

        // 7. Pending Vendor Registrations (last 5)
        const pendingVendors = await db.select({
            id: vendors.id,
            nameOfVendor: vendors.nameOfVendor,
            vendorType: vendors.vendorType,
            status: vendors.status,
            createdAt: vendors.createdAt,
        })
        .from(vendors)
        .where(eq(vendors.status, "Pending Audit"))
        .orderBy(desc(vendors.createdAt))
        .limit(5);

        // 8. Chart Data (Last 30 days invoice volume)
        // Group by Date and Status
        const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
        
        const chartQuery = await db.execute(sql`
            SELECT 
                DATE(created_at) as date,
                status,
                COUNT(*) as count
            FROM invoices
            WHERE created_at >= ${thirtyDaysAgo}
            GROUP BY DATE(created_at), status
            ORDER BY DATE(created_at) ASC
        `);

        // Format chart data for Recharts: { date: "2026-06-01", "Verified": 5, "Pending OCR": 2, ... }
        const chartMap = new Map<string, any>();
        for (let i = 29; i >= 0; i--) {
            const dateStr = startOfDay(subDays(new Date(), i)).toISOString().split('T')[0];
            chartMap.set(dateStr, { 
                date: new Date(dateStr).toLocaleDateString("id-ID", { month: "short", day: "numeric" }), 
                "Verified": 0, 
                "Rejected": 0,
                "Pending": 0,
            });
        }

        chartQuery.rows.forEach((row: any) => {
            const dateObj = new Date(row.date);
            // Adjust for timezone differences (postgres returns UTC midnight)
            const dateStr = dateObj.toISOString().split('T')[0];
            const displayDate = dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
            
            if (!chartMap.has(dateStr)) {
                chartMap.set(dateStr, { date: displayDate, "Verified": 0, "Rejected": 0, "Pending": 0 });
            }
            
            const item = chartMap.get(dateStr);
            if (row.status === "Verified" || row.status === "Paid") {
                item["Verified"] += Number(row.count);
            } else if (row.status === "Rejected") {
                item["Rejected"] += Number(row.count);
            } else {
                item["Pending"] += Number(row.count);
            }
        });

        const chartData = Array.from(chartMap.values());

        // 9. Status Distribution (Donut Chart)
        const statusDistributionRes = await db.execute(sql`
            SELECT status, COUNT(*) as value
            FROM invoices
            GROUP BY status
        `);
        const statusDistribution = statusDistributionRes.rows.map(row => ({
            name: row.status,
            value: Number(row.value)
        }));

        // 10. Top Vendors by Volume (Bar Chart)
        const topVendorsRes = await db.execute(sql`
            SELECT 
                u.name as name, 
                SUM(CAST(i.total_amount AS DECIMAL)) as total_value,
                COUNT(i.id) as invoice_count
            FROM invoices i
            JOIN "user" u ON i.vendor_id = u.id
            GROUP BY u.name
            ORDER BY total_value DESC NULLS LAST
            LIMIT 5
        `);
        const topVendors = topVendorsRes.rows.map(row => ({
            name: row.name || 'Unknown',
            totalValue: Number(row.total_value),
            count: Number(row.invoice_count)
        }));

        // 11. Verification Success Rate by Section
        const verificationsRes = await db.execute(sql`
            SELECT 
                section,
                SUM(CASE WHEN passed = true THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN passed = false THEN 1 ELSE 0 END) as failed
            FROM verifications
            GROUP BY section
            ORDER BY section ASC
        `);
        const verificationStats = verificationsRes.rows.map(row => ({
            section: row.section,
            passed: Number(row.passed),
            failed: Number(row.failed)
        }));

        // 12. Recent Activity (Audit Trail)
        const recentActivityRes = await db.execute(sql`
            SELECT 
                a.action,
                a.target_type,
                a.logged_at,
                u.name as user_name
            FROM audit_logs a
            LEFT JOIN "user" u ON a.user_id = u.id
            ORDER BY a.logged_at DESC
            LIMIT 8
        `);
        const recentActivity = recentActivityRes.rows.map(row => ({
            action: row.action,
            targetType: row.target_type,
            userName: row.user_name || 'System',
            loggedAt: row.logged_at
        }));

        return {
            success: true,
            kpis: {
                totalInvoices,
                pendingVerifications,
                activeVendors,
                totalUsers,
                totalValue
            },
            recentInvoices,
            pendingVendors,
            chartData,
            statusDistribution,
            topVendors,
            verificationStats,
            recentActivity
        };

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return { success: false, error: "Failed to fetch dashboard stats" };
    }
}

export async function getVendorDashboardStats(vendorUserId: string) {
    try {
        // 1. Total Invoices for this vendor
        const totalInvoicesRes = await db.select({ count: count() })
            .from(invoices)
            .where(eq(invoices.vendorId, vendorUserId));
        const totalInvoices = totalInvoicesRes[0].count;

        // 2. Pending Invoices (Pending OCR, In Review, Needs Revision)
        const pendingInvoicesRes = await db.select({ count: count() })
            .from(invoices)
            .where(and(
                eq(invoices.vendorId, vendorUserId),
                or(
                    eq(invoices.status, "Pending OCR"),
                    eq(invoices.status, "In Review"),
                    eq(invoices.status, "Needs Revision")
                )
            ));
        const pendingInvoices = pendingInvoicesRes[0].count;

        // 3. Rejected Invoices
        const rejectedInvoicesRes = await db.select({ count: count() })
            .from(invoices)
            .where(and(
                eq(invoices.vendorId, vendorUserId),
                eq(invoices.status, "Rejected")
            ));
        const rejectedInvoices = rejectedInvoicesRes[0].count;

        // 4. Verified/Paid Invoices
        const verifiedInvoicesRes = await db.select({ count: count() })
            .from(invoices)
            .where(and(
                eq(invoices.vendorId, vendorUserId),
                or(
                    eq(invoices.status, "Verified"),
                    eq(invoices.status, "Paid")
                )
            ));
        const verifiedInvoices = verifiedInvoicesRes[0].count;

        // 5. Total Invoice Value
        const totalValueRes = await db.execute(sql`
            SELECT SUM(CAST(total_amount AS DECIMAL)) as total 
            FROM invoices 
            WHERE vendor_id = ${vendorUserId} AND status IN ('Verified', 'Paid')
        `);
        const totalValue = totalValueRes.rows[0]?.total ? parseFloat(String(totalValueRes.rows[0].total)) : 0;

        // 6. Recent Invoices (last 5)
        const recentInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            totalAmount: invoices.totalAmount,
            status: invoices.status,
            createdAt: invoices.createdAt,
        })
        .from(invoices)
        .where(eq(invoices.vendorId, vendorUserId))
        .orderBy(desc(invoices.createdAt))
        .limit(5);

        // 7. Chart Data (Last 30 days invoice volume for this vendor)
        const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
        
        const chartQuery = await db.execute(sql`
            SELECT 
                DATE(created_at) as date,
                status,
                COUNT(*) as count
            FROM invoices
            WHERE vendor_id = ${vendorUserId} AND created_at >= ${thirtyDaysAgo}
            GROUP BY DATE(created_at), status
            ORDER BY DATE(created_at) ASC
        `);

        // Format chart data for Recharts
        const chartMap = new Map<string, any>();
        for (let i = 29; i >= 0; i--) {
            const dateStr = startOfDay(subDays(new Date(), i)).toISOString().split('T')[0];
            chartMap.set(dateStr, { 
                date: new Date(dateStr).toLocaleDateString("id-ID", { month: "short", day: "numeric" }), 
                "Verified": 0, 
                "Rejected": 0,
                "Pending": 0,
            });
        }

        chartQuery.rows.forEach((row: any) => {
            const dateObj = new Date(row.date);
            const dateStr = dateObj.toISOString().split('T')[0];
            const displayDate = dateObj.toLocaleDateString("id-ID", { month: "short", day: "numeric" });
            
            if (!chartMap.has(dateStr)) {
                chartMap.set(dateStr, { date: displayDate, "Verified": 0, "Rejected": 0, "Pending": 0 });
            }
            
            const item = chartMap.get(dateStr);
            if (row.status === "Verified" || row.status === "Paid") {
                item["Verified"] += Number(row.count);
            } else if (row.status === "Rejected") {
                item["Rejected"] += Number(row.count);
            } else {
                item["Pending"] += Number(row.count);
            }
        });

        const chartData = Array.from(chartMap.values());

        return {
            success: true,
            kpis: {
                totalInvoices,
                pendingInvoices,
                rejectedInvoices,
                verifiedInvoices,
                totalValue
            },
            recentInvoices,
            chartData
        };

    } catch (error) {
        console.error("Error fetching vendor dashboard stats:", error);
        return { success: false, error: "Failed to fetch vendor dashboard stats" };
    }
}
