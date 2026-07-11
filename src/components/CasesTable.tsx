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

type PaymentRecord = {
  case_id: number;
  amount: number;
};

type CasesTableProps = {
  cases: CaseItem[];
  onDeleteCase: (id: number) => void;
};

function CasesTable({ cases, onDeleteCase }: CasesTableProps) {
  const [search, setSearch] = useState("");
  const [localCases, setLocalCases] = useState<CaseItem[]>(cases);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [selectedAgents, setSelectedAgents] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    setLocalCases(cases);
  }, [cases]);

  useEffect(() => {
    loadExecutives();
    loadPayments();
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

    setExecutives((data || []) as Executive[]);
  }

  async function loadPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select("case_id, amount");

    if (error) {
      alert("Payment load error: " + error.message);
      return;
    }

    setPayments((data || []) as PaymentRecord[]);
  }

  function formatAgent(agent: Executive) {
    const code =
      agent.agent_code ||
      "SS" + String(agent.id).padStart(3, "0");

    return `${code} - ${agent.name}`;
  }

  function getAgentName(item: CaseItem) {
    const assignedId = Number(item.assigned_agent);

    const matched = executives.find(
      (executive) => executive.id === assignedId
    );

    if (matched) {
      return formatAgent(matched);
    }

    return item.agent || "Unassigned";
  }

  function getPaidAmount(caseId: number) {
    return payments
      .filter((payment) => payment.case_id === caseId)
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );
  }

  const filteredCases = useMemo(() => {
    return localCases.filter((item) => {
      const paidAmount = getPaidAmount(item.id);
      const pendingAmount = Math.max(
        Number(item.amount || 0) - paidAmount,
        0
      );

      return `${item.id} ${item.customer} ${item.phone} ${
        item.bank
      } ${getAgentName(item)} ${
        item.status
      } ${paidAmount} ${pendingAmount}`
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [localCases, search, executives, payments]);

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

    alert(
      `Case ${caseId} assigned to ${formatAgent(matched)}`
    );
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
      <h2>Recovery Cases & Payments</h2>

      <input
        placeholder="Search case, customer, phone, bank, executive..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
              <th>Loan Amount</th>
              <th>Paid Amount</th>
              <th>Pending Amount</th>
              <th>Assigned Executive</th>
              <th>Assign / Reassign</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredCases.map((item) => {
              const paidAmount = getPaidAmount(item.id);

              const pendingAmount = Math.max(
                Number(item.amount || 0) - paidAmount,
                0
              );

              return (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.customer}</td>
                  <td>{item.phone}</td>
                  <td>{item.bank}</td>

                  <td>
                    ₹{Number(item.amount).toLocaleString("en-IN")}
                  </td>

                  <td>
                    ₹{paidAmount.toLocaleString("en-IN")}
                  </td>

                  <td>
                    ₹{pendingAmount.toLocaleString("en-IN")}
                  </td>

                  <td>{getAgentName(item)}</td>

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
                      onAssign={() =>
                        assignExecutive(item.id)
                      }
                      onVisit={() =>
                        updateStatus(item.id, "Visited")
                      }
                      onPayment={() =>
                        updateStatus(item.id, "Paid")
                      }
                      onEdit={() =>
                        updateStatus(item.id, "Overdue")
                      }
                      onDelete={() =>
                        onDeleteCase(item.id)
                      }
                    />
                  </td>
                </tr>
              );
            })}

            {filteredCases.length === 0 && (
              <tr>
                <td colSpan={11}>
                  No recovery cases found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CasesTable;