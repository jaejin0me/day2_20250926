/* eslint-disable @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
  className?: string;
}

export function MessageRenderer({ content, isUser = false, className }: MessageRendererProps) {
  if (isUser) {
    // 사용자 메시지는 일반 텍스트로 표시
    return (
      <p className={cn("whitespace-pre-wrap", className)}>
        {content}
      </p>
    );
  }

  // AI 메시지는 마크다운으로 렌더링
  return (
    <div className={cn("markdown-content", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 코드 블록 스타일링
          code: ({ inline, className, children, ...props }: any) => {
            return !inline ? (
              <code
                className={cn(
                  "block w-full p-3 bg-muted rounded-lg overflow-x-auto text-sm font-mono",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="px-1 py-0.5 bg-muted rounded text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // 링크 스타일링
          a: ({ children, href, ...props }: any) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              {...props}
            >
              {children}
            </a>
          ),
          // 인용문 스타일링
          blockquote: ({ children, ...props }: any) => (
            <blockquote
              className="border-l-4 border-primary pl-4 italic text-muted-foreground"
              {...props}
            >
              {children}
            </blockquote>
          ),
          // 목록 스타일링
          ul: ({ children, ...props }: any) => (
            <ul className="list-disc list-inside space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }: any) => (
            <ol className="list-decimal list-inside space-y-1" {...props}>
              {children}
            </ol>
          ),
          // 제목 스타일링
          h1: ({ children, ...props }: any) => (
            <h1 className="text-xl font-bold mt-4 mb-2" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }: any) => (
            <h2 className="text-lg font-semibold mt-3 mb-2" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }: any) => (
            <h3 className="text-base font-semibold mt-2 mb-1" {...props}>
              {children}
            </h3>
          ),
          // 테이블 스타일링
          table: ({ children, ...props }: any) => (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-border rounded-lg" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }: any) => (
            <th
              className="px-3 py-2 bg-muted border-b border-border text-left font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }: any) => (
            <td className="px-3 py-2 border-b border-border" {...props}>
              {children}
            </td>
          ),
          // 문단 스타일링
          p: ({ children, ...props }: any) => (
            <p className="mb-2 last:mb-0" {...props}>
              {children}
            </p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
