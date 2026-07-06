import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CaseActions from "./CaseActions";

export type CaseItem = {
  id: string;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  assigned_agent?: string;
  agent?: string;
  status: "Pending" | "Visited" | "Paid" | "Overdue";
};

type Executive = {
  id: number;
  name: string;
};

type CasesTableProps = {
  cases: CaseItem[];
  onDeleteCase: (id: string) => void;
};

function CasesTable({ cases, onDeleteCase }: CasesTableProps) {
  const [search, setSearch] = useState("");
  const [localCases, setLocalCases] = useState<CaseItem[]>(cases);
  const [executives, setExecutives] = useState<Executive[]>([]);

  useEffect(() => setLocalCases(cases), [cases]);
  useEffect(() => { loadExecutives(); }, []);

  async function loadExecutives() {
    const { data, error } = await supabase
      .from("agents")
      .select("id, name")
      .eq("status", "Active")
      .order("name", { ascending: true });

    if (error) {
      alert("Executive list error: " + error.message);
      return;
    }

    setExecutives(data || []);
  }

  const filteredCases = localCases.filter((item) =>
    `${item.id} ${item.customer} ${item.phone} ${item.bank} ${item.assigned_agent || item.agent || ""} ${item.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function assignExecutive(caseId: string) {
    if (executives.length === 0) {
      alert("Pehle Executive Management me executive add karo.");
      return;
    }

    const executiveName = prompt(
      "Executive assign karo:\n" + executives.map((e) => e.name).join(", ")
    );

    if (!executiveName) return;

    const matched = executives.find(
      (e) => e.name.toLowerCase() === executiveName.trim().toLowerCase()
    );

    if (!matched) {
      alert("Executive list me ye naam nahi mila.");
      return;
    }

    const { error } = await supabase
      .from("cases")
      .update({
        assigned_agent: matched.name,
        remarks: `Assigned to ${matched.name}`,
      })
      .eq("id", caseId);

    if (error) {
      alert("Assign error: " + error.message);
      return;
    }

    setLocalCases((items) =>
      items.map((item) =>
        item.id === caseId ? { ...item, assigned_agent: matched.name } : item
      )
    );

    alert(`Case ${caseId} assigned to ${matched.name}`);
  }

  async function updateStatus(caseId: string, status: CaseItem["status"]) {
    const { error } = await supabase
      .from("cases")
      .update({ status })
      .eq("id", caseId);

    if (error) {
      alert("Status error: " + error.message);
      return;
    }

    setLocalCases((items) =>
      items.map((item) => (item.id === caseId ? { ...item, status } : item))
    );
  }

  return (
    <div className="cases-panel">
      <h2>Recovery Cases</h2>

      <input
        placeholder="Search case, customer, phone, bank, agent..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <br />
      <br />

      <div className="table-box">
        <table>
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Bank</th>
              <th>Amount</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredCases.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.customer}</td>
                <td>{item.phone}</td>
                <td>{item.bank}</td>
                <td>₹{item.amount.toLocaleString("en-IN")}</td>
                <td>{item.assigned_agent || item.agent || "Unassigned"}</td>
                <td>
                  <span className={`status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <CaseActions
                    onAssign={() => assignExecutive(item.id)}
                    onVisit={() => updateStatus(item.id, "Visited")}
                    onPayment={() => updateStatus(item.id, "Paid")}
                    onEdit={() => updateStatus(item.id, "Overdue")}
                    onDelete={() => onDeleteCase(item.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CasesTable;