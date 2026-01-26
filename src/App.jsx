import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ApiStatus from "@/components/debug/ApiStatus"

function App() {
  return (
    <div className="notranslate" translate="no">
      <Pages />
      <Toaster />
      <ApiStatus />
    </div>
  )
}

export default App 
