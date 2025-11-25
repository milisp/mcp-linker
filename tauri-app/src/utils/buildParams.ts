import { InputItem } from "@/bindings/InputItem";
import { SendUserMessageParams } from "@/bindings/SendUserMessageParams";
import { MediaAttachment } from "@/types/chat";

export function buildMessageParams(
    conversationId: string,
    text: string,
    attachments: MediaAttachment[] = [],
  ): SendUserMessageParams {
    const textItem: InputItem = { type: "text", data: { text } };
    const imageItems: InputItem[] = attachments
      .filter((attachment) => attachment.type === "image")
      .map((attachment) => ({ type: "localImage", data: { path: attachment.path } }));
  
    if (imageItems.length < attachments.length) {
      const unsupportedTypes = attachments
        .filter((attachment) => attachment.type !== "image")
        .map((attachment) => attachment.type);
      if (unsupportedTypes.length > 0) {
        console.warn(
          "[chat] Unsupported attachment types omitted: ",
          unsupportedTypes.join(", "),
        );
      }
    }
  
    return {
      conversationId,
      items: [textItem, ...imageItems],
    };
  }