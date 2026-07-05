import {
  Bell,
  BookOpen,
  Boxes,
  Flame,
  Gift,
  Menu,
  Swords,
  Trophy,
  Users
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="home-shell">
      <section className="home-topbar" aria-label="Player status">
        <div className="profile-card">
          <div className="profile-avatar">K</div>
          <div className="profile-copy">
            <strong>Kaleidoscope</strong>
            <span>Lv. 21</span>
          </div>
          <div className="profile-progress" aria-hidden="true">
            <span />
          </div>
        </div>

        <div className="home-currency">
          <span className="gem-icon" aria-hidden="true" />
          <strong>2453</strong>
        </div>

        <nav className="home-utility" aria-label="Quick actions">
          <button type="button" disabled>
            <Bell size={20} aria-hidden="true" />
            Notices
          </button>
          <button type="button" disabled>
            <Gift size={20} aria-hidden="true" />
            Rewards
          </button>
          <button type="button" disabled>
            <Users size={20} aria-hidden="true" />
            Friend
          </button>
          <button type="button" disabled>
            <Menu size={22} aria-hidden="true" />
            Menu
          </button>
        </nav>
      </section>

      <aside className="home-menu" aria-label="Main navigation">
        <Link className="home-menu-item is-active" href="/training">
          <Swords size={30} aria-hidden="true" />
          <span>Duel</span>
        </Link>
        <button className="home-menu-item" type="button" disabled>
          <BookOpen size={28} aria-hidden="true" />
          <span>Deck</span>
        </button>
        <button className="home-menu-item" type="button" disabled>
          <Flame size={28} aria-hidden="true" />
          <span>Solo</span>
        </button>
        <button className="home-menu-item" type="button" disabled>
          <Boxes size={28} aria-hidden="true" />
          <span>Collection</span>
        </button>
      </aside>

      <section className="home-stage" aria-label="Kaleidoscope home">
        <div className="home-card-fan" aria-hidden="true">
          <span className="fan-card fan-card-1" />
          <span className="fan-card fan-card-2" />
          <span className="fan-card fan-card-3" />
        </div>
        <div className="home-hero-art" aria-hidden="true" />
        <div className="home-title-block">
          <span>Prototype Build</span>
          <h1>Kaleidoscope</h1>
          <p>Local battle lab for cards, champions, spells, and combat rules.</p>
        </div>
      </section>

      <section className="home-news" aria-label="Events and missions">
        <article className="news-banner">
          <span>Mission</span>
          <strong>Test the battle engine</strong>
          <small>Play a training duel and verify the newest rule changes.</small>
        </article>
        <article className="mission-card">
          <span>Daily</span>
          <strong>Cast 3 spells</strong>
          <small>Reward systems are placeholder only.</small>
        </article>
      </section>

      <section className="duel-panel" aria-label="Duel modes">
        <div className="duel-panel-glow" aria-hidden="true" />
        <span className="duel-panel-kicker">Next</span>
        <h2>Training Duel</h2>
        <p>Enter the current local 1v1 board. No matchmaking yet.</p>
        <Link className="duel-start-link" href="/training">
          <Trophy size={24} aria-hidden="true" />
          Start Practice
        </Link>
      </section>
    </main>
  );
}
