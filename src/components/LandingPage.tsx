import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onEnterWorkspace: () => void;
  onViewDemo: () => void;
}

export function LandingPage({ onEnterWorkspace, onViewDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="landing-page-shell flex items-center justify-between px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L6 14V26L20 36L34 26V14L20 4Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="20" cy="20" r="4" fill="white"/>
                <path d="M20 16V12M20 28V24M16 20H12M28 20H24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-xl">CrewForge</span>
          </div>
          <div className="landing-header-actions">
            <Button variant="outline" onClick={onViewDemo}>
              Open Preview
            </Button>
            <Button onClick={onEnterWorkspace}>
              Open workspace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <section className="landing-page-shell landing-section px-4 sm:px-8">
        <div className="landing-hero-panel mx-auto max-w-4xl text-center">
          <Badge className="mb-6" variant="secondary">
            Standalone workspace
          </Badge>
          <h1 className="landing-hero-title mb-4 font-semibold">
            Multi-Agent Results Workspace
          </h1>
          <p className="landing-hero-copy mx-auto mb-8 max-w-3xl text-muted-foreground">
            Review and replay run output in the browser with bundled sample sessions—no server required.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={onEnterWorkspace}>
              Open workspace
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={onViewDemo}>
              Open Preview
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Preview jumps straight into a session; workspace opens the environment chooser with full replay controls.
          </p>
        </div>

        <div className="landing-feature-grid mt-10">
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Prepared session replay</div>
            <p className="mt-1 text-sm text-muted-foreground">Bundled JSON aligned to the runner event contract, playable offline.</p>
          </Card>
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Local workspace</div>
            <p className="mt-1 text-sm text-muted-foreground">A local profile is stored in your browser—no account server.</p>
          </Card>
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Optional API</div>
            <p className="mt-1 text-sm text-muted-foreground">If you connect a CrewForge API and use a server-issued token, live streams can be enabled.</p>
          </Card>
        </div>

        <Card className="landing-note-panel mt-8 p-5 sm:p-6">
          <div className="landing-note-grid text-sm text-muted-foreground">
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>The viewer prioritizes recorded results over decorative or inferred claims.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>The default path is stable and works as static files or via any static host.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Live streaming is optional and requires a running CrewForge API plus a non-local token.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Flow: landing, workspace, session playback.</span>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t bg-card py-6">
        <div className="landing-page-shell px-4 sm:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>CrewForge Workspace • McMaster University</p>
            <p className="mt-1">Replay mode is the default; no backend is required.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
