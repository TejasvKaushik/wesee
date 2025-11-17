export interface ResumeChunk {
  id: string;
  type: 'section' | 'subsection' | 'item';
  title: string;
  content: string;
  rawLatex: string;
  order: number;
  isActive: boolean;
  parentId?: string;
  tags?: string[];
  metadata?: {
    company?: string;
    position?: string;
    dates?: string;
    location?: string;
  };
}

export interface ResumeData {
  preamble: string;
  activeChunks: ResumeChunk[];
  standbyChunks: ResumeChunk[];
  documentClass: string;
  packages: string[];
}

