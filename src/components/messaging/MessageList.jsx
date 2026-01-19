import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText } from "lucide-react";

export default function MessageList({ messages, currentEmployee, employees }) {
  const getSenderName = (senderId) => {
    if (senderId === currentEmployee?.id) return "Tú";
    const employee = employees.find(e => e.id === senderId);
    return employee?.nombre || "Usuario";
  };

  return (
    <ScrollArea className="flex-1 pr-4">
      <div className="space-y-4">
        {messages.map(msg => {
          const isOwn = msg.sender_id === currentEmployee?.id;
          const senderName = getSenderName(msg.sender_id);
          
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isOwn ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'} rounded-lg p-3`}>
                {!isOwn && (
                  <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
                )}
                
                {msg.tipo === "imagen" && msg.archivo_url && (
                  <img src={msg.archivo_url} alt="Imagen" className="rounded mb-2 max-w-full" />
                )}
                
                {msg.tipo === "archivo" && msg.archivo_url && (
                  <a 
                    href={msg.archivo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-2 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    <span className="text-sm">Ver archivo</span>
                  </a>
                )}
                
                <p className="text-sm whitespace-pre-wrap break-words">{msg.mensaje}</p>
                
                <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                  {format(new Date(msg.fecha_envio), "HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}