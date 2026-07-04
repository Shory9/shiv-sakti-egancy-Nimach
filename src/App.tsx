import { useState } from "react";
import "./App.css";

type CaseItem = {
  name: string;
  loan: string;
  bank: string;
  amount: string;
  executive: string;
  status: string;
};

const initialCases: CaseItem[] = [
  { name: "Ramesh Patel", loan: "LN-10021", bank: "HDFC", amount: "₹42,000", executive: "Amit", status: "Pending" },
  { name: "Suresh Jain", loan: "LN-10022", bank: "ICICI", amount: "₹18,500", executive: "Rahul", status: "Visited" },
];

function App() {
  const [caseList, setCaseList] = useState<CaseItem[]>(initialCases);
  const [showForm, setShowForm] = useState(false);

  const addDemoCase = () => {
    const newCase: CaseItem = {
      name: "New Customer",
      loan: "LN-" + (10020 + caseList.length + 1),
      bank: "SBI",
      amount: "₹25,000",
      executive: "Vikram",
      status: "Pending",
    };

    setCaseList([...caseList, newCase]);
    setShowForm(false);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>Shiv Shakti</h2>
        <p>Recovery Nimach</p>
        <button>Dashboard</button>
        <button>Cases</button>
        <button>Executives</button>
        <button>GPS Tracking</button>
        <button>Payments</button>
        <button>Reports</button>
        </aside>
       <main className="main">
        <div className="topbar">
  <div>
    <h1>Recovery Agency CRM</h1>
    <p>Case management, GPS tracking & recovery monitoring</p>
  </div>
  <button className="addBtn">+ Add New Case</button>
</div>

<div className="cards">
  <div className="card"><h3>Total Cases</h3><b>248</b><span>32 new this week</span></div>
  <div className="card"><h3>Today Collection</h3><b>₹84,500</b><span>Target ₹1,20,000</span></div>
  <div className="card"><h3>Active Executives</h3><b>12</b><span>9 on field now</span></div>
  <div className="card"><h3>Pending Amount</h3><b>₹18.7L</b><span>High priority</span></div>
</div>
</main>
</div>
  );
}
export default App;