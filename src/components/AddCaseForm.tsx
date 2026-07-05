import { useState } from "react";

export type NewCase = {
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  agent: string;
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
    amount: "",
    agent: "",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onAddCase({
      customer: form.customer,
      phone: form.phone,
      bank: form.bank,
      amount: Number(form.amount),
      agent: form.agent,
    });

    setForm({
      customer: "",
      phone: "",
      bank: "",
      amount: "",
      agent: "",
    });
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h2>Add New Recovery Case</h2>

      <input
        type="text"
        placeholder="Customer Name"
        value={form.customer}
        onChange={(e) => setForm({ ...form, customer: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Phone Number"
        value={form.phone}
        onChange={(e) => setForm({ ...form, phone: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Bank Name"
        value={form.bank}
        onChange={(e) => setForm({ ...form, bank: e.target.value })}
        required
      />

      <input
        type="number"
        placeholder="Amount"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Executive Name"
        value={form.agent}
        onChange={(e) => setForm({ ...form, agent: e.target.value })}
        required
      />

      <div className="form-actions">
        <button className="primary-btn" type="submit">
          Save Case
        </button>

        <button className="secondary-btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export default AddCaseForm;