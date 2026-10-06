import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import { useApp } from "../../context/AppContext";
import { authService } from "../../services/authService";

export default function PoliciesView() {
  const { state, navigate } = useApp();
  const [policiesList, setPoliciesList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await authService.getPublicPolicies();
        if (res?.items) {
          setPoliciesList(res.items);
        }
      } catch (err) {
        console.warn("Could not load public policies:", err);
      }
    };
    fetchPolicies();
  }, []);

  const policies = policiesList.length > 0 ? policiesList : (state.policies || []);
  const currentPolicy = policies.find((p) => p.id === (selectedId || policies[0]?.id)) || policies[0] || {};

  const getPolicyIcon = (kind = "", title = "") => {
    const text = (kind + " " + title).toLowerCase();
    if (text.includes("privacy") || text.includes("shield")) return "shield";
    if (text.includes("sensitive") || text.includes("lock") || text.includes("security")) return "lock";
    if (text.includes("billing") || text.includes("membership") || text.includes("spark")) return "discover";
    return "save";
  };

  const getPolicyCategory = (kind = "", title = "") => {
    const text = (kind + " " + title).toLowerCase();
    if (text.includes("privacy")) return "Privacy";
    if (text.includes("sensitive")) return "Data Security";
    if (text.includes("billing") || text.includes("membership")) return "Billing & Plans";
    if (text.includes("terms")) return "Terms of Use";
    return "Policy";
  };

  const filteredPolicies = policies.filter((p) => {
    if (!searchQuery) return true;
    return (
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.body?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div
      style={{
        height: "100%",
        maxHeight: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 0 16px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          marginBottom: "16px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="/assets/logo.jpg"
            alt="Juicy Match"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              objectFit: "cover",
            }}
          />
          <div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", color: "var(--pink)", fontWeight: "600" }}>
              LEGAL & TRUST CENTER
            </div>
            <div style={{ fontFamily: "Playfair, serif", fontSize: "1.15rem", color: "var(--cream)", fontWeight: "500", lineHeight: 1.2 }}>
              Privacy, Community & Legal Policies
            </div>
          </div>
        </div>

        {/* Search & Back Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ position: "relative", width: "240px" }}>
            <input
              type="text"
              placeholder="Search legal terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 14px",
                minHeight: "36px",
                background: "rgba(36, 23, 38, 0.65)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "100px",
                color: "var(--cream)",
                fontSize: "0.82rem",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "2px",
                  minHeight: "auto",
                }}
              >
                <Icon name="close" style={{ width: "13px", height: "13px" }} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="button"
            style={{
              minHeight: "36px",
              padding: "7px 16px",
              fontSize: "0.83rem",
              borderRadius: "100px",
              background: "rgba(53, 32, 61, 0.65)",
              borderColor: "rgba(255, 255, 255, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
            onClick={() => navigate(state.authenticated ? "privacy" : "signin")}
          >
            <Icon name="back" style={{ width: "15px", height: "15px" }} />
            <span>{state.authenticated ? "Back to Settings" : "Back to Sign In"}</span>
          </button>
        </div>
      </header>

      {/* Main Single-Page 2-Column Master-Detail Layout */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "330px minmax(0, 1fr)",
          gap: "18px",
        }}
      >
        {/* Left Directory Navigation Column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            minHeight: 0,
            overflowY: "auto",
            paddingRight: "4px",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: "600",
              letterSpacing: "0.15em",
              color: "var(--lilac)",
              padding: "0 4px",
            }}
          >
            DOCUMENTS DIRECTORY ({filteredPolicies.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
            {filteredPolicies.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  background: "rgba(33, 21, 37, 0.5)",
                  borderRadius: "14px",
                  border: "1px dashed rgba(255, 255, 255, 0.1)",
                  color: "var(--muted)",
                  fontSize: "0.84rem",
                }}
              >
                No policies match your search.
              </div>
            ) : (
              filteredPolicies.map((p) => {
                const isActive = (selectedId || policies[0]?.id) === p.id;
                const iconName = getPolicyIcon(p.kind, p.title);
                const categoryLabel = getPolicyCategory(p.kind, p.title);

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "14px 16px",
                      borderRadius: "14px",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(74, 33, 67, 0.8), rgba(39, 23, 44, 0.95))"
                        : "rgba(33, 21, 37, 0.55)",
                      border: isActive
                        ? "1px solid rgba(233, 22, 113, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.06)",
                      boxShadow: isActive
                        ? "0 6px 20px rgba(233, 22, 113, 0.18)"
                        : "none",
                      color: "var(--cream)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      minHeight: "auto",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: isActive ? "var(--pink)" : "rgba(53, 32, 61, 0.7)",
                        color: isActive ? "#ffffff" : "var(--lilac)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={iconName} style={{ width: "17px", height: "17px" }} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.92rem",
                          fontWeight: isActive ? "600" : "500",
                          color: isActive ? "#ffffff" : "var(--cream)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "3px",
                          fontSize: "0.72rem",
                          color: "var(--muted)",
                        }}
                      >
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: "100px",
                            background: "rgba(213, 198, 235, 0.12)",
                            color: "var(--lilac)",
                          }}
                        >
                          {categoryLabel}
                        </span>
                        <span>v{p.version || "1.0"}</span>
                      </div>
                    </div>

                    <Icon
                      name="arrow"
                      style={{
                        width: "14px",
                        height: "14px",
                        color: isActive ? "var(--pink)" : "rgba(255,255,255,0.2)",
                        transform: isActive ? "translateX(2px)" : "none",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </button>
                );
              })
            )}
          </div>

          {/* Mini Trust Box */}
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(25, 16, 28, 0.6)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "auto",
              flexShrink: 0,
            }}
          >
            <Icon name="shield" style={{ width: "18px", height: "18px", color: "var(--pink)", flexShrink: 0 }} />
            <div style={{ fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.4 }}>
              Encrypted & strictly compliant with global consent standards.
            </div>
          </div>
        </div>

        {/* Right Detail Reader Column */}
        <div
          style={{
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            background: "rgba(33, 21, 37, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "18px",
            backdropFilter: "blur(14px)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            overflow: "hidden",
          }}
        >
          {/* Reader Top Bar */}
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              background: "rgba(25, 15, 28, 0.4)",
              flexShrink: 0,
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "DM, system-ui, sans-serif",
                  fontSize: "1.3rem",
                  fontWeight: "600",
                  color: "#ffffff",
                  margin: "0 0 4px",
                }}
              >
                {currentPolicy.title || "Policy Document"}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.78rem", color: "var(--muted)" }}>
                <span>Jurisdiction: <strong style={{ color: "var(--cream)" }}>{currentPolicy.jurisdiction || "GLOBAL"}</strong></span>
                <span>•</span>
                <span>Version <strong style={{ color: "var(--cream)" }}>v{currentPolicy.version || "1.0"}</strong></span>
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "100px",
                background: "rgba(162, 219, 196, 0.12)",
                border: "1px solid rgba(162, 219, 196, 0.25)",
                color: "var(--green)",
                fontSize: "0.78rem",
                fontWeight: "500",
              }}
            >
              <Icon name="check" style={{ width: "13px", height: "13px" }} />
              <span>Active & Legally Binding</span>
            </div>
          </div>

          {/* Reader Scrollable Document Body */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "24px 28px",
              color: "#e8dce6",
              fontSize: "0.96rem",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {currentPolicy.body || "No additional body text available for this policy notice."}
          </div>

          {/* Reader Bottom Action Bar */}
          <div
            style={{
              padding: "14px 24px",
              borderTop: "1px solid rgba(255, 255, 255, 0.07)",
              background: "rgba(25, 15, 28, 0.5)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
              Protected by Juicy Match Transparency Architecture
            </div>

            <button
              type="button"
              className="button primary"
              style={{
                minHeight: "36px",
                padding: "8px 20px",
                fontSize: "0.84rem",
                borderRadius: "100px",
              }}
              onClick={() => navigate(state.authenticated ? "privacy" : "signin")}
            >
              {state.authenticated ? "Done & Return" : "I Understand · Back to Login"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
