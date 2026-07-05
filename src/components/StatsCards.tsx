import type { CaseItem } from "./CasesTable";

type StatsCardsProps = {
  cases: CaseItem[];
};

function StatsCards({ cases }: StatsCardsProps) {
  const totalCases = cases.length;
  const pending = cases.filter((c) => c.status === "Pending").length;
  const visited = cases.filter((c) => c.status === "Visited").length;
  const recoveredAmount = cases
    .filter((c) => c.status === "Paid")
    .reduce((sum, c) => sum + c.amount, 0);

  const cards = [
    { title: "Total Cases", value: totalCases, text: "All recovery cases", icon: "📋" },
    { title: "Pending", value: pending, text: "Need follow-up", icon: "⏳" },
    { title: "Visited", value: visited, text: "Customer visited", icon: "🚗" },
    {
      title: "Recovered",
      value: `₹${recoveredAmount.toLocaleString("en-IN")}`,
      text: "Recovered amount",
      icon: "💰",
    },
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