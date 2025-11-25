import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScrollButtonsProps {
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

export function ScrollButtons({ scrollToTop, scrollToBottom }: ScrollButtonsProps) {
  return (
    <div className="pointer-events-none absolute right-2 bottom-2 flex flex-col gap-2">
      <Button
        size="icon"
        variant="secondary"
        onClick={scrollToTop}
        className="pointer-events-auto shadow-md"
      >
        <ArrowUp />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={scrollToBottom}
        className="pointer-events-auto shadow-md"
      >
        <ArrowDown />
      </Button>
    </div>
  );
}
