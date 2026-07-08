import { type ChangeEvent, useState } from "react";
import { supabase } from "../../supabaseClient";
import type { Executive, MyCase } from "./executiveTypes";

type Props = {
  executive: Executive;
  myCases: MyCase[];
  setMyCases: React.Dispatch<React.SetStateAction<MyCase[]>>;
  reloadVisits: () => void;
};

function ExecutiveCases({ executive, myCases, setMyCases, reloadVisits }: Props) {
  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<Record<number, string>>({});

  function handlePhoto(caseId: number, e: ChangeEvent<HTMLInputElement>) {
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
        const latitude = position.coords.latitude.toFixed(6);
        const longitude = position.coords.longitude.toFixed(6);

        const { error } = await supabase.from("gps_visits").insert({
          executive: executive.name,
          customer: item.customer,
          area: executive.area,
          status,
          latitude,
          longitude,
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
            old.map((c) =>
              c.id === item.id ? { ...c, status: "Visited" } : c
            )
          );
        }

        reloadVisits();

        alert(
          `${status} saved successfully.\nLocation:\n${latitude}, ${longitude}`
        );
      },
      (error) => {
        alert(
          "Location permission allow karo.\nGPS ON rakho.\nError: " +
            error.message
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  return (
    <>
      <div className="exec-title">
        <h2>📋 My Cases</h2>
        <p>{myCases.length} assigned cases</p>
      </div>

      {myCases.length === 0 && (
        <div className="exec-card">No assigned cases found.</div>
      )}

      {myCases.map((item) => (
        <div className="exec-card" key={item.id}>
          <h3>{item.customer}</h3>
          <p>📞 {item.phone}</p>
          <p>🏦 {item.bank}</p>
          <p>💰 ₹{item.amount.toLocaleString("en-IN")}</p>
          <p>📌 {item.status}</p>

          <a href={`tel:${item.phone}`}>
            <button className="exec-primary-btn">☎ Call</button>
          </a>{" "}

          <button
            className="exec-primary-btn"
            onClick={() => saveVisit(item, "Checked In")}
          >
            📍 Check In
          </button>{" "}

          <button
            className="exec-danger-btn"
            onClick={() => saveVisit(item, "Checked Out")}
          >
            ⏹ Check Out
          </button>

          <input
            className="exec-input"
            type="file"
            accept="image/*"
            onChange={(e) => handlePhoto(item.id, e)}
          />

          <input
            className="exec-input"
            placeholder="Visit Remarks"
            value={remarks[item.id] || ""}
            onChange={(e) =>
              setRemarks((old) => ({
                ...old,
                [item.id]: e.target.value,
              }))
            }
          />

          {photos[item.id] && (
            <img src={photos[item.id]} className="exec-photo" alt="Proof" />
          )}
        </div>
      ))}
    </>
  );
}

export default ExecutiveCases;