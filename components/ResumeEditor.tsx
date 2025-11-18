"use client";

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  Download,
  Eye,
  GripVertical,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import React, { useState } from "react";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";
import { parseLatexFile } from "@/lib/latex-parser";
import { parsePdfToChunks } from "@/lib/pdf-parser";
import { useSortable } from "@dnd-kit/sortable";

interface ResumeChunk {
  id: string;
  type: "section" | "item";
  title: string;
  content: string;
  rawLatex: string;
  order: number;
  isActive: boolean;
  parentId?: string;
}

function SortableChunk({
  chunk,
  onDelete,
  onToggle,
}: {
  chunk: ResumeChunk;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chunk.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-4 mb-2 ${
        isDragging ? "shadow-lg" : "shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 text-xs rounded ${
                chunk.type === "section"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {chunk.type}
            </span>
            <h3 className="font-semibold text-gray-900 truncate">
              {chunk.title}
            </h3>
          </div>
          <pre className="text-xs text-gray-600 overflow-x-auto bg-gray-50 p-2 rounded max-h-24 overflow-y-auto">
            {chunk.rawLatex.slice(0, 200)}
            {chunk.rawLatex.length > 200 ? "..." : ""}
          </pre>
        </div>

        <div className="flex gap-1">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title={chunk.isActive ? "Move to standby" : "Add to resume"}
          >
            {chunk.isActive ? (
              <Eye className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-50 rounded text-red-600"
            title="Delete chunk"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResumeBuilder() {
  const [chunks, setChunks] = useState<ResumeChunk[]>([
    {
      id: "1",
      type: "section",
      title: "Experience",
      content: "",
      rawLatex:
        "\\section{Experience}\n\n\\subsection{Software Engineer at TechCorp}\n\\textit{Jan 2022 - Present}\n\\begin{itemize}\n  \\item Led development of microservices architecture\n  \\item Improved system performance by 40\\%\n\\end{itemize}",
      order: 0,
      isActive: true,
    },
    {
      id: "2",
      type: "section",
      title: "Education",
      content: "",
      rawLatex:
        "\\section{Education}\n\n\\subsection{B.S. Computer Science}\n\\textit{University of Technology, 2018-2022}\nGPA: 3.8/4.0",
      order: 1,
      isActive: true,
    },
    {
      id: "3",
      type: "section",
      title: "Skills",
      content: "",
      rawLatex:
        "\\section{Skills}\n\n\\textbf{Languages:} Python, JavaScript, TypeScript, Java\\\\\n\\textbf{Frameworks:} React, Next.js, Node.js, Django",
      order: 2,
      isActive: true,
    },
    {
      id: "4",
      type: "item",
      title: "Senior Developer Role",
      content: "",
      rawLatex:
        "\\subsection{Senior Developer at StartupXYZ}\n\\textit{Jun 2020 - Dec 2021}\n\\begin{itemize}\n  \\item Built scalable web applications\n  \\item Mentored junior developers\n\\end{itemize}",
      order: 3,
      isActive: false,
    },
    {
      id: "5",
      type: "section",
      title: "Projects",
      content: "",
      rawLatex:
        "\\section{Projects}\n\n\\textbf{Open Source Contribution}\\\\\nContributed to popular React libraries with 1000+ stars",
      order: 4,
      isActive: false,
    },
  ]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [preamble, setPreamble] =
    useState(`\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{geometry}
\\geometry{margin=1in}

\\begin{document}

\\begin{center}
{\\Large \\textbf{John Doe}}\\\\
john.doe@email.com | (555) 123-4567 | github.com/johndoe
\\end{center}

\\vspace{0.5cm}`);

  const activeChunks = chunks
    .filter((c) => c.isActive)
    .sort((a, b) => a.order - b.order);
  const standbyChunks = chunks
    .filter((c) => !c.isActive)
    .sort((a, b) => a.order - b.order);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeChunk = chunks.find((c) => c.id === active.id);
    const overChunk = chunks.find((c) => c.id === over.id);

    if (!activeChunk || !overChunk) return;

    // Only allow reordering within same list (active or standby)
    if (activeChunk.isActive === overChunk.isActive) {
      const items = activeChunk.isActive ? activeChunks : standbyChunks;
      const oldIndex = items.findIndex((c) => c.id === active.id);
      const newIndex = items.findIndex((c) => c.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);

      setChunks((prev) =>
        prev.map((chunk) => {
          const reorderedChunk = reordered.find((r) => r.id === chunk.id);
          if (reorderedChunk) {
            return { ...chunk, order: reordered.indexOf(reorderedChunk) };
          }
          return chunk;
        })
      );
    }
  };

  const toggleChunkActive = (id: string) => {
    setChunks((prev) =>
      prev.map((chunk) =>
        chunk.id === id ? { ...chunk, isActive: !chunk.isActive } : chunk
      )
    );
  };

  const deleteChunk = (id: string) => {
    setChunks((prev) => prev.filter((chunk) => chunk.id !== id));
  };

  const generateLatex = () => {
    let latex = preamble + "\n\n";
    activeChunks.forEach((chunk) => {
      latex += chunk.rawLatex + "\n\n";
    });
    latex += "\\end{document}";
    return latex;
  };

  const downloadLatex = () => {
    const latex = generateLatex();
    const blob = new Blob([latex], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.tex";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "pdf") {
        // Handle PDF upload
        const { chunks: parsedChunks, preamble: defaultPreamble } =
          await parsePdfToChunks(file);

        // Update preamble
        setPreamble(defaultPreamble);

        // Update chunks - all chunks start as active
        const allChunks = parsedChunks.map((chunk, idx) => ({
          id: chunk.id,
          type: chunk.type as "section" | "item",
          title: chunk.title,
          content: chunk.content,
          rawLatex: chunk.rawLatex,
          order: idx,
          isActive: true,
          parentId: chunk.parentId,
        }));

        setChunks(allChunks);

        alert(
          `Successfully loaded ${allChunks.length} sections from PDF: ${file.name}!\n\nNote: PDF import is experimental. Please review and edit the sections as needed.`
        );
      } else if (fileExtension === "tex") {
        // Handle LaTeX upload
        const content = await file.text();
        const parsedData = parseLatexFile(content);

        // Update preamble
        setPreamble(parsedData.preamble);

        // Update chunks - all chunks start as active
        const allChunks = parsedData.activeChunks.map((chunk) => ({
          id: chunk.id,
          type: chunk.type as "section" | "item",
          title: chunk.title,
          content: chunk.content,
          rawLatex: chunk.rawLatex,
          order: chunk.order,
          isActive: true,
          parentId: chunk.parentId,
        }));

        setChunks(allChunks);

        alert(
          `Successfully loaded ${allChunks.length} sections from ${file.name}!`
        );
      } else {
        alert("Unsupported file format. Please upload a .tex or .pdf file.");
      }
    } catch (error) {
      console.error("Error parsing file:", error);
      alert(
        `Error parsing file. Please make sure it's a valid ${
          file.name.endsWith(".pdf") ? "PDF" : "LaTeX"
        } file.`
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
            <div className="flex gap-2">
              <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Resume
                <input
                  type="file"
                  accept=".tex,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={downloadLatex}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Resume */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Active Resume ({activeChunks.length} sections)
                </h2>
                <SortableContext
                  items={activeChunks.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {activeChunks.map((chunk) => (
                    <SortableChunk
                      key={chunk.id}
                      chunk={chunk}
                      onDelete={() => deleteChunk(chunk.id)}
                      onToggle={() => toggleChunkActive(chunk.id)}
                    />
                  ))}
                </SortableContext>
                {activeChunks.length === 0 && (
                  <p className="text-gray-400 text-center py-8">
                    Drag chunks here to build your resume
                  </p>
                )}
              </div>
            </div>

            {/* Standby Chunks */}
            <div>
              <div className="bg-white rounded-lg border p-4">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Standby Library ({standbyChunks.length})
                </h2>
                <SortableContext
                  items={standbyChunks.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {standbyChunks.map((chunk) => (
                    <SortableChunk
                      key={chunk.id}
                      chunk={chunk}
                      onDelete={() => deleteChunk(chunk.id)}
                      onToggle={() => toggleChunkActive(chunk.id)}
                    />
                  ))}
                </SortableContext>
                {standbyChunks.length === 0 && (
                  <p className="text-gray-400 text-center py-8 text-sm">
                    No standby chunks
                  </p>
                )}
              </div>

              {/* LaTeX Preview */}
              <div className="bg-white rounded-lg border p-4 mt-4">
                <h2 className="text-lg font-semibold mb-4">LaTeX Output</h2>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                  {generateLatex()}
                </pre>
              </div>
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  );
}
