const fs = require('fs');
const file = 'components/site-header.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import for getInvoiceHubData
if (!content.includes('getInvoiceHubData')) {
    content = content.replace(
        'import { useSession } from "@/lib/auth-client"',
        'import { useSession } from "@/lib/auth-client"\nimport { getInvoiceHubData } from "@/app/dashboard/invoice-hub/actions"'
    );
}

// 2. Replace the hardcoded notifications array
const hardcodedStart = '  // Mock Notifications based on role';
const hardcodedEnd = '  ];';

const startIndex = content.indexOf(hardcodedStart);
const endIndex = content.indexOf(hardcodedEnd, startIndex) + hardcodedEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const dynamicCode = `  // Dynamic Notifications based on real data
  const role = session?.user?.role || "vendor";
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!session?.user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await getInvoiceHubData();
        if (res.success && res.invoices) {
          const invs = res.invoices as any[];
          const notifs: any[] = [];
          
          if (role === "vendor") {
            invs.filter(i => i.status === "Procurement Verified").forEach(i => {
              notifs.push({ id: i.id, type: "info", title: \`Tagihan Lolos Verifikasi Procurement: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
            invs.filter(i => i.status === "Needs Revision").forEach(i => {
              notifs.push({ id: i.id, type: "warning", title: \`Perlu Revisi: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
            invs.filter(i => i.status === "Paid").forEach(i => {
              notifs.push({ id: i.id, type: "success", title: \`Tagihan Selesai Dibayar: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: false });
            });
          } else if (role === "procurement") {
            invs.filter(i => i.status === "Pending OCR" || i.status === "In Review").forEach(i => {
              notifs.push({ id: i.id, type: "info", title: \`Tagihan Baru Siap Diaudit: \${i.invoiceNumber}\`, time: new Date(i.createdAt).toLocaleString("id-ID"), unread: true });
            });
            invs.filter(i => i.status === "Needs Finance Revision").forEach(i => {
              notifs.push({ id: i.id, type: "warning", title: \`Revisi Finance untuk Invoice \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
            invs.filter(i => i.status === "Document in Transit").forEach(i => {
              notifs.push({ id: i.id, type: "success", title: \`Dokumen Fisik Datang (Resi \${i.shippingDetails?.resiNumber || ""}): \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
          } else if (role === "finance") {
            invs.filter(i => i.status === "In Finance Verification").forEach(i => {
              notifs.push({ id: i.id, type: "info", title: \`Tagihan Menunggu Verifikasi Fisik: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
          } else if (role === "admin" || role === "superadmin") {
            invs.filter(i => i.status === "Pending OCR").forEach(i => {
              notifs.push({ id: i.id, type: "warning", title: \`OCR Sedang Berjalan: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
            invs.filter(i => i.status === "Needs Revision" || i.status === "Needs Finance Revision").forEach(i => {
              notifs.push({ id: i.id, type: "error", title: \`Revisi Tertunda: \${i.invoiceNumber}\`, time: new Date(i.updatedAt).toLocaleString("id-ID"), unread: true });
            });
          }
          
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
  }, [session, role, realtimeEnabled]);`;
    
    content = content.substring(0, startIndex) + dynamicCode + content.substring(endIndex);
}

fs.writeFileSync(file, content);
console.log('Site header notifications updated to be dynamic!');
