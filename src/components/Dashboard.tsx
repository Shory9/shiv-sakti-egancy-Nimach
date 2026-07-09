import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import AddCaseForm, { type NewCase } from "./AddCaseForm";
import BankImport from "./BankImport";
import CasesTable, { type CaseItem } from "./CasesTable";
import ExecutiveApp from "./ExecutiveApp";
import ExecutiveManagement from "./ExecutiveManagement";
import GPSTracking from "./GPSTracking";
import Header from "./Header";
import PaymentManagement from "./PaymentManagement";
import Reports from "./Reports";
import Sidebar from "./Sidebar";
import StatsCards from "./StatsCards";

type SupabaseCase = {
  id: number;
  customer_name: string;
  mobile: string | null;
  bank_name: string | null;
  loan_amount: number | null;
  assigned_agent: number | string | null;
  status: "Pending" | "Visited" | "Paid" | "Overdue" | string | null;
};

function Dashboard() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [showForm, setShowForm] = useState(false);

  async function loadCases() {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("Cases load error: " + error.message);
      return;
    }

    const convertedCases: CaseItem[] = (data as SupabaseCase[]).map((item) => ({
      id: item.id,
      customer: item.customer_name,
      phone: item.mobile || "",
      bank: item.bank_name || "",
      amount: Number(item.loan_amount || 0),
      assigned_agent: item.assigned_agent || "",
      agent: "Unassigned",
      status:
        item.status === "Visited" ||
        item.status === "Paid" ||
        item.status === "Overdue"
          ? item.status
          : "Pending",
    }));

    setCases(convertedCases);
  }

  useEffect(() => {
    loadCases();
  }, []);

  function handleAddCase(_newCase: NewCase) {
    loadCases();
    setShowForm(false);
  }

  async function handleDeleteCase(id: number) {
    const { error } = await supabase.from("cases").delete().eq("id", id);

    if (error) {
      alert("Delete error: " + error.message);
      return;
    }

    setCases(cases.filter((item) => item.id !== id));
  }

  function renderContent() {
    if (activeMenu === "Bank Import") return <BankImport />;
    if (activeMenu === "Executives") return <ExecutiveManagement />;
    if (activeMenu === "Executive App") return <ExecutiveApp />;
    if (activeMenu === "GPS Tracking") return <GPSTracking />;
    if (activeMenu === "Payments") return <PaymentManagement />;
    if (activeMenu === "Reports") return <Reports />;

    if (activeMenu === "Cases") {
      return (
        <section className="dashboard">
          <Header
            title="Recovery Case Management"
            subtitle="Manage bank recovery cases, assignments and field visit status."
          />

          <div className="dashboard-actions">
            <button className="primary-btn" onClick={() => setShowForm(true)}>
              + Add Recovery Case
            </button>
          </div>

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

    return (
      <section className="dashboard">
        <Header
          title="Shiv Shakti Recovery CRM"
          subtitle="Professional recovery management system for cases, executives, GPS tracking and payments."
        />

        <StatsCards cases={cases} />

        <br />

        <CasesTable cases={cases} onDeleteCase={handleDeleteCase} />
      </section>
    );
  }

  return (
    <div className="app">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <main className="main">{renderContent()}</main>
    </div>
  );
}

export default Dashboard;