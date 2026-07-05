import { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import BankImport from "./components/BankImport";
import ExecutiveManagement from "./components/ExecutiveManagement";
import PaymentManagement from "./components/PaymentManagement";
import GPSTracking from "./components/GPSTracking";
import Reports from "./components/Reports";

function App() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  return (
    <div className="app">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <main className="main">
        {activeMenu === "Dashboard" && <Dashboard />}
        {activeMenu === "Bank Import" && <BankImport />}
        {activeMenu === "Executives" && <ExecutiveManagement />}
        {activeMenu === "GPS Tracking" && <GPSTracking />}
        {activeMenu === "Payments" && <PaymentManagement />}
        {activeMenu === "Reports" && <Reports />}

        {activeMenu === "Cases" && (
          <div className="coming-soon">
            <h1>Cases</h1>
            <p>Cases module Dashboard ke andar abhi working hai.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;