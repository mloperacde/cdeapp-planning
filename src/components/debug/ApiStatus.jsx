import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

export default function ApiStatus() {
  const [status, setStatus] = useState({
    auth: { status: 'pending', data: null, error: null },
    breaks: { status: 'pending', count: 0, error: null },
    emergency: { status: 'pending', count: 0, error: null },
  });
  const [minimized, setMinimized] = useState(false);

  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, 
      auth: { status: 'loading', data: null, error: null },
      breaks: { status: 'loading', count: 0, error: null },
      emergency: { status: 'loading', count: 0, error: null }
    }));

    // Check Auth
    try {
      const user = await base44.auth.me();
      setStatus(prev => ({ ...prev, auth: { status: 'success', data: user, error: null } }));
    } catch (e) {
      console.error("Auth Check Failed", e);
      setStatus(prev => ({ ...prev, auth: { status: 'error', data: null, error: e.message || "Auth Failed" } }));
    }

    // Check BreakShift
    try {
      const breaks = await base44.entities.BreakShift.list();
      setStatus(prev => ({ ...prev, breaks: { status: 'success', count: breaks.length, error: null } }));
    } catch (e) {
      console.error("BreakShift Check Failed", e);
      setStatus(prev => ({ ...prev, breaks: { status: 'error', count: 0, error: e.message || "Fetch Failed" } }));
    }

    // Check EmergencyTeamMember
    try {
      const members = await base44.entities.EmergencyTeamMember.list();
      setStatus(prev => ({ ...prev, emergency: { status: 'success', count: members.length, error: null } }));
    } catch (e) {
      console.error("EmergencyTeamMember Check Failed", e);
      setStatus(prev => ({ ...prev, emergency: { status: 'error', count: 0, error: e.message || "Fetch Failed" } }));
    }
  };

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
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-2xl border-2 border-slate-200 bg-white/95 backdrop-blur animate-in slide-in-from-bottom-5">
      <CardHeader className="py-2 px-3 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-mono flex items-center gap-2">
          <StatusIcon status={Object.values(status).some(s => s.status === 'error') ? 'error' : 'success'} />
          Base44 Connection
        </CardTitle>
        <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={checkConnection} className="h-5 w-5">
            <RefreshCw className={`w-3 h-3 ${Object.values(status).some(s => s.status === 'loading') ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setMinimized(true)} className="h-5 w-5">
            <span className="text-xs">_</span>
            </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-xs">
        
        {/* Auth Status */}
        <div className="flex items-center justify-between p-1 rounded hover:bg-slate-50">
          <span className="font-medium text-slate-600">Auth</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={status.auth.status} />
            {status.auth.status === 'success' && <span className="text-green-700 truncate max-w-[100px]">{status.auth.data?.email || 'OK'}</span>}
            {status.auth.status === 'error' && <span className="text-red-600 truncate max-w-[100px]" title={status.auth.error}>{status.auth.error}</span>}
          </div>
        </div>

        {/* BreakShift Status */}
        <div className="flex items-center justify-between p-1 rounded hover:bg-slate-50">
          <span className="font-medium text-slate-600">BreakShift</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={status.breaks.status} />
            {status.breaks.status === 'success' && <span className="text-slate-900 font-bold">{status.breaks.count} recs</span>}
            {status.breaks.status === 'error' && <span className="text-red-600 truncate max-w-[100px]" title={status.breaks.error}>{status.breaks.error}</span>}
          </div>
        </div>

        {/* EmergencyTeamMember Status */}
        <div className="flex items-center justify-between p-1 rounded hover:bg-slate-50">
          <span className="font-medium text-slate-600">EmergencyTeam</span>
          <div className="flex items-center gap-2">
            <StatusIcon status={status.emergency.status} />
            {status.emergency.status === 'success' && <span className="text-slate-900 font-bold">{status.emergency.count} recs</span>}
            {status.emergency.status === 'error' && <span className="text-red-600 truncate max-w-[100px]" title={status.emergency.error}>{status.emergency.error}</span>}
          </div>
        </div>

        <div className="pt-2 border-t text-[10px] text-slate-400 text-center flex justify-between">
            <span>Mode: {import.meta.env.VITE_USE_MOCK === 'true' ? 'MOCK' : 'REAL'}</span>
            <span>AppID: ...97c8</span>
        </div>
      </CardContent>
    </Card>
  );
}
