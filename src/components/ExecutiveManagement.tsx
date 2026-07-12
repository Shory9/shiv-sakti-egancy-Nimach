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
  address: string;
  accountNo: string;
  accountSegment: string;
  assetClassification: string;
  remarks: string;
};

const WORKING_AREAS = [
  "CRPF Neemuch",
  "Pustak Bajar Neemuch",
  "Neemuch",
  "Manasa",
  "Mandsaur",
  "MEN DB Mandsaur",
  "Jaora",
  "Bilpank",
  "Khachrod",
  "Sailana",
  "Station Road Ratlam",
  "Alkapuri Ratlam",
  "College Road Ratlam",
  "Chandni Chowk Ratlam",
  "Bamaniya",
  "Petlawad",
  "Dhar",
  "Manavar",
  "Tonki",
];

function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");

  function normalizeHeader(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function getValue(
    row: Record<string, unknown>,
    possibleHeaders: string[]
  ) {
    const rowKeys = Object.keys(row);

    for (const header of possibleHeaders) {
      const wanted = normalizeHeader(header);
      const exactKey = rowKeys.find(
        (key) => normalizeHeader(key) === wanted
      );

      if (exactKey) {
        return String(row[exactKey] ?? "").trim();
      }
    }

    return "";
  }

  function parseLakhAmount(value: unknown) {
    const original = String(value ?? "").trim();

    if (!original) return 0;

    const cleaned = original
      .replace(/[₹,\s]/g, "")
      .replace(/[^0-9.eE+-]/g, "");

    const parsed = Number(cleaned);

    if (!Number.isFinite(parsed)) return 0;

    return Math.round(parsed * 100000 * 100) / 100;
  }

  function formatAgentCode(id: number, code?: string | null) {
    return code || "SS" + String(id).padStart(3, "0");
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
        cases: Number(item.cases || 0),
        status: item.status === "Inactive" ? "Inactive" : "Active",
        is_online: Boolean(item.is_online),
        last_seen: item.last_seen || "",
      }))
    );
  }

  useEffect(() => {
    loadExecutives();
  }, []);

  async function addExecutive() {
    if (!name.trim() || !phone.trim() || !area.trim()) {
      alert("Name, phone aur working area required hai.");
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
      alert(
        "Executive add error: " +
          (error?.message || "Unknown error")
      );
      return;
    }

    const agentCode = "SS" + String(data.id).padStart(3, "0");

    const { error: codeError } = await supabase
      .from("agents")
      .update({ agent_code: agentCode })
      .eq("id", data.id);

    if (codeError) {
      alert("Agent code update error: " + codeError.message);
      return;
    }

    setName("");
    setPhone("");
    setArea("");
    setVehicle("");

    await loadExecutives();

    alert(
      `Executive added successfully.\nAgent Code: ${agentCode}\nWorking Area: ${area}`
    );
  }

  async function deleteExecutive(item: Executive) {
    const ok = window.confirm(
      `${formatAgentCode(item.id, item.agent_code)} - ${
        item.name
      } ko permanently delete karna hai?\n\nAssigned cases delete nahi honge; Unassigned ho jayenge.`
    );

    if (!ok) return;

    const { error: unassignError } = await supabase
      .from("cases")
      .update({ assigned_agent: null })
      .eq("assigned_agent", item.id);

    if (unassignError) {
      alert(
        "Executive cases unassign error: " +
          unassignError.message
      );
      return;
    }

    const { error: executiveError } = await supabase
      .from("agents")
      .delete()
      .eq("id", item.id);

    if (executiveError) {
      alert(
        "Executive delete error: " +
          executiveError.message
      );
      return;
    }

    setExecutives((old) =>
      old.filter((executive) => executive.id !== item.id)
    );

    alert(`${item.name} delete ho gaya. Cases safe hain.`);
  }

  async function toggleStatus(item: Executive) {
    const nextStatus =
      item.status === "Active" ? "Inactive" : "Active";

    const { error } = await supabase
      .from("agents")
      .update({
        status: nextStatus,
        is_online:
          nextStatus === "Inactive"
            ? false
            : item.is_online || false,
      })
      .eq("id", item.id);

    if (error) {
      alert("Status update error: " + error.message);
      return;
    }

    setExecutives((old) =>
      old.map((executive) =>
        executive.id === item.id
          ? {
              ...executive,
              status: nextStatus,
              is_online:
                nextStatus === "Inactive"
                  ? false
                  : executive.is_online,
            }
          : executive
      )
    );
  }

  async function uploadCasesForExecutive(
    executive: Executive,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const ok = window.confirm(
      `${formatAgentCode(
        executive.id,
        executive.agent_code
      )} - ${executive.name} ke liye cases upload kar rahe ho.\n\nArea: ${
        executive.area
      }\nFile: ${file.name}\n\nContinue?`
    );

    if (!ok) return;

    const reader = new FileReader();

    reader.onload = async (readerEvent) => {
      try {
        const data = readerEvent.target?.result;

        const workbook = XLSX.read(data, {
          type: "array",
        });

        const sheetName =
          workbook.SheetNames.find(
            (sheet) =>
              sheet.trim().toUpperCase() === "NPA LIST" ||
              sheet.trim().toUpperCase() === "LIST"
          ) || workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];

        const rows =
          XLSX.utils.sheet_to_json<Record<string, unknown>>(
            worksheet,
            {
              defval: "",
              raw: true,
            }
          );

        const parsedCases: ImportedCase[] = rows
          .map((row) => {
            const customer = getValue(row, [
              "A/C Name",
              "Customer Name",
              "Borrower Name",
              "Name",
            ]);

            const mobile = getValue(row, [
              "MOBILE NO",
              "MOBILE",
              "Mobile No",
              "Mobile",
              "Phone",
              "Contact",
            ]);

            const branch = getValue(row, [
              "Branch",
              "Branch Name",
            ]);

            const balanceText = getValue(row, [
              "Cust. Bal",
              "CUST BAL",
              "Customer Balance",
              "O/S Balance",
              "OS Balance",
              "Balance [INR]",
            ]);

            const address = getValue(row, [
              "ADDRESS",
              "Address",
              "Customer Address",
            ]);

            const accountNo = getValue(row, [
              "A/C No",
              "Account ID",
              "Account No",
              "Account Number",
            ]);

            const accountSegment = getValue(row, [
              "REV SEG",
              "Account Segment",
            ]);

            const assetClassification = getValue(row, [
              "Class",
              "Asset Classification",
              "Category",
            ]).toUpperCase();

            const loanType =
              getValue(row, [
                "Scheme Code",
                "Loan Type",
                "Product",
                "Type",
              ]) || "Recovery";

            const amount = parseLakhAmount(balanceText);

            return {
              customer,
              phone: mobile,
              bank: branch || "Assigned Bank File",
              loanType,
              amount,
              pendingAmount: amount,
              address,
              accountNo,
              accountSegment,
              assetClassification,
              remarks: [
                `Uploaded directly for ${formatAgentCode(
                  executive.id,
                  executive.agent_code
                )} - ${executive.name}`,
                `Working Area: ${executive.area}`,
                `Source File: ${file.name}`,
              ].join(" | "),
            };
          })
          .filter(
            (item) =>
              item.accountNo ||
              item.customer ||
              item.phone ||
              item.amount > 0
          );

        if (parsedCases.length === 0) {
          alert("Excel read hui, lekin valid cases nahi mile.");
          return;
        }

        const missingAddressCount = parsedCases.filter(
          (item) => !item.address
        ).length;

        const confirmImport = window.confirm(
          [
            `${parsedCases.length} cases directly ${executive.name} ko assign honge.`,
            "",
            `Full address found: ${
              parsedCases.length - missingAddressCount
            }`,
            `Missing address: ${missingAddressCount}`,
            "",
            "Import karein?",
          ].join("\n")
        );

        if (!confirmImport) return;

        const rowsToInsert = parsedCases.map((item) => ({
          customer_name:
            item.customer || "Unknown Customer",
          mobile: item.phone,
          bank_name: item.bank,
          loan_type: item.loanType,
          loan_amount: item.amount,
          pending_amount: item.pendingAmount,
          address: item.address,
          status: "Pending",
          assigned_agent: executive.id,
          account_no: item.accountNo,
          branch_name: item.bank,
          scheme_code: item.loanType,
          account_segment: item.accountSegment,
          asset_classification: item.assetClassification,
          remarks: item.remarks,
        }));

        const chunkSize = 250;
        let imported = 0;

        for (
          let index = 0;
          index < rowsToInsert.length;
          index += chunkSize
        ) {
          const chunk = rowsToInsert.slice(
            index,
            index + chunkSize
          );

          const { error } = await supabase
            .from("cases")
            .insert(chunk);

          if (error) {
            alert(
              `Upload stopped.\nImported before error: ${imported}\nError: ${error.message}`
            );
            return;
          }

          imported += chunk.length;
        }

        const { count, error: countError } =
          await supabase
            .from("cases")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("assigned_agent", executive.id);

        if (!countError) {
          await supabase
            .from("agents")
            .update({ cases: count || 0 })
            .eq("id", executive.id);
        }

        await loadExecutives();

        alert(
          `Upload complete.\n${imported} cases assigned to ${executive.name}.\nFull customer address database me save ho gaya.`
        );
      } catch (error) {
        alert(
          "Excel read error: " +
            (error instanceof Error
              ? error.message
              : "File format check karo.")
        );
      }
    };

    reader.readAsArrayBuffer(file);
  }

  return (
    <div className="module-card">
      <h2>👨‍💼 Field Executive Management</h2>

      <p>
        Area-wise XLS directly executive ko upload karo. Full
        customer address executive app me show hoga.
      </p>

      <hr />

      <h3>Add Field Executive</h3>

      <input
        placeholder="Executive Full Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Mobile Number"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />

      <br />
      <br />

      <select
        value={area}
        onChange={(event) => setArea(event.target.value)}
      >
        <option value="">Select Working Area</option>

        {WORKING_AREAS.map((workingArea) => (
          <option key={workingArea} value={workingArea}>
            {workingArea}
          </option>
        ))}
      </select>

      <br />
      <br />

      <input
        placeholder="Vehicle Number / Vehicle Type"
        value={vehicle}
        onChange={(event) => setVehicle(event.target.value)}
      />

      <br />
      <br />

      <button
        className="primary-btn"
        onClick={addExecutive}
      >
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
            <th>Working Area</th>
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
                <strong>
                  {formatAgentCode(
                    item.id,
                    item.agent_code
                  )}
                </strong>
              </td>

              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.area}</td>
              <td>{item.vehicle || "-"}</td>
              <td>{item.cases}</td>

              <td>
                <label
                  className="primary-btn"
                  style={{
                    cursor: "pointer",
                    display: "inline-block",
                  }}
                >
                  Upload Cases

                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: "none" }}
                    onChange={(event) =>
                      uploadCasesForExecutive(
                        item,
                        event
                      )
                    }
                  />
                </label>
              </td>

              <td>
                {item.is_online
                  ? "🟢 Online"
                  : "🔴 Offline"}
              </td>

              <td>
                {item.last_seen || "Not updated"}
              </td>

              <td>{item.status}</td>

              <td>
                <button
                  onClick={() => toggleStatus(item)}
                >
                  {item.status === "Active"
                    ? "Deactivate"
                    : "Activate"}
                </button>{" "}

                <button
                  onClick={() => deleteExecutive(item)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}

          {executives.length === 0 && (
            <tr>
              <td colSpan={11}>
                No executives added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ExecutiveManagement;