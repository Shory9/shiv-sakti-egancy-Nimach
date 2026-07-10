import { type ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type ImportStatus = "idle" | "ready" | "importing" | "imported";

type AreaMapping = {
  agentCode: string;
  agentName: string;
};

type ImportedCase = {
  accountNo: string;
  customer: string;
  phone: string;
  bank: string;
  branch: string;
  alpha: string;
  loanType: string;
  amount: number;
  pendingAmount: number;
  address: string;
};

type Agent = {
  id: number;
  name: string;
  agent_code: string | null;
};

const AREA_AGENT_MAP: Record<string, AreaMapping> = {
  NEEMUC: {
    agentCode: "SS025",
    agentName: "Shultab Singh Panwar",
  },
  SAILAN: {
    agentCode: "SS021",
    agentName: "Rajesh",
  },
  MANASA: {
    agentCode: "SS023",
    agentName: "Rahul Kumar",
  },
  MANAWA: {
    agentCode: "SS022",
    agentName: "Babu Nagda",
  },
};

function BankImport() {
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [cases, setCases] = useState<ImportedCase[]>([]);

  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  function normalizeText(value: unknown) {
    return String(value ?? "").trim();
  }

  function normalizeHeader(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
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
        return normalizeText(row[exactKey]);
      }
    }

    for (const header of possibleHeaders) {
      const wanted = normalizeHeader(header);

      const partialKey = rowKeys.find((key) =>
        normalizeHeader(key).includes(wanted)
      );

      if (partialKey) {
        return normalizeText(row[partialKey]);
      }
    }

    return "";
  }

  function parseAmount(value: unknown) {
    const cleaned = String(value ?? "")
      .replace(/,/g, "")
      .replace(/[^0-9.-]/g, "");

    return Number(cleaned) || 0;
  }

  function normalizeAccountNo(value: string) {
    return value.replace(/\s/g, "").toUpperCase();
  }

  function makeCaseKey(item: {
    accountNo?: string;
    customer: string;
    phone: string;
    bank: string;
  }) {
    const accountNo = normalizeAccountNo(item.accountNo || "");

    if (accountNo) {
      return `ACCOUNT:${accountNo}`;
    }

    return [
      "FALLBACK",
      item.customer.trim().toLowerCase(),
      item.phone.trim(),
      item.bank.trim().toLowerCase(),
    ].join("|");
  }

  function extractAccountNo(remarks: string | null) {
    if (!remarks) return "";

    const match = remarks.match(/Account No:\s*([^|]+)/i);
    return match ? normalizeAccountNo(match[1]) : "";
  }

  async function loadAllExistingCases() {
    const allRows: Array<{
      customer_name: string | null;
      mobile: string | null;
      bank_name: string | null;
      remarks: string | null;
    }> = [];

    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("cases")
        .select("customer_name, mobile, bank_name, remarks")
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      const rows = data || [];
      allRows.push(...rows);

      if (rows.length < pageSize) break;

      from += pageSize;
    }

    return allRows;
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setCases([]);
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);
    setStatus("idle");

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const fileData = readerEvent.target?.result;

        const workbook = XLSX.read(fileData, {
          type: "array",
        });

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        const rows =
          XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

        const parsedCases: ImportedCase[] = rows
          .map((row) => {
            const accountNo = getValue(row, [
              "A/C No",
              "Account No",
              "Account Number",
            ]);

            const customer = getValue(row, [
              "A/C Name",
              "Customer Name",
              "Borrower Name",
              "Name",
            ]);

            const phone = getValue(row, [
              "MOBILE NO",
              "Mobile",
              "Phone",
              "Contact",
            ]);

            const alpha = getValue(row, ["Alpha"]).toUpperCase();

            const branch = getValue(row, [
              "Branch",
              "Branch Name",
            ]);

            const loanType =
              getValue(row, [
                "Scheme Code",
                "Loan Type",
                "Product",
              ]) || "Recovery";

            const balanceText = getValue(row, [
              "Balance [INR]",
              "Balance",
              "Outstanding",
              "Loan Amount",
            ]);

            const address = getValue(row, [
              "ADDRESS",
              "Address",
              "Location",
            ]);

            const amount = parseAmount(balanceText);

            return {
              accountNo,
              customer,
              phone,
              bank: bankName,
              branch,
              alpha,
              loanType,
              amount,
              pendingAmount: amount,
              address,
            };
          })
          .filter(
            (item) =>
              item.accountNo ||
              item.customer ||
              item.phone ||
              item.amount > 0
          );

        const uniqueCases = new Map<string, ImportedCase>();

        parsedCases.forEach((item) => {
          const key = makeCaseKey(item);

          if (!uniqueCases.has(key)) {
            uniqueCases.set(key, item);
          }
        });

        const readyCases = Array.from(uniqueCases.values());

        setCases(readyCases);
        setStatus("ready");

        if (readyCases.length === 0) {
          alert(
            "Excel read hui, lekin valid bank cases nahi mile."
          );
        }
      } catch {
        setStatus("idle");
        alert("Excel read error. File format check karo.");
      }
    };

    reader.readAsArrayBuffer(file);
  }

  const areaSummary = useMemo(() => {
    const summary = new Map<string, number>();

    cases.forEach((item) => {
      const area = item.alpha || "NO AREA";
      summary.set(area, (summary.get(area) || 0) + 1);
    });

    return Array.from(summary.entries())
      .map(([area, count]) => ({
        area,
        count,
        mapping: AREA_AGENT_MAP[area],
      }))
      .sort((a, b) => b.count - a.count);
  }, [cases]);

  const mappedPreviewCount = useMemo(
    () =>
      cases.filter((item) => Boolean(AREA_AGENT_MAP[item.alpha]))
        .length,
    [cases]
  );

  const unmappedPreviewCount =
    cases.length - mappedPreviewCount;

  async function refreshAgentCaseCounts(agentIds: number[]) {
    const uniqueAgentIds = Array.from(new Set(agentIds));

    for (const agentId of uniqueAgentIds) {
      const { count, error } = await supabase
        .from("cases")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("assigned_agent", agentId);

      if (!error) {
        await supabase
          .from("agents")
          .update({ cases: count || 0 })
          .eq("id", agentId);
      }
    }
  }

  async function importCases() {
    if (cases.length === 0) {
      alert("Import ke liye cases nahi mile.");
      return;
    }

    const confirmImport = window.confirm(
      [
        "Area-wise automatic case assignment",
        "",
        `Total unique cases: ${cases.length}`,
        `Mapped cases: ${mappedPreviewCount}`,
        `Unmapped cases: ${unmappedPreviewCount}`,
        "",
        "Mapped cases correct executives ko assign honge.",
        "Unmapped areas ke cases safe Unassigned rahenge.",
        "Existing duplicate accounts skip honge.",
        "",
        "Import continue karein?",
      ].join("\n")
    );

    if (!confirmImport) return;

    setStatus("importing");
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);

    const { data: agentsData, error: agentsError } =
      await supabase
        .from("agents")
        .select("id, name, agent_code")
        .eq("status", "Active");

    if (agentsError) {
      alert(
        "Executive list load error: " + agentsError.message
      );
      setStatus("ready");
      return;
    }

    const agents = (agentsData || []) as Agent[];

    const agentsByCode = new Map<string, Agent>();

    agents.forEach((agent) => {
      const code = String(agent.agent_code || "")
        .trim()
        .toUpperCase();

      if (code) agentsByCode.set(code, agent);
    });

    let existingData;

    try {
      existingData = await loadAllExistingCases();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown database error";

      alert("Existing cases check error: " + message);
      setStatus("ready");
      return;
    }

    const existingKeys = new Set<string>();

    existingData.forEach((item) => {
      const accountNo = extractAccountNo(item.remarks);

      existingKeys.add(
        makeCaseKey({
          accountNo,
          customer: item.customer_name || "",
          phone: item.mobile || "",
          bank: item.bank_name || "",
        })
      );
    });

    const newCases = cases.filter(
      (item) => !existingKeys.has(makeCaseKey(item))
    );

    const skipped = cases.length - newCases.length;
    setSkippedCount(skipped);

    if (newCases.length === 0) {
      setStatus("imported");

      alert(
        [
          "Import complete.",
          "",
          "New imported: 0",
          `Skipped duplicates: ${skipped}`,
          "",
          "Sab accounts pehle se database me hain.",
        ].join("\n")
      );

      return;
    }

    let unassigned = 0;
    const assignedAgentIds: number[] = [];

    const rowsToInsert = newCases.map((item) => {
      const mapping = AREA_AGENT_MAP[item.alpha];

      const mappedAgent = mapping
        ? agentsByCode.get(mapping.agentCode.toUpperCase())
        : undefined;

      if (!mappedAgent) {
        unassigned += 1;
      } else {
        assignedAgentIds.push(mappedAgent.id);
      }

      const assignmentText = mappedAgent
        ? `${mappedAgent.agent_code || mapping?.agentCode} - ${
            mappedAgent.name
          }`
        : "Unassigned";

      return {
        customer_name:
          item.customer || "Unknown Customer",

        mobile: item.phone,

        bank_name: item.branch
          ? `${bankName} | ${item.branch}`
          : bankName,

        loan_type: item.loanType,

        loan_amount: item.amount,

        pending_amount:
          item.pendingAmount || item.amount,

        address: item.address,

        status: "Pending",

        assigned_agent: mappedAgent
          ? mappedAgent.id
          : null,

        remarks: [
          `Account No: ${item.accountNo || "Not Available"}`,
          `Alpha: ${item.alpha || "Not Available"}`,
          `Branch: ${item.branch || "Not Available"}`,
          `Auto Assignment: ${assignmentText}`,
          `Source File: ${fileName}`,
        ].join(" | "),
      };
    });

    setUnassignedCount(unassigned);

    const chunkSize = 250;
    let totalImported = 0;

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
        setImportedCount(totalImported);
        setStatus("ready");

        alert(
          [
            "Import stopped.",
            "",
            `Successfully imported before error: ${totalImported}`,
            `Error: ${error.message}`,
            "",
            "Same file dobara upload kar sakte ho.",
            "Already imported account numbers automatically skip honge.",
          ].join("\n")
        );

        return;
      }

      totalImported += chunk.length;
      setImportedCount(totalImported);
    }

    await refreshAgentCaseCounts(assignedAgentIds);

    setImportedCount(totalImported);
    setStatus("imported");

    alert(
      [
        "Area-wise import complete.",
        "",
        `Imported: ${totalImported}`,
        `Skipped duplicates: ${skipped}`,
        `Assigned automatically: ${
          totalImported - unassigned
        }`,
        `Unassigned: ${unassigned}`,
      ].join("\n")
    );
  }

  return (
    <div className="module-card">
      <h1>📄 Bank Excel Auto Assignment</h1>

      <p>
        Ek hi bank Excel upload karo. System Alpha area ke
        hisaab se cases automatically correct executive ko
        assign karega.
      </p>

      <hr />

      <h3>Select Bank</h3>

      <select
        value={bankName}
        onChange={(event) =>
          setBankName(event.target.value)
        }
      >
        <option>State Bank of India (SBI)</option>
        <option>Bank of Baroda (BOB)</option>
      </select>

      <br />
      <br />

      <h3>Select Complete Bank Excel</h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
      />

      {fileName && (
        <div className="card">
          <h3>Selected File</h3>

          <p>
            <strong>Bank:</strong> {bankName}
          </p>

          <p>
            <strong>File:</strong> {fileName}
          </p>

          <p>
            <strong>Status:</strong> {status}
          </p>

          <p>
            <strong>Unique Cases Ready:</strong>{" "}
            {cases.length}
          </p>

          <p>
            <strong>Auto Assigned Preview:</strong>{" "}
            {mappedPreviewCount}
          </p>

          <p>
            <strong>Unmapped / Unassigned:</strong>{" "}
            {unmappedPreviewCount}
          </p>

          {cases.length > 0 &&
            status !== "importing" && (
              <button
                className="primary-btn"
                onClick={importCases}
              >
                Auto Assign & Import {cases.length} Cases
              </button>
            )}
        </div>
      )}

      {areaSummary.length > 0 && (
        <div className="card">
          <h3>Area-wise Assignment Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Alpha Area</th>
                <th>Total Cases</th>
                <th>Assigned Agent</th>
                <th>Import Status</th>
              </tr>
            </thead>

            <tbody>
              {areaSummary.map((item) => (
                <tr key={item.area}>
                  <td>
                    <strong>{item.area}</strong>
                  </td>

                  <td>{item.count}</td>

                  <td>
                    {item.mapping
                      ? `${item.mapping.agentCode} - ${item.mapping.agentName}`
                      : "No Agent Mapping"}
                  </td>

                  <td>
                    {item.mapping
                      ? "✅ Auto Assign"
                      : "⚠️ Unassigned"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cases.length > 0 && (
        <div className="card">
          <h3>Bank Cases Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Account No.</th>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Alpha</th>
                <th>Branch</th>
                <th>Balance</th>
                <th>Target Agent</th>
              </tr>
            </thead>

            <tbody>
              {cases.slice(0, 20).map((item, index) => {
                const mapping =
                  AREA_AGENT_MAP[item.alpha];

                return (
                  <tr
                    key={`${item.accountNo}-${index}`}
                  >
                    <td>{item.accountNo}</td>
                    <td>{item.customer}</td>
                    <td>{item.phone}</td>
                    <td>{item.alpha}</td>
                    <td>{item.branch}</td>
                    <td>
                      ₹
                      {item.amount.toLocaleString(
                        "en-IN"
                      )}
                    </td>
                    <td>
                      {mapping
                        ? `${mapping.agentCode} - ${mapping.agentName}`
                        : "Unassigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p>
            First 20 cases shown. Total unique cases:{" "}
            {cases.length}
          </p>
        </div>
      )}

      {status === "importing" && (
        <div className="card">
          <h3>⏳ Area-wise cases importing...</h3>

          <p>
            Imported so far: {importedCount}
          </p>

          <p>
            Skipped duplicates: {skippedCount}
          </p>

          <p>
            Unassigned cases: {unassignedCount}
          </p>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Complete</h3>

          <p>Imported: {importedCount}</p>

          <p>
            Skipped duplicates: {skippedCount}
          </p>

          <p>
            Auto assigned:{" "}
            {importedCount - unassignedCount}
          </p>

          <p>
            Unassigned: {unassignedCount}
          </p>
        </div>
      )}
    </div>
  );
}

export default BankImport;