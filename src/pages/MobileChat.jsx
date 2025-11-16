import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, ArrowLeft, Users, Hash, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function MobileChatPage() {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

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
  });

  const sendMutation = useMutation({
    mutationFn: async (text) => {
      if (!employee?.id || !selectedChannel?.id) return;
      
      return base44.entities.ChatMessage.create({
        channel_id: selectedChannel.id,
        sender_id: employee.id,
        mensaje: text,
        tipo: "texto",
        fecha_envio: new Date().toISOString(),
        leido_por: [employee.id]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
      setMessage("");
      scrollToBottom();
    },
    onError: () => {
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
    if (!message.trim()) return;
    sendMutation.mutate(message);
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

  if (!selectedChannel) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 pb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Mensajería
          </h1>
          <p className="text-purple-100 text-sm mt-1">Chatea con tu equipo</p>
        </div>

        <div className="px-4 -mt-4 space-y-2">
          {channels.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No tienes canales disponibles</p>
              </CardContent>
            </Card>
          ) : (
            channels.map(channel => {
              const unreadCount = messages.filter(m => 
                m.channel_id === channel.id && 
                !m.leido_por?.includes(employee.id)
              ).length;

              return (
                <Card
                  key={channel.id}
                  className="shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedChannel(channel)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${getChannelColor(channel)} flex items-center justify-center`}>
                          {getChannelIcon(channel)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{channel.nombre}</p>
                          <p className="text-xs text-slate-500">{channel.tipo}</p>
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <Badge className="bg-red-600 text-white">{unreadCount}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedChannel(null)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold">{selectedChannel.nombre}</p>
            <p className="text-xs text-purple-100">{selectedChannel.tipo}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {messages.map(msg => {
          const isMe = msg.sender_id === employee.id;
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMe ? 'bg-purple-600 text-white' : 'bg-white'} rounded-2xl p-3 shadow-md`}>
                {!isMe && (
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    {msg.sender_nombre || 'Usuario'}
                  </p>
                )}
                <p className={`text-sm ${isMe ? 'text-white' : 'text-slate-900'}`}>
                  {msg.mensaje}
                </p>
                <p className={`text-xs mt-1 ${isMe ? 'text-purple-200' : 'text-slate-400'}`}>
                  {format(new Date(msg.fecha_envio), "HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMutation.isPending}
            className="bg-purple-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}