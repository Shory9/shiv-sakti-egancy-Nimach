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

type VisitStatus = "Checked In" | "Checked Out";

type PhotoLocation = {
  latitude: string;
  longitude: string;
  accuracy: number;
  capturedAt: string;
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is device me supported nahi hai."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0,
    });
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Photo load nahi ho payi."));

    image.src = source;
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Photo read nahi ho payi."));

    reader.readAsDataURL(file);
  });
}

function ExecutiveCases({
  executive,
  myCases,
  setMyCases,
  reloadVisits,
}: Props) {
  const [search, setSearch] = useState("");

  const [remarks, setRemarks] = useState<Record<number, string>>({});
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [photoLocations, setPhotoLocations] = useState<
    Record<number, PhotoLocation>
  >({});
  const [visitStatus, setVisitStatus] = useState<
    Record<number, VisitStatus | undefined>
  >({});
  const [processingPhoto, setProcessingPhoto] = useState<
    Record<number, boolean>
  >({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  const filteredCases = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return myCases;

    return myCases.filter((item) =>
      [
        item.id,
        item.customer,
        item.phone,
        item.bank,
        item.status,
        item.address,
        item.accountNo,
        item.branchName,
        item.schemeCode,
        item.accountSegment,
        item.assetClassification,
        executive.area,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [myCases, search, executive.area]);

  async function handlePhoto(
    item: MyCase,
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Sirf camera photo allowed hai.");
      input.value = "";
      return;
    }

    setProcessingPhoto((old) => ({
      ...old,
      [item.id]: true,
    }));

    try {
      const position = await getCurrentLocation();

      const latitude =
        position.coords.latitude.toFixed(6);
      const longitude =
        position.coords.longitude.toFixed(6);
      const accuracy = Math.round(
        position.coords.accuracy || 0
      );

      const capturedAt = new Date().toLocaleString(
        "en-IN",
        {
          dateStyle: "medium",
          timeStyle: "medium",
        }
      );

      const originalDataUrl =
        await readFileAsDataUrl(file);

      const image = await loadImage(originalDataUrl);

      const maximumWidth = 1280;
      const scale = Math.min(
        1,
        maximumWidth / image.naturalWidth
      );

      const width = Math.round(
        image.naturalWidth * scale
      );
      const height = Math.round(
        image.naturalHeight * scale
      );

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "GPS photo generate nahi ho payi."
        );
      }

      context.drawImage(image, 0, 0, width, height);

      const padding = Math.max(
        18,
        Math.round(width * 0.025)
      );

      const titleFontSize = Math.max(
        24,
        Math.round(width * 0.035)
      );

      const textFontSize = Math.max(
        18,
        Math.round(width * 0.025)
      );

      const lineHeight = Math.round(
        textFontSize * 1.45
      );

      const overlayHeight =
        padding * 2 +
        titleFontSize +
        lineHeight * 5;

      const overlayY = height - overlayHeight;

      context.fillStyle = "rgba(0, 0, 0, 0.72)";
      context.fillRect(
        0,
        overlayY,
        width,
        overlayHeight
      );

      context.textBaseline = "top";
      context.fillStyle = "#ffffff";
      context.font = `700 ${titleFontSize}px Arial`;

      context.fillText(
        "SHIV SAKTI RECOVERY",
        padding,
        overlayY + padding
      );

      context.font = `600 ${textFontSize}px Arial`;

      const customerName =
        item.customer || "Unknown Customer";

      const area =
        executive.area ||
        item.branchName ||
        item.bank ||
        "Area not available";

      const address =
        item.address || "Address not available";

      const lines = [
        `Customer: ${customerName}`,
        `Case ID: #${item.id}`,
        `Area: ${area}`,
        `GPS: ${latitude}, ${longitude}`,
        `Date/Time: ${capturedAt}`,
      ];

      let lineY =
        overlayY +
        padding +
        titleFontSize +
        Math.round(textFontSize * 0.6);

      for (const line of lines) {
        context.fillText(
          line,
          padding,
          lineY,
          width - padding * 2
        );

        lineY += lineHeight;
      }

      context.font = `500 ${Math.max(
        15,
        textFontSize - 3
      )}px Arial`;

      const shortAddress =
        address.length > 75
          ? `${address.slice(0, 75)}...`
          : address;

      context.fillText(
        shortAddress,
        padding,
        height - padding - textFontSize,
        width - padding * 2
      );

      const stampedPhoto = canvas.toDataURL(
        "image/jpeg",
        0.78
      );

      setPhotos((old) => ({
        ...old,
        [item.id]: stampedPhoto,
      }));

      setPhotoLocations((old) => ({
        ...old,
        [item.id]: {
          latitude,
          longitude,
          accuracy,
          capturedAt,
        },
      }));

      alert(
        `GPS Camera photo ready.\nLocation accuracy: लगभग ${accuracy} meter`
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Camera ya GPS error.";

      alert(
        "Photo ke saath GPS capture nahi hua.\n" +
          "Camera aur Location permission Allow karo.\n\n" +
          message
      );
    } finally {
      setProcessingPhoto((old) => ({
        ...old,
        [item.id]: false,
      }));

      input.value = "";
    }
  }

  function clearVisitForm(caseId: number) {
    setRemarks((old) => {
      const updated = { ...old };
      delete updated[caseId];
      return updated;
    });

    setPhotos((old) => {
      const updated = { ...old };
      delete updated[caseId];
      return updated;
    });

    setPhotoLocations((old) => {
      const updated = { ...old };
      delete updated[caseId];
      return updated;
    });

    setVisitStatus((old) => {
      const updated = { ...old };
      delete updated[caseId];
      return updated;
    });
  }

  async function submitVisit(item: MyCase) {
    const selectedStatus = visitStatus[item.id];
    const photo = photos[item.id];
    const location = photoLocations[item.id];

    if (!selectedStatus) {
      alert("Pehle Check In ya Check Out select karo.");
      return;
    }

    if (!photo || !location) {
      alert(
        "Pehle GPS Camera se customer location ki photo lo."
      );
      return;
    }

    setSubmitting((old) => ({
      ...old,
      [item.id]: true,
    }));

    try {
      const { error } = await supabase
        .from("gps_visits")
        .insert({
          executive: executive.name,
          customer: item.customer,
          area: executive.area,
          status: selectedStatus,
          latitude: location.latitude,
          longitude: location.longitude,
          remarks: remarks[item.id]?.trim() || "",
          photo,
          time: location.capturedAt,
        });

      if (error) {
        alert("GPS visit save error: " + error.message);
        return;
      }

      if (selectedStatus === "Checked Out") {
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
      clearVisitForm(item.id);

      alert(
        `${selectedStatus} successfully submit ho gaya.\nGPS photo bhi save ho gayi.`
      );
    } finally {
      setSubmitting((old) => ({
        ...old,
        [item.id]: false,
      }));
    }
  }

  return (
    <div style={{ paddingBottom: "150px" }}>
      <div className="exec-title">
        <h2>📋 Assigned Recovery Cases</h2>

        <p>
          {filteredCases.length} of {myCases.length} cases
        </p>
      </div>

      <div className="exec-card">
        <input
          className="exec-input"
          placeholder="🔍 Search name, phone, address, account, branch or category..."
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

      {filteredCases.map((item) => {
        const selectedStatus =
          visitStatus[item.id];

        const isPhotoProcessing = Boolean(
          processingPhoto[item.id]
        );

        const isSubmitting = Boolean(
          submitting[item.id]
        );

        const location = photoLocations[item.id];

        return (
          <div className="exec-card" key={item.id}>
            <div className="exec-case-heading">
              <div>
                <p>
                  <strong>Case ID:</strong> #{item.id}
                </p>

                <h3>
                  {item.customer ||
                    "Unknown Customer"}
                </h3>
              </div>

              <span
                className={`status ${item.status.toLowerCase()}`}
              >
                {item.status}
              </span>
            </div>

            <p>
              <strong>📍 Address:</strong>{" "}
              {item.address ||
                "Address not available"}
            </p>

            <p>
              <strong>📞 Mobile:</strong>{" "}
              {item.phone || "No phone"}
            </p>

            <p>
              <strong>🏦 Branch:</strong>{" "}
              {item.branchName ||
                item.bank ||
                "No branch"}
            </p>

            <p>
              <strong>🆔 Account:</strong>{" "}
              {item.accountNo || "Not available"}
            </p>

            <p>
              <strong>📑 Scheme:</strong>{" "}
              {item.schemeCode || "Not available"}
            </p>

            <p>
              <strong>📂 Segment:</strong>{" "}
              {item.accountSegment ||
                "Not available"}
            </p>

            <p>
              <strong>🔴 Category:</strong>{" "}
              {item.assetClassification ||
                "Not available"}
            </p>

            <hr />

            <p>
              <strong>💰 Outstanding:</strong>{" "}
              ₹{formatMoney(item.amount)}
            </p>

            <p>
              <strong>⏳ Pending:</strong>{" "}
              ₹{formatMoney(item.pendingAmount)}
            </p>

            <p>
              <strong>🏦 Sanction Limit:</strong>{" "}
              ₹{formatMoney(item.sanctionLimit)}
            </p>

            <p>
              <strong>💳 Customer Balance:</strong>{" "}
              ₹{formatMoney(item.customerBalance)}
            </p>

            <p>
              <strong>🗺 Working Area:</strong>{" "}
              {executive.area || "Not set"}
            </p>

            <div className="exec-action-row">
              {item.phone && (
                <a href={`tel:${item.phone}`}>
                  <button
                    type="button"
                    className="exec-primary-btn"
                  >
                    ☎ Call
                  </button>
                </a>
              )}

              <button
                type="button"
                className="exec-primary-btn"
                onClick={() =>
                  setVisitStatus((old) => ({
                    ...old,
                    [item.id]: "Checked In",
                  }))
                }
              >
                {selectedStatus === "Checked In"
                  ? "✅"
                  : "📍"}{" "}
                Check In
              </button>

              <button
                type="button"
                className="exec-danger-btn"
                onClick={() =>
                  setVisitStatus((old) => ({
                    ...old,
                    [item.id]: "Checked Out",
                  }))
                }
              >
                {selectedStatus === "Checked Out"
                  ? "✅"
                  : "⏹"}{" "}
                Check Out
              </button>
            </div>

            <div style={{ marginTop: "16px" }}>
              <label
                htmlFor={`gps-camera-${item.id}`}
                className="exec-primary-btn"
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "center",
                  cursor: isPhotoProcessing
                    ? "wait"
                    : "pointer",
                  padding: "15px",
                  fontSize: "17px",
                  fontWeight: 700,
                  opacity: isPhotoProcessing
                    ? 0.65
                    : 1,
                  pointerEvents: isPhotoProcessing
                    ? "none"
                    : "auto",
                }}
              >
                {isPhotoProcessing
                  ? "⏳ GPS location aur photo process ho rahi hai..."
                  : photos[item.id]
                    ? "📷 Retake GPS Photo"
                    : "📍📷 Open GPS Camera"}
              </label>

              <input
                id={`gps-camera-${item.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) =>
                  handlePhoto(item, event)
                }
                style={{ display: "none" }}
              />
            </div>

            {location && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "12px",
                  borderRadius: "12px",
                  background: "#eefbf3",
                  fontSize: "14px",
                }}
              >
                <strong>✅ GPS Proof Ready</strong>
                <br />
                📍 {location.latitude},{" "}
                {location.longitude}
                <br />
                🎯 Accuracy: लगभग{" "}
                {location.accuracy} meter
                <br />
                🕒 {location.capturedAt}
              </div>
            )}

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
              style={{ marginTop: "14px" }}
            />

            {photos[item.id] && (
              <img
                src={photos[item.id]}
                className="exec-photo"
                alt="GPS Visit Proof"
              />
            )}

            <button
              type="button"
              className="exec-primary-btn"
              disabled={
                isSubmitting || isPhotoProcessing
              }
              onClick={() => submitVisit(item)}
              style={{
                display: "block",
                width: "100%",
                marginTop: "18px",
                padding: "15px",
                fontSize: "17px",
                fontWeight: 700,
                opacity:
                  isSubmitting || isPhotoProcessing
                    ? 0.65
                    : 1,
              }}
            >
              {isSubmitting
                ? "⏳ GPS visit save ho rahi hai..."
                : "✅ Submit GPS Visit"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ExecutiveCases;