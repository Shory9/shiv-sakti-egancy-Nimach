import { useState } from "react";
import { supabase } from "../supabaseClient";

export type NewCase = {
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  agent: string;
  loanType?: string;
  pendingAmount?: number;
  address?: string;
  remarks?: string;
};

type AddCaseFormProps = {
  onAddCase: (newCase: NewCase) => void;
  onCancel: () => void;
};

function AddCaseForm({ onAddCase, onCancel }: AddCaseFormProps) {
  const [form, setForm] = useState({
    customer: "",
    phone: "",
    bank: "",
    loanType: "",
    amount: "",
    pendingAmount: "",
    agent: "",
    address: "",
    remarks: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const newCase: NewCase = {
      customer: form.customer,
      phone: form.phone,
      bank: form.bank,
      loanType: form.loanType,
      amount: Number(form.amount),
      pendingAmount: Number(form.pendingAmount || form.amount),
      agent: form.agent || "Unassigned",
      address: form.address,
      remarks: form.remarks,
    };

    const { error } = await supabase.from("cases").insert({
      customer_name: newCase.customer,
      mobile: newCase.phone,
      bank_name: newCase.bank,
      loan_type: newCase.loanType,
      loan_amount: newCase.amount,
      pending_amount: newCase.pendingAmount,
      address: newCase.address,
      status: "Pending",
      remarks: newCase.remarks,
    });

    if (error) {
      alert("Supabase error: " + error.message);
      return;
    }

    onAddCase(newCase);

    setForm({
      customer: "",
      phone: "",
      bank: "",
      loanType: "",
      amount: "",
      pendingAmount: "",
      agent: "",
      address: "",
      remarks: "",
    });
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Add New Recovery Case</h2>

      <input
        placeholder="Customer Name"
        value={form.customer}
        onChange={(e) => setForm({ ...form, customer: e.target.value })}
        required
      />

      <input
        placeholder="Phone Number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        required
      />

      <input
        placeholder="Bank Name"
        value={form.bank}
        onChange={(e) => setForm({ ...form, bank: e.target.value })}
        required
      />

      <input
        placeholder="Loan Type"
        value={form.loanType}
        onChange={(e) => setForm({ ...form, loanType: e.target.value })}
      />

      <input
        type="number"
        placeholder="Loan Amount"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Pending Amount"
        value={form.pendingAmount}
        onChange={(e) => setForm({ ...form, pendingAmount: e.target.value })}
      />

      <input
        placeholder="Executive Name"
        value={form.agent}
        onChange={(e) => setForm({ ...form, agent: e.target.value })}
      />

      <input
        placeholder="Address"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />

      <input
        placeholder="Remarks"
        value={form.remarks}
        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
      />

      <div className="form-actions">
        <button className="primary-btn" type="submit">
          Save Case
        </button>

        <button
          className="secondary-btn"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddCaseForm;