import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { LobbyButton } from "../ui/button";

type AuthShellProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <div className="auth-shell__grid" aria-hidden="true" />

      <section className="auth-visual" aria-label="Kaleidoscope Prism Sentinel">
        <header className="auth-brand">
          <span className="auth-brand__mark"><Sparkles size={19} /></span>
          <span>
            <strong>KALEIDOSCOPE</strong>
            <small>TACTICAL CARD GAME</small>
          </span>
        </header>

        <div className="auth-visual__copy">
          <span>Prism Network // Online</span>
          <h2>Shape the field.<br />Claim the arena.</h2>
          <p>Every card refracts the battle in a different direction.</p>
        </div>
      </section>

      <section className="auth-terminal">
        <LobbyButton asLink href="/" className="auth-terminal__back" />

        <div className="auth-terminal__content">
          <div className="auth-heading">
            <p>{eyebrow}</p>
            <h1>{title}</h1>
            <span>{description}</span>
          </div>

          {children}

          <div className="auth-switch">{footer}</div>
        </div>

        <footer className="auth-status">
          <span><i /> Authentication service online</span>
          <b>SECURE CHANNEL 01</b>
        </footer>
      </section>
    </main>
  );
}
