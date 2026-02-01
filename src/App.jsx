import { useEffect } from 'react'
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { SyncService } from "@/services/SyncService"

function App() {
  useEffect(() => {
    SyncService.initScheduler();
  }, []);

  return (
    <div className="notranslate" translate="no">
      <Pages />
      <Toaster />
      <SonnerToaster />
    </div>
  )
}

export default App 
