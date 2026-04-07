import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowLeft, LogIn, UserPlus, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: (session: { token: string; expiresAt: number; tokenTtlSeconds: number; username: string }) => void;
}

export function LoginPage({ onBack, onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data?.error?.message || 'Invalid username or password.');
        setLoading(false);
        return;
      }
      onLoginSuccess({
        token: data.token,
        expiresAt: data.expires_at,
        tokenTtlSeconds: data.token_ttl_seconds,
        username: username.trim(),
      });
    } catch {
      setError('Unable to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col">
      {/* Header */}
      <div className="p-5 sm:p-10 pb-0">
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
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 -mt-16">
        <Card className="w-full max-w-md p-8 shadow-lg">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            {/* <p className="text-sm text-muted-foreground mt-2">Enter your credentials to access the dataspaces</p> */}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium leading-none">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=""
                className="flex h-10 w-full rounded-md border-2 border-gray-300 dark:border-gray-700 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium leading-none">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                className="flex h-10 w-full rounded-md border-2 border-gray-300 dark:border-gray-700 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <br></br>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              <LogIn className="mr-2 h-4 w-4" />
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          {/* Sign Up — disabled */}
          <div className="mt-6 pt-6 border-t text-center">
            <Button variant="outline" className="w-full opacity-50 cursor-not-allowed" size="lg" disabled>
              <UserPlus className="mr-2 h-4 w-4" />
              Sign up
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Sign ups are currently restricted to authorized personnel only.
            </p>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card py-8 mt-auto">
        <div className="text-center text-sm text-muted-foreground">
          <p>CrewForge • McMaster University</p>
        </div>
      </footer>
    </div>
  );
}
