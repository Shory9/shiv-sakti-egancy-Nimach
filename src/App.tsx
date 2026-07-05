import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";

function App() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  return (
    <div className="app">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
      />

      <main className="main">
        {activeMenu === "Dashboard" && <Dashboard />}

        {activeMenu !== "Dashboard" && (
          <div className="coming-soon">
            <h1>{activeMenu}</h1>
            <p>This module will be developed in the next phase.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;