import { type ReactNode, type MouseEventHandler, type ButtonHTMLAttributes } from "react";
import Link from "next/link";

interface BrutalButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: "primary" | "secondary" | "blue";
  className?: string;
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
}

export default function BrutalButton({
  children,
  href,
  onClick,
  variant = "primary",
  className = "",
  type,
}: BrutalButtonProps) {
  const classes = `brutal-btn brutal-btn-${variant} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
