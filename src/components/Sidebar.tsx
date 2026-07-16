type SidebarProps = {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
};

const menus = [
  "Dashboard",
  "Bank Import",
  "Cases",
  "Executives",
  "Executive App",
  "GPS Tracking",
  "Payments",
  "Reports",
];

function Sidebar({
  activeMenu,
  setActiveMenu,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
  <img
    src="/logo.png"
    alt="Shiv Shakti Recovery"
    style={{
      width: "180px",
      height: "auto",
      display: "block",
      margin: "0 auto",
    }}
  />
</div>
      

      {menus.map((menu) => (
        <button
          key={menu}
          className={
            activeMenu === menu ? "active" : ""
          }
          onClick={() => setActiveMenu(menu)}
        >
          {menu}
        </button>
      ))}
    </aside>
  );
}

export default Sidebar;