import { type ChangeEvent, useEffect, useState } from "react";

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
  const [executive, setExecutive] = useState("Amit");
  const [customer, setCustomer] = useState("");
  const [area, setArea] = useState("");
  const [remarks, setRemarks] = useState("");
  const [photo, setPhoto] = useState("");
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("gpsVisits");
    if (saved) setVisits(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("gpsVisits", JSON.stringify(visits));
  }, [visits]);

  function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  function addVisit(status: "Checked In" | "Checked Out") {
    if (!customer || !area) {
      alert("Customer name aur area bharo bro.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newVisit: Visit = {
          id: Date.now(),
          executive,
          customer,
          area,
          status,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          remarks,
          photo,
          time: new Date().toLocaleString("en-IN"),
        };

        setVisits([newVisit, ...visits]);
        setCustomer("");
        setArea("");
        setRemarks("");
        setPhoto("");
      },
      () => {
        alert("Location permission allow karo bro.");
      }
    );
  }

  function deleteVisit(id: number) {
    setVisits(visits.filter((item) => item.id !== id));
  }

  return (
    <div className="module-card">
      <h2>📍 GPS Tracking & Visit Proof</h2>
      <p>Executive visit proof with GPS, photo, remarks and timestamp.</p>

      <hr />

      <select value={executive} onChange={(e) => setExecutive(e.target.value)}>
        <option>Amit</option>
        <option>Rahul</option>
        <option>Vikram</option>
      </select>

      <br />
      <br />

      <input
        placeholder="Customer Name"
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Area / Location"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      />

      <br />
      <br />

      <input
        placeholder="Visit Remarks"
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
      />

      <br />
      <br />

      <input type="file" accept="image/*" onChange={handlePhoto} />

      {photo && (
        <>
          <br />
          <br />
          <img
            src={photo}
            alt="Visit proof"
            style={{
              width: "120px",
              height: "90px",
              objectFit: "cover",
              borderRadius: "10px",
            }}
          />
        </>
      )}

      <br />
      <br />

      <button className="primary-btn" onClick={() => addVisit("Checked In")}>
        Check In
      </button>{" "}

      <button className="primary-btn" onClick={() => addVisit("Checked Out")}>
        Check Out
      </button>

      <br />
      <br />

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
            <th>Action</th>
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
              <td>
                <button className="delete-btn" onClick={() => deleteVisit(item.id)}>
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

export default GPSTracking;