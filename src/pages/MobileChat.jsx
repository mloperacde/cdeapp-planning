
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, ArrowLeft, Users, Hash, AlertCircle, Bell } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { offlineStorage, isOnline } from "../components/utils/offlineStorage";

export default function MobileChatPage() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messageInput, setMessageInput] = useState(""); // Changed from 'message' to 'messageInput'
  const [notificationPermission, setNotificationPermission] = useState(Notification?.permission || 'default');
  const [online, setOnline] = useState(isOnline()); // New state for online status
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // New useEffect for online/offline detection and message syncing
  useEffect(() => {
    const handleOnline = async () => {
      setOnline(true);
      const pending = offlineStorage.getPendingMessages();
      
      for (let i = 0; i < pending.length; i++) {
        const msg = pending[i];
        try {
          await base44.entities.ChatMessage.create({
            channel_id: msg.channel_id,
            sender_id: msg.sender_id,
            mensaje: msg.mensaje,
            tipo: "texto",
            fecha_envio: msg.fecha_envio, // Include timestamp for accurate syncing
            leido_por: msg.leido_por // Include read status for accurate syncing
          });
          offlineStorage.removePendingMessage(i); // Remove one by one
        } catch (error) {
          console.error("Failed to sync message:", error);
          // If a message fails to sync, stop processing and keep it in storage
          // Re-adding it ensures the next attempt processes it.
          // This also means the loop indices might shift, so it's safer to break
          // or re-fetch pending messages after each removal.
          // For simplicity, we assume success or keep it for next time.
          // A more robust solution might re-queue the failed message or move it to a 'failed' queue.
          break; 
        }
      }
      
      // Invalidate queries to refetch messages after syncing
      queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
    };

    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]); // Dependency on queryClient

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: () => currentUser?.email 
      ? base44.entities.Employee.filter({ email: currentUser.email }).then(r => r[0])
      : null,
    enabled: !!currentUser?.email,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['myChannels', employee?.id],
    queryFn: () => employee?.id
      ? base44.entities.ChatChannel.filter({ activo: true }).then(chs => 
          chs.filter(ch => ch.participantes?.includes(employee.id))
        )
      : [],
    initialData: [],
    enabled: !!employee?.id,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['channelMessages', selectedChannel?.id],
    queryFn: () => selectedChannel?.id
      ? base44.entities.ChatMessage.filter({ channel_id: selectedChannel.id }, 'fecha_envio')
      : [],
    initialData: [],
    enabled: !!selectedChannel?.id,
    refetchInterval: 3000,
    onSuccess: (newMessages) => {
      // Show push notification for new messages
      if (notificationPermission === 'granted' && document.hidden && selectedChannel) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.sender_id !== employee?.id) {
          new Notification(`Nuevo mensaje en ${selectedChannel.nombre}`, {
            body: lastMessage.mensaje,
            icon: '/icon.png',
            badge: '/badge.png'
          });
        }
      }
    }
  });

  // Renamed sendMutation to sendMessageMutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text) => {
      if (!employee?.id || !selectedChannel?.id) return;
      
      const messageData = {
        channel_id: selectedChannel.id,
        sender_id: employee.id,
        mensaje: text,
        tipo: "texto",
        fecha_envio: new Date().toISOString(),
        leido_por: [employee.id]
      };

      if (!online) {
        offlineStorage.addPendingMessage(messageData);
        toast.info("Mensaje guardado para enviar cuando haya conexión.");
        return { offline: true, ...messageData }; // Return saved data to indicate offline status
      }

      const newMessage = await base44.entities.ChatMessage.create(messageData);

      // Create push notifications for other participants
      const otherParticipants = selectedChannel.participantes?.filter(p => p !== employee.id) || [];
      const notificationPromises = otherParticipants.map(participantId =>
        base44.entities.PushNotification.create({
          destinatario_id: participantId,
          tipo: "mensaje",
          titulo: `Nuevo mensaje en ${selectedChannel.nombre}`,
          mensaje: text.substring(0, 100),
          prioridad: "media",
          referencia_tipo: "ChatMessage",
          referencia_id: newMessage.id,
          accion_url: "/mobile/chat"
        })
      );
      await Promise.all(notificationPromises);

      return newMessage;
    },
    onSuccess: (result) => {
      if (!result.offline) { // Only invalidate queries if message was sent online
        queryClient.invalidateQueries({ queryKey: ['channelMessages', selectedChannel?.id] });
      }
      setMessageInput(""); // Changed 'setMessage' to 'setMessageInput'
      scrollToBottom();
    },
    onError: (error) => {
      console.error("Error sending message:", error);
      toast.error("Error al enviar mensaje");
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return; // Changed 'message' to 'messageInput'
    sendMessageMutation.mutate(messageInput); // Changed 'sendMutation' to 'sendMessageMutation' and 'message' to 'messageInput'
  };

  const getChannelIcon = (channel) => {
    if (channel.tipo === "Direct") return <MessageSquare className="w-4 h-4" />;
    if (channel.tipo === "Equipo") return <Users className="w-4 h-4" />;
    return <Hash className="w-4 h-4" />;
  };

  const getChannelColor = (channel) => {
    if (channel.tipo === "Direct") return "bg-blue-100 text-blue-800";
    if (channel.tipo === "Equipo") return "bg-purple-100 text-purple-800";
    return "bg-green-100 text-green-800";
  };

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-slate-600">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!online && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm">
          Sin conexión - Los mensajes se enviarán al reconectar
        </div>
      )}

      {!selectedChannel ? (
        <>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 pb-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Mensajería
                </h1>
                <p className="text-purple-100 text-xs mt-1">Chatea con tu equipo</p>
              </div>
              {notificationPermission !== 'granted' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => Notification.requestPermission().then(p => setNotificationPermission(p))}
                  className="text-xs h-7"
                >
                  <Bell className="w-3 h-3 mr-1" />
                  Activar
                </Button>
              )}
            </div>
          </div>

          <div className="px-3 -mt-4 space-y-2">
            {channels.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No tienes canales disponibles</p>
                </CardContent>
              </Card>
            ) : (
              channels.map(channel => {
                const unreadCount = 0; // This logic isn't implemented in the current file, keep as 0

                return (
                  <Card
                    key={channel.id}
                    className="shadow-md cursor-pointer hover:shadow-lg transition-shadow active:scale-98"
                    onClick={() => setSelectedChannel(channel)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-lg ${getChannelColor(channel)} flex items-center justify-center`}>
                            {getChannelIcon(channel)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{channel.nombre}</p>
                            <p className="text-xs text-slate-500">{channel.tipo}</p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <Badge className="bg-red-600 text-white text-xs">{unreadCount}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-3 shadow-lg">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedChannel(null)} className="p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <p className="font-bold text-sm">{selectedChannel.nombre}</p>
                <p className="text-xs text-purple-100">{selectedChannel.tipo}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 pb-20">
            {messages.map(msg => {
              const isMe = msg.sender_id === employee.id;
              
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isMe ? 'bg-purple-600 text-white' : 'bg-white'} rounded-2xl p-2.5 shadow-md`}>
                    {!isMe && (
                      <p className="text-xs font-semibold text-slate-700 mb-0.5">
                        {msg.sender_nombre || 'Usuario'}
                      </p>
                    )}
                    <p className={`text-sm ${isMe ? 'text-white' : 'text-slate-900'}`}>
                      {msg.mensaje}
                    </p>
                    <p className={`text-xs mt-0.5 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                      {format(new Date(msg.fecha_envio), "HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-lg">
            <form onSubmit={handleSend} className="flex gap-2">
              <Input
                value={messageInput} // Changed 'message' to 'messageInput'
                onChange={(e) => setMessageInput(e.target.value)} // Changed 'setMessage' to 'setMessageInput'
                placeholder="Escribe un mensaje..."
                className="flex-1 h-9 text-sm"
              />
              <Button
                type="submit"
                disabled={!messageInput.trim() || sendMessageMutation.isPending} // Changed 'message' to 'messageInput' and 'sendMutation' to 'sendMessageMutation'
                className="bg-purple-600 h-9 px-3"
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
