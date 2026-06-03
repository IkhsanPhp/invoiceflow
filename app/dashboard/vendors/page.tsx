"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getVendors, createVendor, updateVendor, deleteVendor, importVendors } from "./actions";
import { getMyPermissions } from "@/app/dashboard/users/actions";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Loader2, 
    ShieldAlert, 
    Plus, 
    Edit2, 
    Trash2, 
    Eye, 
    Download, 
    Search,
    MapPin,
    CheckCircle2,
    X,
    Filter,
    Activity,
    AlertTriangle,
    CreditCard,
    DollarSign,
    Briefcase
} from "lucide-react";

interface VendorItem {
    id: string;
    supplier: string;
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
}

export default function VendorsMasterPage() {
    const { data: session, isPending: sessionPending } = useSession();
    const [vendorsList, setVendorsList] = useState<VendorItem[]>([]);
    const [filteredVendors, setFilteredVendors] = useState<VendorItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Active Category tab
    const [activeTab, setActiveTab] = useState<"all" | "country" | "partners" | "archived">("all");

    // Modal forms
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<VendorItem | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<VendorItem | null>(null);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [accountGroupFilter, setAccountGroupFilter] = useState("all");
    const [currencyFilter, setCurrencyFilter] = useState("all");

    // Form inputs state
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Excel/CSV Import states
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>("");
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
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.replace(/^"|"$/g, '').trim());
                            current = "";
                        } else {
                            current += char;
                        }
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
                setMessage({ type: "success", text: `Successfully imported ${res.count} vendors from spreadsheet!` });
                setIsImportOpen(false);
                setImportFile(null);
                setParsedHeaders([]);
                setParsedRows([]);
                fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Failed to import vendors" });
            }
        } catch (error: unknown) {
            console.error("Import error:", error);
            const errMsg = error instanceof Error ? error.message : "An unexpected error occurred during import.";
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
            setMessage({ type: "error", text: result.error || "Failed to load vendors" });
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

    // Apply filtering whenever tab, search query, or filters change
    useEffect(() => {
        let result = [...vendorsList];

        // 1. Tab category filters
        if (activeTab === "archived") {
            result = result.filter(v => v.status === "Archived");
        } else if (activeTab === "partners") {
            // e.g. status is active and search term is non-empty
            result = result.filter(v => v.status === "Active" && v.searchTerm !== "");
        } else if (activeTab === "country") {
            // Filter by specific countries or just sorting, let's keep all active vendors sorted/grouped by country
            result = result.filter(v => v.status !== "Archived");
            result.sort((a, b) => (a.country || "").localeCompare(b.country || ""));
        } else {
            // All active/pending vendors
            result = result.filter(v => v.status !== "Archived");
        }

        // 2. Search query filter
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter(v => 
                v.supplier.toLowerCase().includes(query) ||
                v.nameOfVendor.toLowerCase().includes(query) ||
                (v.city && v.city.toLowerCase().includes(query)) ||
                (v.country && v.country.toLowerCase().includes(query)) ||
                (v.searchTerm && v.searchTerm.toLowerCase().includes(query))
            );
        }

        // 3. Dropdown combobox filters
        if (accountGroupFilter !== "all") {
            result = result.filter(v => v.accountGroup === accountGroupFilter);
        }
        if (currencyFilter !== "all") {
            result = result.filter(v => v.orderCurrency === currencyFilter);
        }

        setFilteredVendors(result);
        setCurrentPage(1); // Reset page on filter
    }, [vendorsList, activeTab, searchQuery, accountGroupFilter, currencyFilter]);

    if (sessionPending || loadingMyPerms) {
        return (
            <div className="flex flex-1 items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Dynamic Access Control Check
    const userRole = (session?.user as { role?: string })?.role;
    const isAuthorized = userRole === "admin" || myPermissions["vendors-master"]?.canAccess;

    if (!session || !isAuthorized) {
        return (
            <div className="p-6 max-w-lg mx-auto mt-12">
                <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-2">
                            <ShieldAlert className="h-12 w-12 text-red-600 dark:text-red-400" />
                        </div>
                        <CardTitle className="text-red-700 dark:text-red-400">Akses Ditolak (Unauthorized)</CardTitle>
                        <CardDescription className="text-red-600/80 dark:text-red-400/80">
                            Halaman ini hanya dapat diakses oleh aktor **Super Admin**. Peran Anda saat ini adalah **{userRole || "Guest"}**.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    // Calculations for scorecards
    const activeSuppliersCount = vendorsList.filter(v => v.status === "Active").length;
    const pendingAuditCount = vendorsList.filter(v => v.status === "Pending Audit").length;
    const currenciesCount = new Set(vendorsList.map(v => v.orderCurrency).filter(Boolean)).size;

    // Handle create modal opening
    const handleOpenCreate = () => {
        setEditId(null);
        setSupplier("");
        setNameOfVendor("");
        setStreet("");
        setCountry("");
        setPostalCode("");
        setCity("");
        setAccountGroup("NCAD");
        setSearchTerm("");
        setPurchOrganization("2000");
        setPurchOrgDescr("Chitra (Central)");
        setTermsOfPayment("");
        setIncoterms("");
        setMinimumOrderValue("0.00");
        setOrderCurrency("USD");
        setSalesperson("");
        setTelephone("");
        setNumPurchasingOrgs(1);
        setStatus("Active");
        setIsFormOpen(true);
    };

    // Handle edit modal opening
    const handleOpenEdit = (v: VendorItem) => {
        setEditId(v.id);
        setSupplier(v.supplier);
        setNameOfVendor(v.nameOfVendor);
        setStreet(v.street || "");
        setCountry(v.country || "");
        setPostalCode(v.postalCode || "");
        setCity(v.city || "");
        setAccountGroup(v.accountGroup);
        setSearchTerm(v.searchTerm || "");
        setPurchOrganization(v.purchOrganization);
        setPurchOrgDescr(v.purchOrgDescr);
        setTermsOfPayment(v.termsOfPayment || "");
        setIncoterms(v.incoterms || "");
        setMinimumOrderValue(v.minimumOrderValue || "0.00");
        setOrderCurrency(v.orderCurrency);
        setSalesperson(v.salesperson || "");
        setTelephone(v.telephone || "");
        setNumPurchasingOrgs(v.numPurchasingOrgs);
        setStatus(v.status);
        setIsFormOpen(true);
    };

    // Handle view details opening
    const handleOpenDetails = (v: VendorItem) => {
        setSelectedVendor(v);
        setIsDetailsOpen(true);
    };

    // Form submission saving
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        const payload = {
            supplier,
            nameOfVendor,
            street: street || null,
            country: country || null,
            postalCode: postalCode || null,
            city: city || null,
            accountGroup,
            searchTerm: searchTerm || null,
            purchOrganization,
            purchOrgDescr,
            termsOfPayment: termsOfPayment || null,
            incoterms: incoterms || null,
            minimumOrderValue: minimumOrderValue || "0.00",
            orderCurrency,
            salesperson: salesperson || null,
            telephone: telephone || null,
            numPurchasingOrgs: Number(numPurchasingOrgs),
            status,
        };

        if (editId) {
            const res = await updateVendor(editId, payload);
            if (res.success) {
                setMessage({ type: "success", text: `Successfully updated vendor: ${nameOfVendor}!` });
                setIsFormOpen(false);
                fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Failed to update vendor" });
            }
        } else {
            const res = await createVendor(payload);
            if (res.success) {
                setMessage({ type: "success", text: `Successfully created vendor: ${nameOfVendor}!` });
                setIsFormOpen(false);
                fetchVendors();
            } else {
                setMessage({ type: "error", text: res.error || "Failed to create vendor" });
            }
        }
        setIsSaving(false);
    };

    // Handle delete vendor
    const handleDelete = (v: VendorItem) => {
        setVendorToDelete(v);
    };

    const handleConfirmDelete = async () => {
        if (!vendorToDelete) return;
        setIsLoading(true);
        const res = await deleteVendor(vendorToDelete.id);
        if (res.success) {
            setMessage({ type: "success", text: `Successfully deleted vendor: ${vendorToDelete.nameOfVendor}!` });
            fetchVendors();
        } else {
            setMessage({ type: "error", text: res.error || "Failed to delete vendor" });
            setIsLoading(false);
        }
        setVendorToDelete(null);
    };

    // Export Excel/CSV
    const handleExportCSV = () => {
        const headers = [
            "Supplier", "Name of Vendor", "Street", "Country", "Postal Code", "City", 
            "Account Group", "Search Term", "Purch. Organization", "Purch. Org. Descr.", 
            "Terms of Payment", "Incoterms", "Minimum Order Value", "Order Currency", 
            "Salesperson", "Telephone", "Number of Purchasing Organizations", "Status"
        ];
        
        const rows = filteredVendors.map((v) => [
            v.supplier, v.nameOfVendor, v.street || "", v.country || "", v.postalCode || "", v.city || "",
            v.accountGroup, v.searchTerm || "", v.purchOrganization, v.purchOrgDescr,
            v.termsOfPayment || "", v.incoterms || "", v.minimumOrderValue || "0.00", v.orderCurrency,
            v.salesperson || "", v.telephone || "", v.numPurchasingOrgs, v.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vendors_master_${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredVendors.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

    const getPageNumbers = () => {
        const pageNumbers = [];
        const maxPageButtons = 5;
        if (totalPages <= maxPageButtons) {
            for (let i = 1; i <= totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pageNumbers.push(1, 2, 3, 4, "ellipsis-right", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pageNumbers.push(1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pageNumbers.push(1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages);
            }
        }
        return pageNumbers;
    };

    // Dynamic unique options for dropdown filters
    const uniqueGroups = Array.from(new Set(vendorsList.map(v => v.accountGroup)));
    const uniqueCurrencies = Array.from(new Set(vendorsList.map(v => v.orderCurrency)));

    return (
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-1 flex-col gap-6 select-none relative">
            
            {/* Breadcrumbs */}
            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                Master Data / <span className="text-blue-600 font-semibold">Vendors</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-parkinsans tracking-tight">Master Data Vendor</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage and audit your global supplier network. <span className="text-blue-600 font-bold">{vendorsList.length} total records.</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button onClick={() => setIsImportOpen(true)} variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg h-10 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        <Plus className="h-4 w-4 text-slate-400" /> Import Excel/CSV
                    </Button>
                    <Button onClick={handleExportCSV} variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg h-10 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        <Download className="h-4 w-4 text-slate-400" /> Export Data
                    </Button>
                    <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 rounded-lg h-10 px-4 shadow-sm">
                        <Plus className="h-4 w-4" /> Add New Vendor
                    </Button>
                </div>
            </div>

            {/* Notification alert */}
            {message && (
                <div className={`p-4 rounded-lg flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 ${
                    message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400" : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-400"
                }`}>
                    <div className="flex items-center gap-2.5">
                        {message.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-red-600" />}
                        <span className="text-sm font-semibold">{message.text}</span>
                    </div>
                    <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100 transition-opacity">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Scorecards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Suppliers</span>
                        <div className="h-8 w-8 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{activeSuppliersCount.toLocaleString()}</div>
                        <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1">
                            <span>↗ +12% this month</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Terms</span>
                        <div className="h-8 w-8 bg-purple-50 dark:bg-purple-950/40 rounded-lg flex items-center justify-center">
                            <CreditCard className="h-4 w-4 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">Net 30</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            STANDARD ACROSS 84% VENDORS
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Audit</span>
                        <div className="h-8 w-8 bg-red-50 dark:bg-red-950/40 rounded-lg flex items-center justify-center">
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{pendingAuditCount}</div>
                        <p className="text-[10px] font-semibold text-red-600 mt-2">
                            Requires immediate attention
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl p-2 relative overflow-hidden transition-all hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-1">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Currencies</span>
                        <div className="h-8 w-8 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-extrabold text-slate-950 dark:text-white font-parkinsans">{currenciesCount}</div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2">
                            Global trading pairs
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Controls panel: Filter Tabs, Search and Multi-select filtering */}
            <div className="flex flex-col gap-4 bg-white dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
                
                {/* Search query input */}
                <div className="relative w-full">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search vendors by supplier code, name, city, country, or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm h-10 w-full"
                    />
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border-t pt-3">
                    
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("all")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "all" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            All Vendors
                        </button>
                        <button
                            onClick={() => setActiveTab("country")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "country" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            By Country
                        </button>
                        <button
                            onClick={() => setActiveTab("partners")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "partners" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Strategic Partners
                        </button>
                        <button
                            onClick={() => setActiveTab("archived")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                activeTab === "archived" ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            Archived
                        </button>
                    </div>

                    {/* Filter drop boxes */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
                            <Filter className="h-3 w-3" /> Filter by:
                        </span>
                        
                        {/* Account Group filter dropdown */}
                        <select
                            value={accountGroupFilter}
                            onChange={(e) => setAccountGroupFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-1 text-xs font-semibold focus-visible:outline-none w-32"
                        >
                            <option value="all">Account Group</option>
                            {uniqueGroups.map((grp) => (
                                <option key={grp} value={grp}>{grp}</option>
                            ))}
                        </select>

                        {/* Order Currency filter dropdown */}
                        <select
                            value={currencyFilter}
                            onChange={(e) => setCurrencyFilter(e.target.value)}
                            className="h-9 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-1 text-xs font-semibold focus-visible:outline-none w-32"
                        >
                            <option value="all">Currency</option>
                            {uniqueCurrencies.map((cur) => (
                                <option key={cur} value={cur}>{cur}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* List Table Card */}
            <Card className="border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm rounded-2xl overflow-hidden transition-all">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 font-medium">No vendors found matching criteria.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/30">
                                        <th className="px-5 py-3">Supplier</th>
                                        <th className="px-5 py-3">Name of Vendor</th>
                                        <th className="px-5 py-3">Street</th>
                                        <th className="px-5 py-3">Country</th>
                                        <th className="px-5 py-3">Postal Code</th>
                                        <th className="px-5 py-3">City</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                                    {currentItems.map((v) => (
                                        <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors group">
                                            <td className="px-5 py-3.5">
                                                <button 
                                                    onClick={() => handleOpenDetails(v)}
                                                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline text-left font-mono"
                                                >
                                                    {v.supplier}
                                                </button>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors">{v.nameOfVendor}</div>
                                                {v.searchTerm && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Search term: {v.searchTerm}</div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={v.street || ""}>
                                                {v.street || "-"}
                                            </td>
                                            <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-300">
                                                {v.country || "-"}
                                            </td>
                                            <td className="px-5 py-3.5 font-medium text-slate-500 dark:text-slate-400 font-mono">
                                                {v.postalCode || "-"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{v.city || "-"}</div>
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-2.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenDetails(v)} className="h-8 w-8 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleOpenEdit(v)} className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(v)} className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-2">
                    <div className="text-xs font-semibold text-slate-400">
                        Showing <span className="text-slate-700 dark:text-slate-300">{indexOfFirstItem + 1}</span> to <span className="text-slate-700 dark:text-slate-300">{Math.min(indexOfLastItem, filteredVendors.length)}</span> of <span className="text-slate-700 dark:text-slate-300">{filteredVendors.length}</span> vendors
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button 
                            disabled={currentPage === 1} 
                            onClick={() => setCurrentPage(currentPage - 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &lt;
                        </Button>
                        {getPageNumbers().map((pageNum, idx) => {
                            if (pageNum === "ellipsis-left" || pageNum === "ellipsis-right") {
                                return (
                                    <span key={`ellipsis-${idx}`} className="text-slate-400 dark:text-slate-500 text-xs px-1 select-none font-bold">
                                        ...
                                    </span>
                                );
                            }
                            const pageVal = pageNum as number;
                            return (
                                <Button
                                    key={pageVal}
                                    onClick={() => setCurrentPage(pageVal)}
                                    variant={currentPage === pageVal ? "default" : "outline"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-lg text-xs font-bold ${currentPage === pageVal ? "bg-blue-600 text-white" : ""}`}
                                >
                                    {pageVal}
                                </Button>
                            );
                        })}
                        <Button 
                            disabled={currentPage === totalPages} 
                            onClick={() => setCurrentPage(currentPage + 1)}
                            variant="outline" 
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            &gt;
                        </Button>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button 
                onClick={handleOpenCreate}
                className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center z-45 transition-all"
                title="Add New Vendor"
            >
                <Plus className="h-6 w-6 font-bold" />
            </button>

            {/* Dialog Form Modal (Create and Edit) */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300 overflow-y-auto">
                    <Card className="w-full max-w-3xl bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden my-8">
                        <CardHeader className="relative border-b pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-xl font-bold font-parkinsans text-slate-900 dark:text-white flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-blue-600" /> {editId ? "Update Vendor Master" : "Register New Vendor"}
                            </CardTitle>
                            <CardDescription>
                                Lengkapi rincian master vendor berdasarkan catatan ledger sistem finansial global.
                            </CardDescription>
                            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <form onSubmit={handleSave}>
                            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
                                
                                {/* Supplier Code */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="supplier" className="text-xs font-bold text-slate-400 uppercase">Supplier Code *</Label>
                                    <Input id="supplier" type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} required placeholder="e.g. 2000000" disabled={isSaving} className="font-mono h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Name of Vendor */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="nameOfVendor" className="text-xs font-bold text-slate-400 uppercase">Name of Vendor *</Label>
                                    <Input id="nameOfVendor" type="text" value={nameOfVendor} onChange={(e) => setNameOfVendor(e.target.value)} required placeholder="PT REMA TIP TOP INDONESIA" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Street */}
                                <div className="space-y-1.5 md:col-span-2">
                                    <Label htmlFor="street" className="text-xs font-bold text-slate-400 uppercase">Street Address</Label>
                                    <Input id="street" type="text" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Jl. Taman Sari Raya No. 56 56MD" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* City */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="city" className="text-xs font-bold text-slate-400 uppercase">City</Label>
                                    <Input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Jakarta Barat" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Country */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="country" className="text-xs font-bold text-slate-400 uppercase">Country Code</Label>
                                    <Input id="country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="ID" maxLength={5} disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900 font-semibold" />
                                </div>

                                {/* Postal Code */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="postalCode" className="text-xs font-bold text-slate-400 uppercase">Postal Code</Label>
                                    <Input id="postalCode" type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="11150" disabled={isSaving} className="font-mono h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Account Group */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="accountGroup" className="text-xs font-bold text-slate-400 uppercase">Account Group</Label>
                                    <Input id="accountGroup" type="text" value={accountGroup} onChange={(e) => setAccountGroup(e.target.value)} required placeholder="NCAD" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Search Term */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="searchTerm" className="text-xs font-bold text-slate-400 uppercase">Search Term</Label>
                                    <Input id="searchTerm" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="REMA" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Order Currency */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="orderCurrency" className="text-xs font-bold text-slate-400 uppercase">Order Currency</Label>
                                    <Input id="orderCurrency" type="text" value={orderCurrency} onChange={(e) => setOrderCurrency(e.target.value)} required placeholder="USD" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Terms of Payment */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="termsOfPayment" className="text-xs font-bold text-slate-400 uppercase">Terms of Payment</Label>
                                    <Input id="termsOfPayment" type="text" value={termsOfPayment} onChange={(e) => setTermsOfPayment(e.target.value)} placeholder="0015" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900 font-mono" />
                                </div>

                                {/* Incoterms */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="incoterms" className="text-xs font-bold text-slate-400 uppercase">Incoterms</Label>
                                    <Input id="incoterms" type="text" value={incoterms} onChange={(e) => setIncoterms(e.target.value)} placeholder="CFR" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Minimum Order Value */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="minimumOrderValue" className="text-xs font-bold text-slate-400 uppercase">Minimum Order Value</Label>
                                    <Input id="minimumOrderValue" type="text" value={minimumOrderValue} onChange={(e) => setMinimumOrderValue(e.target.value)} placeholder="0.00" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900 font-mono" />
                                </div>

                                {/* Salesperson */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="salesperson" className="text-xs font-bold text-slate-400 uppercase">Salesperson</Label>
                                    <Input id="salesperson" type="text" value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="Rica Cahyadi" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Telephone */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="telephone" className="text-xs font-bold text-slate-400 uppercase">Telephone</Label>
                                    <Input id="telephone" type="text" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+62215551234" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Purch. Organization */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="purchOrganization" className="text-xs font-bold text-slate-400 uppercase">Purch. Organization</Label>
                                    <Input id="purchOrganization" type="text" value={purchOrganization} onChange={(e) => setPurchOrganization(e.target.value)} placeholder="2000" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Purch. Org. Descr. */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="purchOrgDescr" className="text-xs font-bold text-slate-400 uppercase">Purch. Org. Description</Label>
                                    <Input id="purchOrgDescr" type="text" value={purchOrgDescr} onChange={(e) => setPurchOrgDescr(e.target.value)} placeholder="Chitra (Central)" disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Num of Purchasing Orgs */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="numPurchasingOrgs" className="text-xs font-bold text-slate-400 uppercase">Number of Purchasing Organizations</Label>
                                    <Input id="numPurchasingOrgs" type="number" value={numPurchasingOrgs} onChange={(e) => setNumPurchasingOrgs(Number(e.target.value))} min={1} required disabled={isSaving} className="h-10 rounded-lg bg-slate-50/50 dark:bg-slate-900" />
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-bold text-slate-400 uppercase">Status</Label>
                                    <select 
                                        id="status" 
                                        value={status} 
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-3 py-2 text-sm focus-visible:outline-none"
                                        disabled={isSaving}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Pending Audit">Pending Audit</option>
                                        <option value="Archived">Archived</option>
                                    </select>
                                </div>

                            </CardContent>
                            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving} className="rounded-lg">Cancel</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 shadow-sm font-semibold" disabled={isSaving}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Vendor"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}

            {/* Excel / CSV Import Mapping Modal */}
            {isImportOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300 overflow-y-auto">
                    <Card className="w-full max-w-4xl bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative border-b pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-xl font-bold font-parkinsans text-slate-900 dark:text-white flex items-center gap-2">
                                <Download className="h-5 w-5 text-blue-600" /> Import Vendors from Spreadsheet
                            </CardTitle>
                            <CardDescription>
                                Drag and drop your Excel (.xlsx) or CSV file, and map your spreadsheet columns to the database fields.
                            </CardDescription>
                            <button onClick={() => { setIsImportOpen(false); setImportFile(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 max-h-[65vh] overflow-y-auto scrollbar-thin">
                            
                            {!importFile ? (
                                // File Dropzone
                                <div 
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setIsDragOver(false);
                                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                            handleFileChange(e.dataTransfer.files[0]);
                                        }
                                    }}
                                    className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center cursor-pointer transition-all ${
                                        isDragOver 
                                            ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20" 
                                            : "border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-slate-50/50 dark:hover:bg-slate-900/20"
                                    }`}
                                    onClick={() => document.getElementById("excel-file-input")?.click()}
                                >
                                    <Download className="h-12 w-12 text-slate-400 mb-4 animate-bounce" />
                                    <h3 className="font-bold text-slate-700 dark:text-slate-350 text-base">Drag and drop your spreadsheet here</h3>
                                    <p className="text-xs text-slate-400 mt-1.5">Accepts Excel (.xlsx) or Comma-Separated Values (.csv)</p>
                                    <Button variant="outline" className="mt-5 rounded-lg border-slate-200 h-9 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                        Browse Files
                                    </Button>
                                    <input 
                                        id="excel-file-input" 
                                        type="file" 
                                        accept=".xlsx,.csv" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileChange(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                // Mapping screen
                                <div className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border gap-4">
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="h-8 w-8 text-blue-600 bg-white dark:bg-slate-950 p-1.5 border rounded-lg shadow-sm" />
                                            <div>
                                                <div className="font-bold text-sm text-slate-800 dark:text-slate-250">{importFile.name}</div>
                                                <div className="text-xs text-slate-400">{(importFile.size / 1024).toFixed(1)} KB • {parsedRows.length} rows found</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {sheetNames.length > 1 && (
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor="sheet-select" className="text-xs text-slate-400 font-semibold shrink-0">Sheet:</Label>
                                                    <select
                                                        id="sheet-select"
                                                        value={selectedSheet}
                                                        onChange={async (e) => {
                                                            const s = e.target.value;
                                                            setSelectedSheet(s);
                                                            setIsLoading(true);
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                const data = new Uint8Array(ev.target?.result as ArrayBuffer);
                                                                const wb = XLSX.read(data, { type: "array" });
                                                                parseExcelSheet(wb, s);
                                                                setIsLoading(false);
                                                            };
                                                            reader.readAsArrayBuffer(importFile);
                                                        }}
                                                        className="h-9 text-xs rounded-lg border bg-white dark:bg-slate-950 px-2 py-1 focus-visible:outline-none"
                                                    >
                                                        {sheetNames.map(name => (
                                                            <option key={name} value={name}>{name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <Button 
                                                onClick={() => { setImportFile(null); setParsedHeaders([]); setParsedRows([]); }} 
                                                variant="outline" 
                                                className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-slate-200 dark:border-slate-800 rounded-lg font-semibold"
                                            >
                                                Change File
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Mappings Grid */}
                                    <div className="space-y-3">
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                                            <Filter className="h-4 w-4 text-blue-600" /> Database Column Mapping
                                        </div>
                                        <p className="text-xs text-slate-400">Match the database fields on the left with columns from your spreadsheet on the right.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                                            {dbFields.map((field) => (
                                                <div key={field.key} className="flex items-center justify-between gap-4 border-b pb-2.5 last:border-0 last:pb-0 font-medium">
                                                    <Label htmlFor={`map-${field.key}`} className="text-xs font-bold text-slate-550 dark:text-slate-450 uppercase tracking-wide truncate max-w-[200px]" title={field.label}>
                                                        {field.label}
                                                    </Label>
                                                    <select
                                                        id={`map-${field.key}`}
                                                        value={columnMapping[field.key] || ""}
                                                        onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                                                        className="h-9 text-xs rounded-lg border bg-white dark:bg-slate-950 dark:border-slate-800 px-3 py-1 focus-visible:outline-none w-56 font-medium"
                                                    >
                                                        <option value="">[Do Not Map / Default]</option>
                                                        {parsedHeaders.map((header) => (
                                                            <option key={header} value={header}>{header}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Pre-Mapping Raw Preview */}
                                    {parsedRows.length > 0 && (
                                        <div className="space-y-3 pt-3 border-t">
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-250">
                                                Raw Import Mapping Preview (First 3 Rows)
                                            </div>
                                            <div className="overflow-x-auto border rounded-xl max-w-full">
                                                <table className="w-full text-xs text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b bg-slate-50 dark:bg-slate-900/50 text-slate-400 font-bold uppercase tracking-wider">
                                                            {dbFields.slice(0, 6).map(field => (
                                                                <th key={field.key} className="px-4 py-2 border-r font-bold">{field.label.replace(' (Required)', '')}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parsedRows.slice(0, 3).map((row, rowIdx) => {
                                                            const getVal = (key: string) => {
                                                                const mappedCol = columnMapping[key];
                                                                if (!mappedCol) return "";
                                                                const idx = parsedHeaders.indexOf(mappedCol);
                                                                return idx !== -1 ? String(row[idx] || "") : "";
                                                            };
                                                            return (
                                                                <tr key={rowIdx} className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                                                                    {dbFields.slice(0, 6).map(field => (
                                                                        <td key={field.key} className="px-4 py-2 border-r truncate max-w-[120px] font-medium" title={getVal(field.key)}>
                                                                            {getVal(field.key) || <span className="text-slate-400 italic">Default</span>}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </CardContent>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <Button type="button" variant="outline" onClick={() => { setIsImportOpen(false); setImportFile(null); }} disabled={isImporting} className="rounded-lg">
                                Cancel
                            </Button>
                            {importFile && (
                                <Button 
                                    onClick={handleCommitImport} 
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 shadow-sm font-semibold" 
                                    disabled={isImporting}
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        `Commit Import (${parsedRows.length} Rows)`
                                    )}
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* View Details Drawer/Modal */}
            {isDetailsOpen && selectedVendor && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-2xl bg-white dark:bg-slate-950 shadow-2xl border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="relative border-b pb-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <CardTitle className="text-lg font-bold font-parkinsans flex items-center gap-2 text-slate-900 dark:text-white">
                                <MapPin className="h-5 w-5 text-blue-600" /> Supplier Profile: {selectedVendor.nameOfVendor}
                            </CardTitle>
                            <CardDescription>
                                Rincian lengkap master record dan kepatuhan administrasi vendor.
                            </CardDescription>
                            <button onClick={() => setIsDetailsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Supplier Code</span>
                                    <span className="font-bold font-mono text-slate-900 dark:text-white text-base">{selectedVendor.supplier}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Account Group</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVendor.accountGroup}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Status</span>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize mt-0.5 ${
                                        selectedVendor.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" :
                                        selectedVendor.status === "Pending Audit" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" :
                                        "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-400"
                                    }`}>
                                        {selectedVendor.status}
                                    </span>
                                </div>
                                <div className="col-span-2 md:col-span-3 border-t pt-3">
                                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Alamat Lengkap</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200 block mt-0.5">
                                        {selectedVendor.street || "-"}, {selectedVendor.city || "-"}, {selectedVendor.country || "-"} {selectedVendor.postalCode || ""}
                                    </span>
                                </div>
                                
                                <div className="col-span-2 md:col-span-3 border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Terms of Payment</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedVendor.termsOfPayment || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Incoterms</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVendor.incoterms || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Min Order Value</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedVendor.orderCurrency} {selectedVendor.minimumOrderValue || "0.00"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Salesperson</span>
                                        <span className="font-semibold text-slate-850 dark:text-slate-200">{selectedVendor.salesperson || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Telephone</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedVendor.telephone || "-"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Search Term</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedVendor.searchTerm || "-"}</span>
                                    </div>
                                </div>

                                <div className="col-span-2 md:col-span-3 border-t pt-3 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Purch. Organization</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{selectedVendor.purchOrganization}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Purch. Org. Description</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVendor.purchOrgDescr}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Purch. Orgs Count</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedVendor.numPurchasingOrgs} Unit</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="border-t pt-3 text-[10px] text-slate-400 flex justify-between font-mono">
                                <span>Created At: {new Date(selectedVendor.createdAt).toLocaleString()}</span>
                                <span>Last Updated: {new Date(selectedVendor.updatedAt).toLocaleString()}</span>
                            </div>

                        </CardContent>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
                            <Button type="button" onClick={() => setIsDetailsOpen(false)} className="bg-slate-950 text-white hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 rounded-lg">
                                Close Profile
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {vendorToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm transition-opacity duration-300">
                    <Card className="w-full max-w-sm bg-white dark:bg-slate-950 shadow-2xl border border-red-200 dark:border-red-900/50 transform transition-all duration-300 scale-100 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <CardHeader className="text-center pb-4 pt-6">
                            <div className="flex justify-center mb-3">
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
                                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold font-parkinsans tracking-tight text-slate-900 dark:text-white">Hapus Vendor?</CardTitle>
                            <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Anda yakin ingin menghapus vendor <strong>{vendorToDelete.nameOfVendor}</strong>? Data terkait mungkin akan hilang.
                            </CardDescription>
                        </CardHeader>
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t">
                            <Button type="button" variant="outline" onClick={() => setVendorToDelete(null)} disabled={isLoading} className="flex-1 h-10 font-semibold rounded-lg bg-white">
                                Batal
                            </Button>
                            <Button type="button" onClick={handleConfirmDelete} disabled={isLoading} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold h-10 rounded-lg shadow-sm">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* System Footer signature */}
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mt-6 py-4 border-t border-slate-100 dark:border-slate-900 font-mono">
                © 2024 SYSTEMATIC LEDGER FINANCE SYSTEM. ALL RIGHTS RESERVED.
            </div>

        </div>
    );
}
