import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const SalaryContext = createContext(null);

// Helper for Hybrid Persistence (Shared Logic)
const fetchStoreCategories = async () => {
  try {
    const store = await base44.entities.AppConfig.filter({ config_key: "salary_categories_store" });
    const record = store[0];
    if (!record) return [];
    let raw = record.value || record.description || record.app_subtitle || "[]";
    if (typeof raw === "string") {
      try { return JSON.parse(raw) || []; } catch { return []; }
    }
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

export function SalaryProvider({ children }) {
  const queryClient = useQueryClient();

  // --- 1. SALARY COMPONENTS (Standard Entity) ---
  const { data: salaryComponents = [], isLoading: loadingComponents } = useQuery({
    queryKey: ['salaryComponents'],
    queryFn: () => base44.entities.SalaryComponent.list('order'),
    staleTime: 5 * 60 * 1000,
  });

  // --- 2. SALARY CATEGORIES (Hybrid Persistence) ---
  const { data: salaryCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['salaryCategoriesAll'], // Key matches SalaryCategoryManager
    queryFn: async () => {
      let db = [];
      let store = [];
      
      // Attempt DB Fetch
      try {
        db = await base44.entities.SalaryCategory.list('level');
      } catch (e) {
        console.warn("SalaryProvider: DB Fetch failed for categories", e);
      }

      // Always fetch Store Backup
      store = await fetchStoreCategories();

      // Merge Strategy
      const categoryMap = new Map();
      
      // Populate with DB first
      db.forEach(c => categoryMap.set(c.id, { ...c, source: 'db' }));

      // Overlay Store data
      store.forEach(c => {
        if (categoryMap.has(c.id)) {
          const existing = categoryMap.get(c.id);
          categoryMap.set(c.id, { ...existing, ...c, source: 'merged' });
        } else {
          categoryMap.set(c.id, { ...c, source: 'store' });
        }
      });

      return Array.from(categoryMap.values());
    },
    staleTime: 5 * 60 * 1000,
  });

  // --- NEW: SENIORITY BANDS ---
  const { data: seniorityBands = [], isLoading: loadingSeniority } = useQuery({
    queryKey: ['seniorityBands'],
    queryFn: () => base44.entities.SeniorityBand.list(),
    staleTime: 5 * 60 * 1000,
  });

  // --- NEW: AUTOMATIC RULES ---
  const { data: salaryRules = [], isLoading: loadingRules } = useQuery({
    queryKey: ['salaryRules'],
    queryFn: () => base44.entities.AutomaticSalaryRule.list(),
    staleTime: 5 * 60 * 1000,
  });

  // --- NEW: POSITIONS (For linking employees to policies) ---
  const { data: positions = [], isLoading: loadingPositions } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
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

  const getSalaryCategoriesForPosition = (positionId) => {
    if (!positionId) return [];
    return salaryCategories.filter(c => c.position_id === positionId);
  };

  const value = {
    // Data
    salaryComponents,
    salaryCategories,
    policies,
    seniorityBands,
    salaryRules,
    positions,
    
    // Loading States
    loadingComponents,
    loadingCategories,
    loadingPolicies,

    // Helpers
    getPolicyByPosition,
    getSalaryCategoriesForPosition,
    
    // Actions
    savePolicy: savePolicyMutation.mutate,
    isSavingPolicy: savePolicyMutation.isPending
  };

  return <SalaryContext.Provider value={value}>{children}</SalaryContext.Provider>;
}

/**
 * Calculates the theoretical salary for an employee based on their position, policy, and category.
 */
export const calculateTheoreticalSalary = (employee, position, policy, salaryCategories = [], salaryRules = [], seniorityBands = []) => {
  if (!employee || !position || !policy) return { total: 0, breakdown: [] };

  const breakdown = [];
  let total = 0;

  // 1. Base Salary from Category
  // We need to find the specific category assigned to this employee
  // AND ensure it belongs to the position.
  
  let baseSalary = 0;
  const empCategoryName = (employee.categoria_profesional || "").trim();
  
  // Filter categories relevant to this position
  const positionCategories = salaryCategories.filter(c => c.position_id === position.id);
  
  // Find category ID matching the employee's category name within this position
  // Logic: Employee "Senior" -> Position "Dev" -> Category "Dev Senior" (name "Senior")
  const categoryObj = positionCategories.find(c => 
    (c.name || "").toLowerCase() === empCategoryName.toLowerCase() ||
    (c.code || "").toLowerCase() === empCategoryName.toLowerCase()
  );
  
  const categoryId = categoryObj?.id;

  if (policy.category_ranges && categoryId && policy.category_ranges[categoryId]) {
     // Use the value defined in the Policy (Current Year)
     baseSalary = Number(policy.category_ranges[categoryId].current) || 0;
     breakdown.push({ name: `Salario Base (${categoryObj.name})`, amount: baseSalary, type: 'base' });
  } else if (categoryObj && categoryObj.salary_range?.target) {
     // Fallback to Category Definition Target if Policy override is missing
     baseSalary = Number(categoryObj.salary_range.target) || 0;
     breakdown.push({ name: `Salario Base (${categoryObj.name} - Estándar)`, amount: baseSalary, type: 'base' });
  } else if (policy.target_salary) {
     // Legacy Fallback (General Policy Target)
     baseSalary = Number(policy.target_salary) || 0;
     breakdown.push({ name: `Salario Base (Puesto Genérico)`, amount: baseSalary, type: 'base' });
  } else {
     breakdown.push({ name: `Salario Base (No definido)`, amount: 0, type: 'base' });
  }
  total += baseSalary;

  // 2. Benefits
  // Only add benefits if amount > 0
  if (policy.benefits_slots && Array.isArray(policy.benefits_slots)) {
    policy.benefits_slots.forEach(slot => {
      const amt = Number(slot.amount) || 0;
      if (amt > 0) {
        total += amt;
        breakdown.push({ name: `Beneficio: ${slot.type}`, amount: amt, type: 'benefit' });
      }
    });
  }

  // 3. Automatic Rules
  if (salaryRules && salaryRules.length > 0) {
     salaryRules.forEach(rule => {
        // Check if rule applies to position (by ID or 'ALL')
        if (rule.target_positions && (rule.target_positions.includes(position.id) || rule.target_positions.includes('ALL'))) {
           const amt = Number(rule.amount) || 0;
           total += amt;
           breakdown.push({ name: `Regla: ${rule.name}`, amount: amt, type: 'rule' });
        }
     });
  }

  // 4. Seniority
  if (employee.fecha_antiguedad) {
    const start = new Date(employee.fecha_antiguedad);
    const now = new Date();
    // Calculate full years
    const diffTime = Math.abs(now - start);
    const years = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365.25)); 
    
    // Find matching band
    const band = seniorityBands.find(b => years >= b.min_years && years <= (b.max_years || 999));
    if (band) {
       const amt = Number(band.amount) || 0;
       if (amt > 0) {
         total += amt;
         breakdown.push({ name: `Antigüedad (${years} años)`, amount: amt, type: 'seniority' });
       }
    }
  }

  return { total, breakdown };
};

export function useSalaryData() {
  const context = useContext(SalaryContext);
  if (!context) {
    throw new Error("useSalaryData must be used within a SalaryProvider");
  }
  return context;
}
