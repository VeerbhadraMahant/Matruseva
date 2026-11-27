"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function PatientDetailDialog({
  label,
  onClose,
  backdropClassName = "backdrop:bg-black/60",
  children,
}: {
  label: string;
  onClose: () => void;
  backdropClassName?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      className={`fixed inset-0 m-0 h-dvh w-full max-h-none max-w-none items-center justify-center overflow-hidden bg-transparent p-3 backdrop:backdrop-blur-xs open:flex sm:p-5 ${backdropClassName}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
