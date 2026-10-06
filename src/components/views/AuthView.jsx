import React, { useState, useEffect } from "react";
import Icon from "../common/Icon";
import PolicyModal from "../common/PolicyModal";
import { useApp } from "../../context/AppContext";
import { authService } from "../../services/authService";

export default function AuthView({ isSignup = false }) {
  const { onLoginSuccess, navigate, showToast, openModal, closeModal } = useApp();

  const [tab, setTab] = useState(isSignup ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [age, setAge] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync tab with isSignup prop changes
  useEffect(() => {
    setTab(isSignup ? "signup" : "signin");
  }, [isSignup]);

  // Email verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Dynamic API data
  const [policies, setPolicies] = useState([]);
  const [policyModal, setPolicyModal] = useState({ open: false, kind: "" });

  // Fetch public legal policies from backend
  useEffect(() => {
    let isMounted = true;

    async function loadPublicData() {
      try {
        const policyRes = await authService.getPublicPolicies();
        if (isMounted && policyRes?.items) {
          setPolicies(policyRes.items);
        }
      } catch (err) {
        console.warn("Public policies fetch error:", err.message);
      }
    }

    loadPublicData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.login(email.trim(), password);
      showToast("Welcome back.");
      const account = res.account || res.user || { email: email.trim() };
      const token = res.token || res.accessToken;
      onLoginSuccess(account, token, res.refreshToken);
      navigate("discover");
    } catch (err) {
      const errorText = err.message || "";
      const errorData = err.data || {};
      if (
        errorData.requiresVerification ||
        errorData.status === "PENDING_VERIFICATION" ||
        errorText.toLowerCase().includes("verif")
      ) {
        setIsVerifying(true);
        setError("Please verify your email address to continue.");
        showToast("Email verification required.");
      } else {
        setError(errorText || "Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("Please accept the terms of service and privacy notice.");
      return;
    }

    const policyIdsToSend =
      policies.length > 0
        ? policies.map((p) => p.id)
        : ["policy-terms-v1", "policy-privacy-v1"];

    setLoading(true);
    try {
      const res = await authService.register({
        email,
        password,
        pseudonym,
        age,
        policyIds: policyIdsToSend,
      });

      if (res.status === "PENDING_VERIFICATION") {
        setIsVerifying(true);
        showToast("Verification code sent to your email.");
      } else {
        showToast("Your private profile has been created.");
        onLoginSuccess(res.account, res.token);
        navigate("profile");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please review your input.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authService.verifyEmail(email, verificationCode);
      showToast("Email verified successfully.");
      onLoginSuccess(res.account, res.token);
      navigate("profile");
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      await authService.resendVerification(email);
      showToast("Verification code resent.");
      setResendCooldown(30);
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    }
  };


  const handleForgotPassword = () => {
    openModal(
      "Reset your password",
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p>Enter your email address and we'll send you instructions to reset your password.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            closeModal();
            showToast("Password reset instructions sent to your email.");
          }}
        >
          <label className="field">
            Email address
            <input
              type="email"
              required
              defaultValue={email}
              placeholder="member@example.com"
            />
          </label>
          <div className="buttonbar" style={{ marginTop: "1rem" }}>
            <button type="submit" className="button primary">
              Send reset instructions
            </button>
            <button type="button" className="button quiet" onClick={closeModal}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <main className="hero-auth" id="main">
      <section className="auth-art">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: "540px" }}>
          <a
            href="/signin"
            className="brand"
            style={{
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "24px",
              zIndex: 2,
            }}
            onClick={(e) => {
              e.preventDefault();
              setTab("signin");
              setIsVerifying(false);
              setError("");
            }}
          >
            <img
              src="/assets/logo.jpg"
              alt="Juicy Match"
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "24px",
                boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.14)",
                objectFit: "cover",
              }}
            />
          </a>
          <div className="eyebrow" style={{ textAlign: "center", marginBottom: "12px", letterSpacing: "0.2em" }}>
            FOR THE CURIOUS. FOR THE CHEMISTRY.
          </div>
          <h1 style={{ textAlign: "center", marginBottom: "14px" }}>
            Something good<br />
            starts with<br />
            <em>a little spark.</em>
          </h1>
          <p style={{ textAlign: "center", maxWidth: "380px", margin: "0 auto 20px" }}>
            A little intimate. A little unexpected. Always at your own pace.
          </p>
          <span className="pill" style={{ alignSelf: "center", padding: "6px 16px" }}>
            21+ · Consent comes first
          </span>
        </div>
      </section>

      <section className="auth-side">
        {isVerifying ? (
          <div style={{ maxWidth: "430px", width: "100%" }}>
            <h2>Check your email.</h2>
            <p>
              We’ve sent a 6-digit verification code to <strong>{email}</strong>.
            </p>

            <form onSubmit={handleVerifyEmail}>
              <label className="field">
                Verification Code
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  style={{ fontSize: "1.25rem", letterSpacing: "4px", textAlign: "center" }}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                />
              </label>

              {error && <p className="form-error" role="alert">{error}</p>}

              <button type="submit" className="primary" disabled={loading || verificationCode.length < 6}>
                {loading ? "Verifying…" : "Confirm Email"} <Icon name="arrow" />
              </button>

              <div className="buttonbar" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button quiet"
                  disabled={resendCooldown > 0}
                  onClick={handleResendCode}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </button>
                <button
                  type="button"
                  className="button quiet"
                  onClick={() => {
                    setIsVerifying(false);
                    setError("");
                  }}
                >
                  Back to Sign in
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ maxWidth: "430px", width: "100%" }}>
            <div className="tabs">
              <button
                type="button"
                className={tab === "signin" ? "active" : ""}
                onClick={() => {
                  setTab("signin");
                  navigate("signin");
                  setError("");
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={tab === "signup" ? "active" : ""}
                onClick={() => {
                  setTab("signup");
                  navigate("signup");
                  setError("");
                }}
              >
                Begin your story
              </button>
            </div>

            <h2>{tab === "signup" ? "Make it your own." : "Welcome back."}</h2>
            <p>
              {tab === "signup"
                ? "Start privately. Decide what to share, and when."
                : "Your next chapter is waiting."}
            </p>

            <form onSubmit={tab === "signup" ? handleRegister : handleLogin} autoComplete="off">
              {tab === "signup" && (
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                  <label className="field">
                    What should we call you?
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={40}
                      value={pseudonym}
                      onChange={(e) => setPseudonym(e.target.value)}
                      placeholder="e.g. Leo"
                      autoComplete="off"
                    />
                  </label>
                  <label className="field">
                    Your age
                    <input
                      type="number"
                      required
                      min={21}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="21+"
                      autoComplete="off"
                    />
                  </label>
                </div>
              )}

              <label className="field">
                Email address
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  autoComplete="email"
                  maxLength={254}
                />
              </label>

              <label className="field">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Password</span>
                  {tab === "signin" && (
                    <button
                      type="button"
                      className="text-link"
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontSize: "0.9rem",
                        minHeight: "auto",
                        color: "var(--lilac)",
                        cursor: "pointer",
                      }}
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={tab === "signup" ? 8 : 4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                />
              </label>

              {tab === "signup" && (
                <div style={{ margin: "10px 0 12px", fontSize: "0.88rem", color: "var(--muted)", lineHeight: "1.5" }}>
                  <label className="check" style={{ margin: 0, gap: "10px", alignItems: "flex-start", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      required
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ marginTop: "3px" }}
                    />
                    <span>
                      I agree to the{" "}
                      <span
                        className="text-link"
                        onClick={() => setPolicyModal({ open: true, kind: "terms" })}
                        role="button"
                        tabIndex="0"
                      >
                        Terms of Service
                      </span>
                      {" "}and acknowledge the{" "}
                      <span
                        className="text-link"
                        onClick={() => setPolicyModal({ open: true, kind: "privacy" })}
                        role="button"
                        tabIndex="0"
                      >
                        Privacy Notice
                      </span>.
                    </span>
                  </label>
                </div>
              )}

              {error && <p className="form-error" role="alert" style={{ marginTop: "8px", marginBottom: "8px" }}>{error}</p>}

              <button type="submit" className="primary" disabled={loading}>
                {loading ? (
                  "Processing…"
                ) : (
                  <>
                    {tab === "signup" ? "Create my private profile" : "Step inside"}{" "}
                    <Icon name="arrow" />
                  </>
                )}
              </button>

              {tab === "signin" ? (
                <p style={{ textAlign: "center", marginTop: "18px", fontSize: "0.95rem", color: "var(--muted)" }}>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-link"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontWeight: "600",
                      minHeight: "auto",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setTab("signup");
                      navigate("signup");
                      setError("");
                    }}
                  >
                    Create account
                  </button>
                </p>
              ) : (
                <p style={{ textAlign: "center", marginTop: "18px", fontSize: "0.95rem", color: "var(--muted)" }}>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-link"
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontWeight: "600",
                      minHeight: "auto",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setTab("signin");
                      navigate("signin");
                      setError("");
                    }}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </form>

            <div style={{ marginTop: "22px" }}>
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                  textAlign: "center",
                  width: "100%",
                  fontSize: "0.9rem",
                  color: "var(--muted)",
                }}
              >
                <span
                  className="text-link"
                  onClick={() => setPolicyModal({ open: true, kind: "privacy" })}
                  role="button"
                  tabIndex="0"
                >
                  Privacy Notice
                </span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span
                  className="text-link"
                  onClick={() => setPolicyModal({ open: true, kind: "terms" })}
                  role="button"
                  tabIndex="0"
                >
                  Community & Terms
                </span>
              </p>
            </div>

          </div>
        )}
      </section>

      <PolicyModal
        isOpen={policyModal.open}
        onClose={() => setPolicyModal({ open: false, kind: "" })}
        initialKind={policyModal.kind}
      />
    </main>
  );
}
