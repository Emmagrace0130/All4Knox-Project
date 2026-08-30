import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ children, className, as: Tag = 'div' }: CardProps) {
  return <Tag className={['card', className].filter(Boolean).join(' ')}>{children}</Tag>;
}
