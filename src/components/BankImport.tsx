import {
  type ChangeEvent,
  useMemo,
  useState,
} from "react";

import { supabase } from "../supabaseClient";

import {
  createCaseDatabaseRow,
  normalizeText,
  parseBankExcel,
  type BankFileFormat,
  type ParsedCase,
} from "../utils/caseImport";

type ImportStatus =
  | "idle"
  | "ready"
  | "importing"
  | "imported";

type Agent = {
  id: number;
  name: string;
  agent_code: string | null;
  area: string | null;
  status: string | null;
};

type AreaSummaryItem = {
  area: string;
  totalCases: number;
  agents: Agent[];
};

function BankImport() {
  const [bankName, setBankName] = useState(
    "Bank of Baroda (BOB)"
  );

  const [fileName, setFileName] = useState("");
  const [fileFormat, setFileFormat] =
    useState<BankFileFormat>("unknown");

  const [status, setStatus] =
    useState<ImportStatus>("idle");

  const [cases, setCases] = useState<ParsedCase[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  const [duplicatePreviewCount, setDuplicatePreviewCount] =
    useState(0);

  const [missingAddressCount, setMissingAddressCount] =
    useState(0);

  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [unassignedCount, setUnassignedCount] =
    useState(0);

  function normalizeArea(value: string | null) {
    return normalizeText(value);
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
    const existing = new Set<string>();
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
        const key = normalizeText(item.account_no);

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

  async function handleFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setCases([]);
    setFileFormat("unknown");
    setDuplicatePreviewCount(0);
    setMissingAddressCount(0);
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);
    setStatus("idle");

    try {
      await loadActiveAgents();

      const result = await parseBankExcel(
        file,
        bankName
      );

      setFileFormat(result.format);
      setCases(result.cases);
      setDuplicatePreviewCount(
        result.duplicateCount
      );
      setMissingAddressCount(
        result.missingAddressCount
      );
      setStatus("ready");

      if (result.cases.length === 0) {
        alert(
          "Excel read hui, lekin valid cases nahi mile."
        );
      }
    } catch (error) {
      setStatus("idle");

      alert(
        "Excel read error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    }
  }

  const areaSummary = useMemo<AreaSummaryItem[]>(() => {
    const summary = new Map<string, ParsedCase[]>();

    cases.forEach((item) => {
      const area =
        item.resolvedArea || "Unmatched Area";

      const oldCases = summary.get(area) || [];

      oldCases.push(item);
      summary.set(area, oldCases);
    });

    return Array.from(summary.entries())
      .map(([area, areaCases]) => {
        const matchingAgents = agents.filter(
          (agent) =>
            normalizeArea(agent.area) ===
            normalizeText(area)
        );

        return {
          area,
          totalCases: areaCases.length,
          agents: matchingAgents,
        };
      })
      .sort(
        (first, second) =>
          second.totalCases - first.totalCases
      );
  }, [cases, agents]);

  const autoAssignedPreviewCount = useMemo(
    () =>
      areaSummary.reduce(
        (total, item) =>
          total +
          (item.agents.length > 0
            ? item.totalCases
            : 0),
        0
      ),
    [areaSummary]
  );

  const unassignedPreviewCount =
    cases.length - autoAssignedPreviewCount;

  async function refreshAgentCaseCounts(
    agentIds: number[]
  ) {
    const uniqueAgentIds = Array.from(
      new Set(agentIds)
    );

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
          .update({
            cases: count || 0,
          })
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
        "Unified Safe Bank Import",
        "",
        `File format: ${fileFormat}`,
        `Unique cases: ${cases.length}`,
        `Excel duplicates removed: ${duplicatePreviewCount}`,
        `Missing addresses: ${missingAddressCount}`,
        `Auto assigned preview: ${autoAssignedPreviewCount}`,
        `Unassigned preview: ${unassignedPreviewCount}`,
        "",
        "Existing Account IDs skip honge.",
        "Same database schema har import me use hoga.",
        "",
        "Import continue karein?",
      ].join("\n")
    );

    if (!confirmed) return;

    setStatus("importing");
    setImportedCount(0);
    setSkippedCount(0);
    setUnassignedCount(0);

    try {
      const activeAgents =
        await loadActiveAgents();

      const existingKeys =
        await loadExistingAccountNumbers();

      const newCases = cases.filter(
        (item) =>
          !existingKeys.has(
            normalizeText(item.accountNo)
          )
      );

      const skipped =
        cases.length - newCases.length;

      setSkippedCount(skipped);

      if (newCases.length === 0) {
        setStatus("imported");

        alert(
          `New imported: 0\nSkipped existing cases: ${skipped}`
        );

        return;
      }

      const areaRoundRobin =
        new Map<string, number>();

      const assignedAgentIds: number[] = [];
      let unassigned = 0;

      const rowsToInsert = newCases.map((item) => {
        const matchingAgents =
          activeAgents.filter(
            (agent) =>
              normalizeArea(agent.area) ===
              normalizeText(item.resolvedArea)
          );

        let selectedAgent: Agent | undefined;

        if (matchingAgents.length > 0) {
          const currentIndex =
            areaRoundRobin.get(
              item.resolvedArea
            ) || 0;

          selectedAgent =
            matchingAgents[
              currentIndex %
                matchingAgents.length
            ];

          areaRoundRobin.set(
            item.resolvedArea,
            currentIndex + 1
          );

          assignedAgentIds.push(
            selectedAgent.id
          );
        } else {
          unassigned += 1;
        }

        const assignmentText = selectedAgent
          ? `${
              selectedAgent.agent_code || ""
            } - ${selectedAgent.name}`
          : "Unassigned";

        return createCaseDatabaseRow(item, {
          assignedAgentId:
            selectedAgent?.id ?? null,
          sourceFileName: fileName,
          assignmentText,
        });
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
              "Already imported Account IDs skip honge.",
            ].join("\n")
          );

          return;
        }

        totalImported += chunk.length;
        setImportedCount(totalImported);
      }

      await refreshAgentCaseCounts(
        assignedAgentIds
      );

      setImportedCount(totalImported);
      setStatus("imported");

      alert(
        [
          "Unified import complete.",
          "",
          `Imported: ${totalImported}`,
          `Skipped existing: ${skipped}`,
          `Auto assigned: ${
            totalImported - unassigned
          }`,
          `Unassigned: ${unassigned}`,
        ].join("\n")
      );
    } catch (error) {
      setStatus("ready");

      alert(
        "Import error: " +
          (error instanceof Error
            ? error.message
            : "Unknown error")
      );
    }
  }

  return (
    <div className="module-card">
      <h1>📄 Unified Bank Excel Import</h1>

      <p>
        Detailed aur compact dono XLS formats ek hi
        shared import engine se process honge.
      </p>

      <hr />

      <h3>Select Bank</h3>

      <select
        value={bankName}
        onChange={(event) =>
          setBankName(event.target.value)
        }
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

          <p>
            <strong>Bank:</strong> {bankName}
          </p>

          <p>
            <strong>File:</strong> {fileName}
          </p>

          <p>
            <strong>Format:</strong> {fileFormat}
          </p>

          <p>
            <strong>Status:</strong> {status}
          </p>

          <p>
            <strong>Unique Cases:</strong>{" "}
            {cases.length}
          </p>

          <p>
            <strong>Excel Duplicates:</strong>{" "}
            {duplicatePreviewCount}
          </p>

          <p>
            <strong>Missing Address:</strong>{" "}
            {missingAddressCount}
          </p>

          <p>
            <strong>
              Auto Assigned Preview:
            </strong>{" "}
            {autoAssignedPreviewCount}
          </p>

          <p>
            <strong>Unassigned Preview:</strong>{" "}
            {unassignedPreviewCount}
          </p>

          {cases.length > 0 &&
            status !== "importing" && (
              <button
                className="primary-btn"
                onClick={importCases}
              >
                Auto Assign & Import{" "}
                {cases.length} Cases
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
                  <td>
                    <strong>{item.area}</strong>
                  </td>

                  <td>{item.totalCases}</td>

                  <td>
                    {item.agents.length > 0
                      ? item.agents
                          .map(
                            (agent) =>
                              `${
                                agent.agent_code ||
                                ""
                              } ${agent.name}`
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
              {cases
                .slice(0, 20)
                .map((item, index) => (
                  <tr
                    key={`${item.accountNo}-${index}`}
                  >
                    <td>{item.accountNo}</td>
                    <td>{item.customerName}</td>
                    <td>
                      {item.resolvedArea ||
                        "Unmatched"}
                    </td>
                    <td>
                      {item.assetClassification ||
                        "-"}
                    </td>
                    <td>
                      {item.accountSegment || "-"}
                    </td>
                    <td>
                      ₹
                      {item.loanAmount.toLocaleString(
                        "en-IN",
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>
                    <td>
                      {item.address || "-"}
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
          <p>Skipped existing: {skippedCount}</p>
          <p>Unassigned: {unassignedCount}</p>
        </div>
      )}

      {status === "imported" && (
        <div className="card">
          <h3>✅ Import Complete</h3>
          <p>Imported: {importedCount}</p>
          <p>Skipped existing: {skippedCount}</p>
          <p>
            Auto assigned:{" "}
            {importedCount - unassignedCount}
          </p>
          <p>Unassigned: {unassignedCount}</p>
        </div>
      )}
    </div>
  );
}

export default BankImport;