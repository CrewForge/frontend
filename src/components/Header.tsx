import React from 'react';
import { Settings, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './ui/avatar';

interface HeaderProps {
  onSettingsClick?: () => void;
  currentProject?: string;
}

export function Header({ onSettingsClick, currentProject }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sm:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L3 7V13L10 18L17 13V7L10 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
              <circle cx="10" cy="10" r="2" fill="white"/>
            </svg>
          </div>
          <h1 className="text-xl">CrewForge</h1>
        </div>
        
        {currentProject && (
          <Button variant="ghost" className="gap-2">
            <span className="text-sm">{currentProject}</span>
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3.5">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onSettingsClick}
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Avatar className="w-8 h-8">
          <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" alt="User" />
        </Avatar>
      </div>
    </header>
  );
}
