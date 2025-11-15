import React from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hash, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ChannelList({ channels, selectedChannel, onSelectChannel, currentEmployee, employees, unreadCount }) {
  const getChannelDisplayName = (channel) => {
    if (channel.tipo === "Direct") {
      const otherParticipantId = channel.participantes?.find(p => p !== currentEmployee?.id);
      const otherEmployee = employees.find(e => e.id === otherParticipantId);
      return otherEmployee?.nombre || "Usuario";
    }
    return channel.nombre;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {channels.map(channel => {
          const isSelected = selectedChannel?.id === channel.id;
          const unread = unreadCount[channel.id] || 0;
          
          return (
            <div
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                isSelected ? 'bg-blue-100 border-2 border-blue-300' : 'hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {channel.tipo === "Direct" ? (
                    <User className="w-4 h-4 text-slate-600" />
                  ) : (
                    <Hash className="w-4 h-4 text-slate-600" />
                  )}
                  <span className="font-semibold text-sm text-slate-900">
                    {getChannelDisplayName(channel)}
                  </span>
                </div>
                {unread > 0 && (
                  <Badge className="bg-red-600 text-white">{unread}</Badge>
                )}
              </div>
              {channel.ultimo_mensaje_fecha && (
                <div className="text-xs text-slate-500">
                  {format(new Date(channel.ultimo_mensaje_fecha), "dd/MM HH:mm", { locale: es })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}