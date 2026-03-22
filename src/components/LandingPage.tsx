import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
  onViewDemo: () => void;
}

export function LandingPage({ onSignIn, onViewDemo }: LandingPageProps) {
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
            <Button onClick={onSignIn}>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      <section className="landing-page-shell landing-section px-4 sm:px-8">
        <div className="landing-hero-panel mx-auto max-w-4xl text-center">
          <Badge className="mb-6" variant="secondary">
            Workspace Preview
          </Badge>
          <h1 className="landing-hero-title mb-4 font-semibold">
            Multi-Agent Results Workspace
          </h1>
          <p className="landing-hero-copy mx-auto mb-8 max-w-3xl text-muted-foreground">
            CrewForge presents backend run output in a polished workspace built for review, playback, and operational visibility.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={onSignIn}>
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={onViewDemo}>
              Open Preview
            </Button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Open a prepared session instantly, or sign in to access the full workspace.
          </p>
        </div>

        <div className="landing-feature-grid mt-10">
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Prepared session replay</div>
            <p className="mt-1 text-sm text-muted-foreground">A stable preview path aligned to the backend event contract.</p>
          </Card>
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Workspace access</div>
            <p className="mt-1 text-sm text-muted-foreground">Review runs inside the authenticated workspace with the same playback experience.</p>
          </Card>
          <Card className="landing-feature-card">
            <div className="text-sm font-semibold">Live source support</div>
            <p className="mt-1 text-sm text-muted-foreground">Live backend streaming remains available when runtime dependencies are configured.</p>
          </Card>
        </div>

        <Card className="landing-note-panel mt-8 p-5 sm:p-6">
          <div className="landing-note-grid text-sm text-muted-foreground">
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>The viewer prioritizes backend-derived results over decorative or inferred claims.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>The default preview path is stable and self-contained.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Live backend playback can still be tested separately when runtime dependencies are available.</span>
            </div>
            <div className="landing-note-item">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
              <span>Designed for a concise product flow: landing, workspace, and session playback.</span>
            </div>
          </div>
        </Card>
      </section>

      <footer className="border-t bg-card py-6">
        <div className="landing-page-shell px-4 sm:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>CrewForge Workspace • McMaster University</p>
            <p className="mt-1">Prepared replay is the recommended preview mode.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
