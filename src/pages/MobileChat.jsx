import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, Send, Users, ArrowLeft, Hash, User,
  WifiOff, CheckCircle 
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STORAGE_KEYS = {
  PENDING_MESSAGES: 'offline_pending_messages',
};

const offlineStorage = {
  addPendingMessage: (message) => {
    const pending = offlineStorage.getPendingMessages();
    pending.push({ ...message, timestamp: new Date().toISOString(), synced: false });
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },
  getPendingMessages: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PENDING_MESSAGES);
    return data ? JSON.parse(data) : [];
  },
  removePendingMessage: (index) => {
    const pending = offlineStorage.getPendingMessages();
    pending.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.PENDING_MESSAGES, JSON.stringify(pending));
  },
};

export default function MobileChatPage() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      const pending = offlineStorage.getPendingMessages();
      
      for (let i = pending.length - 1; i >= 0; i--) {
        const msg = pending[i];
        try {
          await base44.entities.ChatMessage.create({
            channel_id: msg.channel_id,
            sender_id: msg.sender_id,
            mensaje: msg.mensaje,
            tipo: "texto"
          });
          offlineStorage.removePendingMessage(i);
        } catch (error) {
          console.error("Failed to sync message:", error);
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['chatChannels'],
    queryFn: () => base44.entities.ChatChannel.list(),
    initialData: [],
    refetchInterval: 5000,
  });

  const currentEmployee = employees.find(e => e.email === user?.email);

  const myChannels = channels.filter(ch => 
    ch.participantes?.includes(currentEmployee?.id)
  );

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedChannel?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ channel_id: selectedChannel.id }),
    enabled: !!selectedChannel,
    initialData: [],
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      if (!online) {
        offlineStorage.addPendingMessage(data);
        return { offline: true };
      }
      
      const message = await base44.entities.ChatMessage.create(data);
      
      await base44.entities.ChatChannel.update(selectedChannel.id, {
        ultimo_mensaje_fecha: new Date().toISOString()
      });

      const otherParticipants = selectedChannel.participantes?.filter(
        p => p !== currentEmployee?.id
      ) || [];

      if (otherParticipants.length > 0) {
        const notificationPromises = otherParticipants.map(participantId =>
          base44.entities.PushNotification.create({
            destinatario_id: participantId,
            tipo: selectedChannel.tipo === "Direct" ? "mensaje" : "sistema",
            titulo: selectedChannel.tipo === "Direct" 
              ? `Nuevo mensaje de ${currentEmployee?.nombre}`
              : `Nuevo mensaje en ${selectedChannel.nombre}`,
            mensaje: data.mensaje.substring(0, 100),
            prioridad: "media",
            referencia_tipo: "ChatMessage",
            referencia_id: message.id,
            accion_url: "/mobile/chat"
          })
        );
        await Promise.all(notificationPromises);
      }

      return message;
    },
    onSuccess: (result) => {
      if (!result.offline) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
        queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
      }
      setMessageInput("");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      const updates = messageIds.map(msgId => {
        const msg = messages.find(m => m.id === msgId);
        if (msg && !msg.leido_por?.includes(currentEmployee?.id)) {
          const newLeidoPor = [...(msg.leido_por || []), currentEmployee.id];
          return base44.entities.ChatMessage.update(msgId, { leido_por: newLeidoPor });
        }
        return null;
      }).filter(Boolean);
      
      return Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });

  useEffect(() => {
    if (messages.length > 0 && currentEmployee) {
      const unreadMessages = messages
        .filter(m => m.sender_id !== currentEmployee.id && !m.leido_por?.includes(currentEmployee.id))
        .map(m => m.id);
      
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages);
      }
    }
  }, [messages, currentEmployee]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChannel || !currentEmployee) return;

    sendMessageMutation.mutate({
      channel_id: selectedChannel.id,
      sender_id: currentEmployee.id,
      mensaje: messageInput,
      tipo: "texto",
      leido_por: [currentEmployee.id],
      fecha_envio: new Date().toISOString()
    });
  };

  const getChannelIcon = (channel) => {
    if (channel.tipo === "Direct") return <User className="w-5 h-5" />;
    if (channel.tipo === "Equipo" || channel.tipo === "Departamento") return <Users className="w-5 h-5" />;
    return <Hash className="w-5 h-5" />;
  };

  const getChannelColor = (channel) => {
    if (channel.tipo === "Direct") return "bg-blue-100 text-blue-700";
    if (channel.tipo === "Equipo") return "bg-purple-100 text-purple-700";
    if (channel.tipo === "Departamento") return "bg-green-100 text-green-700";
    return "bg-slate-100 text-slate-700";
  };

  if (!currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Cargando datos del empleado...</p>
      </div>
    );
  }

  if (!selectedChannel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-20">
        {!online && (
          <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            Sin conexión - Los mensajes se enviarán al reconectar
          </div>
        )}
        
        <div className="p-4 space-y-4">
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-blue-600" />
                Mensajería
              </h2>
            </CardHeader>
            <CardContent className="space-y-2">
              {myChannels.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No tienes canales disponibles</p>
              ) : (
                myChannels.map(channel => (
                  <div
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className="p-4 bg-slate-50 hover:bg-blue-50 border rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${getChannelColor(channel)} flex items-center justify-center`}>
                        {getChannelIcon(channel)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{channel.nombre}</h3>
                        {channel.descripcion && (
                          <p className="text-xs text-slate-600">{channel.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 flex flex-col">
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Sin conexión - Los mensajes se enviarán al reconectar
        </div>
      )}
      
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setSelectedChannel(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className={`w-10 h-10 rounded-lg ${getChannelColor(selectedChannel)} flex items-center justify-center`}>
          {getChannelIcon(selectedChannel)}
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{selectedChannel.nombre}</h2>
          {selectedChannel.descripcion && (
            <p className="text-xs text-slate-600">{selectedChannel.descripcion}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentEmployee?.id;
          const sender = employees.find(e => e.id === msg.sender_id);
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'bg-blue-600 text-white' : 'bg-white border'} rounded-lg p-3 shadow-sm`}>
                {!isMe && (
                  <p className="text-xs font-semibold mb-1 text-slate-700">
                    {sender?.nombre || 'Usuario'}
                  </p>
                )}
                <p className="text-sm">{msg.mensaje}</p>
                <p className={`text-xs mt-1 ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                  {format(new Date(msg.fecha_envio || msg.created_date), "HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          );
        })}
        
        {offlineStorage.getPendingMessages().filter(m => m.channel_id === selectedChannel.id).map((msg, idx) => (
          <div key={`pending-${idx}`} className="flex justify-end">
            <div className="max-w-[75%] bg-blue-400 text-white rounded-lg p-3 shadow-sm opacity-70">
              <p className="text-sm">{msg.mensaje}</p>
              <p className="text-xs mt-1 text-blue-100 flex items-center gap-1">
                Enviando... <CheckCircle className="w-3 h-3" />
              </p>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
        <div className="flex gap-2">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button type="submit" disabled={!messageInput.trim()} className="bg-blue-600">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}