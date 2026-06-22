import { getSuperAdminDashboardStats, getVendorDashboardStats } from "./dashboard-actions";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { VendorDashboard } from "@/components/dashboard/vendor-dashboard";
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

    const isVendor = session.user.role === "vendor";
    
    let stats;
    if (isVendor) {
        stats = await getVendorDashboardStats(session.user.id);
    } else {
        stats = await getSuperAdminDashboardStats();
    }

    return (
        <div className="@container/main flex flex-1 flex-col">
            {isVendor ? (
                <VendorDashboard stats={stats} />
            ) : (
                <SuperAdminDashboard stats={stats} />
            )}
        </div>
    )
}
