import {
  BookOpen,
  Briefcase,
  Code2,
  FileQuestion,
  FlaskConical,
  GraduationCap,
  Layers,
  NotebookPen,
  Presentation,
  type LucideIcon,
} from "lucide-react";

export type WorkType =
  | "assignment" | "coding" | "project" | "research" | "thesis" | "presentation" | "exam" | "career" | "other";

export const workTypes: { value: WorkType; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "assignment", label: "Assignment", hint: "Understand or approach a task", icon: NotebookPen },
  { value: "coding", label: "Coding", hint: "Bugs, concepts, code reviews", icon: Code2 },
  { value: "project", label: "Project", hint: "Mini, major or final-year", icon: Layers },
  { value: "research", label: "Research", hint: "Methods, analysis, papers", icon: FlaskConical },
  { value: "thesis", label: "Thesis", hint: "Topic to viva", icon: GraduationCap },
  { value: "presentation", label: "Presentation", hint: "Slides, delivery, viva", icon: Presentation },
  { value: "exam", label: "Exam", hint: "Preparation and concepts", icon: BookOpen },
  { value: "career", label: "Resume/Career", hint: "Resume, interviews", icon: Briefcase },
  { value: "other", label: "Other", hint: "Something else", icon: FileQuestion },
];

/** Service-page category slug -> sensible default work type. */
export const categoryToWorkType: Record<string, WorkType> = {
  academic: "assignment",
  coding: "coding",
  projects: "project",
  research: "research",
  thesis: "thesis",
  career: "career",
};

export type DeadlineOption = "today" | "tomorrow" | "2_3_days" | "this_week" | "none" | "custom";
export type BudgetOption = "suggest" | "500_1000" | "1000_2500" | "2500_5000" | "5000_plus" | "custom";
export type ContactPreference = "in_app" | "email" | "whatsapp";
// ---------------------------------------------------------------------------
// Files: PDF, DOCX, PPTX, XLSX, ZIP, images and code. Mirrors the storage
// bucket's MIME allowlist; the database enforces it again on upload.
// ---------------------------------------------------------------------------
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 10;

const mimeByExt: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  csv: "text/csv",
  md: "text/markdown",
  txt: "text/plain",
  json: "application/json",
  ipynb: "application/x-ipynb+json",
  tex: "application/x-tex",
  html: "text/html",
  css: "text/css",
  js: "text/javascript",
  py: "text/x-python",
  java: "text/x-java-source",
  c: "text/x-c",
  h: "text/x-c",
  cpp: "text/x-c++src",
  hpp: "text/x-c++src",
  // Other source files are uploaded as plain text.
  ts: "text/plain", tsx: "text/plain", jsx: "text/plain", sql: "text/plain", m: "text/plain", r: "text/plain",
  go: "text/plain", rs: "text/plain", kt: "text/plain", swift: "text/plain", cs: "text/plain", php: "text/plain",
  rb: "text/plain", sh: "text/plain", yml: "text/plain", yaml: "text/plain", xml: "text/plain",
};

export const acceptAttribute = Object.keys(mimeByExt).map((e) => `.${e}`).join(",");

export function fileExtension(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Returns the MIME type to upload with, or null if the file type isn't allowed. */
export function uploadMimeType(file: File): string | null {
  return mimeByExt[fileExtension(file.name)] ?? null;
}

export function validateFile(file: File): string | null {
  if (!uploadMimeType(file)) return `${file.name}: this file type isn't supported`;
  if (file.size > MAX_FILE_BYTES) return `${file.name}: files must be 25 MB or smaller`;
  if (file.size === 0) return `${file.name}: this file is empty`;
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Storage-safe file name (keeps it readable; strips path tricks). */
export function safeFileName(name: string) {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(-120);
}
