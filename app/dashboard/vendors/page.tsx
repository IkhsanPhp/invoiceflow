"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getVendors, createVendor, updateVendor, deleteVendor, importVendors, getVendorDocuments, approveVendor } from "./actions";
import { getMyPermissions } from "@/app/dashboard/users/actions";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Loader2,
    ShieldAlert,
    Plus,
    Edit2,
    Trash2,
    Eye,
    Download,
    Search,
    CheckCircle2,
    X,
    Filter,
    Activity,
    AlertTriangle,
    DollarSign,
    Building2,
    Phone,
    Mail,
    FileText,
    MapPin,
    Clock,
    Upload,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    TrendingUp,
    Users,
    Package,
    Briefcase,
} from "lucide-react";

interface VendorItem {
    id: string;
    supplier: string | null;
    nameOfVendor: string;
    street: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    accountGroup: string;
    searchTerm: string | null;
    purchOrganization: string;
    purchOrgDescr: string;
    termsOfPayment: string | null;
    incoterms: string | null;
    minimumOrderValue: string | null;
    orderCurrency: string;
    salesperson: string | null;
    telephone: string | null;
    numPurchasingOrgs: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    vendorType: string | null;
    npwp: string | null;
    nik: string | null;
    nib: string | null;
    pkpStatus: string | null;
    classification: string | null;
    flagPersonal: boolean;
    flagExEmployee: boolean;
    flagPrincipal: boolean;
    province: string | null;
    emailCompany: string | null;
    telephoneCompany: string | null;
    picName: string | null;
    picEmail: string | null;
    picPhone: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
    bankAccountName: string | null;
    isBankAccountDiffName: boolean;
    isAssetOwnerDiff: boolean;
    watchlistFlag: boolean;
    blacklistFlag: boolean;
    blacklistReason: string | null;
    verificationComments: string | null;
    verifiedBy: string | null;
    verifiedAt: Date | null;
}

interface VendorDocument {
    id: string;
    vendorId: string;
    docType: string;
    fileUrl: string;
    fileSize: number;
    fileName: string;
    uploadedAt: Date;
}

const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, { label: string; className: string; dot: string }> = {
        "Active": {
            label: "Active",
            className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
            dot: "bg-emerald-500"
        },
        "Pending Audit": {
            label: "Pending Audit",
            className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
            dot: "bg-amber-500 animate-pulse"
        },
        "Archived": {
            label: "Archived",
            className: "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
            dot: "bg-slate-400"
        }
    };
    const cfg = configs[status] || configs["Archived"];
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cfg.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

export default function VendorsMasterPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [vendorsList, setVendorsList] = useState<VendorItem[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<VendorItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "archived">("all");

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);
    const [selectedVendorDocs, setSelectedVendorDocs] = useState<VendorDocument[]>([]);
    const [isApproveOpen, setIsApproveOpen] = useState(false);
    const [approveTop, setApproveTop] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<VendorItem | null>(null);
    const [detailsTab, setDetailsTab] = useState<"info" | "sop" | "documents">("info");

    const [searchQuery, setSearchQuery] = useState("");
    const [accountGroupFilter, setAccountGroupFilter] = useState("all");
    const [currencyFilter, setCurrencyFilter] = useState("all");

    const [supplier, setSupplier] = useState("");
    const [nameOfVendor, setNameOfVendor] = useState("");
    const [street, setStreet] = useState("");
    const [country, setCountry] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [accountGroup, setAccountGroup] = useState("NCAD");
    const [searchTerm, setSearchTerm] = useState("");
    const [purchOrganization, setPurchOrganization] = useState("2000");
    const [purchOrgDescr, setPurchOrgDescr] = useState("Chitra (Central)");
    const [termsOfPayment, setTermsOfPayment] = useState("");
    const [incoterms, setIncoterms] = useState("");
    const [minimumOrderValue, setMinimumOrderValue] = useState("0.00");
    const [orderCurrency, setOrderCurrency] = useState("USD");
    const [salesperson, setSalesperson] = useState("");
    const [telephone, setTelephone] = useState("");
    const [numPurchasingOrgs, setNumPurchasingOrgs] = useState(1);
    const [status, setStatus] = useState("Active");

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [_sheetNames, setSheetNames] = useState<string[]>([]);
    const [_selectedSheet, setSelectedSheet] = useState<string>("");
    const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
    const [parsedRows, setParsedRows] = useState<unknown[][]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
    const [isImporting, setIsImporting] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    const dbFields = [
        { key: "supplier", label: "Supplier Code (Required)" },
        { key: "nameOfVendor", label: "Name of Vendor (Required)" },
        { key: "street", label: "Street" },
        { key: "country", label: "Country" },
        { key: "postalCode", label: "Postal Code" },
        { key: "city", label: "City" },
        { key: "accountGroup", label: "Account Group" },
        { key: "searchTerm", label: "Search Term" },
        { key: "purchOrganization", label: "Purch. Organization" },
        { key: "purchOrgDescr", label: "Purch. Org. Description" },
        { key: "termsOfPayment", label: "Terms of Payment" },
        { key: "incoterms", label: "Incoterms" },
        { key: "minimumOrderValue", label: "Minimum Order Value" },
        { key: "orderCurrency", label: "Order Currency" },
        { key: "salesperson", label: "Salesperson" },
        { key: "telephone", label: "Telephone" },
        { key: "numPurchasingOrgs", label: "Number of Purchasing Orgs" },
        { key: "status", label: "Status" }
    ];

    const autoDetectMapping = (headers: string[]) => {
        const initialMapping: Record<string, string> = {};
        const mappingKeys = [
            { key: "supplier", matches: ["supplier", "code", "no. supplier", "vendor code", "number", "id"] },
            { key: "nameOfVendor", matches: ["name", "vendor name", "name of vendor", "company"] },
            { key: "street", matches: ["street", "address", "alamat"] },
            { key: "country", matches: ["country", "negara", "state"] },
            { key: "postalCode", matches: ["postal code", "postal", "zip", "kodepos", "kode pos"] },
            { key: "city", matches: ["city", "kota"] },
            { key: "accountGroup", matches: ["account group", "group", "grup"] },
            { key: "searchTerm", matches: ["search term", "keyword"] },
            { key: "purchOrganization", matches: ["purch. organization", "purchasing organization", "purch org"] },
            { key: "purchOrgDescr", matches: ["purch. org. descr.", "purchasing org description", "org description"] },
            { key: "termsOfPayment", matches: ["terms of payment", "payment terms", "terms"] },
            { key: "incoterms", matches: ["incoterms", "shipment terms"] },
            { key: "minimumOrderValue", matches: ["minimum order value", "min order", "min order value"] },
            { key: "orderCurrency", matches: ["order currency", "currency", "mata uang"] },
            { key: "salesperson", matches: ["salesperson", "sales", "pic"] },
            { key: "telephone", matches: ["telephone", "telp", "phone", "no hp"] },
            { key: "numPurchasingOrgs", matches: ["number of purchasing", "purchasing orgs count"] },
            { key: "status", matches: ["status", "active", "state"] }
        ];

        mappingKeys.forEach(item => {
            const match = headers.find(h => {
                const cleanH = h.toLowerCase().replace(/[\s_\-\.]/g, '');
                return item.matches.some(m => {
                    const cleanM = m.toLowerCase().replace(/[\s_\-\.]/g, '');
                    return cleanH === cleanM || cleanH.includes(cleanM) || cleanM.includes(cleanH);
                });
            });
            initialMapping[item.key] = match || "";
        });

        setColumnMapping(initialMapping);
    };

    const parseExcelSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        if (sheetData.length === 0) return;
        const headers = sheetData[0].map(h => String(h || "").trim()).filter(Boolean);
        const dataRows = sheetData.slice(1);
        setParsedHeaders(headers);
        setParsedRows(dataRows);
        autoDetectMapping(headers);
    };

    const handleFileChange = async (file: File) => {
        setImportFile(file);
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (fileExtension === "csv") {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
                if (lines.length === 0) return;
                const parseCSVLine = (line: string) => {
                    const result = [];
                    let current = "";
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') { inQuotes = !inQuotes; }
                        else if (char === ',' && !inQuotes) { result.push(current.replace(/^"|"$/g, '').trim()); current = ""; }
                        else { current += char; }
                    }
                    result.push(current.replace(/^"|"$/g, '').trim());
                    return result;
                };
                const headers = parseCSVLine(lines[0]);
                const dataRows = lines.slice(1).map(parseCSVLine);
                setParsedHeaders(headers);
                setParsedRows(dataRows);
                setSheetNames(["CSV File"]);
                setSelectedSheet("CSV File");
                autoDetectMapping(headers);
            };
            reader.readAsText(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                setSheetNames(workbook.SheetNames);
                if (workbook.SheetNames.length > 0) {
                    const firstSheet = workbook.SheetNames[0];
                    setSelectedSheet(firstSheet);
                    parseExcelSheet(workbook, firstSheet);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleCommitImport = async () => {
        if (!columnMapping["supplier"] || !columnMapping["nameOfVendor"]) {
            alert("Supplier Code and Name of Vendor are required fields and must be mapped!");
            return;
        }
        setIsImporting(true);
        setMessage(null);
        try {
            const supplierIdx = parsedHeaders.indexOf(columnMapping["supplier"]);
            const nameIdx = parsedHeaders.indexOf(columnMapping["nameOfVendor"]);
            if (supplierIdx === -1 || nameIdx === -1) {
                alert("Mapped columns for Supplier Code and Name of Vendor not found in sheet.");
                setIsImporting(false);
                return;
            }
            const payloadList = parsedRows.map(row => {
                const getRowValue = (key: string) => {
                    const colName = columnMapping[key];
                    if (!colName) return undefined;
                    const idx = parsedHeaders.indexOf(colName);
                    if (idx === -1) return undefined;
                    return row[idx];
                };
                return {
                    supplier: String(getRowValue("supplier") || "").trim(),
                    nameOfVendor: String(getRowValue("nameOfVendor") || "").trim(),
                    street: getRowValue("street") ? String(getRowValue("street")) : null,
                    country: getRowValue("country") ? String(getRowValue("country")) : null,
                    postalCode: getRowValue("postalCode") ? String(getRowValue("postalCode")) : null,
                    city: getRowValue("city") ? String(getRowValue("city")) : null,
                    accountGroup: getRowValue("accountGroup") ? String(getRowValue("accountGroup")) : "NCAD",
                    searchTerm: getRowValue("searchTerm") ? String(getRowValue("searchTerm")) : null,
                    purchOrganization: getRowValue("purchOrganization") ? String(getRowValue("purchOrganization")) : "2000",
                    purchOrgDescr: getRowValue("purchOrgDescr") ? String(getRowValue("purchOrgDescr")) : "Chitra (Central)",
                    termsOfPayment: getRowValue("termsOfPayment") ? String(getRowValue("termsOfPayment")) : null,
                    incoterms: getRowValue("incoterms") ? String(getRowValue("incoterms")) : null,
                    minimumOrderValue: getRowValue("minimumOrderValue") ? String(getRowValue("minimumOrderValue")) : "0.00",
                    orderCurrency: getRowValue("orderCurrency") ? String(getRowValue("orderCurrency")) : "USD",
                    salesperson: getRowValue("salesperson") ? String(getRowValue("salesperson")) : null,
                    telephone: getRowValue("telephone") ? String(getRowValue("telephone")) : null,
                    numPurchasingOrgs: Number(getRowValue("numPurchasingOrgs") || 1),
                    status: getRowValue("status") ? String(getRowValue("status")) : "Active"
                };
            }).filter(v => v.supplier !== "");
            const res = await importVendors(payloadList);
            if (res.success) {
                setMessage({ type: "success", text: `Berhasil mengimpor ${res.count} vendor dari spreadsheet!` });
                setIsImportOpen(false);
                setImportFile(null);
                setParsedHeaders([]);
                setParsedRows([]);
                fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Gagal mengimpor vendor" });
            }
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : "Terjadi kesalahan saat mengimpor.";
            setMessage({ type: "error", text: errMsg });
        } finally {
            setIsImporting(false);
        }
    };

    const fetchVendors = async () => {
        setIsLoading(true);
        const result = await getVendors();
        if (result.success && result.vendors) {
            setVendorsList(result.vendors as VendorItem[]);
        } else {
            setMessage({ type: "error", text: result.error || "Gagal memuat vendor" });
        }
        setIsLoading(false);
    };

    const [myPermissions, setMyPermissions] = useState<Record<string, { canAccess: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }>>({});
    const [loadingMyPerms, setLoadingMyPerms] = useState(true);

    const fetchMyPermissions = async () => {
        setLoadingMyPerms(true);
        const res = await getMyPermissions();
        if (res.success && res.permissions) {
            setMyPermissions(res.permissions);
        }
        setLoadingMyPerms(false);
    };

    useEffect(() => {
        if (session?.user) {
            fetchVendors();
            fetchMyPermissions();
        }
    }, [session]);

    useEffect(() => {
        let result = [...vendorsList];
        if (activeTab === "active") {
            result = result.filter(v => v.status === "Active");
        } else if (activeTab === "pending") {
            result = result.filter(v => v.status === "Pending Audit");
        } else if (activeTab === "archived") {
            result = result.filter(v => v.status === "Archived");
        }
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(v =>
                (v.supplier && v.supplier.toLowerCase().includes(query)) ||
                v.nameOfVendor.toLowerCase().includes(query) ||
                (v.city && v.city.toLowerCase().includes(query)) ||
                (v.country && v.country.toLowerCase().includes(query)) ||
                (v.searchTerm && v.searchTerm.toLowerCase().includes(query))
            );
        }
        if (accountGroupFilter !== "all") {
            result = result.filter(v => v.accountGroup === accountGroupFilter);
        }
        if (currencyFilter !== "all") {
            result = result.filter(v => v.orderCurrency === currencyFilter);
        }
        setFilteredVendors(result);
        setCurrentPage(1);
    }, [vendorsList, activeTab, searchQuery, accountGroupFilter, currencyFilter]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center h-[60vh]">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Memuat data vendor...</p>
                </div>
            </div>
        );
    }

    const userRole = (session?.user as { role?: string })?.role;
    const isAuthorized = userRole === "admin" ||
        userRole === "procurement" ||
        myPermissions["vendors-master"]?.canAccess;

    const canCreate = userRole === "admin" ||
        myPermissions["vendors-master"]?.canCreate ||
        (userRole === "procurement" && myPermissions["vendors-master"]?.canCreate !== false);

    const canUpdate = userRole === "admin" ||
        myPermissions["vendors-master"]?.canUpdate ||
        (userRole === "procurement" && myPermissions["vendors-master"]?.canUpdate !== false);

    const canDelete = userRole === "admin" ||
        myPermissions["vendors-master"]?.canDelete;

    if (!session || !isAuthorized) {
        return (
            <div className="flex items-center justify-center h-[60vh] p-6">
                <div className="text-center max-w-sm">
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Akses Ditolak</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Halaman ini hanya dapat diakses oleh <strong>Super Admin</strong> atau <strong>Procurement Admin</strong>. Peran Anda saat ini adalah <strong>{userRole || "Guest"}</strong>.
                    </p>
                </div>
            </div>
        );
    }

    const activeSuppliersCount = vendorsList.filter(v => v.status === "Active").length;
    const pendingAuditCount = vendorsList.filter(v => v.status === "Pending Audit").length;
    const currenciesCount = new Set(vendorsList.map(v => v.orderCurrency).filter(Boolean)).size;

    const handleOpenCreate = () => {
        setEditId(null);
        setSupplier(""); setNameOfVendor(""); setStreet(""); setCountry("");
        setPostalCode(""); setCity(""); setAccountGroup("NCAD"); setSearchTerm("");
        setPurchOrganization("2000"); setPurchOrgDescr("Chitra (Central)");
        setTermsOfPayment(""); setIncoterms(""); setMinimumOrderValue("0.00");
        setOrderCurrency("USD"); setSalesperson(""); setTelephone("");
        setNumPurchasingOrgs(1); setStatus("Active");
        setIsFormOpen(true);
    };

    const handleOpenEdit = (v: VendorItem) => {
        setEditId(v.id);
        setSupplier(v.supplier || ""); setNameOfVendor(v.nameOfVendor);
        setStreet(v.street || ""); setCountry(v.country || "");
        setPostalCode(v.postalCode || ""); setCity(v.city || "");
        setAccountGroup(v.accountGroup); setSearchTerm(v.searchTerm || "");
        setPurchOrganization(v.purchOrganization); setPurchOrgDescr(v.purchOrgDescr);
        setTermsOfPayment(v.termsOfPayment || ""); setIncoterms(v.incoterms || "");
        setMinimumOrderValue(v.minimumOrderValue || "0.00"); setOrderCurrency(v.orderCurrency);
        setSalesperson(v.salesperson || ""); setTelephone(v.telephone || "");
        setNumPurchasingOrgs(v.numPurchasingOrgs); setStatus(v.status);
        setIsFormOpen(true);
    };

    const handleOpenDetails = async (v: VendorItem) => {
        setSelectedVendor(v);
        setDetailsTab("info");
        setIsDetailsOpen(true);
        setSelectedVendorDocs([]);
        try {
            const res = await getVendorDocuments(v.id);
            if (res.success && res.documents) {
                setSelectedVendorDocs(res.documents);
            }
        } catch (err) {
            console.error("Failed to fetch vendor documents:", err);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);
        const payload = {
            supplier, nameOfVendor, street: street || null, country: country || null,
            postalCode: postalCode || null, city: city || null, accountGroup,
            searchTerm: searchTerm || null, purchOrganization, purchOrgDescr,
            termsOfPayment: termsOfPayment || null, incoterms: incoterms || null,
            minimumOrderValue: minimumOrderValue || "0.00", orderCurrency,
            salesperson: salesperson || null, telephone: telephone || null,
            numPurchasingOrgs: Number(numPurchasingOrgs), status,
        };
        if (editId) {
            const res = await updateVendor(editId, payload);
            if (res.success) {
                setMessage({ type: "success", text: `Vendor ${nameOfVendor} berhasil diperbarui!` });
                setIsFormOpen(false); fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Gagal memperbarui vendor" });
            }
        } else {
            const res = await createVendor(payload);
            if (res.success) {
                setMessage({ type: "success", text: `Vendor ${nameOfVendor} berhasil ditambahkan!` });
                setIsFormOpen(false); fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Gagal membuat vendor" });
            }
        }
        setIsSaving(false);
    };

    const handleDelete = (v: VendorItem) => setVendorToDelete(v);

    const handleConfirmDelete = async () => {
        if (!vendorToDelete) return;
        setIsLoading(true);
        const res = await deleteVendor(vendorToDelete.id);
        if (res.success) {
            setMessage({ type: "success", text: `Vendor ${vendorToDelete.nameOfVendor} berhasil dihapus!` });
            fetchVendors();
        } else {
            setMessage({ type: "error", text: res.error || "Gagal menghapus vendor" });
            setIsLoading(false);
        }
        setVendorToDelete(null);
    };

    const handleExportCSV = () => {
        const headers = ["Supplier", "Name of Vendor", "Street", "Country", "Postal Code", "City", "Account Group", "Search Term", "Purch. Organization", "Purch. Org. Descr.", "Terms of Payment", "Incoterms", "Minimum Order Value", "Order Currency", "Salesperson", "Telephone", "Number of Purchasing Organizations", "Status"];
        const rows = filteredVendors.map((v) => [v.supplier, v.nameOfVendor, v.street || "", v.country || "", v.postalCode || "", v.city || "", v.accountGroup, v.searchTerm || "", v.purchOrganization, v.purchOrgDescr, v.termsOfPayment || "", v.incoterms || "", v.minimumOrderValue || "0.00", v.orderCurrency, v.salesperson || "", v.telephone || "", v.numPurchasingOrgs, v.status]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vendors_master_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);
    const uniqueGroups = Array.from(new Set(vendorsList.map(v => v.accountGroup)));
    const uniqueCurrencies = Array.from(new Set(vendorsList.map(v => v.orderCurrency)));

    const getInitials = (name: string) => {
        return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            "from-blue-500 to-blue-600",
            "from-violet-500 to-violet-600",
            "from-emerald-500 to-emerald-600",
            "from-orange-500 to-orange-600",
            "from-pink-500 to-pink-600",
            "from-teal-500 to-teal-600",
            "from-indigo-500 to-indigo-600",
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    return (
        <div className="p-5 md:p-7 w-full flex flex-1 flex-col gap-6">

            {/* Toast Notification */}
            {message && (
                <div className={`fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border animate-in slide-in-from-top-2 duration-300 max-w-sm ${message.type === "success"
                    ? "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-900 border-red-200 dark:border-red-800"
                    }`}>
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${message.type === "success" ? "bg-emerald-100 dark:bg-emerald-950/50" : "bg-red-100 dark:bg-red-950/50"}`}>
                        {message.type === "success"
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            : <ShieldAlert className="h-4 w-4 text-red-600" />}
                    </div>
                    <p className={`text-sm font-semibold flex-1 ${message.type === "success" ? "text-slate-800 dark:text-white" : "text-slate-800 dark:text-white"}`}>
                        {message.text}
                    </p>
                    <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors ml-1">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Master Data</span>
                            <span className="text-slate-300 dark:text-slate-600">/</span>
                            <span className="text-xs font-semibold text-blue-600">Vendors</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Vendor Master</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    {canCreate && (
                        <Button
                            onClick={() => setIsImportOpen(true)}
                            variant="outline"
                            className="gap-2 h-10 px-4 font-semibold text-sm rounded-xl border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 dark:hover:border-blue-700 transition-all"
                        >
                            <Upload className="h-4 w-4" /> Import Excel
                        </Button>
                    )}
                    <Button
                        onClick={handleExportCSV}
                        variant="outline"
                        className="gap-2 h-10 px-4 font-semibold text-sm rounded-xl border-slate-200 dark:border-slate-700 hover:border-slate-300 transition-all"
                    >
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    {canCreate && (
                        <Button
                            onClick={handleOpenCreate}
                            className="gap-2 h-10 px-4 font-semibold text-sm rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
                        >
                            <Plus className="h-4 w-4" /> Tambah Vendor
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Vendor</p>
                        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{vendorsList.length}</p>
                    <p className="text-xs text-slate-400 mt-2">Terdaftar dalam sistem</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aktif</p>
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{activeSuppliersCount}</p>
                    <div className="flex items-center gap-1 mt-2">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        <p className="text-xs text-emerald-600 font-semibold">Supplier aktif</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200 relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Audit</p>
                        <div className="h-8 w-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingAuditCount}</p>
                    {pendingAuditCount > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 font-semibold mt-2">Perlu verifikasi segera</p>
                    )}
                    {pendingAuditCount === 0 && (
                        <p className="text-xs text-slate-400 mt-2">Semua sudah terverifikasi</p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mata Uang</p>
                        <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-purple-600" />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{currenciesCount}</p>
                    <p className="text-xs text-slate-400 mt-2">Pasangan perdagangan global</p>
                </div>
            </div>

            {/* Controls Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Cari vendor berdasarkan kode, nama, kota, negara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 rounded-xl text-sm h-10 w-full focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-400"
                        />
                    </div>
                </div>

                {/* Tabs + Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3">
                    {/* Tab Pills */}
                    <div className="flex gap-1">
                        {[
                            { key: "all", label: "Semua", count: vendorsList.length },
                            { key: "active", label: "Aktif", count: activeSuppliersCount },
                            { key: "pending", label: "Pending", count: pendingAuditCount },
                            { key: "archived", label: "Diarsipkan", count: vendorsList.filter(v => v.status === "Archived").length },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key as "all" | "active" | "pending" | "archived")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                    }`}
                            >
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === tab.key ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"}`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <select
                            value={accountGroupFilter}
                            onChange={(e) => setAccountGroupFilter(e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold focus-visible:outline-none text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">Semua Grup</option>
                            {uniqueGroups.map((grp) => (
                                <option key={grp} value={grp}>{grp}</option>
                            ))}
                        </select>
                        <select
                            value={currencyFilter}
                            onChange={(e) => setCurrencyFilter(e.target.value)}
                            className="h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold focus-visible:outline-none text-slate-700 dark:text-slate-300"
                        >
                            <option value="all">Semua Mata Uang</option>
                            {uniqueCurrencies.map((cur) => (
                                <option key={cur} value={cur}>{cur}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="h-10 w-10 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
                            <p className="text-sm text-slate-400">Memuat data vendor...</p>
                        </div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="h-16 w-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                <Package className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-base font-semibold text-slate-600 dark:text-slate-400">Tidak ada vendor ditemukan</p>
                            <p className="text-sm text-slate-400">Coba ubah filter atau tambahkan vendor baru</p>
                            {canCreate && (
                                <Button onClick={handleOpenCreate} className="mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 px-4 text-sm font-semibold gap-2">
                                    <Plus className="h-4 w-4" /> Tambah Vendor Pertama
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-y border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Vendor</th>
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Kode Supplier</th>
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lokasi</th>
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Mata Uang</th>
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((v) => (
                                    <tr key={v.id} className="border-b border-slate-100 dark:border-slate-800/70 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
                                        {/* Vendor Name + Avatar */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${getAvatarColor(v.nameOfVendor)} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}>
                                                    {getInitials(v.nameOfVendor)}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => handleOpenDetails(v)}
                                                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left line-clamp-1"
                                                    >
                                                        {v.nameOfVendor}
                                                    </button>
                                                    {v.searchTerm && (
                                                        <p className="text-[11px] text-slate-400 mt-0.5">{v.searchTerm}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Supplier Code */}
                                        <td className="px-5 py-4">
                                            {v.supplier ? (
                                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                                    {v.supplier}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                                                    Belum Ditugaskan
                                                </span>
                                            )}
                                        </td>

                                        {/* Location */}
                                        <td className="px-5 py-4">
                                            {(v.city || v.country) ? (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                    <span className="text-slate-600 dark:text-slate-400 text-xs">
                                                        {[v.city, v.country].filter(Boolean).join(", ")}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                                            )}
                                        </td>

                                        {/* Currency */}
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
                                                {v.orderCurrency}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <StatusBadge status={v.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenDetails(v)}
                                                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                                    title="Lihat Detail"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                {canUpdate && (
                                                    <button
                                                        onClick={() => handleOpenEdit(v)}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(v)}
                                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                        <p className="text-xs text-slate-500">
                            Menampilkan <span className="font-semibold text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredVendors.length)}</span> dari <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredVendors.length}</span> vendor
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                .reduce<(number | "...")[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((item, idx) =>
                                    item === "..." ? (
                                        <span key={`e-${idx}`} className="px-1 text-slate-400 text-xs">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </span>
                                    ) : (
                                        <button
                                            key={item}
                                            onClick={() => setCurrentPage(item as number)}
                                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-all ${currentPage === item
                                                ? "bg-blue-600 text-white shadow-sm"
                                                : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                }`}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================ */}
            {/* MODAL: CREATE / EDIT VENDOR */}
            {/* ============================================ */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                    <Briefcase className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? "Edit Vendor" : "Tambah Vendor Baru"}</h2>
                                    <p className="text-xs text-slate-400">Isi data master vendor sesuai catatan finansial global</p>
                                </div>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSave}>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
                                {[
                                    { id: "supplier", label: "Kode Supplier *", value: supplier, setter: setSupplier, placeholder: "e.g. 2000000", required: true, mono: true },
                                    { id: "nameOfVendor", label: "Nama Vendor *", value: nameOfVendor, setter: setNameOfVendor, placeholder: "PT REMA TIP TOP INDONESIA", required: true },
                                ].map(f => (
                                    <div key={f.id} className="space-y-1.5">
                                        <Label htmlFor={f.id} className="text-xs font-semibold text-slate-500 dark:text-slate-400">{f.label}</Label>
                                        <Input id={f.id} value={f.value} onChange={e => f.setter(e.target.value)} required={f.required} placeholder={f.placeholder} disabled={isSaving} className={`h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${f.mono ? "font-mono" : ""}`} />
                                    </div>
                                ))}

                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="street" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alamat Jalan</Label>
                                    <Input id="street" value={street} onChange={e => setStreet(e.target.value)} placeholder="Jl. Taman Sari Raya No. 56" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="city" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kota</Label>
                                    <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Jakarta Barat" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="country" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kode Negara</Label>
                                    <Input id="country" value={country} onChange={e => setCountry(e.target.value)} placeholder="ID" maxLength={5} disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="postalCode" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Kode Pos</Label>
                                    <Input id="postalCode" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="11150" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="accountGroup" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Account Group</Label>
                                    <Input id="accountGroup" value={accountGroup} onChange={e => setAccountGroup(e.target.value)} required placeholder="NCAD" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="orderCurrency" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mata Uang</Label>
                                    <Input id="orderCurrency" value={orderCurrency} onChange={e => setOrderCurrency(e.target.value)} required placeholder="USD" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="termsOfPayment" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Terms of Payment</Label>
                                    <Input id="termsOfPayment" value={termsOfPayment} onChange={e => setTermsOfPayment(e.target.value)} placeholder="0015" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="incoterms" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Incoterms</Label>
                                    <Input id="incoterms" value={incoterms} onChange={e => setIncoterms(e.target.value)} placeholder="CFR" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="salesperson" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Salesperson</Label>
                                    <Input id="salesperson" value={salesperson} onChange={e => setSalesperson(e.target.value)} placeholder="Rica Cahyadi" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="telephone" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Telepon</Label>
                                    <Input id="telephone" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+62215551234" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="purchOrganization" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Org. Pembelian</Label>
                                    <Input id="purchOrganization" value={purchOrganization} onChange={e => setPurchOrganization(e.target.value)} placeholder="2000" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="purchOrgDescr" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Deskripsi Org. Pembelian</Label>
                                    <Input id="purchOrgDescr" value={purchOrgDescr} onChange={e => setPurchOrgDescr(e.target.value)} placeholder="Chitra (Central)" disabled={isSaving} className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</Label>
                                    <select id="status" value={status} onChange={e => setStatus(e.target.value)} disabled={isSaving} className="flex h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm focus-visible:outline-none text-slate-900 dark:text-white">
                                        <option value="Active">Active</option>
                                        <option value="Pending Audit">Pending Audit</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-xl h-10 px-5 font-semibold">Batal</Button>
                                <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-5 font-semibold shadow-md shadow-blue-500/20">
                                    {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Menyimpan...</> : (editId ? "Simpan Perubahan" : "Tambah Vendor")}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL: VIEW DETAILS */}
            {/* ============================================ */}
            {isDetailsOpen && selectedVendor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in zoom-in-95 duration-200">

                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${getAvatarColor(selectedVendor.nameOfVendor)} flex items-center justify-center text-white text-base font-bold shadow-lg shrink-0`}>
                                        {getInitials(selectedVendor.nameOfVendor)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{selectedVendor.nameOfVendor}</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            {selectedVendor.supplier ? (
                                                <span className="font-mono text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg">{selectedVendor.supplier}</span>
                                            ) : (
                                                <span className="text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-lg">Kode Belum Ditugaskan</span>
                                            )}
                                            <StatusBadge status={selectedVendor.status} />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailsOpen(false)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Detail Tabs */}
                            <div className="flex gap-1 mt-4">
                                {[
                                    { key: "info", label: "Info Umum", icon: Building2 },
                                    { key: "sop", label: "Data SOP", icon: FileText },
                                    { key: "documents", label: `Dokumen (${selectedVendorDocs.length})`, icon: Download },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setDetailsTab(tab.key as "info" | "sop" | "documents")}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${detailsTab === tab.key
                                            ? "bg-blue-600 text-white"
                                            : "text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                            }`}
                                    >
                                        <tab.icon className="h-3.5 w-3.5" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 max-h-[55vh] overflow-y-auto space-y-5">
                            {/* INFO TAB */}
                            {detailsTab === "info" && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <InfoField label="Account Group" value={selectedVendor.accountGroup} />
                                        <InfoField label="Mata Uang" value={selectedVendor.orderCurrency} mono />
                                        <InfoField label="Terms of Payment" value={selectedVendor.termsOfPayment} mono />
                                        <InfoField label="Incoterms" value={selectedVendor.incoterms} />
                                        <InfoField label="Min. Order Value" value={selectedVendor.minimumOrderValue ? `${selectedVendor.orderCurrency} ${selectedVendor.minimumOrderValue}` : null} mono />
                                        <InfoField label="Search Term" value={selectedVendor.searchTerm} />
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Lokasi & Kontak</p>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-3">
                                                <InfoField
                                                    label="Alamat Lengkap"
                                                    value={[selectedVendor.street, selectedVendor.city, selectedVendor.country, selectedVendor.postalCode].filter(Boolean).join(", ")}
                                                    icon={<MapPin className="h-3.5 w-3.5" />}
                                                />
                                            </div>
                                            <InfoField label="Salesperson" value={selectedVendor.salesperson} icon={<Users className="h-3.5 w-3.5" />} />
                                            <InfoField label="Telepon" value={selectedVendor.telephone} icon={<Phone className="h-3.5 w-3.5" />} mono />
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Organisasi Pembelian</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <InfoField label="Kode Org." value={selectedVendor.purchOrganization} mono />
                                            <InfoField label="Deskripsi Org." value={selectedVendor.purchOrgDescr} />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
                                        <span>Dibuat: {new Date(selectedVendor.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                        <span>Diperbarui: {new Date(selectedVendor.updatedAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                    </div>
                                </div>
                            )}

                            {/* SOP TAB */}
                            {detailsTab === "sop" && (
                                <div className="space-y-4">
                                    {selectedVendor.vendorType ? (
                                        <>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <InfoField label="Tipe Vendor" value={selectedVendor.vendorType?.replace("_", " ")} />
                                                <InfoField label="Status PKP" value={selectedVendor.pkpStatus} />
                                                <InfoField label="Klasifikasi Usaha" value={selectedVendor.classification} />
                                                {selectedVendor.vendorType === "badan_usaha" ? (
                                                    <>
                                                        <InfoField label="NPWP Perusahaan" value={selectedVendor.npwp} mono />
                                                        <InfoField label="NIB" value={selectedVendor.nib} mono />
                                                    </>
                                                ) : (
                                                    <>
                                                        <InfoField label="NIK" value={selectedVendor.nik} mono />
                                                        <InfoField label="NPWP Pribadi" value={selectedVendor.npwp} mono />
                                                    </>
                                                )}
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">PIC & Kontak</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <InfoField label="Nama PIC" value={selectedVendor.picName} icon={<Users className="h-3.5 w-3.5" />} />
                                                    <InfoField label="Telepon PIC" value={selectedVendor.picPhone} icon={<Phone className="h-3.5 w-3.5" />} mono />
                                                    <InfoField label="Email PIC" value={selectedVendor.picEmail} icon={<Mail className="h-3.5 w-3.5" />} />
                                                    <InfoField label="Email Perusahaan" value={selectedVendor.emailCompany} icon={<Mail className="h-3.5 w-3.5" />} />
                                                </div>
                                            </div>
                                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Informasi Bank</p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <InfoField label="Bank" value={selectedVendor.bankName} />
                                                    <InfoField label="No. Rekening" value={selectedVendor.bankAccountNo} mono />
                                                    <InfoField label="Nama Pemilik" value={selectedVendor.bankAccountName} />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${selectedVendor.isBankAccountDiffName ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                                                        <Checkbox checked={selectedVendor.isBankAccountDiffName} disabled />
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nama Rekening Berbeda</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 p-3 rounded-xl border ${selectedVendor.isAssetOwnerDiff ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                                                        <Checkbox checked={selectedVendor.isAssetOwnerDiff} disabled />
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Aset Pihak Ketiga</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <FileText className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tidak Ada Data SOP</p>
                                            <p className="text-xs text-slate-400">Vendor ini belum melengkapi data SOP registrasi.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DOCUMENTS TAB */}
                            {detailsTab === "documents" && (
                                <div className="space-y-3">
                                    {selectedVendorDocs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <Download className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tidak Ada Dokumen</p>
                                            <p className="text-xs text-slate-400">Belum ada dokumen yang diunggah oleh vendor ini.</p>
                                        </div>
                                    ) : (
                                        selectedVendorDocs.map((doc) => {
                                            const docLabels: Record<string, string> = {
                                                npwp_scan: "Scan NPWP",
                                                ktp_director: "Scan KTP Direktur",
                                                nib_scan: "Scan NIB",
                                                akta_establishment: "Scan Akta Pendirian",
                                                pkp_letter: "Surat Pengukuhan PKP",
                                                ktp_personal: "Scan KTP Personal",
                                                non_pkp_statement: "Surat Non-PKP",
                                                power_attorney_bank: "Surat Kuasa Rekening",
                                                power_attorney_asset: "Surat Kuasa Aset"
                                            };
                                            return (
                                                <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 gap-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                                                            <FileText className="h-4 w-4 text-blue-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">{docLabels[doc.docType] || doc.docType}</p>
                                                            <p className="text-[11px] text-slate-400 truncate">{doc.fileName}</p>
                                                        </div>
                                                    </div>
                                                    <Button asChild size="sm" variant="outline" className="h-8 rounded-lg font-semibold shrink-0 text-xs">
                                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download>
                                                            <Download className="h-3.5 w-3.5 mr-1" /> Download
                                                        </a>
                                                    </Button>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
                            <div className="flex gap-2">
                                {canUpdate && (
                                    <Button
                                        type="button"
                                        onClick={() => { setIsDetailsOpen(false); handleOpenEdit(selectedVendor); }}
                                        variant="outline"
                                        className="h-9 px-4 rounded-xl text-sm font-semibold gap-1.5 border-slate-200 dark:border-slate-700"
                                    >
                                        <Edit2 className="h-4 w-4" /> Edit
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button
                                        type="button"
                                        onClick={() => { setIsDetailsOpen(false); handleDelete(selectedVendor); }}
                                        variant="outline"
                                        className="h-9 px-4 rounded-xl text-sm font-semibold gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/20 dark:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4" /> Hapus
                                    </Button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {selectedVendor.status === "Pending Audit" && canUpdate && (
                                    <Button
                                        type="button"
                                        onClick={() => { setApproveTop(""); setIsApproveOpen(true); }}
                                        className="h-9 px-4 rounded-xl text-sm font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                                    >
                                        <CheckCircle2 className="h-4 w-4" /> Verifikasi & Setujui
                                    </Button>
                                )}
                                <Button
                                    type="button"
                                    onClick={() => setIsDetailsOpen(false)}
                                    variant="outline"
                                    className="h-9 px-4 rounded-xl text-sm font-semibold border-slate-200 dark:border-slate-700"
                                >
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL: VERIFY & APPROVE */}
            {/* ============================================ */}
            {isApproveOpen && selectedVendor && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[55]">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b border-slate-100 dark:border-slate-800">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verifikasi Vendor</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Setujui registrasi <strong className="text-slate-700 dark:text-slate-300">{selectedVendor.nameOfVendor}</strong> dan tentukan Term of Payment (TOP). Kode supplier akan dibuat otomatis.
                            </p>
                        </div>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!approveTop.trim()) { alert("Term of Payment wajib diisi!"); return; }
                            setIsApproving(true);
                            try {
                                const res = await approveVendor(selectedVendor.id, approveTop.trim());
                                if (res.success) {
                                    setMessage({ type: "success", text: `Vendor ${selectedVendor.nameOfVendor} berhasil diverifikasi dengan TOP: ${approveTop} Hari` });
                                    setIsApproveOpen(false); setIsDetailsOpen(false); fetchVendors();
                                } else { alert(res.error || "Gagal menyetujui vendor"); }
                            } catch (err) { console.error(err); alert("Terjadi kesalahan koneksi"); }
                            finally { setIsApproving(false); }
                        }}>
                            <div className="p-6 space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="approveTop" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                        Term of Payment (TOP) / Hari <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="approveTop"
                                        type="number"
                                        min="0"
                                        value={approveTop}
                                        onChange={e => setApproveTop(e.target.value)}
                                        required
                                        placeholder="Masukkan jumlah hari jatuh tempo (e.g. 30)"
                                        disabled={isApproving}
                                        className="h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-mono"
                                    />
                                    <p className="text-[11px] text-slate-400">Jumlah hari untuk perhitungan otomatis jatuh tempo invoice dari vendor ini.</p>
                                </div>
                            </div>
                            <div className="flex gap-3 px-6 pb-6">
                                <Button type="button" variant="outline" onClick={() => setIsApproveOpen(false)} disabled={isApproving} className="flex-1 h-10 rounded-xl font-semibold">Batal</Button>
                                <Button type="submit" disabled={isApproving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-10 rounded-xl font-semibold shadow-md shadow-emerald-500/20">
                                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Setujui"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL: DELETE CONFIRMATION */}
            {/* ============================================ */}
            {vendorToDelete && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-red-100 dark:border-red-900/50 animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mx-auto mb-3 border border-red-100 dark:border-red-900/50">
                                <AlertTriangle className="h-7 w-7 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Hapus Vendor?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Anda yakin ingin menghapus <strong className="text-slate-700 dark:text-slate-300">{vendorToDelete.nameOfVendor}</strong>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <Button type="button" variant="outline" onClick={() => setVendorToDelete(null)} disabled={isLoading} className="flex-1 h-10 rounded-xl font-semibold">Batal</Button>
                            <Button type="button" onClick={handleConfirmDelete} disabled={isLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white h-10 rounded-xl font-semibold shadow-md shadow-red-500/20">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* MODAL: IMPORT EXCEL/CSV */}
            {/* ============================================ */}
            {isImportOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 z-50 overflow-y-auto">
                    <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
                                    <Upload className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Import Vendor dari Spreadsheet</h2>
                                    <p className="text-xs text-slate-400">Seret dan lepas file Excel (.xlsx) atau CSV Anda</p>
                                </div>
                            </div>
                            <button onClick={() => { setIsImportOpen(false); setImportFile(null); }} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-6">
                            {!importFile ? (
                                <div
                                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]); }}
                                    onClick={() => document.getElementById("excel-file-input")?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-14 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${isDragOver ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" : "border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/20"}`}
                                >
                                    <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                                        <Upload className="h-8 w-8 text-slate-400" />
                                    </div>
                                    <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">Seret file spreadsheet ke sini</h3>
                                    <p className="text-xs text-slate-400 mt-1.5">Mendukung Excel (.xlsx) atau CSV</p>
                                    <Button variant="outline" className="mt-5 rounded-xl h-9 px-5 font-semibold text-sm">Pilih File</Button>
                                    <input id="excel-file-input" type="file" accept=".xlsx,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }} />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                                                <FileText className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{importFile.name}</p>
                                                <p className="text-xs text-slate-400">{(importFile.size / 1024).toFixed(1)} KB • {parsedRows.length} baris ditemukan</p>
                                            </div>
                                        </div>
                                        <Button onClick={() => { setImportFile(null); setParsedHeaders([]); setParsedRows([]); }} variant="outline" className="h-8 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg font-semibold border-red-200 dark:border-red-800">
                                            Ganti File
                                        </Button>
                                    </div>

                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5"><Filter className="h-4 w-4 text-blue-600" /> Pemetaan Kolom Database</p>
                                        <p className="text-xs text-slate-400 mb-3">Cocokkan kolom dari spreadsheet ke field database.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                                            {dbFields.map(field => (
                                                <div key={field.key} className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5 last:border-0 last:pb-0">
                                                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">{field.label}</Label>
                                                    <select
                                                        value={columnMapping[field.key] || ""}
                                                        onChange={e => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                                                        className="h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 focus-visible:outline-none w-52 font-medium"
                                                    >
                                                        <option value="">[Abaikan / Default]</option>
                                                        {parsedHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
                            <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportFile(null); }} disabled={isImporting} className="rounded-xl font-semibold h-10 px-5">Batal</Button>
                            {importFile && (
                                <Button onClick={handleCommitImport} disabled={isImporting} className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold h-10 px-5 shadow-md shadow-violet-500/20">
                                    {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengimpor...</> : `Impor ${parsedRows.length} Baris`}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper component for displaying info fields
function InfoField({ label, value, mono = false, icon }: { label: string; value?: string | number | null; mono?: boolean; icon?: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            {value ? (
                <p className={`text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 ${mono ? "font-mono" : ""}`}>
                    {icon && <span className="text-slate-400">{icon}</span>}
                    {value}
                </p>
            ) : (
                <p className="text-sm text-slate-300 dark:text-slate-600">—</p>
            )}
        </div>
    );
}
