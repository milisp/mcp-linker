import { memo, useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface VirtualizedTextRendererProps {
  content: string;
  maxInitialLines?: number;
  className?: string;
}

const MAX_INITIAL_LINES = 50; // Show first 50 lines by default

export const VirtualizedTextRenderer = memo<VirtualizedTextRendererProps>(({ 
  content, 
  maxInitialLines = MAX_INITIAL_LINES,
  className = "" 
}) => {
  const [showAll, setShowAll] = useState(false);
  
  const { isLongContent, truncatedContent, remainingLinesCount } = useMemo(() => {
    const contentLines = content.split('\n');
    const isLong = contentLines.length > maxInitialLines;
    
    if (!isLong) {
      return {
        isLongContent: false,
        truncatedContent: content,
        remainingLinesCount: 0
      };
    }
    
    const truncated = contentLines.slice(0, maxInitialLines).join('\n');
    const remaining = contentLines.length - maxInitialLines;
    
    return {
      isLongContent: true,
      truncatedContent: truncated,
      remainingLinesCount: remaining
    };
  }, [content, maxInitialLines]);

  const handleToggleExpansion = useCallback(() => {
    setShowAll(prev => !prev);
  }, []);

  const displayContent = showAll ? content : truncatedContent;

  return (
    <div className={className}>
      <div className="relative">
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-tight select-text overflow-x-auto bg-muted/20 dark:bg-muted/10 rounded p-2 border">
          {displayContent}
        </pre>
        
        {isLongContent && (
          <div className="flex items-center justify-center mt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleExpansion}
              className="h-7 px-3 text-xs gap-1"
            >
              {showAll ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  Show All ({remainingLinesCount} more lines)
                </>
              )}
            </Button>
            
            {!showAll && (
              <span className="text-xs text-muted-foreground">
                Showing first {maxInitialLines} lines
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

VirtualizedTextRenderer.displayName = 'VirtualizedTextRenderer';