function StatsCards() {
  const cards = [
    { title: "Total Cases", value: "248", text: "Active recovery cases", icon: "📋" },
    { title: "Total Recovery", value: "₹12.8L", text: "This month collection", icon: "💰" },
    { title: "Field Agents", value: "18", text: "Executives on duty", icon: "👨‍💼" },
    { title: "Pending Visits", value: "64", text: "Today's follow-ups", icon: "📍" },
  ];

  return (
    <div className="cards-grid">
      {cards.map((card) => (
        <div className="stat-card" key={card.title}>
          <div className="card-icon">{card.icon}</div>
          <h3>{card.title}</h3>
          <h2>{card.value}</h2>
          <p>{card.text}</p>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;