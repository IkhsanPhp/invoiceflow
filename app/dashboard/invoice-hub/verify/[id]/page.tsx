"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { getInvoiceById, submitVerificationAndOCRCorrection, updateOcrResults, submitGRCheck } from "../../actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    Loader2, 
    ShieldAlert, 
    FileText, 
    CheckCircle2, 
    TrendingUp, 
    AlertTriangle,
    Check,
    X,
    FileCheck,
    Clock,
    AlertCircle,
    ArrowLeft,
    ExternalLink,
    RefreshCw,
    Edit2
} from "lucide-react";
import Link from "next/link";

interface DocItem {
    id: string;
    invoiceId: string;
    docType: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: Date;
}

interface VerificationItem {
    id: string;
    invoiceId: string;
    section: string;
    passed: boolean;
    comments: string | null;
    checkedBy: string;
    checkedAt: Date;
}

interface OcrDocumentItem {
    description: string | null;
    quantity: number | null;
    unit: string | null;
    unitPrice: string | null;
    totalPrice: string | null;
}

interface OcrDocument {
    id: string;
    type: "invoice" | "tax_invoice" | "delivery_order" | "po";
    pages: number[];
    data: {
        invoiceNumber?: string | null;
        taxInvoiceNumber?: string | null;
        issueDate?: string | null;
        dueDate?: string | null;
        totalAmount?: string | null;
        vendorName?: string | null;
        customerName?: string | null;
        doNumber?: string | null;
        deliveryDate?: string | null;
        poNumber?: string | null;
        recipientName?: string | null;
        poDate?: string | null;
        buyerName?: string | null;
        discount?: string | null;
        ppnPercent?: string | null;
        grandTotal?: string | null;
        bankName?: string | null;
        bankAccount?: string | null;
    };
    fields?: { key: string; label: string; value: string | null }[];
    items?: OcrDocumentItem[];
}

interface OcrResultItem {
    id: string;
    documentId: string;
    extractedData: {
        documents: OcrDocument[];
    } | null;
    processedAt: Date;
}

interface InvoiceDetail {
    id: string;
    vendorId: string;
    invoiceNumber: string;
    taxInvoiceNumber: string | null;
    issueDate: Date | null;
    dueDate: Date | null;
    totalAmount: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    vendorName: string | null;
    vendorEmail: string | null;
    termsOfPayment: string | null;
    documents: DocItem[];
    verifications: VerificationItem[];
    ocrResults?: OcrResultItem[];
}

type PointStatus = "pass" | "revision" | "pending";

export default function VerifyInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.id as string;
    const { data: session, isPending: sessionPending } = useSession();

    const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [savingVerification, setSavingVerification] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState("");

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setIsEditMode(params.get('mode') === 'edit');
        }
    }, []);

    // Form inputs
    const [verifyInvoiceNo, setVerifyInvoiceNo] = useState("");
    const [verifyTaxInvoiceNo, setVerifyTaxInvoiceNo] = useState("");
    const [verifyIssueDate, setVerifyIssueDate] = useState("");
    const [verifyDueDate, setVerifyDueDate] = useState("");
    const [verifyTotal, setVerifyTotal] = useState("");

    // OCR Multi-Document Edit States
    const [ocrDocs, setOcrDocs] = useState<OcrDocument[]>([]);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editingFields, setEditingFields] = useState<Record<string, string>>({});
    const [editingItems, setEditingItems] = useState<OcrDocumentItem[]>([]);
    const [savingDocId, setSavingDocId] = useState<string | null>(null);
    const [saveSuccessDocId, setSaveSuccessDocId] = useState<string | null>(null);

    const [activeOcrTab, setActiveOcrTab] = useState<string>("");

    // Checklist Point-Specific State
    const [statusA, setStatusA] = useState<PointStatus>("pending");
    const [statusB, setStatusB] = useState<PointStatus>("pending");
    const [statusC, setStatusC] = useState<PointStatus>("pending");
    const [statusD, setStatusD] = useState<PointStatus>("pending");
    const [statusE, setStatusE] = useState<PointStatus>("pending");

    const [commentA, setCommentA] = useState("");
    const [commentB, setCommentB] = useState("");
    const [commentC, setCommentC] = useState("");
    const [commentD, setCommentD] = useState("");
    const [commentE, setCommentE] = useState("");

    const [verifyComments, setVerifyComments] = useState("");
    const [financeComment, setFinanceComment] = useState("");

    const [openGRModal, setOpenGRModal] = useState(false);
    const [grPoNumber, setGrPoNumber] = useState("");
    const [grPoDate, setGrPoDate] = useState("");
    const [grDoNumber, setGrDoNumber] = useState("");
    const [grDoDate, setGrDoDate] = useState("");
    const [grTtdKeterangan, setGrTtdKeterangan] = useState("Sesuai");
    
    const [grSupplyStatus, setGrSupplyStatus] = useState("Full Supply");


    const handleStartEdit = (doc: OcrDocument) => {
        setEditingDocId(doc.id);
        const fields: Record<string, string> = {};
        
        // Use fields array if exists, otherwise generate from data keys
        const docFields = doc.fields || [];
        if (docFields.length > 0) {
            docFields.forEach(f => {
                fields[f.key] = f.value || "";
            });
        } else {
            Object.entries(doc.data).forEach(([key, val]) => {
                fields[key] = val ? String(val) : "";
            });
        }
        
        setEditingFields(fields);
        setEditingItems(doc.items ? JSON.parse(JSON.stringify(doc.items)) : []);
    };

    const handleCancelEdit = () => {
        setEditingDocId(null);
        setEditingFields({});
        setEditingItems([]);
    };

    const handleFieldChange = (key: string, value: string) => {
        setEditingFields(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveDocOcr = async (docId: string) => {
        if (!invoice) return;
        setSavingDocId(docId);
        try {
            const updatedDocs = ocrDocs.map(d => {
                if (d.id === docId) {
                    const newData: Record<string, string | null> = {};
                    
                    // First populate based on all data keys
                    Object.keys(d.data).forEach(key => {
                        const val = editingFields[key];
                        newData[key] = val !== undefined ? (val.trim() === "" ? null : val) : null;
                    });
                    
                    // Add newly introduced editing fields
                    Object.keys(editingFields).forEach(key => {
                        if (editingFields[key] !== undefined) {
                            newData[key] = editingFields[key].trim() === "" ? null : editingFields[key];
                        }
                    });

                    // Build fields list
                    const originalFields = d.fields || [];
                    let newFields = originalFields.map(f => ({
                        ...f,
                        value: editingFields[f.key] !== undefined ? editingFields[f.key] : f.value
                    }));

                    // If it was empty, construct it from data
                    if (newFields.length === 0) {
                        newFields = Object.keys(newData).map(key => {
                            let label = key;
                            if (key === "invoiceNumber") label = "Nomor Invoice";
                            else if (key === "taxInvoiceNumber") label = "Nomor Faktur Pajak";
                            else if (key === "issueDate") label = "Tanggal Terbit";
                            else if (key === "dueDate") label = "Jatuh Tempo";
                            else if (key === "totalAmount") label = "Total Invoice";
                            else if (key === "vendorName") label = "Nama Vendor";
                            else if (key === "customerName") label = "Nama Customer";
                            else if (key === "discount") label = "Diskon";
                            else if (key === "ppnPercent") label = "PPN (%)";
                            else if (key === "grandTotal") label = "Grand Total";
                            else if (key === "bankName") label = "Nama Bank";
                            else if (key === "bankAccount") label = "Rekening Bank";
                            return { key, label, value: newData[key] };
                        });
                    }

                    // Sync totals from items if edited

                    return {
                        ...d,
                        data: newData as typeof d.data,
                        fields: newFields,
                        items: editingItems
                    };
                }
                return d;
            });

            const result = await updateOcrResults(invoice.id, { documents: updatedDocs });
            if (result.success) {
                setOcrDocs(updatedDocs);
                setEditingDocId(null);
                setEditingFields({});
                setSaveSuccessDocId(docId);
                setTimeout(() => {
                    setSaveSuccessDocId(null);
                }, 2000);

                const savedDoc = updatedDocs.find(d => d.id === docId);
                if (savedDoc && savedDoc.type === "invoice") {
                    if (savedDoc.data.invoiceNumber) setVerifyInvoiceNo(savedDoc.data.invoiceNumber);
                    if (savedDoc.data.taxInvoiceNumber) setVerifyTaxInvoiceNo(savedDoc.data.taxInvoiceNumber);
                    if (savedDoc.data.issueDate) setVerifyIssueDate(savedDoc.data.issueDate);
                    if (savedDoc.data.dueDate) setVerifyDueDate(savedDoc.data.dueDate);
                    if (savedDoc.data.totalAmount) setVerifyTotal(savedDoc.data.totalAmount);
                }
            } else {
                setErrorMsg(result.error || "Gagal memperbarui hasil OCR.");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan data.";
            setErrorMsg(msg);
        } finally {
            setSavingDocId(null);
        }
    };

    const generateAutoRecommendations = (docs: OcrDocument[], inv: InvoiceDetail, getISODateStr: (d: Date | null) => string) => {
        const recs = {
            A: { status: "pending" as PointStatus, comment: "" },
            B: { status: "pending" as PointStatus, comment: "" },
            C: { status: "pending" as PointStatus, comment: "" },
            D: { status: "pending" as PointStatus, comment: "" },
            E: { status: "pending" as PointStatus, comment: "" },
        };

        const invoiceDoc = docs.find(d => d.type === "invoice");
        const taxInvoiceDoc = docs.find(d => d.type === "tax_invoice");
        const doDoc = docs.find(d => d.type === "delivery_order");
        const poDoc = docs.find(d => d.type === "po");

        const norm = (s: string | null | undefined) => {
            if (!s) return "";
            return s.toLowerCase().replace(/^(pt|cv|toko|ud|grup)\.?\s+/gi, "").replace(/\s+/g, "").trim();
        };

        // -------------------------------------------------------------
        // POINT A: Kelengkapan Berkas Dokumen
        // -------------------------------------------------------------
        const missingDocs: string[] = [];
        if (!invoiceDoc) missingDocs.push("Invoice");
        if (!poDoc) missingDocs.push("PO");
        if (!doDoc) missingDocs.push("DO / Surat Jalan");

        const hasPpn = (inv.taxInvoiceNumber && inv.taxInvoiceNumber.trim() !== "") || 
                        (invoiceDoc?.data?.ppnPercent && parseFloat(String(invoiceDoc.data.ppnPercent)) > 0) ||
                        (invoiceDoc?.data?.taxInvoiceNumber && invoiceDoc.data.taxInvoiceNumber.trim() !== "");
                        
        if (hasPpn && !taxInvoiceDoc) {
            missingDocs.push("Faktur Pajak");
        }

        if (missingDocs.length > 0) {
            recs.A.status = "revision";
            recs.A.comment = `Berkas tidak lengkap. ${missingDocs.join(", ")} wajib dilampirkan.`;
        } else {
            recs.A.status = "pass";
            recs.A.comment = "Berkas lengkap.";
        }

        // -------------------------------------------------------------
        // POINT B: Validasi Rekening / NPWP (Pencocokan nama supplier)
        // -------------------------------------------------------------
        const issuesB: string[] = [];
        const masterVendorName = norm(inv.vendorName);
        const invoiceVendorName = norm(invoiceDoc?.data?.vendorName);
        const poVendorName = norm(poDoc?.data?.vendorName);

        if (invoiceDoc && invoiceVendorName && masterVendorName && !invoiceVendorName.includes(masterVendorName) && !masterVendorName.includes(invoiceVendorName)) {
            issuesB.push(`Nama vendor di Invoice (${invoiceDoc.data.vendorName}) tidak sesuai data master (${inv.vendorName})`);
        }
        if (poDoc && poVendorName && masterVendorName && !poVendorName.includes(masterVendorName) && !masterVendorName.includes(poVendorName)) {
            issuesB.push(`Nama vendor di PO (${poDoc.data.vendorName}) tidak sesuai data master (${inv.vendorName})`);
        }
        if (invoiceDoc && poDoc && invoiceVendorName && poVendorName && !invoiceVendorName.includes(poVendorName) && !poVendorName.includes(invoiceVendorName)) {
            issuesB.push(`Nama vendor di Invoice (${invoiceDoc.data.vendorName}) berbeda dengan di PO (${poDoc.data.vendorName})`);
        }

        if (issuesB.length > 0) {
            recs.B.status = "revision";
            recs.B.comment = issuesB.join(". ") + ".";
        } else {
            recs.B.status = "pass";
            recs.B.comment = "Pencocokan nama supplier valid.";
        }

        // -------------------------------------------------------------
        // POINT C: Pencocokan Item barang & PO
        // -------------------------------------------------------------
        const issuesC: string[] = [];
        let isParsial = false;

        if (!poDoc) {
            issuesC.push("Dokumen PO tidak terlampir untuk pencocokan item");
        } else {
            const invoiceItems = invoiceDoc?.items || [];
            const poItems = poDoc.items || [];
            const doItems = doDoc?.items || [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getQtyMap = (items: any[]) => {
                const map = new Map<string, { qty: number; price: number }>();
                items.forEach(it => {
                    const descNorm = norm(it.description);
                    if (descNorm) {
                        const current = map.get(descNorm) || { qty: 0, price: 0 };
                        const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity || 0));
                        const p = typeof it.unitPrice === 'number' ? it.unitPrice : parseFloat(String(it.unitPrice || 0).replace(/[^\d.]/g, ""));
                        map.set(descNorm, { qty: current.qty + (isNaN(q) ? 0 : q), price: isNaN(p) ? 0 : p });
                    }
                });
                return map;
            };

            const invQtyMap = getQtyMap(invoiceItems);
            const poQtyMap = getQtyMap(poItems);
            const doQtyMap = getQtyMap(doItems);

            invQtyMap.forEach((val, key) => {
                const poVal = poQtyMap.get(key);
                if (!poVal) {
                    issuesC.push(`Item tidak ditemukan di PO: ${key.slice(0, 30)}...`);
                } else {
                    if (val.price > 0 && poVal.price > 0 && Math.abs(val.price - poVal.price) > 10) {
                        issuesC.push(`Harga satuan berbeda untuk item: ${key.slice(0, 20)}... (Invoice: ${val.price}, PO: ${poVal.price})`);
                    }
                    if (val.qty > poVal.qty) {
                        issuesC.push(`Kuantitas di Invoice (${val.qty}) melebihi PO (${poVal.qty})`);
                    } else if (val.qty < poVal.qty) {
                        isParsial = true;
                    }
                }
            });

            if (doDoc) {
                invQtyMap.forEach((val, key) => {
                    const doVal = doQtyMap.get(key);
                    if (doVal && val.qty > doVal.qty) {
                        issuesC.push(`Kuantitas di Invoice (${val.qty}) melebihi DO (${doVal.qty})`);
                    }
                });
            }
        }

        // Periksa tanda tangan, stempel, dan tanggal stempel pada DO jika tersedia
        if (doDoc && doDoc.data) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { hasSignature, hasStamp, stampDate, deliveryDate } = doDoc.data as any;
            const doDateStr = deliveryDate || doDoc.data.deliveryDate;
            const invDateStr = invoiceDoc?.data?.issueDate || getISODateStr(inv.issueDate);
            
            if (hasSignature === "no") {
                issuesC.push("DO/Surat Jalan tidak ditandatangani");
            }
            if (hasStamp === "no") {
                issuesC.push("DO/Surat Jalan tidak memiliki stempel");
            }

            if (stampDate && doDateStr) {
                try {
                    const stamp = new Date(stampDate);
                    const dOrder = new Date(doDateStr);
                    const invDate = invDateStr ? new Date(invDateStr) : null;

                    if (stamp < dOrder) {
                        issuesC.push(`Tanggal stempel (${stampDate}) mendahului tanggal Surat Jalan (${doDateStr})`);
                    }
                    if (invDate && stamp > invDate) {
                        issuesC.push(`Tanggal stempel (${stampDate}) melebihi tanggal Invoice (${invDateStr})`);
                    }
                } catch {
                    // Ignore date parsing error
                }
            }
        }

        if (issuesC.length > 0) {
            recs.C.status = "revision";
            recs.C.comment = issuesC.join(". ") + ".";
        } else if (isParsial) {
            recs.C.status = "pass";
            recs.C.comment = "Rekomendasi: Parsial (Kuantitas item di PO lebih banyak daripada Invoice).";
        } else {
            recs.C.status = "pass";
            recs.C.comment = "Kesesuaian qty & harga barang valid.";
        }

        // -------------------------------------------------------------
        // POINT D: Validasi e-Faktur PPN
        // -------------------------------------------------------------
        const issuesD: string[] = [];
        if (hasPpn) {
            if (!taxInvoiceDoc) {
                issuesD.push("Faktur Pajak wajib dilampirkan untuk transaksi PPN");
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const getFloatVal = (val: any) => {
                    if (!val) return 0;
                    return parseFloat(String(val).replace(/[^\d.]/g, ""));
                };
                const ocrInvoicePpn = getFloatVal(invoiceDoc?.data?.ppnPercent);
                const taxInvoicePpn = getFloatVal(taxInvoiceDoc.data.ppnPercent);
                
                if (ocrInvoicePpn > 0 && taxInvoicePpn > 0 && ocrInvoicePpn !== taxInvoicePpn) {
                    issuesD.push(`Tarif PPN di Invoice (${ocrInvoicePpn}%) tidak sesuai e-Faktur (${taxInvoicePpn}%)`);
                }
                
                const ocrTaxNum = taxInvoiceDoc.data.taxInvoiceNumber?.replace(/\D/g, "");
                const invTaxNum = invoiceDoc?.data?.taxInvoiceNumber?.replace(/\D/g, "") || inv.taxInvoiceNumber?.replace(/\D/g, "");
                if (ocrTaxNum && invTaxNum && !ocrTaxNum.includes(invTaxNum) && !invTaxNum.includes(ocrTaxNum)) {
                    issuesD.push(`Nomor Seri Faktur Pajak (${taxInvoiceDoc.data.taxInvoiceNumber}) berbeda dengan deklarasi/invoice`);
                }
            }
        }

        if (issuesD.length > 0) {
            recs.D.status = "revision";
            recs.D.comment = issuesD.join(". ") + ".";
        } else {
            recs.D.status = "pass";
            recs.D.comment = "Faktur pajak PPN valid.";
        }

        // -------------------------------------------------------------
        // POINT E: Perhitungan Finansial
        // -------------------------------------------------------------
        const issuesE: string[] = [];
        if (invoiceDoc) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getSumQty = (items: any[]) => {
                return items.reduce((sum, it) => {
                    const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity || 0));
                    return sum + (isNaN(q) ? 0 : q);
                }, 0);
            };

            const invoiceTotalQty = getSumQty(invoiceDoc.items || []);
            if (doDoc) {
                const doTotalQty = getSumQty(doDoc.items || []);
                if (invoiceTotalQty > 0 && doTotalQty > 0 && invoiceTotalQty !== doTotalQty) {
                    issuesE.push(`Total kuantitas barang di Invoice (${invoiceTotalQty}) tidak sesuai dengan Surat Jalan/DO (${doTotalQty})`);
                }
            }

            const invoiceItems = invoiceDoc.items || [];
            let mathOk = true;
            invoiceItems.forEach(it => {
                const q = typeof it.quantity === 'number' ? it.quantity : parseFloat(String(it.quantity || 0));
                const p = typeof it.unitPrice === 'number' ? it.unitPrice : parseFloat(String(it.unitPrice || 0).replace(/[^\d.]/g, ""));
                const t = typeof it.totalPrice === 'number' ? it.totalPrice : parseFloat(String(it.totalPrice || 0).replace(/[^\d.]/g, ""));
                if (!isNaN(q) && !isNaN(p) && !isNaN(t) && q > 0 && p > 0 && t > 0) {
                    if (Math.abs((q * p) - t) > 10) {
                        mathOk = false;
                    }
                }
            });
            if (!mathOk) {
                issuesE.push("Akurasi perkalian total item (Qty * Harga Satuan) tidak sesuai");
            }
        }

        if (issuesE.length > 0) {
            recs.E.status = "revision";
            recs.E.comment = issuesE.join(". ") + ".";
        } else {
            recs.E.status = "pass";
            recs.E.comment = "Perhitungan finansial akurat.";
        }

        return recs;
    };

    const loadInvoiceData = async () => {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await getInvoiceById(invoiceId);
            if (res.success && res.invoice) {
                const inv = res.invoice as InvoiceDetail;
                setInvoice(inv);

                const getISODateStr = (d: Date | null) => {
                    if (!d) return "";
                    return new Date(d).toISOString().split("T")[0];
                };

                let docsList: OcrDocument[] = inv.ocrResults?.[0]?.extractedData?.documents || [];
                if (docsList.length === 0) {
                    docsList = [
                        {
                            id: "doc-1",
                            type: "invoice",
                            pages: [1],
                            data: {
                                invoiceNumber: inv.invoiceNumber,
                                taxInvoiceNumber: inv.taxInvoiceNumber || null,
                                issueDate: getISODateStr(inv.issueDate),
                                dueDate: getISODateStr(inv.dueDate),
                                totalAmount: inv.totalAmount,
                                vendorName: inv.vendorName,
                            }
                        }
                    ];
                }
                setOcrDocs(docsList);
                if (docsList.length > 0) {
                    setActiveOcrTab(docsList[0].id);
                }

                const invoiceDoc = docsList.find(d => d.type === "invoice");
                if (invoiceDoc && invoiceDoc.data) {
                    setVerifyInvoiceNo(invoiceDoc.data.invoiceNumber || inv.invoiceNumber);
                    setVerifyTaxInvoiceNo(invoiceDoc.data.taxInvoiceNumber || inv.taxInvoiceNumber || "");
                    setVerifyIssueDate(invoiceDoc.data.issueDate || getISODateStr(inv.issueDate));
                    setVerifyDueDate(invoiceDoc.data.dueDate || getISODateStr(inv.dueDate));
                    setVerifyTotal(invoiceDoc.data.totalAmount || inv.totalAmount || "0");
                } else {
                    setVerifyInvoiceNo(inv.invoiceNumber);
                    setVerifyTaxInvoiceNo(inv.taxInvoiceNumber || "");
                    setVerifyIssueDate(getISODateStr(inv.issueDate));
                    setVerifyDueDate(getISODateStr(inv.dueDate));
                    setVerifyTotal(inv.totalAmount || "0");
                }

                // Initialize checklist points
                const initPoint = (sec: string) => {
                    const record = inv.verifications.find(v => v.section === sec);
                    
                    // JIKA sudah ada record tersimpan di database, gunakan data tersebut
                    if (record) {
                        if (record.passed) return { status: "pass" as PointStatus, comment: "" };
                        
                        const isRevision = inv.status === "Needs Revision";
                        const hasRealComment = record.comments && record.comments !== "Pass" && record.comments !== "Fail";
                        
                        if (isRevision && hasRealComment) {
                            return { status: "revision" as PointStatus, comment: record.comments || "" };
                        }
                        return { status: "pending" as PointStatus, comment: "" };
                    }
                    
                    // JIKA audit belum diisi sama sekali, biarkan status pending dengan komentar kosong agar admin melakukan pengecekan manual
                    return { status: "pending" as PointStatus, comment: "" };
                };

                const a = initPoint("A");
                const b = initPoint("B");
                const c = initPoint("C");
                const d = initPoint("D");
                const e = initPoint("E");

                setStatusA(a.status);
                setStatusB(b.status);
                setStatusC(c.status);
                setStatusD(d.status);
                setStatusE(e.status);

                setCommentA(a.comment);
                setCommentB(b.comment);
                setCommentC(c.comment);
                setCommentD(d.comment);
                setCommentE(e.comment);

                const latestComment = inv.verifications.find(v => v.comments && v.comments !== "Pass" && v.comments !== "Fail" && v.section !== "finance_revision")?.comments || "";
                setVerifyComments(latestComment);

                const financeRec = inv.verifications.find(v => v.section === "finance_revision");
                if (financeRec) {
                    setFinanceComment(financeRec.comments || "");
                }
            } else {
                setErrorMsg(res.error || "Gagal memuat detail invoice.");
            }
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan koneksi.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.user && invoiceId) {
            loadInvoiceData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, invoiceId]);

    if (sessionPending || isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const role = (session?.user as { role?: string })?.role || "vendor";
    const isAuthorized = role === "admin" || role === "procurement" || role === "finance";

    if (!session || !isAuthorized) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-55 dark:bg-red-950/20 dark:border-red-900/50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400">Akses Ditolak (Unauthorized)</CardTitle>
                        <CardDescription className="text-red-600/80 dark:text-red-400/80">
                            Hanya Procurement Admin, Finance, atau Pemeriksa yang memiliki otorisasi untuk melakukan audit invoice.
                        </CardDescription>
                        <div className="pt-4">
                            <Link href="/dashboard/invoice-hub">
                                <Button variant="outline" className="w-full">Kembali ke Invoice Hub</Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (errorMsg || !invoice) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-slate-200 bg-slate-50 dark:bg-slate-900/20 dark:border-slate-800">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <AlertTriangle className="h-12 w-12 text-amber-500" />
                        </div>
                        <CardTitle className="text-slate-850 dark:text-slate-200">Gagal Memuat Data</CardTitle>
                        <CardDescription>{errorMsg || "Dokumen invoice tidak ditemukan."}</CardDescription>
                        <div className="pt-4">
                            <Link href="/dashboard/invoice-hub">
                                <Button variant="outline" className="w-full">Kembali ke Invoice Hub</Button>
                            </Link>
                        </div>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const getInvoiceUrl = () => {
        const doc = invoice.documents.find(d => d.docType === "invoice");
        return doc ? doc.fileUrl : "";
    };

    const executeVerifySubmit = async (decision: string, skipRedirect: boolean = false) => {
        setSavingVerification(true);
        setErrorMsg(null);

        try {
            // Mapping statuses to passed & comments
            const mapPointPayload = (sec: string, status: PointStatus, commentText: string) => {
                if (status === "pass") {
                    return { section: sec, passed: true, comments: "Pass" };
                } else if (status === "revision") {
                    return { section: sec, passed: false, comments: commentText.trim() || "Fail" };
                } else {
                    // Pending / unchecked: send as not passed with empty comments
                    return { section: sec, passed: false, comments: "" };
                }
            };

            const finalHasRevision = statusA === "revision" || statusB === "revision" || statusC === "revision" || statusD === "revision" || statusE === "revision";
            
            let finalStatusA = statusA;
            let finalCommentA = commentA;
            if (decision === "Needs Revision" && !finalHasRevision) {
                finalStatusA = "revision";
                finalCommentA = verifyComments.trim() || financeComment.trim() || "Perlu revisi sesuai catatan verifikator.";
            }

            const checklist = [
                mapPointPayload("A", finalStatusA, finalCommentA),
                mapPointPayload("B", statusB, commentB),
                mapPointPayload("C", statusC, commentC),
                mapPointPayload("D", statusD, commentD),
                mapPointPayload("E", statusE, commentE),
            ];

            const result = await submitVerificationAndOCRCorrection(
                invoice.id,
                {
                    invoiceNumber: verifyInvoiceNo,
                    taxInvoiceNumber: verifyTaxInvoiceNo.trim() || undefined,
                    issueDate: verifyIssueDate,
                    dueDate: verifyDueDate,
                    totalAmount: verifyTotal,
                },
                checklist,
                decision,
                isEditMode,
                verifyComments.trim()
            );

            if (result.success) {
                if (!skipRedirect) router.push("/dashboard/invoice-hub");
                return result;
            } else {
                setErrorMsg(result.error || "Gagal menyelesaikan verifikasi.");
                setSavingVerification(false);
                return result;
            }
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan audit.");
            setSavingVerification(false);
            return { success: false };
        }
    };

    const handleVerifySubmit = async (decision: "Verified" | "Needs Revision" | "Rejected") => {
        if (decision === "Verified") {
            // Auto-populate GR Modal fields from OCR Result
            try {
                if (invoice && Array.isArray(invoice.ocrResults) && invoice.ocrResults.length > 0) {
                    const extracted = (invoice.ocrResults[0]?.extractedData as any) || {};
                    const docs = extracted.documents || [];
                    
                    const invData = docs.find((d: any) => d.type === 'invoice')?.data || extracted || {};
                    const poData = docs.find((d: any) => d.type === 'purchase_order' || d.type === 'po')?.data || {};
                    const doData = docs.find((d: any) => d.type === 'delivery_order' || d.type === 'do' || d.type === 'surat_jalan')?.data || {};
                    
                    const getField = (field: string) => invData[field] || poData[field] || doData[field] || "";
                    
                    setGrPoNumber(getField("poNumber") || getField("purchaseOrderNumber") || "");
                    setGrPoDate(getField("poDate") || getField("purchaseOrderDate") || "");
                    setGrDoNumber(getField("doNumber") || getField("suratJalanNumber") || "");
                    setGrDoDate(getField("doDate") || getField("suratJalanDate") || "");
                    
                    
                }
            } catch(e) {
                console.error("Failed to auto-populate GR modal from OCR data:", e);
            }

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
                ttdKeterangan: grTtdKeterangan,
                supplyStatus: grSupplyStatus
            });
            if (grResult.success) {
                router.push("/dashboard/invoice-hub");
            } else {
                setErrorMsg(grResult.error || "Gagal menyimpan data GR.");
                setSavingVerification(false);
            }
        }
    };

    const handleFinanceSubmit = async (decision: "Verified" | "Needs Finance Revision" | "Rejected") => {
        setSavingVerification(true);
        setErrorMsg(null);

        try {
            const checklist = [
                { section: "finance_revision", passed: decision === "Verified", comments: financeComment }
            ];

            const result = await submitVerificationAndOCRCorrection(
                invoice.id,
                {
                    invoiceNumber: verifyInvoiceNo,
                    taxInvoiceNumber: verifyTaxInvoiceNo.trim() || undefined,
                    issueDate: verifyIssueDate,
                    dueDate: verifyDueDate,
                    totalAmount: verifyTotal,
                },
                checklist,
                decision
            );

            if (result.success) {
                router.push("/dashboard/invoice-hub");
            } else {
                setErrorMsg(result.error || "Gagal menyelesaikan verifikasi keuangan.");
                setSavingVerification(false);
            }
        } catch (error: unknown) {
            setErrorMsg(error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan audit keuangan.");
            setSavingVerification(false);
        }
    };

    // Validation conditions
    const hasRevision = statusA === "revision" || statusB === "revision" || statusC === "revision" || statusD === "revision" || statusE === "revision";
    const allPassed = statusA === "pass" && statusB === "pass" && statusC === "pass" && statusD === "pass" && statusE === "pass";

    const renderTriStateControl = (
        status: PointStatus, 
        setStatus: (s: PointStatus) => void,
        comment: string,
        setComment: (c: string) => void,
        placeholder: string
    ) => {
        return (
            <div className="flex flex-col gap-2.5">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStatus(status === "pass" ? "pending" : "pass")}
                        className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                            status === "pass" 
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <Check className="h-3.5 w-3.5" /> Setuju
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatus(status === "revision" ? "pending" : "revision")}
                        className={`flex-1 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                            status === "revision" 
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <AlertCircle className="h-3.5 w-3.5" /> Revisi
                    </button>
                </div>
                {status === "revision" && (
                    <div className="animate-in slide-in-from-top-1 duration-150">
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            required
                            className="text-xs h-8 border-slate-200 dark:border-slate-800 focus:ring-blue-500 rounded-lg bg-slate-50/50 dark:bg-slate-900 font-semibold"
                        />
                    </div>
                )}
            </div>
        );
    };

    const renderReadOnlyStatus = (status: PointStatus, comment: string) => {
        if (status === "pass") {
            return (
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Lolos Audit (Pass)
                </div>
            );
        } else if (status === "revision") {
            return (
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/5 p-2 rounded-lg border border-blue-500/10 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" /> Perlu Revisi</div>
                    {comment && <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 pl-5">Catatan: &quot;{comment}&quot;</p>}
                </div>
            );
        } else {
            return (
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-500/5 p-2 rounded-lg border border-slate-500/10 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Belum Diperiksa (Pending)
                </div>
            );
        }
    };

    return (
        <div className="flex-1 flex flex-col gap-4 p-4 md:p-6 overflow-hidden h-[calc(100vh-var(--header-height))] w-full">
            
            {/* Breadcrumb & Navigation Back */}
            <div className="flex items-center gap-3 shrink-0">
                <Link href="/dashboard/invoice-hub">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border border-slate-200/50 dark:border-slate-800">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Workspace / <Link href="/dashboard/invoice-hub" className="hover:text-blue-600 transition-colors">Invoice Hub</Link> / <span className="text-blue-600 font-semibold">Proses Audit</span>
                </div>
            </div>

            {/* Error Notification Alert */}
            {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400 rounded-xl flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                        <ShieldAlert className="h-5 w-5 text-red-600" />
                        <span className="text-xs font-bold">{errorMsg}</span>
                    </div>
                    <button onClick={() => setErrorMsg(null)} className="opacity-70 hover:opacity-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Main side-by-side grid container */}
            <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
                
                {/* Left Column: Full Width Document Viewer */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-4 flex flex-col overflow-hidden min-h-[300px]">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-blue-600" />
                            DOCUMENT PREVIEW (INVOICE UTAMA)
                        </span>
                        {getInvoiceUrl() && (
                            <a 
                                href={getInvoiceUrl()} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 font-bold"
                            >
                                Buka Tab Baru <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </div>
                    <div className="flex-1 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative">
                        {getInvoiceUrl() ? (
                            <iframe 
                                src={getInvoiceUrl()} 
                                className="w-full h-full border-none"
                                title="Document Viewer"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Preview tidak tersedia.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: OCR form & Tri-state checklist */}
                <div className="w-full lg:w-[460px] bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shrink-0 min-h-0">
                    
                    {/* Invoice Meta header */}
                    <div className="border-b pb-4 shrink-0">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">PROSES AUDIT & VERIFIKASI</span>
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white font-parkinsans leading-none">CV. {invoice.vendorName || "Mitra Utama"}</h2>
                        <p className="text-xs text-slate-400 mt-1 font-semibold">Status: <span className="text-slate-600 dark:text-slate-350">{invoice.status}</span></p>
                    </div>

                    {role !== "finance" && invoice.status === "Needs Finance Revision" && financeComment && (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 rounded-xl flex flex-col gap-1.5 shadow-sm shrink-0">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                                <span>Perhatian: Direvisi oleh Finance</span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                Catatan Finance: &quot;{financeComment}&quot;
                            </p>
                        </div>
                    )}

                    {/* Data Masukan Vendor (Read-Only) */}
                    <div className="bg-slate-50/70 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800 space-y-3 shrink-0">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block border-b pb-1.5 flex items-center gap-1">
                            📋 DATA MASUKAN VENDOR (DEKLARASI)
                        </span>
                        <div className="grid grid-cols-2 gap-3.5 text-[11px]">
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Nomor Invoice</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.invoiceNumber || "-"}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Nomor Faktur Pajak</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{invoice.taxInvoiceNumber || "-"}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Tanggal Terbit</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                </span>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Jatuh Tempo</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block">Total Nominal Invoice</span>
                                <span className="font-bold text-slate-800 dark:text-slate-205 dark:text-slate-200 font-mono">
                                    {invoice.totalAmount ? `Rp ${parseFloat(invoice.totalAmount).toLocaleString('id-ID')}` : "-"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* OCR Multi-Document Cards */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                            Hasil Ekstraksi & Klasifikasi OCR
                        </h3>

                        {/* Tab Headers */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto shrink-0 mb-4 bg-slate-50/50 dark:bg-slate-900/30 p-1 rounded-xl">
                            {ocrDocs.map((doc) => {
                                let label = "Dokumen";
                                if (doc.type === "invoice") label = "📄 Invoice";
                                else if (doc.type === "tax_invoice") label = "⚖️ Faktur Pajak";
                                else if (doc.type === "delivery_order") label = "🚚 Surat Jalan / DO";
                                else if (doc.type === "po") label = "💼 Purchase Order";

                                const isActive = activeOcrTab === doc.id;
                                return (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => {
                                            setActiveOcrTab(doc.id);
                                            handleCancelEdit();
                                        }}
                                        className={`px-3 py-1.5 text-[11px] font-bold transition-all rounded-lg cursor-pointer whitespace-nowrap ${
                                            isActive 
                                                ? "bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-800" 
                                                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-250 border border-transparent"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="space-y-4">
                            {ocrDocs
                                .filter((doc) => doc.id === activeOcrTab)
                                .map((doc) => {
                                    const isEditing = editingDocId === doc.id;
                                    const isSaving = savingDocId === doc.id;
                                    const isSuccess = saveSuccessDocId === doc.id;

                                    // Colors based on document type
                                    let cardBorder = "border-l-blue-500";
                                    let bgClass = "bg-blue-500/5 dark:bg-blue-950/10";
                                    let badgeClass = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50";
                                    let badgeText = "Invoice";

                                    if (doc.type === "tax_invoice") {
                                        cardBorder = "border-l-purple-500";
                                        bgClass = "bg-purple-500/5 dark:bg-purple-950/10";
                                        badgeClass = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50";
                                        badgeText = "Faktur Pajak";
                                    } else if (doc.type === "delivery_order") {
                                        cardBorder = "border-l-amber-500";
                                        bgClass = "bg-amber-500/5 dark:bg-amber-950/10";
                                        badgeClass = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50";
                                        badgeText = "Surat Jalan / DO";
                                    } else if (doc.type === "po") {
                                        cardBorder = "border-l-emerald-500";
                                        bgClass = "bg-emerald-500/5 dark:bg-emerald-950/10";
                                        badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50";
                                        badgeText = "Purchase Order";
                                    }

                                    return (
                                        <div 
                                            key={doc.id} 
                                            className={`p-4 rounded-xl border border-slate-200 dark:border-slate-800 border-l-4 transition-all shadow-sm flex flex-col gap-3 ${cardBorder} ${bgClass}`}
                                        >
                                            {/* Card Header */}
                                            <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/50 dark:border-slate-850">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${badgeClass}`}>
                                                        {badgeText}
                                                    </span>
                                                    <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold">
                                                        Halaman: {doc.pages.join(", ")}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1.5">
                                                    {isEditing ? (
                                                        <>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                onClick={handleCancelEdit} 
                                                                disabled={isSaving}
                                                                className="h-7 text-[10px] font-bold rounded-lg px-2 border-slate-200 dark:border-slate-800"
                                                            >
                                                                Batal
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                onClick={() => handleSaveDocOcr(doc.id)} 
                                                                disabled={isSaving}
                                                                className="h-7 text-[10px] font-bold rounded-lg px-2 bg-blue-600 hover:bg-blue-700 text-white"
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    "Simpan"
                                                                )}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        role !== "finance" && (
                                                            <Button 
                                                                size="sm" 
                                                                variant="ghost" 
                                                                onClick={() => handleStartEdit(doc)}
                                                                className="h-7 text-[10px] font-bold rounded-lg px-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 hover:text-blue-700"
                                                            >
                                                                {isSuccess ? (
                                                                    <span className="text-emerald-600 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Tersimpan</span>
                                                                ) : (
                                                                    "Edit"
                                                                )}
                                                            </Button>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Content Form */}
                                            <div className="flex flex-col gap-3.5">
                                                {/* Dynamic Fields Form */}
                                                <div className="grid grid-cols-2 gap-3.5">
                                                    {(doc.fields && doc.fields.length > 0 ? doc.fields : Object.keys(doc.data).map(key => {
                                                        let label = key;
                                                        if (key === "invoiceNumber") label = "Nomor Invoice";
                                                        else if (key === "taxInvoiceNumber") label = "Nomor Faktur Pajak";
                                                        else if (key === "issueDate") label = "Tanggal Terbit";
                                                        else if (key === "dueDate") label = "Jatuh Tempo";
                                                        else if (key === "totalAmount") label = "Total Invoice";
                                                        else if (key === "vendorName") label = "Nama Vendor";
                                                        else if (key === "customerName") label = "Nama Customer";
                                                        else if (key === "doNumber") label = "Nomor DO";
                                                        else if (key === "deliveryDate") label = "Tanggal Pengiriman";
                                                        else if (key === "poNumber") label = "Nomor PO";
                                                        else if (key === "recipientName") label = "Penerima";
                                                        else if (key === "poDate") label = "Tanggal PO";
                                                        else if (key === "buyerName") label = "Pembeli";
                                                        else if (key === "discount" || key === "ppnPercent" || key === "grandTotal" || key === "bankName" || key === "bankAccount") return null;
                                                        return { key, label, value: doc.data[key as keyof typeof doc.data] };
                                                    }).filter(Boolean) as { key: string; label: string; value: string | null }[]).map(field => (
                                                        <div key={field.key} className="space-y-1">
                                                            <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{field.label}</Label>
                                                            {isEditing ? (
                                                                <Input 
                                                                    value={editingFields[field.key] || ""} 
                                                                    onChange={(e) => handleFieldChange(field.key, e.target.value)} 
                                                                    className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                />
                                                            ) : (
                                                                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={field.value || ""}>
                                                                    {field.value || "-"}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Tabular Line Items Section */}
                                                {((isEditing ? editingItems : doc.items) && (isEditing ? editingItems : doc.items)!.length > 0) && (
                                                    <div className="mt-2 space-y-2 border-t pt-3 border-slate-200/50 dark:border-slate-800/30">
                                                        <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                                            Rincian Item Transaksi
                                                        </Label>
                                                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                                            <table className="w-full text-[11px] border-collapse bg-white dark:bg-slate-950">
                                                                <thead>
                                                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-[9px] font-bold uppercase tracking-wider text-slate-500 text-left">
                                                                        <th className="px-2 py-1.5 min-w-[120px]">Deskripsi</th>
                                                                        <th className="px-1.5 py-1.5 w-12 text-center">Qty</th>
                                                                        <th className="px-1.5 py-1.5 w-14 text-center">Satuan</th>
                                                                        <th className="px-2 py-1.5 w-20 text-right">Harga (Rp)</th>
                                                                        <th className="px-2 py-1.5 w-20 text-right">Total (Rp)</th>
                                                                        {isEditing && <th className="px-1 py-1.5 w-6"></th>}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                                                                    {(isEditing ? editingItems : doc.items)!.map((item, idx) => (
                                                                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                                            <td className="px-2 py-1">
                                                                                {isEditing ? (
                                                                                    <textarea
                                                                                        value={item.description || ""}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...editingItems];
                                                                                            newItems[idx].description = e.target.value;
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        rows={1}
                                                                                        className="w-full text-xs font-semibold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-1 resize-y dark:text-slate-200"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={item.description || ""}>
                                                                                        {item.description || "-"}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-1.5 py-1 text-center">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        value={item.quantity === null ? "" : item.quantity}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...editingItems];
                                                                                            const val = e.target.value === "" ? null : Number(e.target.value);
                                                                                            newItems[idx].quantity = val;
                                                                                            if (val !== null && newItems[idx].unitPrice) {
                                                                                                newItems[idx].totalPrice = (val * parseFloat(newItems[idx].unitPrice!)).toFixed(2);
                                                                                            }
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        className="w-full text-center text-xs font-semibold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-0.5 dark:text-slate-200"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{item.quantity ?? "-"}</div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-1.5 py-1 text-center">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="text"
                                                                                        value={item.unit || ""}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...editingItems];
                                                                                            newItems[idx].unit = e.target.value;
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        className="w-full text-center text-xs font-semibold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-0.5 uppercase dark:text-slate-200"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="font-bold text-[10px] text-slate-500 dark:text-slate-400 uppercase">{item.unit || "-"}</div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-2 py-1 text-right">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={item.unitPrice || ""}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...editingItems];
                                                                                            newItems[idx].unitPrice = e.target.value;
                                                                                            if (newItems[idx].quantity !== null && e.target.value !== "") {
                                                                                                newItems[idx].totalPrice = (newItems[idx].quantity! * parseFloat(e.target.value)).toFixed(2);
                                                                                            }
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        className="w-full text-right text-xs font-mono font-bold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-0.5 dark:text-slate-200"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="font-mono font-bold text-slate-850 dark:text-slate-200">
                                                                                        {item.unitPrice ? parseFloat(item.unitPrice).toLocaleString('id-ID') : "-"}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-2 py-1 text-right">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={item.totalPrice || ""}
                                                                                        onChange={(e) => {
                                                                                            const newItems = [...editingItems];
                                                                                            newItems[idx].totalPrice = e.target.value;
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        className="w-full text-right text-xs font-mono font-bold bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded p-0.5 dark:text-slate-200"
                                                                                    />
                                                                                ) : (
                                                                                    <div className="font-mono font-bold text-slate-850 dark:text-slate-200">
                                                                                        {item.totalPrice ? parseFloat(item.totalPrice).toLocaleString('id-ID') : "-"}
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            {isEditing && (
                                                                                <td className="px-1 py-1 text-center">
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            const newItems = editingItems.filter((_, i) => i !== idx);
                                                                                            setEditingItems(newItems);
                                                                                        }}
                                                                                        className="text-red-500 hover:text-red-700 cursor-pointer"
                                                                                    >
                                                                                        <X className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {isEditing && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setEditingItems([
                                                                        ...editingItems,
                                                                        { description: "", quantity: 1, unit: "PCS", unitPrice: "0.00", totalPrice: "0.00" }
                                                                    ]);
                                                                }}
                                                                className="w-full h-7 text-[10px] font-bold rounded-lg border-dashed border-slate-300 dark:border-slate-800 hover:border-blue-500 hover:text-blue-600 transition-colors"
                                                            >
                                                                + Tambah Item Barang
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Financial Summary & Payment Info */}
                                                <div className="mt-2 grid grid-cols-3 gap-3 border-t pt-3.5 border-slate-250/50 dark:border-slate-800/30">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Diskon</Label>
                                                        {isEditing ? (
                                                            <Input
                                                                value={editingFields["discount"] || ""}
                                                                onChange={(e) => handleFieldChange("discount", e.target.value)}
                                                                className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                placeholder="Rp 0"
                                                            />
                                                        ) : (
                                                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                                {doc.data.discount ? `Rp ${parseFloat(doc.data.discount).toLocaleString('id-ID')}` : "-"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tarif PPN (%)</Label>
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                value={editingFields["ppnPercent"] || ""}
                                                                onChange={(e) => handleFieldChange("ppnPercent", e.target.value)}
                                                                className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                placeholder="12%"
                                                            />
                                                        ) : (
                                                            <div className="text-xs font-bold text-slate-850 dark:text-slate-200">{doc.data.ppnPercent ? `${doc.data.ppnPercent}%` : "-"}</div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Grand Total (Rp)</Label>
                                                        {isEditing ? (
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={editingFields["grandTotal"] || ""}
                                                                onChange={(e) => handleFieldChange("grandTotal", e.target.value)}
                                                                className="h-8 rounded-lg text-xs font-bold text-blue-600 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                placeholder="Rp 0"
                                                            />
                                                        ) : (
                                                            <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 font-mono">
                                                                {doc.data.grandTotal ? `Rp ${parseFloat(doc.data.grandTotal).toLocaleString('id-ID')}` : "-"}
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Bank Account */}
                                                    {(isEditing || doc.data.bankAccount) && (
                                                        <div className="col-span-3 grid grid-cols-2 gap-3.5 border-t pt-2 border-slate-200/50 dark:border-slate-800/30">
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nama Bank</Label>
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={editingFields["bankName"] || ""}
                                                                        onChange={(e) => handleFieldChange("bankName", e.target.value)}
                                                                        className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                        placeholder="Nama Bank"
                                                                    />
                                                                ) : (
                                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{doc.data.bankName || "-"}</div>
                                                                )}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">Nomor Rekening</Label>
                                                                {isEditing ? (
                                                                    <Input
                                                                        value={editingFields["bankAccount"] || ""}
                                                                        onChange={(e) => handleFieldChange("bankAccount", e.target.value)}
                                                                        className="h-8 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                                        placeholder="Nomor Rekening"
                                                                    />
                                                                ) : (
                                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono truncate" title={doc.data.bankAccount || ""}>
                                                                        {doc.data.bankAccount || "-"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>

                    {/* Verification Checklists (Tri-State Layout) */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Checklist Verifikasi Audit
                        </h3>
                        
                        <div className="space-y-3.5">
                            
                            {/* Bagian A */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusA === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusA === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusA === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusA === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusA === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            A. Kelengkapan Berkas Dokumen
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Invoice, Faktur Pajak, DO/Surat Jalan, dan PO lengkap.</p>
                                    </div>
                                </div>
                                {role === "finance" ? renderReadOnlyStatus(statusA, commentA) : renderTriStateControl(statusA, setStatusA, commentA, setCommentA, "Tulis alasan revisi kelengkapan berkas...")}
                            </div>

                            {/* Bagian B */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusB === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusB === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusB === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusB === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusB === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            B. Validasi Rekening / NPWP
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Pencocokan nama supplier, nomor rekening & NPWP.</p>
                                    </div>
                                </div>
                                {role === "finance" ? renderReadOnlyStatus(statusB, commentB) : renderTriStateControl(statusB, setStatusB, commentB, setCommentB, "Tulis alasan revisi data supplier...")}
                            </div>

                            {/* Bagian C */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusC === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusC === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusC === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusC === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusC === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            C. Pencocokan Item barang & PO
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Kesesuaian qty & harga satuan barang dengan Purchase Order.</p>
                                    </div>
                                </div>
                                {role === "finance" ? renderReadOnlyStatus(statusC, commentC) : renderTriStateControl(statusC, setStatusC, commentC, setCommentC, "Tulis alasan revisi item barang/PO...")}
                            </div>

                            {/* Bagian D */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusD === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusD === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusD === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusD === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusD === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            D. Validasi e-Faktur PPN
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Pencocokan kode pajak e-Faktur PPN dan kalkulasinya.</p>
                                    </div>
                                </div>
                                {role === "finance" ? renderReadOnlyStatus(statusD, commentD) : renderTriStateControl(statusD, setStatusD, commentD, setCommentD, "Tulis alasan revisi kode e-Faktur PPN...")}
                            </div>

                            {/* Bagian E */}
                            <div className={`p-3 rounded-xl border border-slate-100 dark:border-slate-900/60 bg-slate-50/20 dark:bg-slate-900/10 flex flex-col gap-2.5 transition-all border-l-4 ${
                                statusE === "pass" ? "border-l-emerald-500 bg-emerald-50/5 dark:bg-emerald-950/5" :
                                statusE === "revision" ? "border-l-blue-500 bg-blue-50/5 dark:bg-blue-950/5" : "border-l-slate-350"
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            {statusE === "pass" && <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                                            {statusE === "revision" && <AlertCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                                            {statusE === "pending" && <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                            E. Perhitungan Finansial
                                        </div>
                                        <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">Akurasi perkalian total, diskon, dan kalkulasi nominal akhir.</p>
                                    </div>
                                </div>
                                {role === "finance" ? renderReadOnlyStatus(statusE, commentE) : renderTriStateControl(statusE, setStatusE, commentE, setCommentE, "Tulis alasan revisi perhitungan finansial...")}
                            </div>
                        </div>
                    </div>

                    {/* Overall audit notes */}
                    {role === "finance" ? (
                        verifyComments && (
                            <div className="space-y-1.5 shrink-0 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Catatan Tambahan Procurement</Label>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{verifyComments}</p>
                            </div>
                        )
                    ) : (
                        <div className="space-y-1.5 shrink-0">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Catatan Verifikasi Tambahan (Procurement)</Label>
                            <Textarea 
                                placeholder="Berikan keterangan detail tambahan untuk audit berkas ini..."
                                value={verifyComments} 
                                onChange={(e) => setVerifyComments(e.target.value)}
                                className="text-xs rounded-lg border-slate-200 dark:border-slate-800 focus:ring-blue-500 min-h-[60px] bg-slate-50/50 dark:bg-slate-900"
                            />
                        </div>
                    )}

                    {/* Finance Specific Comments */}
                    {role === "finance" && (
                        <div className="space-y-1.5 shrink-0">
                            <Label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Catatan Revisi Keuangan (Finance)</Label>
                            <Textarea 
                                placeholder="Tulis detail revisi jika ada ketidaksesuaian dokumen untuk Procurement..."
                                value={financeComment} 
                                onChange={(e) => setFinanceComment(e.target.value)}
                                className="text-xs rounded-lg border-blue-200 focus:border-blue-500 dark:border-slate-800 focus:ring-blue-500 min-h-[80px] bg-blue-50/5 dark:bg-slate-900 font-semibold"
                            />
                        </div>
                    )}

                    {/* Bottom Decisions Actions Footer */}
                    {isEditMode ? (
                        <div className="flex flex-col gap-2.5 mt-2 border-t pt-4 shrink-0">
                            <Label className="text-xs font-bold text-slate-600 dark:text-slate-400">Pilih Status Baru (Admin Override)</Label>
                            <select 
                                value={overrideStatus}
                                onChange={(e) => setOverrideStatus(e.target.value)}
                                className="text-xs rounded-lg border-slate-300 w-full p-2 bg-white dark:bg-slate-950 border"
                            >
                                <option value="Pending OCR">Pending OCR</option>
                                <option value="In Review">In Review (Siap Diverifikasi)</option>
                                <option value="Procurement Verified">Procurement Verified</option>
                                <option value="In Finance Verification">In Finance Verification</option>
                                <option value="Verified">Verified / Selesai</option>
                                <option value="Needs Revision">Needs Revision</option>
                                <option value="Needs Finance Revision">Needs Finance Revision</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Document in Transit">Document in Transit</option>
                                <option value="Paid">Paid</option>
                            </select>
                            <Button 
                                type="button"
                                onClick={() => executeVerifySubmit(overrideStatus)} 
                                disabled={savingVerification} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {savingVerification ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan Perubahan...</>
                                ) : (
                                    <><Edit2 className="h-4 w-4" /> Simpan Perubahan Data & Status</>
                                )}
                            </Button>
                        </div>
                    ) : role === "finance" ? (
                        <div className="flex flex-col gap-2.5 mt-2 border-t pt-4 shrink-0">
                            <div className="flex gap-2">
                                <Button 
                                    type="button"
                                    onClick={() => handleFinanceSubmit("Rejected")} 
                                    disabled={savingVerification} 
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold h-10 text-xs rounded-lg border border-red-200 transition-all cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" /> Tolak (Reject)
                                </Button>
                                
                                <Button 
                                    type="button"
                                    onClick={() => handleFinanceSubmit("Needs Finance Revision")} 
                                    disabled={savingVerification || !financeComment.trim()} 
                                    className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 font-bold h-10 text-xs rounded-lg border border-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    title={!financeComment.trim() ? "Harap isi catatan revisi keuangan terlebih dahulu" : ""}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Minta Revisi
                                </Button>
                            </div>

                            <Button 
                                type="button"
                                onClick={() => handleFinanceSubmit("Verified")} 
                                disabled={savingVerification} 
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {savingVerification ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Menyimpan Persetujuan...
                                    </>
                                ) : (
                                    <>
                                        <FileCheck className="h-4 w-4" /> Setujui & Verifikasi Final
                                    </>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5 mt-2 border-t pt-4 shrink-0">
                            <div className="flex gap-2">
                                <Button 
                                    type="button"
                                    onClick={() => handleVerifySubmit("Rejected")} 
                                    disabled={savingVerification} 
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold h-10 text-xs rounded-lg border border-red-200 transition-all cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5 mr-1" /> Tolak (Reject)
                                </Button>
                                
                                <Button 
                                    type="button"
                                    onClick={() => handleVerifySubmit("Needs Revision")} 
                                    disabled={savingVerification || (!hasRevision && invoice.status !== "Needs Finance Revision")} 
                                    className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-600 hover:text-amber-700 font-bold h-10 text-xs rounded-lg border border-amber-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                    title={(!hasRevision && invoice.status !== "Needs Finance Revision") ? "Minimal harus ada 1 kriteria dengan status Revisi" : ""}
                                >
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                    {invoice.status === "Needs Finance Revision" ? "Kembalikan ke Vendor (Revisi)" : "Minta Revisi"}
                                </Button>
                            </div>

                            <Button 
                                type="button"
                                onClick={() => handleVerifySubmit("Verified")} 
                                disabled={savingVerification || !allPassed} 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 text-xs rounded-lg shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                                title={!allPassed ? "Semua 5 kriteria harus disetujui (Setuju)" : ""}
                            >
                                {savingVerification ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Menyimpan Audit...
                                    </>
                                ) : (
                                    <>
                                        <FileCheck className="h-4 w-4" /> Setujui Verifikasi
                                    </>
                                )}
                            </Button>
                        </div>
                    )}

                </div>

            </div>


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
                            <Input readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grPoNumber} onChange={(e) => setGrPoNumber(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl PO</Label>
                            <Input type="date" readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grPoDate} onChange={(e) => setGrPoDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">No Surat Jalan</Label>
                            <Input readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grDoNumber} onChange={(e) => setGrDoNumber(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs">Tgl Surat Jalan</Label>
                            <Input type="date" readOnly className="col-span-3 text-xs bg-slate-100 dark:bg-slate-900 cursor-not-allowed opacity-80" value={grDoDate} onChange={(e) => setGrDoDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right text-xs leading-tight">Ket. TTD & Tanggal</Label>
                            <select 
                                className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background"
                                value={grTtdKeterangan} 
                                onChange={(e) => setGrTtdKeterangan(e.target.value)}>
                                <option>Sesuai</option>
                                <option>Tidak Sesuai</option>
                            </select>
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
}
