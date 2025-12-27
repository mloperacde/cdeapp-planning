// src/components/common/Breadcrumbs.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Breadcrumbs() {
  const location = useLocation();
  
  return (
    <div className="text-sm breadcrumbs">
      <ul>
        <li><Link to="/">Inicio</Link></li>
        {/* Añadir lógica según tu necesidad */}
      </ul>
    </div>
  );
}
