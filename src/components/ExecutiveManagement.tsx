import {
  type ChangeEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

import {
  createCaseDatabaseRow,
  normalizeText,
  parseBankExcel,
} from "../utils/caseImport";

type Executive = {
  id: number;
  agent_code?: string | null;
  name: string;
  phone: string;
  area: string;
  vehicle: string;
  cases: number;
  status: "Active" | "Inactive";
  approval_status?: "Pending" | "Approved" | "Rejected" | null;
  is_online?: boolean | null;
  last_seen?: string | null;
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
  const [executives, setExecutives] =
    useState<Executive[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  function formatAgentCode(
    id: number,
    code?: string | null
  ) {
    return (
      code ||
      "SS" + String(id).padStart(3, "0")
    );
  }

  function cleanPhone(value: string) {
    return value.replace(/\D/g, "");
  }

  async function loadExecutives() {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(
        "Executive load error: " +
          error.message
      );
      return;
    }

    setExecutives(
      (data || []).map((item: any) => ({
        id: item.id,
        agent_code:
          item.agent_code || null,
        name: item.name || "",
        phone: item.phone || "",
        area: item.area || "",
        vehicle: item.vehicle || "",
        cases: Number(item.cases || 0),
        status:
          item.status === "Inactive"
            ? "Inactive"
            : "Active",
        approval_status:
          item.approval_status === "Pending" ||
          item.approval_status === "Rejected"
            ? item.approval_status
            : "Approved",
        is_online: Boolean(
          item.is_online
        ),
        last_seen: item.last_seen || "",
      }))
    );
  }

  useEffect(() => {
    loadExecutives();
  }, []);

  async function addExecutive() {
    if (isAdding) return;

    const cleanName = name.trim();
    const normalizedPhone = cleanPhone(phone);
    const cleanArea = area.trim();
    const cleanVehicle = vehicle.trim();

    if (!cleanName || !normalizedPhone || !cleanArea) {
      alert("Name, phone aur working area required hai.");
      return;
    }

    if (normalizedPhone.length < 10) {
      alert("Valid mobile number enter karo.");
      return;
    }

    setIsAdding(true);

    try {
      const { data: phoneMatch, error: phoneError } =
        await supabase
          .from("agents")
          .select("id")
          .eq("phone", normalizedPhone)
          .limit(1);

      if (phoneError) {
        throw new Error(phoneError.message);
      }

      if (phoneMatch && phoneMatch.length > 0) {
        alert("Is mobile number ka executive already exists.");
        return;
      }

      const { data: nameAreaMatch, error: nameAreaError } =
        await supabase
          .from("agents")
          .select("id")
          .ilike("name", cleanName)
          .ilike("area", cleanArea)
          .limit(1);

      if (nameAreaError) {
        throw new Error(nameAreaError.message);
      }

      if (nameAreaMatch && nameAreaMatch.length > 0) {
        alert("Same name aur same area ka executive already exists.");
        return;
      }

      const { data, error } = await supabase
        .from("agents")
        .insert({
          name: cleanName,
          phone: normalizedPhone,
          area: cleanArea,
          vehicle: cleanVehicle,
          cases: 0,
          status: "Active",
          approval_status: "Approved",
          is_online: false,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Unknown error");
      }

      const agentCode =
        "SS" + String(data.id).padStart(3, "0");

      const { error: codeError } = await supabase
        .from("agents")
        .update({ agent_code: agentCode })
        .eq("id", data.id);

      if (codeError) {
        throw new Error(codeError.message);
      }

      setName("");
      setPhone("");
      setArea("");
      setVehicle("");

      await loadExecutives();

      alert(
        `Executive added successfully.\nAgent Code: ${agentCode}\nWorking Area: ${cleanArea}`
      );
    } catch (error) {
      alert(
        "Executive add error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleStatus(
    item: Executive
  ) {
    const nextStatus =
      item.status === "Active"
        ? "Inactive"
        : "Active";

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
      alert(
        "Status update error: " +
          error.message
      );
      return;
    }

    setExecutives((old) =>
      old.map((executive) =>
        executive.id === item.id
          ? {
              ...executive,
              status: nextStatus,
              is_online:
                nextStatus ===
                "Inactive"
                  ? false
                  : executive.is_online,
            }
          : executive
      )
    );
  }

  async function approveExecutive(item: Executive) {
    const confirmed = window.confirm(
      `${formatAgentCode(item.id, item.agent_code)} - ${item.name} ko approve karke Active karna hai?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("agents")
      .update({
        approval_status: "Approved",
        status: "Active",
      })
      .eq("id", item.id);

    if (error) {
      alert("Approval error: " + error.message);
      return;
    }

    await loadExecutives();
    alert("Executive approved successfully.");
  }

  async function rejectExecutive(item: Executive) {
    const confirmed = window.confirm(
      `${formatAgentCode(item.id, item.agent_code)} - ${item.name} ki registration reject karni hai?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("agents")
      .update({
        approval_status: "Rejected",
        status: "Inactive",
        is_online: false,
        session_token: null,
      })
      .eq("id", item.id);

    if (error) {
      alert("Reject error: " + error.message);
      return;
    }

    await loadExecutives();
    alert("Executive registration rejected.");
  }

  async function resetExecutiveDevice(item: Executive) {
    const confirmed = window.confirm(
      `${formatAgentCode(item.id, item.agent_code)} - ${item.name} ka purana device logout karke naya login allow karna hai?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("agents")
      .update({
        session_token: null,
        is_online: false,
        last_seen: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("Reset Device error: " + error.message);
      return;
    }

    await loadExecutives();
    alert("Device reset ho gaya. Executive ab naye mobile me login kar sakta hai.");
  }

  async function loadExistingAccountNumbers() {
    const existing =
      new Set<string>();

    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } =
        await supabase
          .from("cases")
          .select("account_no")
          .range(
            from,
            from + pageSize - 1
          );

      if (error) {
        throw new Error(
          error.message
        );
      }

      const rows = data || [];

      rows.forEach((item) => {
        const key = normalizeText(
          item.account_no
        );

        if (key) {
          existing.add(key);
        }
      });

      if (rows.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return existing;
  }

  async function refreshExecutiveCaseCount(
    executiveId: number
  ) {
    const { count, error } =
      await supabase
        .from("cases")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "assigned_agent",
          executiveId
        );

    if (error) return;

    await supabase
      .from("agents")
      .update({
        cases: count || 0,
      })
      .eq("id", executiveId);
  }

  async function uploadCasesForExecutive(
    executive: Executive,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const confirmed =
      window.confirm(
        `${formatAgentCode(
          executive.id,
          executive.agent_code
        )} - ${
          executive.name
        } ke liye cases upload kar rahe ho.\n\nArea: ${
          executive.area
        }\nFile: ${
          file.name
        }\n\nContinue?`
      );

    if (!confirmed) return;

    try {
      const result =
        await parseBankExcel(
          file,
          "Assigned Bank File"
        );

      if (
        result.cases.length === 0
      ) {
        alert(
          "Excel read hui, lekin valid cases nahi mile."
        );
        return;
      }

      const existingKeys =
        await loadExistingAccountNumbers();

      const newCases =
        result.cases.filter(
          (item) =>
            !existingKeys.has(
              normalizeText(
                item.accountNo
              )
            )
        );

      const skipped =
        result.cases.length -
        newCases.length;

      const confirmImport =
        window.confirm(
          [
            `Executive: ${executive.name}`,
            `Area: ${executive.area}`,
            `Format: ${result.format}`,
            "",
            `Unique cases in file: ${result.cases.length}`,
            `Existing cases skipped: ${skipped}`,
            `New cases to import: ${newCases.length}`,
            `Missing addresses: ${result.missingAddressCount}`,
            "",
            "All new cases direct is executive ko assign honge.",
            "",
            "Import karein?",
          ].join("\n")
        );

      if (!confirmImport) return;

      if (newCases.length === 0) {
        alert(
          `New imported: 0\nSkipped existing: ${skipped}`
        );
        return;
      }

      const assignmentText = `${formatAgentCode(
        executive.id,
        executive.agent_code
      )} - ${executive.name}`;

      const rowsToInsert =
        newCases.map((item) =>
          createCaseDatabaseRow(
            item,
            {
              assignedAgentId:
                executive.id,
              sourceFileName:
                file.name,
              assignmentText,
            }
          )
        );

      const chunkSize = 250;
      let imported = 0;

      for (
        let index = 0;
        index <
        rowsToInsert.length;
        index += chunkSize
      ) {
        const chunk =
          rowsToInsert.slice(
            index,
            index + chunkSize
          );

        const { error } =
          await supabase
            .from("cases")
            .insert(chunk);

        if (error) {
          alert(
            [
              "Upload stopped.",
              `Imported before error: ${imported}`,
              `Error: ${error.message}`,
              "",
              "Same file dobara upload kar sakte ho.",
              "Already imported Account IDs skip honge.",
            ].join("\n")
          );

          return;
        }

        imported += chunk.length;
      }

      await refreshExecutiveCaseCount(
        executive.id
      );

      await loadExecutives();

      alert(
        [
          "Direct executive upload complete.",
          "",
          `Executive: ${executive.name}`,
          `Imported: ${imported}`,
          `Skipped existing: ${skipped}`,
          `Missing addresses: ${result.missingAddressCount}`,
        ].join("\n")
      );
    } catch (error) {
      alert(
        "Excel upload error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    }
  }

  return (
    <div className="module-card">
      <h2>
        👨‍💼 Field Executive Management
      </h2>

      <p>
        Area-wise XLS direct
        executive ko upload karo.
        Bank Import aur Direct
        Upload dono same shared
        engine use karte hain.
      </p>

      <hr />

      <h3>Add Field Executive</h3>

      <input
        placeholder="Executive Full Name"
        value={name}
        onChange={(event) =>
          setName(
            event.target.value
          )
        }
      />

      <br />
      <br />

      <input
        placeholder="Mobile Number"
        value={phone}
        onChange={(event) =>
          setPhone(
            event.target.value
          )
        }
      />

      <br />
      <br />

      <select
        value={area}
        onChange={(event) =>
          setArea(
            event.target.value
          )
        }
      >
        <option value="">
          Select Working Area
        </option>

        {WORKING_AREAS.map(
          (workingArea) => (
            <option
              key={workingArea}
              value={workingArea}
            >
              {workingArea}
            </option>
          )
        )}
      </select>

      <br />
      <br />

      <input
        placeholder="Vehicle Number / Vehicle Type"
        value={vehicle}
        onChange={(event) =>
          setVehicle(
            event.target.value
          )
        }
      />

      <br />
      <br />

      <button
        className="primary-btn"
        onClick={addExecutive}
        disabled={isAdding}
      >
        {isAdding
          ? "Adding Executive..."
          : "+ Add Field Executive"}
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
            <th>Approval</th>
            <th>Account Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {executives.map(
            (item) => (
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

                <td>
                  {item.vehicle ||
                    "-"}
                </td>

                <td>{item.cases}</td>

                <td>
                  <label
                    className="primary-btn"
                    style={{
                      cursor:
                        "pointer",
                      display:
                        "inline-block",
                    }}
                  >
                    Upload Cases

                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      style={{
                        display:
                          "none",
                      }}
                      onChange={(
                        event
                      ) =>
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
                  {item.last_seen ||
                    "Not updated"}
                </td>

                <td>
                  {item.approval_status === "Pending"
                    ? "🟡 Pending"
                    : item.approval_status === "Rejected"
                    ? "🔴 Rejected"
                    : "🟢 Approved"}
                </td>

                <td>
                  {item.status}
                </td>

                <td>
                  {item.approval_status === "Pending" && (
                    <>
                      <button
                        onClick={() => approveExecutive(item)}
                      >
                        Approve
                      </button>{" "}
                      <button
                        onClick={() => rejectExecutive(item)}
                      >
                        Reject
                      </button>{" "}
                    </>
                  )}

                  {item.approval_status === "Rejected" && (
                    <>
                      <button
                        onClick={() => approveExecutive(item)}
                      >
                        Approve
                      </button>{" "}
                    </>
                  )}

                  <button
                    onClick={() =>
                      toggleStatus(
                        item
                      )
                    }
                    disabled={item.approval_status !== "Approved"}
                  >
                    {item.status ===
                    "Active"
                      ? "Deactivate"
                      : "Activate"}
                  </button>{" "}

                  <button
                    onClick={() => resetExecutiveDevice(item)}
                    disabled={item.approval_status !== "Approved"}
                  >
                    Reset Device
                  </button>
                </td>
              </tr>
            )
          )}

          {executives.length ===
            0 && (
            <tr>
              <td colSpan={12}>
                No executives added
                yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ExecutiveManagement;