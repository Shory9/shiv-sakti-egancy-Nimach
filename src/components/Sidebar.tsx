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
      <div className="sidebar-logo">
        <img
          src="/logo.png"
          alt="Shiv Shakti Recovery"
        />
      </div>

      {menus.map((menu) => (
        <button
          key={menu}
          className={activeMenu === menu ? "active" : ""}
          onClick={() => setActiveMenu(menu)}
        >
          {menu}
        </button>
      ))}
    </aside>
  );
}

export default Sidebar;