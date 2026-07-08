import type { Executive, VisitRecord } from "./executiveTypes";

type Props = {
  executive: Executive;
  visits: VisitRecord[];
};

function ExecutiveGPS({ executive, visits }: Props) {
  return (
    <>
      <div className="exec-title">
        <h2>📍 GPS Tracking</h2>
        <p>{executive.name} Visit History</p>
      </div>

      {visits.length === 0 && (
        <div className="exec-card">
          No GPS records found.
        </div>
      )}

      {visits.map((item) => (
        <div className="exec-card" key={item.id}>
          <h3>{item.customer}</h3>

          <p>📍 {item.status}</p>
          <p>🕒 {item.time}</p>
          <p>📝 {item.remarks || "No Remarks"}</p>

          <a
            href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <button className="exec-primary-btn">
              Open Map
            </button>
          </a>

          {item.photo && (
            <img
              src={item.photo}
              className="exec-photo"
              alt="Visit"
            />
          )}
        </div>
      ))}
    </>
  );
}

export default ExecutiveGPS;