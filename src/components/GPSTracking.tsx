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

type Visit = {
  id: number;
  executive: string;
  customer: string;
  area: string;
  status: "Checked In" | "Checked Out";
  latitude: string;
  longitude: string;
  remarks: string;
  time: string;
  photo?: string;
};

function GPSTracking() {
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  async function loadData() {
    const agentsResult = await supabase
      .from("agents")
      .select("*")
      .order("id", { ascending: false });

    const visitsResult = await supabase
      .from("gps_visits")
      .select("*")
      .order("id", { ascending: false });

    if (agentsResult.error) {
      alert("Executive load error: " + agentsResult.error.message);
      return;
    }

    if (visitsResult.error) {
      alert("GPS visits load error: " + visitsResult.error.message);
      return;
    }

    setExecutives((agentsResult.data || []) as Executive[]);
    setVisits((visitsResult.data || []) as Visit[]);
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeCount = executives.filter((e) => e.status === "Active").length;
  const inactiveCount = executives.filter((e) => e.status === "Inactive").length;
  const todayVisits = visits.length;

  return (
    <div className="module-card">
      <h2>📍 GPS Tracking Dashboard</h2>
      <p>Admin ko field executives ki live tracking summary dikhane ke liye.</p>

      <hr />

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-icon">👨‍💼</div>
          <h3>Total Executives</h3>
          <h2>{executives.length}</h2>
          <p>Field team members</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🟢</div>
          <h3>Active</h3>
          <h2>{activeCount}</h2>
          <p>Currently active executives</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🔴</div>
          <h3>Inactive</h3>
          <h2>{inactiveCount}</h2>
          <p>Inactive executives</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📌</div>
          <h3>GPS Records</h3>
          <h2>{todayVisits}</h2>
          <p>Total saved GPS visits</p>
        </div>
      </div>

      <br />

      <div className="module-card">
        <h3>🗺️ Live Tracking Map</h3>
        <p>Executive ki last GPS location map par open kar sakte ho.</p>

        <div
          style={{
            height: "260px",
            borderRadius: "18px",
            background:
              "linear-gradient(135deg, #dbeafe, #f0f9ff, #e0f2fe)",
            border: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "20px",
          }}
        >
          <div>
            <h2>🗺️ GPS Map Preview</h2>
            <p>
              Neeche ke table me <b>Open Map</b> par click karke executive ki
              exact location dekho.
            </p>
          </div>
        </div>
      </div>

      <br />

      <h3>👨‍💼 Executive Tracking List</h3>

      <table>
        <thead>
          <tr>
            <th>Executive</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Vehicle</th>
            <th>Cases</th>
            <th>Status</th>
            <th>Tracking</th>
          </tr>
        </thead>

        <tbody>
          {executives.map((item) => {
            const lastVisit = visits.find((v) => v.executive === item.name);

            return (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.phone}</td>
                <td>{item.area}</td>
                <td>{item.vehicle}</td>
                <td>{item.cases}</td>
                <td>{item.status === "Active" ? "🟢 Active" : "🔴 Inactive"}</td>
                <td>
                  {lastVisit ? (
                    <a
                      href={`https://www.google.com/maps?q=${lastVisit.latitude},${lastVisit.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Map
                    </a>
                  ) : (
                    "No GPS"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <br />

      <h3>📋 Latest GPS Visit Records</h3>

      <table>
        <thead>
          <tr>
            <th>Executive</th>
            <th>Customer</th>
            <th>Area</th>
            <th>Status</th>
            <th>GPS</th>
            <th>Photo</th>
            <th>Remarks</th>
            <th>Time</th>
          </tr>
        </thead>

        <tbody>
          {visits.map((item) => (
            <tr key={item.id}>
              <td>{item.executive}</td>
              <td>{item.customer}</td>
              <td>{item.area}</td>
              <td>{item.status}</td>
              <td>
                <a
                  href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Map
                </a>
              </td>
              <td>
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt="Proof"
                    style={{
                      width: "70px",
                      height: "50px",
                      objectFit: "cover",
                      borderRadius: "8px",
                    }}
                  />
                ) : (
                  "No Photo"
                )}
              </td>
              <td>{item.remarks}</td>
              <td>{item.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GPSTracking;