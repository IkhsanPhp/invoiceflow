const fs = require('fs');

const path = 'app/dashboard/invoice-hub/details/[id]/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Reverse the order of the logs
content = content.replace(
    '{invoice.auditLogs.map((log) => {',
    '{[...invoice.auditLogs].sort((a,b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()).map((log, index) => {'
);

// 2. Modify Pending Step to be Green
const oldPending = `<div className={\`absolute -left-[37px] top-0.5 rounded-full p-1.5 flex items-center justify-center shrink-0 shadow-sm bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-600\`}>
                                                <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{pending.title} <span className="text-blue-600 dark:text-blue-400 font-bold ml-1">(Sedang Berjalan)</span></h4>`;

const newPending = `<div className={\`absolute -left-[37px] top-0.5 rounded-full p-1.5 flex items-center justify-center shrink-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40 border-2 border-dashed border-emerald-500 dark:border-emerald-600\`}>
                                                <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                                    <h4 className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">{pending.title} <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-1">(Sedang Berjalan)</span></h4>`;

content = content.replace(oldPending, newPending);

// 3. Make all past steps Grey
// We find the switch statement inside the map and replace the color assignments.
const switchRegex = /switch\s*\(log\.action\)\s*{[\s\S]*?default:\s*title\s*=\s*log\.action;\s*desc\s*=\s*"Aktivitas tercatat oleh sistem\.";[\s\S]*?break;\s*}/;

const newSwitch = `switch (log.action) {
                                    case "CREATE":
                                        title = "Invoice Berhasil Dikirim";
                                        desc = "Vendor mengunggah dokumen invoice utama beserta berkas pendukung wajib.";
                                        iconNode = <UploadCloud className="h-3.5 w-3.5" />;
                                        break;
                                    case "PROCUREMENT_VERIFY":
                                        title = "Verifikasi Procurement Disetujui";
                                        desc = "Procurement Admin memverifikasi kelengkapan berkas dan menyetujui dokumen.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "FINANCE_VERIFY":
                                        title = "Persetujuan Final Finance (Verified)";
                                        desc = "Finance menyetujui invoice secara final untuk proses pembayaran.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "FINANCE_REVISION_REQUEST":
                                        title = "Revisi Dikembalikan oleh Finance";
                                        desc = "Finance meninjau invoice dan mengembalikannya ke Procurement dengan catatan perbaikan.";
                                        iconNode = <RefreshCw className="h-3.5 w-3.5" />;
                                        break;
                                    case "FINANCE_REJECT":
                                        title = "Ditolak oleh Finance (Rejected)";
                                        desc = "Finance menolak invoice karena alasan fatal.";
                                        iconNode = <X className="h-3.5 w-3.5" />;
                                        break;
                                    case "VERIFY":
                                        title = "Pemeriksaan Disetujui (Verified)";
                                        desc = "Pemeriksa menyelesaikan proses verifikasi dan menyetujui invoice.";
                                        iconNode = <Check className="h-3.5 w-3.5 font-bold" />;
                                        break;
                                    case "REVISION_REQUEST":
                                        title = "Permintaan Revisi ke Vendor";
                                        desc = "Pemeriksa mengembalikan invoice ke vendor untuk perbaikan data.";
                                        iconNode = <RefreshCw className="h-3.5 w-3.5" />;
                                        break;
                                    case "REJECT":
                                        title = "Invoice Ditolak (Rejected)";
                                        desc = "Dokumen invoice ditolak oleh pemeriksa karena tidak sesuai ketentuan.";
                                        iconNode = <X className="h-3.5 w-3.5" />;
                                        break;
                                    default:
                                        title = log.action;
                                        desc = "Aktivitas tercatat oleh sistem.";
                                        iconNode = <FileText className="h-3.5 w-3.5" />;
                                        break;
                                }

                                // Apply Grey coloring for all past steps
                                iconBg = "bg-slate-100 dark:bg-slate-800";
                                iconColor = "text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700";`;

content = content.replace(switchRegex, newSwitch);

fs.writeFileSync(path, content);
console.log('Timeline updated successfully.');
