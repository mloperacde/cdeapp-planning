import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send } from "lucide-react";

export default function MobileChatPage() {
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  
  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 50),
    refetchInterval: 5000
  });

  const sendMutation = useMutation({
    mutationFn: (msg) => base44.entities.ChatMessage.create(msg),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;
    sendMutation.mutate({
      content: newMessage,
      sender_id: currentUser.id,
      sender_name: currentUser.full_name || currentUser.email,
      channel_id: "general" // Default channel
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b p-4 sticky top-0 z-10 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h1 className="font-bold text-lg">Chat de Equipo</h1>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {[...messages].reverse().map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${msg.sender_id === currentUser?.id ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                <p className="text-xs opacity-70 mb-1">{msg.sender_name}</p>
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 bg-white border-t sticky bottom-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            placeholder="Escribe un mensaje..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}