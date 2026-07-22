"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertDialogContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | null>(null);

function useAlertDialog() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error("AlertDialog components must be used within an <AlertDialog />");
  }
  return context;
}

export function AlertDialog({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (value: React.SetStateAction<boolean>) => {
      const nextOpen = typeof value === "function" ? value(open) : value;
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, open, onOpenChange]
  );

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({
  children,
  asChild = false,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen } = useAlertDialog();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    setOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e);
        setOpen(true);
      },
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export function AlertDialogContent({
  className,
  children,
  style,
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "default" | "lg";
}) {
  const { open, setOpen } = useAlertDialog();

  if (!open) return null;

  const maxWidths = {
    sm: "min(400px, 92vw)",
    default: "min(520px, 92vw)",
    lg: "min(680px, 92vw)",
  };

  return (
    <div
      className="calendar-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        // Confirmation dialogs must stay above every editor modal, including
        // the member editor which uses z-index 9999.
        zIndex: 20000,
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(15, 23, 20, 0.45)",
        }}
        onClick={() => setOpen(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn("calendar-modal-content", className)}
        style={{
          position: "relative",
          zIndex: 1,
          width: maxWidths[size] || maxWidths.default,
          borderRadius: "24px",
          backgroundColor: "#ffffff",
          padding: "26px",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
          ...style,
        }}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2 text-left", className)}
      style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-bold text-gray-900 tracking-tight", className)}
      style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#17211e", ...style }}
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-600 leading-relaxed", className)}
      style={{ margin: "6px 0 0", fontSize: "14px", color: "#68767b", lineHeight: 1.5, ...style }}
      {...props}
    />
  );
}

export function AlertDialogFooter({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6", className)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "10px",
        marginTop: "24px",
        ...style,
      }}
      {...props}
    />
  );
}

export function AlertDialogAction({
  className,
  style,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useAlertDialog();

  return (
    <button
      type="button"
      className={cn("modal-submit-btn", className)}
      style={{
        padding: "9px 20px",
        border: "0",
        borderRadius: "999px",
        backgroundColor: "var(--theme-primary, #17211e)",
        color: "#ffffff",
        fontSize: "13px",
        fontWeight: 700,
        cursor: "pointer",
        ...style,
      }}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  style,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useAlertDialog();

  return (
    <button
      type="button"
      className={cn("modal-cancel-btn", className)}
      style={{
        padding: "9px 18px",
        border: "1px solid #d1d5db",
        borderRadius: "999px",
        backgroundColor: "transparent",
        color: "#4b5563",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        ...style,
      }}
      onClick={(e) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...props}
    />
  );
}
