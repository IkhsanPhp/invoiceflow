import { pgTable, text, timestamp, integer, boolean, numeric, jsonb, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const invoices = pgTable("invoices", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    vendorId: text("vendor_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    invoiceNumber: text("invoice_number").notNull(),
    taxInvoiceNumber: text("tax_invoice_number"),
    issueDate: timestamp("issue_date"),
    dueDate: timestamp("due_date"),
    totalAmount: numeric("total_amount", { precision: 16, scale: 2 }),
    status: text("status").default("Pending OCR").notNull(), // Pending OCR, In Review, Procurement Verified, Document in Transit, In Finance Verification, Needs Revision, Paid
    grDetails: jsonb("gr_details"),
    shippingDetails: jsonb("shipping_details"),
    financeNotes: text("finance_notes"), // For revision notes
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const invoiceDocuments = pgTable("invoice_documents", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
        .notNull()
        .references(() => invoices.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(), // invoice, tax_invoice, po, delivery_order
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    uploadedAt: timestamp("uploaded_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const ocrResults = pgTable("ocr_results", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    documentId: text("document_id")
        .notNull()
        .references(() => invoiceDocuments.id, { onDelete: "cascade" }),
    extractedData: jsonb("extracted_data"),
    processedAt: timestamp("processed_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const verifications = pgTable("verifications", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    invoiceId: text("invoice_id")
        .notNull()
        .references(() => invoices.id, { onDelete: "cascade" }),
    section: text("section").notNull(), // A, B, C, D, E
    passed: boolean("passed").notNull(),
    comments: text("comments"),
    checkedBy: text("checked_by")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const paymentBatches = pgTable("payment_batches", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    batchDate: timestamp("batch_date").notNull(),
    status: text("status").notNull(), // Scheduled, Paid, Cancelled
    createdBy: text("created_by")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const batchItems = pgTable("batch_items", {
    batchId: text("batch_id")
        .notNull()
        .references(() => paymentBatches.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id")
        .notNull()
        .references(() => invoices.id, { onDelete: "cascade" }),
}, (t) => [
    primaryKey({ columns: [t.batchId, t.invoiceId] })
]);

export const notifications = pgTable("notifications", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // in_app, email, sms
    eventType: text("event_type").notNull(), // invoice_uploaded, invoice_verified, invoice_rejected, revision_requested, payment_scheduled
    payload: jsonb("payload"),
    sentAt: timestamp("sent_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const auditLogs = pgTable("audit_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    loggedAt: timestamp("logged_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const vendors = pgTable("vendors", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .references(() => user.id, { onDelete: "set null" }),
    supplier: text("supplier").unique(),
    nameOfVendor: text("name_of_vendor").notNull(),
    street: text("street"),
    country: text("country"),
    postalCode: text("postal_code"),
    city: text("city"),
    accountGroup: text("account_group").default("NCAD").notNull(),
    searchTerm: text("search_term"),
    purchOrganization: text("purch_organization").default("2000").notNull(),
    purchOrgDescr: text("purch_org_descr").default("Chitra (Central)").notNull(),
    termsOfPayment: text("terms_of_payment"),
    incoterms: text("incoterms"),
    minimumOrderValue: numeric("minimum_order_value", { precision: 16, scale: 2 }).default("0.00"),
    orderCurrency: text("order_currency").default("USD").notNull(),
    salesperson: text("salesperson"),
    telephone: text("telephone"),
    numPurchasingOrgs: integer("num_purchasing_orgs").default(1).notNull(),
    status: text("status").default("Active").notNull(), // Active, Pending Audit, Archived
    
    // TMT Group SOP dynamic registration fields
    vendorType: text("vendor_type"), // badan_usaha | perorangan
    npwp: text("npwp"),
    nik: text("nik"),
    nib: text("nib"),
    pkpStatus: text("pkp_status"),
    classification: text("classification"),
    flagPersonal: boolean("flag_personal").default(false).notNull(),
    flagExEmployee: boolean("flag_ex_employee").default(false).notNull(),
    flagPrincipal: boolean("flag_principal").default(false).notNull(),
    province: text("province"),
    emailCompany: text("email_company"),
    telephoneCompany: text("telephone_company"),
    picName: text("pic_name"),
    picEmail: text("pic_email"),
    picPhone: text("pic_phone"),
    bankName: text("bank_name"),
    bankAccountNo: text("bank_account_no"),
    bankAccountName: text("bank_account_name"),
    isBankAccountDiffName: boolean("is_bank_account_diff_name").default(false).notNull(),
    isAssetOwnerDiff: boolean("is_asset_owner_diff").default(false).notNull(),
    watchlistFlag: boolean("watchlist_flag").default(false).notNull(),
    blacklistFlag: boolean("blacklist_flag").default(false).notNull(),
    blacklistReason: text("blacklist_reason"),
    verificationComments: text("verification_comments"),
    verifiedBy: text("verified_by")
        .references(() => user.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at"),
    
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const vendorDocuments = pgTable("vendor_documents", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    vendorId: text("vendor_id")
        .notNull()
        .references(() => vendors.id, { onDelete: "cascade" }),
    docType: text("doc_type").notNull(), // npwp_scan, nib_scan, pkp_letter, ktp_director, akta_establishment, permit_docs, ktp_personal, non_pkp_statement, power_attorney_bank, power_attorney_asset
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    fileName: text("file_name").notNull(),
    uploadedAt: timestamp("uploaded_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export const userPermissions = pgTable("user_permissions", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    menuKey: text("menu_key").notNull(),
    canAccess: boolean("can_access").default(false).notNull(),
    canCreate: boolean("can_create").default(false).notNull(),
    canUpdate: boolean("can_update").default(false).notNull(),
    canDelete: boolean("can_delete").default(false).notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});


export const systemSettings = pgTable("system_settings", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull().unique(),
    value: text("value"),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const emailTemplates = pgTable("email_templates", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull().unique(), // e.g., vendor_registered, invoice_uploaded
    subject: text("subject").notNull(),
    body: text("body").notNull(), // HTML or text body with placeholders like {{vendorName}}
    description: text("description"),
    updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
});

export const emailLogs = pgTable("email_logs", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: text("status").notNull(), // 'sent', 'failed'
    errorMsg: text("error_msg"),
    sentAt: timestamp("sent_at").$defaultFn(() => new Date()).notNull(),
});
