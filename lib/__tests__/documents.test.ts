import { describe, expect, it } from "vitest";
import {
  validateFile,
  fileIcon,
  formatFileSize,
  MAX_FILE_SIZE,
} from "../documents";

function makeFile(name: string, type: string, size: number): File {
  return new File(["x".repeat(size)], name, { type });
}

describe("validateFile", () => {
  it("returns null for a valid PDF", () => {
    expect(validateFile(makeFile("a.pdf", "application/pdf", 1024))).toBeNull();
  });

  it("returns null for a markdown file", () => {
    expect(
      validateFile(makeFile("notes.md", "text/markdown", 512))
    ).toBeNull();
  });

  it("returns null for a docx file", () => {
    expect(
      validateFile(
        makeFile(
          "doc.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          1024
        )
      )
    ).toBeNull();
  });

  it("returns an error for a disallowed type", () => {
    expect(
      validateFile(makeFile("photo.png", "image/png", 1024))
    ).not.toBeNull();
  });

  it("returns an error when file exceeds 10 MB", () => {
    expect(
      validateFile(makeFile("big.pdf", "application/pdf", MAX_FILE_SIZE + 1))
    ).not.toBeNull();
  });

  it("returns null for a file exactly at the size limit", () => {
    expect(
      validateFile(makeFile("ok.pdf", "application/pdf", MAX_FILE_SIZE))
    ).toBeNull();
  });
});

describe("fileIcon", () => {
  it("returns 📄 for PDF", () => {
    expect(fileIcon("application/pdf")).toBe("📄");
  });

  it("returns 📝 for markdown", () => {
    expect(fileIcon("text/markdown")).toBe("📝");
  });

  it("returns 📊 for xlsx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe("📊");
  });

  it("returns 📊 for xls", () => {
    expect(fileIcon("application/vnd.ms-excel")).toBe("📊");
  });

  it("returns 📑 for pptx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
    ).toBe("📑");
  });

  it("returns 📑 for ppt", () => {
    expect(fileIcon("application/vnd.ms-powerpoint")).toBe("📑");
  });

  it("returns 📃 for Word doc", () => {
    expect(fileIcon("application/msword")).toBe("📃");
  });

  it("returns 📃 for docx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("📃");
  });
});

describe("formatFileSize", () => {
  it("formats bytes under 1 KB", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes to one decimal", () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("formats exactly 1 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});
