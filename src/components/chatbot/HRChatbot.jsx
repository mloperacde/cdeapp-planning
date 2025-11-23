import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, X, Bot, User as UserIcon, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ReactMarkdown from "react-markdown";

export default function HRChatbot({ isOpen, onClose, employeeId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Crear conversación al abrir
  useEffect(() => {
    if (isOpen && !conversationId) {
      createConversation();
    }
  }, [isOpen]);

  // Scroll automático
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Suscribirse a actualizaciones
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
      setMessages(data.messages || []);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  const createConversation = async () => {
    try {
      const conversation = await base44.agents.createConversation({
        agent_name: "hr_chatbot",
        metadata: {
          name: "Consulta RRHH",
          employee_id: employeeId,
          created_at: new Date().toISOString()
        }
      });
      setConversationId(conversation.id);
    } catch (error) {
      console.error("Error creando conversación:", error);
    }
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      const conversations = await base44.agents.listConversations({
        agent_name: "hr_chatbot"
      });
      const conv = conversations.find(c => c.id === conversationId);
      
      if (!conv) throw new Error("Conversación no encontrada");

      return base44.agents.addMessage(conv, {
        role: "user",
        content
      });
    },
    onError: (error) => {
      console.error("Error enviando mensaje:", error);
    }
  });

  const handleSend = () => {
    if (!input.trim() || !conversationId) return;
    
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] shadow-2xl rounded-2xl overflow-hidden bg-white border-2 border-blue-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">Asistente RRHH</h3>
            <p className="text-xs text-blue-100">Estoy aquí para ayudarte</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-blue-300 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-2">¡Hola! Soy tu asistente de RRHH</p>
            <p className="text-xs text-slate-500">Pregúntame sobre:</p>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <p>• Políticas de ausencias y vacaciones</p>
              <p>• Cómo solicitar una ausencia</p>
              <p>• Encontrar documentos y manuales</p>
              <p>• Procedimientos de la empresa</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white border border-slate-200'
            }`}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown 
                  className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  components={{
                    p: ({ children }) => <p className="my-1 leading-relaxed text-slate-700">{children}</p>,
                    ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5 text-slate-700">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}

              {msg.tool_calls && msg.tool_calls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.tool_calls.map((tool, tidx) => (
                    <div key={tidx} className="flex items-center gap-2 text-xs text-slate-500">
                      <FileText className="w-3 h-3" />
                      <span>{tool.name?.split('.').pop()}</span>
                      {tool.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-700 text-xs h-4">✓</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {sendMessageMutation.isPending && (
          <div className="flex gap-2 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe tu pregunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!conversationId || sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || !conversationId || sendMessageMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Presiona Enter para enviar, Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}