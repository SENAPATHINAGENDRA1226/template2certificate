import type { Placeholder, TemplateProfile } from "./cert-types";

const KEY = "cert-generator-profiles";

export function loadProfiles(): TemplateProfile[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveProfile(name: string, placeholders: Placeholder[]): TemplateProfile[] {
  const profiles = loadProfiles();
  const profile: TemplateProfile = {
    id: crypto.randomUUID(),
    name,
    placeholders: JSON.parse(JSON.stringify(placeholders)),
    createdAt: Date.now(),
  };
  const next = [profile, ...profiles];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteProfile(id: string): TemplateProfile[] {
  const next = loadProfiles().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}