import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function EmployeeChatPage() {
  const { data: messages = [] } = useQuery({
    queryKey: ['employeeChat'],
    queryFn: () => base44.entities.ChatMessage.list('-fecha', 50),
    initialData: []
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-blue-600 p-4 text-white">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Chat de Equipo
        </h1>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className="bg-white p-3 rounded shadow-sm max-w-[80%]">
            <p className="text-sm font-semibold">{msg.sender}</p>
            <p className="text-sm">{msg.content}</p>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-2">
        <Input placeholder="Escribe un mensaje..." />
        <Button size="icon"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}