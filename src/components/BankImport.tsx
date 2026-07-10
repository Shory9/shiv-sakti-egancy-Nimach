import { type ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../supabaseClient";

type ImportStatus = "idle" | "ready" | "importing" | "imported";

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
  resolvedArea: string;
};

type Agent = {
  id: number;
  name: string;
  agent_code: string | null;
  area: string | null;
  status: string | null;
};

type AreaRule = {
  area: string;
  keywords: string[];
};

const AREA_RULES: AreaRule[] = [
  {
    area: "CRPF Neemuch",
    keywords: ["CRPF NEEMUCH", "CRPF ROAD NEEMUCH", "CRPF ROAD"],
  },
  {
    area: "Pustak Bajar Neemuch",
    keywords: [
      "PUSTAK BAJAR NEEMUCH",
      "PUSTAK BAZAR NEEMUCH",
      "PUSTAK BAJAR",
      "PUSTAK BAZAR",
    ],
  },
  {
    area: "MEN DB Mandsaur",
    keywords: [
      "MEN DB MANDSAUR",
      "DB MANDSAUR",
      "DBMSUR",
      "MEN DB",
    ],
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
    keywords: [
      "CHANDNI CHOWK RATLAM",
      "CHANDNI CHAUK RATLAM",
      "CHANDNI CHOWK",
      "CHANDNI CHAUK",
    ],
  },
  {
    area: "Khachrod",
    keywords: ["KHACHROD", "KHACHRAUD", "KHACHROD ROAD"],
  },
  {
    area: "Bilpank",
    keywords: ["BILPANK", "BILPAN", "BILPAAK"],
  },
  {
    area: "Bamaniya",
    keywords: ["BAMANIYA", "BAMANI"],
  },
  {
    area: "Petlawad",
    keywords: ["PETLAWAD", "PETLAWADA"],
  },
  {
    area: "Dhar",
    keywords: ["DHAAR", "DHAR"],
  },
  {
    area: "Manavar",
    keywords: ["MANAVAR", "MANAWAR", "MANAWA"],
  },
  {
    area: "Tonki",
    keywords: ["TONKI"],
  },
  {
    area: "Jaora",
    keywords: ["JAORA"],
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
    keywords: [
      "VIJAY NAGAR NEEMUCH",
      "VJNEEM",
      "NEEMUCH",
      "NEEMUC",
    ],
  },
];

function BankImport() {
  const [bankName, setBankName] = useState("State Bank of India (SBI)");
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

    for (const header of possibleHeaders) {
      const wanted = normalizeHeader(header);

      const partialKey = rowKeys.find((key) =>
        normalizeHeader(key).includes(wanted)
      );

      if (partialKey) {
        return String(row[partialKey] ?? "").trim();
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

  function resolveArea(
    alpha: string,
    branch: string,
    address: string
  ) {
    const combined = normalize(`${branch} ${address} ${alpha}`);

    for (const rule of AREA_RULES) {
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

    for (const rule of AREA_RULES) {
      if (normalize(rule.area) === normalized) {
        return rule.area;
      }

      const matched = rule.keywords.some(
        (keyword) => normalize(keyword) === normalized
      );

      if (matched) {
        return rule.area;
      }
    }

    return area.trim();
  }

  function makeCaseKey(item: {
    accountNo?: string;
    customer: string;
    phone: string;
    bank: string;
  }) {
    const accountNo = normalize(item.accountNo || "");

    if (accountNo) {
      return `ACCOUNT:${accountNo}`;
    }

    return [
      "FALLBACK",
      normalize(item.customer),
      normalize(item.phone),
      normalize(item.bank),
    ].join("|");
  }

  function extractAccountNo(remarks: string | null) {
    if (!remarks) return "";

    const match = remarks.match(/Account No:\s*([^|]+)/i);

    return match ? match[1].trim() : "";
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

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setCases([]);
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);
    setStatus("idle");

    try {
      await loadActiveAgents();
    } catch (error) {
      alert(
        "Executive list error: " +
          (error instanceof Error ? error.message : "Unknown error")
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
              resolvedArea: resolveArea(alpha, branch, address),
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
          alert("Excel read hui, lekin valid cases nahi mile.");
        }
      } catch {
        setStatus("idle");
        alert("Excel read error. File format check karo.");
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
        "Area-wise automatic case assignment",
        "",
        `Total unique cases: ${cases.length}`,
        `Auto assigned preview: ${autoAssignedPreviewCount}`,
        `Unassigned preview: ${unassignedPreviewCount}`,
        "",
        "Same area ke active agents ke beech cases equal distribute honge.",
        "Jis area me active agent nahi hai, cases Unassigned rahenge.",
        "Existing duplicate account numbers skip honge.",
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
          (error instanceof Error ? error.message : "Unknown error")
      );
      setStatus("ready");
      return;
    }

    let existingData;

    try {
      existingData = await loadAllExistingCases();
    } catch (error) {
      alert(
        "Existing cases error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
      setStatus("ready");
      return;
    }

    const existingKeys = new Set<string>();

    existingData.forEach((item) => {
      existingKeys.add(
        makeCaseKey({
          accountNo: extractAccountNo(item.remarks),
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
        `New imported: 0\nSkipped duplicates: ${skipped}`
      );

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
        pending_amount: item.pendingAmount || item.amount,
        address: item.address,
        status: "Pending",

        assigned_agent: selectedAgent
          ? selectedAgent.id
          : null,

        remarks: [
          `Account No: ${item.accountNo || "Not Available"}`,
          `Alpha: ${item.alpha || "Not Available"}`,
          `Branch: ${item.branch || "Not Available"}`,
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
            "Imported account numbers automatically skip honge.",
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
        `Auto assigned: ${totalImported - unassigned}`,
        `Unassigned: ${unassigned}`,
      ].join("\n")
    );
  }

  return (
    <div className="module-card">
      <h1>📄 Bank Excel Area-wise Auto Assignment</h1>

      <p>
        Complete bank Excel upload karo. Cases executive ke Working Area
        ke hisaab se automatically aur equally distribute honge.
      </p>

      <hr />

      <h3>Select Bank</h3>

      <select
        value={bankName}
        onChange={(event) => setBankName(event.target.value)}
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

          <p><strong>Bank:</strong> {bankName}</p>
          <p><strong>File:</strong> {fileName}</p>
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
                <th>Alpha</th>
                <th>Branch</th>
                <th>Resolved Area</th>
                <th>Balance</th>
              </tr>
            </thead>

            <tbody>
              {cases.slice(0, 20).map((item, index) => (
                <tr key={`${item.accountNo}-${index}`}>
                  <td>{item.accountNo}</td>
                  <td>{item.customer}</td>
                  <td>{item.alpha}</td>
                  <td>{item.branch}</td>
                  <td>{item.resolvedArea || "Unmatched"}</td>
                  <td>
                    ₹{item.amount.toLocaleString("en-IN")}
                  </td>
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
          <p>
            Auto assigned: {importedCount - unassignedCount}
          </p>
          <p>Unassigned: {unassignedCount}</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;