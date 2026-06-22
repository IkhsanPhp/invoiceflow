const fs = require('fs');
const file = 'components/site-header.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add `status: status, ` to every notifs.push
// We will do a generic regex replace for notifs.push({
content = content.replace(/notifs\.push\(\{ id: i\.id, type:/g, 'notifs.push({ id: i.id, status: status, type:');

// 2. Replace the select dropdown for filterType
const selectStart = '<select \n                  className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 flex-1 font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"\n                  value={filterType}\n                  onChange={e => setFilterType(e.target.value)}\n                >';
const selectEnd = '</select>';
const newSelect = `<select 
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
                      <option value="In Review">Siap Diaudit</option>
                      <option value="Needs Finance Revision">Revisi Finance</option>
                      <option value="Document in Transit">Dokumen Fisik Datang</option>
                    </>
                  ) : role === "finance" ? (
                    <option value="In Finance Verification">Verifikasi Fisik</option>
                  ) : null}
                </select>`;

let idxStart = content.indexOf('<select');
let idxOptions = content.indexOf('<option value="all">Semua Tipe</option>', idxStart);
let idxEndSelect = content.indexOf('</select>', idxOptions);

if (idxStart !== -1 && idxOptions !== -1) {
    // Find the exact <select> block
    let prefix = content.substring(0, idxStart);
    // Find the start of the first select for filterType by looking backwards from idxOptions for '<select'
    let actualStart = content.lastIndexOf('<select', idxOptions);
    let suffix = content.substring(idxEndSelect + '</select>'.length);
    content = content.substring(0, actualStart) + newSelect + suffix;
}

// 3. Update the filter logic
const oldFilter = 'filtered = filtered.filter(n => n.type === filterType);';
const newFilter = 'filtered = filtered.filter(n => n.status === filterType);';
content = content.replace(oldFilter, newFilter);

fs.writeFileSync(file, content);
console.log('Done updating filter options for status.');
