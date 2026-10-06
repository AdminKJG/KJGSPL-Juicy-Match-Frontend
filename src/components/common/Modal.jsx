import React from "react";
import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

export default function Modal() {
  const { modalContent, closeModal } = useApp();

  if (!modalContent) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="modal-dialog" role="dialog" aria-modal="true">
        <button
          className="round quiet close"
          onClick={closeModal}
          aria-label="Close dialog"
        >
          <Icon name="close" />
        </button>
        <h2 id="dialog-title">{modalContent.title}</h2>
        <div className="modal-body">{modalContent.content}</div>
      </div>
    </div>
  );
}
