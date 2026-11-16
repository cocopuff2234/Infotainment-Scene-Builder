import type { ReactNode } from "react";
import "./BackLink.css";

type BackLinkProps = {
  children: ReactNode;
  className?: string;
  title?: string;
} & (
  | { href: string; onClick?: never; disabled?: never; autoFocus?: never }
  | { href?: never; onClick: () => void; disabled?: boolean; autoFocus?: boolean }
);

export function BackLink({ children, className = "", title, ...action }: BackLinkProps) {
  const content = <>
    <span className="back-link-icon" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 5-7 7 7 7M5 12h14" /></svg></span>
    <span>{children}</span>
  </>;
  const classes = `app-back-link ${className}`.trim();
  return action.href !== undefined
    ? <a className={classes} href={action.href} title={title}>{content}</a>
    : <button className={classes} type="button" onClick={action.onClick} disabled={action.disabled} autoFocus={action.autoFocus} title={title}>{content}</button>;
}
