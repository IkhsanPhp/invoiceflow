# Tech Stack Document

This document explains the technology choices for our **Invoice Management System** in simple, everyday language. You don’t need a technical background to understand why we picked each tool and how they help make the system reliable, fast, and user-friendly.

## 1. Frontend Technologies
Our frontend is everything the user sees and clicks on: buttons, forms, dashboards, and notifications.

- **React & TypeScript**
  - React lets us build screens as reusable components (like Lego blocks), so the app stays consistent and easy to update.
  - TypeScript adds helpful checks while we write code, catching typos or mistakes early.

- **UI Framework & TailwindCSS**
  - Styled using vanilla CSS and TailwindCSS for maximum flexibility and beautiful modern aesthetics.
  - Interactive components built using Radix UI primitives for high accessibility and premium design patterns.

- **Next.js App Router Navigation**
  - Manages page routing seamlessly on both the server and client, ensuring instant transitions, static optimization, and superior SEO performance.

## 2. Backend & Core Infrastructure Technologies
The backend is our application’s engine—it handles data, business rules, and integrations behind the scenes.

- **Next.js Full-Stack Framework**
  - Next.js acts as both our frontend and backend engine, using Next.js API Routes and Server Actions to process server-side logic efficiently without requiring a separate NestJS or Express service.

- **Drizzle ORM & PostgreSQL Database**
  - **Drizzle ORM** is used for modern, lightweight, type-safe SQL queries. It maps our database schema directly into TypeScript types, preventing schema mismatches and query syntax bugs.
  - **PostgreSQL** is the highly dependable relational SQL database where we store all structured information: users, roles, invoice details, verification statuses, and audit logs.
  - Connection URL: `postgresql://root:123123@invoiceflow-invoiceflow-loskyr:5432/invoiceflow`.

- **Better Auth & Role-Based Access Control (RBAC)**
  - **Better Auth** handles robust sign-up, sign-in, secure password hashing, session management, and JWT integration.
  - Extended to support granular Role-Based Access Control (RBAC) with user role attributes: `"vendor"`, `"procurement"`, `"finance"`, and `"admin"`.

- **AWS S3-Compatible File Storage (Cloudhost.id)**
  - Keeps original invoice documents and tax invoices in a highly secure, scalable, S3-compatible cloud storage bucket.
  - Configured with endpoint: `https://is3.cloudhost.id`, bucket: `invoiceflow`, region: `us-east-1`, using path style.

- **OCR Service (Text Extraction)**
  - **Primary:** Cloud-powered **Ollama API** utilizing the advanced **Qwen3-VL (Vision-Language) model** (`qwen3-vl:235b-cloud`) to instantly parse uploaded invoices, receipts, and supporting documents.
  - OCR extracts fields (invoice number, dates, totals) and populates the vendor’s form automatically.

- **Notifications**
  - **In-App Alerts:** WebSocket and real-time updates for instantly notifying users.
  - **Email:** AWS SES sends confirmations, daily digests, and reports.
  - **SMS:** AWS SNS (or Twilio) sends urgent alerts like rejected invoices or overdue payments.

- **Audit Trail & Logging**
  - Immutable audit logs written directly to our PostgreSQL database capture every critical system action (who, what, when, where) for compliance and traceability.

---

## 3. Conclusion and Tech Stack Summary

Our unified, modern tech stack ensures:
- **Fast, accurate invoice processing** through S3 uploads, OCR data extraction, and clear validation forms.
- **Sleek, responsive dashboards** for Vendors, Procurement Admins, Finance, and Super Admins.
- **Robust security** with Better Auth RBAC sessions and AES-256 S3 bucket policies.
- **Modern code simplicity** by combining frontend and backend in a unified Next.js App Router codebase, using Drizzle ORM to manage relational PostgreSQL schemas.