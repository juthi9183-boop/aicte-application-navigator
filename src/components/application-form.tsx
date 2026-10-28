import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Trash2, Eye } from "lucide-react";

import { Application, AppDoc, Course, DocType, REQUIRED_DOCS } from "@/lib/types";
import { uid, formatDate } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelHeader } from "@/components/status-badge";
import { DocPreviewDialog } from "@/components/doc-preview";
import { cn } from "@/lib/utils";

const MAX_FILE_KB = 2048;

export type FormIntent = "draft" | "submit" | "resubmit";

export interface AppFormOutput {
  collegeName: string;
  institutionType: Application["institutionType"];
  applicationType: Application["applicationType"];
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
  ownerEmail: string;
}

export interface ApplicationFormProps {
  mode: "create" | "edit";
  initial?: Application | null;
  onSubmit: (values: AppFormOutput, intent: FormIntent) => void;
  onCancel: () => void;
}

interface Values {
  collegeName: string;
  institutionType: Application["institutionType"];
  applicationType: Application["applicationType"];
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
}

const STEPS = ["Institution", "Courses & Application", "Documents", "Review & Submit"];

function emptyValues(): Values {
  return {
    collegeName: "",
    institutionType: "Private",
    applicationType: "New",
    academicYear: "2026-27",
    establishedYear: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    courses: [{ name: "", level: "Under Graduate", intake: 0, durationYears: 4 }],
    documents: [],
  };
}

function fromApplication(app: Application): Values {
  return {
    collegeName: app.collegeName,
    institutionType: app.institutionType,
    applicationType: app.applicationType,
    academicYear: app.academicYear,
    establishedYear: app.establishedYear,
    address: app.address,
    city: app.city,
    district: app.district,
    state: app.state,
    pincode: app.pincode,
    contactPerson: app.contactPerson,
    contactEmail: app.contactEmail,
    contactPhone: app.contactPhone,
    courses: app.courses.length ? app.courses : emptyValues().courses,
    documents: app.documents,
  };
}

function validateStep(step: number, v: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (!v.collegeName.trim()) errors["collegeName"] = "Institution name is required";
    if (!v.establishedYear.trim() || !/^\d{4}$/.test(v.establishedYear))
      errors["establishedYear"] = "Enter a 4-digit year of establishment";
    if (!v.address.trim()) errors["address"] = "Address is required";
    if (!v.city.trim()) errors["city"] = "City is required";
    if (!v.district.trim()) errors["district"] = "District is required";
    if (!v.state.trim()) errors["state"] = "State is required";
    if (!/^\d{6}$/.test(v.pincode.trim())) errors["pincode"] = "PIN code must be 6 digits";
    if (!v.contactPerson.trim()) errors["contactPerson"] = "Contact person is required";
    if (!/^\S+@\S+\.\S+$/.test(v.contactEmail.trim())) errors["contactEmail"] = "Enter a valid email";
    if (!/^\d{10}$/.test(v.contactPhone.trim())) errors["contactPhone"] = "Enter a 10-digit phone number";
  }
  if (step === 1) {
    if (!v.academicYear.trim()) errors["academicYear"] = "Academic year is required";
    if (v.courses.length === 0) errors["courses"] = "Add at least one course";
    v.courses.forEach((c, i) => {
      if (!c.name.trim()) errors[`course-${i}-name`] = "Course name is required";
      if (!c.intake || c.intake <= 0) errors[`course-${i}-intake`] = "Intake must be greater than 0";
      if (!c.durationYears || c.durationYears <= 0) errors[`course-${i}-duration`] = "Duration must be at least 1 year";
    });
  }
  if (step === 2) {
    const have = new Set(v.documents.map((d) => d.type));
    for (const req of REQUIRED_DOCS) {
      if (!have.has(req.type)) errors[`doc-${req.type}`] = `${req.label} is required`;
    }
  }
  return errors;
}

export function ApplicationForm({ mode, initial, onSubmit, onCancel }: ApplicationFormProps) {
  const [values, setValues] = useState<Values>(() => (initial ? fromApplication(initial) : emptyValues()));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<AppDoc | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const docByType = useMemo(() => {
    const m = new Map<DocType, AppDoc>();
    values.documents.forEach((d) => m.set(d.type, d));
    return m;
  }, [values.documents]);

  function goTo(next: number) {
    if (next > step) {
      const e = validateStep(step, values);
      setErrors(e);
      if (Object.keys(e).length > 0) {
        toast.error("Please fix the highlighted fields before continuing.");
        return;
      }
    }
    setErrors({});
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFile(type: DocType, file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_KB * 1024) {
      toast.error("File too large", { description: `Keep files under ${MAX_FILE_KB / 1024} MB in the demo.` });
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) {
      toast.error("Could not read the file.");
      return;
    }
    const doc: AppDoc = {
      id: uid("doc"),
      type,
      name: file.name,
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
      mime: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
      dataUrl,
      extracted: {},
    };
    setValues((v) => ({ ...v, documents: [...v.documents.filter((d) => d.type !== type), doc] }));
    setErrors((e) => {
      const next = { ...e };
      delete next[`doc-${type}`];
      return next;
    });
    toast.success(`${file.name} uploaded`, { description: "Stored locally for this demo session." });
  }

  function removeDoc(type: DocType) {
    setValues((v) => ({ ...v, documents: v.documents.filter((d) => d.type !== type) }));
  }

  function setCourse(i: number, patch: Partial<Course>) {
    setValues((v) => ({
      ...v,
      courses: v.courses.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));
  }

  function submit(intent: FormIntent) {
    for (let s = 0; s <= 2; s += 1) {
      const e = validateStep(s, values);
      if (Object.keys(e).length > 0) {
        setStep(s);
        setErrors(e);
        toast.error("Some required details are still missing.");
        return;
      }
    }
    const output: AppFormOutput = {
      collegeName: values.collegeName.trim(),
      institutionType: values.institutionType,
      applicationType: values.applicationType,
      academicYear: values.academicYear.trim(),
      establishedYear: values.establishedYear.trim(),
      address: values.address.trim(),
      city: values.city.trim(),
      district: values.district.trim(),
      state: values.state.trim(),
      pincode: values.pincode.trim(),
      contactPerson: values.contactPerson.trim(),
      contactEmail: values.contactEmail.trim(),
      contactPhone: values.contactPhone.trim(),
      courses: values.courses.map((c) => ({ ...c, name: c.name.trim() })),
      documents: values.documents,
      ownerEmail: initial?.ownerEmail ?? values.contactEmail.trim(),
    };
    onSubmit(output, intent);
  }

  const fieldErr = (k: string) =>
    errors[k] ? <p className="text-xs font-semibold text-destructive">{errors[k]}</p> : null;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => i < step && goTo(i)}
              disabled={i > step}
              className={cn(
                "flex w-full items-center gap-2 border-2 border-foreground px-3 py-2 text-left text-xs font-bold uppercase tracking-wide",
                i === step && "bg-primary text-primary-foreground shadow-brutal-sm",
                i < step && "bg-secondary hover:bg-secondary/70",
                i > step && "opacity-50"
              )}
            >
              <span className="flex size-6 items-center justify-center border-2 border-foreground bg-card text-foreground">
                {i + 1}
              </span>
              {label}
            </button>
          </li>
        ))}
      </ol>

      {/* Step 1 — Institution */}
      {step === 0 && (
        <Panel>
          <PanelHeader title="College & institution details" subtitle="Fields marked required must be filled." />
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Institution name *</Label>
              <Input value={values.collegeName} onChange={(e) => set("collegeName", e.target.value)} />
              {fieldErr("collegeName")}
            </div>
            <div className="space-y-1.5">
              <Label>Institution type *</Label>
              <Select value={values.institutionType} onValueChange={(v) => set("institutionType", v as Values["institutionType"])}>
                <SelectTrigger className="w-full border-2 border-foreground bg-card"><SelectValue /></SelectTrigger>
                <SelectContent className="border-2 border-foreground">
                  {["Private", "Government", "Aided"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year of establishment *</Label>
              <Input value={values.establishedYear} onChange={(e) => set("establishedYear", e.target.value)} placeholder="e.g. 2005" inputMode="numeric" />
              {fieldErr("establishedYear")}
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Address *</Label>
              <Input value={values.address} onChange={(e) => set("address", e.target.value)} />
              {fieldErr("address")}
            </div>
            <div className="space-y-1.5"><Label>City *</Label><Input value={values.city} onChange={(e) => set("city", e.target.value)} />{fieldErr("city")}</div>
            <div className="space-y-1.5"><Label>District *</Label><Input value={values.district} onChange={(e) => set("district", e.target.value)} />{fieldErr("district")}</div>
            <div className="space-y-1.5"><Label>State *</Label><Input value={values.state} onChange={(e) => set("state", e.target.value)} />{fieldErr("state")}</div>
            <div className="space-y-1.5"><Label>PIN code *</Label><Input value={values.pincode} onChange={(e) => set("pincode", e.target.value)} inputMode="numeric" />{fieldErr("pincode")}</div>
            <div className="space-y-1.5"><Label>Contact person *</Label><Input value={values.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />{fieldErr("contactPerson")}</div>
            <div className="space-y-1.5"><Label>Contact email *</Label><Input type="email" value={values.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />{fieldErr("contactEmail")}</div>
            <div className="space-y-1.5"><Label>Contact phone (10 digits) *</Label><Input value={values.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} inputMode="numeric" />{fieldErr("contactPhone")}</div>
          </div>
        </Panel>
      )}

      {/* Step 2 — Courses & application */}
      {step === 1 && (
        <Panel>
          <PanelHeader title="Application & course details" subtitle="Add every course included in this application." />
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Application type *</Label>
              <Select value={values.applicationType} onValueChange={(v) => set("applicationType", v as Values["applicationType"])}>
                <SelectTrigger className="w-full border-2 border-foreground bg-card"><SelectValue /></SelectTrigger>
                <SelectContent className="border-2 border-foreground">
                  {["New", "Renewal", "Extension"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic year *</Label>
              <Input value={values.academicYear} onChange={(e) => set("academicYear", e.target.value)} placeholder="e.g. 2026-27" />
              {fieldErr("academicYear")}
            </div>
          </div>
          <div className="space-y-3 border-t-2 border-foreground px-4 py-4">
            {values.courses.map((c, i) => (
              <div key={i} className="grid gap-3 border-2 border-foreground/30 bg-secondary/50 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <div className="space-y-1">
                  <Label>Course name</Label>
                  <Input value={c.name} onChange={(e) => setCourse(i, { name: e.target.value })} />
                  {fieldErr(`course-${i}-name`)}
                </div>
                <div className="space-y-1">
                  <Label>Level</Label>
                  <Select value={c.level} onValueChange={(v) => setCourse(i, { level: v as Course["level"] })}>
                    <SelectTrigger className="w-full border-2 border-foreground bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent className="border-2 border-foreground">
                      {["Diploma", "Under Graduate", "Post Graduate"].map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Approved intake</Label>
                  <Input inputMode="numeric" value={c.intake || ""} onChange={(e) => setCourse(i, { intake: Number(e.target.value) || 0 })} />
                  {fieldErr(`course-${i}-intake`)}
                </div>
                <div className="space-y-1">
                  <Label>Duration (years)</Label>
                  <Input inputMode="numeric" value={c.durationYears || ""} onChange={(e) => setCourse(i, { durationYears: Number(e.target.value) || 0 })} />
                  {fieldErr(`course-${i}-duration`)}
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Remove course ${c.name || i + 1}`}
                    onClick={() => set("courses", values.courses.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => set("courses", [...values.courses, { name: "", level: "Under Graduate", intake: 0, durationYears: 4 }])}
            >
              + Add course
            </Button>
          </div>
        </Panel>
      )}

      {/* Step 3 — Documents */}
      {step === 2 && (
        <Panel>
          <PanelHeader
            title="Required documents"
            subtitle="PDF or image, up to 2 MB per file. Files stay in this browser."
          />
          <div className="divide-y-2 divide-foreground/20">
            {REQUIRED_DOCS.map((req) => {
              const doc = docByType.get(req.type);
              return (
                <div key={req.type} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{req.label} *</p>
                    <p className="text-xs text-muted-foreground">{req.hint}</p>
                    {doc && (
                      <p className="mt-1 truncate text-xs font-medium">
                        {doc.name} · {doc.sizeKb} KB
                      </p>
                    )}
                    {errors[`doc-${req.type}`] && (
                      <p className="text-xs font-semibold text-destructive">{errors[`doc-${req.type}`]}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {doc && (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={() => setPreviewDoc(doc)}>
                          <Eye className="size-4" /> Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputs.current[req.type]?.click()}
                        >
                          <Upload className="size-4" /> Replace
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={`Remove ${req.label}`}
                          onClick={() => removeDoc(req.type)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                    {!doc && (
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputs.current[req.type]?.click()}>
                        <Upload className="size-4" /> Upload
                      </Button>
                    )}
                    <input
                      ref={(el) => {
                        fileInputs.current[req.type] = el;
                      }}
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        void handleFile(req.type, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {/* Step 4 — Review */}
      {step === 3 && (
        <Panel>
          <PanelHeader title="Review & submit" subtitle="Check every detail before submitting to the verification queue." />
          <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Institution</p>
              <p className="font-semibold">{values.collegeName}</p>
              <p className="text-sm">{values.address}, {values.city}, {values.state} — {values.pincode}</p>
              <p className="text-sm text-muted-foreground">
                {values.institutionType} · Est. {values.establishedYear} · Contact: {values.contactPerson} ({values.contactEmail}, {values.contactPhone})
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Application</p>
              <p className="text-sm">{values.applicationType} application · Academic year {values.academicYear}</p>
              <ul className="mt-1 list-disc pl-4 text-sm">
                {values.courses.map((c, i) => (
                  <li key={i}>{c.name} · {c.level} · Intake {c.intake} · {c.durationYears} yr</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t-2 border-foreground px-4 py-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Documents ({values.documents.length}/{REQUIRED_DOCS.length})
            </p>
            <ul className="space-y-1 text-sm">
              {REQUIRED_DOCS.map((req) => {
                const doc = docByType.get(req.type);
                return (
                  <li key={req.type} className="flex items-center justify-between gap-2">
                    <span>{req.label}</span>
                    {doc ? (
                      <button type="button" className="text-xs font-bold underline" onClick={() => setPreviewDoc(doc)}>
                        {doc.name} — preview
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-destructive">Missing</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </Panel>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => goTo(step - 1)}>
            Back
          </Button>
        )}
        {step < 3 && (
          <Button onClick={() => goTo(step + 1)}>Continue</Button>
        )}
        {step === 3 && (
          <>
            {mode === "create" && (
              <Button variant="outline" onClick={() => submit("draft")}>
                Save as draft
              </Button>
            )}
            {mode === "edit" && initial?.status === "draft" && (
              <Button variant="outline" onClick={() => submit("draft")}>
                Save draft
              </Button>
            )}
            <Button onClick={() => submit(mode === "edit" && initial?.status === "corrections_required" ? "resubmit" : "submit")}>
              {mode === "edit" && initial?.status === "corrections_required" ? "Resubmit for review" : "Submit application"}
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={onCancel} className="ml-auto">
          Cancel
        </Button>
      </div>

      <DocPreviewDialog doc={previewDoc} open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)} />
      <p className="text-xs text-muted-foreground">
        Draft saved on {initial ? formatDate(initial.updatedAt) : "—"} · All data is stored locally in your browser for
        this demo.
      </p>
    </div>
  );
}
