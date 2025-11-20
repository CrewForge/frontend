import React, { useEffect, useMemo, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { DashboardPage } from './components/DashboardPage';
import { SandboxPage } from './components/SandboxPage';
import type { AuthSession } from './lib/api';

type Page = 'landing' | 'login' | 'dashboard' | 'sandbox';
const STORAGE_KEY = 'crewforge_auth';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);
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
      setCurrentPage('login');
    }
    if (!session && currentPage === 'sandbox') {
      setCurrentPage('login');
      setSelectedEnvironment(null);
    }
  }, [bootstrapped, currentPage, session]);

  const handleAuthSuccess = (authSession: AuthSession) => {
    setSession(authSession);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authSession));
    setCurrentPage('dashboard');
  };

  const handleEnvironmentSelect = (envId: string) => {
    setSelectedEnvironment(envId);
    setCurrentPage('sandbox');
  };

  const handleBackToDashboard = () => {
    setCurrentPage('dashboard');
    setSelectedEnvironment(null);
  };

  const username = useMemo(() => session?.username ?? '', [session]);

  if (!bootstrapped) {
    return null;
  }

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onSignIn={() => setCurrentPage('login')} />
      )}

      {currentPage === 'login' && (
        <LoginScreen onLoginSuccess={handleAuthSuccess} />
      )}

      {currentPage === 'dashboard' && session && (
        <DashboardPage 
          username={username}
          onEnvironmentSelect={handleEnvironmentSelect}
        />
      )}

      {currentPage === 'sandbox' && selectedEnvironment && session && (
        <SandboxPage 
          environment={selectedEnvironment}
          token={session.token}
          onBack={handleBackToDashboard}
        />
      )}
    </>
  );
}
