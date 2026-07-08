import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import CaseActions from "./CaseActions";

export type CaseItem = {
  id: number;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  assigned_agent?: number | string | null;
  agent?: string;
  status: "Pending" | "Visited" | "Paid" | "Overdue";
};

type Executive = {
  id: number;
  name: string;
  agent_code?: string;
};

type CasesTableProps = {
  cases: CaseItem[];
  onDeleteCase: (id: number) => void;
};

function CasesTable({ cases, onDeleteCase }: CasesTableProps) {
  const [search, setSearch] = useState("");
  const [localCases, setLocalCases] = useState<CaseItem[]>(cases);
  const [executives, setExecutives] = useState<Executive[]>([]);

  useEffect(() => {
    setLocalCases(cases);
  }, [cases]);

  useEffect(() => {
    loadExecutives();
  }, []);

  async function loadExecutives() {
    const { data, error } = await supabase
      .from("agents")
      .select("id, name, agent_code")
      .eq("status", "Active")
      .order("id", { ascending: true });

    if (error) {
      alert("Executive list error: " + error.message);
      return;
    }

    setExecutives(data || []);
  }

  function getAgentName(item: CaseItem) {
    const assignedId = Number(item.assigned_agent);
    const matched = executives.find((e) => e.id === assignedId);

    if (matched) {
      return `${matched.agent_code || "SS" + String(matched.id).padStart(3, "0")} - ${matched.name}`;
    }

    return item.agent || "Unassigned";
  }

  const filteredCases = localCases.filter((item) =>
    `${item.id} ${item.customer} ${item.phone} ${item.bank} ${getAgentName(item)} ${item.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function assignExecutive(caseId: number) {
    if (executives.length === 0) {
      alert("Pehle Executive Management me executive add karo.");
      return;
    }

    const agentInput = prompt(
      "Agent Code / ID enter karo:\n" +
        executives
          .map(
            (e) =>
              `${e.agent_code || "SS" + String(e.id).padStart(3, "0")} / ${e.id} = ${e.name}`
          )
          .join("\n")
    );

    if (!agentInput) return;

    const value = agentInput.trim().toUpperCase();

    const matched = executives.find(
      (e) =>
        String(e.id) === value ||
        (e.agent_code || "SS" + String(e.id).padStart(3, "0")).toUpperCase() === value
    );

    if (!matched) {
      alert("Is Agent Code / ID ka executive nahi mila.");
      return;
    }

    const { error } = await supabase
      .from("cases")
      .update({
        assigned_agent: matched.id,
        remarks: `Assigned to ${matched.agent_code || "SS" + String(matched.id).padStart(3, "0")} - ${matched.name}`,
      })
      .eq("id", caseId);

    if (error) {
      alert("Assign error: " + error.message);
      return;
    }

    setLocalCases((items) =>
      items.map((item) =>
        item.id === caseId
          ? { ...item, assigned_agent: matched.id, agent: matched.name }
          : item
      )
    );

    alert(`Case ${caseId} assigned to ${matched.name}`);
  }

  async function updateStatus(caseId: number, status: CaseItem["status"]) {
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
                <td>{getAgentName(item)}</td>
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