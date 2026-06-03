# Aplikasi Alur Dokumen (App Flow Document)

Dokumen ini menjelaskan alur navigasi aplikasi dan proses pemrosesan invoice dari ujung ke ujung (end-to-end) bagi pengguna dan pengembang.

## 1. Alur Registrasi & Login (Authentication Flow)

Sistem menggunakan **Better Auth** dengan cookie sesi yang aman.

```mermaid
sequenceDiagram
    participant User as Pengguna (Browser)
    participant Client as Better Auth Client (React)
    participant Server as Next.js API Route (/api/auth)
    participant DB as PostgreSQL (Drizzle ORM)

    User->>Client: Input email & password, pilih Role (jika Sign Up)
    Client->>Server: Kirim kredensial (POST)
    Server->>DB: Cek user / Simpan user baru (termasuk kolom role)
    DB-->>Server: Mengembalikan data user
    Server->>Client: Kirim cookie sesi terenkripsi (HTTP-only)
    Client->>User: Redirect ke dashboard sesuai Role
```

---

## 2. Alur Pengunggahan & OCR Invoice (Vendor Flow)

Vendor mengunggah dokumen pendukung ke Cloudhost.id S3 bucket, memicu proses OCR otomatis.

```mermaid
sequenceDiagram
    participant Vendor as Vendor (Dashboard)
    participant Client as Next.js Page (React)
    participant Server as API Route (/api/upload)
    participant S3 as Cloudhost S3 Storage
    participant OCR as AWS Textract
    participant DB as PostgreSQL (Drizzle)

    Vendor->>Client: Pilih file (Invoice, Faktur, DO, PO)
    Client->>Server: Kirim data form multipart/form-data
    Server->>S3: Upload file buffer ke /upload folder
    S3-->>Server: Return public access URL
    Server->>OCR: Kirim dokumen untuk ekstraksi teks
    OCR-->>Server: Return field data (nomor invoice, total, vendor)
    Server->>DB: Simpan invoice (Pending OCR) & url file di db
    Server->>Client: Kirim data ekstraksi untuk ditinjau Vendor
    Client->>Vendor: Tampilkan form pratinjau OCR
    Vendor->>Client: Koreksi data jika perlu & klik Submit
    Client->>Server: Update invoice (status: In Review)
    Server->>DB: Update data invoice di db
```

---

## 3. Alur Verifikasi Invoice (Procurement Admin Flow)

Admin Procurement mencocokkan dokumen asli dengan form ekstraksi menggunakan 5 checklist verifikasi (A–E).

```mermaid
sequenceDiagram
    participant Admin as Procurement Admin
    participant Client as Split-Screen UI
    participant Server as API Route (/api/verify)
    participant DB as PostgreSQL (Drizzle)
    participant Notif as SES / SNS / In-App

    Admin->>Client: Buka antrean verifikasi, klik invoice
    Client->>Server: Ambil file URL & data invoice
    Server->>DB: Query data
    DB-->>Server: Return data
    Server-->>Client: Tampilkan dokumen asli (S3 URL) berdampingan dengan form data
    Admin->>Client: Jalankan checklist (A-E)
    alt Ada salah satu checklist gagal
        Admin->>Client: Pilih "Needs Revision", input komentar revisi
        Client->>Server: Submit status: Needs Revision & komentar
        Server->>DB: Simpan hasil verifikasi & status di db
        Server->>Notif: Kirim notifikasi revisi ke Vendor (Email/SMS)
    else Semua checklist berhasil
        Admin->>Client: Pilih "Verify"
        Client->>Server: Submit status: Verified
        Server->>DB: Simpan hasil verifikasi & ubah status ke Verified
    end
```

---

## 4. Alur Pembayaran (Finance Flow)

Finance mencairkan dana untuk invoice berstatus "Verified" melalui batch pembayaran.

- **Verified Queue:** Menampilkan semua invoice yang lolos audit Procurement.
- **Batching:** Finance memilih beberapa invoice terverifikasi, mengelompokkannya ke dalam `payment_batches`, dan mengunduh berkas instruksi transfer bank (CSV).
- **Execution & Reconciliation:** Setelah transaksi perbankan sukses, Finance mengubah status batch menjadi `Paid`, yang secara otomatis mengubah status seluruh invoice di dalamnya menjadi `Paid` dan merekam entri audit trail finansial.