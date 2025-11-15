import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function MessageList({ messages, currentEmployee, employees }) {
  const getSenderName = (senderId) => {
    const employee = employees.find(e => e.id === senderId);
    return employee?.nombre || "Usuario";
  };

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-3">
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentEmployee?.id;
          const senderName = getSenderName(msg.sender_id);

          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isOwn && (
                  <span className="text-xs text-slate-500 mb-1">{senderName}</span>
                )}
                <div className={`rounded-lg p-3 ${
                  isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
                }`}>
                  {msg.tipo === "imagen" && msg.archivo_url && (
                    <img 
                      src={msg.archivo_url} 
                      alt="Imagen" 
                      className="max-w-full rounded mb-2"
                    />
                  )}
                  {msg.tipo === "archivo" && msg.archivo_url && (
                    <a 
                      href={msg.archivo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 mb-2 hover:underline"
                    >
                      <Download className="w-4 h-4" />
                      Descargar archivo
                    </a>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                  <div className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-500'}`}>
                    {format(new Date(msg.fecha_envio || msg.created_date), "HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}