import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function EmployeeSelect({ 
  employees = [], 
  value, 
  onValueChange, 
  placeholder = "Seleccionar empleado...",
  disabled = false,
  showDepartment = true,
  filterFn = null,
  className = "",
  trigger
}) {
  const [open, setOpen] = useState(false);

  // Ordenar empleados: primero por departamento, luego alfabéticamente
  const sortedEmployees = useMemo(() => {
    let filtered = filterFn ? employees.filter(filterFn) : employees;
    
    return filtered.sort((a, b) => {
      const deptA = a.departamento || "Sin departamento";
      const deptB = b.departamento || "Sin departamento";
      
      // Primero por departamento
      if (deptA !== deptB) {
        return deptA.localeCompare(deptB, 'es');
      }
      
      // Luego alfabéticamente por nombre
      return (a.nombre || "").localeCompare(b.nombre || "", 'es');
    });
  }, [employees, filterFn]);

  // Agrupar por departamento o custom
  const groupedEmployees = useMemo(() => {
    // Si los empleados ya vienen con una propiedad '_group', usamos esa
    const hasCustomGroup = sortedEmployees.some(e => e._group);
    
    const groups = {};
    sortedEmployees.forEach(emp => {
      const groupName = hasCustomGroup ? (emp._group || "Otros") : (emp.departamento || "Sin departamento");
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(emp);
    });
    
    // Si es custom group, ordenamos
    if (hasCustomGroup) {
        const orderedGroups = {};
        const groupOrder = ["Sugeridos (Perfil Ideal)", "Con experiencia en máquina", "Con puesto correcto", "Otros en Equipo", "Otros"];
        
        // Add known groups first
        groupOrder.forEach(key => {
            if (groups[key]) {
                orderedGroups[key] = groups[key];
                delete groups[key];
            }
        });
        
        // Add remaining groups
        Object.keys(groups).forEach(key => {
            orderedGroups[key] = groups[key];
        });
        
        return orderedGroups;
    }
    
    return groups;
  }, [sortedEmployees]);

  const selectedEmployee = employees.find(e => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ? trigger : (
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
                "w-full justify-between", 
                className,
                selectedEmployee?.disponibilidad === "Ausente" ? "bg-red-50 text-red-900 border-red-200 hover:bg-red-100 hover:text-red-900" : ""
            )}
          >
            {selectedEmployee ? (
              <span className="truncate flex items-center gap-2">
                {selectedEmployee.nombre}
                {selectedEmployee.disponibilidad === "Ausente" && (
                     <AlertTriangle className="w-3 h-3 text-red-500" />
                )}
                {showDepartment && selectedEmployee.departamento && (
                  <span className={cn("ml-1", selectedEmployee.disponibilidad === "Ausente" ? "text-red-700/70" : "text-slate-500")}>
                      • {selectedEmployee.departamento}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empleado..." />
          <CommandList>
            <CommandEmpty>No se encontraron empleados</CommandEmpty>
            {Object.entries(groupedEmployees).map(([department, emps]) => (
              <CommandGroup key={department} heading={department}>
                {emps.map((employee) => {
                  const handleSelect = () => {
                    if (employee.disponibilidad === "Ausente") {
                        const returnDate = employee.ausencia_fin 
                            ? format(new Date(employee.ausencia_fin), "dd/MM/yyyy", { locale: es })
                            : "fecha desconocida";
                        toast.warning(`Este empleado está ausente hasta: ${returnDate}`);
                    }
                    onValueChange(employee.id);
                    setOpen(false);
                  };

                  return (
                    <CommandItem
                      key={employee.id}
                      value={`${employee.nombre} ${employee.departamento || ""} ${employee.puesto || ""} ${employee.id}`.toLowerCase()}
                      onSelect={handleSelect}
                      disabled={false}
                      className={cn(
                          "cursor-pointer",
                          employee.estado_empleado === "Baja" && "opacity-50"
                      )}
                      >
                      {/* Wrapper div to ensure click events are captured even if CommandItem fails */}
                      <div 
                        className="flex items-center w-full"
                        onClick={(e) => {
                          // Ensure click triggers selection even if command item event handling fails
                          e.stopPropagation();
                          handleSelect();
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === employee.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex-1 min-w-0 text-left">
                          <div className={cn("flex items-center gap-2 font-medium truncate", employee.estado_empleado === "Baja" && "line-through")}>
                            {employee.nombre}
                            {employee.disponibilidad === "Ausente" && (
                                <span className="flex items-center text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200 font-bold">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {employee.ausencia_fin 
                                        ? `Hasta ${format(new Date(employee.ausencia_fin), "dd/MM", { locale: es })}` 
                                        : "Ausente"}
                                </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                             {employee.puesto && <span className="truncate">{employee.puesto}</span>}
                             {employee.equipo && <span className="truncate border-l pl-2 border-slate-300">{employee.equipo}</span>}
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}