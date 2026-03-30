import { TranscriptInput } from "@/features/transcript/TranscriptInput";
import { PlatformSelect } from "@/features/platforms/PlatformSelect";
import { GenerateBar } from "@/features/generation/GenerateBar";
import { ReviewPosts } from "@/features/generation/ReviewPosts";
import { IconArrowFlow, IconPlatforms, IconSpark, IconTranscript } from "@/ui/icons";

export default function App() {
  return (
    <div className="app-shell">
      <div className="app-bg" aria-hidden="true">
        <div className="app-bg-base" />
        <div className="app-bg-mesh" />
        <div className="app-bg-blob app-bg-blob--1" />
        <div className="app-bg-blob app-bg-blob--2" />
        <div className="app-bg-blob app-bg-blob--3" />
        <div className="app-bg-grid" />
        <div className="app-bg-vignette" />
      </div>
      <div className="app-noise" aria-hidden="true" />
      <a className="skip-link" href="#main-content">
        Skip to workflow
      </a>
      <div className="app-inner">
        <header className="hero">
          <div className="hero-badge">
            <span className="hero-badge-dot" aria-hidden />
            Workflow
          </div>
          <h1>The Creator’s Crucible</h1>
          <p className="tagline">
            Paste a transcript and get platform-ready text drafts—tuned for each
            network. Paste your text now; YouTube URL import is next.
          </p>
          <div className="hero-cards" aria-label="Workflow summary">
            <article className="mini-card">
              <div className="mini-card-icon" aria-hidden="true">
                <IconTranscript />
              </div>
              <div className="mini-card-body">
                <span className="mini-card-kicker">Source</span>
                <span className="mini-card-title">Transcript</span>
              </div>
            </article>
            <span className="hero-cards-join" aria-hidden="true">
              <IconArrowFlow />
            </span>
            <article className="mini-card">
              <div className="mini-card-icon" aria-hidden="true">
                <IconPlatforms />
              </div>
              <div className="mini-card-body">
                <span className="mini-card-kicker">Targets</span>
                <span className="mini-card-title">Platforms</span>
              </div>
            </article>
            <span className="hero-cards-join" aria-hidden="true">
              <IconArrowFlow />
            </span>
            <article className="mini-card mini-card--accent">
              <div className="mini-card-icon mini-card-icon--accent" aria-hidden="true">
                <IconSpark />
              </div>
              <div className="mini-card-body">
                <span className="mini-card-kicker">Result</span>
                <span className="mini-card-title">Draft posts</span>
              </div>
            </article>
          </div>
        </header>
        <main id="main-content" className="main" tabIndex={-1}>
          <TranscriptInput />
          <PlatformSelect />
          <GenerateBar />
          <ReviewPosts />
        </main>
        <footer className="site-footer">Assistive drafting—always verify before publish.</footer>
      </div>
    </div>
  );
}
