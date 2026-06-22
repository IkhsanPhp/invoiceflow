import { z } from "zod";

// Base validation schema
const baseRegisterSchema = z.object({
    vendorType: z.enum(["badan_usaha", "perorangan"]),
    nameOfVendor: z.string().min(3, { message: "Nama vendor minimal 3 karakter" }),
    street: z.string().min(5, { message: "Alamat lengkap minimal 5 karakter" }),
    province: z.string().min(2, { message: "Provinsi wajib diisi" }),
    city: z.string().min(2, { message: "Kabupaten/Kota wajib diisi" }),
    postalCode: z.string().min(5, { message: "Kode pos minimal 5 digit" }),
    emailCompany: z.string().email({ message: "Format email tidak valid" }),
    telephoneCompany: z.string().min(8, { message: "Nomor telepon minimal 8 digit" }),
    bankName: z.string().min(2, { message: "Nama bank wajib diisi" }),
    bankAccountNo: z.string().min(5, { message: "Nomor rekening minimal 5 digit" }),
    bankAccountName: z.string().min(3, { message: "Nama pemilik rekening wajib diisi" }),
    isBankAccountDiffName: z.boolean().default(false),
    isAssetOwnerDiff: z.boolean().default(false),
    
    // Security fields
    password: z.string().min(4, { message: "Password minimal 4 karakter" }),
    confirmPassword: z.string().min(4, { message: "Konfirmasi password minimal 4 karakter" }),
});

// Zod schema for server action (receives all fields and does conditional refinement)
export const registerVendorSchema = baseRegisterSchema
    .extend({
        // Badan Usaha specific fields
        npwp: z.string().optional(),
        nib: z.string().optional(),
        pkpStatus: z.enum(["PKP", "Non-PKP"]).optional(),
        classification: z.enum(["Kecil", "Menengah", "Besar"]).optional(),
        flagPersonal: z.boolean().default(false),
        flagExEmployee: z.boolean().default(false),
        flagPrincipal: z.boolean().default(false),
        
        picName: z.string().optional(),
        picEmail: z.string().optional(),
        picPhone: z.string().optional(),
        
        // Perorangan specific fields
        nik: z.string().optional(),
        
        // Documents uploaded URLs
        documents: z.array(z.object({
            docType: z.string(),
            fileUrl: z.string(),
            fileName: z.string(),
            fileSize: z.number()
        })).min(1, { message: "Dokumen pendukung wajib diunggah" })
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Password dan Konfirmasi Password tidak sama",
        path: ["confirmPassword"]
    })
    .superRefine((data, ctx) => {
        // Validation for Badan Usaha
        if (data.vendorType === "badan_usaha") {
            // NPWP
            if (!data.npwp) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "NPWP Perusahaan wajib diisi untuk Badan Usaha",
                    path: ["npwp"]
                });
            } else {
                const npwpClean = data.npwp.replace(/[^0-9]/g, "");
                if (npwpClean.length !== 16) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "NPWP Perusahaan harus 16 digit numerik",
                        path: ["npwp"]
                    });
                } else if (!npwpClean.startsWith("0")) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "NPWP Badan Usaha harus diawali dengan angka 0. NPWP diawali dengan angka lain terdeteksi sebagai NIK/Pribadi.",
                        path: ["npwp"]
                    });
                }
            }
            
            // NIB
            if (!data.nib) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "NIB wajib diisi untuk Badan Usaha",
                    path: ["nib"]
                });
            } else {
                const nibClean = data.nib.replace(/[^0-9]/g, "");
                if (nibClean.length !== 13) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "NIB harus 13 digit numerik",
                        path: ["nib"]
                    });
                }
            }

            // PKP Status
            if (!data.pkpStatus) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Status PKP wajib diisi untuk Badan Usaha",
                    path: ["pkpStatus"]
                });
            }

            // Classification
            if (!data.classification) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Klasifikasi Usaha wajib diisi untuk Badan Usaha",
                    path: ["classification"]
                });
            }

            // PIC Info
            if (!data.picName || data.picName.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Nama PIC wajib diisi untuk Badan Usaha",
                    path: ["picName"]
                });
            }
            if (!data.picEmail || data.picEmail.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Email PIC wajib diisi untuk Badan Usaha",
                    path: ["picEmail"]
                });
            }
            if (!data.picPhone || data.picPhone.trim() === "") {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Nomor HP/WA PIC wajib diisi untuk Badan Usaha",
                    path: ["picPhone"]
                });
            }

            // Validate documents required for Badan Usaha
            const docTypes = data.documents.map(d => d.docType);
            if (!docTypes.includes("npwp_scan")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan NPWP Perusahaan wajib diunggah", path: ["documents"] });
            }
            if (!docTypes.includes("ktp_director")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan KTP Direktur wajib diunggah", path: ["documents"] });
            }
            if (!docTypes.includes("nib_scan")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan NIB wajib diunggah", path: ["documents"] });
            }
            if (!docTypes.includes("akta_establishment")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan Akta Pendirian wajib diunggah", path: ["documents"] });
            }
            if (data.pkpStatus === "PKP" && !docTypes.includes("pkp_letter")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Pengukuhan PKP wajib diunggah jika status PKP", path: ["documents"] });
            }
            if (data.isBankAccountDiffName && !docTypes.includes("power_attorney_bank")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Kuasa Rekening wajib diunggah karena nama pemilik rekening berbeda dengan nama perusahaan", path: ["documents"] });
            }
            if (data.isAssetOwnerDiff && !docTypes.includes("power_attorney_asset")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Kuasa Penggunaan Aset wajib diunggah karena aset bukan milik sendiri", path: ["documents"] });
            }
        }

        // Validation for Perorangan
        if (data.vendorType === "perorangan") {
            // NIK
            if (!data.nik) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "NIK wajib diisi untuk Perorangan",
                    path: ["nik"]
                });
            } else {
                const nikClean = data.nik.replace(/[^0-9]/g, "");
                if (nikClean.length !== 16) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "NIK harus 16 digit numerik",
                        path: ["nik"]
                    });
                }
            }

            // Optional NPWP
            if (data.npwp && data.npwp.trim() !== "") {
                const npwpClean = data.npwp.replace(/[^0-9]/g, "");
                if (npwpClean.length !== 16) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "NPWP jika diisi harus 16 digit numerik",
                        path: ["npwp"]
                    });
                }
            }

            // Validate documents required for Perorangan
            const docTypes = data.documents.map(d => d.docType);
            if (!docTypes.includes("ktp_personal")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan KTP Personal wajib diunggah", path: ["documents"] });
            }
            // If NPWP is empty, require Non-PKP statement
            const hasNpwp = data.npwp && data.npwp.trim() !== "";
            if (!hasNpwp && !docTypes.includes("non_pkp_statement")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Pernyataan Non-PKP wajib diunggah karena NPWP kosong", path: ["documents"] });
            }
            if (hasNpwp && !docTypes.includes("npwp_scan")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Scan NPWP wajib diunggah karena NPWP diisi", path: ["documents"] });
            }
            if (data.isBankAccountDiffName && !docTypes.includes("power_attorney_bank")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Kuasa Rekening wajib diunggah karena nama pemilik rekening berbeda dengan nama vendor", path: ["documents"] });
            }
            if (data.isAssetOwnerDiff && !docTypes.includes("power_attorney_asset")) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Surat Kuasa Penggunaan Aset wajib diunggah karena aset bukan milik sendiri", path: ["documents"] });
            }
        }
    });
