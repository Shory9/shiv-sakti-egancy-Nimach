import { useState } from "react";
import AddCaseForm, { type NewCase } from "./AddCaseForm";
import CasesTable, { type CaseItem } from "./CasesTable";
import Header from "./Header";
import StatsCards from "./StatsCards";

const initialCases: CaseItem[] = [
  {
    id: "SS-001",
    customer: "Ramesh Verma",
    phone: "9876543210",
    bank: "HDFC Bank",
    amount: 45000,
    agent: "Amit",
    status: "Pending",
  },
  {
    id: "SS-002",
    customer: "Suresh Patel",
    phone: "9123456780",
    bank: "ICICI Bank",
    amount: 72000,
    agent: "Rahul",
    status: "Visited",
  },
  {
    id: "SS-003",
    customer: "Mahesh Sharma",
    phone: "9988776655",
    bank: "Axis Bank",
    amount: 28000,
    agent: "Vikram",
    status: "Paid",
  },
  {
    id: "SS-004",
    customer: "Dinesh Jain",
    phone: "9090909090",
    bank: "SBI Bank",
    amount: 61000,
    agent: "Amit",
    status: "Overdue",
  },
];

function Dashboard() {
  const [cases, setCases] = useState<CaseItem[]>(initialCases);
  const [showForm, setShowForm] = useState(false);

  function handleAddCase(newCase: NewCase) {
    const nextCase: CaseItem = {
      id: `SS-${String(cases.length + 1).padStart(3, "0")}`,
      ...newCase,
      status: "Pending",
    };

    setCases([nextCase, ...cases]);
    setShowForm(false);
  }

  function handleDeleteCase(id: string) {
    setCases(cases.filter((item) => item.id !== id));
  }

  return (
    <section className="dashboard">
      <Header
        title="Shiv Shakti Recovery Dashboard"
        subtitle="Bank recovery cases, agents, payments and field tracking overview."
      />

      <div className="dashboard-actions">
        <button className="primary-btn" onClick={() => setShowForm(true)}>
          + Add New Case
        </button>
      </div>

      <StatsCards />

      {showForm && (
        <AddCaseForm
          onAddCase={handleAddCase}
          onCancel={() => setShowForm(false)}
        />
      )}

      <CasesTable cases={cases} onDeleteCase={handleDeleteCase} />
    </section>
  );
}

export default Dashboard;