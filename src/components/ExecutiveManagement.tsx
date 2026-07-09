import { type ChangeEvent, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type Executive = {
  id: number;
  agent_code?: string | null;
  name: string;
  phone: string;
  area: string;
  vehicle: string;
  cases: number;
  status: "Active" | "Inactive";
  is_online?: boolean | null;
  last_seen?: string | null;
};

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

function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");

  function formatAgentCode(id: number, code?: string | null) {
    return code || "SS" + String(id).padStart(3, "0");
  }

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

  async function loadExecutives() {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert("Executive load error: " + error.message);
      return;
    }

    setExecutives(
      (data || []).map((item: any) => ({
        id: item.id,
        agent_code: item.agent_code || null,
        name: item.name || "",
        phone: item.phone || "",
        area: item.area || "",
        vehicle: item.vehicle || "",
        cases: item.cases || 0,
        status: item.status === "Inactive" ? "Inactive" : "Active",
        is_online: item.is_online || false,
        last_seen: item.last_seen || "",
      }))
    );
  }

  useEffect(() => {
    loadExecutives();
  }, []);

  async function addExecutive() {
    if (!name.trim() || !phone.trim() || !area.trim()) {
      alert("Name, phone aur area required hai.");
      return;
    }

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        vehicle: vehicle.trim(),
        cases: 0,
        status: "Active",
        is_online: false,
      })
      .select()
      .single();

    if (error || !data) {
      alert("Executive add error: " + (error?.message || "Unknown error"));
      return;
    }

    const agentCode = "SS" + String(data.id).padStart(3, "0");

    await supabase
      .from("agents")
      .update({ agent_code: agentCode })
      .eq("id", data.id);

    setName("");
    setPhone("");
    setArea("");
    setVehicle("");
    loadExecutives();

    alert(`Executive added successfully.\nAgent Code: ${agentCode}`);
  }

  async function deleteExecutive(id: number) {
    const ok = window.confirm(
      "Is executive ko delete karna hai? Agar cases assigned hain to pehle unhe reassign kar lo."
    );

    if (!ok) return;

    const { error } = await supabase.from("agents").delete().eq("id", id);

    if (error) {
      alert("Executive delete error: " + error.message);
      return;
    }

    setExecutives(executives.filter((e) => e.id !== id));
  }

  async function toggleStatus(item: Executive) {
    const nextStatus = item.status === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("agents")
      .update({ status: nextStatus })
      .eq("id", item.id);

    if (error) {
      alert("Status update error: " + error.message);
      return;
    }

    setExecutives(
      executives.map((e) =>
        e.id === item.id ? { ...e, status: nextStatus } : e
      )
    );
  }

  async function uploadCasesForExecutive(
    executive: Executive,
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    const ok = window.confirm(
      `${formatAgentCode(executive.id, executive.agent_code)} - ${executive.name} ke liye cases upload kar rahe ho.\n\nFile: ${file.name}\n\nContinue?`
    );

    if (!ok) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
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

            const mobile = findValue(row, ["mobile", "phone", "contact"]) || "";

            const bank =
              findValue(row, ["bank", "branch"]) ||
              "Assigned Bank File";

            const amountText =
              findValue(row, [
                "loanamount",
                "amount",
                "outstanding",
                "balance",
              ]) || "0";

            const pendingText =
              findValue(row, ["pending", "due", "overdue", "outstanding"]) ||
              amountText;

            const caseArea =
              findValue(row, ["area", "city", "location", "address"]) ||
              executive.area;

            return {
              customer,
              phone: mobile,
              bank,
              loanType:
                findValue(row, ["loantype", "product", "type"]) || "Recovery",
              amount:
                Number(String(amountText).replace(/[^0-9.]/g, "")) || 0,
              pendingAmount:
                Number(String(pendingText).replace(/[^0-9.]/g, "")) || 0,
              area: caseArea,
              remarks: `Uploaded directly for ${formatAgentCode(
                executive.id,
                executive.agent_code
              )} - ${executive.name}. File: ${file.name}`,
            };
          })
          .filter((item) => item.customer || item.phone || item.amount > 0);

        if (parsedCases.length === 0) {
          alert("Excel read hui, lekin valid cases nahi mile.");
          return;
        }

        const confirmImport = window.confirm(
          `${parsedCases.length} cases directly ${executive.name} ko assign honge.\n\nImport karein?`
        );

        if (!confirmImport) return;

        const rowsToInsert = parsedCases.map((item) => ({
          customer_name: item.customer || "Unknown Customer",
          mobile: item.phone,
          bank_name: item.bank,
          loan_type: item.loanType,
          loan_amount: item.amount,
          pending_amount: item.pendingAmount || item.amount,
          address: item.area,
          status: "Pending",
          assigned_agent: executive.id,
          remarks: item.remarks,
        }));

        const chunkSize = 500;
        let imported = 0;

        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          const { error } = await supabase.from("cases").insert(chunk);

          if (error) {
            alert("Upload cases error: " + error.message);
            return;
          }

          imported += chunk.length;
        }

        await supabase
          .from("agents")
          .update({ cases: (executive.cases || 0) + imported })
          .eq("id", executive.id);

        alert(
          `Upload complete.\n${imported} cases assigned to ${executive.name}.`
        );

        loadExecutives();
      } catch {
        alert("Excel read error. File format check karo.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="module-card">
      <h2>👨‍💼 Field Executive Management</h2>
      <p>
        Recovery agency ke real field executives, agent code, mobile number,
        working area aur live status manage karo.
      </p>

      <hr />

      <h3>Add Field Executive</h3>

      <input
        placeholder="Executive Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Mobile Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Working Area / Route"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Vehicle Number / Vehicle Type"
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value)}
      />

      <br />
      <br />

      <button className="primary-btn" onClick={addExecutive}>
        + Add Field Executive
      </button>

      <br />
      <br />

      <h3>Executive List</h3>

      <table>
        <thead>
          <tr>
            <th>Agent Code</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Vehicle</th>
            <th>Assigned Cases</th>
            <th>Upload Cases</th>
            <th>Live Status</th>
            <th>Last Seen</th>
            <th>Account Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {executives.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{formatAgentCode(item.id, item.agent_code)}</strong>
              </td>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.area}</td>
              <td>{item.vehicle}</td>
              <td>{item.cases}</td>
              <td>
                <label className="primary-btn" style={{ cursor: "pointer" }}>
                  Upload Cases
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={(e) => uploadCasesForExecutive(item, e)}
                  />
                </label>
              </td>
              <td>{item.is_online ? "🟢 Online" : "🔴 Offline"}</td>
              <td>{item.last_seen || "Not updated"}</td>
              <td>{item.status}</td>
              <td>
                <button onClick={() => toggleStatus(item)}>
                  {item.status === "Active" ? "Deactivate" : "Activate"}
                </button>{" "}
                <button onClick={() => deleteExecutive(item.id)}>
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

export default ExecutiveManagement;