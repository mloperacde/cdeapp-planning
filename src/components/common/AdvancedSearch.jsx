import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

export default function AdvancedSearch({ 
  data = [], 
  onFilterChange,
  searchFields = ['nombre'],
  filterOptions = {},
  placeholder = "Buscar..."
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Autocompletado inteligente
  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    const matches = new Set();
    
    data.forEach(item => {
      searchFields.forEach(field => {
        const value = item[field];
        if (value && String(value).toLowerCase().includes(lowerSearch)) {
          matches.add(String(value));
        }
      });
    });
    
    return Array.from(matches).slice(0, 8);
  }, [searchTerm, data, searchFields]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
    applyFilters({ ...filters, search: value });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const applyFilters = (currentFilters) => {
    onFilterChange({
      searchTerm: currentFilters.search || "",
      ...currentFilters
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({});
    onFilterChange({ searchTerm: "" });
  };

  const activeFiltersCount = Object.keys(filters).filter(k => k !== 'search' && filters[k] && filters[k] !== 'all').length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
            className="pl-10 pr-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => handleSearchChange("")}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg">
              <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors dark:text-slate-200"
                    onClick={() => {
                      handleSearchChange(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-blue-600">{activeFiltersCount}</Badge>
              )}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 dark:bg-slate-800 dark:border-slate-700">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm dark:text-slate-100">Filtros Avanzados</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-3 h-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>

              {Object.entries(filterOptions).map(([key, config]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs dark:text-slate-300">{config.label}</Label>
                  <Select 
                    value={filters[key] || "all"} 
                    onValueChange={(value) => handleFilterChange(key, value)}
                  >
                    <SelectTrigger className="dark:bg-slate-900 dark:border-slate-600 dark:text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="all" className="dark:text-slate-200">Todos</SelectItem>
                      {config.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="dark:text-slate-200">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {(searchTerm || activeFiltersCount > 0) && (
          <Button variant="ghost" onClick={clearFilters} className="dark:text-slate-300">
            <X className="w-4 h-4 mr-2" />
            Limpiar todo
          </Button>
        )}
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (key === 'search' || !value || value === 'all') return null;
            const config = filterOptions[key];
            const option = config?.options.find(o => o.value === value);
            return (
              <Badge key={key} variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {config?.label}: {option?.label || value}
                <button
                  className="ml-2 hover:text-blue-900 dark:hover:text-blue-100"
                  onClick={() => handleFilterChange(key, 'all')}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}