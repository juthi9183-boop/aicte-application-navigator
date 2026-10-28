# AICTE Application Navigator

Build AICTE Smart Application Validation System

Build a fully interactive frontend prototype for an AICTE application validation system for SIH 2026. The application should demonstrate the complete process from college application submission to document checking and final officer decision.

Important: This is a frontend-only demo. Use realistic fictional data and localStorage for persistence. Do not build unnecessary features or claim to perform real AI verification.

1. Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui where useful
- React Router
- Lucide icons, used minimally
- localStorage for persistent demo data

2. Design

Use a professional Neo-brutalist UI with:

- Deep maroon: "#551522"
- Light cream: "#F7F0E4"
- Card cream: "#FFF9EF"
- Black: "#171412"
- Bold borders and subtle hard shadows
- Clean typography, generous spacing, simple tables and strong headings
- Minimal icons, no emojis, no excessive animations, no gradients or gimmicky graphics

Make the layout responsive, with a left sidebar, top navigation bar, and consistent page styling.

3. Login Page

Create a working demo login page with three clearly labeled demo roles:

- College Applicant
- Verification Officer
- Administrator

Use a demo role selector or demo login buttons. Include email/password fields, basic validation, logout, and protected navigation. Clearly label authentication as simulated.

Each role must see the appropriate pages and actions.

4. Main Pages

A. Dashboard

Show:

- Total applications
- Pending verification
- Needs attention
- Approved and rejected applications
- Application status chart
- Recent applications table
- Quick action to create an application

All metrics and charts must update from the shared application data.

B. Applications

Display a searchable, filterable table containing:

- Application ID
- College name
- Submission date
- Current status
- Document completion
- Action to view details

Allow users to open an application, continue a draft, and view its progress.

C. New Application

Build a functional multi-step form:

1. College and institution details
2. Application and course details
3. Upload required documents
4. Review and submit

Include field validation, required document checks, upload previews for supported PDFs/images, remove/replace options, save draft, and a submission confirmation page.

Generate a unique application ID when submitted. Preserve drafts and submitted records in localStorage.

D. Document Verification

Create a document review page where the officer can:

- View uploaded documents and file details
- Preview supported PDFs and images
- See required and missing documents
- View sample extracted fields
- Run a Simulated AI Analysis
- See missing information, mismatches, expired dates when applicable, and compliance warnings

The demo analysis must be deterministic and based on available application data. Show Pass, Warning, Fail, or Not Checked. Clearly label the results as simulated; do not claim to authenticate real documents.

E. Officer Review

Create a review workspace with:

- Application summary
- Document checklist
- Analysis results
- Compliance findings
- Reviewer comments

Allow the officer to:

- Request corrections with a required comment
- Approve an application
- Reject an application with a required reason

Require confirmation before final decisions. Do not allow final approval or rejection when required review steps are incomplete.

F. Application Tracking

Show a timeline:

Draft → Submitted → Document Verification → Officer Review → Approved / Corrections Required / Rejected

Applicants must be able to view the current status and officer comments. If corrections are requested, the applicant can edit the application, replace documents, and resubmit it. Preserve the review history.

G. Reports

Include a simple report page with:

- Application status distribution
- Total applications and pending reviews
- A searchable or filterable application summary
- Working CSV export

Use actual application data, not hardcoded totals.

5. Shared Demo Data and Functionality

Seed 6–8 fictional college applications with different statuses, document sets, and a few intentional missing fields or mismatches.

Use one shared data model for applications, documents, analysis results, comments, and status history.

All pages must stay synchronized. For example:

- Submitting an application updates the dashboard.
- Uploading a document updates document completion.
- Running analysis updates the verification results.
- Requesting corrections updates the application status and applicant view.
- Resubmitting returns the application to the officer's queue.
- Approving or rejecting updates the dashboard, tracking page, and reports.

Persist changes using localStorage so refreshing the browser does not reset the demo.

Use confirmation dialogs for destructive or final actions, and provide working loading, success, error, and empty states. Every visible button must perform its intended action.

6. Demo Flow to Prioritize

Make this exact journey work reliably:

1. Log in as College Applicant.
2. Create an application and upload sample documents.
3. Submit it and receive an application ID.
4. Log in as Verification Officer.
5. Open the submitted application.
6. Run simulated AI analysis and inspect findings.
7. Request corrections with a comment.
8. Log back in as the applicant, correct the application, and resubmit.
9. Log in as the officer and complete the review.
10. Approve or reject the application.
11. Verify that the final status appears on the dashboard, tracking page, and reports.

Final Requirements

Build the actual working pages, routes, forms, and state logic—not just mockups. Keep the scope focused on the pages above. Avoid adding complex features such as a full audit management system, advanced rule editor, notification center, or production backend.

Test the entire demo flow, fix broken buttons and navigation, and ensure data persists after refresh. The final product should be polished enough to demonstrate live to SIH judges.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/847b4e57-0ae7-4279-ab0e-ad0529310180).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
