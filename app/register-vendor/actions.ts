"use server";

import { db } from "@/db";
import { vendors, vendorDocuments, auditLogs } from "@/db/schema/schema";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { formatCompanyName } from "@/lib/utils";
import { registerVendorSchema } from "./schema";
import { sendEmail } from "@/lib/email";

export async function registerVendorAction(payload: unknown) {
    try {
        // 1. Validate payload
        const validation = registerVendorSchema.safeParse(payload);
        if (!validation.success) {
            console.error("Validation failed:", validation.error.format());
            return {
                success: false,
                error: "Validasi data gagal. Periksa kembali input Anda.",
                details: validation.error.format()
            };
        }

        const data = validation.data;

        // 2. Format name according to SOP rules
        let formattedName = "";
        if (data.vendorType === "badan_usaha") {
            formattedName = formatCompanyName(data.nameOfVendor);
        } else {
            formattedName = data.nameOfVendor.trim().toUpperCase();
        }

        // 3. Check if email is already in use
        const existingUser = await db.select().from(user).where(eq(user.email, data.emailCompany)).limit(1);
        if (existingUser.length > 0) {
            return {
                success: false,
                error: "Email ini sudah digunakan oleh akun lain. Silakan gunakan email lain."
            };
        }

        // Check if NPWP or NIK or NIB already exists under a vendor
        if (data.vendorType === "badan_usaha" && data.npwp) {
            const existingNpwp = await db.select().from(vendors).where(eq(vendors.npwp, data.npwp)).limit(1);
            if (existingNpwp.length > 0) {
                return {
                    success: false,
                    error: `Vendor dengan NPWP ${data.npwp} sudah terdaftar.`
                };
            }
        } else if (data.vendorType === "perorangan" && data.nik) {
            const existingNik = await db.select().from(vendors).where(eq(vendors.nik, data.nik)).limit(1);
            if (existingNik.length > 0) {
                return {
                    success: false,
                    error: `Vendor dengan NIK ${data.nik} sudah terdaftar.`
                };
            }
        }

        // 4. Create user account using Better Auth server-side API
        // This takes care of table inserts for both user and account (including password hashing)
        let signUpResult;
        try {
            signUpResult = await auth.api.signUpEmail({
                body: {
                    email: data.emailCompany,
                    password: data.password,
                    name: formattedName,
                    role: "vendor",
                }
            });
        } catch (authError: unknown) {
            console.error("Better Auth signUp error:", authError);
            const msg = authError instanceof Error ? authError.message : String(authError);
            return {
                success: false,
                error: `Gagal membuat akun user: ${msg}`
            };
        }

        if (!signUpResult || !signUpResult.user) {
            return {
                success: false,
                error: "Pendaftaran gagal saat membuat kredensial akun."
            };
        }

        const createdUser = signUpResult.user;

        // 5. Create vendor record with status "Pending Audit"
        const vendorId = crypto.randomUUID();
        
        await db.insert(vendors).values({
            id: vendorId,
            userId: createdUser.id,
            nameOfVendor: formattedName,
            street: data.street,
            province: data.province,
            city: data.city,
            postalCode: data.postalCode,
            country: "ID",
            accountGroup: "NCAD",
            purchOrganization: "2000",
            purchOrgDescr: "Chitra (Central)",
            status: "Pending Audit",
            
            // SOP details
            vendorType: data.vendorType,
            npwp: data.npwp || null,
            nik: data.nik || null,
            nib: data.nib || null,
            pkpStatus: data.pkpStatus || (data.vendorType === "perorangan" ? "Non-PKP" : null),
            classification: data.classification || null,
            flagPersonal: data.flagPersonal || false,
            flagExEmployee: data.flagExEmployee || false,
            flagPrincipal: data.flagPrincipal || false,
            emailCompany: data.emailCompany,
            telephoneCompany: data.telephoneCompany,
            
            // PIC
            picName: data.vendorType === "badan_usaha" ? data.picName : formattedName,
            picEmail: data.vendorType === "badan_usaha" ? data.picEmail : data.emailCompany,
            picPhone: data.vendorType === "badan_usaha" ? data.picPhone : data.telephoneCompany,
            
            // Bank
            bankName: data.bankName,
            bankAccountNo: data.bankAccountNo,
            bankAccountName: data.bankAccountName,
            isBankAccountDiffName: data.isBankAccountDiffName,
            isAssetOwnerDiff: data.isAssetOwnerDiff,
            
            // Audit/Flags default
            watchlistFlag: false,
            blacklistFlag: false,
        });

        // 6. Create document records
        if (data.documents && data.documents.length > 0) {
            await db.insert(vendorDocuments).values(
                data.documents.map((doc: { docType: string; fileUrl: string; fileName: string; fileSize: number }) => ({
                    id: crypto.randomUUID(),
                    vendorId: vendorId,
                    docType: doc.docType,
                    fileUrl: doc.fileUrl,
                    fileName: doc.fileName,
                    fileSize: doc.fileSize,
                    uploadedAt: new Date()
                }))
            );
        }

        // 8. Log registration event
        await db.insert(auditLogs).values({
            id: crypto.randomUUID(),
            userId: createdUser.id,
            action: "Vendor Registered",
            targetType: "Vendor",
            targetId: vendorId,
            metadata: { vendorType: data.vendorType, email: data.emailCompany },
            loggedAt: new Date()
        });

        // 9. Send welcome email using template
        // Send asynchronously without blocking the response
        sendEmail({
            to: data.emailCompany,
            templateName: "vendor_registered",
            placeholders: {
                vendorName: formattedName
            }
        }).catch(err => console.error("Failed to send vendor registered email:", err));

        return {
            success: true,
            vendorId: vendorId,
            message: "Registrasi berhasil. Data Anda sedang menunggu audit."
        };
    } catch (error: unknown) {
        console.error("Unhandled error in registerVendorAction:", error);
        return {
            success: false,
            error: "Terjadi kesalahan internal server. Silakan coba lagi nanti."
        };
    }
}
