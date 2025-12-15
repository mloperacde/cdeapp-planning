import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import PushNotificationPanel from "../components/notifications/PushNotificationPanel";

export default function MobileNotificationsPage() {
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: employee } = useQuery({
    queryKey: ['myEmployee', user?.email],
    queryFn: async () => {
      const employees = await base44.entities.EmployeeMasterDatabase.list();
      return employees.find(e => e.email === user?.email);
    },
    enabled: !!user?.email
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <h1 className="text-xl font-bold">Notificaciones</h1>
        </div>
      </div>
      <div className="p-4">
        {employee ? <PushNotificationPanel employeeId={employee.id} mobile={true} /> : <div className="text-center py-12">Cargando...</div>}
      </div>
    </div>
  );
}