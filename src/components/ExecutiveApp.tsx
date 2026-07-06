import { type ChangeEvent, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Executive = {
  id: number;
  name: string;
  phone: string;
  area: string;
  status?: string;
  cases?: number;
};

type MyCase = {
  id: string;
  customer: string;
  phone: string;
  bank: string;
  amount: number;
  agent: string;
  status: "Pending" | "Visited" | "Paid" | "Overdue";
};

function ExecutiveApp() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [executive, setExecutive] = useState<Executive | null>(null);
  const [myCases, setMyCases] = useState<MyCase[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem("executive_session");
    if (saved) {
      const data = JSON.parse(saved);
      setExecutive(data);
      setLoggedIn(true);
      loadMyCases(data.name);
    }
  }, []);

  async function loginExecutive() {
    if (!phone.trim()) {
      alert("Mobile Number Required");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("phone", phone.trim())
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Executive Not Found");
      return;
    }

    localStorage.setItem("executive_session", JSON.stringify(data));
    setExecutive(data);
    setLoggedIn(true);
    loadMyCases(data.name);
  }

  async function loadMyCases(name: string) {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("agent", name)
      .order("id", { ascending: false });

    if (error) {
      alert("My Cases load error: " + error.message);
      return;
    }

    setMyCases((data || []) as MyCase[]);
  }

  function handlePhoto(caseId: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotos((old) => ({ ...old, [caseId]: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function saveVisit(item: MyCase, status: "Checked In" | "Checked Out") {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase.from("gps_visits").insert({
          executive: executive?.name || "",
          customer: item.customer,
          area: executive?.area || "",
          status,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          remarks: remarks[item.id] || "",
          photo: photos[item.id] || "",
          time: new Date().toLocaleString("en-IN"),
        });

        if (error) {
          alert("GPS save error: " + error.message);
          return;
        }

        if (status === "Checked Out") {
          await supabase
            .from("cases")
            .update({ status: "Visited" })
            .eq("id", item.id);

          setMyCases((old) =>
            old.map((c) => (c.id === item.id ? { ...c, status: "Visited" } : c))
          );
        }

        alert(`${status} saved successfully`);
      },
      () => {
        alert("Location permission allow karo.");
      }
    );
  }

  function logout() {
    localStorage.removeItem("executive_session");
    setExecutive(null);
    setLoggedIn(false);
    setPhone("");
    setMyCases([]);
  }

  if (!loggedIn) {
    return (
      <div className="module-card">
        <h2>📱 Executive Login</h2>
        <p>Login using your registered mobile number.</p>

        <input
          placeholder="Mobile Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <br />
        <br />

        <button className="primary-btn" onClick={loginExecutive}>
          {loading ? "Please Wait..." : "Login"}
        </button>
      </div>
    );
  }

  return (
    <div className="module-card">
      <h2>👨‍💼 Executive Dashboard</h2>
      <p>
        Welcome <b>{executive?.name}</b> | Area: {executive?.area}
      </p>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-icon">📋</div>
          <h3>My Cases</h3>
          <h2>{myCases.length}</h2>
          <p>Assigned cases</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🟢</div>
          <h3>Status</h3>
          <h2>{executive?.status || "Active"}</h2>
          <p>Duty ready</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📞</div>
          <h3>Phone</h3>
          <h2>{executive?.phone}</h2>
          <p>Registered number</p>
        </div>
      </div>

      <br />

      <button className="delete-btn" onClick={logout}>
        Logout
      </button>

      <br />
      <br />

      <h3>📋 My Assigned Cases</h3>

      {myCases.length === 0 && <p>No assigned cases found.</p>}

      {myCases.map((item) => (
        <div className="module-card" key={item.id}>
          <h3>{item.customer}</h3>
          <p>📞 {item.phone}</p>
          <p>🏦 {item.bank}</p>
          <p>💰 ₹{item.amount?.toLocaleString("en-IN")}</p>
          <p>📌 Status: {item.status}</p>

          <a href={`tel:${item.phone}`}>
            <button className="primary-btn">☎ Call</button>
          </a>{" "}

          <button className="primary-btn" onClick={() => saveVisit(item, "Checked In")}>
            📍 Check In
          </button>{" "}

          <button className="delete-btn" onClick={() => saveVisit(item, "Checked Out")}>
            ⏹ Check Out
          </button>

          <br />
          <br />

          <input type="file" accept="image/*" onChange={(e) => handlePhoto(item.id, e)} />

          <br />
          <br />

          <input
            placeholder="Visit remarks"
            value={remarks[item.id] || ""}
            onChange={(e) =>
              setRemarks((old) => ({ ...old, [item.id]: e.target.value }))
            }
          />

          {photos[item.id] && (
            <>
              <br />
              <br />
              <img
                src={photos[item.id]}
                alt="Proof"
                style={{
                  width: "100px",
                  height: "80px",
                  objectFit: "cover",
                  borderRadius: "8px",
                }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default ExecutiveApp;