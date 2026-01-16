import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <div className="notranslate" translate="no">
      <Pages />
      <Toaster />
    </div>
  )
}

export default App 
