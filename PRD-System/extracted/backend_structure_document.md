# Backend Structure Document

This document explains the backend setup for our Invoice Management System. It covers architecture, database design, APIs, hosting, infrastructure, security, monitoring, and more. You don’t need a deep technical background to understand it.

## 1. Backend Architecture

### Overall Design
- We use a **modular server** built with **Node.js** and **NestJS** (or Express). Each feature (authentication, invoice handling, OCR processing, verification, payments, notifications, admin settings) lives in its own module or service.  
- The server exposes a **RESTful API** that the frontend calls over HTTPS.  
- OCR processing (text extraction from uploaded documents) runs as an **asynchronous job** queued in **AWS SQS** and handled by worker processes.  

### Supporting Scalability, Maintainability, and Performance
- **Scalability**: We package each service in a Docker container and run them on AWS ECS/EKS (or Fargate). We can add more containers under a load balancer when traffic spikes.  
- **Maintainability**: Using TypeScript and NestJS’s module pattern keeps code organized. We write unit and integration tests for each module. Configuration (database credentials, API keys) lives in environment variables managed by AWS Secrets Manager.  
- **Performance**: Frequently used data (dashboard metrics, status counts) are cached in Redis (AWS ElastiCache). Long-running tasks like OCR happen outside the API request so users don’t wait. Database queries are optimized with indexes on key columns (invoice ID, status, vendor ID).  

## 2. Database Management

### Database Technologies
- We use a **relational SQL database**: **PostgreSQL** (hosted on AWS RDS).  
- All structured data—users, roles, invoices, verification records, payments, notifications, audit logs—lives here.  
- Large files (PDF, JPG, PNG) and OCR results are stored in an **S3-compatible bucket**; we keep only the file URLs in the database.  

### Data Structure and Access
- Data is organized into tables with clear relationships (e.g., each invoice links to one vendor user).  
- We run **database migrations** (using a tool like TypeORM migrations or Flyway) to evolve the schema safely.  
- Backups happen daily, with a 10-year retention policy to meet invoice-archiving rules.  
- We enable **point-in-time recovery** on RDS to guard against accidental data loss.  

## 3. Database Schema

### Human-Readable Overview
- **Users** table: Stores login credentials, role (Vendor, Procurement Admin, Finance, Super Admin), and contact info.  
- **Roles** table: Defines permissions for each role.  
- **Invoices** table: One record per submitted invoice; fields include invoice number, vendor ID, totals, status, created/updated timestamps.  
- **InvoiceDocuments** table: Tracks each uploaded file (type: invoice, tax invoice, PO, DO/BAST, etc.), file URL, size, status.  
- **OCRResults** table: Holds extracted fields per document (invoice date, vendor name, line items).  
- **Verifications** table: Logs each procurement check (A–E points), pass/fail flags, comments.  
- **PaymentBatches** table: Groups invoices scheduled for payment, payment date, status.  
- **Notifications** table: Records in-app, email, SMS events sent.  
- **AuditLogs** table: Immutable log of every user action (who, what, when, target invoice).  

### SQL Schema (PostgreSQL)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id),
  name VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB NOT NULL
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  vendor_id INT NOT NULL REFERENCES users(id),
  invoice_number VARCHAR(100) NOT NULL,
  issue_date DATE,
  due_date DATE,
  total_amount NUMERIC(16,2),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vendor_id, invoice_number)
);

CREATE TABLE invoice_documents (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id),
  doc_type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ocr_results (
  id SERIAL PRIMARY KEY,
  document_id INT NOT NULL REFERENCES invoice_documents(id),
  extracted_data JSONB,
  processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  invoice_id INT NOT NULL REFERENCES invoices(id),
  section CHAR(1) NOT NULL,
  passed BOOLEAN,
  comments TEXT,
  checked_by INT REFERENCES users(id),
  checked_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payment_batches (
  id SERIAL PRIMARY KEY,
  batch_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE batch_items (
  batch_id INT REFERENCES payment_batches(id),
  invoice_id INT REFERENCES invoices(id),
  PRIMARY KEY(batch_id, invoice_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  channel VARCHAR(20),
  event_type VARCHAR(50),
  payload JSONB,
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(100),
  target_type VARCHAR(50),
  target_id INT,
  metadata JSONB,
  logged_at TIMESTAMP DEFAULT NOW()
);
```  

## 4. API Design and Endpoints

### Approach
- We follow a **RESTful** design: each resource has its own URL, uses standard HTTP methods (GET, POST, PUT, DELETE), and returns JSON.  
- Authentication is via **JWT tokens** passed in the `Authorization` header (`Bearer <token>`).  

### Key Endpoints

**Authentication & User Management**
- `POST /auth/login`: User logs in, receives JWT.  
- `POST /auth/refresh`: Refreshes expired token.  
- `POST /auth/reset-password`: Sends reset link.  
- `GET /admin/users`: (Super Admin) List and filter users.  
- `POST /admin/users`: Create a user.  
- `PUT /admin/users/:id`: Update user or role.  

**Invoice Lifecycle**
- `GET /invoices`: List invoices (filtered by role).  
- `POST /invoices`: Vendor submits new invoice metadata.  
- `GET /invoices/:id`: Get invoice details and status.  
- `DELETE /invoices/:id`: (Vendor or Super Admin) Remove a draft invoice.  

**Document Upload & OCR**
- `POST /invoices/:id/documents`: Upload a file (PDF, JPG, PNG ≤ 10 MB).  
- Worker queue pulls document, calls OCR service, then:  
  - `GET /invoices/:id/ocr`: View extracted fields.  
  - `PUT /invoices/:id/ocr`: Vendor can correct OCR data.  

**Verification**
- `GET /invoices/:id/verification`: Procurement Admin sees checklist and extracted data.  
- `POST /invoices/:id/verification`: Submit pass/fail results with comments.  

**Payments**
- `GET /payments/batches`: Finance lists payment batches.  
- `POST /payments/batches`: Create and schedule a new batch.  
- `GET /payments/batches/:id`: View batch details.  
- `POST /payments/batches/:id/execute`: Run payment via banking export file.  

**Notifications & Dashboard**
- `GET /notifications`: List user notifications (in-app).  
- WebSocket `/ws/notifications`: Push real-time alerts.  
- `GET /dashboard/vendor`: Vendor metrics (counts, values, processing time).  
- `GET /dashboard/procurement`: Admin metrics (pending, missing docs, top vendors).  
- `GET /dashboard/finance`: Finance metrics (aging analysis, payable amounts).  

**Audit Logs**
- `GET /admin/audit-logs`: (Super Admin) View, filter, and export logs.  

## 5. Hosting Solutions

- **Cloud Provider**: Amazon Web Services (AWS).  
- **Compute**: Docker containers on **AWS ECS/EKS** (or Fargate).  
- **Database**: **Amazon RDS (PostgreSQL)** with multi-AZ for high availability.  
- **File Storage**: **Amazon S3**–compatible bucket for invoice files and OCR outputs.  
- **Benefits**:
  - **Reliability**: RDS automated backups, ECS health checks.  
  - **Scalability**: Auto-scaling for containers, S3 for unbounded storage.  
  - **Cost-effectiveness**: Pay-as-you-go, reserved instances for RDS if needed.  

## 6. Infrastructure Components

- **Load Balancer**: AWS Application Load Balancer (ALB) routes HTTPS traffic across API containers.  
- **Caching**: AWS ElastiCache (Redis) holds session data, dashboard metrics, rate-limiting counters.  
- **Queue**: AWS SQS manages OCR and email/SMS tasks.  
- **CDN**: Amazon CloudFront serves static assets (if frontend is hosted here) and speeds up file downloads.  
- **Message Delivery**: AWS SNS (or Twilio) for SMS; AWS SES for email.  
- **Secrets Management**: AWS Secrets Manager stores DB credentials and API keys.  
- **Logging & Search**: Central logs shipped to AWS CloudWatch Logs (or Elasticsearch) for searching and alerting.  

## 7. Security Measures

- **Transport Encryption**: All traffic over HTTPS/TLS.  
- **Data Encryption at Rest**: AES-256 encryption for RDS volumes and S3 buckets.  
- **Authentication & Authorization**:
  - JWT-based sessions with proper expiration and refresh tokens.  
  - Role-Based Access Control (RBAC) enforced in API guards.  
  - Super Admin requires Two-Factor Authentication (2FA).  
- **Network Security**:
  - AWS Security Groups lock down ports (only 443 open to the internet).  
  - WAF (Web Application Firewall) for basic threat protection.  
- **Input Validation & Hardening**:
  - OWASP best practices: sanitize inputs, prevent SQL injection, XSS, CSRF.  
  - File type and size checks on uploads.  
- **Audit & Compliance**:
  - Immutable audit logs for every action.  
  - 10-year data retention to meet Indonesian tax archiving rules.  

## 8. Monitoring and Maintenance

### Monitoring Tools
- **AWS CloudWatch**: Tracks API latency, error rates, container health, database metrics.  
- **Prometheus & Grafana** (optional): Detailed application-level metrics and dashboards.  
- **ELK Stack**: Elasticsearch, Logstash, Kibana for log aggregation, search, and alerts.  
- **Alerting**: CloudWatch Alarms or Prometheus Alertmanager send emails/SMS on anomalies (high error rate, OCR failures, high-value invoices pending > 24h).  

### Maintenance Practices
- **Automated Backups**: Daily snapshots of RDS; hourly transaction logs.  
- **Database Migrations**: Managed via CLI migrations; run during low-traffic windows.  
- **Dependency Updates**: Regularly update Node.js, NestJS, and libraries; use Dependabot or Renovate.  
- **Disaster Recovery**: Cross-region backups; documented restore procedures.  
- **Health Checks**: ALB pings `/health` endpoint every 30 s; unhealthy containers get replaced.  

## 9. Conclusion and Overall Backend Summary

This backend is a secure, reliable, and scalable foundation for our Invoice Management System. Key points:
- **Modular Architecture** keeps features organized and easy to maintain.  
- **PostgreSQL + S3** cleanly separate structured data from large files.  
- **RESTful API** and WebSockets ensure smooth communication with the frontend.  
- **AWS Hosting** with load balancing, caching, queues, and managed services delivers high availability and cost control.  
- **Rigorous Security & Compliance** measures protect user data and meet Indonesian tax archiving rules.  
- **Monitoring & Automation** keep the system healthy and up-to-date.

With this setup, we meet the project’s goals: fast invoice submission, reliable OCR extraction, thorough verification workflows, clear dashboards, and smooth payment processing—all backed by a rock-solid backend.