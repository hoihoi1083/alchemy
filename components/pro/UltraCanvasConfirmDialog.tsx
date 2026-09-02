"use client";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function UltraCanvasConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-labelledby="ultra-confirm-title"
        aria-describedby="ultra-confirm-desc"
        className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ultra-confirm-title"
          className="text-base font-semibold text-slate-100"
        >
          {title}
        </h2>
        <p id="ultra-confirm-desc" className="mt-2 text-sm text-slate-400">
          {message}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              destructive
                ? "bg-red-600 hover:bg-red-500"
                : "bg-violet-600 hover:bg-violet-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
