import React, { useState, useEffect } from "react";
import Icon from "../../common/Icon";
import PageHead from "../../common/PageHead";
import Loader from "../../common/Loader";
import { useApp } from "../../../context/AppContext";
import { mediaService } from "../../../services/mediaService";

export default function AlbumView() {
  const { showToast } = useApp();
  const [mediaItems, setMediaItems] = useState([]);
  const [photoRequests, setPhotoRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [isPrimaryCheck, setIsPrimaryCheck] = useState(false);

  // Fetch owned media and photo requests
  const loadMedia = async () => {
    setLoading(true);
    try {
      const mediaRes = await mediaService.getMediaList();
      if (mediaRes?.items) setMediaItems(mediaRes.items);
    } catch (err) {
      console.warn("Media load error:", err.message);
    }

    try {
      const reqRes = await mediaService.getPhotoRequests();
      if (reqRes?.items) setPhotoRequests(reqRes.items);
    } catch (err) {
      console.warn("Photo requests load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) {
      showToast("Please select a photo to upload.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          await mediaService.uploadMedia(base64Data, "photo", isPrimaryCheck);
          showToast("Photo uploaded privately to your vault.");
          setPhotoFile(null);
          setIsPrimaryCheck(false);
          loadMedia();
        } catch (err) {
          showToast(err.message || "Upload failed. Please check file format.");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(photoFile);
    } catch (err) {
      showToast("File reading error.");
      setUploading(false);
    }
  };

  const handleSetPrimary = async (mediaId) => {
    try {
      await mediaService.setPrimaryPhoto(mediaId);
      showToast("Primary avatar updated.");
      loadMedia();
    } catch (err) {
      showToast(err.message || "Failed to set primary photo.");
    }
  };

  const handleDelete = async (mediaId) => {
    try {
      await mediaService.deleteMedia(mediaId);
      showToast("Photo deleted from vault.");
      setMediaItems((prev) => prev.filter((m) => m.id !== mediaId));
    } catch (err) {
      showToast(err.message || "Failed to delete photo.");
    }
  };

  const handleRespondRequest = async (requestId, action, mediaId) => {
    try {
      await mediaService.respondToPhotoRequest(requestId, action, mediaId);
      showToast(`Photo request ${action}d.`);
      loadMedia();
    } catch (err) {
      showToast(err.message || "Failed to respond to request.");
    }
  };

  return (
    <>
      <PageHead
        showBack
        backTo="profile"
        backLabel="Back to Profile"
        kicker="Share by choice"
        heading="A private glimpse."
        description="Photos stay protected in your encrypted vault. Approve each request and revoke access when you choose."
      />

      <div className="two-col">
        <section>
          {loading ? (
            <Loader text="Loading media vault…" />
          ) : mediaItems.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                background: "rgba(36, 23, 38, 0.4)",
                borderRadius: "20px",
                border: "1px dashed rgba(255, 255, 255, 0.1)",
              }}
            >
              <Icon name="lock" style={{ width: "36px", height: "36px", color: "var(--lilac)", marginBottom: "12px" }} />
              <div style={{ fontWeight: "600", fontSize: "1.1rem", marginBottom: "6px" }}>Your Photo Vault is Empty</div>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>
                Upload your private photos using the form on the right.
              </p>
            </div>
          ) : (
            <div className="album">
              {mediaItems.map((m) => (
                <figure key={m.id} style={{ position: "relative" }}>
                  <div
                    style={{
                      height: "200px",
                      borderRadius: "18px",
                      background: "#2a1a2e",
                      display: "grid",
                      placeItems: "center",
                      border: m.isPrimary ? "2px solid var(--pink)" : "1px solid var(--line)",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <img
                      src={m.url || `/api/media/${m.id}`}
                      alt="Your private photo"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.src = "/assets/portraits.png";
                      }}
                    />
                    {m.isPrimary && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          background: "var(--pink)",
                          color: "#fff",
                          fontSize: "0.68rem",
                          fontWeight: "600",
                          padding: "2px 8px",
                          borderRadius: "100px",
                        }}
                      >
                        Primary Avatar
                      </span>
                    )}
                  </div>
                  <figcaption
                    className="small"
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{m.isPrimary ? "Avatar" : "Private"}</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {!m.isPrimary && (
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
                          style={{ minHeight: "26px", padding: "2px 8px", fontSize: "0.72rem" }}
                          onClick={() => handleSetPrimary(m.id)}
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        className="button quiet danger"
                        style={{ minHeight: "26px", padding: "2px 8px", fontSize: "0.72rem" }}
                        onClick={() => handleDelete(m.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}

          <h2 className="gap">Photo requests ({photoRequests.length})</h2>
          {photoRequests.length === 0 ? (
            <p>No pending photo requests from connections.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {photoRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: "16px",
                    borderRadius: "14px",
                    background: "rgba(33, 21, 37, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", fontSize: "0.94rem" }}>
                      {req.requesterName || req.owner || "Connection"} requested photo access
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                      Status: {req.state || "Pending"}
                    </div>
                  </div>
                  {req.state === "pending" && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-pink hover:bg-[#ff2a85] text-white font-semibold transition-all shadow-[0_4px_14px_rgba(233,22,113,0.3)] min-w-[120px]"
                        style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.78rem" }}
                        onClick={() => handleRespondRequest(req.id, "approve", mediaItems[0]?.id)}
                      >
                        Grant
                      </button>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 h-[46px] px-6 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 min-w-[120px]"
                        style={{ minHeight: "32px", padding: "4px 12px", fontSize: "0.78rem" }}
                        onClick={() => handleRespondRequest(req.id, "deny")}
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="panel">
          <h2>Keep a little mystery.</h2>
          <form onSubmit={handleUpload}>
            <label className="field">
              Choose a photo · up to 2.6 MB
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setPhotoFile(e.target.files[0])}
              />
            </label>

            <label className="check" style={{ marginTop: "14px" }}>
              <input
                type="checkbox"
                checked={isPrimaryCheck}
                onChange={(e) => setIsPrimaryCheck(e.target.checked)}
              />
              <span>Set as primary avatar photo</span>
            </label>

            <p className="small gap">
              Upload only photos you have permission to share. The backend removes image EXIF metadata. Uploading does not make a photo public.
            </p>

            <button type="submit" className="primary" disabled={uploading || !photoFile}>
              {uploading ? "Uploading…" : "Upload privately"} <Icon name="lock" />
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
