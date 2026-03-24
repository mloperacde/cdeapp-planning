import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { Bot, Copy, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Función';
  const status = toolCall?.status || 'pending';
  const results = toolCall?.results;
  const parsedResults = (() => {
    if (!results) return null;
    try { return typeof results === 'string' ? JSON.parse(results) : results; } catch { return results; }
  })();
  const isError = results && ((typeof results === 'string' && /error|failed/i.test(results)) || parsedResults?.success === false);
  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Pendiente' },
    running: { icon: Loader2, color: 'text-slate-500', text: 'Procesando...', spin: true },
    in_progress: { icon: Loader2, color: 'text-slate-500', text: 'Procesando...', spin: true },
    completed: isError ? { icon: AlertCircle, color: 'text-red-500', text: 'Error' } : { icon: CheckCircle2, color: 'text-green-600', text: 'Completado' },
    success: { icon: CheckCircle2, color: 'text-green-600', text: 'Completado' },
    failed: { icon: AlertCircle, color: 'text-red-500', text: 'Error' },
  }[status] || { icon: Clock, color: 'text-slate-400', text: '' };
  const Icon = statusConfig.icon;
  return (
    <div className="mt-2 text-xs">
      <button onClick={() => setExpanded(!expanded)}
        className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:bg-slate-50", expanded ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200")}>
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-slate-700">{name.split('.').reverse().join(' ')}</span>
        {statusConfig.text && <span className={cn("text-slate-500", isError && "text-red-600")}>• {statusConfig.text}</span>}
        {!statusConfig.spin && (toolCall.arguments_string || results) && <ChevronRight className={cn("h-3 w-3 text-slate-400 ml-auto transition-transform", expanded && "rotate-90")} />}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1.5 ml-3 pl-3 border-l-2 border-slate-200 space-y-2">
          {parsedResults && (
            <pre className="bg-slate-50 rounded-md p-2 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-auto">
              {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default function AgentMessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center mt-0.5 flex-shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn("rounded-2xl px-4 py-2.5", isUser ? "bg-slate-800 text-white" : "bg-white dark:bg-card border border-slate-200 dark:border-border")}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  code: ({ inline, className, children }) => inline
                    ? <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">{children}</code>
                    : <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-2 text-xs"><code>{children}</code></pre>,
                  a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{children}</a>,
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  h1: ({ children }) => <h1 className="text-base font-bold my-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-sm font-bold my-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  blockquote: ({ children }) => <blockquote className="border-l-2 border-blue-300 pl-3 my-2 text-slate-600 dark:text-slate-400">{children}</blockquote>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}