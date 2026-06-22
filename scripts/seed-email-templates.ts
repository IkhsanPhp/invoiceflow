import { db } from "../db";
import { emailTemplates } from "../db/schema/schema";

const templates = [
    {
        name: "invoice_uploaded",
        subject: "Invoice Terkirim - Menunggu Pemrosesan",
        description: "Dikirim ke vendor saat invoice berhasil diunggah",
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #2563eb; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Invoice Berhasil Diunggah</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Terima kasih. Kami telah menerima dokumen invoice Anda dengan detail sebagai berikut:</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 140px;">No. Invoice</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{invoiceNumber}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Status Saat Ini</td>
                    <td style="padding: 8px 0;"><span style="background: #fef9c3; color: #a16207; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></td>
                </tr>
            </table>
        </div>

        <p style="font-size: 16px; line-height: 1.5;">Saat ini invoice Anda sedang dalam antrean pemrosesan otomatis (OCR). Kami akan memberi tahu Anda kembali ketika proses verifikasi dimulai atau jika ada perubahan status.</p>
        
        <a href="http://localhost:3000/dashboard/invoice-hub" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px;">Lihat di Dashboard</a>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 14px;">
        &copy; 2026 Chitra Paratama. Semua hak dilindungi.
    </div>
</div>
        `
    },
    {
        name: "invoice_status_updated",
        subject: "Pembaruan Status Invoice: {{invoiceNumber}} - {{status}}",
        description: "Dikirim ke vendor saat status invoice berubah (Verified, In Review, Rejected, dsb.)",
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #f59e0b; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Pembaruan Status Invoice</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Kami ingin menginformasikan bahwa terdapat pembaruan status pada dokumen invoice yang Anda kirimkan.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 24px 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; width: 140px;">No. Invoice</td>
                    <td style="padding: 8px 0; font-weight: bold;">{{invoiceNumber}}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b;">Status Baru</td>
                    <td style="padding: 8px 0;"><span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></td>
                </tr>
            </table>
        </div>

        {{comments}}

        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Silakan akses sistem kami untuk melihat detail selengkapnya atau melakukan tindakan yang diperlukan.</p>
        
        <a href="http://localhost:3000/dashboard/invoice-hub" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px;">Lihat Detail Invoice</a>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 14px;">
        &copy; 2026 Chitra Paratama. Semua hak dilindungi.
    </div>
</div>
        `
    },
    {
        name: "vendor_registered",
        subject: "Pendaftaran Vendor Berhasil - Menunggu Verifikasi",
        description: "Dikirim ke vendor baru setelah mengisi form pendaftaran",
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #10b981; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Pendaftaran Berhasil</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Terima kasih telah mendaftar sebagai mitra Vendor. Pendaftaran akun dan berkas kelengkapan Anda telah berhasil masuk ke sistem kami.</p>
        
        <p style="font-size: 16px; line-height: 1.5; padding: 16px; background-color: #fef9c3; border-left: 4px solid #eab308; margin: 24px 0;">
            Saat ini akun Anda berstatus <strong>Pending Audit</strong>. Tim kami akan melakukan pengecekan data dan berkas legalitas Anda dalam 1-3 hari kerja.
        </p>

        <p style="font-size: 16px; line-height: 1.5;">Anda akan menerima email pemberitahuan lebih lanjut setelah proses verifikasi selesai. Jika Anda memiliki pertanyaan, silakan hubungi tim Procurement kami.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 14px;">
        &copy; 2026 Chitra Paratama. Semua hak dilindungi.
    </div>
</div>
        `
    },
    {
        name: "vendor_approved",
        subject: "Selamat! Akun Vendor Anda Telah Disetujui",
        description: "Dikirim ke vendor saat status akun diubah menjadi Active",
        body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #10b981; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Akun Vendor Aktif</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Selamat! Setelah melalui proses audit, akun vendor Anda kini telah <strong>Disetujui</strong> dan berstatus <strong>Aktif</strong>.</p>
        
        <p style="font-size: 16px; line-height: 1.5;">Mulai saat ini, Anda sudah dapat menggunakan seluruh fitur Vendor Portal, termasuk mengunggah invoice dan memantau status pembayaran secara real-time.</p>

        <a href="http://localhost:3000/sign-in" style="display: inline-block; background-color: #10b981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 24px;">Masuk ke Dashboard</a>
    </div>
    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 14px;">
        &copy; 2026 Chitra Paratama. Semua hak dilindungi.
    </div>
</div>
        `
    }
];

async function seed() {
    try {
        console.log("Seeding email templates...");
        for (const template of templates) {
            // Check if exists
            const { eq } = require('drizzle-orm');
            const [existing] = await db.select().from(emailTemplates).where(eq(emailTemplates.name, template.name)).limit(1);

            if (existing) {
                console.log("Updating existing template: " + template.name);
                await db.update(emailTemplates).set({
                    subject: template.subject,
                    body: template.body,
                    description: template.description,
                    updatedAt: new Date()
                }).where(eq(emailTemplates.name, template.name));
            } else {
                console.log("Inserting new template: " + template.name);
                await db.insert(emailTemplates).values({
                    ...template,
                });
            }
        }
        console.log("Email templates seeding completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Failed to seed email templates:", error);
        process.exit(1);
    }
}

seed();
