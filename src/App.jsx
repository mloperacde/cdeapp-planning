import { useEffect } from 'react'
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { SyncService } from "@/services/SyncService"
import GlobalErrorBoundary from "@/components/common/GlobalErrorBoundary"

function App() {
  useEffect(() => {
    SyncService.initScheduler();
  }, []);

  return (
    <GlobalErrorBoundary>
      <div className="notranslate" translate="no">
        <Pages />
        <Toaster />
        <SonnerToaster />
      </div>
    </GlobalErrorBoundary>
  )
}

export default App 
