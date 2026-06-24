import { getVendorDashboardStats } from "./dashboard-actions";
import { getSuperAdminDashboardStats, getProcurementAdminDashboardStats, getFinanceAdminDashboardStats } from "./dashboard-role-actions";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { VendorDashboard } from "@/components/dashboard/vendor-dashboard";
import { ProcurementDashboard } from "@/components/dashboard/procurement-dashboard";
import { FinanceDashboard } from "@/components/dashboard/finance-dashboard";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Page() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session || !session.user) {
        redirect("/sign-in");
    }

    const role = session.user.role;
    
    let stats;
    let DashboardComponent;

    switch (role) {
        case "vendor":
            stats = await getVendorDashboardStats(session.user.id);
            DashboardComponent = <VendorDashboard stats={stats} />;
            break;
        case "procurement":
            stats = await getProcurementAdminDashboardStats();
            DashboardComponent = <ProcurementDashboard stats={stats} />;
            break;
        case "finance":
            stats = await getFinanceAdminDashboardStats();
            DashboardComponent = <FinanceDashboard stats={stats} />;
            break;
        case "admin":
        default:
            stats = await getSuperAdminDashboardStats();
            DashboardComponent = <SuperAdminDashboard stats={stats} />;
            break;
    }

    return (
        <div className="@container/main flex flex-1 flex-col">
            {DashboardComponent}
        </div>
    )
}
