import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Bot, User, ChevronDown, ChevronUp, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";

/**
 * Componente genérico de chat con agente base44.
 * Props:
 *   agentName: string – nombre del agente
 *   title: string – título del panel
 *   placeholder: string – placeholder del input
 *   initialMessage: string – mensaje inicial opcional que se envía al abrir
 *   className: string
 */
export default function AgentChat({ agentName, title, placeholder, initialMessage, className = "" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async () => {
    const conv = await base44.agents.createConversation({
      agent_name: agentName,
      metadata: { name: `Chat ${title} ${new Date().toLocaleTimeString('es-ES')}` }
    });
    setConversation(conv);

    base44.agents.subscribeToConversation(conv.id, (data) => {
      setMessages([...data.messages]);
    });

    // Send initial message if provided
    if (initialMessage) {
      setIsSending(true);
      await base44.agents.addMessage(conv, { role: "user", content: initialMessage });
      await pollUntilDone(conv.id);
      setIsSending(false);
    }

    return conv;
  };

  const pollUntilDone = async (convId) => {
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const updated = await base44.agents.getConversation(convId);
      setMessages(updated.messages || []);
      if (!updated.is_processing) break;
    }
  };

  const handleOpen = async () => {
    setIsOpen(true);
    if (!conversation) {
      setIsSending(true);
      await startConversation();
      setIsSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput("");
    setIsSending(true);

    // Optimistic
    setMessages(prev => [...prev, { role: "user", content: text, id: `temp-${Date.now()}` }]);

    let conv = conversation;
    if (!conv) conv = await startConversation();

    await base44.agents.addMessage(conv, { role: "user", content: text });
    await pollUntilDone(conv.id);
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const newConversation = async () => {
    setMessages([]);
    setConversation(null);
    setIsSending(true);
    await startConversation();
    setIsSending(false);
  };

  const visibleMessages = messages.filter(m => m.role === "user" || (m.role === "assistant" && m.content));

  return (
    <div className={`border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm ${className}`}>
      {/* Header */}
      <button
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-800">{title}</span>
          {conversation && <Badge className="text-[10px] bg-green-100 text-green-700">Activo</Badge>}
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-purple-500" /> : <ChevronDown className="w-4 h-4 text-purple-500" />}
      </button>

      {isOpen && (
        <div className="flex flex-col">
          {/* Messages */}
          <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
            {visibleMessages.length === 0 && !isSending && (
              <p className="text-xs text-slate-400 italic text-center py-4">
                Escribe tu pregunta para comenzar...
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

          {/* Input */}
          <div className="flex items-end gap-2 px-3 py-2 border-t border-slate-100 bg-white">
            <Button variant="ghost" size="icon" onClick={newConversation} className="h-8 w-8 flex-shrink-0" title="Nueva conversación">
              <Plus className="w-4 h-4 text-slate-400" />
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Escribe tu pregunta..."}
              disabled={isSending}
              rows={2}
              className="resize-none text-xs flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isSending || !input.trim()}
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