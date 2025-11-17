import { ResumeData, ResumeChunk } from './types';

export function generateLatex(data: ResumeData): string {
  const { preamble, activeChunks } = data;
  
  // Sort chunks by order
  const sortedChunks = [...activeChunks]
    .filter(chunk => chunk.isActive)
    .sort((a, b) => a.order - b.order);
  
  // Group chunks by parent (for nested structures)
  const sectionChunks = sortedChunks.filter(c => c.type === 'section');
  
  let latex = preamble + '\n\n\\begin{document}\n\n';
  
  sectionChunks.forEach(section => {
    latex += section.rawLatex;
    
    // Add child items
    const childItems = sortedChunks.filter(c => c.parentId === section.id);
    childItems.forEach(item => {
      latex += '\n' + item.rawLatex;
    });
    
    latex += '\n\n';
  });
  
  latex += '\\end{document}';
  
  return latex;
}

export function updateChunkInLatex(chunk: ResumeChunk, newContent: string): ResumeChunk {
  // Preserve LaTeX structure while updating content
  return {
    ...chunk,
    content: newContent,
    rawLatex: newContent
  };
}

