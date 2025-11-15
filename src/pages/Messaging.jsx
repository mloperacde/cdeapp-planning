
import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Plus, Users, Hash, User, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import CreateChannelDialog from "../components/messaging/CreateChannelDialog";
import ChannelList from "../components/messaging/ChannelList";
import MessageList from "../components/messaging/MessageList";

export default function MessagingPage() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [message, setMessage] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
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
    queryFn: () => selectedChannel ? base44.entities.ChatMessage.filter({ channel_id: selectedChannel.id }, 'fecha_envio') : Promise.resolve([]),
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

      // Create push notifications for channel participants
      const participants = selectedChannel.participantes || [];
      const notificationPromises = participants
        .filter(pId => pId !== currentEmployee?.id)
        .map(pId => 
          base44.entities.PushNotification.create({
            destinatario_id: pId,
            tipo: "mensaje",
            titulo: selectedChannel.tipo === "Direct" 
              ? `Mensaje de ${currentEmployee?.nombre}`
              : `Nuevo mensaje en ${selectedChannel.nombre}`,
            mensaje: data.mensaje.substring(0, 100),
            prioridad: "media",
            referencia_tipo: "ChatMessage",
            referencia_id: msg.id,
            enviada_push: true,
            fecha_envio_push: new Date().toISOString(),
            accion_url: `/messaging?channel=${selectedChannel.id}`
          })
        );

      await Promise.all(notificationPromises);

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

    setUploadingFile(true);
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
    } finally {
      setUploadingFile(false);
    }
  };

  const unreadCount = useMemo(() => {
    const counts = {};
    channels.forEach(channel => {
      const channelMessages = messages.filter(m => m.channel_id === channel.id);
      const unread = channelMessages.filter(m => 
        !m.leido_por?.includes(currentEmployee?.id) && m.sender_id !== currentEmployee?.id
      ).length;
      counts[channel.id] = unread;
    });
    return counts;
  }, [channels, messages, currentEmployee]);

  return (
    <div className="h-[calc(100vh-4rem)] p-6">
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid grid-cols-12 gap-4 h-full">
          <div className="col-span-3">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Mensajes</CardTitle>
                  <Button size="sm" onClick={() => setShowCreateChannel(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-0 overflow-hidden">
                <ChannelList
                  channels={channels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={setSelectedChannel}
                  currentEmployee={currentEmployee}
                  employees={employees}
                  unreadCount={unreadCount}
                />
              </CardContent>
            </Card>
          </div>

          <div className="col-span-9">
            {selectedChannel ? (
              <Card className="h-full flex flex-col">
                <CardHeader className="border-b">
                  <div className="flex items-center gap-2">
                    {selectedChannel.tipo === "Direct" ? (
                      <User className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Hash className="w-5 h-5 text-blue-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{selectedChannel.nombre}</CardTitle>
                      {selectedChannel.descripcion && (
                        <p className="text-xs text-slate-500">{selectedChannel.descripcion}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                  <MessageList
                    messages={messages}
                    currentEmployee={currentEmployee}
                    employees={employees}
                  />
                  <div ref={messagesEndRef} />

                  <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        id="file-upload"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => document.getElementById('file-upload').click()}
                        disabled={uploadingFile}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe un mensaje..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!message.trim() || sendMessageMutation.isPending}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Selecciona un canal para comenzar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
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
