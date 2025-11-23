import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, ArrowLeft, Plus, Upload, User, Hash, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { notifyDirectMessage, sendPushNotification } from "../components/notifications/NotificationService";
import CreateChannelDialog from "../components/messaging/CreateChannelDialog";

export default function MobileChatPage() {
  const [view, setView] = useState("channels"); // channels | chat
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: channels } = useQuery({
    queryKey: ['chatChannels'],
    queryFn: () => base44.entities.ChatChannel.list('-ultimo_mensaje_fecha'),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages', selectedChannel?.id],
    queryFn: () => selectedChannel 
      ? base44.entities.ChatMessage.filter({ channel_id: selectedChannel.id }, 'fecha_envio') 
      : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedChannel,
    refetchInterval: 2000,
  });

  const currentEmployee = useMemo(() => {
    return employees.find(e => e.email === user?.email);
  }, [employees, user]);

  const sendMessageMutation = useMutation({
    mutationFn: async (data) => {
      const msg = await base44.entities.ChatMessage.create({
        ...data,
        fecha_envio: new Date().toISOString(),
        leido_por: [currentEmployee?.id]
      });

      await base44.entities.ChatChannel.update(selectedChannel.id, {
        ultimo_mensaje_fecha: new Date().toISOString()
      });

      const participants = selectedChannel.participantes || [];
      for (const pId of participants) {
        if (pId !== currentEmployee?.id) {
          await sendPushNotification({
            destinatarioId: pId,
            tipo: "mensaje",
            titulo: `Nuevo mensaje en ${getChannelName(selectedChannel)}`,
            mensaje: data.mensaje.substring(0, 100),
            prioridad: "media",
            referenciaTipo: "ChatMessage",
            referenciaId: msg.id,
            accionUrl: `/mobile-chat?channel=${selectedChannel.id}`
          });
        }
      }

      return msg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatChannels'] });
      setMessage("");
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId) => {
      const msg = messages.find(m => m.id === messageId);
      if (!msg || msg.leido_por?.includes(currentEmployee?.id)) return;

      return base44.entities.ChatMessage.update(messageId, {
        leido_por: [...(msg.leido_por || []), currentEmployee?.id]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    }
  });

  useEffect(() => {
    if (messages.length > 0 && currentEmployee) {
      messages.forEach(msg => {
        if (!msg.leido_por?.includes(currentEmployee.id) && msg.sender_id !== currentEmployee.id) {
          markAsReadMutation.mutate(msg.id);
        }
      });
    }
  }, [messages, currentEmployee]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedChannel || !currentEmployee) return;

    sendMessageMutation.mutate({
      channel_id: selectedChannel.id,
      sender_id: currentEmployee.id,
      mensaje: message,
      tipo: "texto"
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedChannel || !currentEmployee) return;

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      sendMessageMutation.mutate({
        channel_id: selectedChannel.id,
        sender_id: currentEmployee.id,
        mensaje: `Archivo: ${file.name}`,
        tipo: file.type.startsWith('image/') ? "imagen" : "archivo",
        archivo_url: file_url
      });

      toast.success("Archivo enviado");
    } catch (error) {
      toast.error("Error al subir archivo");
    }
  };

  const getChannelName = (channel) => {
    if (channel.tipo === "Direct") {
      const otherParticipant = channel.participantes?.find(p => p !== currentEmployee?.id);
      const employee = employees.find(e => e.id === otherParticipant);
      return employee?.nombre || "Usuario";
    }
    return channel.nombre;
  };

  const getSenderName = (senderId) => {
    if (senderId === currentEmployee?.id) return "Tú";
    const employee = employees.find(e => e.id === senderId);
    return employee?.nombre || "Usuario";
  };

  const unreadCount = useMemo(() => {
    const counts = {};
    channels.forEach(channel => {
      const unread = messages.filter(m => 
        m.channel_id === channel.id &&
        !m.leido_por?.includes(currentEmployee?.id) && 
        m.sender_id !== currentEmployee?.id
      ).length;
      counts[channel.id] = unread;
    });
    return counts;
  }, [channels, messages, currentEmployee]);

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setView("chat");
  };

  const handleBack = () => {
    setView("channels");
    setSelectedChannel(null);
  };

  if (view === "channels") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6" />
              <h1 className="text-xl font-bold">Mensajes</h1>
            </div>
            <Button size="sm" onClick={() => setShowCreateChannel(true)} className="bg-white/20">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-2">
          {channels.map(channel => {
            const unread = unreadCount[channel.id] || 0;
            
            return (
              <Card 
                key={channel.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleSelectChannel(channel)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {channel.tipo === "Direct" ? (
                        <User className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : channel.tipo === "Equipo" ? (
                        <Users className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Hash className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      )}
                      <span className={`font-medium truncate ${unread > 0 ? 'font-bold' : ''}`}>
                        {getChannelName(channel)}
                      </span>
                    </div>
                    {unread > 0 && (
                      <Badge className="bg-red-600 ml-2 flex-shrink-0">{unread}</Badge>
                    )}
                  </div>
                  {channel.ultimo_mensaje_fecha && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(channel.ultimo_mensaje_fecha), "dd/MM HH:mm", { locale: es })}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {showCreateChannel && (
          <CreateChannelDialog
            onClose={() => setShowCreateChannel(false)}
            employees={employees}
            currentEmployee={currentEmployee}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={handleBack} className="text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {selectedChannel.tipo === "Direct" ? (
              <User className="w-5 h-5" />
            ) : (
              <Hash className="w-5 h-5" />
            )}
            <div>
              <h1 className="font-bold">{getChannelName(selectedChannel)}</h1>
              {selectedChannel.descripcion && (
                <p className="text-xs opacity-80">{selectedChannel.descripcion}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentEmployee?.id;
          const senderName = getSenderName(msg.sender_id);
          
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'} rounded-2xl p-3`}>
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
                )}
                
                {msg.tipo === "imagen" && msg.archivo_url && (
                  <img src={msg.archivo_url} alt="Imagen" className="rounded mb-2 max-w-full" />
                )}
                
                <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                
                <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                  {format(new Date(msg.fecha_envio), "HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="file"
            id="mobile-file-upload"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => document.getElementById('mobile-file-upload').click()}
          >
            <Upload className="w-4 h-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button type="submit" disabled={!message.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}