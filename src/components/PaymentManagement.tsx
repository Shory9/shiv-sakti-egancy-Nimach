const payments = [
  { id: "PAY-001", customer: "Ramesh Verma", amount: 12000, mode: "Cash", date: "05 Jul 2026" },
  { id: "PAY-002", customer: "Suresh Patel", amount: 18000, mode: "UPI", date: "05 Jul 2026" },
  { id: "PAY-003", customer: "Mahesh Sharma", amount: 28000, mode: "Bank Transfer", date: "04 Jul 2026" },
];

function PaymentManagement() {
  return (
    <div className="module-card">
      <h2>Payment Management</h2>
      <p>Recovery payment entries and collection summary.</p>

      <table>
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Mode</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {payments.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.customer}</td>
              <td>₹{item.amount.toLocaleString("en-IN")}</td>
              <td>{item.mode}</td>
              <td>{item.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentManagement;