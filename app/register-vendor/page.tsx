"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Building2,
    User,
    MapPin,
    CreditCard,
    FileText,
    Lock,
    ArrowRight,
    ArrowLeft,
    Eye,
    EyeOff,
    UploadCloud,
    CheckCircle2,
    AlertCircle,
    Trash2,
    Loader2,
} from "lucide-react";
import { registerVendorAction } from "./actions";
import { formatCompanyName } from "@/lib/utils";

// Steps configuration
const STEPS = [
    { title: "Kategori", desc: "Tipe Vendor", icon: Building2 },
    { title: "Identitas", desc: "Detail Profil", icon: User },
    { title: "Kontak & Alamat", desc: "Hubungi Kami", icon: MapPin },
    { title: "Finansial", desc: "Rekening Bank", icon: CreditCard },
    { title: "Dokumen", desc: "Unggah SOP", icon: FileText },
    { title: "Keamanan", desc: "Akses Akun", icon: Lock },
];

export default function RegisterVendorPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    
    // Form state
    const [vendorType, setVendorType] = useState<"badan_usaha" | "perorangan">("badan_usaha");
    const [nameOfVendor, setNameOfVendor] = useState("");
    
    // Badan Usaha fields
    const [npwp, setNpwp] = useState("");
    const [pkpStatus, setPkpStatus] = useState<"PKP" | "Non-PKP">("Non-PKP");
    const [nib, setNib] = useState("");
    const [classification, setClassification] = useState<"Kecil" | "Menengah" | "Besar">("Kecil");
    const [flagPersonal, setFlagPersonal] = useState(false);
    const [flagExEmployee, setFlagExEmployee] = useState(false);
    const [flagPrincipal, setFlagPrincipal] = useState(false);
    const [picName, setPicName] = useState("");
    const [picEmail, setPicEmail] = useState("");
    const [picPhone, setPicPhone] = useState("");

    // Perorangan fields
    const [nik, setNik] = useState("");
    
    // Shared Address & Contact
    const [street, setStreet] = useState("");
    const [province, setProvince] = useState("");
    const [city, setCity] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [emailCompany, setEmailCompany] = useState("");
    const [telephoneCompany, setTelephoneCompany] = useState("");
    
    // Financial & Asset
    const [bankName, setBankName] = useState("");
    const [bankAccountNo, setBankAccountNo] = useState("");
    const [bankAccountName, setBankAccountName] = useState("");
    const [isBankAccountDiffName, setIsBankAccountDiffName] = useState(false);
    const [isAssetOwnerDiff, setIsAssetOwnerDiff] = useState(false);
    
    // Security
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Document Uploads State
    const [documents, setDocuments] = useState<Array<{
        docType: string;
        fileUrl: string;
        fileName: string;
        fileSize: number;
    }>>([]);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Registration Success
    const [isSuccess, setIsSuccess] = useState(false);

    // Get required documents based on current state
    const getRequiredDocuments = () => {
        const reqs: Array<{ type: string; label: string; description: string }> = [];
        
        if (vendorType === "badan_usaha") {
            reqs.push({ type: "npwp_scan", label: "Scan NPWP Perusahaan", description: "Format PDF/JPG, maksimal 5MB. NPWP harus diawali dengan angka 0." });
            reqs.push({ type: "ktp_director", label: "Scan KTP Direktur / Penanggung Jawab", description: "Format PDF/JPG, maksimal 5MB." });
            reqs.push({ type: "nib_scan", label: "Scan NIB (Nomor Induk Berusaha)", description: "Format PDF/JPG, maksimal 5MB." });
            reqs.push({ type: "akta_establishment", label: "Scan Akta Pendirian Perusahaan", description: "Format PDF/JPG, maksimal 5MB. Unggah akta terbaru." });
            
            if (pkpStatus === "PKP") {
                reqs.push({ type: "pkp_letter", label: "Surat Pengukuhan PKP (SPPKP)", description: "Wajib diunggah karena status pajak Anda adalah PKP." });
            }
        } else {
            reqs.push({ type: "ktp_personal", label: "Scan KTP Personal", description: "Format PDF/JPG, maksimal 5MB. KTP sesuai dengan NIK." });
            
            const hasNpwp = npwp.trim() !== "";
            if (hasNpwp) {
                reqs.push({ type: "npwp_scan", label: "Scan NPWP Pribadi", description: "Wajib diunggah karena NPWP diisi." });
            } else {
                reqs.push({ type: "non_pkp_statement", label: "Surat Pernyataan Non-PKP", description: "Wajib diunggah karena Anda tidak memasukkan NPWP." });
            }
        }
        
        if (isBankAccountDiffName) {
            reqs.push({ type: "power_attorney_bank", label: "Surat Kuasa Rekening Bank", description: "Wajib diunggah karena nama pemilik rekening berbeda dengan nama vendor." });
        }
        
        if (isAssetOwnerDiff) {
            reqs.push({ type: "power_attorney_asset", label: "Surat Kuasa Penggunaan Aset", description: "Wajib diunggah karena unit aset terdaftar atas nama pihak ketiga." });
        }
        
        return reqs;
    };

    // Format company name on blur
    const handleNameBlur = () => {
        if (vendorType === "badan_usaha" && nameOfVendor) {
            const formatted = formatCompanyName(nameOfVendor);
            setNameOfVendor(formatted);
        } else if (nameOfVendor) {
            setNameOfVendor(nameOfVendor.trim().toUpperCase());
        }
    };

    // File Upload Handler
    const handleFileUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
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

        setUploadingDoc(docType);
        setUploadProgress(20);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("docType", docType);

            setUploadProgress(50);

            const res = await fetch("/api/register-vendor/upload", {
                method: "POST",
                body: formData,
            });

            const result = await res.json();
            setUploadProgress(90);

            if (result.success) {
                // Remove existing of same type if any
                setDocuments(prev => prev.filter(d => d.docType !== docType).concat({
                    docType,
                    fileUrl: result.fileUrl,
                    fileName: result.fileName,
                    fileSize: result.fileSize
                }));
            } else {
                alert(`Gagal mengunggah file: ${result.error || "Unknown error"}`);
            }
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Terjadi kesalahan koneksi saat mengunggah file.");
        } finally {
            setUploadingDoc(null);
            setUploadProgress(0);
        }
    };

    // Remove Uploaded Document
    const handleRemoveDoc = (docType: string) => {
        setDocuments(prev => prev.filter(d => d.docType !== docType));
    };

    // Step navigation validation
    const validateStep = () => {
        const errors: Record<string, string> = {};

        if (currentStep === 1) {
            // No validation required for category selection
        } else if (currentStep === 2) {
            if (!nameOfVendor || nameOfVendor.trim().length < 3) {
                errors.nameOfVendor = "Nama vendor minimal 3 karakter";
            }
            if (vendorType === "badan_usaha") {
                const npwpClean = npwp.replace(/[^0-9]/g, "");
                if (npwpClean.length !== 16) {
                    errors.npwp = "NPWP Perusahaan harus 16 digit angka";
                } else if (!npwpClean.startsWith("0")) {
                    errors.npwp = "NPWP Badan Usaha harus diawali dengan angka 0. NPWP diawali angka lain dideteksi sebagai NIK/Pribadi.";
                }
                const nibClean = nib.replace(/[^0-9]/g, "");
                if (nibClean.length !== 13) {
                    errors.nib = "NIB harus 13 digit angka";
                }
            } else {
                const nikClean = nik.replace(/[^0-9]/g, "");
                if (nikClean.length !== 16) {
                    errors.nik = "NIK harus 16 digit angka";
                }
                if (npwp && npwp.replace(/[^0-9]/g, "").length !== 16) {
                    errors.npwp = "NPWP Pribadi jika diisi harus 16 digit angka";
                }
            }
        } else if (currentStep === 3) {
            if (!street || street.trim().length < 5) errors.street = "Alamat lengkap minimal 5 karakter";
            if (!province || province.trim() === "") errors.province = "Provinsi wajib diisi";
            if (!city || city.trim() === "") errors.city = "Kabupaten/Kota wajib diisi";
            if (!postalCode || postalCode.trim().length < 5) errors.postalCode = "Kode Pos minimal 5 digit";
            if (!emailCompany || !emailCompany.includes("@")) errors.emailCompany = "Email tidak valid";
            if (!telephoneCompany || telephoneCompany.trim().length < 8) errors.telephoneCompany = "Nomor telepon minimal 8 digit";
            
            if (vendorType === "badan_usaha") {
                if (!picName || picName.trim() === "") errors.picName = "Nama PIC wajib diisi";
                if (!picEmail || !picEmail.includes("@")) errors.picEmail = "Email PIC tidak valid";
                if (!picPhone || picPhone.trim().length < 8) errors.picPhone = "Nomor HP PIC minimal 8 digit";
            }
        } else if (currentStep === 4) {
            if (!bankName || bankName.trim() === "") errors.bankName = "Nama bank wajib diisi";
            if (!bankAccountNo || bankAccountNo.trim().length < 5) errors.bankAccountNo = "Nomor rekening minimal 5 digit";
            if (!bankAccountName || bankAccountName.trim() === "") errors.bankAccountName = "Nama pemilik rekening wajib diisi";
        } else if (currentStep === 5) {
            // Check required documents
            const reqs = getRequiredDocuments();
            const uploadedTypes = documents.map(d => d.docType);
            const missing = reqs.filter(r => !uploadedTypes.includes(r.type));
            
            if (missing.length > 0) {
                errors.documents = `Unggah semua dokumen wajib: ${missing.map(m => m.label).join(", ")}`;
            }
        } else if (currentStep === 6) {
            if (password.length < 4) errors.password = "Password minimal 4 karakter";
            if (password !== confirmPassword) errors.confirmPassword = "Konfirmasi password tidak cocok";
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (validateStep()) {
            setError("");
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setError("");
        setValidationErrors({});
        setCurrentStep(prev => prev - 1);
    };

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep()) return;

        setIsLoading(true);
        setError("");

        const payload = {
            vendorType,
            nameOfVendor,
            npwp: npwp || undefined,
            nik: nik || undefined,
            nib: nib || undefined,
            pkpStatus: vendorType === "badan_usaha" ? pkpStatus : "Non-PKP",
            classification: vendorType === "badan_usaha" ? classification : undefined,
            flagPersonal,
            flagExEmployee,
            flagPrincipal,
            street,
            province,
            city,
            postalCode,
            emailCompany,
            telephoneCompany,
            picName: vendorType === "badan_usaha" ? picName : undefined,
            picEmail: vendorType === "badan_usaha" ? picEmail : undefined,
            picPhone: vendorType === "badan_usaha" ? picPhone : undefined,
            bankName,
            bankAccountNo,
            bankAccountName,
            isBankAccountDiffName,
            isAssetOwnerDiff,
            password,
            confirmPassword,
            documents
        };

        try {
            const result = await registerVendorAction(payload);

            if (result.success) {
                setIsSuccess(true);
            } else {
                setError(result.error || "Pendaftaran gagal dilakukan.");
                // If there are Zod validations from the server
                if (result.details) {
                    const mappedErrors: Record<string, string> = {};
                    const details = result.details as Record<string, { _errors?: string[] } | undefined>;
                    Object.keys(details).forEach(key => {
                        const errList = details[key]?._errors;
                        if (errList && errList.length > 0) {
                            mappedErrors[key] = errList[0];
                        }
                    });
                    setValidationErrors(mappedErrors);
                }
            }
        } catch (err) {
            console.error(err);
            setError("Terjadi kesalahan sistem saat menghubungi server.");
        } finally {
            setIsLoading(false);
        }
    };

    // Success State Render
    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 text-foreground font-sans">
                <Card className="w-full max-w-lg border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <CardHeader className="text-center pt-8">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 mb-4 animate-bounce">
                            <CheckCircle2 className="h-10 w-10" />
                        </div>
                        <CardTitle className="text-2xl font-bold tracking-tight">Registrasi Berhasil!</CardTitle>
                        <CardDescription className="text-muted-foreground mt-2">
                            Pendaftaran vendor Anda telah berhasil dikirim ke database.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 px-6 text-sm text-card-foreground">
                        <Alert className="bg-muted/40 border-border text-muted-foreground">
                            <AlertCircle className="h-4 w-4 text-emerald-500" />
                            <AlertTitle className="text-foreground font-medium">Informasi Penting</AlertTitle>
                            <AlertDescription className="text-xs text-muted-foreground">
                                Akun Anda saat ini berstatus <strong className="text-amber-600 dark:text-amber-400">Pending Audit</strong>. Tim Procurement & Finance kami akan memverifikasi dokumen pendukung Anda berdasarkan SOP TMT Group sebelum memberikan kode supplier ERP.
                            </AlertDescription>
                        </Alert>
                        <div className="rounded-lg bg-muted/30 p-4 border border-border">
                            <div className="flex justify-between py-1 border-b border-border">
                                <span className="text-muted-foreground">Nama Vendor:</span>
                                <span className="font-semibold text-foreground">{nameOfVendor}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border mt-1">
                                <span className="text-muted-foreground">Kategori:</span>
                                <span className="text-foreground capitalize">{vendorType.replace("_", " ")}</span>
                            </div>
                            <div className="flex justify-between py-1 mt-1">
                                <span className="text-muted-foreground">Email Login:</span>
                                <span className="text-foreground font-mono">{emailCompany}</span>
                            </div>
                        </div>
                        <p className="text-center text-xs text-muted-foreground">
                            Anda dapat masuk ke dalam dashboard vendor setelah verifikasi diapprove oleh procurement admin.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center pb-8">
                        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white w-full max-w-xs transition-colors">
                            <Link href="/sign-in">Halaman Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-6 px-4 sm:px-6 lg:px-8">
            {/* Form Area */}
            <div className="w-full max-w-3xl flex flex-col items-center">
                
                <Card className="w-full shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <form onSubmit={handleSubmit}>
                        <CardHeader className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
                            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Vendor Registration</CardTitle>
                            <CardDescription className="text-base text-slate-500 dark:text-slate-400 mt-2">
                                Daftarkan akun vendor rekanan Anda ke InvoiceFlow
                            </CardDescription>
                        
                        {/* Stepper Progress Indicator */}
                        <div className="mt-4 px-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                                <span>Langkah {currentStep} dari {STEPS.length}</span>
                                <span>{Math.round((currentStep / STEPS.length) * 100)}% Selesai</span>
                            </div>
                            <Progress value={(currentStep / STEPS.length) * 100} className="h-1.5 bg-muted" />
                            
                            <div className="mt-3 text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 bg-muted/40 py-1.5 px-3 rounded-md border border-border/40">
                                {(() => {
                                    const Icon = STEPS[currentStep - 1].icon;
                                    return <Icon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
                                })()}
                                <span>Langkah {currentStep}: {STEPS[currentStep - 1].title} &bull; {STEPS[currentStep - 1].desc}</span>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-6">
                        {error && (
                            <Alert variant="destructive" className="bg-red-950/20 border-destructive/30 text-red-200">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <AlertTitle className="text-red-300 font-medium">Terjadi Kesalahan</AlertTitle>
                                <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* STEP 1: CATEGORY SELECTION */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <Label className="text-sm font-medium">Pilih Kategori Kemitraan Rekanan Vendor:</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Badan Usaha Card */}
                                    <div 
                                        onClick={() => setVendorType("badan_usaha")}
                                        className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between hover:scale-[1.01] ${
                                            vendorType === "badan_usaha"
                                                ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                                                : "border-border bg-card hover:bg-accent/50 hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-lg ${vendorType === "badan_usaha" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                                                <Building2 className="h-6 w-6" />
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${vendorType === "badan_usaha" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-border"}`}>
                                                {vendorType === "badan_usaha" && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground text-base">Badan Usaha (PT / CV / Firma)</h3>
                                            <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                                                Gunakan kategori ini jika perusahaan Anda berbentuk PT, CV, Firma, Koperasi, Yayasan, atau badan hukum sejenis. Memerlukan NPWP Perusahaan, NIB, Akta Pendirian, dan dokumen legalitas resmi.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Perorangan Card */}
                                    <div 
                                        onClick={() => setVendorType("perorangan")}
                                        className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between hover:scale-[1.01] ${
                                            vendorType === "perorangan"
                                                ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500"
                                                : "border-border bg-card hover:bg-accent/50 hover:border-muted-foreground/30"
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-lg ${vendorType === "perorangan" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                                                <User className="h-6 w-6" />
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${vendorType === "perorangan" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-border"}`}>
                                                {vendorType === "perorangan" && <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground text-base">Perorangan / Individu</h3>
                                            <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                                                Gunakan kategori ini jika Anda mendaftar sebagai penyedia jasa perorangan, freelancer, konsultan individu, atau pemilik toko perorangan tanpa badan usaha. Memerlukan NIK (KTP) dan Surat Pernyataan Non-PKP jika tidak ada NPWP.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PROFILE IDENTITIES */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                {vendorType === "badan_usaha" ? (
                                    <>
                                        {/* Badan Usaha form */}
                                        <div className="space-y-1">
                                            <Label htmlFor="nameOfVendor">Nama Perusahaan <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nameOfVendor"
                                                placeholder="Contoh: TRAKINDO UTAMA (tanpa menulis PT/CV/Firma)"
                                                value={nameOfVendor}
                                                onChange={(e) => setNameOfVendor(e.target.value)}
                                                onBlur={handleNameBlur}
                                                className={validationErrors.nameOfVendor ? "border-destructive" : ""}
                                            />
                                            <p className="text-[10px] text-muted-foreground">Nama akan otomatis diformat menjadi UPPERCASE dan dibersihkan dari prefiks/sufiks PT/CV/Firma.</p>
                                            {validationErrors.nameOfVendor && <p className="text-xs text-destructive">{validationErrors.nameOfVendor}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="npwp">NPWP Perusahaan <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="npwp"
                                                    placeholder="Format: 16 digit angka (contoh: 01...)"
                                                    value={npwp}
                                                    onChange={(e) => setNpwp(e.target.value.replace(/[^0-9]/g, ""))}
                                                    maxLength={16}
                                                    className={validationErrors.npwp ? "border-destructive" : ""}
                                                />
                                                {validationErrors.npwp && <p className="text-xs text-destructive">{validationErrors.npwp}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="pkpStatus">Status PKP <span className="text-red-500">*</span></Label>
                                                <Select value={pkpStatus} onValueChange={(val) => setPkpStatus(val as "PKP" | "Non-PKP")}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih status PKP" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PKP">PKP (Pengusaha Kena Pajak)</SelectItem>
                                                        <SelectItem value="Non-PKP">Non-PKP</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="nib">NIB (Nomor Induk Berusaha) <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="nib"
                                                    placeholder="Format: 13 digit angka"
                                                    value={nib}
                                                    onChange={(e) => setNib(e.target.value.replace(/[^0-9]/g, ""))}
                                                    maxLength={13}
                                                    className={validationErrors.nib ? "border-destructive" : ""}
                                                />
                                                {validationErrors.nib && <p className="text-xs text-destructive">{validationErrors.nib}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="classification">Klasifikasi Usaha <span className="text-red-500">*</span></Label>
                                                <Select value={classification} onValueChange={(val) => setClassification(val as "Kecil" | "Menengah" | "Besar")}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Pilih klasifikasi" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Kecil">Kecil (Omset s/d 4.8 Milyar)</SelectItem>
                                                        <SelectItem value="Menengah">Menengah (Omset 4.8 Milyar - 50 Milyar)</SelectItem>
                                                        <SelectItem value="Besar">Besar (Omset &gt; 50 Milyar)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t border-border pt-4">
                                            <Label className="block mb-1">Golongan Penyedia (Pilih yang sesuai):</Label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border">
                                                    <Checkbox 
                                                        id="flagPersonal" 
                                                        checked={flagPersonal} 
                                                        onCheckedChange={(checked) => setFlagPersonal(!!checked)}
                                                    />
                                                    <Label htmlFor="flagPersonal" className="text-xs cursor-pointer">Penyedia Perorangan</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border">
                                                    <Checkbox 
                                                        id="flagExEmployee" 
                                                        checked={flagExEmployee} 
                                                        onCheckedChange={(checked) => setFlagExEmployee(!!checked)}
                                                    />
                                                    <Label htmlFor="flagExEmployee" className="text-xs cursor-pointer">Ex-Employee TMT Group</Label>
                                                </div>
                                                <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border">
                                                    <Checkbox 
                                                        id="flagPrincipal" 
                                                        checked={flagPrincipal} 
                                                        onCheckedChange={(checked) => setFlagPrincipal(!!checked)}
                                                    />
                                                    <Label htmlFor="flagPrincipal" className="text-xs cursor-pointer">Principal / Manufaktur</Label>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Perorangan form */}
                                        <div className="space-y-1">
                                            <Label htmlFor="nameOfVendor">Nama Lengkap Vendor (Sesuai KTP) <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="nameOfVendor"
                                                placeholder="Contoh: BUDI UTOMO"
                                                value={nameOfVendor}
                                                onChange={(e) => setNameOfVendor(e.target.value)}
                                                onBlur={handleNameBlur}
                                                className={validationErrors.nameOfVendor ? "border-destructive" : ""}
                                            />
                                            {validationErrors.nameOfVendor && <p className="text-xs text-destructive">{validationErrors.nameOfVendor}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="nik">NIK (Nomor Induk Kependudukan) <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="nik"
                                                    placeholder="Format: 16 digit angka"
                                                    value={nik}
                                                    onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ""))}
                                                    maxLength={16}
                                                    className={validationErrors.nik ? "border-destructive" : ""}
                                                />
                                                {validationErrors.nik && <p className="text-xs text-destructive">{validationErrors.nik}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <Label htmlFor="npwp">NPWP Pribadi <span className="text-muted-foreground text-[10px]">(Opsional)</span></Label>
                                                <Input
                                                    id="npwp"
                                                    placeholder="Isi jika ada, format: 16 digit angka"
                                                    value={npwp}
                                                    onChange={(e) => setNpwp(e.target.value.replace(/[^0-9]/g, ""))}
                                                    maxLength={16}
                                                    className={validationErrors.npwp ? "border-destructive" : ""}
                                                />
                                                <p className="text-[10px] text-muted-foreground">Kosongkan jika tidak memiliki NPWP (Memerlukan Surat Pernyataan Non-PKP).</p>
                                                {validationErrors.npwp && <p className="text-xs text-destructive">{validationErrors.npwp}</p>}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* STEP 3: ADDRESS & CONTACTS */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="street">Alamat Lengkap Kantor / Domisili <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="street"
                                        placeholder="Contoh: Jl. Cilandak KKO Raya No. 12"
                                        value={street}
                                        onChange={(e) => setStreet(e.target.value)}
                                        className={validationErrors.street ? "border-destructive" : ""}
                                    />
                                    {validationErrors.street && <p className="text-xs text-destructive">{validationErrors.street}</p>}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="province">Provinsi <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="province"
                                            placeholder="Contoh: DKI Jakarta"
                                            value={province}
                                            onChange={(e) => setProvince(e.target.value)}
                                            className={validationErrors.province ? "border-destructive" : ""}
                                        />
                                        {validationErrors.province && <p className="text-xs text-destructive">{validationErrors.province}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="city">Kabupaten / Kota <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="city"
                                            placeholder="Contoh: Jakarta Selatan"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className={validationErrors.city ? "border-destructive" : ""}
                                        />
                                        {validationErrors.city && <p className="text-xs text-destructive">{validationErrors.city}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="postalCode">Kode Pos <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="postalCode"
                                            placeholder="5 digit angka"
                                            value={postalCode}
                                            onChange={(e) => setPostalCode(e.target.value.replace(/[^0-9]/g, ""))}
                                            maxLength={5}
                                            className={validationErrors.postalCode ? "border-destructive" : ""}
                                        />
                                        {validationErrors.postalCode && <p className="text-xs text-destructive">{validationErrors.postalCode}</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="emailCompany">Email Utama / Perusahaan <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="emailCompany"
                                            type="email"
                                            placeholder="Email ini akan digunakan untuk log in"
                                            value={emailCompany}
                                            onChange={(e) => setEmailCompany(e.target.value)}
                                            className={validationErrors.emailCompany ? "border-destructive" : ""}
                                        />
                                        {validationErrors.emailCompany && <p className="text-xs text-destructive">{validationErrors.emailCompany}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="telephoneCompany">No Telepon Kantor / HP <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="telephoneCompany"
                                            placeholder="Contoh: 08123456789"
                                            value={telephoneCompany}
                                            onChange={(e) => setTelephoneCompany(e.target.value)}
                                            className={validationErrors.telephoneCompany ? "border-destructive" : ""}
                                        />
                                        {validationErrors.telephoneCompany && <p className="text-xs text-destructive">{validationErrors.telephoneCompany}</p>}
                                    </div>
                                </div>

                                {vendorType === "badan_usaha" && (
                                    <div className="space-y-4 border-t border-border pt-4">
                                        <Label className="font-semibold block">Detail PIC Penanggung Jawab:</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="picName" className="text-xs">Nama PIC <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="picName"
                                                    placeholder="Nama PIC"
                                                    value={picName}
                                                    onChange={(e) => setPicName(e.target.value)}
                                                    className={validationErrors.picName ? "border-destructive" : ""}
                                                />
                                                {validationErrors.picName && <p className="text-xs text-destructive">{validationErrors.picName}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="picEmail" className="text-xs">Email PIC <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="picEmail"
                                                    type="email"
                                                    placeholder="Email PIC"
                                                    value={picEmail}
                                                    onChange={(e) => setPicEmail(e.target.value)}
                                                    className={validationErrors.picEmail ? "border-destructive" : ""}
                                                />
                                                {validationErrors.picEmail && <p className="text-xs text-destructive">{validationErrors.picEmail}</p>}
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="picPhone" className="text-xs">Nomor HP/WA PIC <span className="text-red-500">*</span></Label>
                                                <Input
                                                    id="picPhone"
                                                    placeholder="Nomor HP PIC"
                                                    value={picPhone}
                                                    onChange={(e) => setPicPhone(e.target.value)}
                                                    className={validationErrors.picPhone ? "border-destructive" : ""}
                                                />
                                                {validationErrors.picPhone && <p className="text-xs text-destructive">{validationErrors.picPhone}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* STEP 4: FINANCIAL & REKENING */}
                        {currentStep === 4 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="bankName">Nama Bank Pembayaran <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="bankName"
                                            placeholder="Contoh: BANK MANDIRI, BCA"
                                            value={bankName}
                                            onChange={(e) => setBankName(e.target.value.toUpperCase())}
                                            className={validationErrors.bankName ? "border-destructive" : ""}
                                        />
                                        {validationErrors.bankName && <p className="text-xs text-destructive">{validationErrors.bankName}</p>}
                                    </div>

                                    <div className="space-y-1">
                                        <Label htmlFor="bankAccountNo">Nomor Rekening Bank <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="bankAccountNo"
                                            placeholder="Masukkan nomor rekening saja"
                                            value={bankAccountNo}
                                            onChange={(e) => setBankAccountNo(e.target.value.replace(/[^0-9]/g, ""))}
                                            className={validationErrors.bankAccountNo ? "border-destructive" : ""}
                                        />
                                        {validationErrors.bankAccountNo && <p className="text-xs text-destructive">{validationErrors.bankAccountNo}</p>}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="bankAccountName">Nama Pemilik Rekening (Sesuai Buku Tabungan) <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="bankAccountName"
                                        placeholder="Contoh: PT TRAKINDO UTAMA atau BUDI UTOMO"
                                        value={bankAccountName}
                                        onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                                        className={validationErrors.bankAccountName ? "border-destructive" : ""}
                                    />
                                    {validationErrors.bankAccountName && <p className="text-xs text-destructive">{validationErrors.bankAccountName}</p>}
                                </div>

                                <div className="space-y-3 border-t border-border pt-4 mt-6">
                                    <Label className="font-semibold block mb-1">Pernyataan Validitas & Kepemilikan (Pilih jika sesuai):</Label>
                                    
                                    <div className="flex items-start space-x-3 bg-muted/30 p-4 rounded-lg border border-border">
                                        <Checkbox 
                                            id="isBankAccountDiffName" 
                                            checked={isBankAccountDiffName} 
                                            onCheckedChange={(checked) => setIsBankAccountDiffName(!!checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="isBankAccountDiffName" className="text-sm cursor-pointer font-medium">Nama Pemilik Rekening berbeda dengan nama Perusahaan/Vendor</Label>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                                * Jika dicentang, Anda diwajibkan mengunggah Surat Kuasa Rekening bermeterai resmi pada langkah berikutnya.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start space-x-3 bg-muted/30 p-4 rounded-lg border border-border">
                                        <Checkbox 
                                            id="isAssetOwnerDiff" 
                                            checked={isAssetOwnerDiff} 
                                            onCheckedChange={(checked) => setIsAssetOwnerDiff(!!checked)}
                                            className="mt-1"
                                        />
                                        <div className="space-y-1">
                                            <Label htmlFor="isAssetOwnerDiff" className="text-sm cursor-pointer font-medium">Aset / unit yang didaftarkan (misal unit rental) terdaftar atas nama pihak ketiga (bukan milik sendiri)</Label>
                                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                                * Jika dicentang, Anda diwajibkan mengunggah Surat Kuasa Penggunaan Aset bermeterai resmi pada langkah berikutnya.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 5: DOCUMENTS UPLOAD */}
                        {currentStep === 5 && (
                            <div className="space-y-4">
                                <Label className="font-semibold text-sm block">Unggah Dokumen Legalitas SOP TMT Group:</Label>
                                
                                {validationErrors.documents && (
                                    <Alert variant="destructive" className="py-2">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription className="text-xs">{validationErrors.documents}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-4">
                                    {getRequiredDocuments().map((req) => {
                                        const uploadedFile = documents.find(d => d.docType === req.type);
                                        const isUploading = uploadingDoc === req.type;
                                        
                                        return (
                                            <div key={req.type} className="rounded-lg border border-border bg-muted/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="space-y-1 max-w-md">
                                                    <span className="text-sm font-bold block">{req.label} <span className="text-red-500">*</span></span>
                                                    <span className="text-muted-foreground text-xs block leading-relaxed">{req.description}</span>
                                                </div>
                                                
                                                <div>
                                                    {uploadedFile ? (
                                                        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                                                            <div className="max-w-[150px] md:max-w-[200px] truncate text-xs font-medium">
                                                                {uploadedFile.fileName}
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleRemoveDoc(req.type)}
                                                                className="text-destructive hover:opacity-85 transition-colors p-1"
                                                                title="Hapus berkas"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ) : isUploading ? (
                                                        <div className="flex flex-col items-center gap-1 w-[200px]">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                                                                <span>Mengunggah...</span>
                                                            </div>
                                                            <Progress value={uploadProgress} className="h-1 w-full" />
                                                        </div>
                                                    ) : (
                                                        <div className="relative">
                                                            <Input
                                                                type="file"
                                                                id={`file-${req.type}`}
                                                                accept=".pdf, image/jpeg, image/png, image/jpg"
                                                                onChange={(e) => handleFileUpload(req.type, e)}
                                                                className="hidden"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => document.getElementById(`file-${req.type}`)?.click()}
                                                                className="flex items-center gap-1.5 transition-colors"
                                                            >
                                                                <UploadCloud className="h-4 w-4" />
                                                                Pilih Berkas
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* STEP 6: ACCOUNT SECURITY */}
                        {currentStep === 6 && (
                            <div className="space-y-4">
                                <Alert className="bg-muted/40 border-border text-muted-foreground mb-4">
                                    <AlertCircle className="h-4 w-4 text-emerald-500" />
                                    <AlertDescription className="text-xs">
                                        Email login Anda adalah <strong className="font-mono text-foreground">{emailCompany || "(Belum diisi di langkah 3)"}</strong>. Buat password yang kuat untuk mengamankan akun dashboard vendor Anda kelak.
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-1">
                                    <Label htmlFor="passwordConfirm">Password Baru <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="passwordConfirm"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Masukkan password minimal 4 karakter"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={validationErrors.password ? "border-destructive pr-10" : "pr-10"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                        </button>
                                    </div>
                                    {validationErrors.password && <p className="text-xs text-destructive">{validationErrors.password}</p>}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="confirmPassword">Konfirmasi Password <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="Ketik ulang password baru"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={validationErrors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                        </button>
                                    </div>
                                    {validationErrors.confirmPassword && <p className="text-xs text-destructive">{validationErrors.confirmPassword}</p>}
                                </div>
                            </div>
                        )}
                    </CardContent>
                    
                    <CardFooter className="flex justify-between border-t border-border px-6 py-4">
                        {currentStep > 1 ? (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={handleBack}
                                disabled={isLoading}
                                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Kembali
                            </Button>
                        ) : (
                            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
                                <Link href="/sign-in">Sudah terdaftar? Log in</Link>
                            </Button>
                        )}
                        
                        {currentStep < STEPS.length ? (
                            <Button 
                                type="button" 
                                onClick={handleNext}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors"
                            >
                                Lanjut
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button 
                                type="submit"
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 transition-colors"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        Kirim Pendaftaran
                                        <CheckCircle2 className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        )}
                    </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
