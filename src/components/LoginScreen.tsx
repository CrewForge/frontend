import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import { loginUser, registerUser, ApiError, getApiBaseUrl } from '../lib/api';
import type { AuthSession } from '../lib/api';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
  onBack: () => void;
}

export function LoginScreen({ onLoginSuccess, onBack }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [backendReachable, setBackendReachable] = useState(true);
  const [healthChecked, setHealthChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    fetch(`${getApiBaseUrl()}/health`, { signal: controller.signal })
      .then((response) => {
        setBackendReachable(response.ok);
      })
      .catch(() => {
        setBackendReachable(false);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setHealthChecked(true);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  const getFriendlyAuthError = (apiError: ApiError) => {
    switch (apiError.code) {
      case 'auth.username_exists':
        return 'That username is already in use. Try another username or sign in.';
      case 'auth.registration_disabled':
        return 'Account creation is currently disabled on the backend.';
      case 'auth.invalid_payload':
        return 'Please enter both a username and a password.';
      case 'auth.invalid_credentials':
        return 'Invalid username or password.';
      case 'auth.invalid_credentials_token':
        return 'Unable to encode credentials. Please try again.';
      case 'auth.invalid_token':
        return 'Your session has expired. Please sign in again.';
      default:
        if (apiError.status >= 500) {
          return 'Backend error while processing authentication. Please try again shortly.';
        }
        if (apiError.code === 'api.error') {
          return 'Unable to complete authentication request. Confirm the backend is running and API base URL is correct.';
        }
        return apiError.message || 'Authentication failed.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setError('Username and password are required.');
      return;
    }

    if (isCreatingAccount && !agreedToTerms) {
      setError('You must agree to the terms to create an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isCreatingAccount) {
        await registerUser(normalizedUsername, password);
        setInfo('Account created. Signing you in...');
      }

      const session = await loginUser(normalizedUsername, password);
      onLoginSuccess(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(getFriendlyAuthError(err));
      } else {
        setError('Unable to reach the backend. Check API server and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <Button type="button" variant="ghost" size="sm" onClick={onBack} className="px-0 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L6 14V26L20 36L34 26V14L20 4Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
              <circle cx="20" cy="20" r="4" fill="white"/>
              <path d="M20 16V12M20 28V24M16 20H12M28 20H24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-center mb-2">CrewForge</h1>
          <p className="text-center text-muted-foreground">
            Sign in to access the workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {healthChecked && !backendReachable && (
            <div className="rounded-md border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Backend is currently unreachable at <span className="font-mono">{getApiBaseUrl()}</span>. Sign-in and account creation will fail until the API is running.
            </div>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {info && !error && (
            <div className="rounded-md bg-primary/10 border border-primary/30 px-3 py-2 text-sm text-primary">
              {info}
            </div>
          )}
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="mt-1"
            />
          </div>

          {isCreatingAccount && (
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I agree to the Terms of Service and Privacy Policy (draft).
                </label>
                <p className="text-xs text-muted-foreground">
                  By creating an account, you agree to data handling disclosures
                  and PIPEDA/GDPR compliance.
                </p>
              </div>
            </div>
          )}

          {!isCreatingAccount && (
            <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Session persistence is handled automatically in the workspace.
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={(isCreatingAccount && !agreedToTerms) || isSubmitting}
          >
            {isSubmitting ? 'Please wait…' : isCreatingAccount ? 'Create Account' : 'Sign In'}
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">
              {isCreatingAccount ? 'Already have an account?' : "Don't have an account?"}{' '}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsCreatingAccount(!isCreatingAccount);
                setAgreedToTerms(false);
              }}
              className="text-primary hover:underline"
            >
              {isCreatingAccount ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-xs text-muted-foreground">
          <p>Authentication is handled through the CrewForge backend API.</p>
          <p className="mt-1">If signup fails, check backend registration settings and API connectivity.</p>
        </div>
      </Card>
    </div>
  );
}
