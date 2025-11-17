import React, { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { LoginScreen } from './components/LoginScreen';
import { DashboardPage } from './components/DashboardPage';
import { SandboxPage } from './components/SandboxPage';

type Page = 'landing' | 'login' | 'dashboard' | 'sandbox';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [username, setUsername] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);

  const handleLogin = (user: string) => {
    setUsername(user);
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

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage onSignIn={() => setCurrentPage('login')} />
      )}

      {currentPage === 'login' && (
        <LoginScreen onLogin={handleLogin} />
      )}

      {currentPage === 'dashboard' && (
        <DashboardPage 
          username={username}
          onEnvironmentSelect={handleEnvironmentSelect}
        />
      )}

      {currentPage === 'sandbox' && selectedEnvironment && (
        <SandboxPage 
          environment={selectedEnvironment}
          onBack={handleBackToDashboard}
        />
      )}
    </>
  );
}
