import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/settings/ThemeStore';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const getLanguage = (className?: string) => {
  if (!className) return undefined;
  const match = /language-([\w-]+)/.exec(className);
  return match ? match[1] : undefined;
};

export const MarkdownRenderer = memo<MarkdownRendererProps>(({ 
  content, 
  className = "" 
}) => {
  const { theme } = useThemeStore();
  const syntaxTheme = useMemo(
    () => (theme === 'dark' ? oneDark : oneLight),
    [theme]
  );
  
  return (
    <div
      className={cn(
        'text-sm text-foreground leading-relaxed prose prose-sm max-w-full overflow-hidden',
        theme === 'dark' && 'prose-invert',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 select-text">{children}</p>,
          
          code: ({ inline, className, children, ...props }: any) => {
            const language = getLanguage(className);
            if (!inline && language) {
              const codeContent = String(children || '').replace(/\n$/, '');

              return (
                <SyntaxHighlighter
                  style={syntaxTheme}
                  language={language}
                  PreTag="div"
                  wrapLongLines
                  customStyle={{ margin: 0, borderRadius: 8, background: 'transparent' }}
                  codeTagProps={{ className: 'select-text' }}
                  {...props}
                >
                  {codeContent}
                </SyntaxHighlighter>
              );
            }

            return (
              <code
                className={cn(
                  'px-1 py-0.5 rounded text-[13px] font-mono select-text whitespace-nowrap',
                  theme === 'dark' ? 'bg-muted text-primary' : 'bg-gray-100 text-gray-800'
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          
          pre: ({ children }) => (
            <div
              className={cn(
                'border rounded-md overflow-x-auto my-2 select-text max-w-full',
                theme === 'dark' ? 'bg-muted/50 border-border' : 'bg-gray-50 border-gray-200'
              )}
            >
              {children}
            </div>
          ),
          
          blockquote: ({ children }) => (
            <blockquote className={cn(
              'border-l-4 pl-4 italic my-2 select-text',
              theme === 'dark' ? 'border-muted-foreground/30' : 'border-gray-300'
            )}>
              {children}
            </blockquote>
          ),
          
          ul: ({ children }) => <ul className="list-disc pl-6 my-2 select-text">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2 select-text">{children}</ol>,
          li: ({ children }) => <li className="mb-1 select-text">{children}</li>,
          
          h1: ({ children }) => <h1 className="text-lg font-bold mb-2 select-text">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold mb-2 select-text">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mb-2 select-text">{children}</h3>,
          
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 max-w-full">
              <table className={cn(
                'w-full border-collapse border select-text',
                theme === 'dark' ? 'border-border' : 'border-gray-300'
              )}>
                {children}
              </table>
            </div>
          ),
          
          th: ({ children }) => (
            <th className={cn(
              'border px-2 py-1 font-medium text-left select-text',
              theme === 'dark' ? 'border-border bg-muted/50' : 'border-gray-300 bg-gray-100'
            )}>
              {children}
            </th>
          ),
          
          td: ({ children }) => (
            <td className={cn(
              'border px-2 py-1 select-text',
              theme === 'dark' ? 'border-border' : 'border-gray-300'
            )}>
              {children}
            </td>
          ),
          
          a: ({ href, children, ...props }) => (
            <a 
              href={href} 
              className={cn(
                'underline select-text',
                theme === 'dark' ? 'text-primary hover:text-primary/80' : 'text-blue-600 hover:text-blue-800'
              )}
              target="_blank" 
              rel="noopener noreferrer" 
              {...props}
            >
              {children}
            </a>
          ),
          
          strong: ({ children }) => <strong className="select-text">{children}</strong>,
          em: ({ children }) => <em className="select-text">{children}</em>,
          span: ({ children }) => <span className="select-text">{children}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
