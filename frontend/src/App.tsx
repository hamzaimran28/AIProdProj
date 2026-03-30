import { TranscriptInput } from "@/features/transcript/TranscriptInput";
import { PlatformSelect } from "@/features/platforms/PlatformSelect";
import { GenerateBar } from "@/features/generation/GenerateBar";
import { ReviewPosts } from "@/features/generation/ReviewPosts";

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>The Creator’s Crucible</h1>
        <p className="tagline">
          Paste a transcript → get platform-ready text posts. Phase 3 MVP (text in;
          YouTube URL next).
        </p>
      </header>
      <main className="main">
        <TranscriptInput />
        <PlatformSelect />
        <GenerateBar />
        <ReviewPosts />
      </main>
    </div>
  );
}
