import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { label: 'Redactar resumen ejecutivo', prompt: 'Redacta un resumen ejecutivo profesional para este informe basándote en la información disponible.' },
  { label: 'Generar conclusiones', prompt: 'Genera unas conclusiones técnicas profesionales basadas en los hallazgos del informe.' },
  { label: 'Revisar hallazgos', prompt: 'Analiza los hallazgos registrados y sugiere acciones correctivas apropiadas para cada uno.' },
  { label: 'Redactar objetivo', prompt: 'Redacta un objetivo claro y conciso para este informe técnico.' },
];

export default function TechnicalReportChat({ reportData, onClose, onUpdateReport }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: 'technical_report_expert',
      metadata: { name: reportData?.tituloInforme || 'Nuevo Informe' },
    });
    setConversation(conv);
    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
    });
    // Mensaje de contexto inicial
    if (reportData?.tituloInforme) {
      const ctx = buildContext(reportData);
      await base44.agents.addMessage(conv, {
        role: 'user',
        content: `Contexto del informe en el que estoy trabajando:\n${ctx}\n\nEstoy listo para recibir tu ayuda.`,
      });
    }
  };

  const buildContext = (data) => {
    if (!data) return 'Sin contexto disponible.';
    const parts = [];
    if (data.tituloInforme) parts.push(`Título: ${data.tituloInforme}`);
    if (data.tipoInforme) parts.push(`Tipo: ${data.tipoInforme}`);
    if (data.articulo) parts.push(`Artículo/Equipo: ${data.articulo}`);
    if (data.sala) parts.push(`Sala: ${data.sala}`);
    if (data.autor) parts.push(`Autor: ${data.autor}`);
    if (data.hallazgos?.length > 0) {
      parts.push(`Hallazgos (${data.hallazgos.length}):`);
      data.hallazgos.forEach((f, i) => {
        parts.push(`  ${i + 1}. [${f.severity}] ${f.title}: ${f.description || '—'}`);
      });
    }
    return parts.join('\n');
  };

  const send = async (text) => {
    if (!text.trim() || !conversation || loading) return;
    setLoading(true);
    setInput('');
    await base44.agents.addMessage(conversation, { role: 'user', content: text });
  };

  const handleQuickAction = (prompt) => send(prompt);

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <div className="flex flex-col h-full bg-white dark:bg-card border-l border-slate-200 dark:border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-border bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">Experto CQV</p>
            <p className="text-xs text-blue-200">Asistente de Ingeniería Industrial</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-white hover:bg-blue-500">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Quick actions */}
      {visibleMessages.length <= 1 && (
        <div className="p-3 border-b border-slate-100 dark:border-border">
          <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Acciones rápidas:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.label}
                onClick={() => handleQuickAction(a.prompt)}
                className="text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {visibleMessages.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-400">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Soy tu experto en ingeniería industrial</p>
            <p className="text-xs mt-1">Usa las acciones rápidas o escribe tu consulta</p>
          </div>
        )}
        {visibleMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-xs [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
            <span className="text-xs">Analizando...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="Pregunta al experto..."
            className="text-sm h-8"
            disabled={loading}
          />
          <Button size="icon" className="h-8 w-8 bg-blue-600 hover:bg-blue-700" onClick={() => send(input)} disabled={loading || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}