import { useEffect, useState } from "react";
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

function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");

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