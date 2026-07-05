import { useState } from "react";
import CaseActions from "./CaseActions";

export type CaseItem = {
  id: string;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  agent: string;
  status: "Pending" | "Visited" | "Paid" | "Overdue";
};

type CasesTableProps = {
  cases: CaseItem[];
  onDeleteCase: (id: string) => void;
};

function CasesTable({ cases, onDeleteCase }: CasesTableProps) {
  const [search, setSearch] = useState("");

  const filteredCases = cases.filter((item) =>
    `${item.id} ${item.customer} ${item.phone} ${item.bank} ${item.agent} ${item.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function showMessage(action: string, caseId: string) {
    alert(`${action} feature ready for case ${caseId}`);
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
                <td>{item.agent}</td>
                <td>
                  <span className={`status ${item.status.toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  <CaseActions
                    onAssign={() => showMessage("Assign Executive", item.id)}
                    onVisit={() => showMessage("Visit Proof", item.id)}
                    onPayment={() => showMessage("Payment Entry", item.id)}
                    onEdit={() => showMessage("Edit Case", item.id)}
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