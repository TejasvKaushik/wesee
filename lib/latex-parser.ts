import { ResumeChunk, ResumeData } from "./types";

export function parseLatexFile(content: string): ResumeData {
  // Extract preamble
  const preambleMatch = content.match(/([\s\S]*?)\\begin\{document\}/);
  const preamble = preambleMatch ? preambleMatch[1].trim() : "";

  // Extract document body
  const bodyMatch = content.match(
    /\\begin\{document\}([\s\S]*?)\\end\{document\}/
  );
  const body = bodyMatch ? bodyMatch[1].trim() : "";

  // Extract document class
  const docClassMatch = preamble.match(/\\documentclass(?:\[.*?\])?\{(.*?)\}/);
  const documentClass = docClassMatch ? docClassMatch[1] : "article";

  // Extract packages
  const packageMatches = preamble.matchAll(
    /\\usepackage(?:\[.*?\])?\{(.*?)\}/g
  );
  const packages = Array.from(packageMatches, (m) => m[1]);

  // Parse sections
  const chunks = parseSections(body);

  return {
    preamble,
    activeChunks: chunks.map((chunk, idx) => ({
      ...chunk,
      order: idx,
      isActive: true,
    })),
    standbyChunks: [],
    documentClass,
    packages,
  };
}

function parseSections(
  body: string
): Omit<ResumeChunk, "order" | "isActive">[] {
  const chunks: Omit<ResumeChunk, "order" | "isActive">[] = [];

  // Match \section or \section*
  const sectionRegex = /\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section|$)/g;

  let match;
  let globalIndex = 0;

  while ((match = sectionRegex.exec(body)) !== null) {
    const sectionTitle = match[1];
    const sectionContent = match[2].trim();
    const sectionId = `section-${globalIndex++}`;

    chunks.push({
      id: sectionId,
      type: "section",
      title: sectionTitle,
      content: sectionContent,
      rawLatex: match[0],
      tags: [sectionTitle.toLowerCase()],
    });

    // Parse items within section (e.g., job entries)
    const items = parseItems(sectionContent, sectionId);
    chunks.push(...items);

    globalIndex += items.length;
  }

  return chunks;
}

function parseItems(
  content: string,
  parentId: string
): Omit<ResumeChunk, "order" | "isActive">[] {
  const items: Omit<ResumeChunk, "order" | "isActive">[] = [];

  // Match \subsection, \item, or custom environments like \cventry
  const patterns = [
    /\\subsection\*?\{([^}]+)\}([\s\S]*?)(?=\\subsection|\\section|$)/g,
    /\\item\s+([\s\S]*?)(?=\\item|\\end\{itemize\}|\\end\{enumerate\}|$)/g,
    /\\cventry\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
  ];

  let itemIndex = 0;

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const metadata = extractMetadata(match[0]);

      items.push({
        id: `${parentId}-item-${itemIndex++}`,
        type: "item",
        title: metadata?.position || match[1] || "Item",
        content: match[0],
        rawLatex: match[0],
        parentId,
        metadata,
      });
    }
  });

  return items;
}

function extractMetadata(latex: string): ResumeChunk["metadata"] {
  // Extract common patterns
  const dateMatch = latex.match(/\{([^}]*\d{4}[^}]*)\}/);
  const companyMatch = latex.match(/\\textbf\{([^}]+)\}/);

  return {
    dates: dateMatch ? dateMatch[1] : undefined,
    company: companyMatch ? companyMatch[1] : undefined,
  };
}
