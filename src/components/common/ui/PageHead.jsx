import React from "react";
import Icon from "./Icon";
import { useApp } from "../../../context/AppContext";

export default function PageHead({
  kicker,
  heading,
  description,
  action,
  showBack = false,
  backTo,
  backLabel = "Back",
  onBack,
}) {
  const { navigate } = useApp ? useApp() : {};

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backTo && navigate) {
      navigate(backTo);
    } else if (navigate) {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate("explore");
      }
    } else if (window.history.length > 1) {
      window.history.back();
    }
  };

  const shouldRenderBack = showBack || Boolean(backTo) || Boolean(onBack);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8 pt-4">
      <div className="flex flex-col gap-2">
        {shouldRenderBack && (
          <div className="mb-2">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-muted hover:text-white transition-colors text-sm font-semibold border border-white/10"
              onClick={handleBack}
              aria-label={backLabel}
            >
              <Icon name="back" className="w-4 h-4" />
              <span>{backLabel}</span>
            </button>
          </div>
        )}
        {kicker && <div className="text-xs font-bold tracking-widest uppercase text-pink">{kicker}</div>}
        <h1 tabIndex="-1" className="text-3xl sm:text-4xl font-serif font-bold text-white m-0 tracking-tight">{heading}</h1>
        {description && <p className="text-muted text-[0.95rem] max-w-2xl m-0 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
