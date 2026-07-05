import { useEffect, useMemo, useState } from "react";

type PaymentStatus = "Pending" | "Partial" | "Paid";

type Payment = {
  id: string;
  customer: string;
  amount: number;
  mode: string;
  status: PaymentStatus;
  remarks: string;
  date: string;
};

const defaultPayments: Payment[] = [
  {
    id: "PAY-001",
    customer: "Ramesh Verma",
    amount: 12000,
    mode: "Cash",
    status: "Paid",
    remarks: "First Installment",
    date: "05 Jul 2026",
  },
  {
    id: "PAY-002",
    customer: "Suresh Patel",
    amount: 18000,
    mode: "UPI",
    status: "Partial",
    remarks: "Half Payment",
    date: "05 Jul 2026",
  },
  {
    id: "PAY-003",
    customer: "Mahesh Sharma",
    amount: 28000,
    mode: "Bank Transfer",
    status: "Pending",
    remarks: "",
    date: "04 Jul 2026",
  },
];

function PaymentManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [status, setStatus] = useState<PaymentStatus>("Paid");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("payments");

    if (saved) {
      setPayments(JSON.parse(saved));
    } else {
      setPayments(defaultPayments);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("payments", JSON.stringify(payments));
  }, [payments]);

  function addPayment() {
    if (!customer || !amount) return;

    const payment: Payment = {
      id: `PAY-${Date.now()}`,
      customer,
      amount: Number(amount),
      mode,
      status,
      remarks,
      date: new Date().toLocaleDateString("en-GB"),
    };

    setPayments([payment, ...payments]);

    setCustomer("");
    setAmount("");
    setMode("Cash");
    setStatus("Paid");
    setRemarks("");
  }

  function deletePayment(id: string) {
    setPayments(payments.filter((item) => item.id !== id));
  }

  const totalCollection = useMemo(() => {
    return payments
      .filter((p) => p.status !== "Pending")
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  return (
    <div className="module-card">
      <h2>💰 Payment Management</h2>

      <p>Recovery payment entries and collection summary.</p>

      <hr />

      <input
        placeholder="Customer Name"
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
      />

      <br />
      <br />

      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <br />
      <br />

      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option>Cash</option>
        <option>UPI</option>
        <option>Cheque</option>
        <option>Bank Transfer</option>
      </select>

      <br />
      <br />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as PaymentStatus)}
      >
        <option>Paid</option>
        <option>Partial</option>
        <option>Pending</option>
      </select>

      <br />
      <br />

      <input
        placeholder="Remarks"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />

      <br />
      <br />

      <button className="primary-btn" onClick={addPayment}>
        + Save Payment
      </button>

      <hr />

      <h3>
        Total Collection : ₹{totalCollection.toLocaleString("en-IN")}
      </h3>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Date</th>
            <th>Remarks</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {payments.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.customer}</td>
              <td>₹{item.amount.toLocaleString("en-IN")}</td>
              <td>{item.mode}</td>
              <td>{item.status}</td>
              <td>{item.date}</td>
              <td>{item.remarks}</td>
              <td>
                <button onClick={() => deletePayment(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentManagement;