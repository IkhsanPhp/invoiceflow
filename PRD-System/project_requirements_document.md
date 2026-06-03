# Project Requirements Document (PRD)

## 1. Project Overview

We’re building an **Invoice Management System** that streamlines how businesses receive, verify, and pay vendor invoices. Four main users—**Vendor**, **Procurement Admin**, **Finance**, and **Super Admin**—will interact with the system. Vendors will upload invoice-related documents (Invoice, Faktur Pajak, DO/BAST/SPK, PO) via a clean dashboard. The system uses OCR (Optical Character Recognition) to extract key fields and auto-populate verification forms. Procurement Admins then follow a multi-step checklist to confirm completeness, data accuracy, item consistency, tax compliance, and financial calculations. Once approved, Finance users manage payment scheduling, reconciliation, and reporting.

This system tackles common pain points: lost paperwork, manual data entry mistakes, unclear invoice status, and slow verification loops. Success is measured by reduced processing time (target: under 48 hours per invoice), fewer verification errors (target: <5% rejections on first review), and improved visibility through real-time dashboards and audit trails.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (MVP)**
- Role-based authentication and authorization for Vendor, Procurement Admin, Finance, Super Admin using **Better Auth**.
- Vendor invoice upload (PDF, JPG, JPEG, PNG; max 10 MB) to an **S3-compatible bucket** (Cloudhost.id).
- OCR extraction utilizing the cloud-powered **Ollama Qwen3-VL** Vision-Language model to parse and pre-fill invoice data.
- Procurement Admin verification form with the five checklist sections (A–E).
- Automatic status updates: Pending OCR, In Review, Verified, Needs Revision, Rejected.
- Feedback loop when verification fails (in-app + email + SMS for urgent cases).
- Finance module for payment approval, scheduling, reconciliation, report exports.
- Super Admin console: user & role management, global settings, audit log viewer, system configuration.
- Audit trail capturing all user actions (immutable, filterable, exportable).
- Notifications: In-app alerts, email digests, SMS for critical events.
- Dashboards with key metrics for each role (status counts, processing times, value summaries).
- Data storage in **PostgreSQL** and managed with **Drizzle ORM**.

**Out-of-Scope (Phase 2 and beyond)**
- Direct integration with Indonesian e-Faktur API for real-time tax clearance.
- Mobile apps (native iOS/Android).
- Multi-language support outside of English/Indonesian.
- Advanced AI-driven anomaly detection beyond OCR field extraction.
- Machine learning–based invoice matching or auto-approval.

## 3. User Flow

A **Vendor** logs in, lands on their dashboard listing all previously submitted invoices and statuses. They click "Upload Invoice," complete a simple form, and select supporting documents. The system runs OCR, pre-fills the form fields, and they verify/edit any extracted data. After submission, the invoice moves to "Pending Review." Vendors get in-app alerts, email confirmations, and can filter their dashboard by status or date.

A **Procurement Admin** logs in to find a queue of invoices under "Awaiting Verification." They click into an invoice, view the extracted fields alongside original files, and complete the multi-section checklist (completeness, data validation, item consistency, tax validation, financial calculations). If any check fails, they mark item(s) as "Needs Revision" with detailed reasons. Vendors are notified and can resubmit. Once all points pass, the invoice status flips to "Verified" and routes to **Finance**, who then schedule and execute payments via their dashboard. **Super Admins** oversee the entire lifecycle through full audit logs, system settings, and user management.

## 4. Core Features

- **Authentication & RBAC**: Sign-up/login, secure session cookies, role-specific permissions (Vendor, Procurement Admin, Finance, Super Admin) managed by **Better Auth** with role-based routing.
- **Invoice Upload & Management**: Accept PDF, JPG, JPEG, PNG (≤10 MB); store raw files in Cloudhost.id S3 bucket; display upload history.
- **OCR Field Extraction**: Cloud-powered **Ollama Qwen3-VL** integration; map extracted text to database form fields.
- **Verification Workflow**: Five-section checklist (A–E) with pass/fail logic, auto-assignment back to vendor if failed.
- **Status Tracking & Dashboards**: Real-time status labels, metric cards (counts, values, processing times), filters.
- **Notifications**: In-app alerts, email templates, SMS gateway for urgent messages.
- **Finance Module**: Payment approval queue, batch scheduling, ledger matching, export to CSV/MT940.
- **Audit Trail**: Centralized, immutable logs (who, what, when, where, outcome), UI for search/filter/export.
- **Super Admin Console**: User/role management, global configuration (tax rates, OCR settings), data retention.

## 5. Tech Stack & Tools

- **Frontend**: Next.js 15 (React + TypeScript), custom styling with TailwindCSS/CSS, Radix UI.
- **Backend**: Next.js 15 App Router API Routes & Server Actions.
- **Database**: PostgreSQL (relational) managed with **Drizzle ORM**.
- **File Storage**: Cloudhost.id S3-compatible bucket for invoices and logs.
- **OCR**: **Ollama Qwen3-VL** model (`qwen3-vl:235b-cloud`) via API.
- **Notifications**: AWS SNS/SES for email & SMS.
- **Authentication**: **Better Auth** utilizing PostgreSQL database with session cookies and RBAC support.
- **Logging/Audit**: PostgreSQL WORM (Write-Once-Read-Many) append-only logging tables.

## 6. Non-Functional Requirements

- **Performance**: API responses < 250 ms for queries; OCR processing < 5 s per page.
- **Scalability**: Next.js serverless/container scaling; S3 for unbounded storage.
- **Security**: TLS everywhere; AES-256 at rest; role-based access control (Better Auth RBAC); 2FA for Super Admin.
- **Compliance**: 10-year invoice retention; GDPR/PDPA data handling; masked PII in logs.
- **Availability**: 99.9% uptime; automated backups; disaster recovery within 2 h.
- **Usability**: WCAG AA–level accessible forms; responsive design for 1024×768+ screens.

## 7. Constraints & Assumptions

- We assume reliable access to AWS Textract and Cloudhost.id S3-compatible storage.
- No direct DGT API integration in MVP; manual tax invoice checks.
- Vendors have basic computer literacy for uploading documents.
- Email and SMS gateways will have 99% deliverability; fallback to in-app alerts.
- OCR accuracy may vary—manual correction step is mandatory.

## 8. Known Issues & Potential Pitfalls

- **OCR Misreads**: Low-quality scans may produce wrong data. Mitigation: show original image alongside extracted fields; require vendor confirmation.
- **API Rate Limits**: Textract/SES/SNS quotas could throttle. Mitigation: batch requests, exponential backoff, monitoring.
- **Data Sync**: Race conditions when multiple users act on same invoice. Mitigation: optimistic locking or status-based locks.
- **Notification Failures**: SMS undelivered or emails bounced. Mitigation: retry logic; log failures in audit; in-app fallback.
- **Security Breach**: Compromised credentials could expose documents. Mitigation: strong password policies, MFA for sensitive roles, encrypted tokens.