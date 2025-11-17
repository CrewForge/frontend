import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, Users, Target, TrendingUp, ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => void;
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
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
          <Button onClick={onSignIn}>
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge className="mb-6" variant="secondary">
            Multi-Agent LLM Research Platform
          </Badge>
          <h1 className="mb-6 text-5xl">
            Dynamic Teaming of Large Language Model Agents
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            CrewForge is a research platform that explores how coordinated sets of specialized 
            LLM agents perform compared to single monolithic LLMs across diverse interactive environments.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={onSignIn}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline">
              View Research
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-6 mb-20">
          <Card className="p-6 text-center">
            <div className="text-4xl mb-2">+24.8%</div>
            <div className="text-sm text-muted-foreground">Avg Performance Delta</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl mb-2">7</div>
            <div className="text-sm text-muted-foreground">Specialized Agents</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl mb-2">3</div>
            <div className="text-sm text-muted-foreground">Test Environments</div>
          </Card>
          <Card className="p-6 text-center">
            <div className="text-4xl mb-2">299</div>
            <div className="text-sm text-muted-foreground">Experiments Run</div>
          </Card>
        </div>

        {/* Research Objectives */}
        <div className="mb-20">
          <h2 className="text-center mb-12">Research Objectives</h2>
          <div className="grid grid-cols-2 gap-8">
            <Card className="p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2">Empirical Research</h3>
                  <p className="text-muted-foreground">
                    Provide a controlled test-bed for measuring how a coordinated set of specialized 
                    LLM agents performs relative to a single monolithic LLM across diverse interactive 
                    environments such as strategy games and social simulations.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2">Reusable Tooling</h3>
                  <p className="text-muted-foreground">
                    Deliver a modular, Python-based framework that allows researchers to instantiate, 
                    configure, and extend multi-agent workflows with minimal boilerplate, fostering 
                    rapid experimentation.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2">Transparent Evaluation</h3>
                  <p className="text-muted-foreground">
                    Couple the backend framework with a web dashboard that exposes live state, 
                    audit logs, and performance metrics so results are observable, reproducible, 
                    and easy to analyze.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="mb-2">Knowledge Dissemination</h3>
                  <p className="text-muted-foreground">
                    Release the artifacts (code, benchmarks, and findings) under permissive licenses, 
                    enabling the wider AI community to validate, critique, and build upon the work.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="text-center">
          <h2 className="mb-8">Technology Stack</h2>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <Badge variant="outline" className="text-sm px-4 py-2">Python + Flask</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">Ollama LLMs</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">React + TypeScript</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">Docker</Badge>
            <Badge variant="outline" className="text-sm px-4 py-2">Multi-Agent Systems</Badge>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="mb-4">Project</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">About</a></li>
                <li><a href="#" className="hover:text-foreground">Research Paper</a></li>
                <li><a href="#" className="hover:text-foreground">Team</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">GitHub</a></li>
                <li><a href="#" className="hover:text-foreground">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground">PIPEDA/GDPR Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 CrewForge Research Project • McMaster University</p>
            <p className="mt-2">Dr. Mehdi Moradi & Amirhossein Sabour</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
