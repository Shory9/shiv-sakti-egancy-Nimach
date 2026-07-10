import { useEffect, useMemo, useState } from "react";
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
  agent_code?: string | null;
};

type CasesTableProps = {
  cases: CaseItem[];
  onDeleteCase: (id: number) => void;
};

function CasesTable({ cases, onDeleteCase }: CasesTableProps) {
  const [search, setSearch] = useState("");
  const [localCases, setLocalCases] = useState<CaseItem[]>(cases);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<
    Record<number, string>
  >({});

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
      .order("id", { ascending: true });

    if (error) {
      alert("Executive list error: " + error.message);
      return;
    }

    setExecutives((data || []) as Executive[]);
  }

  function formatAgent(agent: Executive) {
    const code =
      agent.agent_code || "SS" + String(agent.id).padStart(3, "0");

    return `${code} - ${agent.name}`;
  }

  function getAgent(item: CaseItem) {
    const assignedId = Number(item.assigned_agent);

    return executives.find((executive) => executive.id === assignedId);
  }

  function getAgentName(item: CaseItem) {
    const matched = getAgent(item);

    if (matched) return formatAgent(matched);

    return item.agent || "Unassigned Cases";
  }

  const filteredCases = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return localCases;

    return localCases.filter((item) =>
      `${item.id} ${item.customer} ${item.phone} ${item.bank} ${getAgentName(
        item
      )} ${item.status}`
        .toLowerCase()
        .includes(value)
    );
  }, [localCases, search, executives]);

  const groupedCases = useMemo(() => {
    const groups = new Map<
      string,
      {
        executiveId: number | null;
        executiveName: string;
        items: CaseItem[];
      }
    >();

    filteredCases.forEach((item) => {
      const executive = getAgent(item);

      const key = executive ? String(executive.id) : "unassigned";

      if (!groups.has(key)) {
        groups.set(key, {
          executiveId: executive?.id || null,
          executiveName: executive
            ? formatAgent(executive)
            : "Unassigned Cases",
          items: [],
        });
      }

      groups.get(key)?.items.push(item);
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.executiveId === null) return 1;
      if (b.executiveId === null) return -1;

      return a.executiveName.localeCompare(b.executiveName);
    });
  }, [filteredCases, executives]);

  async function assignExecutive(caseId: number) {
    const selectedId = selectedAgents[caseId];

    if (!selectedId) {
      alert("Pehle dropdown se executive select karo.");
      return;
    }

    const executiveId = Number(selectedId);

    const matched = executives.find(
      (executive) => executive.id === executiveId
    );

    if (!matched) {
      alert("Selected executive nahi mila.");
      return;
    }

    const { error } = await supabase
      .from("cases")
      .update({
        assigned_agent: matched.id,
        remarks: `Assigned to ${formatAgent(matched)}`,
      })
      .eq("id", caseId);

    if (error) {
      alert("Assign error: " + error.message);
      return;
    }

    setLocalCases((oldCases) =>
      oldCases.map((item) =>
        item.id === caseId
          ? {
              ...item,
              assigned_agent: matched.id,
              agent: matched.name,
            }
          : item
      )
    );

    setSelectedAgents((old) => ({
      ...old,
      [caseId]: "",
    }));

    alert(`Case ${caseId} assigned to ${formatAgent(matched)}`);
  }

  async function updateStatus(
    caseId: number,
    status: CaseItem["status"]
  ) {
    const { error } = await supabase
      .from("cases")
      .update({ status })
      .eq("id", caseId);

    if (error) {
      alert("Status update error: " + error.message);
      return;
    }

    setLocalCases((oldCases) =>
      oldCases.map((item) =>
        item.id === caseId ? { ...item, status } : item
      )
    );
  }

  return (
    <div className="cases-panel">
      <h2>Executive-wise Recovery Cases</h2>

      <p>
        Har executive ke assigned cases uske naam ke neeche dikh rahe hain.
      </p>

      <input
        placeholder="Search case, customer, phone, bank or executive..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <br />
      <br />

      {groupedCases.length === 0 && (
        <div className="module-card">
          <h3>No Recovery Cases Found</h3>
        </div>
      )}

      {groupedCases.map((group) => (
        <div
          className="module-card"
          key={group.executiveId ?? "unassigned"}
          style={{ marginBottom: "24px" }}
        >
          <h2>
            👨‍💼 {group.executiveName}
            {" — "}
            {group.items.length} Cases
          </h2>

          <div className="table-box">
            <table>
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Bank / Branch</th>
                  <th>Amount</th>
                  <th>Assign / Reassign</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {group.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.customer}</td>
                    <td>{item.phone}</td>
                    <td>{item.bank}</td>
                    <td>
                      ₹{item.amount.toLocaleString("en-IN")}
                    </td>

                    <td>
                      <select
                        value={selectedAgents[item.id] || ""}
                        onChange={(event) =>
                          setSelectedAgents((old) => ({
                            ...old,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Select Executive</option>

                        {executives.map((executive) => (
                          <option
                            key={executive.id}
                            value={executive.id}
                          >
                            {formatAgent(executive)}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td>
                      <span
                        className={`status ${item.status.toLowerCase()}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td>
                      <CaseActions
                        onAssign={() => assignExecutive(item.id)}
                        onVisit={() =>
                          updateStatus(item.id, "Visited")
                        }
                        onPayment={() =>
                          updateStatus(item.id, "Paid")
                        }
                        onEdit={() =>
                          updateStatus(item.id, "Overdue")
                        }
                        onDelete={() => onDeleteCase(item.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default CasesTable;