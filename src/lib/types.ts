export type Role = "applicant" | "officer" | "admin";

export type AppStatus =
  | "draft"
  | "submitted"
  | "verification"
  | "officer_review"
  | "corrections_required"
  | "approved"
  | "rejected";

export type DocStatus = "pass" | "warning" | "fail" | "not_checked";

export type DocType = "approval" | "society" | "noc" | "affidavit" | "building" | "fee";

export type DocIssue = "mismatch" | "expired" | "missing_field";

export interface AppDoc {
  id: string;
  type: DocType;
  name: string;
  sizeKb: number;
  mime: string;
  uploadedAt: string;
  /** data URL for files uploaded during the demo session; seed docs have none */
  dataUrl?: string;
  extracted: Record<string, string>;
  issue?: DocIssue;
}

export interface Finding {
  severity: "error" | "warning";
  message: string;
}

export interface AnalysisResult {
  runAt: string;
  overall: DocStatus;
  docStatuses: Record<string, { status: DocStatus; note?: string }>;
  findings: Finding[];
}

export interface ReviewComment {
  id: string;
  author: string;
  role: Role;
  text: string;
  at: string;
}

export interface StatusEvent {
  status: AppStatus;
  at: string;
  by: string;
  note?: string;
}

export interface Course {
  name: string;
  level: "Diploma" | "Under Graduate" | "Post Graduate";
  intake: number;
  durationYears: number;
}

export interface Application {
  id: string;
  collegeName: string;
  institutionType: "Private" | "Government" | "Aided";
  applicationType: "New" | "Renewal" | "Extension";
  academicYear: string;
  establishedYear: string;
  address: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  courses: Course[];
  documents: AppDoc[];
  analysis?: AnalysisResult;
  comments: ReviewComment[];
  history: StatusEvent[];
  status: AppStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  decidedAt?: string;
  ownerEmail: string;
}

export interface Session {
  role: Role;
  name: string;
  email: string;
}

export const REQUIRED_DOCS: { type: DocType; label: string; hint: string }[] = [
  {
    type: "approval",
    label: "Previous AICTE Approval Letter (EOA)",
    hint: "Extension of Approval issued for the latest completed academic year",
  },
  {
    type: "society",
    label: "Society / Trust Registration Certificate",
    hint: "Registration certificate of the trust or society running the institution",
  },
  {
    type: "noc",
    label: "State Government NOC",
    hint: "No Objection Certificate issued by the State Government",
  },
  {
    type: "affidavit",
    label: "Mandatory Affidavit (Format A-101)",
    hint: "Affidavit on stamp paper as per AICTE Format A-101",
  },
  {
    type: "building",
    label: "Building & Infrastructure Plan",
    hint: "Sanctioned building plan with built-up area details",
  },
  {
    type: "fee",
    label: "Fee Proposal & Approval",
    hint: "Fee structure proposal for the applied academic year",
  },
];

export const DOC_LABEL: Record<DocType, string> = REQUIRED_DOCS.reduce(
  (acc, d) => ({ ...acc, [d.type]: d.label }),
  {} as Record<DocType, string>
);

export const STATUS_META: Record<AppStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-status-draft/30" },
  submitted: { label: "Submitted", className: "bg-status-submitted/25" },
  verification: { label: "Document Verification", className: "bg-status-verification/40" },
  officer_review: { label: "Officer Review", className: "bg-status-review/35" },
  corrections_required: { label: "Corrections Required", className: "bg-status-corrections/35" },
  approved: { label: "Approved", className: "bg-status-approved/30" },
  rejected: { label: "Rejected", className: "bg-status-rejected/30" },
};

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  applicant: {
    label: "College Applicant",
    description: "Create applications, upload documents, track status and resubmit corrections.",
  },
  officer: {
    label: "Verification Officer",
    description: "Verify documents, run the simulated analysis and give the final decision.",
  },
  admin: {
    label: "Administrator",
    description: "Monitor every application and report. Read-only oversight of the whole system.",
  },
};
