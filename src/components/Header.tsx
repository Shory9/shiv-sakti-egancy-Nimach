type HeaderProps = {
  title: string;
  subtitle: string;
};

function Header({ title, subtitle }: HeaderProps) {
  return (
    <div className="dashboard-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>

      <button className="primary-btn">+ Add New Case</button>
    </div>
  );
}

export default Header;