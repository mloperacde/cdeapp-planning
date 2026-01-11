import React from 'react';
import DeduplicateMachines from '../components/audit/DeduplicateMachines';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { ChevronLeft } from 'lucide-react';

export default function MachineDeduplication() {
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
          <h1 className="text-3xl font-bold text-slate-900">Deduplicación de Máquinas</h1>
        </div>

        <DeduplicateMachines />
      </div>
    </div>
  );
}