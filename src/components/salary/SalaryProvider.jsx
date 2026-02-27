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

  // --- 3. COMPENSATION POLICIES (Native Table) ---
  const { data: policies = [], isLoading: loadingPolicies, refetch: refetchPolicies } = useQuery({
    queryKey: ['compensation_policies_native'],
    queryFn: async () => {
      console.log("SalaryProvider: Loading Native Policies...");
      try {
        const nativeRecords = await base44.entities.CompensationPolicy.list();
        
        const parsedPolicies = nativeRecords.map(r => {
          try {
            // Unpack fields if they are JSON strings
            let ranges = r.salary_ranges;
            let notes = r.notes;
            
            // Try to parse if string, otherwise keep as is (e.g. legacy or other format)
            if (typeof ranges === 'string') {
               // Try parsing JSON first
               try { ranges = JSON.parse(ranges); } catch { /* Keep as string if not JSON */ }
            }
            if (typeof notes === 'string') {
               // The notes field is used as Mega-Pack, so we MUST try to parse it
               try { notes = JSON.parse(notes); } catch { /* Keep as string if just text */ }
            }

            // Merge unpacked data back into object
            // Priority: Notes (Mega-Pack) > SalaryRanges > Native Fields
            return {
              ...r,
              salary_ranges: ranges || {},
              category_ranges: notes?.category_ranges || ranges?.category_ranges || {}, // Prioritize Mega-Pack
              benefits_slots: notes?.benefits_slots || [],
              benefits_text: notes?.benefits_text || (typeof notes === 'string' ? notes : ""),
              bonus_target: notes?.bonus_target || r.bonus_target,
              variable_percentage: notes?.variable_percentage || r.variable_percentage,
              _native_id: r.id
            };
          } catch(e) { 
            console.warn("Failed to parse policy record:", r.id);
            return r; 
          }
        });

        console.log(`SalaryProvider: Loaded ${parsedPolicies.length} native policies`);
        return parsedPolicies;
      } catch (e) {
        console.error("SalaryProvider: Error loading native policies", e);
        return [];
      }
    },
    staleTime: 0, 
    refetchOnWindowFocus: true
  });

  // --- 4. GLOBAL CONFIGURATION (MIGRATED TO TaxConfiguration) ---
  // We use TaxConfiguration as a stable place to store global payroll settings
  // Identify by tax_type = 'GLOBAL_PAYROLL_CONFIG'
  const { data: globalConfig = { annual_pay_count: 14, pay_dates: [] }, isLoading: loadingGlobalConfig } = useQuery({
    queryKey: ['salary_global_config'],
    queryFn: async () => {
      try {
        // 1. Try TaxConfiguration (Preferred Native Table)
        const configs = await base44.entities.TaxConfiguration.filter({ tax_type: "GLOBAL_PAYROLL_CONFIG" });
        if (configs && configs.length > 0) {
           const r = configs[0];
           // Pack data might be in 'deductions' or special field? No, let's use 'social_security_rates' or 'deductions'
           // Or simply assume we packed it into 'deductions' list as a special item
           // Actually, let's look at the schema provided:
           /*
             TaxConfiguration: 
             - name
             - tax_type
             - irpf_brackets (List)
             - social_security_rates (List)
             - deductions (List)
           */
           // We can pack our JSON into the first item of 'deductions' description or similar?
           // OR better: Since we don't have a generic text field in TaxConfiguration visible in the prompt (except maybe name?),
           // Wait, let's look closer at TaxConfiguration schema provided:
           // "name", "year", "country", "tax_type", "irpf_brackets", "social_security_rates", "deductions", "valid_from", "valid_to"
           
           // Strategy: Use 'deductions' array to store a special item
           // item: { name: "PAY_CONFIG_JSON", amount: 0, description: JSON_STRING }
           
           if (r.deductions && Array.isArray(r.deductions)) {
              const configItem = r.deductions.find(d => d.name === "PAY_CONFIG_JSON");
              if (configItem && configItem.description) {
                 try { return JSON.parse(configItem.description); } catch {}
              }
           }
        }

        // 2. Fallback to AppConfig (Legacy)
        const appConfigs = await base44.entities.AppConfig.filter({ config_key: "GLOBAL_PAYROLL_CONFIG" });
        if (appConfigs.length > 0) {
           const r = appConfigs[0];
           let raw = r.value || r.description || r.app_subtitle;
           try { return JSON.parse(raw); } catch {}
        }
        
        return { annual_pay_count: 14, pay_dates: [] };
      } catch (e) {
        console.warn("Failed to load global config", e);
        return { annual_pay_count: 14, pay_dates: [] };
      }
    }
  });

  // --- MUTATIONS ---

  // Save Global Config
  const saveGlobalConfigMutation = useMutation({
    mutationFn: async (configData) => {
      const CONFIG_TYPE = "GLOBAL_PAYROLL_CONFIG";
      const jsonVal = JSON.stringify(configData);
      
      // 1. Try to save to TaxConfiguration
      try {
        const existing = await base44.entities.TaxConfiguration.filter({ tax_type: CONFIG_TYPE });
        
        // Prepare the "Packed" deduction item
        const configItem = {
          name: "PAY_CONFIG_JSON",
          amount: 0,
          description: jsonVal
        };

        const payload = {
          name: "Global Payroll Configuration",
          year: new Date().getFullYear(),
          country: "España",
          tax_type: CONFIG_TYPE,
          is_active: true,
          valid_from: new Date().toISOString().split('T')[0],
          // Store our config in the deductions list
          deductions: [configItem]
        };

        if (existing && existing.length > 0) {
          await base44.entities.TaxConfiguration.update(existing[0].id, payload);
        } else {
          await base44.entities.TaxConfiguration.create(payload);
        }
      } catch (nativeError) {
        console.warn("Native Config Save Failed, falling back to AppConfig", nativeError);
        
        // 2. Fallback to AppConfig
        const APP_KEY = "GLOBAL_PAYROLL_CONFIG";
        const appExisting = await base44.entities.AppConfig.filter({ config_key: APP_KEY });
        
        const appPayload = {
          config_key: APP_KEY,
          value: jsonVal,
          description: jsonVal, 
          app_subtitle: "PayrollConfig"
        };

        if (appExisting && appExisting.length > 0) {
          await base44.entities.AppConfig.update(appExisting[0].id, appPayload);
        } else {
          await base44.entities.AppConfig.create(appPayload);
        }
      }
      
      return configData;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['salary_global_config'] });
      toast.success("Configuración global guardada");
    }
  });

  // Save Policy (Native Table)
  const savePolicyMutation = useMutation({
    mutationFn: async (policyData) => {
      // 1. Prepare Payload for Native Table (Mega-Pack Strategy)
      
      const packedData = {
        category_ranges: policyData.category_ranges || {},
        bonus_target: policyData.bonus_target,
        variable_percentage: policyData.variable_percentage,
        benefits_slots: policyData.benefits_slots || [],
        benefits_text: policyData.benefits_text || "",
        currency: policyData.currency || "EUR",
        pay_frequency: policyData.pay_frequency || "Mensual",
        updated_at: new Date().toISOString()
      };

      const packedJSON = JSON.stringify(packedData);

      // REQUIRED FIELDS FIX:
      // 1. policy_name: Generate from position/code
      // 2. valid_from: Current date
      // 3. salary_ranges: Pass as OBJECT, not string (Base44 handles serialization if it's a JSON field, or rejects string if it expects Dict)
      
      const nativePayload = {
        // Essential Identity
        policy_name: `Política ${policyData.position_name || policyData.code}`,
        code: policyData.code,
        target_positions: [policyData.position_id], 
        
        // Required Dates
        valid_from: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        is_active: true,

        // MEGA-PACK (Storage)
        notes: packedJSON,
        
        // Field 'salary_ranges' expects a Dictionary/Object, not a JSON string?
        // Let's pass the object directly. Base44 client might handle it.
        salary_ranges: {
           min: 0, 
           max: 0, 
           target: 0,
           category_ranges: policyData.category_ranges
        },
        
        // Map top-level fields for visibility
        min_salary: 0,
        max_salary: 0,
        target_salary: 0,
      };

      // 2. Check if update or create
      let idToUpdate = policyData._native_id;

      if (!idToUpdate && policyData.position_id) {
         const existing = policies.find(p => 
            (p.target_positions && p.target_positions.includes(policyData.position_id)) ||
            p.position_id === policyData.position_id 
         );
         if (existing) idToUpdate = existing._native_id;
      }

      try {
        if (idToUpdate) {
          await base44.entities.CompensationPolicy.update(idToUpdate, nativePayload);
        } else {
          await base44.entities.CompensationPolicy.create(nativePayload);
        }
      } catch (nativeError) {
        console.warn("Native Policy Save Failed", nativeError);
        throw nativeError; 
      }
      
      return policyData;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['compensation_policies_native'] });
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

    // 2. Try target_positions array (Standard)
    const posMatch = policies.find(p => {
       if (Array.isArray(p.target_positions) && p.target_positions.includes(positionId)) return true;
       // Legacy fallback
       if (p.position_id === positionId) return true; 
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
    loadingGlobalConfig,

    // Global Config
    globalConfig,
    saveGlobalConfig: saveGlobalConfigMutation.mutate,

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
