// src/components/notifications/NotificationBell.jsx
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Nuevo mensaje en el chat', time: 'Hace 5 min' },
    { id: 2, text: 'Tienes una reunión a las 15:00', time: 'Hace 1 hora' },
  ]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 font-semibold">Notificaciones</div>
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <DropdownMenuItem key={notif.id} className="flex flex-col items-start p-3">
              <span>{notif.text}</span>
              <span className="text-xs text-gray-500">{notif.time}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem className="p-4 text-center text-gray-500">
            No hay notificaciones
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
