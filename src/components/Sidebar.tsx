type SidebarProps = {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
};

const menus = [
  "Dashboard",
  "Cases",
  "Executives",
  "GPS Tracking",
  "Payments",
  "Reports",
];

function Sidebar({ activeMenu, setActiveMenu }: SidebarProps) {
  return (
    <aside className="sidebar">
      <h2>Shiv Shakti</h2>
      <p>Recovery CRM</p>

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