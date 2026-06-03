# Backend Structure Document

This document explains the backend setup for our Invoice Management System. It covers architecture, database design, APIs, hosting, infrastructure, security, monitoring, and more. You don’t need a deep technical background to understand it.

## 1. Backend Architecture

### Overall Design
- We use a **Next.js 15 Full-Stack Server** using TypeScript. Each feature (authentication, invoice handling, OCR processing, verification, payments, notifications, admin settings) lives inside the Next.js unified project structure.
- The server exposes a **RESTful API** via Next.js API Routes (`app/api/...`) and leverages Server Actions for secure, direct communication from UI components.
- Large files (PDF, JPG, PNG) and OCR results are stored in an **S3-compatible bucket** (Cloudhost.id); we keep only the file URLs in our PostgreSQL database.

### Supporting Scalability, Maintainability, and Performance
- **Scalability**: Next.js applications scale seamlessly on container services (like ECS/Fargate) or serverless platforms. 
- **Maintainability**: Using Drizzle ORM ensures compile-time TypeScript checks across all database queries.
- **Performance**: Database queries are optimized with indexes on key columns (invoice ID, status, vendor ID) and numeric values are stored with precise scales.

## 2. Database Management

### Database Technologies
- We use a **relational SQL database**: **PostgreSQL** hosted on local or cloud-managed systems.
- PostgreSQL connection URL: `postgresql://root:123123@31.97.187.38:8800/invoiceflow`.
- **Drizzle ORM** manages database schema declaration and SQL queries.
- All structured data—users, sessions, accounts, verifications, invoices, documents, logs—lives in PostgreSQL.

---

## 3. Database Schema (Drizzle ORM)

Below is the Drizzle ORM schema mapping that governs the PostgreSQL database:

### Authentication Schemas (`db/schema/auth.ts`)
```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").$defaultFn(() => false).notNull(),
    image: text("image"),
    role: text("role").$type<"vendor" | "procurement" | "finance" | "admin">().default("vendor").notNull(),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const session = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});
```

### Core Business Schemas (`db/schema/schema.ts`)
```typescript
import { pgTable, text, timestamp, integer, boolean, numeric, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const invoices = pgTable("invoices", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    vendorId: text("vendor_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    issueDate: timestamp("issue_date"),
    dueDate: timestamp("due_date"),
    totalAmount: numeric("total_amount", { precision: 16, scale: 2 }),
    status: text("status").default("Pending OCR").notNull(),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const invoiceDocuments = pgTable("invoice_documents", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedAt: timestamp("uploaded_at").$defaultFn(() => new Date()).notNull(),
});

export const ocrResults = pgTable("ocr_results", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id").notNull().references(() => invoiceDocuments.id, { onDelete: "cascade" }),
    extractedData: jsonb("extracted_data"),
    processedAt: timestamp("processed_at").$defaultFn(() => new Date()).notNull(),
});

export const verifications = pgTable("verifications", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
    section: text("section").notNull(),
    passed: boolean("passed").notNull(),
    comments: text("comments"),
    checkedBy: text("checked_by").notNull().references(() => user.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at").$defaultFn(() => new Date()).notNull(),
});

export const paymentBatches = pgTable("payment_batches", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    batchDate: timestamp("batch_date").notNull(),
    status: text("status").notNull(),
    createdBy: text("created_by").notNull().references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
});

export const batchItems = pgTable("batch_items", {
    batchId: text("batch_id").notNull().references(() => paymentBatches.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
}, (t) => [
    primaryKey({ columns: [t.batchId, t.invoiceId] })
]);

export const notifications = pgTable("notifications", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    sentAt: timestamp("sent_at").$defaultFn(() => new Date()).notNull(),
});

export const auditLogs = pgTable("audit_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    loggedAt: timestamp("logged_at").$defaultFn(() => new Date()).notNull(),
});
```

---

## 4. API Design and Endpoints

Next.js App Router governs endpoints via route handlers (`app/api/.../route.ts`). Session handling is securely checked server-side using Better Auth (`getSession` or `auth.api.getSession`).

### Key Endpoints

**Authentication & User Management (Managed by Better Auth)**
- `POST /api/auth/sign-in`: Handles credential login.
- `POST /api/auth/sign-up`: Register user, maps inputs including `role` to PostgreSQL.
- `POST /api/auth/sign-out`: Ends session, invalidates cookies.

**Invoice Lifecycle**
- `GET /api/invoices`: List and filter invoices by user role (Vendor only sees their own; Procurement and Finance see all active/verified invoices).
- `POST /api/invoices`: Vendor submits new invoice metadata.

**Document Upload & OCR**
- `POST /api/upload`: Receives file buffer, uploads to the S3 bucket (`https://is3.cloudhost.id`), writes record to `invoice_documents`, triggers OCR.
- `GET /api/invoices/:id/ocr`: View extracted fields.

**Verification Checklist (A–E)**
- `POST /api/invoices/:id/verify`: Procurement Admin submits pass/fail verification checkboxes with comments.

**Payments**
- `POST /api/payments/batches`: Finance aggregates verified invoices into a scheduled batch.

---

## 5. Hosting and S3 Object Storage

- **Compute**: Next.js app containerized via Docker and deployed to ECS/AWS Fargate or Vercel.
- **S3 Bucket Details (Cloudhost.id)**:
  - Driver: S3
  - Endpoint: `https://is3.cloudhost.id`
  - Bucket: `invoiceflow`
  - Access Key ID: `P40ZGP7XP1XCQRL6OQ01`
- **Database**: PostgreSQL database.
- **Authentication Security**: Managed server-side with HTTP-only cookies, robust JWT generation, and strict session timeouts.