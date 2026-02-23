import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Bot, User, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function BreakAgentChat({ conversationId, onPlanExtracted, selectedDate, selectedShift, teamObj }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [conversationObj, setConversationObj] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    // Load existing conversation
    base44.agents.getConversation(conversationId).then(conv => {
      setConversationObj(conv);
      setMessages(conv.messages || []);
    });
    // Subscribe to updates
    const unsub = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages([...data.messages]);
      // Try extract plan from latest assistant message
      const lastAssistant = [...data.messages].reverse().find(m => m.role === 'assistant' && m.content);
      if (lastAssistant?.content) {
        onPlanExtracted?.(lastAssistant.content);
      }
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || isSending) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);

    // Optimistically add user message
    setMessages(prev => [...prev, { role: "user", content: text, id: `temp-${Date.now()}` }]);

    try {
      // Get fresh conversation object if needed
      let conv = conversationObj;
      if (!conv) {
        conv = await base44.agents.getConversation(conversationId);
        setConversationObj(conv);
      }

      await base44.agents.addMessage(conv, { role: "user", content: text });

      // Poll for response
      let attempts = 0;
      while (attempts < 45) {
        await new Promise(r => setTimeout(r, 2000));
        const updated = await base44.agents.getConversation(conversationId);
        setConversationObj(updated);
        if (!updated.is_processing) {
          setMessages(updated.messages || []);
          const lastAssistant = [...(updated.messages || [])].reverse().find(m => m.role === 'assistant' && m.content);
          if (lastAssistant?.content) onPlanExtracted?.(lastAssistant.content);
          break;
        }
        attempts++;
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Only show user and assistant messages (skip tool calls display)
  const visibleMessages = messages.filter(m => m.role === "user" || (m.role === "assistant" && m.content));

  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">Chat con el Agente</span>
          {!conversationId && (
            <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-300">
              Genera primero un plan
            </Badge>
          )}
          {conversationId && (
            <Badge className="text-[10px] bg-green-100 text-green-700">Activo</Badge>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-purple-500" />}
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {/* Hint */}
          {!conversationId && (
            <div className="px-4 py-3 text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
              💡 Genera primero un plan de descansos. Luego podrás dar instrucciones adicionales al agente aquí, por ejemplo: <em>"En la máquina X incluye solo una persona por turno para no pararla"</em>
            </div>
          )}

          {/* Messages */}
          {conversationId && (
            <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
              {visibleMessages.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  El agente ha generado el plan. Puedes darle instrucciones adicionales para ajustarlo.
                </p>
              )}
              {visibleMessages.map((msg, idx) => (
                <div key={msg.id || idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-tr-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                  }`}>
                    {msg.role === "assistant" ? (
                      <ReactMarkdown className="prose prose-xs max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl rounded-tl-sm px-3 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-slate-100 bg-white">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={conversationId
                ? "Ej: En la máquina XXX manda solo 1 persona por turno para no pararla..."
                : "Primero genera un plan para activar el chat..."}
              disabled={!conversationId || isSending}
              rows={2}
              className="resize-none text-xs flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!conversationId || isSending || !input.trim()}
              size="icon"
              className="h-9 w-9 bg-purple-600 hover:bg-purple-700 flex-shrink-0"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}