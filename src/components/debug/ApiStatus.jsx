import React, { useState, useEffect } from 'react';
import { base44, APP_ID } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Database, User } from "lucide-react";

export default function ApiStatus() {
  const [status, setStatus] = useState({
    auth: { status: 'pending', data: null, error: null },
    employees: { status: 'pending', count: 0, error: null },
    breaks: { status: 'pending', count: 0, error: null },
    emergency: { status: 'pending', count: 0, error: null },
    emergencyPlural: { status: 'pending', count: 0, error: null }, // Test plural
    union: { status: 'pending', count: 0, error: null },
  });
  const [minimized, setMinimized] = useState(false);

  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, 
      auth: { status: 'loading', data: null, error: null },
      employees: { status: 'loading', count: 0, error: null },
      breaks: { status: 'loading', count: 0, error: null },
      emergency: { status: 'loading', count: 0, error: null },
      emergencyPlural: { status: 'loading', count: 0, error: null },
      union: { status: 'loading', count: 0, error: null }
    }));

    // Check Auth
    try {
      const user = await base44.auth.me();
      setStatus(prev => ({ ...prev, auth: { status: 'success', data: user, error: null } }));
    } catch (e) {
      console.error("Auth Check Failed", e);
      setStatus(prev => ({ ...prev, auth: { status: 'error', data: null, error: e.message || "Auth Failed" } }));
    }

    // Helper to normalize data
    const normalizeData = (data) => {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.data)) return data.data;
        if (data && Array.isArray(data.items)) return data.items;
        if (typeof data === 'object' && data !== null) return Object.values(data).filter(item => typeof item === 'object');
        return [];
    };

    const checkEntity = async (entityName, key, sort = undefined) => {
        try {
            // Dynamically access entity. If property doesn't exist, it might throw or return undefined if using Proxy
            // base44.entities is a Proxy, so accessing any prop returns an object with methods.
            const data = await base44.entities[entityName].list(sort);
            const normalized = normalizeData(data);
            setStatus(prev => ({ ...prev, [key]: { status: 'success', count: normalized.length, error: null } }));
        } catch (e) {
            console.error(`${entityName} Check Failed`, e);
            setStatus(prev => ({ ...prev, [key]: { status: 'error', count: 0, error: e.message || "Fetch Failed" } }));
        }
    };

    // Parallel checks
    checkEntity('EmployeeMasterDatabase', 'employees');
    checkEntity('BreakShift', 'breaks');
    checkEntity('EmergencyTeamMember', 'emergency');
    // checkEntity('EmergencyTeamMembers', 'emergencyPlural'); // Removed as it causes 404
    checkEntity('UnionHoursRecord', 'union');
  };

  // Auto-expand on error or zero counts (except plural which might be 0)
  useEffect(() => {
    const hasError = Object.values(status).some(s => s.status === 'error');
    const hasZeroCritical = (status.employees.status === 'success' && status.employees.count === 0);
    
    if (hasError || hasZeroCritical) {
        setMinimized(false);
    }
  }, [status]);

  useEffect(() => {
    checkConnection();
  }, []);

  const StatusIcon = ({ status }) => {
    if (status === 'loading') return <Loader2 className="w-3 h-3 animate-spin text-blue-500" />;
    if (status === 'success') return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    if (status === 'error') return <XCircle className="w-3 h-3 text-red-500" />;
    return <AlertTriangle className="w-3 h-3 text-gray-400" />;
  };

  if (minimized) {
    return (
        <Button 
            variant="outline" 
            size="sm" 
            className="fixed bottom-4 right-4 z-50 bg-white shadow-lg text-xs h-8"
            onClick={() => setMinimized(false)}
        >
            <StatusIcon status={Object.values(status).some(s => s.status === 'error') ? 'error' : 'success'} />
            <span className="ml-2">API Status</span>
        </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 shadow-2xl border-2 border-slate-200 bg-white/95 backdrop-blur animate-in slide-in-from-bottom-5">
      <CardHeader className="py-2 px-3 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-mono flex items-center gap-2">
          <Database className="w-3 h-3" />
          API Diagnostics
        </CardTitle>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkConnection}>
                <RefreshCw className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMinimized(true)}>
                <span className="text-xs">_</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-3 text-xs">
        
        {/* Environment Info */}
        <div className="bg-slate-100 p-2 rounded space-y-1">
            <div className="flex justify-between">
                <span className="text-slate-500">App ID:</span>
                <span className="font-mono font-bold">{APP_ID}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className={`font-bold ${import.meta.env.VITE_USE_MOCK === 'true' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {import.meta.env.VITE_USE_MOCK === 'true' ? 'MOCK' : 'REAL API'}
                </span>
            </div>
        </div>

        {/* Auth Status */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded border">
            <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-slate-400" />
                <span>Auth</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-slate-500 truncate max-w-[150px]">
                    {status.auth.data ? status.auth.data.email : status.auth.error || 'Checking...'}
                </span>
                <StatusIcon status={status.auth.status} />
            </div>
        </div>

        {/* Entities */}
        <div className="space-y-1">
            <div className="font-semibold text-slate-500 px-1">Entities</div>
            
            <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                <span>EmployeeMasterDatabase</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{status.employees.count}</span>
                    <StatusIcon status={status.employees.status} />
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                <span>EmergencyTeamMember</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{status.emergency.count}</span>
                    <StatusIcon status={status.emergency.status} />
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                <span>EmergencyTeamMembers (Plural)</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{status.emergencyPlural.count}</span>
                    <StatusIcon status={status.emergencyPlural.status} />
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                <span>BreakShift</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{status.breaks.count}</span>
                    <StatusIcon status={status.breaks.status} />
                </div>
            </div>

            <div className="flex justify-between items-center px-2 py-1 hover:bg-slate-50 rounded">
                <span>UnionHoursRecord</span>
                <div className="flex items-center gap-2">
                    <span className="font-mono">{status.union.count}</span>
                    <StatusIcon status={status.union.status} />
                </div>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}