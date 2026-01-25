
import { Routes, Route } from "react-router-dom";
import "./styles.css";
import Layout from "./Layout";
import Dashboard from "./Dashboard";
import Configurator from "./Configurator";
import Articles from "./Articles";
import Compare from "./Compare";
import DataManagement from "./DataManagement";

function App() {
  return (
    <div className="ProcessConfiguratorApp">
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="configurator" element={<Configurator />} />
          <Route path="configurator/:articleId" element={<Configurator />} />
          <Route path="articles" element={<Articles />} />
          <Route path="compare" element={<Compare />} />
          <Route path="data" element={<DataManagement />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
