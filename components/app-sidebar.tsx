"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { IconDashboard, IconUsers, IconReceipt, IconHistory, IconBriefcase, IconDatabase, IconChevronRight, IconSettings } from "@tabler/icons-react"

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
  useSidebar,
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
  const { state, setOpen } = useSidebar()

  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

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

  const userData = (mounted && session?.user) ? {
    name: session.user.name || "User",
    email: session.user.email,
    avatar: session.user.image || "/codeguide-logo.png",
  } : {
    name: "Guest",
    email: "guest@example.com", 
    avatar: "/codeguide-logo.png",
  }

  const showUserManagement = mounted && hasAccess("user-management", ["admin"]);
  const showInvoicesMaster = mounted && hasAccess("invoices-master", ["admin"]);
  const showVendorsMaster = mounted && hasAccess("vendors-master", ["admin", "procurement"]);
  const showAuditLogs = mounted && hasAccess("audit-logs", ["admin"]);
  const showInvoiceHub = mounted && hasAccess("invoice-hub", ["vendor", "procurement", "finance", "admin"]);

  const showSettings = mounted && hasAccess("settings", ["admin"]);

  const showMasterDataGroup = showInvoicesMaster || showVendorsMaster || showAuditLogs;
  const showManagementGroup = showUserManagement || showInvoiceHub || showMasterDataGroup || showSettings;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/" className="flex items-center gap-2 mt-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm overflow-hidden p-1">
                  <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none overflow-hidden ml-1">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-white truncate">PROC-SHARE</span>
                  <span className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">All In One Apps Chitra Paratama</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3 gap-0">
        <div className="py-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Dashboard" asChild isActive={pathname === "/dashboard"}>
                <Link href="/dashboard" className="flex items-center gap-3">
                  <IconDashboard className="h-5 w-5" />
                  <span className="font-medium">Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
        
        {(showInvoiceHub || showMasterDataGroup) && (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-2 mt-2">
              SCM MANAGEMENT
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

                {showMasterDataGroup && (
                  <Collapsible className="group/collapsible w-full mt-1" defaultOpen={isMasterActive}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild onClick={() => state === "collapsed" && setOpen(true)}>
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

        {(showUserManagement || showSettings) && (
          <SidebarGroup className="px-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-2 mt-2">
              BUSINESS & ANALYTICS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
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
                {showSettings && (
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings" asChild isActive={pathname.startsWith("/dashboard/settings")}>
                      <Link href="/dashboard/settings/email" className="flex items-center gap-2">
                        <IconSettings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
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
