import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "./Button";

interface ModalProps {
  title: string;
  open: boolean;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
}

export function Modal({ title, open, children, actions, onClose }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {actions ? <div className="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">{actions}</div> : null}
      </div>
    </div>
  );
}

export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      Cancelar
    </Button>
  );
}
