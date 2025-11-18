import { ResumeChunk } from "./types";

/**
 * Parse PDF text content and convert to resume chunks
 */
export async function parsePdfToChunks(file: File): Promise<{
  chunks: Omit<ResumeChunk, "order" | "isActive">[];
  preamble: string;
}> {
  const text = await extractTextFromPdf(file);
  const chunks = parseTextToChunks(text);

  // Generate a default preamble for PDF imports
  const preamble = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{enumitem}
\\usepackage{hyperref}

\\begin{document}`;

  return { chunks, preamble };
}

/**
 * Extract text from PDF using PDF.js
 */
async function extractTextFromPdf(file: File): Promise<string> {
  // Dynamically import pdfjs-dist to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source - use local worker file
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  // Extract text from each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n\n";
  }

  return fullText;
}

/**
 * Parse extracted text into resume chunks
 */
function parseTextToChunks(
  text: string
): Omit<ResumeChunk, "order" | "isActive">[] {
  const chunks: Omit<ResumeChunk, "order" | "isActive">[] = [];

  // Common section headers in resumes
  const sectionPatterns = [
    /^(EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT)/im,
    /^(EDUCATION|ACADEMIC BACKGROUND)/im,
    /^(SKILLS|TECHNICAL SKILLS|CORE COMPETENCIES)/im,
    /^(PROJECTS|PERSONAL PROJECTS|KEY PROJECTS)/im,
    /^(CERTIFICATIONS|CERTIFICATES|LICENSES)/im,
    /^(AWARDS|ACHIEVEMENTS|HONORS)/im,
    /^(SUMMARY|PROFESSIONAL SUMMARY|PROFILE)/im,
    /^(PUBLICATIONS|RESEARCH)/im,
    /^(VOLUNTEER|VOLUNTEER EXPERIENCE)/im,
    /^(LANGUAGES|LANGUAGE SKILLS)/im,
  ];

  // Split text into lines
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let currentSection: string | null = null;
  let currentContent: string[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let isSection = false;

    // Check if this line is a section header
    for (const pattern of sectionPatterns) {
      if (pattern.test(line)) {
        // Save previous section if exists
        if (currentSection && currentContent.length > 0) {
          chunks.push(
            createChunk(currentSection, currentContent, chunkIndex++)
          );
          currentContent = [];
        }

        currentSection = line;
        isSection = true;
        break;
      }
    }

    if (!isSection && currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection && currentContent.length > 0) {
    chunks.push(createChunk(currentSection, currentContent, chunkIndex++));
  }

  // If no sections were found, create a single section with all content
  if (chunks.length === 0) {
    chunks.push({
      id: "section-0",
      type: "section",
      title: "Resume Content",
      content: text,
      rawLatex: `\\section{Resume Content}\n\n${text}`,
      tags: ["imported"],
    });
  }

  return chunks;
}

/**
 * Create a chunk from section title and content
 */
function createChunk(
  title: string,
  content: string[],
  index: number
): Omit<ResumeChunk, "order" | "isActive"> {
  const contentText = content.join("\n");

  // Convert to LaTeX format
  const latexContent = convertToLatex(contentText);
  const rawLatex = `\\section{${title}}\n\n${latexContent}`;

  return {
    id: `section-${index}`,
    type: "section",
    title: cleanTitle(title),
    content: contentText,
    rawLatex,
    tags: [cleanTitle(title).toLowerCase()],
  };
}

/**
 * Clean section title
 */
function cleanTitle(title: string): string {
  return title
    .replace(/^[^a-zA-Z]+/, "") // Remove leading non-letters
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Convert plain text to basic LaTeX format
 */
function convertToLatex(text: string): string {
  const lines = text.split("\n").filter(Boolean);
  let latex = "";

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check if line looks like a bullet point
    if (
      trimmedLine.startsWith("•") ||
      trimmedLine.startsWith("-") ||
      trimmedLine.startsWith("*")
    ) {
      const bulletContent = trimmedLine.replace(/^[•\-*]\s*/, "");
      latex += `  \\item ${escapeLatex(bulletContent)}\n`;
    }
    // Check if line looks like a job title or subsection
    else if (trimmedLine.length < 100 && /[A-Z]/.test(trimmedLine[0])) {
      // Might be a subsection
      latex += `\\subsection{${escapeLatex(trimmedLine)}}\n`;
    }
    // Regular content
    else {
      latex += `${escapeLatex(trimmedLine)}\\\\\n`;
    }
  }

  return latex;
}

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, "\\$&")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}
