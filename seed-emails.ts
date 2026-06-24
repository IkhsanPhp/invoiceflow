import { db } from './db/index';
import { emailTemplates } from './db/schema/schema';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

const templates = [
  {
    name: 'invoice_in_review',
    subject: 'Invoice Sedang Direviu - {{invoiceNumber}}',
    description: 'Dikirim saat invoice masuk tahap verifikasi procurement',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #3b82f6; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Pengecekan Invoice Dimulai</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Invoice Anda nomor <strong>{{invoiceNumber}}</strong> telah selesai melalui pemrosesan sistem (OCR) dan saat ini sedang ditinjau oleh tim Procurement kami.</p>
        <p style="font-size: 16px; line-height: 1.5;">Status Saat Ini: <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Kami akan menghubungi Anda kembali begitu pengecekan selesai.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_procurement_verified',
    subject: 'Verifikasi Awal Berhasil - Kirimkan Dokumen Fisik Invoice {{invoiceNumber}}',
    description: 'Dikirim saat verifikasi procurement berhasil',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #10b981; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Verifikasi Procurement Berhasil</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Invoice Anda nomor <strong>{{invoiceNumber}}</strong> telah lulus pengecekan awal oleh tim Procurement.</p>
        <p style="font-size: 16px; line-height: 1.5;">Status Saat Ini: <span style="background: #d1fae5; color: #047857; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></p>
        {{comments}}
        <div style="background-color: #fef9c3; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0;">
            <strong>Langkah Selanjutnya:</strong><br/>
            Harap segera mengirimkan dokumen fisik hardcopy (Invoice asli, Faktur Pajak, Surat Jalan, dan PO) ke alamat kantor kami. Jangan lupa untuk menekan tombol konfirmasi pengiriman melalui Vendor Portal setelah dokumen dikirim!
        </div>
    </div>
</div>
`
  },
  {
    name: 'invoice_needs_revision',
    subject: 'Diperlukan Revisi untuk Invoice {{invoiceNumber}}',
    description: 'Dikirim saat vendor perlu melakukan perbaikan dokumen',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #f59e0b; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Revisi Dokumen Diperlukan</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Mohon maaf, terdapat kekurangan atau ketidaksesuaian pada dokumen invoice <strong>{{invoiceNumber}}</strong>.</p>
        {{comments}}
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Mohon perbaiki dokumen Anda dan unggah ulang melalui Vendor Portal.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_document_in_transit',
    subject: 'Konfirmasi Pengiriman Fisik Invoice {{invoiceNumber}}',
    description: 'Dikirim saat vendor mensubmit resi',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #6366f1; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Informasi Pengiriman Diterima</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Kami telah menerima konfirmasi pengiriman dokumen fisik untuk invoice <strong>{{invoiceNumber}}</strong>.</p>
        <p style="font-size: 16px; line-height: 1.5;">Status Saat Ini: <span style="background: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Tim kami akan segera memverifikasi kelengkapan dokumen setelah fisik dokumen tiba di kantor kami.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_in_finance_verification',
    subject: 'Dokumen Fisik Diterima - Menunggu Verifikasi Finance (Invoice {{invoiceNumber}})',
    description: 'Dikirim saat resepsionis/procurement mengonfirmasi fisik',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #8b5cf6; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Dokumen Fisik Diterima</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Dokumen fisik untuk invoice <strong>{{invoiceNumber}}</strong> telah sampai dan diterima oleh tim kami.</p>
        <p style="font-size: 16px; line-height: 1.5;">Status Saat Ini: <span style="background: #ede9fe; color: #6d28d9; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">{{status}}</span></p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Saat ini dokumen Anda sedang masuk ke antrean verifikasi akhir oleh tim Finance sebelum pembayaran dijadwalkan.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_needs_finance_revision',
    subject: 'Tertunda - Pengecekan Tambahan Invoice {{invoiceNumber}}',
    description: 'Dikirim saat finance mengembalikan ke procurement',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #f97316; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Pengecekan Internal Tambahan</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Terdapat penundaan sementara pada verifikasi akhir invoice <strong>{{invoiceNumber}}</strong> karena tim Finance memerlukan koordinasi tambahan dengan tim Procurement kami.</p>
        {{comments}}
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Tidak ada tindakan yang perlu Anda lakukan saat ini kecuali jika kami meminta revisi kembali.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_rejected',
    subject: 'Invoice Ditolak (Rejected) - {{invoiceNumber}}',
    description: 'Dikirim saat invoice ditolak secara permanen',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #ef4444; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Invoice Ditolak</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Mohon maaf, invoice <strong>{{invoiceNumber}}</strong> telah ditolak (Rejected) oleh sistem kami karena alasan ketidaksesuaian fatal.</p>
        {{comments}}
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Silakan buat pengajuan invoice baru yang sudah diperbaiki jika diperlukan.</p>
    </div>
</div>
`
  },
  {
    name: 'invoice_paid',
    subject: 'Invoice Lunas - Persetujuan Pembayaran {{invoiceNumber}}',
    description: 'Dikirim saat invoice disetujui (Paid)',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #22c55e; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Invoice Telah Disetujui (Lunas)</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Selamat! Invoice Anda nomor <strong>{{invoiceNumber}}</strong> telah lulus seluruh verifikasi dan berstatus <strong>Lunas / Siap Dibayar</strong>.</p>
        <p style="font-size: 16px; line-height: 1.5;">Status Saat Ini: <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 999px; font-size: 14px; font-weight: bold;">Paid</span></p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Dana akan segera ditransfer ke rekening terdaftar Anda pada jadwal pembayaran terdekat.</p>
    </div>
</div>
`
  },
  {
    name: 'vendor_update_approved',
    subject: 'Pembaruan Profil Disetujui',
    description: 'Dikirim saat pembaruan profil vendor disetujui',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #10b981; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Pembaruan Profil Disetujui</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Pengajuan pembaruan data master vendor Anda telah disetujui oleh tim Procurement kami. Data master Anda kini sudah diperbarui di sistem.</p>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Terima kasih atas kerja samanya dalam menjaga data Anda tetap up-to-date.</p>
    </div>
</div>
`
  },
  {
    name: 'vendor_update_revision',
    subject: 'Diperlukan Revisi Pembaruan Profil',
    description: 'Dikirim saat pembaruan profil vendor ditolak/butuh revisi',
    body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; color: #1f2937;">
    <div style="background-color: #f59e0b; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Revisi Pembaruan Profil Diperlukan</h2>
    </div>
    <div style="padding: 32px;">
        <p style="font-size: 16px;">Halo <strong>{{vendorName}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5;">Pengajuan pembaruan data master vendor Anda telah ditinjau oleh tim Procurement dan memerlukan beberapa perbaikan/revisi.</p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
            <strong>Catatan Revisi:</strong><br/>
            {{revisionNotes}}
        </div>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 24px;">Silakan login ke Vendor Portal untuk mengajukan kembali perubahan profil Anda.</p>
    </div>
</div>
`
  }
];

async function seed() {
    for (const t of templates) {
        const existing = await db.select().from(emailTemplates).where(eq(emailTemplates.name, t.name)).limit(1);
        if (existing.length > 0) {
            await db.update(emailTemplates).set({
                subject: t.subject,
                body: t.body,
                description: t.description,
                updatedAt: new Date()
            }).where(eq(emailTemplates.id, existing[0].id));
            console.log("Updated", t.name);
        } else {
            await db.insert(emailTemplates).values({
                id: crypto.randomUUID(),
                name: t.name,
                subject: t.subject,
                body: t.body,
                description: t.description
            });
            console.log("Inserted", t.name);
        }
    }
    console.log("Done");
}

seed().catch(console.error);
