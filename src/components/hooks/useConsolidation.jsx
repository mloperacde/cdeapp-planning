import { useState } from 'react';
import { base44 } from '@/api/base44Client';

export function useConsolidation() {
  const [executing, setExecuting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const executeConsolidation = async () => {
    setExecuting(true);
    setCurrentStep(0);
    setError(null);
    setResults(null);

    try {
      // Validar que base44.functions existe
      if (!base44 || !base44.functions || typeof base44.functions.invoke !== 'function') {
        throw new Error('API no inicializada correctamente. Por favor, recarga la página.');
      }

      // Paso 1: Consolidar máquinas
      setCurrentStep(1);
      console.log('Iniciando consolidación de máquinas...');
      
      const consolidationResponse = await base44.functions.invoke('consolidateMachines', {});
      
      if (!consolidationResponse?.data?.success) {
        throw new Error(consolidationResponse?.data?.error || 'Error en consolidación de máquinas');
      }

      const consolidationResults = consolidationResponse.data;
      console.log('Consolidación completada:', consolidationResults);

      // Paso 2: Actualizar referencias
      setCurrentStep(2);
      console.log('Actualizando referencias...');
      
      const referencesResponse = await base44.functions.invoke('updateMachineReferences', {});
      
      if (!referencesResponse?.data?.success) {
        throw new Error(referencesResponse?.data?.error || 'Error actualizando referencias');
      }

      const referencesResults = referencesResponse.data;
      console.log('Referencias actualizadas:', referencesResults);

      // Paso 3: Verificación final
      setCurrentStep(3);

      const finalResults = {
        consolidation: consolidationResults,
        references: referencesResults,
        timestamp: new Date().toISOString()
      };

      setResults(finalResults);
      console.log('Consolidación completada exitosamente');

    } catch (err) {
      console.error('Error en consolidación:', err);
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  return {
    executing,
    currentStep,
    results,
    error,
    executeConsolidation
  };
}