import React, { useState } from "react";
import { Menu, Copy, ChevronDown, ChevronUp, Check } from "lucide-react";
import { DiffViewer } from "@/components/DiffViewer";

interface TurnDiffViewProps {
  content: string;
}

function getDiffName(diffHeader: string) {
  const regex = /diff --git a\/(.*?) b\/(.*?)\s/;
  const match = diffHeader.match(regex);
  let filename = null;
  if (match && match.length >= 2) {
    filename = match[1];
  }
  return filename;
}

function getPathName(diffHeader: string) {
  const regex = /^\*\*\* Update File: (.*)$/m;
  const match = diffHeader.match(regex);
  let filename = null;
  if (match && match.length >= 2) {
    filename = match[1];
  }
  return filename;
}

function parseDiffStats(diffContent: string) {
  let added = 0;
  let removed = 0;

  const lines = diffContent.split("\n");
  for (const line of lines) {
    if (line.startsWith("+") && !line.startsWith("+++")) {
      added++;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      removed++;
    }
  }
  return { added, removed };
}

function cleanDiffContent(diffContent: string) {
  return diffContent
    .split("\n")
    .filter((line) => !line.startsWith("new file mode"))
    .join("\n");
}

function extractChangedLines(diffContent: string) {
  return diffContent
    .split("\n")
    .filter(
      (line) =>
        (line.startsWith("+") && !line.startsWith("+++")) ||
        (line.startsWith("-") && !line.startsWith("---")),
    )
    .map((line) => line.substring(1))
    .join("\n")
    .trim();
}

export function TurnDiffView({ content }: TurnDiffViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const cleanedContent = cleanDiffContent(content);
  const filename = getDiffName(content)
    ? getDiffName(content)
    : getPathName(content);
  const { added, removed } = parseDiffStats(content);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const diffText = extractChangedLines(content);
    navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full border rounded-md overflow-hidden max-h-64">
      <div
        className="flex justify-between items-center bg-gray-200 dark:bg-gray-700 cursor-pointer"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="font-medium">{filename}</span>
          <span className="text-green-500 text-sm">+{added}</span>
          <span className="text-red-500 text-sm">-{removed}</span>
        </div>
        <div className="flex items-center gap-2">
          <Menu className="h-4 w-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200" />
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy
              className="h-4 w-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              onClick={handleCopy}
            />
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t dark:border-gray-600 overflow-scroll max-h-96">
          <DiffViewer unifiedDiff={cleanedContent} />
        </div>
      )}
    </div>
  );
}
