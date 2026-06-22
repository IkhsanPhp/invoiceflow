const fs = require('fs');
const file = 'app/dashboard/invoice-hub/verify/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update handleVerifySubmit
const handleVerifyStart = 'const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {';
const handleVerifyEnd = '    };';
const oldHandleVerifyLogic = `    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        if (decision === "Verified") {
            setOpenGRModal(true);
            return;
        }
        await executeVerifySubmit(decision);
    };`;

const newHandleVerifyLogic = `    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        if (decision === "Verified") {
            // Auto-populate GR Modal fields from OCR Result
            try {
                if (invoice && Array.isArray(invoice.ocrResults) && invoice.ocrResults.length > 0) {
                    const extracted = invoice.ocrResults[0]?.extractedData || {};
                    const docs = extracted.documents || [];
                    
                    const invData = docs.find((d: any) => d.type === 'invoice')?.data || extracted || {};
                    const poData = docs.find((d: any) => d.type === 'purchase_order' || d.type === 'po')?.data || {};
                    const doData = docs.find((d: any) => d.type === 'delivery_order' || d.type === 'do' || d.type === 'surat_jalan')?.data || {};
                    
                    const getField = (field: string) => invData[field] || poData[field] || doData[field] || "";
                    
                    setGrPoNumber(getField("poNumber") || getField("purchaseOrderNumber") || "");
                    setGrPoDate(getField("poDate") || getField("purchaseOrderDate") || "");
                    setGrDoNumber(getField("doNumber") || getField("suratJalanNumber") || "");
                    setGrDoDate(getField("doDate") || getField("suratJalanDate") || "");
                    setGrReceivedDate(getField("receivedDate") || getField("tglTerimaTtd") || "");
                    setGrDoSignatureDate(getField("signatureDate") || getField("tglTtdSj") || "");
                }
            } catch(e) {
                console.error("Failed to auto-populate GR modal from OCR data:", e);
            }

            setOpenGRModal(true);
            return;
        }
        await executeVerifySubmit(decision);
    };`;

content = content.replace(oldHandleVerifyLogic, newHandleVerifyLogic);

// 2. Make Inputs readOnly
const readOnlyClass = `readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80"`;
const normalInput = `className="col-span-3 text-xs"`;
const normalInputDate = `className="col-span-3 text-xs"`;

content = content.replace(/<Input className="col-span-3 text-xs"/g, `<Input ${readOnlyClass}`);
content = content.replace(/<Input type="date" className="col-span-3 text-xs"/g, `<Input type="date" ${readOnlyClass}`);

fs.writeFileSync(file, content);
console.log('Done updating GR Modal for auto-population and readonly fields.');
