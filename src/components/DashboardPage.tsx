import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { LogOut, Code2 } from 'lucide-react';

interface DashboardPageProps {
  username: string;
  token: string;
  onLogout: () => void | Promise<void>;
  onEnvironmentSelect: (envId: string) => void;
}

/** Chess piece (knight) SVG icon for the Strategy Workspace card. */
function ChessKnightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 21h10" />
      <path d="M8 21v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M9 17V9.5a.5.5 0 0 1 .9-.3l1.4 1.86a.5.5 0 0 0 .7.1l1.5-1a.5.5 0 0 1 .7.1L16 13" />
      <path d="M9 9.5C9 6.5 11 4 14 3c0 0-2 1-2 3.5" />
      <circle cx="11.5" cy="7" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DashboardPage({ username, token, onLogout, onEnvironmentSelect }: DashboardPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-5 sm:p-10">
      <div className="dashboard-shell mb-8 sm:mb-12">
        <div className="dashboard-header-card p-6 sm:p-8">
          <div className="dashboard-header-row">
            <div className="dashboard-header-copy">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">CrewForge</h1>
            </div>
            <div className="dashboard-header-actions flex items-center">
              <Button variant="outline" size="sm" onClick={() => void onLogout()} disabled={!token}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-shell mt-10 sm:mt-16">
        <h2 className="mb-10 text-center text-2xl font-semibold sm:mb-14 sm:text-3xl tracking-tight">Choose an Environment</h2>
        
        <div className="mx-auto flex flex-col sm:flex-row justify-center items-center gap-8 sm:gap-12">
          <Card
            className="dashboard-env-card flex flex-col justify-center items-center w-full max-w-[300px] h-[420px] rounded-xl border-2 group cursor-pointer p-8 transition-all hover:-translate-y-2 hover:border-primary/50 hover:shadow-2xl bg-card"
            onClick={() => onEnvironmentSelect('chess')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <ChessKnightIcon className="h-12 w-12 text-primary" />
              </div>
              <h2 className="dashboard-env-title text-2xl font-semibold tracking-tight">Strategy</h2>
              <p className="mt-4 text-sm text-muted-foreground opacity-80 group-hover:opacity-100 transition-opacity">Chess against Stockfish</p>
            </div>
          </Card>

          <Card
            className="dashboard-env-card flex flex-col justify-center items-center w-full max-w-[300px] h-[420px] rounded-xl border-2 group cursor-pointer p-8 transition-all hover:-translate-y-2 hover:border-primary/50 hover:shadow-2xl bg-card"
            onClick={() => onEnvironmentSelect('evalplus')}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Code2 className="h-12 w-12 text-primary" />
              </div>
              <h2 className="dashboard-env-title text-2xl font-semibold tracking-tight">Code</h2>
              <p className="mt-4 text-sm text-muted-foreground opacity-80 group-hover:opacity-100 transition-opacity">Code against EvalPlus</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
