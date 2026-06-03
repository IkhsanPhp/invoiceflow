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
- **Teknologi Utama:** React/TypeScript, Node.js/NestJS, PostgreSQL, S3-compatible storage, AWS Textract (OCR).

---

## 2. Prinsip Keamanan Umum

1. **Security by Design:** Keamanan diintegrasikan sejak desain, bukan sebagai tambahan.
2. **Least Privilege:** Semua komponen dan pengguna hanya mendapat izin minimal.
3. **Defense in Depth:** Lapisan kontrol berlapis: autentikasi, autorisasi, validasi input, enkripsi.
4. **Input Validation & Output Encoding:** Validasi server-side untuk semua masukan; sanitasi output.
5. **Fail Securely:** Gagal dalam kondisi aman, tanpa bocorkan detail internal.
6. **Secure Defaults:** Konfigurasi awal bersifat paling ketat.

---

## 3. Authentication & Access Control

- **Autentikasi Kuat:** JWT dengan refresh token; algoritma HMAC SHA-256 atau RSA.
- **Kebijakan Password:** Panjang ≥ 12 karakter, kombinasi huruf besar/kecil, angka, simbol; hashing bcrypt/Argon2 + salt unik.
- **MFA:** Wajib untuk Super Admin dan disarankan untuk Procurement & Finance.
- **Manajemen Sesi:** ID sesi acak, time-out idle & absolute, logout invalidate token.
- **RBAC (Role-Based Access Control):** Cek hak akses di setiap endpoint (server-side).

---

## 4. Input Handling & File Upload

- **Validasi File:** Hanya PDF, JPG, JPEG, PNG; ukuran maks 10 MB; ekstensi & MIME-type dicek.
- **Penyimpanan:** Simpan di S3-compatible bucket di luar webroot, dengan permission ACL terbatas.
- **Scan Malware:** Gunakan antivirus/scan service pada saat upload.
- **Path Traversal:** Sanitasi nama file; gunakan UUID atau hash sebagai nama fisik.
- **OCR Injection:** Batasi metadata; hindari menjalankan perintah shell dengan input OCR.

---

## 5. Data Protection & Privacy

- **Enkripsi Data:** TLS 1.2+ untuk transport; AES-256 untuk data at rest (DB & S3).
- **Pengelolaan Rahasia:** Simpan kunci API, credential di Vault (HashiCorp, AWS Secrets Manager).
- **Masking & Redaction:** Hilangkan atau samarkan PII yang tidak perlu di tampilan logs.
- **Minimal Data Exposure:** API hanya mengembalikan field yang diperlukan.
- **Retention Policy:** Simpan invoice sesuai regulasi (contoh: 10 tahun); hapus securely setelah masa retensi.

---

## 6. API & Service Security

- **HTTPS Only:** Redirect HTTP → HTTPS; HSTS.
- **Rate Limiting & Throttling:** Batasi request per IP/user untuk cegah DDoS & brute-force.
- **CORS Restrictive:** Allow-list origin frontend saja.
- **HTTP Verbs:** Gunakan GET/POST/PUT/DELETE sesuai fungsinya.
- **Versioning:** /api/v1/… untuk backward compatibility.
- **Validasi Input:** Schema validation (Joi, class-validator) untuk semua payload.

---

## 7. Web Application Security Hygiene

- **CSRF Protection:** Anti-CSRF token untuk request state-changing.
- **Security Headers:** 
  - Content-Security-Policy
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Referrer-Policy: no-referrer-when-downgrade
  - Strict-Transport-Security
- **Secure Cookies:** HttpOnly, Secure, SameSite=Strict.
- **SRI:** Subresource Integrity untuk CDN.
- **XSS Prevention:** Context-aware encoding; sanitasi HTML.

---

## 8. Infrastruktur & Konfigurasi

- **Harden Server:** Matikan port & service tak perlu; patch OS & dependency rutin.
- **TLS Configs:** Disable TLS 1.0/1.1; pilih cipher suite kuat.
- **IAM Least Privilege:** Role IAM terpisah untuk compute, storage, OCR.
- **Disable Debug di Prod:** NO verbose errors; custom 404/500 page.
- **Backup & DR:** Snapshot RDS & bucket S3; otomasi backup & recovery drill.
- **CI/CD:** Pipeline dengan lint, unit/integration test, security scan (SCA, SAST).

---

## 9. Manajemen Dependensi

- **Secure Dependencies:** Pilih library terawat & populer.
- **Lockfile:** Gunakan yarn.lock / package-lock.json.
- **Vulnerability Scanning:** Dependabot, Snyk, GitHub Advanced Security.
- **Minimize Footprint:** Hanya install kebutuhan.

---

## 10. OCR & Ekstraksi Dokumen

- **Provider:** Utama: AWS Textract; POC Google Vision, Tesseract.
- **Data Residency:** Pastikan layanan mendukung region yang diinginkan.
- **Pre-Processing:** Skew correction, noise reduction.
- **Confidence Threshold:** View dan manual review jika confidence < 90%.
- **Mathematical Validation:** Cek subtotal + PPN = total; qty×price = sub-total.
- **Security OCR:** OCR berjalan di VPC private; batasi egress.

---

## 11. Audit Trail & Logging

- **Immutable Log:** Write-once, WORM policy; simpan di Elasticsearch atau PostgreSQL terpisah.
- **Detail:** Catat user, role, action, timestamp, IP.
- **Eksport & Reten:** Eksport terjadwal untuk compliance; retention sesuai kebijakan.
- **SIEM Integration:** Opsional ke AWS CloudWatch / Splunk.

---

## 12. Checklist Verifikasi Invoice

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
- Nominal PPN (11% atau regulasi 2024)
- Faktur Pajak e-Faktur dapat diverifikasi

E. **Perhitungan & Finansial**
- PPN/PPh dihitung benar
- Total QTY sesuai dokumen pendukung

Jika ada kegagalan pada salah satu poin, otomatis status: **Needs Revision**. Vendor diberi feedback detail via in-app, email, dan SMS (urgent).

---

Dengan menerapkan panduan ini, sistem invoice Anda akan memenuhi standar keamanan, privasi, dan keandalan yang diperlukan untuk operasional yang aman dan patuh regulasi.
