import "./App.css";
import Dashboard from "./components/Dashboard";
import ExecutiveApp from "./components/ExecutiveApp";

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "executive") {
    return <ExecutiveApp />;
  }

  return <Dashboard />;
}

export default App;