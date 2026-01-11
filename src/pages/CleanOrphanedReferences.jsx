import React from 'react';
import CleanOrphanedReferences from '../components/audit/CleanOrphanedReferences';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from 'lucide-react';

export default function CleanOrphanedReferencesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">Limpiar Referencias Rotas</h1>
        </div>

        <CleanOrphanedReferences />
      </div>
    </div>
  );
}