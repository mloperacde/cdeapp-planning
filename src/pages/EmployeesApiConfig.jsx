import EmployeesApiPanel from '@/components/config/EmployeesApiPanel';
import AdminOnly from '@/components/security/AdminOnly';

export default function EmployeesApiConfigPage() {
  return (
    <AdminOnly message="Solo administradores pueden acceder a la configuración de la API de empleados">
      <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <EmployeesApiPanel />
      </div>
    </AdminOnly>
  );
}