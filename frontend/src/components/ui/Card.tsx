import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface p-4 transition-colors ${className}`}
      {...props}
    />
  );
}

export function InfoBox({
  tone = "warning",
  children,
}: {
  tone?: "warning" | "danger" | "success";
  children: React.ReactNode;
}) {
  const toneClasses = {
    warning: "bg-warning-bg text-warning",
    danger: "bg-danger-bg text-danger",
    success: "bg-success-bg text-success",
  }[tone];

  return <p className={`rounded-md px-3 py-2 text-sm ${toneClasses}`}>{children}</p>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-md border border-border-strong bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-circuit ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`rounded-md border border-border-strong bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-dim focus:border-circuit ${props.className ?? ""}`}
    />
  );
}
