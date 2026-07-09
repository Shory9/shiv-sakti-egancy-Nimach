import { type ChangeEvent, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type ImportStatus = "idle" | "ready" | "importing" | "imported";

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
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [cases, setCases] = useState<ImportedCase[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

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

  function makeKey(customer: string, phone: string, bank: string) {
    return `${customer.trim().toLowerCase()}-${phone.trim()}-${bank.trim().toLowerCase()}`;
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("idle");
    setCases([]);
    setImportedCount(0);
    setSkippedCount(0);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const parsedCases: ImportedCase[] = rows
          .map((row) => {
            const customer =
              findValue(row, ["customer", "name", "borrower", "party"]) || "";

            const phone = findValue(row, ["mobile", "phone", "contact"]) || "";

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
              loanType:
                findValue(row, ["loantype", "product", "type"]) || "Recovery",
              amount: Number(String(amountText).replace(/[^0-9.]/g, "")) || 0,
              pendingAmount:
                Number(String(pendingText).replace(/[^0-9.]/g, "")) || 0,
              area:
                findValue(row, ["area", "city", "location", "address"]) || "",
              remarks: `Imported from ${bankName} Excel: ${file.name}`,
            };
          })
          .filter((item) => item.customer || item.phone || item.amount > 0);

        const uniqueMap = new Map<string, ImportedCase>();

        parsedCases.forEach((item) => {
          const key = makeKey(item.customer, item.phone, item.bank);
          if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });

        setCases(Array.from(uniqueMap.values()));
        setStatus("ready");

        if (parsedCases.length === 0) {
          alert("Excel file read hui, lekin valid cases nahi mile.");
        }
      } catch {
        alert("Excel read error. File format check karo.");
        setStatus("idle");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  async function importCases() {
    if (cases.length === 0) {
      alert("Import ke liye cases nahi mile.");
      return;
    }

    const ok = window.confirm(
      `Real client data import kar rahe ho.\n\nTotal parsed cases: ${cases.length}\nDuplicate existing cases skip honge.\n\nImport continue karein?`
    );

    if (!ok) return;

    setStatus("importing");
    setImportedCount(0);
    setSkippedCount(0);

    const { data: existingData, error: existingError } = await supabase
      .from("cases")
      .select("customer_name, mobile, bank_name");

    if (existingError) {
      alert("Existing cases check error: " + existingError.message);
      setStatus("ready");
      return;
    }

    const existingKeys = new Set(
      (existingData || []).map((item: any) =>
        makeKey(item.customer_name || "", item.mobile || "", item.bank_name || "")
      )
    );

    const newCases = cases.filter(
      (item) => !existingKeys.has(makeKey(item.customer, item.phone, item.bank))
    );

    const skipped = cases.length - newCases.length;
    setSkippedCount(skipped);

    if (newCases.length === 0) {
      alert("Sab cases pehle se database me hain. New import nahi hua.");
      setStatus("imported");
      return;
    }

    const rows = newCases.map((item) => ({
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

    const chunkSize = 500;
    let totalImported = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase.from("cases").insert(chunk);

      if (error) {
        alert("Import error: " + error.message);
        setStatus("ready");
        return;
      }

      totalImported += chunk.length;
      setImportedCount(totalImported);
    }

    setImportedCount(totalImported);
    setStatus("imported");

    alert(
      `Import complete.\nImported: ${totalImported}\nSkipped duplicates: ${skipped}`
    );
  }

  return (
    <div className="module-card">
      <h1>📄 Bank Excel Import</h1>
      <p>
        Real bank Excel file safe import karo. Duplicate customer + phone + bank
        records automatically skip honge.
      </p>

      <hr />

      <h3>Select Bank</h3>
      <select value={bankName} onChange={(e) => setBankName(e.target.value)}>
        <option>State Bank of India (SBI)</option>
        <option>Bank of Baroda (BOB)</option>
      </select>

      <br />
      <br />

      <h3>Select Bank Excel File</h3>
      <input type="file" accept=".xlsx,.xls" onChange={handleFile} />

      {fileName && (
        <div className="card">
          <h3>Selected File</h3>
          <p><strong>Bank:</strong> {bankName}</p>
          <p><strong>File:</strong> {fileName}</p>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Unique Rows Ready:</strong> {cases.length}</p>

          {cases.length > 0 && status !== "importing" && (
            <button className="primary-btn" onClick={importCases}>
              Safe Import {cases.length} Cases
            </button>
          )}
        </div>
      )}

      {cases.length > 0 && (
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
              {cases.slice(0, 20).map((item, index) => (
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

          <p>Showing first 20 rows. Total unique rows: {cases.length}</p>
        </div>
      )}

      {status === "importing" && (
        <div className="card">
          <h3>⏳ Importing cases...</h3>
          <p>Imported so far: {importedCount}</p>
          <p>Skipped duplicates: {skippedCount}</p>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Complete</h3>
          <p>Imported: {importedCount}</p>
          <p>Skipped duplicates: {skippedCount}</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;