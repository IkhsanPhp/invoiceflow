"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useState, useEffect } from "react"
import { Moon, Sun, Bell, Check, Circle, AlertCircle, XCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useSession } from "@/lib/auth-client"
import { getInvoiceHubData } from "@/app/dashboard/invoice-hub/actions"

const routeTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/invoice-hub": "Invoice Hub",
  "/dashboard/users": "User Management",
  "/dashboard/invoices": "Invoices Master",
  "/dashboard/vendors": "Vendors Master",
  "/dashboard/audit-logs": "Audit Logs Master",
}

export function SiteHeader() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const { theme, setTheme } = useTheme();

  // Dynamic Notifications based on real data
  const role = (session?.user as any)?.role || "vendor";
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [lastReadTime, setLastReadTime] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("notificationsLastRead");
      if (stored) setLastReadTime(parseInt(stored, 10));
    }
  }, []);

  const markAllAsRead = () => {
    const now = Date.now();
    setLastReadTime(now);
    if (typeof window !== "undefined") {
      localStorage.setItem("notificationsLastRead", now.toString());
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await getInvoiceHubData();
        if (res.success && res.invoices) {
          const invs = res.invoices as any[];
          const notifs: any[] = [];
          
          invs.forEach(i => {
            const status = i.status || "";
            const num = i.invoiceNumber;
            const time = new Date(i.updatedAt).toLocaleString("id-ID");
            
              const timestamp = new Date(i.updatedAt).getTime();
              if (role === "admin" || role === "superadmin") {
                if (status === "Pending OCR") notifs.push({ id: i.id, status: status, type: "warning", title: `OCR Sedang Berjalan: ${num}`, time, timestamp, unread: true });
                if (status === "In Review") notifs.push({ id: i.id, status: status, type: "info", title: `Invoice Baru Siap Diverifikasi: ${num}`, time, timestamp, unread: true });
                if (status === "Procurement Verified") notifs.push({ id: i.id, status: status, type: "success", title: `Lolos Verifikasi Procurement: ${num}`, time, timestamp, unread: false });
                if (status === "Needs Revision") notifs.push({ id: i.id, status: status, type: "warning", title: `Perlu Revisi Vendor: ${num}`, time, timestamp, unread: true });
                if (status === "Needs Finance Revision") notifs.push({ id: i.id, status: status, type: "warning", title: `Perlu Revisi Finance: ${num}`, time, timestamp, unread: true });
                if (status === "Document in Transit") notifs.push({ id: i.id, status: status, type: "info", title: `Dokumen Fisik Datang: ${num}`, time, timestamp, unread: true });
                if (status === "In Finance Verification") notifs.push({ id: i.id, status: status, type: "info", title: `Menunggu Verifikasi Finance: ${num}`, time, timestamp, unread: false });
                if (status === "Verified") notifs.push({ id: i.id, status: status, type: "success", title: `Invoice Terverifikasi: ${num}`, time, timestamp, unread: false });
                if (status === "Paid") notifs.push({ id: i.id, status: status, type: "success", title: `Invoice Selesai Dibayar: ${num}`, time, timestamp, unread: false });
                if (status === "Rejected") notifs.push({ id: i.id, status: status, type: "error", title: `Invoice Ditolak: ${num}`, time, timestamp, unread: true });
              } 
              else if (role === "vendor") {
                if (status === "Procurement Verified") notifs.push({ id: i.id, status: status, type: "info", title: `Lolos Verifikasi Procurement: ${num}`, time, timestamp, unread: true });
                if (status === "Needs Revision") notifs.push({ id: i.id, status: status, type: "warning", title: `Perlu Revisi: ${num}`, time, timestamp, unread: true });
                if (status === "Paid") notifs.push({ id: i.id, status: status, type: "success", title: `Invoice Selesai Dibayar: ${num}`, time, timestamp, unread: false });
                if (status === "Rejected") notifs.push({ id: i.id, status: status, type: "error", title: `Invoice Ditolak: ${num}`, time, timestamp, unread: true });
              }
              else if (role === "procurement") {
                if (status === "Pending OCR" || status === "In Review") notifs.push({ id: i.id, status: status, type: "info", title: `Invoice Baru Siap Diverifikasi: ${num}`, time: new Date(i.createdAt).toLocaleString("id-ID"), timestamp: new Date(i.createdAt).getTime(), unread: true });
                if (status === "Needs Finance Revision") notifs.push({ id: i.id, status: status, type: "warning", title: `Revisi Finance: ${num}`, time, timestamp, unread: true });
                if (status === "Document in Transit") notifs.push({ id: i.id, status: status, type: "success", title: `Dokumen Fisik Datang: ${num}`, time, timestamp, unread: true });
              }
              else if (role === "finance") {
                if (status === "In Finance Verification") notifs.push({ id: i.id, status: status, type: "info", title: `Menunggu Verifikasi Fisik: ${num}`, time, timestamp, unread: true });
              }
          });
          
          setNotifications(notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
        }
      } catch (err) {
        console.error("Failed to fetch notifications", err);
      }
    };
    
    fetchNotifications();
    
    let interval: any;
    if (realtimeEnabled) {
      interval = setInterval(fetchNotifications, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, role, realtimeEnabled]);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return "Loading...";
    const day = date.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    const offset = -date.getTimezoneOffset() / 60;
    const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;

    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} (UTC${offsetStr})`;
  }

  // Find matching title, check exact or fallback to prefix matching
  let title = "Dashboard"
  for (const [route, label] of Object.entries(routeTitles)) {
    if (route === "/dashboard") {
      if (pathname === "/dashboard") {
        title = label
        break
      }
    } else if (pathname.startsWith(route)) {
      title = label
      break
    }
  }

  return (
    <header className="flex h-(--header-height) shrink-0 items-center justify-between gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium hidden sm:block">{title}</h1>
      </div>

      <div className="flex items-center gap-2 px-4 lg:px-6">
        {/* Live Clock Pill */}
        {mounted && time && (
          <div className="hidden md:flex items-center bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-mono font-bold px-3 py-1.5 rounded-md shadow-sm tracking-wide">
            {formatTime(time)}
          </div>
        )}

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="relative h-9 w-9 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full bg-slate-800 dark:bg-slate-200 text-[9px] font-bold text-white dark:text-slate-900 ring-2 ring-white dark:ring-slate-950">
                {notifications.filter(n => n.unread && n.timestamp > lastReadTime).length > 0 ? notifications.filter(n => n.unread && n.timestamp > lastReadTime).length : 0}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 mr-4 mt-1 border-slate-200 dark:border-slate-800 shadow-lg rounded-xl overflow-hidden" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifikasi</span>
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Tandai semua
              </button>
            </div>
            
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
              <div className="flex items-center gap-2">
                <select 
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 flex-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="all">Semua Status</option>
                  {role === "admin" || role === "superadmin" ? (
                    <>
                      <option value="Pending OCR">Pending OCR</option>
                      <option value="In Review">In Review</option>
                      <option value="Needs Revision">Needs Revision Vendor</option>
                      <option value="Needs Finance Revision">Needs Finance Revision</option>
                      <option value="Procurement Verified">Procurement Verified</option>
                      <option value="Document in Transit">Document in Transit</option>
                      <option value="In Finance Verification">In Finance Verification</option>
                      <option value="Verified">Verified</option>
                      <option value="Paid">Paid</option>
                      <option value="Rejected">Rejected</option>
                    </>
                  ) : role === "vendor" ? (
                    <>
                      <option value="Procurement Verified">Lolos Verifikasi Procurement</option>
                      <option value="Needs Revision">Perlu Revisi</option>
                      <option value="Paid">Selesai Dibayar</option>
                      <option value="Rejected">Ditolak</option>
                    </>
                  ) : role === "procurement" ? (
                    <>
                      <option value="Pending OCR">Pending OCR</option>
                      <option value="In Review">Siap Diverifikasi</option>
                      <option value="Needs Finance Revision">Revisi Finance</option>
                      <option value="Document in Transit">Dokumen Fisik Datang</option>
                    </>
                  ) : role === "finance" ? (
                    <option value="In Finance Verification">Verifikasi Fisik</option>
                  ) : null}
                </select>
                <select 
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 flex-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as "newest" | "oldest")}
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
              </div>
              <Button 
                variant="outline" 
                className="w-full text-xs h-8 border-slate-200 dark:border-slate-800 shadow-sm font-semibold"
                onClick={() => setRealtimeEnabled(!realtimeEnabled)}
              >
                <div className={`h-2 w-2 rounded-full mr-2 ${realtimeEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                {realtimeEnabled ? 'Matikan' : 'Aktifkan'} Notifikasi Realtime
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              {(() => {
                let filtered = notifications;
                if (filterType !== "all") {
                  filtered = filtered.filter(n => n.status === filterType);
                }
                if (sortOrder === "oldest") {
                  filtered = [...filtered].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
                } else {
                  filtered = [...filtered].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
                }

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      Tidak ada notifikasi yang sesuai.
                    </div>
                  );
                }

                return filtered.map((notif, idx) => (
                  <div key={idx} className="flex gap-3 p-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer group">
                    <div className="mt-0.5 shrink-0">
                      {notif.type === 'success' && <Check className="h-4 w-4 text-emerald-500" />}
                      {notif.type === 'info' && <Circle className="h-4 w-4 text-blue-500" />}
                      {notif.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-500" />}
                      {notif.type === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {notif.title}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">{notif.time}</p>
                    </div>
                    {(notif.unread && notif.timestamp > lastReadTime) && (
                      <div className="shrink-0 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Dropdown */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800">
                {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 rounded-xl shadow-lg border-slate-200 dark:border-slate-800">
              <DropdownMenuItem onClick={() => setTheme("light")} className="text-xs font-medium cursor-pointer">
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="text-xs font-medium cursor-pointer">
                Dark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}

