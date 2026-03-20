import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, Sparkles, Loader2, BookOpen, ClipboardList, Target, FileQuestion } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  { icon: Target, label: 'Generar Objetivos', prompt: (m) => `Genera los objetivos de aprendizaje para el módulo "${m.titulo || 'sin título'}" dirigido a ${m.departamentos?.join(', ') || 'todos los departamentos'}, nivel ${m.nivel || 'básico'}.` },
  { icon: BookOpen, label: 'Crear Material Completo', prompt: (m) => `Crea el material de estudio completo para el módulo "${m.titulo || 'sin título'}" (${m.categoria || 'formación industrial'}), nivel ${m.nivel || 'básico'}, para el departamento de ${m.departamentos?.join(', ') || 'producción'}. Incluye introducción, unidades temáticas detalladas, casos prácticos y conclusiones. Usa formato Markdown.` },
  { icon: ClipboardList, label: 'Generar Evaluación', prompt: (m) => `Crea 10 preguntas de evaluación para el módulo "${m.titulo || 'sin título'}" nivel ${m.nivel || 'básico'}. Incluye preguntas tipo test, verdadero/falso y alguna pregunta abierta. Al final, indica los criterios de superación.` },
  { icon: FileQuestion, label: 'Casos Prácticos', prompt: (m) => `Genera 3 casos prácticos y ejercicios aplicables en el entorno real de trabajo para el módulo "${m.titulo || 'sin título'}" de ${m.departamentos?.join(', ') || 'producción'}. Los casos deben estar basados en situaciones reales de una empresa de co-packing y envasado industrial.` },
];

export default function TrainingAIChat({ module, onUpdateContent }) {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const conv = await base44.agents.createConversation({
        agent_name: 'industrial_training_expert',
        metadata: { name: `Módulo: ${module?.titulo || 'Nuevo módulo'}` }
      });
      setConversationId(conv.id);
    };
    init();
  }, []);

  useEffect(() => {
    if (!conversationId) return;
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
      setLoading(false);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return unsub;
  }, [conversationId]);

  const sendMessage = async (text) => {
    if (!text.trim() || !conversationId || loading) return;
    setLoading(true);
    setInput('');
    await base44.agents.addMessage({ id: conversationId }, { role: 'user', content: text });
  };

  const handleQuickAction = (action) => {
    sendMessage(action.prompt(module));
  };

  const insertToModule = (content, field = 'contenido') => {
    onUpdateContent(field, content);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-white dark:bg-card">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Experto en Formación IA</p>
            <p className="text-xs text-slate-500">Co-packing & Envasado Industrial</p>
          </div>
          <Badge className="ml-auto bg-green-100 text-green-700 text-xs">Activo</Badge>
        </div>
      </div>

      {/* Acciones rápidas */}
      {messages.length === 0 && (
        <div className="p-3 border-b">
          <p className="text-xs text-slate-500 mb-2 font-medium">ACCIONES RÁPIDAS</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Button key={a.label} variant="outline" size="sm" className="h-auto py-2 px-2 flex flex-col gap-1 text-xs" onClick={() => handleQuickAction(a)}>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="leading-tight text-center">{a.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>
              {msg.content && (
                <div className={`rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-card border'}`}>
                  {msg.role === 'user' ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="prose prose-xs max-w-none dark:prose-invert">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
              {msg.role !== 'user' && msg.content && msg.content.length > 100 && (
                <div className="flex gap-1 mt-1">
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => insertToModule(msg.content, 'contenido')}>
                    → Material
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => insertToModule(msg.content, 'evaluacion')}>
                    → Evaluación
                  </Button>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => insertToModule(msg.content, 'objetivos')}>
                    → Objetivos
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <div className="bg-white dark:bg-card border rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white dark:bg-card">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Pide al experto que genere contenido..."
            rows={2}
            className="text-sm resize-none"
          />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !conversationId} size="icon" className="bg-blue-600 hover:bg-blue-700 self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}