import { Capacitor } from "@capacitor/core";
import "./App.css";
import Dashboard from "./components/Dashboard";
import ExecutiveApp from "./components/ExecutiveApp";

function App() {
  // Android APK me direct Executive App khulega
  if (Capacitor.isNativePlatform()) {
    return <ExecutiveApp />;
  }

  // Website par executive link khulega
  const params = new URLSearchParams(window.location.search);

  if (params.get("view") === "executive") {
    return <ExecutiveApp />;
  }

  // Normal website par Admin CRM Dashboard khulega
  return <Dashboard />;
}

export default App;