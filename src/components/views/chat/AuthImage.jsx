import React, { useState, useEffect } from "react";
import { mediaService } from "../../../services/mediaService";

export const blobUrlCache = new Map();

export const DEMO_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
];

export default function AuthImage({ src, alt, onClick, className, style }) {
  const isDirect = Boolean(src && (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")));
  const [fallbackIndex] = useState(() => Math.floor(Math.random() * DEMO_FALLBACK_IMAGES.length));
  const [imgSrc, setImgSrc] = useState(() => {
    if (!src) return DEMO_FALLBACK_IMAGES[fallbackIndex];
    if (isDirect) return src;
    return blobUrlCache.get(src) || null;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
      setHasError(false);
      return;
    }

    if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) {
      setImgSrc(src);
      setHasError(false);
      return;
    }

    if (blobUrlCache.has(src)) {
      setImgSrc(blobUrlCache.get(src));
      setHasError(false);
      return;
    }

    let active = true;
    mediaService.fetchMediaBlobUrl(src).then((blobUrl) => {
      if (!active) return;
      if (blobUrl && (blobUrl.startsWith("blob:") || blobUrl.startsWith("data:") || blobUrl.startsWith("http"))) {
        blobUrlCache.set(src, blobUrl);
        setImgSrc(blobUrl);
        setHasError(false);
      } else {
        setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
        setHasError(false);
      }
    }).catch(() => {
      if (!active) return;
      setImgSrc(DEMO_FALLBACK_IMAGES[fallbackIndex]);
      setHasError(false);
    });

    return () => {
      active = false;
    };
  }, [src, fallbackIndex]);

  const displaySrc = (hasError || !imgSrc) ? DEMO_FALLBACK_IMAGES[fallbackIndex] : imgSrc;

  return (
    <img
      src={displaySrc}
      alt={alt || "Shared photo"}
      className={className}
      loading="lazy"
      onClick={onClick}
      style={{
        cursor: onClick ? "zoom-in" : "default",
        width: "100%",
        maxWidth: "260px",
        maxHeight: "240px",
        borderRadius: "14px",
        objectFit: "cover",
        display: "block",
        ...style,
      }}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
