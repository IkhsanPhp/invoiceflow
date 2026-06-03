# Panduan Keamanan Sistem Manajemen Invoice

Dokumen ini merangkum prinsip, kontrol, dan praktik terbaik keamanan untuk membangun sistem penerimaan dan verifikasi invoice berbasis OCR dengan empat peran utama: Vendor, Admin Procurement, Finance, dan Super Admin.

---

## 1. Ringkasan Sistem

- **Tujuan:** Otomasi upload, ekstraksi data (OCR), verifikasi checklist (A–E), dan alur setoran pembayaran.
- **Peran Utama:**
  - **Vendor:** Upload invoice, faktur pajak, DO/BAST/SPK, PO; melihat status & audit trail.
  - **Admin Procurement:** Menjalankan checklist verifikasi kelengkapan dokumen, data, barang/jasa, pajak, dan perhitungan.
  - **Finance:** Approve payment, pay run, rekonsiliasi, laporan AP.
  - **Super Admin:** User & role management, konfigurasi global, audit log penuh.
- **Teknologi Utama:** Next.js 15, Drizzle ORM, Better Auth (RBAC), PostgreSQL, S3-compatible cloud storage (Cloudhost.id), Ollama Qwen3-VL (OCR).

---

## 2. Prinsip Keamanan Umum

1. **Security by Design:** Keamanan diintegrasikan sejak desain, bukan sebagai tambahan.
2. **Least Privilege:** Semua komponen dan pengguna hanya mendapat izin minimal.
3. **Defense in Depth:** Lapisan kontrol berlapis: autentikasi, autorisasi, validasi input, enkripsi.
4. **Input Validation & Output Encoding:** Validasi server-side untuk semua masukan; sanitasi output.
5. **Fail Securely:** Gagal dalam kondisi aman, tanpa bocorkan detail internal.
6. **Secure Defaults:** Konfigurasi awal bersifat paling ketat.

---

## 3. Authentication & Access Control (Better Auth)

- **Autentikasi:** Diintegrasikan menggunakan **Better Auth** yang memanfaatkan session cookies terenkripsi server-side.
- **Kebijakan Password:** Diatur oleh Better Auth, dengan hashing bcrypt/Argon2 + salt unik.
- **RBAC (Role-Based Access Control):** 
  - Kolom `role` pada tabel `user` dikonfigurasikan sebagai data tambahan di session payload.
  - Peran valid: `"vendor"`, `"procurement"`, `"finance"`, `"admin"`.
  - Akses kontrol dicek di setiap Next.js Server Action dan API Route dengan validasi sesi.

---

## 4. Input Handling & File Upload (S3 Cloudhost.id)

- **Validasi File:** Hanya menerima PDF, JPG, JPEG, PNG; ukuran maks 10 MB.
- **Penyimpanan:** File diupload langsung ke S3 bucket Cloudhost.id menggunakan SDK `@aws-sdk/client-s3`.
- **Nama File Aman:** Gunakan UUID acak atau timestamp sebagai nama file fisik di S3 untuk mencegah Directory/Path Traversal.
- **Enkripsi Transit:** Akses endpoint S3 menggunakan protokol aman `https://is3.cloudhost.id`.

---

## 5. Data Protection & Privacy

- **Enkripsi Data:** TLS 1.2+ untuk transport; AES-256 untuk data at rest (DB & S3).
- **Pengelolaan Rahasia:** Simpan kunci API, credential, dan token database di file `.env` lokal atau managed Secrets Manager. Dilarang keras melakukan hardcode kredensial S3 atau PostgreSQL di kode sumber.
- **WORM Audit Trail:** Audit logs menggunakan skema PostgreSQL append-only (tidak dapat diedit maupun didelete) untuk menjamin keaslian kepatuhan transaksi keuangan.

---

## 6. Checklist Verifikasi Invoice

Data hasil ekstraksi OCR dipadankan dengan checklist berikut:

A. **Kelengkapan Dokumen**
- Invoice asli (meterai/regulasi)
- PO, DO/BAST
- Faktur Pajak (jika PPN)
- Dokumen pendukung lain

B. **Validasi Data Invoice**
- Nama & alamat vendor sesuai PO/kontrak
- Nomor PO valid
- Nomor invoice unik & belum pernah diproses

C. **Validasi Barang/Jasa**
- Deskripsi & kuantitas sesuai PO & DO/GR
- Harga satuan & total sesuai perhitungan
- Tidak ada item di luar PO tanpa approval

D. **Validasi Pajak**
- Nominal PPN (11% atau regulasi terbaru)
- Faktur Pajak e-Faktur dapat diverifikasi

E. **Perhitungan & Finansial**
- PPN/PPh dihitung benar
- Total QTY sesuai dokumen pendukung

Jika ada kegagalan pada salah satu poin, otomatis status menjadi **Needs Revision**. Vendor diberi feedback detail via in-app, email, dan SMS (urgent).
