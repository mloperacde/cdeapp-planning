import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { User, Hash, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ChannelList({ channels, selectedChannel, onSelectChannel, currentEmployee, employees, unreadCount }) {
  const getChannelName = (channel) => {
    if (channel.tipo === "Direct") {
      const otherParticipant = channel.participantes?.find(p => p !== currentEmployee?.id);
      const employee = employees.find(e => e.id === otherParticipant);
      return employee?.nombre || "Usuario";
    }
    return channel.nombre;
  };

  const sortedChannels = [...channels].sort((a, b) => {
    const aDate = a.ultimo_mensaje_fecha ? new Date(a.ultimo_mensaje_fecha) : new Date(0);
    const bDate = b.ultimo_mensaje_fecha ? new Date(b.ultimo_mensaje_fecha) : new Date(0);
    return bDate - aDate;
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {sortedChannels.map(channel => {
          const isSelected = selectedChannel?.id === channel.id;
          const unread = unreadCount[channel.id] || 0;
          
          return (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                isSelected 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : 'hover:bg-slate-100 border-2 border-transparent'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {channel.tipo === "Direct" ? (
                    <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : channel.tipo === "Equipo" ? (
                    <Users className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <Hash className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  )}
                  <span className={`text-sm truncate ${unread > 0 ? 'font-bold' : 'font-medium'}`}>
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
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}