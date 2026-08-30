import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'sm';

const classes = (variant: ButtonVariant, size: ButtonSize, extra?: string) =>
  ['btn', `btn--${variant}`, `btn--${size}`, extra].filter(Boolean).join(' ');

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  return <button className={classes(variant, size, className)} {...rest} />;
}

interface LinkButtonProps {
  to: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function LinkButton({
  to,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: LinkButtonProps) {
  return (
    <Link to={to} className={classes(variant, size, className)}>
      {children}
    </Link>
  );
}
