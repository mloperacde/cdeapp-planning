import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <Link 
        to={createPageUrl("Dashboard")} 
        className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Inicio</span>
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600" />
          {item.url && index < items.length - 1 ? (
            <Link 
              to={item.url} 
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}