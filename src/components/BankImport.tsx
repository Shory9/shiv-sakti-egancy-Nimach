import { type ChangeEvent, useMemo, useState } from "react";

type ImportStatus = "idle" | "selected" | "processing" | "ready" | "imported";

type ImportedCase = {
  id: string;
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
      { id: "IMP-001", customer: "Ramesh Verma", phone: "9876543210", bank: bankName, amount: 45000, area: "Neemuch", status: "New" },
      { id: "IMP-002", customer: "Suresh Patel", phone: "9826012345", bank: bankName, amount: 72000, area: "Manasa", status: "New" },
      { id: "IMP-003", customer: "Mahesh Sharma", phone: "9009011122", bank: bankName, amount: 38000, area: "Jawad", status: "New" },
      { id: "IMP-004", customer: "Amit Jain", phone: "9893012345", bank: bankName, amount: 56000, area: "Nimbahera", status: "New" },
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

  function importCases() {
    localStorage.setItem("bankImportedCases", JSON.stringify(cases));
    setStatus("imported");
  }

  return (
    <div className="module-card">
      <h1>📄 Bank PDF Import</h1>
      <p>Bank se aayi PDF upload karo, cases preview dekho, phir CRM me import karo.</p>

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
                <th>Case ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bank</th>
                <th>Amount</th>
                <th>Area</th>
                <th>Status</th>
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
                  <td>{item.area}</td>
                  <td>{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <button className="primary-btn" onClick={importCases}>
            Import Cases to CRM
          </button>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Successful</h3>
          <p>{cases.length} bank cases imported successfully.</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;