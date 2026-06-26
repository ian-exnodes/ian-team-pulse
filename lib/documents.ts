export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "File type not allowed. Upload PDF, Word, Excel, PowerPoint, or Markdown files.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 10 MB.";
  }
  return null;
}

export function fileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType === "text/markdown") return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📑";
  return "📃";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
