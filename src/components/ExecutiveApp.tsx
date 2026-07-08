import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./executive/ExecutiveStyles.css";

import ExecutiveDashboard from "./executive/ExecutiveDashboard";
import ExecutiveCases from "./executive/ExecutiveCases";
import ExecutiveGPS from "./executive/ExecutiveGPS";
import ExecutiveProfile from "./executive/ExecutiveProfile";
import ExecutiveBottomNav from "./executive/ExecutiveBottomNav";

import type { Executive, MyCase, VisitRecord } from "./executive/executiveTypes";

type Screen = "dashboard" | "cases" | "gps" | "profile";

function ExecutiveApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [executive, setExecutive] = useState<Executive | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [loginText, setLoginText] = useState("");
  const [loading, setLoading] = useState(false);

  const [myCases, setMyCases] = useState<MyCase[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);

  async function updateLiveLocation(agent: Executive) {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await supabase
          .from("agents")
          .update({
            last_latitude: position.coords.latitude.toFixed(6),
            last_longitude: position.coords.longitude.toFixed(6),
            last_seen: new Date().toLocaleString("en-IN"),
            is_online: true,
          })
          .eq("id", agent.id);
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  useEffect(() => {
    const saved = localStorage.getItem("executive_session");
    if (saved) {
      const data = JSON.parse(saved);
      setExecutive(data);
      loadMyCases(Number(data.id));
      loadVisits(data.name);
      updateLiveLocation(data);
    }
  }, []);

  useEffect(() => {
    if (!executive) return;

    updateLiveLocation(executive);

    const timer = window.setInterval(() => {
      updateLiveLocation(executive);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [executive]);

  function convertCase(item: any): MyCase {
    return {
      id: Number(item.id),
      customer: item.customer || item.customer_name || "",
      phone: item.phone || item.mobile || "",
      bank: item.bank || item.bank_name || "",
      amount: Number(item.amount || item.loan_amount || 0),
      assigned_agent: item.assigned_agent || "",
      status:
        item.status === "Visited" ||
        item.status === "Paid" ||
        item.status === "Overdue"
          ? item.status
          : "Pending",
    };
  }

  async function loadMyCases(agentId: number) {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("assigned_agent", agentId)
      .order("id", { ascending: false });

    if (error) {
      alert("My Cases error: " + error.message);
      return;
    }

    setMyCases((data || []).map(convertCase));
  }

  async function loadVisits(executiveName: string) {
    const { data, error } = await supabase
      .from("gps_visits")
      .select("*")
      .eq("executive", executiveName)
      .order("id", { ascending: false });

    if (!error) setVisits((data || []) as VisitRecord[]);
  }

  async function registerExecutive() {
    if (!name.trim() || !phone.trim() || !area.trim()) {
      alert("Name, phone aur area required hai.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("agents")
      .insert({
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        vehicle: vehicle.trim(),
        status: "Active",
        cases: 0,
        is_online: false,
      })
      .select()
      .single();

    if (error || !data) {
      setLoading(false);
      alert("Register error: " + (error?.message || "Unknown error"));
      return;
    }

    const agentCode = "SS" + String(data.id).padStart(3, "0");

    const { data: updatedAgent, error: codeError } = await supabase
      .from("agents")
      .update({ agent_code: agentCode })
      .eq("id", data.id)
      .select()
      .single();

    setLoading(false);

    if (codeError || !updatedAgent) {
      alert("Agent code error: " + (codeError?.message || "Unknown error"));
      return;
    }

    localStorage.setItem("executive_session", JSON.stringify(updatedAgent));
    setExecutive(updatedAgent);
    loadMyCases(Number(updatedAgent.id));
    loadVisits(updatedAgent.name);
    updateLiveLocation(updatedAgent);

    alert(`Registration successful. Your Agent Code: ${agentCode}`);
  }

  async function loginExecutive() {
    if (!loginText.trim()) {
      alert("Agent Code / Phone / Name enter karo.");
      return;
    }

    const value = loginText.trim();

    setLoading(true);

    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .or(`agent_code.eq.${value},phone.eq.${value},name.ilike.${value}`)
      .limit(1)
      .single();

    setLoading(false);

    if (error || !data) {
      alert("Executive not found. Pehle register karo.");
      return;
    }

    localStorage.setItem("executive_session", JSON.stringify(data));
    setExecutive(data);
    loadMyCases(Number(data.id));
    loadVisits(data.name);
    updateLiveLocation(data);
  }

  async function logout() {
    if (executive) {
      await supabase
        .from("agents")
        .update({ is_online: false, last_seen: new Date().toLocaleString("en-IN") })
        .eq("id", executive.id);
    }

    localStorage.removeItem("executive_session");
    setExecutive(null);
    setScreen("dashboard");
    setLoginText("");
    setPhone("");
    setName("");
    setArea("");
    setVehicle("");
    setMyCases([]);
    setVisits([]);
  }

  if (!executive) {
    return (
      <div className="exec-page">
        <div className="exec-login-card">
          <div className="exec-logo">🚀</div>

          <h1>Shiv Shakti Executive</h1>
          <p>Recovery Field App</p>

          {mode === "register" && (
            <>
              <input className="exec-input" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
              <input className="exec-input" placeholder="Mobile Number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <input className="exec-input" placeholder="Working Area" value={area} onChange={(e) => setArea(e.target.value)} />
              <input className="exec-input" placeholder="Vehicle Optional" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </>
          )}

          {mode === "login" && (
            <input
              className="exec-input"
              placeholder="Agent Code / Phone / Name"
              value={loginText}
              onChange={(e) => setLoginText(e.target.value)}
            />
          )}

          <button className="exec-primary-btn" onClick={mode === "login" ? loginExecutive : registerExecutive}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
          </button>

          <button className="exec-link-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "New Executive? Register Here" : "Already Registered? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exec-page with-nav">
      {screen === "dashboard" && (
        <ExecutiveDashboard executive={executive} myCases={myCases} visits={visits} goTo={setScreen} />
      )}

      {screen === "cases" && (
        <ExecutiveCases executive={executive} myCases={myCases} setMyCases={setMyCases} reloadVisits={() => loadVisits(executive.name)} />
      )}

      {screen === "gps" && <ExecutiveGPS executive={executive} visits={visits} />}

      {screen === "profile" && <ExecutiveProfile executive={executive} logout={logout} />}

      <ExecutiveBottomNav active={screen} setScreen={setScreen} />
    </div>
  );
}

export default ExecutiveApp;