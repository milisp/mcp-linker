import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Undo2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PromptOptimizerControlProps {
  isOptimizing: boolean;
  canUndo: boolean;
  canOptimize: boolean;
  onOptimize: () => void;
  onUndo: () => void;
  disabledMessage?: string;
}

export const PromptOptimizerControl: React.FC<PromptOptimizerControlProps> = ({
  isOptimizing,
  canUndo,
  canOptimize,
  onOptimize,
  onUndo,
  disabledMessage,
}) => {
  if (isOptimizing) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-8 px-2"
        disabled
        title="Improving the prompt"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (canUndo) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 px-2"
        onClick={onUndo}
        title="Restore the previous prompt version"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
    );
  }

  if (disabledMessage && !canOptimize) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 px-2 pointer-events-none"
                disabled
                title={disabledMessage}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">
            {disabledMessage}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="h-8 px-2"
      onClick={onOptimize}
      disabled={!canOptimize}
      title="Improve the prompt"
    >
      <Sparkles className="h-4 w-4" />
    </Button>
  );
};
