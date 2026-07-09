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
  last_latitude?: string | null;
  last_longitude?: string | null;
  last_seen?: string | null;
  is_online?: boolean | null;
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
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

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
    const timer = window.setInterval(loadData, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activeCount = executives.filter((e) => e.status === "Active").length;
  const liveAgents = executives.filter((e) => e.last_latitude && e.last_longitude);
  const todayVisits = visits.length;

  const selectedAgent =
    liveAgents.find((e) => e.id === selectedAgentId) || liveAgents[0];

  const mapLat = selectedAgent?.last_latitude || visits[0]?.latitude;
  const mapLng = selectedAgent?.last_longitude || visits[0]?.longitude;

  return (
    <div className="module-card">
      <h2>📍 GPS Tracking Dashboard</h2>
      <p>Admin ko field executives ki live location aur visit proof yahin milega.</p>

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
          <p>Active executives</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📡</div>
          <h3>Live GPS</h3>
          <h2>{liveAgents.length}</h2>
          <p>Agents with live location</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">📌</div>
          <h3>GPS Records</h3>
          <h2>{todayVisits}</h2>
          <p>Total saved visits</p>
        </div>
      </div>

      <br />

      <div className="module-card">
        <h3>🗺️ Live Tracking Map</h3>
        <p>
          {selectedAgent
            ? `Showing live location: ${selectedAgent.name}`
            : "Latest saved GPS location map par dikh rahi hai."}
        </p>

        {liveAgents.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
            {liveAgents.map((agent) => (
              <button
                key={agent.id}
                className="primary-btn"
                onClick={() => setSelectedAgentId(agent.id)}
                style={{ opacity: selectedAgent?.id === agent.id ? 1 : 0.75 }}
              >
                {agent.is_online ? "🟢" : "🔴"} {agent.name}
              </button>
            ))}
          </div>
        )}

        {mapLat && mapLng ? (
          <iframe
            key={`${mapLat}-${mapLng}`}
            title="Live GPS Map"
            src={`https://maps.google.com/maps?q=${mapLat},${mapLng}&z=16&output=embed`}
            width="100%"
            height="360"
            style={{
              border: 0,
              borderRadius: "18px",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
            }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              height: "260px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #dbeafe, #f0f9ff, #e0f2fe)",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <div>
              <h2>🗺️ No GPS Yet</h2>
              <p>Executive app se live location ya Check In save karo.</p>
            </div>
          </div>
        )}
      </div>

      <br />

      <h3>👨‍💼 Executive Live Tracking List</h3>

      <table>
        <thead>
          <tr>
            <th>Executive</th>
            <th>Phone</th>
            <th>Area</th>
            <th>Vehicle</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Live Map</th>
          </tr>
        </thead>

        <tbody>
          {executives.map((item) => {
            const hasLive = item.last_latitude && item.last_longitude;

            return (
              <tr key={item.id}>
                <td>
                  <button
                    onClick={() => hasLive && setSelectedAgentId(item.id)}
                    style={{
                      border: 0,
                      background: "transparent",
                      cursor: hasLive ? "pointer" : "default",
                      fontWeight: 700,
                    }}
                  >
                    {item.name}
                  </button>
                </td>
                <td>{item.phone}</td>
                <td>{item.area}</td>
                <td>{item.vehicle}</td>
                <td>{item.is_online ? "🟢 Online" : "🔴 Offline"}</td>
                <td>{item.last_seen || "Not updated"}</td>
                <td>
                  {hasLive ? (
                    <a
                      href={`https://www.google.com/maps?q=${item.last_latitude},${item.last_longitude}`}
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