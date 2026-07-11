import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type PaymentStatus = "Pending" | "Partial" | "Paid";

type CaseRecord = {
  id: number;
  customer_name: string;
  mobile: string | null;
  bank_name: string | null;
  loan_amount: number | null;
  pending_amount: number | null;
  status: string | null;
};

type Payment = {
  id: number;
  case_id: number;
  customer_name: string;
  amount: number;
  payment_mode: string;
  payment_status: PaymentStatus;
  remarks: string | null;
  payment_date: string;
};

function PaymentManagement() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("Cash");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const casesResult = await supabase
      .from("cases")
      .select(
        "id, customer_name, mobile, bank_name, loan_amount, pending_amount, status"
      )
      .order("id", { ascending: false });

    if (casesResult.error) {
      alert("Cases load error: " + casesResult.error.message);
      return;
    }

    const paymentsResult = await supabase
      .from("payments")
      .select(
        "id, case_id, customer_name, amount, payment_mode, payment_status, remarks, payment_date"
      )
      .order("payment_date", { ascending: false });

    if (paymentsResult.error) {
      alert("Payments load error: " + paymentsResult.error.message);
      return;
    }

    setCases((casesResult.data || []) as CaseRecord[]);
    setPayments((paymentsResult.data || []) as Payment[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedCase = cases.find(
    (item) => item.id === Number(selectedCaseId)
  );

  function getPaidAmount(caseId: number) {
    return payments
      .filter(
        (payment) =>
          payment.case_id === caseId &&
          payment.payment_status !== "Pending"
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );
  }

  const selectedPaidAmount = selectedCase
    ? getPaidAmount(selectedCase.id)
    : 0;

  const selectedLoanAmount = Number(
    selectedCase?.loan_amount || 0
  );

  const selectedPendingAmount = Math.max(
    selectedLoanAmount - selectedPaidAmount,
    0
  );

  async function savePayment() {
    if (!selectedCase) {
      alert("Customer case select karo.");
      return;
    }

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      alert("Valid payment amount enter karo.");
      return;
    }

    if (paymentAmount > selectedPendingAmount) {
      alert(
        `Payment pending amount se zyada hai.\nPending: ₹${selectedPendingAmount.toLocaleString(
          "en-IN"
        )}`
      );
      return;
    }

    const newTotalPaid =
      selectedPaidAmount + paymentAmount;

    const newPending = Math.max(
      selectedLoanAmount - newTotalPaid,
      0
    );

    const paymentStatus: PaymentStatus =
      newPending === 0 ? "Paid" : "Partial";

    setSaving(true);

    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        case_id: selectedCase.id,
        customer_name: selectedCase.customer_name,
        amount: paymentAmount,
        payment_mode: mode,
        payment_status: paymentStatus,
        remarks: remarks.trim(),
      });

    if (paymentError) {
      setSaving(false);
      alert("Payment save error: " + paymentError.message);
      return;
    }

    const { error: caseError } = await supabase
      .from("cases")
      .update({
        pending_amount: newPending,
        status: newPending === 0 ? "Paid" : "Visited",
      })
      .eq("id", selectedCase.id);

    setSaving(false);

    if (caseError) {
      alert("Case update error: " + caseError.message);
      return;
    }

    setSelectedCaseId("");
    setAmount("");
    setMode("Cash");
    setRemarks("");

    await loadData();

    alert(
      `Payment saved successfully.\nPaid: ₹${paymentAmount.toLocaleString(
        "en-IN"
      )}\nRemaining: ₹${newPending.toLocaleString(
        "en-IN"
      )}`
    );
  }

  async function deletePayment(payment: Payment) {
    const ok = window.confirm(
      `${payment.customer_name} ka ₹${Number(
        payment.amount
      ).toLocaleString(
        "en-IN"
      )} payment delete karna hai?`
    );

    if (!ok) return;

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", payment.id);

    if (error) {
      alert("Payment delete error: " + error.message);
      return;
    }

    const remainingPayments = payments.filter(
      (item) =>
        item.id !== payment.id &&
        item.case_id === payment.case_id &&
        item.payment_status !== "Pending"
    );

    const newPaidTotal = remainingPayments.reduce(
      (total, item) =>
        total + Number(item.amount || 0),
      0
    );

    const relatedCase = cases.find(
      (item) => item.id === payment.case_id
    );

    const loanAmount = Number(
      relatedCase?.loan_amount || 0
    );

    const newPending = Math.max(
      loanAmount - newPaidTotal,
      0
    );

    const nextStatus =
      newPaidTotal === 0
        ? "Pending"
        : newPending === 0
        ? "Paid"
        : "Visited";

    const { error: caseUpdateError } = await supabase
      .from("cases")
      .update({
        pending_amount: newPending,
        status: nextStatus,
      })
      .eq("id", payment.case_id);

    if (caseUpdateError) {
      alert(
        "Case payment update error: " +
          caseUpdateError.message
      );
      return;
    }

    await loadData();
  }

  const totalCollection = useMemo(() => {
    return payments
      .filter(
        (payment) =>
          payment.payment_status !== "Pending"
      )
      .reduce(
        (total, payment) =>
          total + Number(payment.amount || 0),
        0
      );
  }, [payments]);

  return (
    <div className="module-card">
      <h2>💰 Payment Management</h2>

      <p>
        Customer recovery payment save karo aur paid/pending
        amount track karo.
      </p>

      <hr />

      <h3>Select Customer Case</h3>

      <select
        value={selectedCaseId}
        onChange={(event) =>
          setSelectedCaseId(event.target.value)
        }
      >
        <option value="">Select Customer</option>

        {cases.map((item) => (
          <option key={item.id} value={item.id}>
            Case #{item.id} - {item.customer_name} -{" "}
            {item.mobile || "No Phone"}
          </option>
        ))}
      </select>

      {selectedCase && (
        <div className="card">
          <p>
            <strong>Customer:</strong>{" "}
            {selectedCase.customer_name}
          </p>

          <p>
            <strong>Bank:</strong>{" "}
            {selectedCase.bank_name || "-"}
          </p>

          <p>
            <strong>Loan Amount:</strong> ₹
            {selectedLoanAmount.toLocaleString("en-IN")}
          </p>

          <p>
            <strong>Already Paid:</strong> ₹
            {selectedPaidAmount.toLocaleString("en-IN")}
          </p>

          <p>
            <strong>Pending Amount:</strong> ₹
            {selectedPendingAmount.toLocaleString("en-IN")}
          </p>
        </div>
      )}

      <input
        type="number"
        placeholder="Payment Amount"
        value={amount}
        onChange={(event) =>
          setAmount(event.target.value)
        }
      />

      <br />
      <br />

      <select
        value={mode}
        onChange={(event) =>
          setMode(event.target.value)
        }
      >
        <option>Cash</option>
        <option>UPI</option>
        <option>Cheque</option>
        <option>Bank Transfer</option>
      </select>

      <br />
      <br />

      <input
        placeholder="Payment Remarks"
        value={remarks}
        onChange={(event) =>
          setRemarks(event.target.value)
        }
      />

      <br />
      <br />

      <button
        className="primary-btn"
        onClick={savePayment}
        disabled={saving}
      >
        {saving
          ? "Saving Payment..."
          : "+ Save Customer Payment"}
      </button>

      <hr />

      <h3>
        Total Collection: ₹
        {totalCollection.toLocaleString("en-IN")}
      </h3>

      <table>
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Case ID</th>
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
              <td>PAY-{item.id}</td>
              <td>{item.case_id}</td>
              <td>{item.customer_name}</td>

              <td>
                ₹
                {Number(item.amount).toLocaleString(
                  "en-IN"
                )}
              </td>

              <td>{item.payment_mode}</td>
              <td>{item.payment_status}</td>

              <td>
                {new Date(
                  item.payment_date
                ).toLocaleString("en-IN")}
              </td>

              <td>{item.remarks || "-"}</td>

              <td>
                <button
                  onClick={() =>
                    deletePayment(item)
                  }
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {payments.length === 0 && (
            <tr>
              <td colSpan={9}>
                No payment records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default PaymentManagement;