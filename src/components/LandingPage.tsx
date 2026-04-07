import React from 'react';
import { Button } from './ui/button';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-5 sm:p-10">
      <div className="dashboard-shell mb-8 sm:mb-12">
        <div className="dashboard-header-card p-6 sm:p-8">
          <div className="dashboard-header-row flex items-center justify-between">
            <div className="dashboard-header-copy flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
                  <path d="M20 4L6 14V26L20 36L34 26V14L20 4Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                  <circle cx="20" cy="20" r="4" fill="white"/>
                  <path d="M20 16V12M20 28V24M16 20H12M28 20H24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">CrewForge</h1>
            </div>
            <div className="dashboard-header-actions flex items-center">
            </div>
          </div>
        </div>
      </div>

      <section className="landing-page-shell landing-section px-4 sm:px-8">
        <div className="landing-hero-panel mx-auto max-w-4xl text-center">
          <h1 className="landing-hero-title mb-5 font-semibold">
            CrewForge Experiments
          </h1>
          <br></br>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button size="lg" className="px-8" onClick={onLogin}>
              Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>


      </section>

      <footer className="border-t bg-card py-8">
        <div className="landing-page-shell px-4 sm:px-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>CrewForge • McMaster University</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
