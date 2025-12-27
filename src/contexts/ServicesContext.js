// src/contexts/ServicesContext.js
import React, { createContext, useContext } from 'react';
import useServices from '@/hooks/useServices';

const ServicesContext = createContext(null);

export const ServicesProvider = ({ children }) => {
  const services = useServices();

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServicesContext = () => {
  const context = useContext(ServicesContext);
  
  if (!context) {
    throw new Error('useServicesContext debe usarse dentro de ServicesProvider');
  }
  
  return context;
};

// Helper para acceder rápidamente a servicios
export const useMachineService = () => {
  const { services } = useServicesContext();
  return services?.machineService;
};

export const useProcessService = () => {
  const { services } = useServicesContext();
  return services?.processService;
};

export const useAssignmentService = () => {
  const { services } = useServicesContext();
  return services?.assignmentService;
};

export const useServiceUtils = () => {
  const { services } = useServicesContext();
  return services?.serviceUtils;
};
