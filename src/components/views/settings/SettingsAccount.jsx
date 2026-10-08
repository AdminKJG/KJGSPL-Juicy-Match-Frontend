import React from "react";
import Icon from "../../common/Icon";

export default function SettingsAccount({ logout, setShowDeleteModal }) {
  return (
    <div className="bg-surface rounded-3xl p-6 md:p-8 border border-white/5 shadow-xl mb-6">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-inner">
          <Icon name="user" className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">Account Management</h2>
          <p className="text-cream text-[0.95rem] leading-relaxed m-0">
            Sign out of your account or permanently delete your profile and data.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col justify-between items-start gap-4 h-full">
          <div>
            <h3 className="text-white font-bold text-lg mb-2">Sign Out</h3>
            <p className="text-muted text-[0.85rem] m-0">End your current session. You'll need to sign in again to access your messages and matches.</p>
          </div>
          <button
            type="button"
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors w-full sm:w-auto mt-2"
            onClick={logout}
          >
            Sign out
          </button>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl flex flex-col justify-between items-start gap-4 h-full">
          <div>
            <h3 className="text-red-400 font-bold text-lg mb-2">Delete Account</h3>
            <p className="text-muted text-[0.85rem] m-0">Permanently delete your account, connections, messages, and all associated data. This action cannot be undone.</p>
          </div>
          <button
            type="button"
            className="px-6 py-2.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-200 hover:text-white font-semibold rounded-xl transition-colors w-full sm:w-auto mt-2"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
