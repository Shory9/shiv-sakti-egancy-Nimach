import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Executive = {
  id: number;
  name: string;
  phone: string;
  area: string;
  vehicle: string;
  cases: number;
  status: "Active" | "Inactive";
};

function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");

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
        name: item.name || "",
        phone: item.phone || "",
        area: item.area || "",
        vehicle: item.vehicle || "",
        cases: item.cases || 0,
        status: item.status === "Inactive" ? "Inactive" : "Active",
      }))
    );
  }

  useEffect(() => {
    loadExecutives();
  }, []);

  async function addExecutive() {
    if (!name || !phone || !area) {
      alert("Name, phone aur area required hai.");
      return;
    }

    const { error } = await supabase.from("agents").insert({
      name,
      phone,
      area,
      vehicle,
      cases: 0,
      status: "Active",
    });

    if (error) {
      alert("Executive add error: " + error.message);
      return;
    }

    setName("");
    setPhone("");
    setArea("");
    setVehicle("");
    loadExecutives();
  }

  async function deleteExecutive(id: number) {
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
      <h2>👨‍💼 Executive Management</h2>
      <p>Recovery field executives ko manage karo.</p>

      <hr />

      <input
        placeholder="Executive Name"
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
        placeholder="Working Area"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Vehicle"
        value={vehicle}
        onChange={(e) => setVehicle(e.target.value)}
      />

      <br />
      <br />

      <button className="primary-btn" onClick={addExecutive}>
        + Add Executive
      </button>

      <br />
      <br />

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Vehicle</th>
            <th>Cases</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {executives.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.phone}</td>
              <td>{item.area}</td>
              <td>{item.vehicle}</td>
              <td>{item.cases}</td>
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