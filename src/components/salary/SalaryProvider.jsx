import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SalaryContext = createContext(null);

export function SalaryProvider({ children }) {
  const queryClient = useQueryClient();

  // --- 1. SALARY COMPONENTS (Standard Entity) ---
  const { data: salaryComponents = [], isLoading: loadingComponents } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.list('order'),
    staleTime: 5 * 60 * 1000,
  });

  // --- 2. SALARY CATEGORIES (Standard Entity) ---
  const { data: salaryCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['salaryCategories'],
    queryFn: () => base44.entities.SalaryCategory.list('level'),
    staleTime: 5 * 60 * 1000,
  });

  // --- 3. COMPENSATION POLICIES (Virtual Table Strategy) ---
  // We use AppConfig as a Virtual Table to bypass schema limitations
  const { data: policies = [], isLoading: loadingPolicies, refetch: refetchPolicies } = useQuery({
    queryKey: ['compensation_policies_virtual'],
    queryFn: async () => {
      console.log("SalaryProvider: Loading Virtual Policies...");
      try {
        // Fetch all virtual records marked as 'VirtualPolicy'
        const virtualRecords = await base44.entities.AppConfig.filter({ app_subtitle: "VirtualPolicy" });
        
        const parsedPolicies = virtualRecords.map(r => {
          try {
            const parsed = JSON.parse(r.value);
            // Ensure ID from AppConfig record is preserved for updates
            return { ...parsed, _virtual_id: r.id };
          } catch(e) { 
            console.warn("Failed to parse virtual policy:", r.id);
            return null; 
          }
        }).filter(Boolean);

        console.log(`SalaryProvider: Loaded ${parsedPolicies.length} virtual policies`);
        return parsedPolicies;
      } catch (e) {
        console.error("SalaryProvider: Error loading virtual policies", e);
        return [];
      }
    },
    staleTime: 0, // Always fresh for critical financial data
    refetchOnWindowFocus: true
  });

  // --- MUTATIONS ---

  // Save Policy (Virtual Table Strategy)
  const savePolicyMutation = useMutation({
    mutationFn: async (policyData) => {
      // Generate a stable key based on position code or ID
      const policyCode = policyData.code || `POL-${policyData.position_id.substring(0, 6).toUpperCase()}`;
      const virtualKey = `policy_${policyCode}`;
      
      // Ensure benefits_slots has 4 items (Padding)
      const paddedBenefits = [
        ...(policyData.benefits_slots || []),
        ...Array(Math.max(0, 4 - (policyData.benefits_slots?.length || 0))).fill({ type: "", amount: 0 })
      ].slice(0, 4);

      const payloadToSave = {
        ...policyData,
        code: policyCode,
        benefits_slots: paddedBenefits,
        updated_at: new Date().toISOString()
      };

      // Check if exists by key
      const existingVirtual = await base44.entities.AppConfig.filter({ config_key: virtualKey });
      
      const appConfigPayload = {
        config_key: virtualKey,
        value: JSON.stringify(payloadToSave),
        description: `Virtual Policy for ${policyData.position_name}`,
        app_subtitle: "VirtualPolicy"
      };

      if (existingVirtual.length > 0) {
        await base44.entities.AppConfig.update(existingVirtual[0].id, appConfigPayload);
      } else {
        await base44.entities.AppConfig.create(appConfigPayload);
      }
      
      return payloadToSave;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compensation_policies_virtual'] });
      toast.success("Política guardada correctamente");
    },
    onError: (e) => {
      console.error("Save Policy Failed", e);
      toast.error("Error al guardar política: " + e.message);
    }
  });

  // Helper to get policy for a position
  const getPolicyByPosition = (positionId) => {
    if (!positionId || !policies.length) return null;
    
    // 1. Try exact Code match (if we can derive code from ID)
    const derivedCode = `POL-${positionId.substring(0, 6).toUpperCase()}`;
    const codeMatch = policies.find(p => p.code === derivedCode);
    if (codeMatch) return codeMatch;

    // 2. Try target_positions array
    const posMatch = policies.find(p => {
       if (Array.isArray(p.target_positions) && p.target_positions.includes(positionId)) return true;
       if (p.position_id === positionId) return true; // Legacy
       return false;
    });
    
    return posMatch || null;
  };

  const value = {
    // Data
    salaryComponents,
    salaryCategories,
    policies,
    
    // Loading States
    loadingComponents,
    loadingCategories,
    loadingPolicies,

    // Helpers
    getPolicyByPosition,
    
    // Actions
    savePolicy: savePolicyMutation.mutate,
    isSavingPolicy: savePolicyMutation.isPending
  };

  return <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>;
}

export function useSalaryData() {
  const context = useContext(SalaryContext);
  if (!context) {
    throw new Error("useSalaryData must be used within a SalaryProvider");
  }
  return context;
}
