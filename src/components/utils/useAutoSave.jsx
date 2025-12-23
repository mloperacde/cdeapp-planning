import { useState, useEffect, useCallback } from "react";

export function useAutoSave(formData, formKey, autoSaveInterval = 30000) {
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  const storageKey = `draft_${formKey}`;

  // Verificar si hay borrador al montar
  useEffect(() => {
    const draft = localStorage.getItem(storageKey);
    setHasDraft(!!draft);
  }, [storageKey]);

  // Guardar automáticamente cada intervalo
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify(formData));
      setLastSaved(new Date());
      setIsDirty(false);
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [formData, isDirty, storageKey, autoSaveInterval]);

  // Marcar como sucio cuando cambia formData
  useEffect(() => {
    setIsDirty(true);
  }, [formData]);

  // Prevenir salida con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const loadDraft = useCallback(() => {
    const draft = localStorage.getItem(storageKey);
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch {
        return null;
      }
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
    setIsDirty(false);
  }, [storageKey]);

  const saveDraft = useCallback(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
    setLastSaved(new Date());
    setIsDirty(false);
  }, [formData, storageKey]);

  return {
    isDirty,
    lastSaved,
    hasDraft,
    loadDraft,
    clearDraft,
    saveDraft
  };
}