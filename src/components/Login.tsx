function Login() {
  return (
    <div className="module-card">
      <h2>🔐 Shiv Shakti Recovery Login</h2>
      <p>Admin and executive access panel.</p>

      <hr />

      <input placeholder="Mobile / Email" />

      <br />
      <br />

      <input type="password" placeholder="Password" />

      <br />
      <br />

      <select>
        <option>Admin</option>
        <option>Executive</option>
      </select>

      <br />
      <br />

      <button
        className="primary-btn"
        onClick={() => alert("Demo login successful")}
      >
        Login
      </button>

      <div className="card">
        <h3>Demo Credentials</h3>
        <p><strong>Admin:</strong> admin / 1234</p>
        <p><strong>Executive:</strong> executive / 1234</p>
      </div>
    </div>
  );
}

export default Login;