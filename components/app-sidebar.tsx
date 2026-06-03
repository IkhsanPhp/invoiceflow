"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { IconDashboard, IconUsers, IconReceipt, IconHistory, IconBriefcase, IconDatabase, IconChevronRight } from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { getMyPermissions } from "@/app/dashboard/users/actions"

const staticData = {
  navSecondary: [],
  documents: [],
}

export function AppSidebar({ 
  initialPermissions = {}, 
  ...props 
}: React.ComponentProps<typeof Sidebar> & {
  initialPermissions?: Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>;
}) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role
  const pathname = usePathname()

  const [permissions, setPermissions] = React.useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>(initialPermissions)
  
  React.useEffect(() => {
    if (session?.user) {
      getMyPermissions().then(res => {
        if (res.success && res.permissions) {
          setPermissions(res.permissions);
        }
      });
    }
  }, [session]);

  const hasAccess = (menuKey: string, allowedRoles: string[]) => {
    if (permissions[menuKey] !== undefined) {
      return permissions[menuKey].canAccess;
    }
    return role ? allowedRoles.includes(role) : false;
  };

  const isMasterActive = pathname.startsWith("/dashboard/invoices") ||
    pathname.startsWith("/dashboard/vendors") ||
    pathname.startsWith("/dashboard/audit-logs")
  
  const navMainItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
  ]

  const userData = session?.user ? {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || "/codeguide-logo.png",
  } : {
    name: "Guest",
    email: "guest@example.com", 
    avatar: "/codeguide-logo.png",
  }

  const showUserManagement = hasAccess("user-management", ["admin"]);
  const showInvoicesMaster = hasAccess("invoices-master", ["admin"]);
  const showVendorsMaster = hasAccess("vendors-master", ["admin"]);
  const showAuditLogs = hasAccess("audit-logs", ["admin"]);
  const showInvoiceHub = hasAccess("invoice-hub", ["vendor", "procurement", "finance", "admin"]);

  const showMasterDataGroup = showInvoicesMaster || showVendorsMaster || showAuditLogs;
  const showManagementGroup = showUserManagement || showInvoiceHub || showMasterDataGroup;

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src="/codeguide-logo.png" alt="CodeGuide" width={32} height={32} className="rounded-lg" />
                <span className="text-base font-semibold font-parkinsans">CodeGuide</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
        
        {showManagementGroup && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1 mt-2">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {showInvoiceHub && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Invoice Hub" asChild isActive={pathname.startsWith("/dashboard/invoice-hub")}>
                      <Link href="/dashboard/invoice-hub" className="flex items-center gap-2">
                        <IconReceipt className="h-4 w-4" />
                        <span>Invoice Hub</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showUserManagement && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="User Management" asChild isActive={pathname.startsWith("/dashboard/users")}>
                      <Link href="/dashboard/users" className="flex items-center gap-2">
                        <IconUsers className="h-4 w-4" />
                        <span>User Management</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}

                {showMasterDataGroup && (
                  <Collapsible className="group/collapsible w-full mt-1" defaultOpen={isMasterActive}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip="Master Data" isActive={isMasterActive}>
                          <IconDatabase className="h-4 w-4" />
                          <span>Master Data</span>
                          <IconChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {showInvoicesMaster && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith("/dashboard/invoices")}>
                                <Link href="/dashboard/invoices" className="flex items-center gap-2">
                                  <IconReceipt className="h-4 w-4" />
                                  <span>Invoices Master</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          {showVendorsMaster && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith("/dashboard/vendors")}>
                                <Link href="/dashboard/vendors" className="flex items-center gap-2">
                                  <IconBriefcase className="h-4 w-4" />
                                  <span>Vendors Master</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                          {showAuditLogs && (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton asChild isActive={pathname.startsWith("/dashboard/audit-logs")}>
                                <Link href="/dashboard/audit-logs" className="flex items-center gap-2">
                                  <IconHistory className="h-4 w-4" />
                                  <span>Audit Logs Master</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}


        {staticData.documents.length > 0 && <NavDocuments items={staticData.documents} />}
        {staticData.navSecondary.length > 0 && <NavSecondary items={staticData.navSecondary} className="mt-auto" />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
