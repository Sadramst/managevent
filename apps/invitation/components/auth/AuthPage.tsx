import type { ReactNode } from "react";
import { Card, Eyebrow } from "@managevent/ui/brand";

export interface AuthPageProps {
  eyebrow: string;
  title: string;
  lead: string;
  /** Short reassurance lines beside the form (wide screens only). */
  points?: readonly string[] | undefined;
  /** The form. */
  children: ReactNode;
}

/**
 * The layout shared by sign-in, sign-up, two-factor and password reset: the page heading and a
 * few plain reassurance lines on one side, the form on a raised sheet on the other. On a phone
 * the heading sits above the form and the reassurance lines are dropped.
 */
export function AuthPage({ eyebrow, title, lead, points, children }: AuthPageProps) {
  return (
    <main id="main" tabIndex={-1}>
      <div className="wrap auth">
        <div className="auth-intro">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1>{title}</h1>
          <p className="lead">{lead}</p>
          {points && points.length > 0 ? (
            <ul className="auth-points">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <Card variant="sheet" className="auth-card">
          {children}
        </Card>
      </div>
    </main>
  );
}
