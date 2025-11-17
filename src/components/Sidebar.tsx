import React from 'react';
import { Home, FolderKanban, Boxes, Users, FileText } from 'lucide-react';
import { Button } from './ui/button';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
};

interface SidebarProps {
  activeItem: string;
  onItemClick: (id: string) => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'environments', label: 'Environments', icon: Boxes },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'logs', label: 'Logs', icon: FileText },
];

export function Sidebar({ activeItem, onItemClick }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col">
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? 'secondary' : 'ghost'}
              className={`w-full justify-start gap-3 ${isActive ? 'bg-primary/10 text-primary' : ''}`}
              onClick={() => onItemClick(item.id)}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
