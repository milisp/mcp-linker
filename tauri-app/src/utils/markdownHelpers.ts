/**
 * Markdown helpers for streaming content
 * Based on patterns from codex CLI implementation
 */

/**
 * Check if we're inside an unclosed fenced code block
 */
export function isInsideUnclosedfence(source: string): boolean {
  const fenceMatches = source.match(/```/g);
  return (fenceMatches?.length || 0) % 2 === 1;
}

/**
 * Strip empty fenced code blocks
 */
export function stripEmptyFencedCodeBlocks(source: string): string {
  // Remove empty code blocks like ```\n``` or ```lang\n```
  return source.replace(/```[^\n]*\n\s*```/g, '');
}

/**
 * Unwrap outer markdown language fence if present
 */
export function unwrapMarkdownLanguageFence(source: string): string {
  const lines = source.split('\n');
  if (lines.length < 2) {
    return source;
  }

  // Check for opening fence
  const firstLine = lines[0].trim();
  if (!firstLine.startsWith('```')) {
    return source;
  }

  const lang = firstLine.substring(3).trim().toLowerCase();
  if (lang !== 'markdown' && lang !== 'md') {
    return source;
  }

  // Find closing fence
  let lastLineIndex = lines.length - 1;
  while (lastLineIndex > 0 && lines[lastLineIndex].trim() === '') {
    lastLineIndex--;
  }

  if (lines[lastLineIndex].trim() !== '```') {
    return source;
  }

  // Return content between fences
  return lines.slice(1, lastLineIndex).join('\n');
}

/**
 * Check if a line is blank (spaces or tabs only)
 */
export function isBlankLine(line: string): boolean {
  return line.trim() === '';
}

/**
 * Process markdown content for streaming
 * Applies preprocessing similar to codex CLI
 */
export function processMarkdownForStreaming(content: string): string {
  let processed = content;
  
  // Apply unwrapping and stripping
  processed = unwrapMarkdownLanguageFence(processed);
  processed = stripEmptyFencedCodeBlocks(processed);
  
  return processed;
}