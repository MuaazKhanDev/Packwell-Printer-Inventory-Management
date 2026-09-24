"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const control =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-[#a39b90] focus:border-press";

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "ghostDanger";
}) {
  const styles = {
    primary: "bg-press text-white hover:bg-press-deep",
    secondary: "border border-line bg-white text-ink hover:bg-[#f6f1e8]",
    danger: "bg-danger text-white hover:bg-[#7f2424]",
    ghost: "text-muted hover:bg-[#f6f1e8] hover:text-ink",
    ghostDanger: "text-danger hover:bg-[#f8e6e4]",
  };
  return (
    <button
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(control, props.className)} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(control, props.className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(control, "min-h-20 resize-y", props.className)} />;
}

export function PageHeader({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-4xl leading-none font-medium tracking-tight">{title}</h1>
        {lede ? <p className="mt-2 max-w-2xl text-sm text-muted">{lede}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}

export function useLockBody() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
}

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useLockBody();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <button className="absolute inset-0 bg-[#1c1915]/40" aria-label="Close" onClick={onClose} />
      <div className={cx("relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-6", wide ? "sm:max-w-2xl" : "sm:max-w-xl")}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="dialog-title" className="font-serif text-2xl">{title}</h2>
          <button type="button" className="rounded-md px-2 text-xl leading-none text-muted hover:text-ink" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-lg bg-[#f8e6e4] px-3 py-2 text-sm text-danger">{message}</p>;
}

export function StatusPill({ status }: { status: "out" | "low" | "ok" }) {
  const map = {
    out: { label: "Out of stock", className: "bg-[#f8e6e4] text-danger" },
    low: { label: "Low stock", className: "bg-[#f8efd8] text-low" },
    ok: { label: "In stock", className: "bg-[#e5f3eb] text-ok" },
  };
  const item = map[status];
  return <span className={cx("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", item.className)}>{item.label}</span>;
}
