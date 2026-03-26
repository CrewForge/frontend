import React from 'react';
import { ChessSandboxPage } from './ChessSandboxPage';
import { EvalPlusSandboxPage } from './EvalPlusSandboxPage';

export interface SandboxPageProps {
  environment: string;
  token: string;
  onBack: () => void;
  dataSource?: 'live' | 'sample';
  onSetDataSource?: (source: 'live' | 'sample') => void;
  /** Clears session when stream returns 401 (expired / invalid token). */
  onAuthFailure?: () => void;
  /** When false, only bundled replay is available (standalone / no API). */
  backendLiveAvailable?: boolean;
}

export function SandboxPage({
  environment,
  token,
  onBack,
  dataSource = 'sample',
  onSetDataSource,
  onAuthFailure,
  backendLiveAvailable = true,
}: SandboxPageProps) {
  const shared = { token, onBack, dataSource, onSetDataSource, onAuthFailure, backendLiveAvailable };

  if (environment === 'evalplus') {
    return <EvalPlusSandboxPage {...shared} />;
  }

  return <ChessSandboxPage {...shared} />;
}
