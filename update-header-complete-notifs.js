const fs = require('fs');
const file = 'components/site-header.tsx';
let content = fs.readFileSync(file, 'utf8');

// We will inject the state variables for filters
// Look for `const [notifications, setNotifications] = useState<any[]>([]);`
const filterStates = `  const [notifications, setNotifications] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");`;

content = content.replace('const [notifications, setNotifications] = useState<any[]>([]);', filterStates);

// Now we replace the content inside the fetchNotifications function
const fetchStart = 'const fetchNotifications = async () => {';
const fetchEnd = 'setNotifications(notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));';

const newFetchLogic = `const fetchNotifications = async () => {
      try {
        const res = await getInvoiceHubData();
        if (res.success && res.invoices) {
          const invs = res.invoices as any[];
          const notifs: any[] = [];
          
          invs.forEach(i => {
            const status = i.status || "";
            const num = i.invoiceNumber;
            const time = new Date(i.updatedAt).toLocaleString("id-ID");
            
            if (role === "admin" || role === "superadmin") {
              if (status === "Pending OCR") notifs.push({ id: i.id, type: "warning", title: \`OCR Sedang Berjalan: \${num}\`, time, unread: true });
              if (status === "In Review") notifs.push({ id: i.id, type: "info", title: \`Invoice Baru Siap Diaudit: \${num}\`, time, unread: true });
              if (status === "Procurement Verified") notifs.push({ id: i.id, type: "success", title: \`Lolos Verifikasi Procurement: \${num}\`, time, unread: false });
              if (status === "Needs Revision") notifs.push({ id: i.id, type: "warning", title: \`Perlu Revisi Vendor: \${num}\`, time, unread: true });
              if (status === "Needs Finance Revision") notifs.push({ id: i.id, type: "warning", title: \`Perlu Revisi Finance: \${num}\`, time, unread: true });
              if (status === "Document in Transit") notifs.push({ id: i.id, type: "info", title: \`Dokumen Fisik Datang: \${num}\`, time, unread: true });
              if (status === "In Finance Verification") notifs.push({ id: i.id, type: "info", title: \`Menunggu Verifikasi Finance: \${num}\`, time, unread: false });
              if (status === "Verified") notifs.push({ id: i.id, type: "success", title: \`Invoice Terverifikasi: \${num}\`, time, unread: false });
              if (status === "Paid") notifs.push({ id: i.id, type: "success", title: \`Invoice Selesai Dibayar: \${num}\`, time, unread: false });
              if (status === "Rejected") notifs.push({ id: i.id, type: "error", title: \`Invoice Ditolak: \${num}\`, time, unread: true });
            } 
            else if (role === "vendor") {
              if (status === "Procurement Verified") notifs.push({ id: i.id, type: "info", title: \`Lolos Verifikasi Procurement: \${num}\`, time, unread: true });
              if (status === "Needs Revision") notifs.push({ id: i.id, type: "warning", title: \`Perlu Revisi: \${num}\`, time, unread: true });
              if (status === "Paid") notifs.push({ id: i.id, type: "success", title: \`Invoice Selesai Dibayar: \${num}\`, time, unread: false });
              if (status === "Rejected") notifs.push({ id: i.id, type: "error", title: \`Invoice Ditolak: \${num}\`, time, unread: true });
            }
            else if (role === "procurement") {
              if (status === "Pending OCR" || status === "In Review") notifs.push({ id: i.id, type: "info", title: \`Invoice Baru Siap Diaudit: \${num}\`, time: new Date(i.createdAt).toLocaleString("id-ID"), unread: true });
              if (status === "Needs Finance Revision") notifs.push({ id: i.id, type: "warning", title: \`Revisi Finance: \${num}\`, time, unread: true });
              if (status === "Document in Transit") notifs.push({ id: i.id, type: "success", title: \`Dokumen Fisik Datang: \${num}\`, time, unread: true });
            }
            else if (role === "finance") {
              if (status === "In Finance Verification") notifs.push({ id: i.id, type: "info", title: \`Menunggu Verifikasi Fisik: \${num}\`, time, unread: true });
            }
          });
          
          setNotifications(notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));`;

const s1 = content.indexOf(fetchStart);
const e1 = content.indexOf(fetchEnd) + fetchEnd.length;
content = content.substring(0, s1) + newFetchLogic + content.substring(e1);


// Now we replace the rendering logic for the notifications list to use the filter
const filterUI = `<div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
              <div className="flex items-center gap-2">
                <select 
                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 flex-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                >
                  <option value="all">Semua Tipe</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning / Revisi</option>
                  <option value="success">Sukses</option>
                  <option value="error">Error</option>
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
                <div className={\`h-2 w-2 rounded-full mr-2 \${realtimeEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}\`}></div>
                {realtimeEnabled ? 'Matikan' : 'Aktifkan'} Notifikasi Realtime
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto overflow-x-hidden">
              {(() => {
                let filtered = notifications;
                if (filterType !== "all") {
                  filtered = filtered.filter(n => n.type === filterType);
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
                    {notif.unread && (
                      <div className="shrink-0 mt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>`;

const searchListStart = '<div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">';
const searchListEnd = '</PopoverContent>';

const s2 = content.indexOf(searchListStart);
const e2 = content.indexOf(searchListEnd, s2);
content = content.substring(0, s2) + filterUI + '\n          ' + content.substring(e2);

fs.writeFileSync(file, content);
console.log('Done patching site header for superadmin notifs and filters.');
