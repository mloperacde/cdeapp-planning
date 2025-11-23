import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
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
  className = ""
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

  // Agrupar por departamento
  const groupedEmployees = useMemo(() => {
    const groups = {};
    sortedEmployees.forEach(emp => {
      const dept = emp.departamento || "Sin departamento";
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(emp);
    });
    return groups;
  }, [sortedEmployees]);

  const selectedEmployee = employees.find(e => e.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between", className)}
        >
          {selectedEmployee ? (
            <span className="truncate">
              {selectedEmployee.nombre}
              {showDepartment && selectedEmployee.departamento && (
                <span className="text-slate-500 ml-2">• {selectedEmployee.departamento}</span>
              )}
            </span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar empleado..." />
          <CommandList>
            <CommandEmpty>No se encontraron empleados</CommandEmpty>
            {Object.entries(groupedEmployees).map(([department, emps]) => (
              <CommandGroup key={department} heading={department}>
                {emps.map((employee) => (
                  <CommandItem
                    key={employee.id}
                    value={`${employee.nombre} ${employee.departamento || ""} ${employee.puesto || ""}`}
                    onSelect={() => {
                      onValueChange(employee.id === value ? "" : employee.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === employee.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{employee.nombre}</div>
                      {employee.puesto && (
                        <div className="text-xs text-slate-500 truncate">{employee.puesto}</div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}