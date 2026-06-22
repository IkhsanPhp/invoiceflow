const fs = require('fs');
const file = 'app/dashboard/invoice-hub/verify/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add imports
content = content.replace(
    'import { getInvoiceById, submitVerificationAndOCRCorrection, updateOcrResults } from "../../actions";',
    'import { getInvoiceById, submitVerificationAndOCRCorrection, updateOcrResults, submitGRCheck } from "../../actions";\nimport { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";'
);

// 2. Add states
const stateInjectionPoint = 'const [financeComment, setFinanceComment] = useState("");';
const statesToAdd = `
    const [openGRModal, setOpenGRModal] = useState(false);
    const [grPoNumber, setGrPoNumber] = useState("");
    const [grPoDate, setGrPoDate] = useState("");
    const [grDoNumber, setGrDoNumber] = useState("");
    const [grDoDate, setGrDoDate] = useState("");
    const [grReceivedDate, setGrReceivedDate] = useState("");
    const [grDoSignatureDate, setGrDoSignatureDate] = useState("");
    const [grSupplyStatus, setGrSupplyStatus] = useState("Full Supply");
`;
content = content.replace(stateInjectionPoint, stateInjectionPoint + '\n' + statesToAdd);

// 3. Modify handleVerifySubmit
const handleVerifySubmitOriginal = `    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        setSavingVerification(true);
        setErrorMsg(null);

        try {`;

const handleVerifySubmitNew = `    const executeVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected", skipRedirect: boolean = false) => {
        setSavingVerification(true);
        setErrorMsg(null);

        try {`;

content = content.replace(handleVerifySubmitOriginal, handleVerifySubmitNew);

// Replace the router.push inside the modified executeVerifySubmit
const routerPushOriginal = `            if (result.success) {
                router.push("/dashboard/invoice-hub");
            } else {
                setErrorMsg(result.error || "Gagal menyelesaikan verifikasi.");
                setSavingVerification(false);
            }`;

const routerPushNew = `            if (result.success) {
                if (!skipRedirect) router.push("/dashboard/invoice-hub");
                return result;
            } else {
                setErrorMsg(result.error || "Gagal menyelesaikan verifikasi.");
                setSavingVerification(false);
                return result;
            }`;

content = content.replace(routerPushOriginal, routerPushNew);

// Now add the new handleVerifySubmit and handleFinalizeGR right after executeVerifySubmit ends
// The end of executeVerifySubmit is around catch block
const executeEndOriginal = `        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan audit.");
            setSavingVerification(false);
        }
    };`;

const executeEndNew = `        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan audit.");
            setSavingVerification(false);
            return { success: false };
        }
    };

    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        if (decision === "Verified") {
            setOpenGRModal(true);
            return;
        }
        await executeVerifySubmit(decision);
    };

    const handleFinalizeGR = async () => {
        if (!invoice) return;
        setSavingVerification(true);
        const result = await executeVerifySubmit("Verified", true);
        if (result && result.success) {
            const grResult = await submitGRCheck(invoice.id, {
                poNumber: grPoNumber,
                poDate: grPoDate,
                doNumber: grDoNumber,
                doDate: grDoDate,
                receivedDate: grReceivedDate,
                doSignatureDate: grDoSignatureDate,
                supplyStatus: grSupplyStatus
            });
            if (grResult.success) {
                router.push("/dashboard/invoice-hub");
            } else {
                setErrorMsg(grResult.error || "Gagal menyimpan data GR.");
                setSavingVerification(false);
            }
        }
    };`;

content = content.replace(executeEndOriginal, executeEndNew);

// 4. Add Dialog UI at the end of the component
const returnEndOriginal = `        </div>
    );
}`;

const returnEndNew = `
            {/* GR Modal */}
            <Dialog open={openGRModal} onOpenChange={setOpenGRModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Verifikasi Penerimaan Barang (GR)</DialogTitle>
                        <DialogDescription>
                            Pastikan item sudah di-GR. Isi detail berikut sesuai surat jalan dan bukti fisik.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">No PO</Label>
                            <Input className="col-span-3 text-xs" value={grPoNumber} onChange={(e) => setGrPoNumber(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl PO</Label>
                            <Input type="date" className="col-span-3 text-xs" value={grPoDate} onChange={(e) => setGrPoDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">No Surat Jalan</Label>
                            <Input className="col-span-3 text-xs" value={grDoNumber} onChange={(e) => setGrDoNumber(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl Surat Jalan</Label>
                            <Input type="date" className="col-span-3 text-xs" value={grDoDate} onChange={(e) => setGrDoDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl Terima TTD</Label>
                            <Input type="date" className="col-span-3 text-xs" value={grReceivedDate} onChange={(e) => setGrReceivedDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl TTD SJ</Label>
                            <Input type="date" className="col-span-3 text-xs" value={grDoSignatureDate} onChange={(e) => setGrDoSignatureDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Status Supply</Label>
                            <select 
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background"
                                value={grSupplyStatus} 
                                onChange={(e) => setGrSupplyStatus(e.target.value)}>
                                <option>Full Supply</option>
                                <option>Partial Supply</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenGRModal(false)}>Batal</Button>
                        <Button onClick={handleFinalizeGR} disabled={savingVerification}>
                            {savingVerification ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Konfirmasi & Verifikasi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}`;

content = content.replace(returnEndOriginal, returnEndNew);

fs.writeFileSync(file, content);
console.log('Verify page updated successfully');
