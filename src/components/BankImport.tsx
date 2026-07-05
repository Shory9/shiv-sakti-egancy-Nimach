import { type ChangeEvent, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type ImportStatus =
  | "idle"
  | "selected"
  | "processing"
  | "ready"
  | "importing"
  | "imported";

type ImportedCase = {
  customer: string;
  phone: string;
  bank: string;
  loanType: string;
  amount: number;
  pendingAmount: number;
  area: string;
  remarks: string;
};

function BankImport() {
  const [bankName, setBankName] = useState("HDFC Bank");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [cases, setCases] = useState<ImportedCase[]>([]);

  function findValue(row: Record<string, unknown>, keys: string[]) {
    const rowKeys = Object.keys(row);

    for (const key of keys) {
      const foundKey = rowKeys.find((item) =>
        item.toLowerCase().replace(/\s/g, "").includes(key.toLowerCase())
      );

      if (foundKey) return String(row[foundKey] || "");
    }

    return "";
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("selected");
    setCases([]);

    const reader = new FileReader();

    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const parsedCases: ImportedCase[] = rows
        .map((row) => {
          const customer =
            findValue(row, ["customer", "name", "borrower", "party"]) || "";

          const phone =
            findValue(row, ["mobile", "phone", "contact"]) || "";

          const amountText =
            findValue(row, ["loanamount", "amount", "outstanding", "balance"]) ||
            "0";

          const pendingText =
            findValue(row, ["pending", "due", "overdue", "outstanding"]) ||
            amountText;

          return {
            customer,
            phone,
            bank: bankName,
            loanType: findValue(row, ["loantype", "product", "type"]) || "Recovery",
            amount: Number(String(amountText).replace(/[^0-9.]/g, "")) || 0,
            pendingAmount:
              Number(String(pendingText).replace(/[^0-9.]/g, "")) || 0,
            area:
              findValue(row, ["area", "city", "location", "address"]) || "",
            remarks: `Imported from Excel: ${file.name}`,
          };
        })
        .filter((item) => item.customer || item.phone || item.amount > 0);

      setCases(parsedCases);
      setStatus("ready");
    };

    reader.readAsArrayBuffer(file);
  }

  async function importCases() {
    if (cases.length === 0) {
      alert("Import ke liye cases nahi mile.");
      return;
    }

    setStatus("importing");

    const rows = cases.map((item) => ({
      customer_name: item.customer || "Unknown Customer",
      mobile: item.phone,
      bank_name: item.bank,
      loan_type: item.loanType,
      loan_amount: item.amount,
      pending_amount: item.pendingAmount || item.amount,
      address: item.area,
      status: "Pending",
      remarks: item.remarks,
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
      <h1>📄 Bank Excel / PDF Import</h1>
      <p>Bank file upload karo, cases preview dekho, phir CRM database me import karo.</p>

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

      <h3>Select Bank Excel File</h3>
      <input type="file" accept=".xlsx,.xls" onChange={handleFile} />

      {status !== "idle" && (
        <div className="card">
          <h3>Selected File</h3>
          <p><strong>Bank:</strong> {bankName}</p>
          <p><strong>File:</strong> {fileName}</p>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Rows Found:</strong> {cases.length}</p>
        </div>
      )}

      {status === "ready" && (
        <div className="card">
          <h3>Generated Cases Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Bank</th>
                <th>Loan Type</th>
                <th>Loan Amount</th>
                <th>Pending</th>
                <th>Area</th>
              </tr>
            </thead>

            <tbody>
              {cases.map((item, index) => (
                <tr key={index}>
                  <td>{item.customer}</td>
                  <td>{item.phone}</td>
                  <td>{item.bank}</td>
                  <td>{item.loanType}</td>
                  <td>₹{item.amount.toLocaleString("en-IN")}</td>
                  <td>₹{item.pendingAmount.toLocaleString("en-IN")}</td>
                  <td>{item.area}</td>
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