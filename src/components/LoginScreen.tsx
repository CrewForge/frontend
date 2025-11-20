import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { loginUser, registerUser, ApiError } from '../lib/api';
import type { AuthSession } from '../lib/api';

interface LoginScreenProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!username || !password) {
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
        await registerUser(username, password);
        setInfo('Account created. Signing you in...');
      }

      const session = await loginUser(username, password);
      onLoginSuccess(session);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unexpected error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
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
            Multi-Agent LLM Research Platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="username">Username or Email</Label>
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
                  I agree to the{' '}
                  <a href="#" className="text-primary underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-primary underline">
                    Privacy Policy
                  </a>
                </label>
                <p className="text-xs text-muted-foreground">
                  By creating an account, you agree to data handling disclosures
                  and PIPEDA/GDPR compliance.
                </p>
              </div>
            </div>
          )}

          {!isCreatingAccount && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <Checkbox id="remember" defaultChecked />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <a href="#" className="text-primary hover:underline">
                Forgot password?
              </a>
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
          <p>Secure authentication via TLS 1.2 encryption</p>
          <p className="mt-1">WCAG 2.0 AA compliant • AODA standards</p>
        </div>
      </Card>
    </div>
  );
}
