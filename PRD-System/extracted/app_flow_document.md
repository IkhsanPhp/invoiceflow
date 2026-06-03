# Invoice Management System App Flow

## Onboarding and Sign-In/Sign-Up
A new user arrives at the application through a landing page that explains the system’s purpose and invites them to either request an account or log in. Vendors receive an email invitation from a Super Admin or Procurement Admin with a secure link to create their account. They provide their email address, choose a password, and confirm their details. Admin Procurement and Finance users are created by the Super Admin in the Admin Console and receive similar invitation emails to complete their profiles and set passwords. Signing in is done with the registered email and password, and a secure token keeps the user logged in across sessions. If a user forgets their password, they request a reset link on the sign-in form, receive an email with a time-limited link, set a new password, and return to sign in. The application also allows users to sign out at any time, clearing their session and returning them to the landing page.

## Main Dashboard or Home Page
After signing in, each user sees a dashboard tailored to their role. A Vendor sees an overview of all submitted invoices with status indicators, a summary of total invoice value, and a list of action items that require attention. An Admin Procurement user lands on a page showing invoices that await verification, counts by status, and a quick filter to surface invoices missing documents or with data mismatches. A Finance user sees approved invoices pending payment, a breakdown of payment schedules, and a cash flow forecast widget. A Super Admin enters a console that displays system health, user counts by role, audit log summaries, and recent system notifications. A consistent header across all dashboards provides access to global navigation, notifications, and the user menu, while a sidebar offers links to Invoices, Audit Trail, Settings, and Help.

## Detailed Feature Flows and Page Transitions
When a Vendor clicks on Upload Invoice, the system presents a form that allows adding invoice, tax invoice, purchase order, delivery order, and other supporting files. The Vendor uploads each document in PDF, JPG, JPEG, or PNG format under 10 MB. Once files are added, the system calls OCR in the background to extract key fields and populates the form. The Vendor reviews the extracted values, corrects any errors, and submits the invoice. The invoice status immediately changes to Pending OCR, then to Pending Review once the OCR step completes. The Vendor can view the original files and extracted data in the Invoice Details page.
An Admin Procurement user clicks on Invoices Awaiting Verification in the sidebar, sees the list of newly submitted invoices, and selects one to open its detail view. The Verification page shows the extracted data side by side with the supporting documents. The user works through completeness of documents, validates vendor and invoice data, checks item descriptions and quantities against the purchase order, confirms tax calculations and regulatory compliance, and verifies financial totals. If any check fails, the user marks the invoice as Needs Revision, enters a clear explanation of what is missing or incorrect, and saves. The system notifies the Vendor via in-app alert, email, and SMS if the case is urgent. If all checks pass, the user marks the invoice as Verified and the system sets its status to Ready for Payment and notifies the Finance user.
A Finance user opens the Pending Payments queue, reviews each verified invoice along with its procurement notes, and either approves or rejects payment. For approved invoices, the Finance user schedules a payment run, consolidates invoices into a batch, and executes the payment. The system records the payment date, updates the invoice status to Paid, and sends confirmation notifications. Finance users can export payment files in CSV or MT940 formats and generate AP aging and cash flow reports from the Reports page.
The Super Admin accesses the Admin Console to add or remove users, assign roles, configure global tax rates, adjust OCR templates, set notification rules, and view or export audit logs. When configuration changes occur, the system validates new settings and applies them immediately across the application.

## Settings and Account Management
The Settings area lets users update personal profile information such as name, contact number, and password. Users choose their preferred notification channels and toggle in-app alerts, email digests, or SMS alerts for each event type. Vendors can opt into or out of SMS alerts for urgent revisions or payment reminders. Procurement Admin and Finance users configure their dashboard filters and report preferences. The Super Admin defines system-wide settings here, including tax rates, retention policies, and storage options. After making changes, users click Save and the system confirms updates. A breadcrumb or header link always returns them to the main dashboard or previous page.

## Error States and Alternate Paths
If a user attempts to upload a file that exceeds 10 megabytes or uses an unsupported format, the system shows a clear error message explaining allowed formats and size limits. When OCR extraction fails due to poor image quality or system timeouts, the application displays an error banner with a Retry button. If network connectivity is lost during form submission, the user sees a message indicating offline status and can retry submission once back online; unsaved form data remains intact. When an Admin Procurement user attempts to verify an invoice that another user is already editing, the application locks the record for the other user and displays a notice that the invoice is locked. If a Finance payment execution fails due to bank connectivity issues, the system flags the invoice as Payment Error, logs the failure in the audit trail, and triggers a Super Admin alert.

## Conclusion and Overall App Journey
In summary, a Vendor signs up via an invitation link, uploads invoice documents through a guided form that uses OCR for data entry, and monitors status updates on their dashboard. A Procurement Admin reviews vendor submissions against a detailed checklist, sends feedback or approves invoices, and triggers the Finance workflow. A Finance user schedules and executes payments, reconciles entries, and generates reports. A Super Admin oversees the entire process with user management, system configuration, and audit log access. Throughout, real-time notifications and dashboards keep every user informed, ensuring invoices move smoothly from submission to payment within the target processing time.

## ASCII Flowchart
```
Start
  |
  v
[Landing Page] --> [Sign Up or Sign In]
  |                    |
  v                    v
[Dashboard: Vendor]   [Dashboard: Admin/Finance/Super]
  |   \               /   |
  |    \             /    |
  v     v           v     v
[Upload Invoice]  [Verify Invoice]  [Schedule Payment]  [Admin Console]
  |     |           |       |       |
  |     v           v       v       v
  ---> [OCR & Pre-fill Form] ---> [Needs Revision or Verified] ---> [Notifications]
                                      |                          |
                                      v                          v
                                 [Ready for Payment] ---> [Paid Status]
                                      |
                                      v
                                    End
```