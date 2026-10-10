import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PolicyModal from "../../common/PolicyModal";
import { useApp } from "../../../context/AppContext";
import { authService } from "../../../services/authService";

function ForgotPasswordModalContent({ initialEmail = "", onClose, showToast }) {
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = resetEmail.trim();
    if (!clean) return;
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await authService.forgotPassword(clean);
      setIsSent(true);
      showToast(res?.message || "Password reset instructions sent to your email.", "success");
    } catch (err) {
      if (err.status === 404) {
        setIsSent(true);
        showToast("If this email is registered, instructions have been sent.", "info");
      } else {
        const msg = err.message || err.data?.error || err.data?.message || "Failed to send reset instructions.";
        setErrorMsg(msg);
        showToast(msg, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSent) {
    return (
      <div className="flex flex-col items-center text-center gap-3.5 py-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-2xl shadow-lg">
          ✉️
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-white tracking-tight m-0">Instructions Sent</h3>
          <p className="text-xs sm:text-sm text-white/60 m-0 leading-relaxed max-w-sm">
            If an account is associated with <span className="text-white font-semibold">{resetEmail}</span>, we've sent password reset instructions. Please check your inbox and spam folder.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 px-6 py-2.5 rounded-xl bg-pink hover:bg-[#ff2a85] text-white text-xs font-bold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.35)] cursor-pointer"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
      <p className="text-xs sm:text-sm text-white/60 m-0 leading-relaxed">
        Enter your registered email address and we'll send you instructions to reset your password.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-email-input" className="text-xs font-bold text-white/90">
          Email address
        </label>
        <input
          id="reset-email-input"
          type="email"
          required
          autoFocus
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          placeholder="member@example.com"
          className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/15 text-white text-sm placeholder-white/30 focus:border-pink focus:outline-none transition-all shadow-inner"
        />
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !resetEmail.trim()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-pink hover:bg-[#ff2a85] active:scale-95 text-white text-xs font-bold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.35)] cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send reset instructions"}
        </button>
      </div>
    </form>
  );
}

export default function AuthView({ isSignup = false }) {
  const { onLoginSuccess, navigate, showToast, openModal, closeModal } = useApp();

  const [tab, setTab] = useState(isSignup ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const account = res.account || res.user || { email: email.trim() };
      const token = res.token || res.accessToken;
      onLoginSuccess(account, token, res.refreshToken);
      navigate("discover");
    } catch (err) {
      const errorText = err.message || err.data?.error || err.data?.message || "";
      const errorData = err.data || {};
      if (
        errorData.requiresVerification ||
        errorData.status === "PENDING_VERIFICATION" ||
        errorText.toLowerCase().includes("verif")
      ) {
        setIsVerifying(true);
        const verifMsg = errorData.message || errorText || "Email verification required.";
        setError(verifMsg);
        showToast(verifMsg, "info");
      } else {
        const msg = errorText || `Login failed (${err.status || 401}). Please check your credentials.`;
        setError(msg);
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const cleanPseudonym = pseudonym.trim();
    const ageNum = Number(age);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      if (showToast) showToast("Please enter a valid email address.", "error");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      if (showToast) showToast("Password must be at least 8 characters.", "error");
      return;
    }

    if (!cleanPseudonym || cleanPseudonym.length < 2 || cleanPseudonym.length > 30) {
      setError("Pseudonym must be between 2 and 30 characters.");
      if (showToast) showToast("Pseudonym must be 2 to 30 characters.", "error");
      return;
    }

    if (!/^[a-zA-Z0-9_\s-]+$/.test(cleanPseudonym)) {
      setError("Pseudonym contains invalid characters. Use letters, numbers, spaces, or underscores only.");
      if (showToast) showToast("Pseudonym contains invalid characters.", "error");
      return;
    }

    if (!age || isNaN(ageNum) || ageNum < 21) {
      setError("You must be 21 years or older to register on Juicy Match.");
      if (showToast) showToast("You must be 21 or older to register.", "error");
      return;
    }

    if (ageNum > 99) {
      setError("Please enter a valid age between 21 and 99.");
      if (showToast) showToast("Please enter a valid age between 21 and 99.", "error");
      return;
    }

    if (!agreeTerms) {
      setError("Please accept the terms of service and privacy notice to continue.");
      if (showToast) showToast("Please accept the terms of service.", "error");
      return;
    }

    const policyIdsToSend =
      policies.length > 0
        ? policies.map((p) => p.id)
        : ["jm-policy-GLOBAL-terms-1", "jm-policy-GLOBAL-privacy-1"];

    setLoading(true);
    try {
      const res = await authService.register({
        email: cleanEmail,
        password,
        pseudonym: cleanPseudonym,
        age: ageNum,
        policyIds: policyIdsToSend,
      });

      if (res.status === "PENDING_VERIFICATION") {
        setIsVerifying(true);
        showToast(res.message || "Verification code sent to your email.");
      } else {
        showToast(res.message || "Your private profile has been created. 🥂", "success");
        onLoginSuccess(res.account || res.user, res.token || res.accessToken, null, { silent: true });
        navigate("profile");
      }
    } catch (err) {
      const msg = err.message || err.data?.error || err.data?.message || `Registration failed (${err.status || "Error"}).`;
      setError(msg);
      showToast(msg, "error");
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
      showToast(res.message || "Email verified successfully.", "success");
      onLoginSuccess(res.account, res.token, null, { silent: true });
      navigate("profile");
    } catch (err) {
      const msg = err.message || err.data?.error || err.data?.message || `Verification failed (${err.status || "Error"}).`;
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError("");
    try {
      const res = await authService.resendVerification(email);
      showToast(res?.message || "Verification code resent.", "success");
      setResendCooldown(30);
    } catch (err) {
      const msg = err.message || err.data?.error || err.data?.message || "Failed to resend code.";
      setError(msg);
      showToast(msg, "error");
    }
  };

  const handleForgotPassword = () => {
    openModal(
      "Reset your password",
      <ForgotPasswordModalContent
        initialEmail={email}
        onClose={closeModal}
        showToast={showToast}
      />
    );
  };

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#120718] to-[#1e0d26]" id="main">
      {/* Left Art Section */}
      <section className="hidden md:flex flex-1 items-center justify-center p-12 bg-cover bg-center relative bg-[url('https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')]">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-[#120718]"></div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <a
            href="/signin"
            className="inline-flex justify-center items-center mb-8 relative group"
            onClick={(e) => {
              e.preventDefault();
              setTab("signin");
              setIsVerifying(false);
              setError("");
            }}
          >
            <div className="absolute inset-0 bg-pink rounded-[36px] blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <img
              src="/assets/logo.jpg"
              alt="Juicy Match"
              className="w-[150px] h-[150px] rounded-[36px] object-cover shadow-2xl border-2 border-white/20 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-pink/50 relative z-10"
            />
          </a>
          <div className="text-[0.75rem] font-bold tracking-[0.2em] uppercase text-pink mb-4">
            FOR THE CURIOUS. FOR THE CHEMISTRY.
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4 leading-tight">
            Something good<br />
            starts with<br />
            <em className="text-pink not-italic relative inline-block">
              a little spark.
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-gradient-to-r from-pink to-transparent rounded-full"></span>
            </em>
          </h1>
          <p className="text-lg text-cream/90 max-w-md mx-auto mb-8 font-medium">
            A little intimate. A little unexpected. Always at your own pace.
          </p>
          <span className="px-5 py-2.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm font-semibold tracking-wide">
            21+ · Consent comes first
          </span>
        </div>
      </section>

      {/* Right Form Section */}
      <section className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10 w-full">
        {isVerifying ? (
          <div className="w-full max-w-[430px] bg-surface/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <h2 className="text-3xl font-serif font-bold text-white mb-2">Check your email.</h2>
            <p className="text-cream mb-8">
              We’ve sent a 6-digit verification code to <strong className="text-white">{email}</strong>.
            </p>

            <form onSubmit={handleVerifyEmail} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="123456"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-white text-2xl tracking-[0.25em] text-center focus:outline-none focus:border-pink transition-colors placeholder-white/20 font-mono"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.trim())}
                />
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-pink/15 border border-pink/30 text-white text-sm">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink to-[#e11d48] text-white font-bold py-4 rounded-xl shadow-[0_4px_16px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-2" 
                disabled={loading || verificationCode.length < 6}
              >
                <span>{loading ? "Verifying…" : "Confirm Email"}</span>
                {!loading && <Icon name="arrow" className="w-5 h-5" />}
              </button>

              <div className="flex flex-col gap-3 mt-4">
                <button
                  type="button"
                  className="w-full py-3 bg-transparent border border-white/10 text-muted font-semibold rounded-xl hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={resendCooldown > 0}
                  onClick={handleResendCode}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </button>
                <button
                  type="button"
                  className="w-full py-3 bg-transparent text-muted font-semibold hover:text-white transition-colors"
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
          <div className="w-full max-w-[430px]">
            {/* Mobile Logo */}
            <div className="md:hidden flex justify-center mb-8">
               <img src="/assets/logo.jpg" alt="Juicy Match" className="w-[100px] h-[100px] rounded-3xl object-cover shadow-lg border border-white/20" />
            </div>

            {/* Auth Tabs */}
            <div className="flex bg-black/40 p-1.5 rounded-full mb-8 border border-white/5 shadow-inner">
              <button
                type="button"
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${tab === "signin" ? "bg-white/10 text-white shadow-md" : "text-muted hover:text-white"}`}
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
                className={`flex-1 py-3 text-sm font-bold rounded-full transition-all ${tab === "signup" ? "bg-white/10 text-white shadow-md" : "text-muted hover:text-white"}`}
                onClick={() => {
                  setTab("signup");
                  navigate("signup");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-serif font-bold text-white mb-2">
                {tab === "signup" ? "Create your profile." : "Welcome to Juicy Match"}
              </h2>
              <p className="text-cream/80 m-0">
                {tab === "signup"
                  ? "Join Juicy Match privately. Connect at your own pace."
                  : "Enter your details to access your matches and account."}
              </p>
            </div>

            <form onSubmit={tab === "signup" ? handleRegister : handleLogin} autoComplete="off" className="flex flex-col gap-5">
              {tab === "signup" && (
                <div className="flex gap-4">
                  <div className="flex flex-col gap-2 flex-[1.5]">
                    <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">
                      What should we call you?
                    </label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={40}
                      value={pseudonym}
                      onChange={(e) => setPseudonym(e.target.value)}
                      placeholder="e.g. Leo"
                      autoComplete="off"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-pink transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">
                      Your age
                    </label>
                    <input
                      type="number"
                      required
                      min={21}
                      max={100}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="21+"
                      autoComplete="off"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-pink transition-colors text-center"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  autoComplete="email"
                  maxLength={254}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-pink transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">
                    Password
                  </label>
                  {tab === "signin" && (
                    <button
                      type="button"
                      className="text-pink hover:text-[#ff2a85] text-sm font-semibold transition-colors"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={tab === "signup" ? 8 : 4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-pink transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-white transition-colors"
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {tab === "signup" && (
                <div className="mt-2 mb-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        required
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-white/20 rounded bg-black/40 checked:bg-pink checked:border-pink transition-colors cursor-pointer"
                      />
                      <Icon name="check" className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <span className="text-sm text-muted leading-relaxed select-none">
                      I agree to the{" "}
                      <span
                        className="text-pink hover:text-white transition-colors cursor-pointer font-semibold"
                        onClick={(e) => { e.preventDefault(); setPolicyModal({ open: true, kind: "terms" }); }}
                      >
                        Terms of Service
                      </span>
                      {" "}and acknowledge the{" "}
                      <span
                        className="text-pink hover:text-white transition-colors cursor-pointer font-semibold"
                        onClick={(e) => { e.preventDefault(); setPolicyModal({ open: true, kind: "privacy" }); }}
                      >
                        Privacy Notice
                      </span>.
                    </span>
                  </label>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-pink/15 border border-pink/30 text-white text-sm flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink to-[#e11d48] text-white font-bold py-4 rounded-xl shadow-[0_4px_16px_rgba(225,29,72,0.4)] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed mt-4" 
                disabled={loading}
              >
                {loading ? (
                  <span>Processing…</span>
                ) : (
                  <>
                    <span>{tab === "signup" ? "Create account" : "Sign in"}</span>
                    <Icon name="arrow" className="w-5 h-5" />
                  </>
                )}
              </button>

            </form>

            <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm text-muted font-medium">
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => setPolicyModal({ open: true, kind: "privacy" })}
              >
                Privacy Notice
              </button>
              <span className="opacity-40">·</span>
              <button
                type="button"
                className="hover:text-white transition-colors"
                onClick={() => setPolicyModal({ open: true, kind: "terms" })}
              >
                Community & Terms
              </button>
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