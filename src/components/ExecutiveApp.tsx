import { useState } from "react";

function ExecutiveApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");

  if (!loggedIn) {
    return (
      <div className="module-card">
        <h2>📱 Executive Login</h2>
        <p>Field executive apne mobile number se login karega.</p>

        <input
          placeholder="Mobile Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <br />
        <br />

        <button
          className="primary-btn"
          onClick={() => {
            if (!phone) {
              alert("Mobile number bharo.");
              return;
            }
            setLoggedIn(true);
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="module-card">
      <h2>🏠 Executive Home</h2>
      <p>Welcome Field Executive</p>

      <div className="cards-grid">
        <div className="stat-card">
          <div className="card-icon">📋</div>
          <h3>Assigned Cases</h3>
          <h2>0</h2>
          <p>Aaj ke assigned cases</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🚗</div>
          <h3>Today Visits</h3>
          <h2>0</h2>
          <p>Aaj ke visits</p>
        </div>

        <div className="stat-card">
          <div className="card-icon">🟢</div>
          <h3>Duty Status</h3>
          <h2>Online</h2>
          <p>Tracking ready</p>
        </div>
      </div>

      <br />

      <button className="primary-btn">▶️ Start Duty</button>{" "}
      <button className="delete-btn">⏹️ End Duty</button>

      <br />
      <br />

      <button onClick={() => setLoggedIn(false)}>Logout</button>
    </div>
  );
}

export default ExecutiveApp;