import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { auth } from "@/lib/auth"
import { db } from "@/db"
import { vendors } from "@/db/schema/schema"
import { eq } from "drizzle-orm"
import { getAllPermissionsForUser } from "@/app/dashboard/users/actions"

import "@/app/dashboard/theme.css"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session || !session.user) {
    redirect("/sign-in");
  }

  // If vendor, check if status is Active. Otherwise redirect to sign-in with warning parameter.
  if (session.user.role === "vendor") {
    const vendorRecord = await db.select().from(vendors).where(eq(vendors.userId, session.user.id)).limit(1);
    if (vendorRecord.length === 0 || vendorRecord[0].status !== "Active") {
      redirect("/sign-in?error=pending_verification");
    }
  }

  const initialPermissions = await getAllPermissionsForUser(session.user.id);

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
    >
      <AppSidebar initialPermissions={initialPermissions} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}