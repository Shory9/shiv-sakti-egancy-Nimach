import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import AddCaseForm, { type NewCase } from "./AddCaseForm";
import CasesTable, { type CaseItem } from "./CasesTable";
import Header from "./Header";
import StatsCards from "./StatsCards";

type SupabaseCase = {
  id: number;
  customer_name: string;
  mobile: string | null;
  bank_name: string | null;
  loan_amount: number | null;
  assigned_agent: string | null;
  status: "Pending" | "Visited" | "Paid" | "Overdue" | string | null;
};

function Dashboard() {
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
      agent: item.assigned_agent || "Unassigned",
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

      <StatsCards cases={cases} />

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