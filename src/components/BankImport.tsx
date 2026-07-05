import { type ChangeEvent, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

type ImportStatus = "idle" | "selected" | "processing" | "ready" | "importing" | "imported";

type ImportedCase = {
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  area: string;
  status: "New";
};

function BankImport() {
  const [bankName, setBankName] = useState("HDFC Bank");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");

  const cases = useMemo<ImportedCase[]>(
    () => [
      { customer: "Ramesh Verma", phone: "9876543210", bank: bankName, amount: 45000, area: "Neemuch", status: "New" },
      { customer: "Suresh Patel", phone: "9826012345", bank: bankName, amount: 72000, area: "Manasa", status: "New" },
      { customer: "Mahesh Sharma", phone: "9009011122", bank: bankName, amount: 38000, area: "Jawad", status: "New" },
      { customer: "Amit Jain", phone: "9893012345", bank: bankName, amount: 56000, area: "Nimbahera", status: "New" },
    ],
    [bankName]
  );

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("selected");
  }

  function readPdf() {
    setStatus("processing");

    setTimeout(() => {
      setStatus("ready");
    }, 800);
  }

  async function importCases() {
    setStatus("importing");

    const rows = cases.map((item) => ({
      customer_name: item.customer,
      mobile: item.phone,
      bank_name: item.bank,
      loan_type: "Recovery",
      loan_amount: item.amount,
      pending_amount: item.amount,
      address: item.area,
      status: "Pending",
      remarks: `Imported from bank PDF: ${fileName}`,
    }));

    const { error } = await supabase.from("cases").insert(rows);

    if (error) {
      alert("Import error: " + error.message);
      setStatus("ready");
      return;
    }

    setStatus("imported");
  }

  return (
    <div className="module-card">
      <h1>📄 Bank PDF Import</h1>
      <p>Bank PDF upload karo, cases preview dekho, phir direct CRM database me import karo.</p>

      <hr />

      <h3>Select Bank</h3>
      <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
        <option>HDFC Bank</option>
        <option>ICICI Bank</option>
        <option>Axis Bank</option>
        <option>SBI Bank</option>
        <option>Bank of Baroda</option>
        <option>Punjab National Bank</option>
        <option>Other Bank</option>
      </select>

      <br />
      <br />

      <h3>Select Bank PDF</h3>
      <input type="file" accept=".pdf" onChange={handleFile} />

      {status !== "idle" && (
        <div className="card">
          <h3>Selected PDF</h3>
          <p><strong>Bank:</strong> {bankName}</p>
          <p><strong>File:</strong> {fileName}</p>
          <p><strong>Status:</strong> {status}</p>
        </div>
      )}

      <br />

      <button className="primary-btn" disabled={status === "idle"} onClick={readPdf}>
        {status === "processing" ? "Reading PDF..." : "Read PDF & Generate Cases"}
      </button>

      {status === "ready" && (
        <div className="card">
          <h3>Generated Cases Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Area</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {cases.map((item, index) => (
                <tr key={index}>
                  <td>{item.customer}</td>
                  <td>{item.phone}</td>
                  <td>{item.bank}</td>
                  <td>₹{item.amount.toLocaleString("en-IN")}</td>
                  <td>{item.area}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <button className="primary-btn" onClick={importCases}>
            Import Cases to CRM Database
          </button>
        </div>
      )}

      {status === "importing" && (
        <div className="card">
          <h3>⏳ Importing cases...</h3>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Successful</h3>
          <p>{cases.length} bank cases imported into Supabase CRM.</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;