import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Search, X, Filter } from "lucide-react";
import SearchableSelect from "../common/SearchableSelect";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AdvancedDocumentSearch({ 
  onSearchChange,
  categories = [],
  departments = [],
  roles = []
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [fullTextSearch, setFullTextSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const applyFilters = () => {
    onSearchChange({
      searchTerm,
      fullTextSearch,
      category: selectedCategory,
      department: selectedDepartment,
      role: selectedRole,
      tags: selectedTags
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFullTextSearch("");
    setSelectedCategory("");
    setSelectedDepartment("");
    setSelectedRole("");
    setSelectedTags([]);
    onSearchChange({});
  };

  const addTag = () => {
    if (tagInput && !selectedTags.includes(tagInput)) {
      setSelectedTags([...selectedTags, tagInput]);
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const categoryOptions = categories.map(c => ({ value: c, label: c }));
  const departmentOptions = departments.map(d => ({ value: d, label: d }));
  const roleOptions = roles.map(r => ({ value: r.id, label: r.role_name }));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar en título y descripción..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              applyFilters();
            }}
            className="pl-10"
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtros Avanzados
              {(selectedCategory || selectedDepartment || selectedRole || selectedTags.length > 0) && (
                <Badge className="ml-2 bg-blue-600">
                  {[selectedCategory, selectedDepartment, selectedRole, ...selectedTags].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Búsqueda en Contenido</Label>
                <Input
                  placeholder="Buscar dentro del texto del documento..."
                  value={fullTextSearch}
                  onChange={(e) => setFullTextSearch(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Busca en el contenido indexado del documento
                </p>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <SearchableSelect
                  options={categoryOptions}
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                  placeholder="Todas las categorías"
                />
              </div>

              <div className="space-y-2">
                <Label>Departamento</Label>
                <SearchableSelect
                  options={departmentOptions}
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                  placeholder="Todos los departamentos"
                />
              </div>

              <div className="space-y-2">
                <Label>Rol de Acceso</Label>
                <SearchableSelect
                  options={roleOptions}
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                  placeholder="Todos los roles"
                />
              </div>

              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Agregar etiqueta..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  />
                  <Button size="sm" onClick={addTag}>+</Button>
                </div>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button onClick={applyFilters} className="flex-1 bg-blue-600">
                  Aplicar Filtros
                </Button>
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {(searchTerm || fullTextSearch || selectedCategory || selectedDepartment || selectedRole || selectedTags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {searchTerm && (
            <Badge variant="outline" className="bg-blue-50">
              Título: {searchTerm}
              <button onClick={() => { setSearchTerm(""); applyFilters(); }} className="ml-2">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {fullTextSearch && (
            <Badge variant="outline" className="bg-purple-50">
              Contenido: {fullTextSearch}
              <button onClick={() => { setFullTextSearch(""); applyFilters(); }} className="ml-2">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {selectedCategory && (
            <Badge variant="outline" className="bg-green-50">
              {selectedCategory}
              <button onClick={() => { setSelectedCategory(""); applyFilters(); }} className="ml-2">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}