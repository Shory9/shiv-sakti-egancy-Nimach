import type { Executive, MyCase, VisitRecord } from "./executiveTypes";

type Screen = "dashboard" | "cases" | "gps" | "profile";

type Props = {
  executive: Executive;
  myCases: MyCase[];
  visits: VisitRecord[];
  goTo: (screen: Screen) => void;
};

function ExecutiveDashboard({ executive, myCases, visits, goTo }: Props) {
  const visitedCases = myCases.filter((c) => c.status === "Visited").length;
  const pendingCases = myCases.filter((c) => c.status === "Pending").length;

  return (
    <>
      <div className="exec-header">
        <div>
          <p>Welcome back</p>
          <h2>{executive.name}</h2>
          <span>📍 {executive.area}</span>
        </div>
        <div className="exec-online">🟢 Online</div>
      </div>

      <div className="exec-grid">
        <div className="exec-stat">
          <span>📋</span>
          <h3>{myCases.length}</h3>
          <p>Assigned Cases</p>
        </div>

        <div className="exec-stat">
          <span>📍</span>
          <h3>{visits.length}</h3>
          <p>Total Visits</p>
        </div>

        <div className="exec-stat">
          <span>✅</span>
          <h3>{visitedCases}</h3>
          <p>Visited</p>
        </div>

        <div className="exec-stat">
          <span>⏳</span>
          <h3>{pendingCases}</h3>
          <p>Pending</p>
        </div>
      </div>

      <div className="exec-card">
        <h3>Quick Actions</h3>

        <div className="exec-action-list">
          <button onClick={() => goTo("cases")}>📋 My Cases</button>
          <button onClick={() => goTo("gps")}>📍 GPS Records</button>
          <button onClick={() => goTo("profile")}>👤 Profile</button>
        </div>
      </div>

      <div className="exec-card">
        <h3>Latest Update</h3>
        <p>
          {myCases.length === 0
            ? "No new cases assigned."
            : `${myCases.length} cases assigned for recovery.`}
        </p>
      </div>
    </>
  );
}

export default ExecutiveDashboard;