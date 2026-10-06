import React, { useState, useEffect } from "react";
import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

export default function PolicyModal({ isOpen, onClose, initialKind = "" }) {
  const { state } = useApp();
  const policies = state.policies && state.policies.length > 0 ? state.policies : [];

  const [selectedId, setSelectedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && policies.length > 0) {
      if (initialKind) {
        const match = policies.find(
          (p) =>
            p.kind?.toLowerCase().includes(initialKind.toLowerCase()) ||
            p.title?.toLowerCase().includes(initialKind.toLowerCase())
        );
        if (match) {
          setSelectedId(match.id);
          return;
        }
      }
      setSelectedId(policies[0]?.id);
    }
  }, [isOpen, initialKind, policies]);

  if (!isOpen) return null;

  const currentPolicy =
    policies.find((p) => p.id === (selectedId || policies[0]?.id)) || policies[0] || {};

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
    if (text.includes("billing") || text.includes("membership")) return "Billing";
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
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: "rgba(7, 4, 10, 0.78)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "arrive 0.22s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          width: "min(960px, 95vw)",
          height: "min(680px, 88vh)",
          backgroundColor: "rgba(28, 17, 33, 0.96)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px",
          boxShadow: "0 28px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(233, 22, 113, 0.2)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          animation: "arrive 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(20, 12, 23, 0.6)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <img
              src="/assets/logo.jpg"
              alt="Juicy Match"
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "11px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
                objectFit: "cover",
              }}
            />
            <div>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.18em", color: "var(--pink)", fontWeight: "600" }}>
                LEGAL & TRUST CENTER
              </div>
              <div style={{ fontFamily: "Playfair, serif", fontSize: "1.1rem", color: "var(--cream)", fontWeight: "500" }}>
                Privacy, Community & Terms
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Search Input */}
            <div style={{ position: "relative", width: "200px" }}>
              <input
                type="text"
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 12px",
                  minHeight: "34px",
                  background: "rgba(36, 23, 38, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "100px",
                  color: "var(--cream)",
                  fontSize: "0.8rem",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
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
                  <Icon name="close" style={{ width: "12px", height: "12px" }} />
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "var(--cream)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
                minHeight: "auto",
                transition: "background 0.2s ease, transform 0.15s ease",
              }}
              aria-label="Close dialog"
            >
              <Icon name="close" style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        </div>

        {/* Master-Detail 2-Column Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: "300px minmax(0, 1fr)",
          }}
        >
          {/* Left Column: Documents Directory */}
          <div
            style={{
              padding: "16px",
              borderRight: "1px solid rgba(255, 255, 255, 0.08)",
              background: "rgba(21, 13, 24, 0.5)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                fontSize: "0.7rem",
                fontWeight: "600",
                letterSpacing: "0.15em",
                color: "var(--lilac)",
                marginBottom: "4px",
                padding: "0 4px",
              }}
            >
              DOCUMENTS ({filteredPolicies.length})
            </div>

            {filteredPolicies.map((p) => {
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
                    padding: "12px 14px",
                    borderRadius: "13px",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(74, 33, 67, 0.85), rgba(39, 23, 44, 0.95))"
                      : "rgba(33, 21, 37, 0.45)",
                    border: isActive
                      ? "1px solid rgba(233, 22, 113, 0.55)"
                      : "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: isActive ? "0 4px 16px rgba(233, 22, 113, 0.2)" : "none",
                    color: "var(--cream)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    minHeight: "auto",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "9px",
                      background: isActive ? "var(--pink)" : "rgba(53, 32, 61, 0.7)",
                      color: isActive ? "#ffffff" : "var(--lilac)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={iconName} style={{ width: "15px", height: "15px" }} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.86rem",
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
                        marginTop: "2px",
                        fontSize: "0.7rem",
                        color: "var(--muted)",
                      }}
                    >
                      <span
                        style={{
                          padding: "1px 5px",
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
                </button>
              );
            })}

            <div
              style={{
                marginTop: "auto",
                padding: "10px 12px",
                background: "rgba(25, 16, 28, 0.6)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Icon name="shield" style={{ width: "16px", height: "16px", color: "var(--pink)", flexShrink: 0 }} />
              <div style={{ fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.3 }}>
                Consent-first international architecture.
              </div>
            </div>
          </div>

          {/* Right Column: Policy Document Body */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "rgba(28, 17, 33, 0.75)",
            }}
          >
            {/* Document Header */}
            <div
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(20, 12, 23, 0.35)",
                flexShrink: 0,
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "DM, system-ui, sans-serif",
                    fontSize: "1.15rem",
                    fontWeight: "600",
                    color: "#ffffff",
                    margin: "0 0 3px",
                  }}
                >
                  {currentPolicy.title || "Policy Notice"}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.75rem", color: "var(--muted)" }}>
                  <span>Jurisdiction: <strong style={{ color: "var(--cream)" }}>{currentPolicy.jurisdiction || "GLOBAL"}</strong></span>
                  <span>•</span>
                  <span>Version <strong style={{ color: "var(--cream)" }}>v{currentPolicy.version || "1.0"}</strong></span>
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "3px 10px",
                  borderRadius: "100px",
                  background: "rgba(162, 219, 196, 0.12)",
                  border: "1px solid rgba(162, 219, 196, 0.25)",
                  color: "var(--green)",
                  fontSize: "0.75rem",
                  fontWeight: "500",
                }}
              >
                <Icon name="check" style={{ width: "12px", height: "12px" }} />
                <span>Legally Binding Notice</span>
              </div>
            </div>

            {/* Scrollable Reading Area */}
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "20px 24px",
                color: "#e8dce6",
                fontSize: "0.92rem",
                lineHeight: 1.75,
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {currentPolicy.body || "No additional body text available for this policy notice."}
            </div>

            {/* Bottom Footer Bar */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid rgba(255, 255, 255, 0.07)",
                background: "rgba(20, 12, 23, 0.5)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                Published and active under global compliance standards.
              </div>

              <button
                type="button"
                className="button primary"
                style={{
                  minHeight: "34px",
                  padding: "6px 18px",
                  fontSize: "0.82rem",
                  borderRadius: "100px",
                }}
                onClick={onClose}
              >
                I Understand · Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
