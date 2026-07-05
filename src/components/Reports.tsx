function Reports() {
  const reports = [
    { title: "Total Cases", value: "248" },
    { title: "Recovered Amount", value: "₹12.8L" },
    { title: "Pending Cases", value: "64" },
    { title: "Recovery Rate", value: "78%" },
  ];

  return (
    <div className="module-card">
      <h2>Reports & Analytics</h2>
      <p>Overall recovery performance summary.</p>

      <div className="cards-grid">
        {reports.map((item) => (
          <div className="stat-card" key={item.title}>
            <h3>{item.title}</h3>
            <h2>{item.value}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;