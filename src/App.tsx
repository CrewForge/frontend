import React, { useEffect, useMemo, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { SandboxPage } from './components/SandboxPage';
import { SvgExportButton } from './components/SvgExportButton';
import type { AuthSession } from './lib/api';
import { isStandaloneSession, revokeAuthToken } from './lib/api';

type Page = 'landing' | 'login' | 'dashboard' | 'sandbox';
const STORAGE_KEY = 'crewforge_auth';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
  const [sandboxSource, setSandboxSource] = useState<'live' | 'sample'>('sample');
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthSession;
        if (parsed?.token) {
          setSession(parsed);
          setCurrentPage('dashboard');
        }
      } catch (err) {
        console.warn('Failed to parse stored auth session', err);
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!session && currentPage === 'dashboard') {
      setCurrentPage('landing');
    }
    if (!session && currentPage === 'sandbox') {
      setCurrentPage('landing');
      setSelectedEnvironment(null);
    }
  }, [bootstrapped, currentPage, session]);

  const clearStoredSession = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  };

  const handleGoToLogin = () => {
    setCurrentPage('login');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  const handleLoginSuccess = (s: AuthSession) => {
    setSession(s);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    const token = session?.token;
    if (token) {
      try {
        await revokeAuthToken(token);
      } catch {
        /* still sign out locally */
      }
    }
    clearStoredSession();
    setSelectedEnvironment(null);
    setCurrentPage('landing');
  };

  const handleAuthFailure = () => {
    clearStoredSession();
    setSelectedEnvironment(null);
    setCurrentPage('landing');
  };

  const handleEnvironmentSelect = (envId: string) => {
    setSelectedEnvironment(envId);
    setSandboxSource('sample');
    setCurrentPage('sandbox');
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
    setSelectedEnvironment(null);
    setSandboxSource('sample');
  };

  const username = useMemo(() => session?.username ?? '', [session]);

  const backendLiveAvailable = session != null && !isStandaloneSession(session);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-center shadow-sm">
          <div className="text-base font-semibold">CrewForge</div>
          <div className="mt-2 text-sm text-muted-foreground">Loading session…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onLogin={handleGoToLogin} />
      )}

      {currentPage === 'login' && (
        <LoginPage onBack={handleBackToLanding} onLoginSuccess={handleLoginSuccess} />
      )}

      {currentPage === 'dashboard' && session && (
        <DashboardPage
          username={username}
          token={session.token}
          onLogout={handleLogout}
          onEnvironmentSelect={handleEnvironmentSelect}
        />
      )}

      {currentPage === 'sandbox' && selectedEnvironment && session && (
        <SandboxPage
          environment={selectedEnvironment}
          token={session.token}
          dataSource={sandboxSource}
          onSetDataSource={setSandboxSource}
          onBack={handleBackToDashboard}
          backendLiveAvailable={backendLiveAvailable}
          onAuthFailure={backendLiveAvailable ? handleAuthFailure : undefined}
        />
      )}

      <SvgExportButton />
    </>
  );
}
