import { type ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type ImportStatus = "idle" | "ready" | "importing" | "imported";
type FileFormat = "detailed" | "compact" | "unknown";

type ImportedCase = {
  accountNo: string;
  customer: string;
  phone: string;
  bank: string;
  branch: string;
  alpha: string;
  loanType: string;
  accountSegment: string;
  assetClassification: string;
  amount: number;
  pendingAmount: number;
  sanctionLimit: number;
  customerBalance: number;
  address: string;
  resolvedArea: string;
};

type Agent = {
  id: number;
  name: string;
  agent_code: string | null;
  area: string | null;
  status: string | null;
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

const ALPHA_AREA_MAP: Record<string, string> = {
  BAMANI: "Bamaniya",
  MANDSA: "Mandsaur",
  NEEMUC: "Neemuch",
  SAILAN: "Sailana",
  MANASA: "Manasa",
  BILPAN: "Bilpank",
  MANAWA: "Manavar",
  JAORA: "Jaora",
  VJNEEM: "CRPF Neemuch",
  DBMSUR: "MEN DB Mandsaur",
};

const ADDRESS_AREA_PRIORITY: Array<{
  area: string;
  keywords: string[];
}> = [
  {
    area: "Bamaniya",
    keywords: ["BAMANIYA", "BAMANIA", "BAMANI", "BAMANIA MANDI"],
  },
  {
    area: "CRPF Neemuch",
    keywords: ["CRPF ROAD NEEMUCH", "CRPF ROAD", "CRPF NEEMUCH"],
  },
  {
    area: "Pustak Bajar Neemuch",
    keywords: ["PUSTAK BAJAR", "PUSTAK BAZAR"],
  },
  {
    area: "MEN DB Mandsaur",
    keywords: ["MEN DB MANDSAUR", "DB MANDSAUR", "DBMSUR"],
  },
  {
    area: "Station Road Ratlam",
    keywords: ["STATION ROAD RATLAM", "STATION ROAD"],
  },
  {
    area: "Alkapuri Ratlam",
    keywords: ["ALKAPURI RATLAM", "ALKAPURI"],
  },
  {
    area: "College Road Ratlam",
    keywords: ["COLLEGE ROAD RATLAM", "COLLEGE ROAD"],
  },
  {
    area: "Chandni Chowk Ratlam",
    keywords: ["CHANDNI CHOWK", "CHANDNI CHAUK"],
  },
  {
    area: "Khachrod",
    keywords: ["KHACHROD", "KHACHRAUD"],
  },
  {
    area: "Bilpank",
    keywords: ["BILPANK", "BILPAN", "BILPAAK"],
  },
  {
    area: "Sailana",
    keywords: ["SAILANA", "SAILAN"],
  },
  {
    area: "Manasa",
    keywords: ["MANASA"],
  },
  {
    area: "Mandsaur",
    keywords: ["MANDSAUR", "MANDSA"],
  },
  {
    area: "Neemuch",
    keywords: ["NEEMUCH", "NEEMUC"],
  },
  {
    area: "Jaora",
    keywords: ["JAORA"],
  },
  {
    area: "Dhar",
    keywords: ["DHAAR", "DHAR"],
  },
  {
    area: "Manavar",
    keywords: ["MANAWAR", "MANAVAR", "MANAWA"],
  },
  {
    area: "Tonki",
    keywords: ["TONKI"],
  },
  {
    area: "Petlawad",
    keywords: ["PETLAWAD", "PETLAWADA"],
  },
];

function BankImport() {
  const [bankName, setBankName] = useState("Bank of Baroda (BOB)");
  const [fileFormat, setFileFormat] = useState<FileFormat>("unknown");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [cases, setCases] = useState<ImportedCase[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  function normalize(value: unknown) {
    return String(value ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

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

  function hasHeader(
    row: Record<string, unknown>,
    possibleHeaders: string[]
  ) {
    const rowKeys = Object.keys(row).map(normalizeHeader);

    return possibleHeaders.some((header) =>
      rowKeys.includes(normalizeHeader(header))
    );
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

  function resolveArea(
    alpha: string,
    branch: string,
    address: string
  ) {
    const normalizedAlpha = normalize(alpha);

    if (ALPHA_AREA_MAP[normalizedAlpha]) {
      return ALPHA_AREA_MAP[normalizedAlpha];
    }

    const combined = normalize(`${branch} ${address}`);

    for (const rule of ADDRESS_AREA_PRIORITY) {
      const matched = rule.keywords.some((keyword) =>
        combined.includes(normalize(keyword))
      );

      if (matched) {
        return rule.area;
      }
    }

    return "";
  }

  function normalizeAgentArea(area: string | null) {
    if (!area) return "";

    const normalized = normalize(area);

    for (const workingArea of WORKING_AREAS) {
      if (normalize(workingArea) === normalized) {
        return workingArea;
      }
    }

    for (const rule of ADDRESS_AREA_PRIORITY) {
      const matched = rule.keywords.some(
        (keyword) => normalize(keyword) === normalized
      );

      if (matched) {
        return rule.area;
      }
    }

    return area.trim();
  }

  function makeCaseKey(item: { accountNo: string }) {
    return normalize(item.accountNo);
  }

  async function loadActiveAgents() {
    const { data, error } = await supabase
      .from("agents")
      .select("id, name, agent_code, area, status")
      .eq("status", "Active")
      .order("id", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const activeAgents = (data || []) as Agent[];

    setAgents(activeAgents);
    return activeAgents;
  }

  async function loadExistingAccountNumbers() {
    const accountNumbers: string[] = [];
    const pageSize = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("cases")
        .select("account_no")
        .range(from, from + pageSize - 1);

      if (error) {
        throw new Error(error.message);
      }

      const rows = data || [];

      rows.forEach((item) => {
        const key = normalize(item.account_no);

        if (key) accountNumbers.push(key);
      });

      if (rows.length < pageSize) break;

      from += pageSize;
    }

    return accountNumbers;
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setCases([]);
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);
    setStatus("idle");
    setFileFormat("unknown");

    try {
      await loadActiveAgents();
    } catch (error) {
      alert(
        "Executive list error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const fileData = readerEvent.target?.result;

        const workbook = XLSX.read(fileData, {
          type: "array",
        });

        const preferredSheet =
          workbook.SheetNames.find(
            (name) =>
              name.trim().toUpperCase() === "LIST" ||
              name.trim().toUpperCase() === "NPA LIST"
          ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[preferredSheet];

        const rows =
          XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
            raw: true,
          });

        const firstRow = rows[0] || {};

        const detailedFormat =
          hasHeader(firstRow, ["Account ID", "Customer Name"]) &&
          hasHeader(firstRow, ["O/S Balance", "OS Balance"]);

        const compactFormat =
          hasHeader(firstRow, ["A/C No", "A/C Name"]) &&
          hasHeader(firstRow, ["Cust. Bal", "CUST BAL"]);

        const detectedFormat: FileFormat = detailedFormat
          ? "detailed"
          : compactFormat
          ? "compact"
          : "unknown";

        setFileFormat(detectedFormat);

        if (detectedFormat === "unknown") {
          setStatus("idle");
          alert(
            "Excel headers supported format se match nahi hue. A/C No/A/C Name ya Account ID/Customer Name headers check karo."
          );
          return;
        }

        const parsedCases: ImportedCase[] = rows
          .map((row) => {
            const accountNo = getValue(row, [
              "Account ID",
              "A/C No",
              "Account No",
              "Account Number",
            ]);

            const customer = getValue(row, [
              "Customer Name",
              "A/C Name",
              "Borrower Name",
              "Name",
            ]);

            const phone = getValue(row, [
              "MOBILE NO",
              "MOBILE",
              "Mobile No",
              "Mobile",
              "Phone",
              "Contact",
            ]);

            const alpha = getValue(row, ["Alpha"]).toUpperCase();

            const branch = getValue(row, [
              "Branch Name",
              "Branch",
            ]);

            const loanType =
              getValue(row, [
                "Scheme Code",
                "Loan Type",
                "Product",
              ]) || "Recovery";

            const accountSegment = getValue(row, [
              "Account Segment",
              "REV SEG",
            ]);

            const assetClassification = getValue(row, [
              "Asset Classification",
              "Class",
              "Category",
            ]).toUpperCase();

            const detailedOutstanding = getValue(row, [
              "O/S Balance",
              "OS Balance",
              "Outstanding",
              "Loan Amount",
            ]);

            const compactBalance = getValue(row, [
              "Cust. Bal",
              "CUST BAL",
              "Customer Balance",
            ]);

            const amountText =
              detectedFormat === "compact"
                ? compactBalance
                : detailedOutstanding;

            const sanctionText = getValue(row, [
              "Sanction Limit",
            ]);

            const address = getValue(row, [
              "ADDRESS",
              "Address",
              "Location",
            ]);

            const amount = parseLakhAmount(amountText);

            return {
              accountNo,
              customer,
              phone,
              bank: bankName,
              branch,
              alpha,
              loanType,
              accountSegment,
              assetClassification,
              amount,
              pendingAmount: amount,
              sanctionLimit: parseLakhAmount(sanctionText),
              customerBalance: parseLakhAmount(compactBalance),
              address,
              resolvedArea: resolveArea(
                alpha,
                branch,
                address
              ),
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

          if (key && !uniqueCases.has(key)) {
            uniqueCases.set(key, item);
          }
        });

        const readyCases = Array.from(uniqueCases.values());

        setCases(readyCases);
        setStatus("ready");

        if (readyCases.length === 0) {
          alert("Excel read hui, lekin valid cases nahi mile.");
        }
      } catch (error) {
        setStatus("idle");

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

  const areaSummary = useMemo(() => {
    const summary = new Map<string, ImportedCase[]>();

    cases.forEach((item) => {
      const area = item.resolvedArea || "Unmatched Area";
      const oldCases = summary.get(area) || [];

      oldCases.push(item);
      summary.set(area, oldCases);
    });

    return Array.from(summary.entries())
      .map(([area, areaCases]) => {
        const areaAgents = agents.filter(
          (agent) => normalizeAgentArea(agent.area) === area
        );

        return {
          area,
          totalCases: areaCases.length,
          agents: areaAgents,
        };
      })
      .sort((a, b) => b.totalCases - a.totalCases);
  }, [cases, agents]);

  const autoAssignedPreviewCount = useMemo(
    () =>
      areaSummary.reduce(
        (total, item) =>
          total + (item.agents.length > 0 ? item.totalCases : 0),
        0
      ),
    [areaSummary]
  );

  const unassignedPreviewCount =
    cases.length - autoAssignedPreviewCount;

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

    const confirmed = window.confirm(
      [
        "Final Safe Bank Import",
        "",
        `Detected format: ${fileFormat}`,
        `Total unique cases: ${cases.length}`,
        `Auto assigned preview: ${autoAssignedPreviewCount}`,
        `Unassigned preview: ${unassignedPreviewCount}`,
        "",
        "Compact file me Address se area auto-detect hoga.",
        "Detailed file me Alpha/Branch mapping use hogi.",
        "Duplicate Account IDs skip honge.",
        "",
        "Import continue karein?",
      ].join("\n")
    );

    if (!confirmed) return;

    setStatus("importing");
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);

    let activeAgents: Agent[];

    try {
      activeAgents = await loadActiveAgents();
    } catch (error) {
      alert(
        "Executive list error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
      setStatus("ready");
      return;
    }

    let existingAccountNumbers: string[];

    try {
      existingAccountNumbers =
        await loadExistingAccountNumbers();
    } catch (error) {
      alert(
        "Existing cases error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
      setStatus("ready");
      return;
    }

    const existingKeys = new Set(existingAccountNumbers);

    const newCases = cases.filter(
      (item) => !existingKeys.has(makeCaseKey(item))
    );

    const skipped = cases.length - newCases.length;
    setSkippedCount(skipped);

    if (newCases.length === 0) {
      setStatus("imported");
      alert(`New imported: 0\nSkipped duplicates: ${skipped}`);
      return;
    }

    const areaRoundRobin = new Map<string, number>();
    const assignedAgentIds: number[] = [];
    let unassigned = 0;

    const rowsToInsert = newCases.map((item) => {
      const matchingAgents = activeAgents.filter(
        (agent) =>
          normalizeAgentArea(agent.area) === item.resolvedArea
      );

      let selectedAgent: Agent | undefined;

      if (matchingAgents.length > 0) {
        const currentIndex =
          areaRoundRobin.get(item.resolvedArea) || 0;

        selectedAgent =
          matchingAgents[currentIndex % matchingAgents.length];

        areaRoundRobin.set(
          item.resolvedArea,
          currentIndex + 1
        );

        assignedAgentIds.push(selectedAgent.id);
      } else {
        unassigned += 1;
      }

      const assignedText = selectedAgent
        ? `${selectedAgent.agent_code || ""} - ${selectedAgent.name}`
        : "Unassigned";

      return {
        customer_name: item.customer || "Unknown Customer",
        mobile: item.phone,
        bank_name: item.branch
          ? `${bankName} | ${item.branch}`
          : bankName,
        loan_type: item.loanType,
        loan_amount: item.amount,
        pending_amount: item.pendingAmount,
        address: item.address,
        status: "Pending",
        assigned_agent: selectedAgent ? selectedAgent.id : null,
        account_no: item.accountNo,
        branch_name: item.branch,
        scheme_code: item.loanType,
        account_segment: item.accountSegment,
        asset_classification: item.assetClassification,
        sanction_limit: item.sanctionLimit,
        customer_balance: item.customerBalance,
        remarks: [
          `File Format: ${fileFormat}`,
          `Alpha: ${item.alpha || "Not Available"}`,
          `Resolved Area: ${item.resolvedArea || "Unmatched"}`,
          `Area Assignment: ${assignedText}`,
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
            `Imported before error: ${totalImported}`,
            `Error: ${error.message}`,
            "",
            "Same file dobara upload kar sakte ho.",
            "Imported Account IDs automatically skip honge.",
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
        "Final safe import complete.",
        "",
        `Imported: ${totalImported}`,
        `Skipped duplicates: ${skipped}`,
        `Auto assigned: ${totalImported - unassigned}`,
        `Unassigned: ${unassigned}`,
      ].join("\n")
    );
  }

  return (
    <div className="module-card">
      <h1>📄 Smart Auto-Detect Bank Excel Import</h1>

      <p>
        Detailed aur compact dono bank XLS formats supported hain.
        System Alpha, Branch aur Address se area automatically detect karega.
      </p>

      <hr />

      <h3>Select Bank</h3>

      <select
        value={bankName}
        onChange={(event) => setBankName(event.target.value)}
      >
        <option>Bank of Baroda (BOB)</option>
        <option>State Bank of India (SBI)</option>
      </select>

      <br />
      <br />

      <h3>Select Bank Excel</h3>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFile}
      />

      {fileName && (
        <div className="card">
          <h3>Selected File</h3>

          <p><strong>Bank:</strong> {bankName}</p>
          <p><strong>File:</strong> {fileName}</p>
          <p><strong>Detected Format:</strong> {fileFormat}</p>
          <p><strong>Status:</strong> {status}</p>
          <p><strong>Unique Cases:</strong> {cases.length}</p>
          <p>
            <strong>Auto Assigned Preview:</strong>{" "}
            {autoAssignedPreviewCount}
          </p>
          <p>
            <strong>Unassigned Preview:</strong>{" "}
            {unassignedPreviewCount}
          </p>

          {cases.length > 0 && status !== "importing" && (
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
          <h3>Area-wise Distribution Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Resolved Area</th>
                <th>Total Cases</th>
                <th>Active Executives</th>
                <th>Distribution</th>
              </tr>
            </thead>

            <tbody>
              {areaSummary.map((item) => (
                <tr key={item.area}>
                  <td><strong>{item.area}</strong></td>
                  <td>{item.totalCases}</td>
                  <td>
                    {item.agents.length > 0
                      ? item.agents
                          .map(
                            (agent) =>
                              `${agent.agent_code || ""} ${agent.name}`
                          )
                          .join(", ")
                      : "No Active Executive"}
                  </td>
                  <td>
                    {item.agents.length > 0
                      ? `✅ Equal between ${item.agents.length} agent(s)`
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
          <h3>First 20 Cases Preview</h3>

          <table>
            <thead>
              <tr>
                <th>Account No.</th>
                <th>Customer</th>
                <th>Area</th>
                <th>Category</th>
                <th>Segment</th>
                <th>Balance</th>
                <th>Address</th>
              </tr>
            </thead>

            <tbody>
              {cases.slice(0, 20).map((item, index) => (
                <tr key={`${item.accountNo}-${index}`}>
                  <td>{item.accountNo}</td>
                  <td>{item.customer}</td>
                  <td>{item.resolvedArea || "Unmatched"}</td>
                  <td>{item.assetClassification || "-"}</td>
                  <td>{item.accountSegment || "-"}</td>
                  <td>
                    ₹{item.amount.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td>{item.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === "importing" && (
        <div className="card">
          <h3>⏳ Importing cases...</h3>
          <p>Imported so far: {importedCount}</p>
          <p>Skipped duplicates: {skippedCount}</p>
          <p>Unassigned: {unassignedCount}</p>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Complete</h3>
          <p>Imported: {importedCount}</p>
          <p>Skipped duplicates: {skippedCount}</p>
          <p>Auto assigned: {importedCount - unassignedCount}</p>
          <p>Unassigned: {unassignedCount}</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;