# InvoiceFlow Agent System Guide

Welcome to the **InvoiceFlow** developer agent guide! This document lists the core configuration, databases, storage, and authentication parameters mapped inside our unified full-stack system.

---

## 1. Unified Tech Stack & Architecture

We have completely transitioned the system documentation and database layout from separate NestJS/Express backends to a modern, unified **Next.js 15 Full-Stack architecture**:

- **Frontend & Routing:** React + Next.js App Router.
- **Backend APIs:** Next.js Route Handlers (`app/api/...`) & Server Actions.
- **ORM & Type-safety:** Drizzle ORM (`drizzle-kit`, `drizzle-orm`).
- **Authentication & Authorization:** Better Auth with secure sessions and Role-Based Access Control (RBAC).

---

## 2. Database Connection (Drizzle ORM)

The PostgreSQL connection is managed via Drizzle ORM and node-postgres. The connection string is loaded securely via environment variables:

- **Database Connection URL:** `postgresql://root:123123@31.97.187.38:8800/invoiceflow`
- **Schemas (`db/schema/`):**
  - `db/schema/auth.ts`:governs `user`, `session`, `account`, and `verification` tables.
  - `db/schema/schema.ts`: governs business schemas (`invoices`, `invoice_documents`, `ocr_results`, `verifications`, `payment_batches`, `batch_items`, `notifications`, `audit_logs`).
- **Migrations:** Managed via `drizzle-kit`. SQL migration files are generated under `./drizzle`.

---

## 3. S3-Compatible Storage Upload System

Files are stored securely in a dedicated S3-compatible cloud storage bucket.
- **Helper Utilities (`lib/s3.ts`):** Exposes `uploadFile` and `deleteFile` wrapper functions.
- **Upload Configuration:**
  - `UPLOAD_DRIVER=s3`
  - `OBJECT_STORAGE_ENDPOINT=https://is3.cloudhost.id`
  - `OBJECT_STORAGE_BUCKET=invoiceflow`
  - `OBJECT_STORAGE_PREFIX=upload`
  - `OBJECT_STORAGE_REGION=us-east-1`
  - `OBJECT_STORAGE_FORCE_PATH_STYLE=true`
  - `OBJECT_STORAGE_ACCESS_KEY_ID=P40ZGP7XP1XCQRL6OQ01`
  - `OBJECT_STORAGE_SECRET_ACCESS_KEY=PeQ4k43xn3ZkJW5SFuAxBKihBvIznmYd1bMAWykq`

---

## 4. Role-Based Access Control (RBAC) with Better Auth

The application enforces rigid security policies using session-based authentication from **Better Auth**:
- **User Role Field:** Extended `user` table with `role: text("role")` mapping to four core roles:
  - `"vendor"` (Default): Can upload invoices, view status, and edit OCR extracted data.
  - `"procurement"`: Audits and verifies documents using the 5-point checklist (A-E).
  - `"finance"`: Manages payment batches, schedules payouts, and triggers reports.
  - `"admin"`: Manages users and system settings, reviews full compliance audit trails.
- **Better Auth Integration (`lib/auth.ts`):** Utilizes `user.additionalFields` config to map the `role` field on signup and expose it inside the session payload.

---

## 5. OCR Field Extraction (Ollama & Qwen3-VL)

OCR text extraction from uploaded invoice files is integrated with the **Ollama API** using the cloud-powered **Qwen3 Vision-Language** model:
- **API Key:** `730f4828e3f24676ad91df691f5c5fad.qoufK_1QdJrHSOlG6oCbtBiu`
- **Endpoint:** `https://ollama.com/api` (or `http://https://ollama.com/api`)
- **Model:** `qwen3-vl:235b-cloud`
- **Verification Command:**
  ```bash
  curl https://ollama.com/api \
    -H "Authorization: Bearer 730f4828e3f24676ad91df691f5c5fad.qoufK_1QdJrHSOlG6oCbtBiu" \
    -d '{
      "model": "qwen3-vl:235b-cloud",
      "messages": [{"role": "user", "content": "Hello!"}]
    }'
  ```

---

## 6. Reusable Table & Interface Design Guidelines

Every time you build or modify a user interface or feature that involves data tables, forms, or lists, you **MUST** follow these 8 standardized, reusable design patterns to guarantee visual consistency and premium UX:

### 1. Form Layout & Validation
- **Structure:** Clean, single-column or 2-column grids inside card containers. 
- **Validation:** Always enforce strict schema validation on both the client (using React Hook Form + Zod) and server-side.
- **Visual Hygiene:** Labels must always be clearly positioned above the input fields. Focus states must shift borders smoothly to **Corporate Blue (#2563EB)**.

### 2. Listable Data & Interactive Sorting
- **Rhythm:** Tables must enforce condensed vertical rhythms (8px vertical cell padding) with high horizontal data density.
- **Interactions:** Expose clicking on headers to trigger instant sorting (ascending/descending indicators) with smooth micro-animations.
- **Hover States:** Table rows must always utilize a subtle hover tint (`#F8FAFC`) to assist user tracking.

### 3. Excel Import & Mapping View
- **Import Zone:** Feature drag-and-drop file upload zone accepting `.xlsx` or `.csv`.
- **Pre-mapping Screen:** Display a clear modal mapping sheet columns to target database columns (e.g. mapping "No. Invoice" -> `invoiceNumber`). Show raw parsing previews before committing imports.

### 4. Financial & Compliance Score Cards
- **Location:** Top of dashboards/pages in 3 or 4-column fluid grids.
- **Aesthetic:** Ambient shadow, 8px rounded corners, bold title using `headline-md` typeface, and green/red up-down trend indicators.

### 5. Multi-Select Combobox Filtering
- **Placement:** Positioned in a collapsible filter bar immediately above data tables.
- **Interface:** Beautiful Popover-based combobox allowing users to search, check, and select multiple items simultaneously (e.g., filtering invoices by multiple vendors or statuses).

### 6. Action Button Icons (Create, Read, Update, Delete)
- **Standard Tooltips:** Display explanatory micro-tooltips on hover.
- **Color Codes:**
  - *Create:* Premium Corporate Blue buttons (`bg-blue-600`) with clean `Plus` icons.
  - *Read/View:* Ghost buttons with `Eye` or `List` icons.
  - *Update/Edit:* Light blue tinted buttons (`text-blue-600 hover:bg-blue-50`) with `Edit2` icons.
  - *Delete:* Soft red tinted buttons (`text-red-600 hover:bg-red-50`) with `Trash2` icons.

### 7. Data Exports (PDF & Excel)
- **Controls:** Discrete action buttons positioned at the top-right of tables.
- **Behavior:** Trigger clean CSV file downloads or generate print-friendly PDF views matching the "Systematic Ledger" color palette.

### 8. Role-Based Access Control (RBAC) Alignment
- **Conditional Menus:** The navigation sidebar and main action CTAs must check `session.user.role` before rendering.
- **Server Guarding:** Always double-check user permissions server-side inside Server Actions and API routes (e.g., throwing a `ShieldAlert` forbidden screen if a vendor tries to access `/dashboard/users`).

