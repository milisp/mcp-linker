interface BouncingDotsLoaderProps {
  elapsedLabel: string;
  conversationId?: string;
}

const BouncingDotsLoader = ({
  elapsedLabel,
  conversationId,
}: BouncingDotsLoaderProps) => {
  return (
    <div data-conversation-id={conversationId}>
      <div className="w-full min-w-0">
        <div className="rounded-lg border px-3 py-2 bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500" />
              <div
                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <span
              className="text-xs font-mono text-muted-foreground"
              aria-live="polite"
            >
              {elapsedLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BouncingDotsLoader;
