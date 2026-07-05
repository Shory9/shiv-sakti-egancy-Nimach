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
  return (
    <div className="cases-panel">
      <h2>Recovery Cases</h2>

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
            {cases.map((item) => (
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
                  <button
                    className="delete-btn"
                    onClick={() => onDeleteCase(item.id)}
                  >
                    Delete
                  </button>
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