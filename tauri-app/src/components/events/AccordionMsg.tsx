import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

interface AccordionMsgProps {
  title: string;
  content: string;
}

export function AccordionMsg({ title, content }: AccordionMsgProps) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger className="p-0">
          <MarkdownRenderer content={title} />
        </AccordionTrigger>
        <AccordionContent>
          <MarkdownRenderer content={content} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
