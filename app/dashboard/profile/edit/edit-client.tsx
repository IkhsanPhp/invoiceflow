"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Loader2, Eye, EyeOff, Trash2, AlertTriangle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { changePassword } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateVendorProfile } from "../actions";

interface EditProfileClientProps {
    user: any;
    vendorDetails?: any;
    vendorDocs?: any[];
    pendingUpdate?: any;
}

export function EditProfileClient({ user, vendorDetails, vendorDocs = [], pendingUpdate }: EditProfileClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const defaultTab = searchParams.get("tab") || "account";

    const isVendor = user.role === "vendor";

    // Vendor profile state - initialized from pendingUpdate if available, otherwise from vendorDetails
    const initData = pendingUpdate ? pendingUpdate.submittedData : (vendorDetails || {});

    const [name, setName] = useState(user.name || "");
    const [jabatan, setJabatan] = useState("");
    const [department, setDepartment] = useState("");
    
    // Vendor profile state
    const [vendorForm, setVendorForm] = useState({
        accountGroup: initData.accountGroup || "",
        orderCurrency: initData.orderCurrency || "",
        termsOfPayment: initData.termsOfPayment || "",
        incoterms: initData.incoterms || "",
        minimumOrderValue: initData.minimumOrderValue || "",
        searchTerm: initData.searchTerm || "",
        street: initData.street || "",
        city: initData.city || "",
        country: initData.country || "",
        postalCode: initData.postalCode || "",
        salesperson: initData.salesperson || "",
        telephone: initData.telephone || "",
        purchOrganization: initData.purchOrganization || "",
        purchOrgDescr: initData.purchOrgDescr || "",
        vendorType: initData.vendorType || "badan_usaha",
        npwp: initData.npwp || "",
        nik: initData.nik || "",
        nib: initData.nib || "",
        pkpStatus: initData.pkpStatus || "Non-PKP",
        classification: initData.classification || "Kecil",
        flagPersonal: initData.flagPersonal || false,
        flagExEmployee: initData.flagExEmployee || false,
        flagPrincipal: initData.flagPrincipal || false,
        province: initData.province || "",
        emailCompany: initData.emailCompany || "",
        telephoneCompany: initData.telephoneCompany || "",
        picName: initData.picName || "",
        picEmail: initData.picEmail || "",
        picPhone: initData.picPhone || "",
        bankName: initData.bankName || "",
        bankAccountNo: initData.bankAccountNo || "",
        bankAccountName: initData.bankAccountName || "",
        isBankAccountDiffName: initData.isBankAccountDiffName || false,
        isAssetOwnerDiff: initData.isAssetOwnerDiff || false,
    });

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    
    // Vendor tab state
    const [vendorTab, setVendorTab] = useState("info_umum");

    // Documents state and upload
    const initDocs = pendingUpdate && pendingUpdate.submittedData.documents ? pendingUpdate.submittedData.documents : vendorDocs;
    const [documents, setDocuments] = useState<any[]>(initDocs);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userInitials = user.name
        ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
        : "U";

    const handleTabChange = (value: string) => {
        router.push(`/dashboard/profile?tab=${value}`);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation
        const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
        if (!allowedTypes.includes(file.type)) {
            alert("Format file tidak didukung! Hanya PDF, JPG, JPEG, dan PNG.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("File terlalu besar! Maksimal ukuran file adalah 5MB.");
            return;
        }

        setUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            
            // For profile updates, we'll just label it generally, or ask the user.
            // Since we don't have a specific docType selector, we'll use a generic one
            // or prompt for it. For simplicity, let's use "updated_document".
            const docType = prompt("Masukkan jenis dokumen (misal: npwp_scan, nib_scan, dll):") || "other_document";
            formData.append("docType", docType);

            const res = await fetch("/api/register-vendor/upload", {
                method: "POST",
                body: formData,
            });

            const result = await res.json();
            if (result.success) {
                setDocuments(prev => {
                    const newDocs = [...prev];
                    const existingIdx = newDocs.findIndex(d => d.docType === docType);
                    if (existingIdx >= 0) {
                        newDocs[existingIdx] = result;
                    } else {
                        newDocs.push(result);
                    }
                    return newDocs;
                });
                alert("Dokumen berhasil diunggah!");
            } else {
                alert(`Gagal mengunggah file: ${result.error || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Terjadi kesalahan koneksi saat mengunggah file.");
        } finally {
            setUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        
        try {
            if (isVendor) {
                const res = await updateVendorProfile({
                    name,
                    documents,
                    ...vendorForm
                });
                
                if (res.error) {
                    alert(`Error: ${res.error}`);
                } else {
                    router.push('/dashboard/profile');
                }
            } else {
                // Future handling for non-vendor users if needed
                setTimeout(() => {
                    alert("Profile updated successfully (UI Demo)");
                }, 1000);
            }
        } catch (error) {
            alert("An error occurred while updating the profile.");
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess(false);

        if (newPassword !== confirmPassword) {
            setPasswordError("New passwords do not match.");
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await changePassword({
                newPassword,
                currentPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                setPasswordError(error.message || "Failed to change password.");
            } else {
                setPasswordSuccess(true);
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch (err) {
            setPasswordError("An unexpected error occurred.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Verified":
            case "Paid":
                return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
            case "Needs Revision":
                return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
            case "Pending OCR":
            case "In Review":
            case "Procurement Verified":
            case "In Finance Verification":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
            default:
                return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
        }
    };

    return (
        <div className="space-y-8">
                {/* Profile Information Card */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 h-24"></div>
                    <CardHeader className="relative pt-0">
                        <div className="absolute -top-12 left-6 border-4 border-white dark:border-zinc-950 rounded-full bg-white dark:bg-zinc-950">
                            <Avatar className="h-24 w-24 rounded-full bg-emerald-100 text-emerald-700 font-bold text-3xl">
                                <AvatarImage src={user.image} />
                                <AvatarFallback className="rounded-full bg-emerald-100 text-emerald-700">{userInitials}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="flex justify-between items-start pt-14">
                            <div>
                                <CardTitle className="text-2xl">{user.name}</CardTitle>
                                <CardDescription className="flex items-center mt-1">
                                    <span className="capitalize px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-medium mr-2">{user.role}</span>
                                    {user.email}
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" type="button" className="h-9">
                                <Upload className="w-4 h-4 mr-2" />
                                Change Photo
                            </Button>
                        </div>
                        <CardDescription>
                            Pastikan data master vendor Anda sesuai dengan dokumen legal yang berlaku.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {pendingUpdate && pendingUpdate.status === "pending" && (
                            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                                <AlertDescription className="font-medium flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Data Anda sedang dalam proses verifikasi oleh tim Procurement (Pending Audit). Anda masih dapat mengubah data di bawah ini, namun persetujuan akhir bergantung pada tim Procurement.
                                </AlertDescription>
                            </Alert>
                        )}
                        {pendingUpdate && pendingUpdate.status === "rejected" && (
                            <Alert variant="destructive" className="bg-red-50 dark:bg-red-950/30">
                                <AlertDescription className="font-medium flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Pembaruan profil Anda sebelumnya ditolak. Silakan perbaiki dan simpan kembali.
                                    </div>
                                    <div className="text-sm mt-1 bg-red-100 dark:bg-red-900/50 p-2 rounded text-red-900 dark:text-red-200">
                                        <strong>Catatan Revisi:</strong> {pendingUpdate.revisionNotes || "Tidak ada catatan."}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input 
                                        id="name" 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        placeholder="Enter your name"
                                        className="bg-zinc-50/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input 
                                        id="email" 
                                        value={user.email} 
                                        disabled 
                                        className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 cursor-not-allowed"
                                    />
                                </div>

                                {!isVendor && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="jabatan">Job Title (Jabatan)</Label>
                                            <Input 
                                                id="jabatan" 
                                                value={jabatan} 
                                                onChange={(e) => setJabatan(e.target.value)} 
                                                placeholder="e.g. Procurement Manager"
                                                className="bg-zinc-50/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="department">Department</Label>
                                            <Input 
                                                id="department" 
                                                value={department} 
                                                onChange={(e) => setDepartment(e.target.value)} 
                                                placeholder="e.g. Finance"
                                                className="bg-zinc-50/50 dark:bg-zinc-900/50 focus-visible:ring-emerald-500"
                                            />
                                        </div>
                                    </>
                                )}
                                </div>
                                {isVendor && (
                                    <div className="col-span-1 md:col-span-2 pt-6">
                                        <div className="bg-zinc-50 dark:bg-zinc-900/30 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                            {/* Vendor Tabs Header */}
                                            <div className="flex items-center gap-2 p-4 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto bg-white dark:bg-zinc-950/50">
                                                <Button 
                                                    type="button" 
                                                    variant={vendorTab === "info_umum" ? "default" : "outline"} 
                                                    onClick={() => setVendorTab("info_umum")} 
                                                    className={`h-9 rounded-full ${vendorTab === "info_umum" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                                    Info Umum
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant={vendorTab === "data_sop" ? "default" : "outline"} 
                                                    onClick={() => setVendorTab("data_sop")} 
                                                    className={`h-9 rounded-full ${vendorTab === "data_sop" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                                                    Data SOP
                                                </Button>
                                                <Button 
                                                    type="button" 
                                                    variant={vendorTab === "dokumen" ? "default" : "outline"} 
                                                    onClick={() => setVendorTab("dokumen")} 
                                                    className={`h-9 rounded-full ${vendorTab === "dokumen" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                                                    Dokumen ({vendorDocs.length})
                                                </Button>
                                            </div>

                                            {/* Vendor Tab Content */}
                                            <div className="p-6">
                                                {vendorTab === "info_umum" && (
                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Account Group</Label>
                                                                    <Input value={vendorForm.accountGroup} onChange={e => setVendorForm({...vendorForm, accountGroup: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Mata Uang</Label>
                                                                    <Input value={vendorForm.orderCurrency} onChange={e => setVendorForm({...vendorForm, orderCurrency: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Terms of Payment</Label>
                                                                    <Input value={vendorForm.termsOfPayment} onChange={e => setVendorForm({...vendorForm, termsOfPayment: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Incoterms</Label>
                                                                    <Input value={vendorForm.incoterms} onChange={e => setVendorForm({...vendorForm, incoterms: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Min. Order Value</Label>
                                                                    <Input value={vendorForm.minimumOrderValue} onChange={e => setVendorForm({...vendorForm, minimumOrderValue: e.target.value})} type="number" className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Search Term</Label>
                                                                    <Input value={vendorForm.searchTerm} onChange={e => setVendorForm({...vendorForm, searchTerm: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Lokasi & Kontak</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <div className="col-span-1 sm:col-span-2 space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Alamat Jalan</Label>
                                                                    <Input value={vendorForm.street} onChange={e => setVendorForm({...vendorForm, street: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Kota</Label>
                                                                    <Input value={vendorForm.city} onChange={e => setVendorForm({...vendorForm, city: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Kode Pos</Label>
                                                                    <Input value={vendorForm.postalCode} onChange={e => setVendorForm({...vendorForm, postalCode: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Negara</Label>
                                                                    <Input value={vendorForm.country} onChange={e => setVendorForm({...vendorForm, country: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Telepon</Label>
                                                                    <Input value={vendorForm.telephone} onChange={e => setVendorForm({...vendorForm, telephone: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="col-span-1 sm:col-span-2 space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Salesperson</Label>
                                                                    <Input value={vendorForm.salesperson} onChange={e => setVendorForm({...vendorForm, salesperson: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Organisasi Pembelian</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Kode Org.</Label>
                                                                    <Input value={vendorForm.purchOrganization} onChange={e => setVendorForm({...vendorForm, purchOrganization: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Deskripsi Org.</Label>
                                                                    <Input value={vendorForm.purchOrgDescr} onChange={e => setVendorForm({...vendorForm, purchOrgDescr: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {vendorTab === "data_sop" && (
                                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Tipe Vendor</Label>
                                                                    <select 
                                                                        value={vendorForm.vendorType} 
                                                                        onChange={e => setVendorForm({...vendorForm, vendorType: e.target.value})}
                                                                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white dark:bg-zinc-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        <option value="">Pilih Tipe</option>
                                                                        <option value="badan_usaha">Badan Usaha</option>
                                                                        <option value="perorangan">Perorangan</option>
                                                                    </select>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">NPWP</Label>
                                                                    <Input value={vendorForm.npwp} onChange={e => setVendorForm({...vendorForm, npwp: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">NIK</Label>
                                                                    <Input value={vendorForm.nik} onChange={e => setVendorForm({...vendorForm, nik: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">NIB</Label>
                                                                    <Input value={vendorForm.nib} onChange={e => setVendorForm({...vendorForm, nib: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Status PKP</Label>
                                                                    <Input value={vendorForm.pkpStatus} onChange={e => setVendorForm({...vendorForm, pkpStatus: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Klasifikasi</Label>
                                                                    <Input value={vendorForm.classification} onChange={e => setVendorForm({...vendorForm, classification: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6">Informasi Bank</h3>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Nama Bank</Label>
                                                                    <Input value={vendorForm.bankName} onChange={e => setVendorForm({...vendorForm, bankName: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">No. Rekening</Label>
                                                                    <Input value={vendorForm.bankAccountNo} onChange={e => setVendorForm({...vendorForm, bankAccountNo: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Label className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Nama Pemilik Rekening</Label>
                                                                    <Input value={vendorForm.bankAccountName} onChange={e => setVendorForm({...vendorForm, bankAccountName: e.target.value})} className="bg-white dark:bg-zinc-950 font-medium h-10" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {vendorTab === "dokumen" && (
                                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Dokumen Vendor</h3>
                                                            <div>
                                                                <input 
                                                                    type="file" 
                                                                    ref={fileInputRef} 
                                                                    onChange={handleFileUpload} 
                                                                    className="hidden" 
                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                />
                                                                <Button 
                                                                    type="button" 
                                                                    variant="outline" 
                                                                    size="sm" 
                                                                    className="h-8"
                                                                    onClick={() => fileInputRef.current?.click()}
                                                                    disabled={uploadingDoc}
                                                                >
                                                                    {uploadingDoc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} 
                                                                    {uploadingDoc ? "Mengunggah..." : "Upload Dokumen Baru"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        
                                                        {documents.length === 0 ? (
                                                            <div className="text-center py-8 text-zinc-500">
                                                                <p>Belum ada dokumen yang diunggah.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {documents.map((doc, idx) => (
                                                                    <div key={idx} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="h-10 w-10 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-medium text-sm">{doc.docType.toUpperCase().replace(/_/g, " ")}</p>
                                                                                <p className="text-xs text-zinc-500">{doc.fileName || "document.pdf"} • {(doc.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <Button type="button" variant="ghost" size="sm" asChild>
                                                                                <a href={doc.fileUrl} target="_blank" rel="noreferrer">View</a>
                                                                            </Button>
                                                                            <Button 
                                                                                type="button" 
                                                                                variant="ghost" 
                                                                                size="sm" 
                                                                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                                                onClick={() => setDocuments(docs => docs.filter(d => d.docType !== doc.docType))}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            

                            <div className="pt-2">
                                <Button type="submit" disabled={isUpdatingProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
        </div>
    );
}

// Ensure you have lucide-react imported for icons above:
import { AlertCircle, CheckCircle2, FileText } from "lucide-react";
