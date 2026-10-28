import { useSyncExternalStore } from "react";
import {
  AppDoc,
  AppStatus,
  Application,
  DocType,
  REQUIRED_DOCS,
  ReviewComment,
  StatusEvent,
} from "./types";

/* ------------------------------------------------------------------ */
/* IDs and small helpers                                               */
/* ------------------------------------------------------------------ */

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`;
}

export function docCompletion(app: Application): number {
  const have = new Set(app.documents.map((d) => d.type));
  return Math.round((REQUIRED_DOCS.filter((r) => have.has(r.type)).length / REQUIRED_DOCS.length) * 100);
}

export function missingDocTypes(app: Application): DocType[] {
  const have = new Set(app.documents.map((d) => d.type));
  return REQUIRED_DOCS.filter((r) => !have.has(r.type)).map((r) => r.type);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ------------------------------------------------------------------ */
/* Simulated AI analysis — deterministic, derived only from app data   */
/* ------------------------------------------------------------------ */

export function runAnalysis(app: Application) {
  const docStatuses: Record<string, { status: "pass" | "warning" | "fail"; note?: string }> = {};
  const findings: { severity: "error" | "warning"; message: string }[] = [];

  for (const req of REQUIRED_DOCS) {
    const doc = app.documents.find((d) => d.type === req.type);
    if (!doc) {
      docStatuses[req.type] = { status: "fail", note: "Not uploaded" };
      findings.push({ severity: "error", message: `Missing required document: ${req.label}` });
      continue;
    }
    if (doc.issue === "mismatch") {
      docStatuses[req.type] = { status: "fail", note: "Name mismatch detected" };
      findings.push({
        severity: "error",
        message: `Institution name on "${doc.name}" does not match the application record (expected "${app.collegeName}").`,
      });
      continue;
    }
    if (doc.issue === "expired") {
      const until = doc.extracted["validUntil"] ?? doc.extracted["validUpto"] ?? "the recorded date";
      docStatuses[req.type] = { status: "warning", note: `Expired on ${until}` };
      findings.push({
        severity: "warning",
        message: `Validity of "${doc.name}" expired on ${until}. A renewed document is required.`,
      });
      continue;
    }
    if (doc.issue === "missing_field") {
      const field = doc.extracted["missingField"] ?? "a required value";
      docStatuses[req.type] = { status: "warning", note: "Field not extracted" };
      findings.push({
        severity: "warning",
        message: `Required field "${field}" could not be extracted from "${doc.name}".`,
      });
      continue;
    }
    docStatuses[req.type] = { status: "pass" };
  }

  if (!app.contactPhone.trim()) {
    findings.push({ severity: "error", message: "Contact phone number is missing from the application." });
  }
  for (const c of app.courses) {
    if (!c.intake || c.intake <= 0) {
      findings.push({ severity: "error", message: `Course "${c.name}" has no approved intake value.` });
    }
  }

  const hasError = findings.some((f) => f.severity === "error");
  const hasWarning = findings.some((f) => f.severity === "warning");
  const overall = hasError ? "fail" : hasWarning ? "warning" : "pass";
  return { runAt: new Date().toISOString(), overall, docStatuses, findings };
}

export function canOfficerApprove(app: Application): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!app.analysis) reasons.push("Simulated AI analysis has not been run yet.");
  const missing = missingDocTypes(app);
  if (missing.length > 0) reasons.push(`${missing.length} required document(s) still missing.`);
  if (app.analysis?.overall === "fail") reasons.push("Analysis found blocking errors — resolve or reject instead.");
  return { ok: reasons.length === 0, reasons };
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

export function pushHistory(app: Application, status: AppStatus, by: string, note?: string): StatusEvent[] {
  const event: StatusEvent = note === undefined ? { status, at: new Date().toISOString(), by } : { status, at: new Date().toISOString(), by, note };
  return [...app.history, event];
}

export function addComment(
  app: Application,
  author: string,
  role: ReviewComment["role"],
  text: string
): ReviewComment[] {
  return [...app.comments, { id: uid("cmt"), author, role, text, at: new Date().toISOString() }];
}

/* ------------------------------------------------------------------ */
/* Shared localStorage store (single source of truth for all pages)     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "asvs_applications_v1";

let apps: Application[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
  } catch {
    /* storage full or unavailable — demo keeps working in memory */
  }
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    apps = raw ? (JSON.parse(raw) as Application[]) : seedApplications();
  } catch {
    apps = seedApplications();
  }
  if (typeof apps !== "object" || !Array.isArray(apps)) apps = seedApplications();
  persist();
}

function emit() {
  listeners.forEach((l) => l());
}

export function getApps(): Application[] {
  ensure();
  return apps;
}

export function getServerApps(): Application[] {
  return [];
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useApps(): Application[] {
  return useSyncExternalStore(subscribe, getApps, getServerApps);
}

export function getApp(id: string): Application | undefined {
  return getApps().find((a) => a.id === id);
}

export function saveApplication(app: Application) {
  ensure();
  const exists = apps.some((a) => a.id === app.id);
  apps = exists ? apps.map((a) => (a.id === app.id ? app : a)) : [app, ...apps];
  persist();
  emit();
}

export function patchApplication(id: string, patch: Partial<Application>) {
  ensure();
  apps = apps.map((a) =>
    a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
  );
  persist();
  emit();
}

export function nextApplicationId(): string {
  ensure();
  const nums = apps
    .map((a) => Number.parseInt(a.id.split("-").pop() ?? "0", 10))
    .filter((n) => Number.isFinite(n));
  const max = Math.max(1000, ...(nums.length ? nums : [1000]));
  return `AICTE-2026-${max + 1}`;
}

export function resetDemoData() {
  ensure();
  apps = seedApplications();
  persist();
  emit();
}

/* ------------------------------------------------------------------ */
/* Seed data — 7 fictional applications with planted demo issues       */
/* ------------------------------------------------------------------ */

function seedDoc(
  type: DocType,
  name: string,
  extracted: Record<string, string>,
  opts: { issue?: AppDoc["issue"]; uploadedAt?: string; sizeKb?: number } = {}
): AppDoc {
  const doc: AppDoc = {
    id: uid("doc"),
    type,
    name,
    sizeKb: opts.sizeKb ?? 240,
    mime: "application/pdf",
    uploadedAt: opts.uploadedAt ?? "2026-09-14T09:30:00.000Z",
    extracted,
  };
  if (opts.issue) doc.issue = opts.issue;
  return doc;
}

export function seedApplications(): Application[] {
  const mk = (
    a: Omit<Application, "createdAt" | "updatedAt"> & { createdAt?: string }
  ): Application => {
    const createdAt = a.createdAt ?? a.submittedAt ?? a.history[0]?.at ?? "2026-09-10T09:00:00.000Z";
    return {
      ...a,
      createdAt,
      updatedAt: a.decidedAt ?? a.submittedAt ?? a.history[a.history.length - 1]?.at ?? createdAt,
    };
  };

  const fullDocs = (prefix: string, uploadedAt: string, opts: Partial<Record<DocType, AppDoc["issue"]>> = {}) =>
    [
      seedDoc("approval", `${prefix}-EOA-2025-26.pdf`, {
        approvalNo: "F.No. Southern/2025-26/EOA-0142",
        issuedOn: "2025-06-30",
        validUntil: "2026-06-30",
        institutionName: prefix,
      }, { issue: opts.approval, uploadedAt }),
      seedDoc("society", `${prefix}-society-registration.pdf`, {
        regNo: "MH/1998/004521",
        regDate: "1998-04-12",
        societyName: prefix,
        state: "Maharashtra",
      }, { issue: opts.society, uploadedAt }),
      seedDoc("noc", `${prefix}-state-NOC.pdf`, {
        nocNo: "NOC/EDU/2026/0771",
        issuedBy: "State Higher Education Department",
        issuedOn: "2026-01-18",
      }, { issue: opts.noc, uploadedAt }),
      seedDoc("affidavit", `${prefix}-affidavit-A101.pdf`, {
        affidavitNo: "AF-2026-3391",
        stampedOn: "2026-02-02",
        validUntil: "2027-02-02",
        deponent: "Chairman, Governing Body",
      }, { issue: opts.affidavit, uploadedAt }),
      seedDoc("building", `${prefix}-building-plan.pdf`, {
        plotArea: "4.2 acres",
        builtUpArea: "18,400 sq m",
        sanctionedPlanNo: "BP/2024/5567",
      }, { issue: opts.building, uploadedAt }),
      seedDoc("fee", `${prefix}-fee-proposal.pdf`, {
        totalFeeProposed: "Rs. 1,14,000 per year",
        academicYear: "2026-27",
        approvedBy: "State Fee Committee",
      }, { issue: opts.fee, uploadedAt }),
    ] as AppDoc[];

  return [
    mk({
      id: "AICTE-2026-1001",
      collegeName: "Sunrise Institute of Technology",
      institutionType: "Private",
      applicationType: "Renewal",
      academicYear: "2026-27",
      establishedYear: "2001",
      address: "Plot 14, Knowledge Park Road",
      city: "Pune",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411045",
      contactPerson: "Rajesh Kumar",
      contactEmail: "registrar@sunriseit.edu.in",
      contactPhone: "9822014567",
      courses: [
        { name: "Computer Science & Engineering", level: "Under Graduate", intake: 120, durationYears: 4 },
        { name: "Mechanical Engineering", level: "Under Graduate", intake: 60, durationYears: 4 },
      ],
      documents: fullDocs("SunriseIT", "2026-09-14T09:30:00.000Z"),
      analysis: {
        runAt: "2026-10-12T11:05:00.000Z",
        overall: "pass",
        docStatuses: {
          approval: { status: "pass" },
          society: { status: "pass" },
          noc: { status: "pass" },
          affidavit: { status: "pass" },
          building: { status: "pass" },
          fee: { status: "pass" },
        },
        findings: [],
      },
      comments: [
        {
          id: uid("cmt"),
          author: "Meena Iyer",
          role: "officer",
          text: "All documents verified. No mismatches found. Recommended for approval.",
          at: "2026-10-14T10:20:00.000Z",
        },
      ],
      history: [
        { status: "submitted", at: "2026-09-14T10:00:00.000Z", by: "Rajesh Kumar" },
        { status: "verification", at: "2026-09-15T09:15:00.000Z", by: "System" },
        { status: "officer_review", at: "2026-10-12T11:10:00.000Z", by: "Meena Iyer" },
        { status: "approved", at: "2026-10-15T16:40:00.000Z", by: "Meena Iyer", note: "Compliance verified." },
      ],
      status: "approved",
      submittedAt: "2026-09-14T10:00:00.000Z",
      decidedAt: "2026-10-15T16:40:00.000Z",
      ownerEmail: "rajesh.kumar@sunriseit.edu.in",
    }),
    mk({
      id: "AICTE-2026-1002",
      collegeName: "Deccan Women's Polytechnic",
      institutionType: "Aided",
      applicationType: "New",
      academicYear: "2026-27",
      establishedYear: "2012",
      address: "18, Bhasha Bhavan Lane",
      city: "Hyderabad",
      district: "Hyderabad",
      state: "Telangana",
      pincode: "500081",
      contactPerson: "Fatima Sheikh",
      contactEmail: "principal@deccanwp.ac.in",
      contactPhone: "9701045521",
      courses: [{ name: "Diploma in Electronics", level: "Diploma", intake: 60, durationYears: 3 }],
      documents: [
        seedDoc("approval", "DeccanWP-EOA-2025-26.pdf", {
          approvalNo: "F.No. Southern/2025-26/EOA-0330",
          issuedOn: "2025-06-28",
          validUntil: "2026-06-30",
          institutionName: "Deccan Women's Polytechnic",
        }),
        seedDoc("society", "DeccanWP-society-registration.pdf", {
          regNo: "TS/2011/009918",
          regDate: "2011-11-05",
          societyName: "Deccan Women's Polytechnic",
          state: "Telangana",
        }),
      ],
      analysis: {
        runAt: "2026-10-08T14:30:00.000Z",
        overall: "fail",
        docStatuses: {
          approval: { status: "pass" },
          society: { status: "pass" },
          noc: { status: "fail", note: "Not uploaded" },
          affidavit: { status: "fail", note: "Not uploaded" },
          building: { status: "fail", note: "Not uploaded" },
          fee: { status: "fail", note: "Not uploaded" },
        },
        findings: [
          { severity: "error", message: "Missing required document: State Government NOC" },
          { severity: "error", message: "Missing required document: Mandatory Affidavit (Format A-101)" },
          { severity: "error", message: "Missing required document: Building & Infrastructure Plan" },
          { severity: "error", message: "Missing required document: Fee Proposal & Approval" },
        ],
      },
      comments: [
        {
          id: uid("cmt"),
          author: "Meena Iyer",
          role: "officer",
          text: "Four mandatory documents were never uploaded. Application rejected; the institution may apply afresh with a complete set.",
          at: "2026-10-09T09:45:00.000Z",
        },
      ],
      history: [
        { status: "submitted", at: "2026-09-20T12:00:00.000Z", by: "Fatima Sheikh" },
        { status: "verification", at: "2026-09-21T09:15:00.000Z", by: "System" },
        { status: "officer_review", at: "2026-10-08T14:35:00.000Z", by: "Meena Iyer" },
        { status: "rejected", at: "2026-10-09T10:00:00.000Z", by: "Meena Iyer", note: "Incomplete document set." },
      ],
      status: "rejected",
      submittedAt: "2026-09-20T12:00:00.000Z",
      decidedAt: "2026-10-09T10:00:00.000Z",
      ownerEmail: "fatima.sheikh@deccanwp.ac.in",
    }),
    mk({
      id: "AICTE-2026-1003",
      collegeName: "Vidya Bharati College of Engineering",
      institutionType: "Private",
      applicationType: "Renewal",
      academicYear: "2026-27",
      establishedYear: "1996",
      address: "Ring Road, Sector 9",
      city: "Indore",
      district: "Indore",
      state: "Madhya Pradesh",
      pincode: "452010",
      contactPerson: "Anil Deshmukh",
      contactEmail: "office@vidyabharati.ac.in",
      contactPhone: "9425067788",
      courses: [
        { name: "Computer Science & Engineering", level: "Under Graduate", intake: 180, durationYears: 4 },
        { name: "Civil Engineering", level: "Under Graduate", intake: 60, durationYears: 4 },
      ],
      documents: fullDocs("VidyaBharati", "2026-09-22T11:00:00.000Z", {
        affidavit: "expired",
      }),
      analysis: {
        runAt: "2026-10-18T09:40:00.000Z",
        overall: "warning",
        docStatuses: {
          approval: { status: "pass" },
          society: { status: "pass" },
          noc: { status: "pass" },
          affidavit: { status: "warning", note: "Expired on 2026-05-31" },
          building: { status: "pass" },
          fee: { status: "pass" },
        },
        findings: [
          {
            severity: "warning",
            message: 'Validity of "VidyaBharati-affidavit-A101.pdf" expired on 2026-05-31. A renewed document is required.',
          },
        ],
      },
      comments: [],
      history: [
        { status: "submitted", at: "2026-09-22T11:30:00.000Z", by: "Anil Deshmukh" },
        { status: "verification", at: "2026-09-23T09:15:00.000Z", by: "System" },
        { status: "officer_review", at: "2026-10-18T09:45:00.000Z", by: "Meena Iyer" },
      ],
      status: "officer_review",
      submittedAt: "2026-09-22T11:30:00.000Z",
      ownerEmail: "anil.deshmukh@vidyabharati.ac.in",
    }),
    mk({
      id: "AICTE-2026-1004",
      collegeName: "Lotus Valley Institute of Management",
      institutionType: "Private",
      applicationType: "New",
      academicYear: "2026-27",
      establishedYear: "2019",
      address: "Survey 42, Lotus Valley Township",
      city: "Nagpur",
      district: "Nagpur",
      state: "Maharashtra",
      pincode: "440022",
      contactPerson: "Priya Nair",
      contactEmail: "admin@lotusvalleyim.edu.in",
      contactPhone: "9765432109",
      courses: [
        { name: "Master of Business Administration", level: "Post Graduate", intake: 120, durationYears: 2 },
      ],
      documents: fullDocs("LotusValley", "2026-10-19T15:20:00.000Z"),
      comments: [],
      history: [
        { status: "submitted", at: "2026-10-19T15:25:00.000Z", by: "Priya Nair" },
      ],
      status: "submitted",
      submittedAt: "2026-10-19T15:25:00.000Z",
      ownerEmail: "priya.nair@lotusvalleyim.edu.in",
    }),
    mk({
      id: "AICTE-2026-1005",
      collegeName: "Marathwada College of Pharmacy",
      institutionType: "Private",
      applicationType: "Extension",
      academicYear: "2026-27",
      establishedYear: "2008",
      address: "opp. District Hospital, Nirala Bazar",
      city: "Aurangabad",
      district: "Aurangabad",
      state: "Maharashtra",
      pincode: "431001",
      contactPerson: "Sunil Patil",
      contactEmail: "registrar@mcpharmacy.edu.in",
      contactPhone: "9028765432",
      courses: [
        { name: "B.Pharm", level: "Under Graduate", intake: 100, durationYears: 4 },
        { name: "D.Pharm", level: "Diploma", intake: 60, durationYears: 2 },
      ],
      documents: fullDocs("MarathwadaPharma", "2026-09-28T10:10:00.000Z", {
        society: "mismatch",
        fee: undefined,
      }).filter((d) => d.type !== "fee"),
      analysis: {
        runAt: "2026-10-20T13:00:00.000Z",
        overall: "fail",
        docStatuses: {
          approval: { status: "pass" },
          society: { status: "fail", note: "Name mismatch detected" },
          noc: { status: "pass" },
          affidavit: { status: "pass" },
          building: { status: "pass" },
          fee: { status: "fail", note: "Not uploaded" },
        },
        findings: [
          {
            severity: "error",
            message: 'Institution name on "MarathwadaPharma-society-registration.pdf" does not match the application record (expected "Marathwada College of Pharmacy").',
          },
          { severity: "error", message: "Missing required document: Fee Proposal & Approval" },
        ],
      },
      comments: [
        {
          id: uid("cmt"),
          author: "Meena Iyer",
          role: "officer",
          text: "Society registration certificate carries a different institution name and the fee proposal is missing. Please upload the corrected registration certificate and the fee proposal, then resubmit.",
          at: "2026-10-21T11:30:00.000Z",
        },
      ],
      history: [
        { status: "submitted", at: "2026-09-28T10:15:00.000Z", by: "Sunil Patil" },
        { status: "verification", at: "2026-09-29T09:15:00.000Z", by: "System" },
        { status: "officer_review", at: "2026-10-20T13:05:00.000Z", by: "Meena Iyer" },
        {
          status: "corrections_required",
          at: "2026-10-21T11:35:00.000Z",
          by: "Meena Iyer",
          note: "Society registration name mismatch; fee proposal missing.",
        },
      ],
      status: "corrections_required",
      submittedAt: "2026-09-28T10:15:00.000Z",
      ownerEmail: "sunil.patil@mcpharmacy.edu.in",
    }),
    mk({
      id: "AICTE-2026-1006",
      collegeName: "Kaveri Institute of Science",
      institutionType: "Government",
      applicationType: "Renewal",
      academicYear: "2026-27",
      establishedYear: "1987",
      address: "Kaveri Nagar, Sir M.V. Road",
      city: "Mysuru",
      district: "Mysuru",
      state: "Karnataka",
      pincode: "570029",
      contactPerson: "Lakshmi Rao",
      contactEmail: "principal@kaverisci.edu.in",
      contactPhone: "",
      courses: [{ name: "Computer Applications (MCA)", level: "Post Graduate", intake: 60, durationYears: 2 }],
      documents: fullDocs("KaveriScience", "2026-10-22T09:45:00.000Z", {
        building: "missing_field",
      }),
      comments: [],
      history: [{ status: "submitted", at: "2026-10-22T09:50:00.000Z", by: "Lakshmi Rao" }],
      status: "submitted",
      submittedAt: "2026-10-22T09:50:00.000Z",
      ownerEmail: "lakshmi.rao@kaverisci.edu.in",
    }),
    mk({
      id: "AICTE-2026-1007",
      collegeName: "Shree Ganesh Degree College",
      institutionType: "Private",
      applicationType: "New",
      academicYear: "2026-27",
      establishedYear: "2021",
      address: "Ganesh Marg, Near Bus Stand",
      city: "Kolhapur",
      district: "Kolhapur",
      state: "Maharashtra",
      pincode: "416001",
      contactPerson: "Rajesh Kumar",
      contactEmail: "rajesh.kumar@sunriseit.edu.in",
      contactPhone: "9822014567",
      courses: [{ name: "B.Sc. Computer Science", level: "Under Graduate", intake: 80, durationYears: 3 }],
      documents: [
        seedDoc("society", "GaneshDegree-society-registration.pdf", {
          regNo: "MH/2020/011345",
          regDate: "2020-07-19",
          societyName: "Shree Ganesh Degree College",
          state: "Maharashtra",
        }, { uploadedAt: "2026-10-25T09:00:00.000Z" }),
      ],
      comments: [],
      history: [],
      status: "draft",
      createdAt: "2026-10-25T09:00:00.000Z",
      ownerEmail: "rajesh.kumar@sunriseit.edu.in",
    }),
  ];
}
