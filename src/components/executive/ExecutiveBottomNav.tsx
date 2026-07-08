type Screen = "dashboard" | "cases" | "gps" | "profile";

type Props = {
  active: Screen;
  setScreen: (screen: Screen) => void;
};

function ExecutiveBottomNav({ active, setScreen }: Props) {
  return (
    <div className="exec-bottom-nav">
      <button
        className={active === "dashboard" ? "active" : ""}
        onClick={() => setScreen("dashboard")}
      >
        🏠<span>Home</span>
      </button>

      <button
        className={active === "cases" ? "active" : ""}
        onClick={() => setScreen("cases")}
      >
        📋<span>Cases</span>
      </button>

      <button
        className={active === "gps" ? "active" : ""}
        onClick={() => setScreen("gps")}
      >
        📍<span>GPS</span>
      </button>

      <button
        className={active === "profile" ? "active" : ""}
        onClick={() => setScreen("profile")}
      >
        👤<span>Profile</span>
      </button>
    </div>
  );
}

export default ExecutiveBottomNav;