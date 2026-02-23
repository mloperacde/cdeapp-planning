import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, Send, Plus, Loader2, ChevronDown, ChevronUp,
  MessageSquare, Zap, CheckCircle2, AlertCircle, Clock, ChevronRight, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Tool call display ──────────────────────────────────────────────────────
function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Acción';
  const status = toolCall?.status || 'pending';
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try { return typeof results === 'string' ? JSON.parse(results) : results; }
    catch { return results; }
  })();

  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );

  const statusConfig = {
    pending:     { icon: Clock,         color: 'text-slate-400',  text: 'Pendiente' },
    running:     { icon: Loader2,       color: 'text-blue-500',   text: 'Ejecutando…', spin: true },
    in_progress: { icon: Loader2,       color: 'text-blue-500',   text: 'Ejecutando…', spin: true },
    completed:   isError
      ? { icon: AlertCircle,  color: 'text-red-500',   text: 'Error' }
      : { icon: CheckCircle2, color: 'text-green-600', text: 'Completado' },
    success:     { icon: CheckCircle2,  color: 'text-green-600',  text: 'Completado' },
    failed:      { icon: AlertCircle,   color: 'text-red-500',    text: 'Error' },
    error:       { icon: AlertCircle,   color: 'text-red-500',    text: 'Error' },
  }[status] || { icon: Zap, color: 'text-slate-500', text: '' };

  const Icon = statusConfig.icon;
  const label = name.split('.').reverse().join(' ').replace(/_/g, ' ').toLowerCase();

  return (
    <div className="mt-1.5 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all',
          'hover:bg-slate-50',
          expanded ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-200'
        )}
      >
        <Icon className={cn('h-3 w-3', statusConfig.color, statusConfig.spin && 'animate-spin')} />
        <span className="text-slate-700 capitalize">{label}</span>
        {statusConfig.text && (
          <span className={cn('text-slate-400', isError && 'text-red-500')}>· {statusConfig.text}</span>
        )}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={cn('h-3 w-3 text-slate-400 ml-auto transition-transform', expanded && 'rotate-90')} />
        )}
      </button>
      {expanded && !statusConfig.spin && (
        <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-200 space-y-1.5">
          {toolCall.arguments_string && (
            <div>
              <p className="text-slate-500 mb-0.5">Parámetros:</p>
              <pre className="bg-slate-50 rounded p-2 text-xs text-slate-600 whitespace-pre-wrap overflow-auto max-h-32">
                {(() => { try { return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2); } catch { return toolCall.arguments_string; } })()}
              </pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <p className="text-slate-500 mb-0.5">Resultado:</p>
              <pre className="bg-slate-50 rounded p-2 text-xs text-slate-600 whitespace-pre-wrap overflow-auto max-h-40">
                {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 flex-shrink-0">
          <Bot className="h-3.5 w-3.5 text-blue-600" />
        </div>
      )}
      <div className={cn('max-w-[85%]', isUser && 'flex flex-col items-end')}>
        {message.content && (
          <div className={cn(
            'rounded-2xl px-3 py-2 text-sm',
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-800'
          )}>
            {isUser ? (
              <p className="leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                  ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  code: ({ inline, children }) => inline
                    ? <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs">{children}</code>
                    : <pre className="bg-slate-900 text-slate-100 rounded p-2 text-xs overflow-x-auto my-1"><code>{children}</code></pre>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1 mt-1">
            {message.tool_calls.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function HRAssistantChat() {
  const [collapsed, setCollapsed] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startConversation = async () => {
    setLoading(true);
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'hr_assistant',
        metadata: { name: 'Consulta RRHH' }
      });
      setConversation(conv);
      setMessages(conv.messages || []);

      // Suscripción a actualizaciones en tiempo real
      const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages([...(data.messages || [])]);
      });
      return unsub;
    } catch (e) {
      toast.error('No se pudo iniciar el asistente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsub;
    startConversation().then(fn => { unsub = fn; });
    return () => { if (unsub) unsub(); };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || sending || !conversation) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: 'user', content: text });
    } catch {
      toast.error('Error al enviar el mensaje');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const newConversation = async () => {
    setMessages([]);
    setConversation(null);
    const unsub = await startConversation();
    return unsub;
  };

  const isTyping = sending || messages[messages.length - 1]?.role === 'user';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer select-none"
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Asistente RRHH</p>
            <p className="text-[10px] text-slate-400">IA · Consultas, análisis y gestión</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); newConversation(); }}
            title="Nueva conversación"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          {collapsed ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-400" />}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[420px]"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-6">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">¿En qué puedo ayudarte?</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                    Consultas de ausencias, fichajes, permisos, absentismo y más.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {[
                    'Empleados con más ausencias',
                    'Tasa de absentismo',
                    'Permisos pendientes',
                  ].map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-xs px-2.5 py-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role !== 'system').map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}
                {isTyping && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-2 items-center">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-3 py-2">
                      <div className="flex gap-1 items-center h-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2 items-center">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta…"
                className="text-sm h-9 rounded-xl"
                disabled={sending || loading || !conversation}
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || sending || !conversation}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}