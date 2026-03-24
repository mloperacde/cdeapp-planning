import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Send, Settings, Factory } from 'lucide-react';
import MessageBubble from '@/components/common/AgentMessageBubble';
import { Link } from 'react-router-dom';

const AGENT_NAME = 'production_planner';

const SUGGESTED_QUESTIONS = [
  '¿Cuál es la carga actual de cada máquina esta semana?',
  'Muéstrame los cambios de orden que necesitan intervención hoy',
  '¿Qué órdenes tienen riesgo de no cumplir su fecha de entrega?',
  'Identifica huecos disponibles en las máquinas para adelantar órdenes',
  'Dame un listado de intervenciones necesarias para mañana',
  '¿Qué máquinas están al 100% de capacidad esta semana?',
];

export default function ProductionPlannerChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadConversations = async () => {
    setLoadingConvs(true);
    const convs = await base44.agents.listConversations({ agent_name: AGENT_NAME });
    setConversations(convs || []);
    setLoadingConvs(false);
  };

  useEffect(() => { loadConversations(); }, []);

  const createNewConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: AGENT_NAME,
      metadata: { name: `Sesión ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` }
    });
    setActiveConv(conv);
    setMessages(conv.messages || []);
    await loadConversations();
  };

  const openConversation = async (convId) => {
    const conv = await base44.agents.getConversation(convId);
    setActiveConv(conv);
    setMessages(conv.messages || []);
  };

  useEffect(() => {
    if (!activeConv) return;
    const unsub = base44.agents.subscribeToConversation(activeConv.id, (data) => {
      setMessages(data.messages || []);
    });
    return unsub;
  }, [activeConv?.id]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    let conv = activeConv;
    if (!conv) { conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: `Sesión ${new Date().toLocaleDateString('es-ES')}` } }); setActiveConv(conv); setMessages(conv.messages || []); }
    await base44.agents.addMessage(conv, { role: 'user', content: msg });
    setSending(false);
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-background">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-border bg-white dark:bg-card flex flex-col hidden md:flex">
        <div className="p-4 border-b border-slate-200 dark:border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Planificador IA</h2>
              <p className="text-xs text-slate-500">Producción</p>
            </div>
          </div>
          <Button onClick={createNewConversation} size="sm" className="w-full gap-2">
            <Plus className="w-4 h-4" /> Nueva sesión
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <p className="text-xs text-slate-400 p-2">Cargando...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-slate-400 p-2">Sin sesiones previas</p>
          ) : conversations.map(c => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`w-full text-left p-2 rounded-lg text-xs transition-colors truncate ${
                activeConv?.id === c.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {c.metadata?.name || `Sesión ${c.id.slice(-6)}`}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-border">
          <Link to="/InterventionConfig" className="flex items-center gap-2 text-xs text-slate-500 hover:text-blue-600 transition-colors">
            <Settings className="w-3.5 h-3.5" /> Config. Intervenciones
          </Link>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!activeConv ? (
          /* Welcome screen */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Bot className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Agente de Planificación de Producción</h2>
            <p className="text-slate-500 text-sm max-w-md mb-6">
              Especializado en análisis de carga de máquinas, gestión de intervenciones entre órdenes y optimización tipo Asprova.
            </p>
            <div className="grid gap-2 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { createNewConversation().then(() => sendMessage(q)); }}
                  className="text-left text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-slate-700 dark:text-slate-300"
                >
                  {q}
                </button>
              ))}
            </div>
            <Button onClick={createNewConversation} className="mt-6 gap-2">
              <Plus className="w-4 h-4" /> Iniciar nueva sesión
            </Button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-sm text-slate-400 py-8">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Sesión iniciada. ¿En qué puedo ayudarte?</p>
                  <div className="grid gap-2 mt-4 max-w-md mx-auto">
                    {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)}
                        className="text-left text-xs p-2 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-slate-600">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {sending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl px-4 py-2.5">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 dark:border-border bg-white dark:bg-card p-4">
              <div className="flex gap-2 items-end">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Pregunta sobre carga de máquinas, intervenciones, optimización..."
                  className="flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] max-h-[120px]"
                  rows={1}
                />
                <Button onClick={() => sendMessage()} disabled={!input.trim() || sending} size="icon" className="rounded-xl h-[44px] w-[44px] flex-shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}