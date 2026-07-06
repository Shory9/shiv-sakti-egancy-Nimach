import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

type Executive = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  area: string;
  vehicle?: string;
  status?: string;
  cases?: number;
};

function ExecutiveApp() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [executive, setExecutive] = useState<Executive | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("executive_session");

    if (saved) {
      const data = JSON.parse(saved);
      setExecutive(data);
      setLoggedIn(true);
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
  }

  function logout() {
    localStorage.removeItem("executive_session");
    setExecutive(null);
    setLoggedIn(false);
    setPhone("");
  }

  if (!loggedIn) {
    return (
      <div className="module-card">
        <h2>📱 Executive Login</h2>
        <p>Login using your registered mobile number.</p>

        <br />

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
        Welcome <b>{executive?.name}</b>
      </p>

      <br />

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-icon">👤</div>
          <h3>Name</h3>
          <h2>{executive?.name}</h2>
          <p>Field Executive</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📍</div>
          <h3>Area</h3>
          <h2>{executive?.area}</h2>
          <p>Working Area</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📞</div>
          <h3>Phone</h3>
          <h2>{executive?.phone}</h2>
          <p>Registered Number</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🟢</div>
          <h3>Status</h3>
          <h2>{executive?.status || "Active"}</h2>
          <p>Duty ready</p>
        </div>
      </div>

      <br />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button className="primary-btn">▶️ Start Duty</button>
        <button className="delete-btn">⏹ End Duty</button>
        <button onClick={logout}>Logout</button>
      </div>

      <br />

      <div className="module-card">
        <h3>📋 Today's Summary</h3>

        <table>
          <tbody>
            <tr>
              <td>Assigned Cases</td>
              <td>{executive?.cases || 0}</td>
            </tr>
            <tr>
              <td>Visited Cases</td>
              <td>0</td>
            </tr>
            <tr>
              <td>Pending Cases</td>
              <td>{executive?.cases || 0}</td>
            </tr>
            <tr>
              <td>GPS Status</td>
              <td>Ready</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ExecutiveApp;