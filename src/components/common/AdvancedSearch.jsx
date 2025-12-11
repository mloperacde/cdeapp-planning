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
import { Search, X, Filter, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Save, Loader2 } from "lucide-react";
import { useDebounce } from "@/components/utils/useDebounce";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function AdvancedSearch({ 
  data = [], 
  onFilterChange,
  searchFields = ['nombre'],
  filterOptions = {},
  sortOptions = [],
  placeholder = "Buscar...",
  pageId = null // Identificador para guardar filtros
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400); // 400ms delay
  const [filters, setFilters] = useState({});
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const queryClient = useQueryClient();

  // Load user info for saving prefs
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me().catch(() => null),
    enabled: !!pageId
  });

  // Load saved preference
  const { data: savedPref, isLoading: loadingPref } = useQuery({
    queryKey: ['userFilterPreference', pageId, user?.email],
    queryFn: async () => {
      if (!user?.email || !pageId) return null;
      const prefs = await base44.entities.UserFilterPreference.filter({
        user_email: user.email,
        page_id: pageId,
        is_default: true
      });
      return prefs[0] || null;
    },
    enabled: !!user?.email && !!pageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle preference loading with useEffect
  React.useEffect(() => {
    if (savedPref && savedPref.filters) {
      const loadedFilters = savedPref.filters;
      
      // Check if current state is different to avoid unnecessary updates/loops
      const currentState = {
        search: searchTerm,
        sortField,
        sortDirection,
        ...filters
      };
      
      // Normalize comparison (handle undefined/null vs empty string)
      // JSON stringify isn't perfect for unordered keys but works for simple cases
      // We also check specifically if key values are different
      
      let needsUpdate = false;
      if ((loadedFilters.search || "") !== (currentState.search || "")) needsUpdate = true;
      if ((loadedFilters.sortField || "") !== (currentState.sortField || "")) needsUpdate = true;
      if ((loadedFilters.sortDirection || "asc") !== (currentState.sortDirection || "asc")) needsUpdate = true;
      
      // Check rest filters
      if (!needsUpdate) {
         const { search, sortField, sortDirection, ...restLoaded } = loadedFilters;
         const { search: s, sortField: sf, sortDirection: sd, ...restCurrent } = currentState;
         if (JSON.stringify(restLoaded) !== JSON.stringify(restCurrent)) needsUpdate = true;
      }
      
      if (needsUpdate) {
        // Update local state
        if (loadedFilters.search !== undefined) setSearchTerm(loadedFilters.search);
        if (loadedFilters.sortField !== undefined) setSortField(loadedFilters.sortField);
        if (loadedFilters.sortDirection !== undefined) setSortDirection(loadedFilters.sortDirection);
        
        const { search, sortField, sortDirection, ...restFilters } = loadedFilters;
        setFilters(restFilters);
        
        // Propagate changes
        onFilterChange({
          searchTerm: loadedFilters.search || "",
          sortField: loadedFilters.sortField || "",
          sortDirection: loadedFilters.sortDirection || "asc",
          ...restFilters
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedPref]);

  // Save preference mutation
  const savePrefMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email || !pageId) return;
      
      const currentState = {
        search: searchTerm,
        sortField,
        sortDirection,
        ...filters
      };

      if (savedPref) {
        await base44.entities.UserFilterPreference.update(savedPref.id, {
          filters: currentState
        });
      } else {
        await base44.entities.UserFilterPreference.create({
          user_email: user.email,
          page_id: pageId,
          filters: currentState,
          is_default: true,
          name: "Vista Predeterminada"
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userFilterPreference', pageId] });
      toast.success("Filtros guardados como predeterminados");
    },
    onError: () => toast.error("Error al guardar filtros")
  });

  // Effect to trigger search update when debounce changes
  React.useEffect(() => {
    applyFilters({ ...filters, search: debouncedSearchTerm });
  }, [debouncedSearchTerm]);

  // Autocompletado inteligente usando el término NO debounced para feedback rápido, 
  // o debounced si se prefiere no saturar. Usaremos debounced para consistencia.
  const suggestions = useMemo(() => {
    if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) return [];
    
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
  }, [debouncedSearchTerm, data, searchFields]);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
    // Removemos la llamada directa a applyFilters para usar el debounce effect
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    applyFilters({ ...newFilters, search: debouncedSearchTerm }); // Mantener search actual
  };

  const applyFilters = (currentFilters, currentSort = sortField, currentDirection = sortDirection) => {
    onFilterChange({
      searchTerm: currentFilters.search || "",
      sortField: currentSort,
      sortDirection: currentDirection,
      ...currentFilters
    });
  };

  const handleSortChange = (field) => {
    let newDirection = "asc";
    if (sortField === field) {
      newDirection = sortDirection === "asc" ? "desc" : "";
      if (newDirection === "") {
        setSortField("");
        setSortDirection("asc");
        applyFilters(filters, "", "asc");
        return;
      }
    }
    setSortField(field);
    setSortDirection(newDirection);
    applyFilters(filters, field, newDirection);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilters({});
    setSortField("");
    setSortDirection("asc");
    onFilterChange({ searchTerm: "" });
  };

  const activeFiltersCount = Object.keys(filters).filter(k => k !== 'search' && filters[k] && filters[k] !== 'all').length;
  const activeSortCount = sortField ? 1 : 0;

  return (
    <div className="space-y-3">
      {/* Header con botón de guardar si hay pageId */}
      {pageId && (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => savePrefMutation.mutate()}
            disabled={savePrefMutation.isPending || loadingPref}
            className="text-xs text-slate-500 hover:text-blue-600"
          >
            {savePrefMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            {savedPref ? "Actualizar vista predeterminada" : "Guardar como vista predeterminada"}
          </Button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
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

      {/* Filtros visibles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Object.entries(filterOptions).map(([key, config]) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs font-medium dark:text-slate-300">{config.label}</Label>
            <Select 
              value={filters[key] || "all"} 
              onValueChange={(value) => handleFilterChange(key, value)}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
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

      {/* Sort options visible */}
      {sortOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Label className="text-xs font-medium dark:text-slate-300">Ordenar por:</Label>
          {sortOptions.map((opt) => (
            <Button
              key={opt.field}
              variant={sortField === opt.field ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortChange(opt.field)}
              className={sortField === opt.field ? "bg-blue-600 hover:bg-blue-700" : "dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"}
            >
              {opt.label}
              {sortField === opt.field && (
                sortDirection === "asc" ? (
                  <ArrowUp className="w-3 h-3 ml-1" />
                ) : (
                  <ArrowDown className="w-3 h-3 ml-1" />
                )
              )}
            </Button>
          ))}
        </div>
      )}

      {/* Clear all filters button */}
      {(searchTerm || activeFiltersCount > 0 || activeSortCount > 0) && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clearFilters} className="dark:text-slate-300">
            <X className="w-4 h-4 mr-2" />
            Limpiar todos los filtros
          </Button>
        </div>
      )}

      {(activeFiltersCount > 0 || activeSortCount > 0) && (
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
          
          {sortField && (
            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
              Ordenado: {sortOptions.find(o => o.field === sortField)?.label} 
              {sortDirection === "asc" ? " ↑" : " ↓"}
              <button
                className="ml-2 hover:text-green-900 dark:hover:text-green-100"
                onClick={() => {
                  setSortField("");
                  setSortDirection("asc");
                  applyFilters(filters, "", "asc");
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}