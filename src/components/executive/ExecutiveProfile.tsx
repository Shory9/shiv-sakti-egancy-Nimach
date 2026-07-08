import type { Executive } from "./executiveTypes";

type Props = {
  executive: Executive;
  logout: () => void;
};

function ExecutiveProfile({ executive, logout }: Props) {
  return (
    <>
      <div className="exec-title">
        <h2>👤 Profile</h2>
        <p>Executive details</p>
      </div>

      <div className="exec-card">
        <h2>{executive.name}</h2>
        <p>📞 {executive.phone}</p>
        <p>📍 {executive.area}</p>
        <p>🚗 {executive.vehicle || "No vehicle"}</p>
        <p>🟢 {executive.status || "Active"}</p>

        <button className="exec-danger-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </>
  );
}

export default ExecutiveProfile;