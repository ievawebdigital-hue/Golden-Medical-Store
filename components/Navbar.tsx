'use client';

import React from 'react';
import { ActiveUser, UserRole } from '@/types/pharmacy';
import {
  ShoppingCart,
  Boxes,
  Truck,
  Users,
  BarChart3,
  Settings,
  ShieldCheck,
  UserCircle2,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'pos' | 'inventory' | 'purchases' | 'customers' | 'reports' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  users: ActiveUser[];
  activeUser: ActiveUser;
  onSwitchUser: (userId: string) => void;
  onOpenAiAssistant: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  users,
  activeUser,
  onSwitchUser,
  onOpenAiAssistant,
}) => {
  const isOwner = activeUser.role === 'Owner';

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
    { id: 'pos', label: 'POS Billing', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { id: 'purchases', label: 'Purchases', icon: <Truck className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers & Dues', icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & P&L', icon: <BarChart3 className="w-4 h-4" />, ownerOnly: true },
    { id: 'settings', label: 'Settings & Audit', icon: <Settings className="w-4 h-4" />, ownerOnly: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Single text element wordmark with clean pharmacy cross */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
              <span className="text-xl leading-none">✚</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-base sm:text-lg text-amber-400 whitespace-nowrap">
                Golden Medical Store
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:inline-block leading-tight">
                POS & Medicine Inventory
              </span>
            </div>
          </div>

          {/* Zone 2: Single-line navigation links */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              // Hide restricted tabs from counter staff
              if (item.ownerOnly && !isOwner) return null;

              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: AI Assistant + Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* AI Assistant Quick Trigger */}
            <button
              onClick={onOpenAiAssistant}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-medium transition-colors whitespace-nowrap"
              title="AI Pharmacist Assistant (Drug Interactions & Generic Substitutes)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">AI Rx Assistant</span>
            </button>

            {/* User Role Switcher Dropdown */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <div className="flex items-center gap-1.5 text-xs">
                {isOwner ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <UserCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <select
                  value={activeUser.id}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Mobile Navigation Row (visible on small screens) */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800 no-scrollbar">
          {navItems.map((item) => {
            if (item.ownerOnly && !isOwner) return null;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
};
