import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import HRChatbot from "./HRChatbot";

export default function ChatbotButton({ employeeId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full w-14 h-14 shadow-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        title="Asistente RRHH"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <HRChatbot 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        employeeId={employeeId}
      />
    </>
  );
}