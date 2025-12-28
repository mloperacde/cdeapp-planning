import React, { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

export default function SearchableSelect({ 
  options = [], 
  value, 
  onValueChange, 
  placeholder = "Seleccionar...",
  disabled = false,
  groupBy = null,
  className = "",
  searchPlaceholder = "Buscar..."
}) {
  const [open, setOpen] = useState(false);

  // Ordenar opciones alfabéticamente
  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => 
      (a.label || "").localeCompare(b.label || "", 'es')
    );
  }, [options]);

  // Agrupar si se especifica
  const groupedOptions = useMemo(() => {
    if (!groupBy) return { "": sortedOptions };
    
    const groups = {};
    sortedOptions.forEach(opt => {
      const groupValue = opt[groupBy] || "Otros";
      if (!groups[groupValue]) {
        groups[groupValue] = [];
      }
      groups[groupValue].push(opt);
    });
    
    // Ordenar grupos alfabéticamente
    return Object.keys(groups)
      .sort((a, b) => a.localeCompare(b, 'es'))
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  }, [sortedOptions, groupBy]);

  const selectedOption = options.find(o => o.value === value);

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
          {selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            <span className="text-slate-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados</CommandEmpty>
            {Object.entries(groupedOptions).map(([group, opts]) => (
              <CommandGroup key={group} heading={group !== "" ? group : undefined}>
                {opts.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === value ? "" : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
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