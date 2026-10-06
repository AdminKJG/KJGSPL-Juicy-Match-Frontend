import { request } from "./api";

const BLOCKED_KEY = "jm_blocked_members";

export const getBlockedMemberIds = () => {
  try {
    const raw = localStorage.getItem(BLOCKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const isMemberBlocked = (targetId) => {
  if (!targetId) return false;
  const list = getBlockedMemberIds();
  return list.includes(String(targetId));
};

export const saveBlockedMemberId = (targetId) => {
  if (!targetId) return;
  try {
    const list = getBlockedMemberIds();
    const strId = String(targetId);
    if (!list.includes(strId)) {
      list.push(strId);
      localStorage.setItem(BLOCKED_KEY, JSON.stringify(list));
    }
  } catch {}
};

export const broadcastBlockEvent = (targetId) => {
  try {
    const channel = new BroadcastChannel("jm_block_channel");
    channel.postMessage({ type: "MEMBER_BLOCKED", targetId: String(targetId) });
    channel.close();
  } catch {}
  try {
    localStorage.setItem("jm_last_block_event", JSON.stringify({ targetId: String(targetId), time: Date.now() }));
  } catch {}
};

export const blockService = {
  // ── Block Member (POST /v1/block) ──────────────────────────────────────────
  blockMember: async (targetAccountId) => {
    if (!targetAccountId) {
      throw new Error("Target account ID is required");
    }

    const payload = { target: String(targetAccountId) };

    const res = await request("/block", {
      method: "POST",
      body: payload,
      auth: true,
    });

    // Save blocked status locally to immediately filter across views
    saveBlockedMemberId(targetAccountId);
    broadcastBlockEvent(targetAccountId);

    return res || { ok: true };
  },

  getBlockedMemberIds,
  isMemberBlocked,
  saveBlockedMemberId,
};
