import { useMemo } from "react";

function Reports() {
  const payments = JSON.parse(localStorage.getItem("payments") || "[]");
  const executives = JSON.parse(localStorage.getItem("executives") || "[]");
  const bankCases = JSON.parse(localStorage.getItem("bankImportedCases") || "[]");
  const gpsVisits = JSON.parse(localStorage.getItem("gpsVisits") || "[]");

  const totalCollection = useMemo(() => {
    return payments.reduce(
      (sum: number, item: any) =>
        item.status !== "Pending" ? sum + Number(item.amount) : sum,
      0
    );
  }, [payments]);

  const paidCases = payments.filter((p: any) => p.status === "Paid").length;
  const pendingCases = payments.filter((p: any) => p.status === "Pending").length;
  const partialCases = payments.filter((p: any) => p.status === "Partial").length;

  function printReport() {
    window.print();
  }

  return (
    <div className="module-card">
      <h2>📊 Reports & Analytics</h2>

      <p>Recovery business summary.</p>

      <div className="cards-grid">

        <div className="stat-card">
          <h3>Total Bank Cases</h3>
          <h2>{bankCases.length}</h2>
        </div>

        <div className="stat-card">
          <h3>Total Executives</h3>
          <h2>{executives.length}</h2>
        </div>

        <div className="stat-card">
          <h3>Total GPS Visits</h3>
          <h2>{gpsVisits.length}</h2>
        </div>

        <div className="stat-card">
          <h3>Total Collection</h3>
          <h2>₹{totalCollection.toLocaleString("en-IN")}</h2>
        </div>

        <div className="stat-card">
          <h3>Paid Cases</h3>
          <h2>{paidCases}</h2>
        </div>

        <div className="stat-card">
          <h3>Partial Cases</h3>
          <h2>{partialCases}</h2>
        </div>

        <div className="stat-card">
          <h3>Pending Cases</h3>
          <h2>{pendingCases}</h2>
        </div>

      </div>

      <br />

      <button className="primary-btn" onClick={printReport}>
        🖨 Print Report
      </button>
    </div>
  );
}

export default Reports;