import { useSyncExternalStore } from "react";
import { Role, Session } from "./types";

const SESSION_KEY = "asvs_session_v1";

/* Demo accounts — authentication is simulated, no real credentials exist. */
export const DEMO_USERS: Record<Role, { name: string; email: string }> = {
  applicant: { name: "Rajesh Kumar", email: "rajesh.kumar@sunriseit.edu.in" },
  officer: { name: "Meena Iyer", email: "meena.iyer@aicte-demo.gov.in" },
  admin: { name: "System Administrator", email: "admin@aicte-demo.gov.in" },
};

let session: Session | null = null;
let loaded = false;
const listeners = new Set<() => void>();

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): Session | null {
  ensure();
  return session;
}

export function getServerSession(): Session | null {
  return null;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, getServerSession);
}

export function signIn(s: Session) {
  ensure();
  session = s;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  emit();
}

export function signOut() {
  ensure();
  session = null;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

export function roleCanReview(role: Role): boolean {
  return role === "officer" || role === "admin";
}

export function roleLabel(role: Role): string {
  return role === "applicant" ? "College Applicant" : role === "officer" ? "Verification Officer" : "Administrator";
}
