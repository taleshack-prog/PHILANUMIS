import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-bronze text-background hover:bg-bronze-bright disabled:bg-bronze/30 disabled:text-background/50",
  secondary:
    "border border-border-strong text-ink hover:border-circuit hover:text-circuit disabled:opacity-40",
  danger: "bg-danger text-background hover:opacity-90 disabled:opacity-40",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
