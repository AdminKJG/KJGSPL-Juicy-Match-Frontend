import React from "react";
import Icon from "./Icon";
import { useApp } from "../../../context/AppContext";

export default function Modal() {
  const { modalContent, closeModal } = useApp();

  if (!modalContent) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="relative w-full max-w-lg my-auto bg-gradient-to-b from-[#24112c] via-[#1a0c20] to-[#100615] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(244,63,94,0.15)] text-white flex flex-col gap-4 animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <h2 id="dialog-title" className="text-base sm:text-lg font-extrabold text-white tracking-tight m-0">
            {modalContent.title}
          </h2>
          <button
            type="button"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            onClick={closeModal}
            aria-label="Close dialog"
          >
            <Icon name="close" className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body overflow-y-auto max-h-[calc(85vh-100px)] no-scrollbar">
          {modalContent.content}
        </div>
      </div>
    </div>
  );
}
