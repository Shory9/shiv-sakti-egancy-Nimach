import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./executive/ExecutiveStyles.css";

import ExecutiveDashboard from "./executive/ExecutiveDashboard";
import ExecutiveCases from "./executive/ExecutiveCases";
import ExecutiveGPS from "./executive/ExecutiveGPS";
import ExecutiveProfile from "./executive/ExecutiveProfile";
import ExecutiveBottomNav from "./executive/ExecutiveBottomNav";

import type {
  Executive,
  MyCase,
  VisitRecord,
} from "./executive/executiveTypes";

type Screen = "dashboard" | "cases" | "gps" | "profile";
type Mode = "login" | "register";

type SecureExecutive = Executive & {
  agent_code?: string | null;
  status?: string | null;
  password?: string | null;
  session_token?: string | null;
  last_latitude?: string | null;
  last_longitude?: string | null;
  last_seen?: string | null;
  is_online?: boolean | null;
};

type SavedSession = {
  executive: SecureExecutive;
  token: string;
};

const WORKING_AREAS = [
  "CRPF Neemuch",
  "Pustak Bajar Neemuch",
  "Neemuch",
  "Manasa",
  "Mandsaur",
  "MEN DB Mandsaur",
  "Jaora",
  "Bilpank",
  "Khachrod",
  "Sailana",
  "Station Road Ratlam",
  "Alkapuri Ratlam",
  "College Road Ratlam",
  "Chandni Chowk Ratlam",
  "Bamaniya",
  "Petlawad",
  "Dhar",
  "Manavar",
  "Tonki",
];

function createSessionToken() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "");
}

function ExecutiveApp() {
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [mode, setMode] = useState<Mode>("login");
  const [executive, setExecutive] = useState<SecureExecutive | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [loginText, setLoginText] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [myCases, setMyCases] = useState<MyCase[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);

  async function updateLiveLocation(
    agent: SecureExecutive,
    token: string
  ) {
    if (!navigator.geolocation || !token) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await supabase
          .from("agents")
          .update({
            last_latitude: position.coords.latitude.toFixed(6),
            last_longitude: position.coords.longitude.toFixed(6),
            last_seen: new Date().toISOString(),
            is_online: true,
          })
          .eq("id", agent.id)
          .eq("session_token", token);
      },
      () => {},
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  function convertCase(item: Record<string, unknown>): MyCase {
    const rawStatus = String(item.status || "Pending");

    const status: MyCase["status"] =
      rawStatus === "Visited" ||
      rawStatus === "Paid" ||
      rawStatus === "Overdue"
        ? rawStatus
        : "Pending";

    return {
      id: Number(item.id || 0),
      customer: String(item.customer || item.customer_name || ""),
      phone: String(item.phone || item.mobile || ""),
      bank: String(item.bank || item.bank_name || ""),
      amount: Number(item.amount || item.loan_amount || 0),
      pendingAmount: Number(
        item.pending_amount || item.loan_amount || 0
      ),
      address: String(item.address || ""),
      accountNo: String(item.account_no || ""),
      branchName: String(item.branch_name || ""),
      schemeCode: String(item.scheme_code || item.loan_type || ""),
      accountSegment: String(item.account_segment || ""),
      assetClassification: String(item.asset_classification || ""),
      sanctionLimit: Number(item.sanction_limit || 0),
      customerBalance: Number(item.customer_balance || 0),
      assigned_agent:
        (item.assigned_agent as
          | number
          | string
          | null
          | undefined) || null,
      status,
    };
  }

  async function loadMyCases(agentId: number) {
    const { data, error } = await supabase
      .from("cases")
      .select(
        [
          "id",
          "customer_name",
          "mobile",
          "bank_name",
          "loan_amount",
          "pending_amount",
          "address",
          "account_no",
          "branch_name",
          "scheme_code",
          "account_segment",
          "asset_classification",
          "sanction_limit",
          "customer_balance",
          "assigned_agent",
          "status",
        ].join(",")
      )
      .eq("assigned_agent", agentId)
      .order("id", { ascending: false });

    if (error) {
      alert("My Cases error: " + error.message);
      return;
    }

    setMyCases(
      (data || []).map((item) =>
        convertCase(item as unknown as Record<string, unknown>)
      )
    );
  }

  async function loadVisits(executiveName: string) {
    const { data, error } = await supabase
      .from("gps_visits")
      .select("*")
      .eq("executive", executiveName)
      .order("id", { ascending: false });

    if (!error) {
      setVisits((data || []) as VisitRecord[]);
    }
  }

  async function startSession(agent: SecureExecutive) {
    if (agent.status !== "Active") {
      alert("Account inactive hai. Admin se contact karo.");
      return false;
    }

    if (agent.session_token) {
      alert("Ye account kisi doosre device par already logged in hai.");
      return false;
    }

    const token = createSessionToken();

    const { data, error } = await supabase
      .from("agents")
      .update({
        session_token: token,
        is_online: true,
        last_seen: new Date().toISOString(),
      })
      .eq("id", agent.id)
      .eq("status", "Active")
      .is("session_token", null)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      alert("Login blocked: account kisi doosre device par active hai.");
      return false;
    }

    const loggedIn = data as unknown as SecureExecutive;
    const safeExecutive: SecureExecutive = {
      ...loggedIn,
      password: undefined,
    };

    localStorage.setItem(
      "executive_session",
      JSON.stringify({
        executive: safeExecutive,
        token,
      } as SavedSession)
    );

    setExecutive(safeExecutive);
    setSessionToken(token);
    setPassword("");
    setConfirmPassword("");

    await Promise.all([
      loadMyCases(Number(loggedIn.id)),
      loadVisits(loggedIn.name),
    ]);

    updateLiveLocation(loggedIn, token);
    return true;
  }

  async function restoreSavedSession() {
    const saved = localStorage.getItem("executive_session");

    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as SavedSession;

      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", Number(parsed.executive.id))
        .eq("status", "Active")
        .eq("session_token", parsed.token)
        .maybeSingle();

      if (error || !data) {
        localStorage.removeItem("executive_session");
        return;
      }

      const restored = data as unknown as SecureExecutive;
      const safeExecutive: SecureExecutive = {
        ...restored,
        password: undefined,
      };

      setExecutive(safeExecutive);
      setSessionToken(parsed.token);

      await Promise.all([
        loadMyCases(Number(restored.id)),
        loadVisits(restored.name),
      ]);

      updateLiveLocation(restored, parsed.token);
    } catch {
      localStorage.removeItem("executive_session");
    }
  }

  useEffect(() => {
    restoreSavedSession();
  }, []);

  useEffect(() => {
    if (!executive || !sessionToken) return;

    updateLiveLocation(executive, sessionToken);

    const timer = window.setInterval(() => {
      updateLiveLocation(executive, sessionToken);
    }, 30000);

    return () => window.clearInterval(timer);
  }, [executive, sessionToken]);

  async function registerExecutive() {
    const cleanName = name.trim();
    const normalizedPhone = cleanPhone(phone);
    const cleanArea = area.trim();
    const cleanVehicle = vehicle.trim();

    if (
      !cleanName ||
      !normalizedPhone ||
      !cleanArea ||
      !password ||
      !confirmPassword
    ) {
      alert(
        "Name, phone, area, password aur confirm password required hai."
      );
      return;
    }

    if (normalizedPhone.length < 10) {
      alert("Valid mobile number enter karo.");
      return;
    }

    if (password.length < 4) {
      alert("Password kam se kam 4 characters ka rakho.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Password aur Confirm Password same nahi hain.");
      return;
    }

    setLoading(true);

    try {
      const { data: existingByPhone, error: phoneError } =
        await supabase
          .from("agents")
          .select("*")
          .eq("phone", normalizedPhone)
          .limit(1);

      if (phoneError) {
        throw new Error(phoneError.message);
      }

      const existing =
        existingByPhone && existingByPhone.length > 0
          ? (existingByPhone[0] as unknown as SecureExecutive)
          : null;

      if (existing) {
        if (existing.status !== "Active") {
          alert("Ye account inactive hai. Admin se contact karo.");
          return;
        }

        if (existing.password) {
          alert(
            `Already registered.\nAgent Code: ${
              existing.agent_code || "Not Available"
            }\nLogin screen se login karo.`
          );
          setMode("login");
          setLoginText(existing.agent_code || normalizedPhone);
          return;
        }

        const { data: claimed, error: claimError } =
          await supabase
            .from("agents")
            .update({
              password,
              name: cleanName,
              area: cleanArea,
              vehicle: cleanVehicle,
            })
            .eq("id", existing.id)
            .is("password", null)
            .select("*")
            .maybeSingle();

        if (claimError || !claimed) {
          alert(
            "Existing account password set nahi hua. Admin se contact karo."
          );
          return;
        }

        const claimedAgent = claimed as unknown as SecureExecutive;

        alert(
          `Registration complete.\nAgent Code: ${claimedAgent.agent_code}`
        );

        await startSession(claimedAgent);
        return;
      }

      const { data: sameNameArea, error: nameAreaError } =
        await supabase
          .from("agents")
          .select("id, agent_code, phone")
          .ilike("name", cleanName)
          .ilike("area", cleanArea)
          .limit(1);

      if (nameAreaError) {
        throw new Error(nameAreaError.message);
      }

      if (sameNameArea && sameNameArea.length > 0) {
        alert(
          "Same name aur same area ka account already exists. Login karo."
        );
        setMode("login");
        return;
      }

      const { data, error } = await supabase
        .from("agents")
        .insert({
          name: cleanName,
          phone: normalizedPhone,
          area: cleanArea,
          vehicle: cleanVehicle,
          password,
          status: "Active",
          cases: 0,
          is_online: false,
          session_token: null,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(
          error?.message || "Unknown registration error"
        );
      }

      const agentCode = "SS" + String(data.id).padStart(3, "0");

      const { data: updatedAgent, error: codeError } =
        await supabase
          .from("agents")
          .update({ agent_code: agentCode })
          .eq("id", data.id)
          .select("*")
          .single();

      if (codeError || !updatedAgent) {
        throw new Error(
          codeError?.message || "Agent code create nahi hua"
        );
      }

      const newAgent = updatedAgent as unknown as SecureExecutive;

      alert(`Registration successful.\nAgent Code: ${agentCode}`);

      await startSession(newAgent);
    } catch (error) {
      alert(
        "Register error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  }

  async function loginExecutive() {
    const value = loginText.trim();

    if (!value || !password) {
      alert("Agent Code / Phone aur Password required hai.");
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = cleanPhone(value);

      let query = supabase
        .from("agents")
        .select("*")
        .eq("password", password)
        .eq("status", "Active");

      if (/^SS\d+$/i.test(value)) {
        query = query.eq("agent_code", value.toUpperCase());
      } else {
        query = query.eq("phone", normalizedPhone);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        alert(
          "Wrong Agent Code / Phone / Password, ya account inactive hai."
        );
        return;
      }

      await startSession(data as unknown as SecureExecutive);
    } catch (error) {
      alert(
        "Login error: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (executive && sessionToken) {
      await supabase
        .from("agents")
        .update({
          is_online: false,
          session_token: null,
          last_seen: new Date().toISOString(),
        })
        .eq("id", executive.id)
        .eq("session_token", sessionToken);
    }

    localStorage.removeItem("executive_session");

    setExecutive(null);
    setSessionToken("");
    setScreen("dashboard");
    setLoginText("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setPhone("");
    setArea("");
    setVehicle("");
    setMyCases([]);
    setVisits([]);
  }

  if (!executive) {
    return (
      <div className="exec-page">
        <div className="exec-login-card">
          <div className="exec-logo">🔐</div>

          <h1>Shiv Shakti Executive</h1>
          <p>Recovery Field App</p>

          {mode === "register" && (
            <>
              <input
                className="exec-input"
                placeholder="Full Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />

              <input
                className="exec-input"
                placeholder="Mobile Number"
                value={phone}
                inputMode="numeric"
                onChange={(event) => setPhone(event.target.value)}
              />

              <select
                className="exec-input"
                value={area}
                onChange={(event) => setArea(event.target.value)}
              >
                <option value="">Select Working Area</option>

                {WORKING_AREAS.map((workingArea) => (
                  <option key={workingArea} value={workingArea}>
                    {workingArea}
                  </option>
                ))}
              </select>

              <input
                className="exec-input"
                placeholder="Vehicle Optional"
                value={vehicle}
                onChange={(event) => setVehicle(event.target.value)}
              />
            </>
          )}

          {mode === "login" && (
            <input
              className="exec-input"
              placeholder="Agent Code / Mobile Number"
              value={loginText}
              onChange={(event) => setLoginText(event.target.value)}
            />
          )}

          <input
            className="exec-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {mode === "register" && (
            <input
              className="exec-input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
            />
          )}

          <button
            className="exec-primary-btn"
            onClick={
              mode === "login" ? loginExecutive : registerExecutive
            }
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>

          <button
            className="exec-link-btn"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setPassword("");
              setConfirmPassword("");
            }}
          >
            {mode === "login"
              ? "New Executive? Register Here"
              : "Already Registered? Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="exec-page with-nav">
      {screen === "dashboard" && (
        <ExecutiveDashboard
          executive={executive}
          myCases={myCases}
          visits={visits}
          goTo={setScreen}
        />
      )}

      {screen === "cases" && (
        <ExecutiveCases
          executive={executive}
          myCases={myCases}
          setMyCases={setMyCases}
          reloadVisits={() => loadVisits(executive.name)}
        />
      )}

      {screen === "gps" && (
        <ExecutiveGPS executive={executive} visits={visits} />
      )}

      {screen === "profile" && (
        <ExecutiveProfile executive={executive} logout={logout} />
      )}

      <ExecutiveBottomNav active={screen} setScreen={setScreen} />
    </div>
  );
}

export default ExecutiveApp;