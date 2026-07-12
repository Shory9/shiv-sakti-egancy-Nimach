import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../supabaseClient";

import type {
  Executive,
  MyCase,
} from "./executiveTypes";

type Props = {
  executive: Executive;
  myCases: MyCase[];
  setMyCases: Dispatch<SetStateAction<MyCase[]>>;
  reloadVisits: () => void;
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function ExecutiveCases({
  executive,
  myCases,
  setMyCases,
  reloadVisits,
}: Props) {
  const [search, setSearch] = useState("");

  const [remarks, setRemarks] = useState<
    Record<number, string>
  >({});

  const [photos, setPhotos] = useState<
    Record<number, string>
  >({});

  const filteredCases = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return myCases;

    return myCases.filter((item) =>
      [
        item.id,
        item.customer,
        item.phone,
        item.address,
        item.accountNo,
        item.assetClassification,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [myCases, search]);

  function handlePhoto(
    caseId: number,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setPhotos((old) => ({
        ...old,
        [caseId]: String(reader.result),
      }));
    };

    reader.readAsDataURL(file);
  }

  function saveVisit(
    item: MyCase,
    status: "Checked In" | "Checked Out"
  ) {
    if (!navigator.geolocation) {
      alert("GPS is device me supported nahi hai.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { error } = await supabase
          .from("gps_visits")
          .insert({
            executive: executive.name,
            customer: item.customer,
            area: executive.area,
            status,
            latitude:
              position.coords.latitude.toFixed(6),
            longitude:
              position.coords.longitude.toFixed(6),
            remarks: remarks[item.id] || "",
            photo: photos[item.id] || "",
            time: new Date().toLocaleString("en-IN"),
          });

        if (error) {
          alert("GPS save error: " + error.message);
          return;
        }

        if (status === "Checked Out") {
          const { error: caseError } = await supabase
            .from("cases")
            .update({
              status: "Visited",
            })
            .eq("id", item.id);

          if (caseError) {
            alert(
              "Case status update error: " +
                caseError.message
            );
            return;
          }

          setMyCases((old) =>
            old.map((caseItem) =>
              caseItem.id === item.id
                ? {
                    ...caseItem,
                    status: "Visited",
                  }
                : caseItem
            )
          );
        }

        reloadVisits();

        alert(`${status} saved successfully.`);
      },
      (error) => {
        alert(
          "Location permission allow karo. GPS Error: " +
            error.message
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  }

  return (
    <>
      <div className="exec-title">
        <h2>📋 Assigned Recovery Cases</h2>

        <p>
          {filteredCases.length} of {myCases.length} cases
        </p>
      </div>

      <div className="exec-card">
        <input
          className="exec-input"
          placeholder="🔍 Search customer, phone, address or account..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />
      </div>

      {filteredCases.length === 0 && (
        <div className="exec-card">
          No matching assigned cases found.
        </div>
      )}

      {filteredCases.map((item) => (
        <div
          className="exec-card"
          key={item.id}
        >
          <p>
            <strong>Case ID:</strong> #{item.id}
          </p>

          <h3>{item.customer || "Unknown Customer"}</h3>

          <p>
            <strong>📍 Address:</strong>{" "}
            {item.address || "Address not available"}
          </p>

          <p>
            <strong>📞 Mobile:</strong>{" "}
            {item.phone || "No phone"}
          </p>

          <p>
            <strong>💰 Outstanding:</strong>{" "}
            ₹{formatMoney(item.amount)}
          </p>

          <p>
            <strong>📌 Status:</strong>{" "}
            {item.status}
          </p>

          {item.assetClassification && (
            <p>
              <strong>🏷 Category:</strong>{" "}
              {item.assetClassification}
            </p>
          )}

          <div className="exec-action-row">
            {item.phone && (
              <a href={`tel:${item.phone}`}>
                <button className="exec-primary-btn">
                  ☎ Call
                </button>
              </a>
            )}

            <button
              className="exec-primary-btn"
              onClick={() =>
                saveVisit(item, "Checked In")
              }
            >
              📍 Check In
            </button>

            <button
              className="exec-danger-btn"
              onClick={() =>
                saveVisit(item, "Checked Out")
              }
            >
              ⏹ Check Out
            </button>
          </div>

          <input
            className="exec-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) =>
              handlePhoto(item.id, event)
            }
          />

          <input
            className="exec-input"
            placeholder="Visit Remarks"
            value={remarks[item.id] || ""}
            onChange={(event) =>
              setRemarks((old) => ({
                ...old,
                [item.id]: event.target.value,
              }))
            }
          />

          {photos[item.id] && (
            <img
              src={photos[item.id]}
              className="exec-photo"
              alt="Visit Proof"
            />
          )}
        </div>
      ))}
    </>
  );
}

export default ExecutiveCases;