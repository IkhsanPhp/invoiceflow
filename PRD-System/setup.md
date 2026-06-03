# Project Setup & Verification Instructions

This project is built using a modern **Next.js 15 Full-Stack** codebase with **Drizzle ORM** and **Better Auth** for role-based access control. Follow these instructions to set up and verify the system in your local or cloud environment.

## 1. Local Environment Configuration

Copy the sample environment variables file or edit the existing `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL=postgresql://root:123123@31.97.187.38:8800/invoiceflow

# S3 Object Storage Configuration
UPLOAD_DRIVER=s3
OBJECT_STORAGE_ENDPOINT=https://is3.cloudhost.id
OBJECT_STORAGE_BUCKET=invoiceflow
OBJECT_STORAGE_PREFIX=upload
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_ACCESS_KEY_ID=P40ZGP7XP1XCQRL6OQ01
OBJECT_STORAGE_SECRET_ACCESS_KEY=PeQ4k43xn3ZkJW5SFuAxBKihBvIznmYd1bMAWykq

# Better Auth Configuration
BETTER_AUTH_SECRET=invoiceflow_super_secret_better_auth_key_12345
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
```

## 2. Install Project Dependencies

To install all required packages, run:
```bash
npm install
```

## 3. Database Schema Setup

This project uses Drizzle ORM to manage PostgreSQL. To compile the typescript schemas and generate standard SQL migrations, run:
```bash
npm run db:generate
```

To push the compiled schema direct to the database instance, run:
```bash
npm run db:push
```

## 4. Run Development Server

To boot up the Next.js development server locally, execute:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the application dashboard, upload flow, and auth routes.
