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

function ExecutiveApp() {
  const [screen, setScreen] =
    useState<Screen>("dashboard");

  const [mode, setMode] =
    useState<"login" | "register">("login");

  const [executive, setExecutive] =
    useState<Executive | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [loginText, setLoginText] = useState("");
  const [loading, setLoading] = useState(false);

  const [myCases, setMyCases] =
    useState<MyCase[]>([]);

  const [visits, setVisits] =
    useState<VisitRecord[]>([]);

  async function updateLiveLocation(
    agent: Executive
  ) {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await supabase
          .from("agents")
          .update({
            last_latitude:
              position.coords.latitude.toFixed(6),

            last_longitude:
              position.coords.longitude.toFixed(6),

            last_seen:
              new Date().toLocaleString("en-IN"),

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

  function convertCase(
    item: Record<string, unknown>
  ): MyCase {
    const rawStatus = String(
      item.status || "Pending"
    );

    const status: MyCase["status"] =
      rawStatus === "Visited" ||
      rawStatus === "Paid" ||
      rawStatus === "Overdue"
        ? rawStatus
        : "Pending";

    return {
      id: Number(item.id || 0),

      customer: String(
        item.customer ||
          item.customer_name ||
          ""
      ),

      phone: String(
        item.phone ||
          item.mobile ||
          ""
      ),

      bank: String(
        item.bank ||
          item.bank_name ||
          ""
      ),

      amount: Number(
        item.amount ||
          item.loan_amount ||
          0
      ),

      pendingAmount: Number(
        item.pending_amount ||
          item.loan_amount ||
          0
      ),

      address: String(item.address || ""),

      accountNo: String(
        item.account_no || ""
      ),

      branchName: String(
        item.branch_name || ""
      ),

      schemeCode: String(
        item.scheme_code ||
          item.loan_type ||
          ""
      ),

      accountSegment: String(
        item.account_segment || ""
      ),

      assetClassification: String(
        item.asset_classification || ""
      ),

      sanctionLimit: Number(
        item.sanction_limit || 0
      ),

      customerBalance: Number(
        item.customer_balance || 0
      ),

      assigned_agent:
        (item.assigned_agent as
          | number
          | string
          | null
          | undefined) || null,

      status,
    };
  }

  async function loadMyCases(
    agentId: number
  ) {
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
      .order("id", {
        ascending: false,
      });

    if (error) {
      alert(
        "My Cases error: " +
          error.message
      );
      return;
    }

    setMyCases(
      (data || []).map((item) =>
       convertCase(item as unknown as Record<string, unknown>)
      )
    );
  }

  async function loadVisits(
    executiveName: string
  ) {
    const { data, error } = await supabase
      .from("gps_visits")
      .select("*")
      .eq("executive", executiveName)
      .order("id", {
        ascending: false,
      });

    if (!error) {
      setVisits(
        (data || []) as VisitRecord[]
      );
    }
  }

  useEffect(() => {
    const saved =
      localStorage.getItem(
        "executive_session"
      );

    if (!saved) return;

    try {
      const data =
        JSON.parse(saved) as Executive;

      setExecutive(data);

      loadMyCases(
        Number(data.id)
      );

      loadVisits(data.name);

      updateLiveLocation(data);
    } catch {
      localStorage.removeItem(
        "executive_session"
      );
    }
  }, []);

  useEffect(() => {
    if (!executive) return;

    updateLiveLocation(executive);

    const timer =
      window.setInterval(() => {
        updateLiveLocation(executive);
      }, 30000);

    return () =>
      window.clearInterval(timer);
  }, [executive]);

  async function registerExecutive() {
    if (
      !name.trim() ||
      !phone.trim() ||
      !area.trim()
    ) {
      alert(
        "Name, phone aur area required hai."
      );
      return;
    }

    setLoading(true);

    const { data, error } =
      await supabase
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

      alert(
        "Register error: " +
          (error?.message ||
            "Unknown error")
      );

      return;
    }

    const agentCode =
      "SS" +
      String(data.id).padStart(
        3,
        "0"
      );

    const {
      data: updatedAgent,
      error: codeError,
    } = await supabase
      .from("agents")
      .update({
        agent_code: agentCode,
      })
      .eq("id", data.id)
      .select()
      .single();

    setLoading(false);

    if (
      codeError ||
      !updatedAgent
    ) {
      alert(
        "Agent code error: " +
          (codeError?.message ||
            "Unknown error")
      );

      return;
    }

    localStorage.setItem(
      "executive_session",
      JSON.stringify(
        updatedAgent
      )
    );

    setExecutive(
      updatedAgent as Executive
    );

    await loadMyCases(
      Number(updatedAgent.id)
    );

    await loadVisits(
      updatedAgent.name
    );

    updateLiveLocation(
      updatedAgent as Executive
    );

    alert(
      `Registration successful. Your Agent Code: ${agentCode}`
    );
  }

  async function loginExecutive() {
    if (!loginText.trim()) {
      alert(
        "Agent Code / Phone / Name enter karo."
      );
      return;
    }

    const value =
      loginText.trim();

    setLoading(true);

    const { data, error } =
      await supabase
        .from("agents")
        .select("*")
        .or(
          `agent_code.eq.${value},phone.eq.${value},name.ilike.${value}`
        )
        .limit(1)
        .single();

    setLoading(false);

    if (error || !data) {
      alert(
        "Executive not found. Pehle register karo."
      );
      return;
    }

    localStorage.setItem(
      "executive_session",
      JSON.stringify(data)
    );

    setExecutive(
      data as Executive
    );

    await loadMyCases(
      Number(data.id)
    );

    await loadVisits(
      data.name
    );

    updateLiveLocation(
      data as Executive
    );
  }

  async function logout() {
    if (executive) {
      await supabase
        .from("agents")
        .update({
          is_online: false,

          last_seen:
            new Date().toLocaleString(
              "en-IN"
            ),
        })
        .eq(
          "id",
          executive.id
        );
    }

    localStorage.removeItem(
      "executive_session"
    );

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
          <div className="exec-logo">
            🚀
          </div>

          <h1>
            Shiv Shakti Executive
          </h1>

          <p>Recovery Field App</p>

          {mode === "register" && (
            <>
              <input
                className="exec-input"
                placeholder="Full Name"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
              />

              <input
                className="exec-input"
                placeholder="Mobile Number"
                value={phone}
                onChange={(event) =>
                  setPhone(
                    event.target.value
                  )
                }
              />

              <select
                className="exec-input"
                value={area}
                onChange={(event) =>
                  setArea(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select Working Area
                </option>

                {WORKING_AREAS.map(
                  (workingArea) => (
                    <option
                      key={workingArea}
                      value={workingArea}
                    >
                      {workingArea}
                    </option>
                  )
                )}
              </select>

              <input
                className="exec-input"
                placeholder="Vehicle Optional"
                value={vehicle}
                onChange={(event) =>
                  setVehicle(
                    event.target.value
                  )
                }
              />
            </>
          )}

          {mode === "login" && (
            <input
              className="exec-input"
              placeholder="Agent Code / Phone / Name"
              value={loginText}
              onChange={(event) =>
                setLoginText(
                  event.target.value
                )
              }
            />
          )}

          <button
            className="exec-primary-btn"
            onClick={
              mode === "login"
                ? loginExecutive
                : registerExecutive
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
            onClick={() =>
              setMode(
                mode === "login"
                  ? "register"
                  : "login"
              )
            }
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
          reloadVisits={() =>
            loadVisits(
              executive.name
            )
          }
        />
      )}

      {screen === "gps" && (
        <ExecutiveGPS
          executive={executive}
          visits={visits}
        />
      )}

      {screen === "profile" && (
        <ExecutiveProfile
          executive={executive}
          logout={logout}
        />
      )}

      <ExecutiveBottomNav
        active={screen}
        setScreen={setScreen}
      />
    </div>
  );
}

export default ExecutiveApp;