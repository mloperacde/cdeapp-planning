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

export default function EmployeeSearchSelect({ 
  value, 
  onValueChange, 
  employees = [], 
  placeholder = "Seleccionar empleado...",
  showDepartment = false 
}) {
  const [open, setOpen] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find(emp => emp.id === value),
    [employees, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedEmployee ? (
            <span className="truncate">
              {selectedEmployee.nombre}
              {showDepartment && selectedEmployee.departamento && (
                <span className="text-slate-500 ml-2">({selectedEmployee.departamento})</span>
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
            <CommandEmpty>No se encontraron empleados.</CommandEmpty>
            <CommandGroup>
              {employees.map((emp) => (
                <CommandItem
                  key={emp.id}
                  value={emp.nombre}
                  onSelect={() => {
                    onValueChange(emp.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === emp.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 truncate">
                    <div className="font-medium">{emp.nombre}</div>
                    {showDepartment && emp.departamento && (
                      <div className="text-xs text-slate-500">{emp.departamento} - {emp.puesto || 'Sin puesto'}</div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}