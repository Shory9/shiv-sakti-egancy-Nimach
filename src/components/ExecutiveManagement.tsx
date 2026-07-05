import { useEffect, useState } from "react";

type Executive = {
  id: number;
  name: string;
  phone: string;
  area: string;
  vehicle: string;
  cases: number;
  status: "Active" | "Inactive";
};

const defaultExecutives: Executive[] = [
  {
    id: 1,
    name: "Amit",
    phone: "9876543210",
    area: "Neemuch City",
    vehicle: "Bike",
    cases: 42,
    status: "Active",
  },
  {
    id: 2,
    name: "Rahul",
    phone: "9123456780",
    area: "Manasa",
    vehicle: "Bike",
    cases: 31,
    status: "Active",
  },
  {
    id: 3,
    name: "Vikram",
    phone: "9988776655",
    area: "Jawad",
    vehicle: "Scooter",
    cases: 27,
    status: "Inactive",
  },
];

function ExecutiveManagement() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("executives");

    if (saved) {
      setExecutives(JSON.parse(saved));
    } else {
      setExecutives(defaultExecutives);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("executives", JSON.stringify(executives));
  }, [executives]);

  function addExecutive() {
    if (!name || !phone || !area) return;

    const newExecutive: Executive = {
      id: Date.now(),
      name,
      phone,
      area,
      vehicle,
      cases: 0,
      status: "Active",
    };

    setExecutives([newExecutive, ...executives]);

    setName("");
    setPhone("");
    setArea("");
    setVehicle("");
  }

  function deleteExecutive(id: number) {
    setExecutives(executives.filter((e) => e.id !== id));
  }

  return (
    <div className="module-card">
      <h2>👨‍💼 Executive Management</h2>

      <p>Manage recovery field executives.</p>

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