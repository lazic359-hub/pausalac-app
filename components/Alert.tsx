import type { CSSProperties, ReactNode } from "react";

export type AlertVariant = "info" | "warning" | "danger";

const variantClass: Record<AlertVariant, string> = {
  info: "alert--info",
  warning: "alert--warning",
  danger: "alert--danger",
};

type AlertProps = {
  variant: AlertVariant;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

/**
 * Inline obaveštenja u tri nivoa: info (plavo), upozorenje (žuto), opasnost (blagi crveni — samo kritično).
 */
export function Alert({ variant, children, className = "", style }: AlertProps) {
  return (
    <div className={`alert ${variantClass[variant]} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}
