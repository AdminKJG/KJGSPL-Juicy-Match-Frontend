import React from "react";
import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

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
    <div className="page-head">
      <div>
        {shouldRenderBack && (
          <div className="page-head-back-wrap">
            <button
              type="button"
              className="page-head-back-btn"
              onClick={handleBack}
              aria-label={backLabel}
            >
              <Icon name="back" />
              <span>{backLabel}</span>
            </button>
          </div>
        )}
        {kicker && <div className="eyebrow">{kicker}</div>}
        <h1 tabIndex="-1">{heading}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
