import { expect, test, describe } from "vitest";
import path from "path";
import fs from "fs";

// Minimal mock to test the logic path
async function extractResumeTextMock(mimeType: string, buffer: Buffer, fileName: string) {
  if (mimeType === 'application/pdf') {
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    if (typeof pdfParse !== 'function') throw new Error("pdf-parse is not a function");
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }
  return "";
}

describe("Resume Extraction", () => {
  test("Should handle pdf-parse export correctly", async () => {
    // Valid minimal PDF buffer
    const dummyBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Title (Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    try {
      const text = await extractResumeTextMock('application/pdf', dummyBuffer, 'test.pdf');
      expect(typeof text).toBe('string');
    } catch (e: any) {
      // If pdf-parse fails on malformed buffer, it's fine, but it MUST NOT be "is not a function"
      expect(e.message).not.toBe("pdf-parse is not a function");
    }
  });

  test("Should throw error for empty buffer", async () => {
    const emptyBuffer = Buffer.alloc(0);
    await expect(extractResumeTextMock('application/pdf', emptyBuffer, 'test.pdf'))
      .rejects.toThrow();
  });
});
