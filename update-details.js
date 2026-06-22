const fs = require('fs');
const file = 'app/dashboard/invoice-hub/details/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
    'import { getInvoiceById } from "../../actions";',
    'import { getInvoiceById, submitShippingConfirmation, confirmPhysicalReceipt, financeApprove, financeRevision } from "../../actions";'
);
content = content.replace(
    'import { Input } from "@/components/ui/input";',
    'import { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";\nimport { Textarea } from "@/components/ui/textarea";'
);
if (!content.includes('import { Input }')) {
    content = content.replace(
        'import { Button } from "@/components/ui/button";',
        'import { Button } from "@/components/ui/button";\nimport { Input } from "@/components/ui/input";\nimport { Label } from "@/components/ui/label";\nimport { Textarea } from "@/components/ui/textarea";'
    );
}

// 2. InvoiceDetail interface
content = content.replace(
    '    auditLogs: AuditLogItem[];',
    '    auditLogs: AuditLogItem[];\n    financeNotes?: string | null;\n    shippingDetails?: any;\n    grDetails?: any;'
);

// 3. States and Handlers inside InvoiceDetailsPage
const stateInjectionPoint = '    const [activeOcrTab, setActiveOcrTab] = useState<string>("");';
const newLogic = `
    const [resiFile, setResiFile] = useState<File | null>(null);
    const [resiNumber, setResiNumber] = useState("");
    const [resiDate, setResiDate] = useState("");
    const [resiCourier, setResiCourier] = useState("");
    const [isSubmittingResi, setIsSubmittingResi] = useState(false);
    
    const [isProcurementConfirming, setIsProcurementConfirming] = useState(false);
    
    const [financeNotesInput, setFinanceNotesInput] = useState("");
    const [isFinanceSubmitting, setIsFinanceSubmitting] = useState(false);

    const handleVendorSubmitResi = async () => {
        if (!resiNumber || !resiDate || !resiCourier) {
            setErrorMsg("Harap isi semua data pengiriman.");
            return;
        }
        setIsSubmittingResi(true);
        const mockFileUrl = "https://example.com/resi-mock.pdf";
        const result = await submitShippingConfirmation(invoiceId, {
            resiNumber, resiDate, resiCourier, resiFileUrl: mockFileUrl
        });
        setIsSubmittingResi(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleProcurementConfirmReceipt = async () => {
        setIsProcurementConfirming(true);
        const result = await confirmPhysicalReceipt(invoiceId);
        setIsProcurementConfirming(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleFinanceApprove = async () => {
        setIsFinanceSubmitting(true);
        const result = await financeApprove(invoiceId);
        setIsFinanceSubmitting(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };

    const handleFinanceReject = async () => {
        if (!financeNotesInput) {
            setErrorMsg("Harap isi catatan revisi keuangan.");
            return;
        }
        setIsFinanceSubmitting(true);
        const result = await financeRevision(invoiceId, financeNotesInput);
        setIsFinanceSubmitting(false);
        if (result.success) loadInvoiceData();
        else setErrorMsg(result.error);
    };
`;
content = content.replace(stateInjectionPoint, stateInjectionPoint + '\n' + newLogic);

// 4. UI Injection after Status Summary Banner
const uiInjectionPoint = '{/* Finance Revision Comment Alert */}';
const newUI = `
            {/* VENDOR UI: Submit Resi */}
            {role === "vendor" && invoice.status === "Procurement Verified" && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-800 dark:text-blue-400">
                        <UploadCloud className="h-4.5 w-4.5" />
                        <span>Konfirmasi Pengiriman Dokumen Fisik</span>
                    </div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Tagihan telah diverifikasi Procurement. Harap kirim dokumen fisik ke kantor Chitra Pratama BPN dan masukkan detail resi pengiriman di bawah ini.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-blue-900 dark:text-blue-200">Nomor Resi</Label>
                            <Input className="text-xs h-8" value={resiNumber} onChange={(e) => setResiNumber(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-blue-900 dark:text-blue-200">Tanggal Pengiriman</Label>
                            <Input type="date" className="text-xs h-8" value={resiDate} onChange={(e) => setResiDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-blue-900 dark:text-blue-200">Armada Pengiriman</Label>
                            <Input className="text-xs h-8" placeholder="Misal: JNE, TIKI, Kurir Internal" value={resiCourier} onChange={(e) => setResiCourier(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-blue-900 dark:text-blue-200">Lampiran Resi</Label>
                            <Input type="file" className="text-xs h-8" onChange={(e) => setResiFile(e.target.files?.[0] || null)} />
                        </div>
                    </div>
                    <Button onClick={handleVendorSubmitResi} disabled={isSubmittingResi} className="mt-2 w-full sm:w-auto self-end bg-blue-600 hover:bg-blue-700 text-xs h-8">
                        {isSubmittingResi ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Check className="h-3 w-3 mr-2" />}
                        Kirim Konfirmasi Pengiriman
                    </Button>
                </div>
            )}

            {/* PROCUREMENT UI: Confirm Receipt */}
            {role === "procurement" && invoice.status === "Document in Transit" && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-400">
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        <span>Konfirmasi Penerimaan Dokumen Fisik</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300">Vendor telah mengirim dokumen fisik dengan resi: <strong>{invoice.shippingDetails?.resiNumber}</strong> ({invoice.shippingDetails?.resiCourier}). Klik tombol di bawah jika dokumen fisik telah Anda terima dan diserahkan ke Finance.</p>
                    <Button onClick={handleProcurementConfirmReceipt} disabled={isProcurementConfirming} className="mt-2 w-full sm:w-auto self-end bg-amber-600 hover:bg-amber-700 text-xs h-8">
                        {isProcurementConfirming ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <FileText className="h-3 w-3 mr-2" />}
                        Konfirmasi Dokumen Diterima
                    </Button>
                </div>
            )}

            {/* FINANCE UI: Approve / Reject Physical Document */}
            {role === "finance" && invoice.status === "In Finance Verification" && (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                        <FileText className="h-4.5 w-4.5" />
                        <span>Verifikasi Dokumen Fisik (Offline)</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Harap periksa fisik dokumen yang diserahkan Procurement. Jika sesuai, setujui pembayaran. Jika ada masalah, tolak dan kembalikan.</p>
                    <Textarea 
                        placeholder="Catatan revisi (wajib diisi jika menolak)..." 
                        className="text-xs min-h-[80px]"
                        value={financeNotesInput}
                        onChange={(e) => setFinanceNotesInput(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={handleFinanceReject} disabled={isFinanceSubmitting} className="text-xs h-8 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                            Tolak & Minta Revisi
                        </Button>
                        <Button onClick={handleFinanceApprove} disabled={isFinanceSubmitting} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
                            Setujui & Tandai Siap Bayar
                        </Button>
                    </div>
                </div>
            )}

`;
content = content.replace(uiInjectionPoint, newUI + '\n            ' + uiInjectionPoint);

// 5. Update Finance Revision logic
const finRevOriginal = `            {/* Finance Revision Comment Alert */}
            {(() => {
                const finRev = invoice.verifications.find(v => v.section === "finance_revision");
                if (finRev && finRev.comments) {
                    return (`;
const finRevNew = `            {/* Finance Revision Comment Alert */}
            {(() => {
                const finRev = invoice.verifications.find(v => v.section === "finance_revision");
                const notes = invoice.financeNotes || (finRev ? finRev.comments : null);
                if (invoice.status === "Needs Revision" && notes) {
                    return (`;
content = content.replace(finRevOriginal, finRevNew);

fs.writeFileSync(file, content);
console.log('Details page updated successfully');
