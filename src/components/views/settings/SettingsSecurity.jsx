import React from "react";
import Icon from "../../common/Icon";
import Loader from "../../common/Loader";

export default function SettingsSecurity({
  sessions,
  loadingSessions,
  revoking,
  handleRevokeOthers,
  setShowSessionsModal,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  showCurrentPassword,
  setShowCurrentPassword,
  showNewPassword,
  setShowNewPassword,
  isChangingPassword,
  handleChangePasswordSubmit
}) {
  return (
    <>
      {/* Active Sessions */}
      <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <Icon name="discover" className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-serif font-bold text-white mb-2">Active Device Sessions</h2>
              <p className="text-cream text-[0.95rem] leading-relaxed m-0">
                Devices and browsers currently logged into your account.
              </p>
            </div>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-semibold rounded-xl transition-colors shrink-0"
              disabled={revoking}
              onClick={handleRevokeOthers}
            >
              {revoking ? "Revoking…" : "Revoke Other Devices"}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {loadingSessions ? (
            <div className="py-4"><Loader text="Refreshing active sessions…" size="small" /></div>
          ) : (
            sessions.slice(0, 4).map((sess) => (
              <div
                key={sess.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${
                  sess.current ? "bg-white/5 border-amber-500/30 shadow-md" : "bg-black/20 border-white/5"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sess.current ? "bg-amber-500/20 text-amber-500" : "bg-white/5 text-muted"}`}>
                  <Icon name="user" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-[0.95rem] truncate mb-0.5">
                    {sess.device || "Current Web Browser"}
                  </div>
                  <div className="text-muted text-[0.8rem]">
                    {sess.current
                      ? "Active now • Verified Device"
                      : `Last activity: ${
                          sess.lastActive
                            ? new Date(sess.lastActive).toLocaleString()
                            : "Recently"
                        }`}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-bold tracking-wider uppercase border ${
                    sess.current ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-white/5 text-muted border-white/10"
                  }`}>
                    {sess.current ? "Active Now" : "Other Session"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {sessions.length > 4 && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              className="flex items-center gap-2 px-6 py-2.5 bg-transparent border border-white/10 hover:bg-white/5 text-white font-semibold rounded-xl transition-colors"
              onClick={() => setShowSessionsModal(true)}
            >
              <span>View More Devices ({sessions.length})</span>
              <Icon name="arrow" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Security & Password */}
      <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
        <div className="flex items-start gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-inner">
            <Icon name="lock" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-white mb-2">Security & Password</h2>
            <p className="text-cream text-[0.95rem] leading-relaxed m-0">
              Update your authentication credentials securely.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-colors pr-12"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-white transition-colors"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <Icon name={showCurrentPassword ? "eyeOff" : "eye"} className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[0.8rem] font-bold text-muted uppercase tracking-wider">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-emerald-500 transition-colors pr-12"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted hover:text-white transition-colors"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                <Icon name={showNewPassword ? "eyeOff" : "eye"} className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-surface font-bold rounded-xl transition-transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            disabled={isChangingPassword || !currentPassword || !newPassword}
            onClick={handleChangePasswordSubmit}
          >
            {isChangingPassword ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </>
  );
}
