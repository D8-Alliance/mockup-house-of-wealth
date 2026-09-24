import React, { useState } from 'react';
import { useRBAC } from './RBACContext';
import { ROLE_DEFINITIONS } from './roleDefinitions';
import { UserRole } from './types';
import { SINGLE_ROLE_MODE, SINGLE_TEST_ROLE } from './runtimeConfig';
import { 
  ChevronDown, 
  Check, 
  Layers, 
  UserCheck, 
  Info,
  X,
  Search,
  Sparkles,
  LogIn,
  ShieldAlert
} from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { currentRole, setRole, roleDef, setShowLoginModal, isAuthenticated, authMode, setAuthMode, assignedRoles, activeUser, tenantContext } = useRBAC();
  const [isOpen, setIsOpen] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const rolesList = SINGLE_ROLE_MODE
    ? [SINGLE_TEST_ROLE]
    : (authMode === 'DEMO' ? (Object.keys(ROLE_DEFINITIONS) as UserRole[]) : assignedRoles);

  const categories = [
    'System Executive',
    'Operational Management',
    'Governance & Risk',
    'Participant & User'
  ] as const;

  const filteredRoles = rolesList.filter(r => 
    r.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ROLE_DEFINITIONS[r]?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ROLE_DEFINITIONS[r]?.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-950 text-white border-b border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Left Info Pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="flex items-center gap-1.5 px-2.5 py-1 font-extrabold rounded-lg border bg-slate-800 text-slate-200 border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={authMode}
              onChange={event => setAuthMode(event.target.value as typeof authMode)}
              className="bg-transparent uppercase font-mono text-[10px] outline-none cursor-pointer"
              title="Select runtime readiness mode"
            >
              <option value="DEMO">DEMO MODE</option>
              <option value="PRE_PRODUCTION">PRE-PRODUCTION MODE</option>
              <option value="PRODUCTION">PRODUCTION MODE</option>
            </select>
          </label>

          <span className="text-slate-400 font-medium">Active Role:</span>

          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`px-3 py-1 rounded-xl font-black flex items-center gap-2 border transition-all cursor-pointer ${roleDef.badgeColor}`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{currentRole}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <div className="origin-top-left absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-fadeIn">
                  <div className="p-3 bg-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      {authMode === 'DEMO' ? 'Select Demo Persona Persona' : 'Assigned Roles'}
                    </span>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                   {authMode === 'PRE_PRODUCTION' && (
                     <p className="text-[10px] text-amber-400 flex items-center gap-1">
                       <ShieldAlert className="w-3 h-3" />
                       Pre-production: real backend preview; MFA is not configured in this mode.
                     </p>
                   )}

                   {authMode === 'PRODUCTION' && (
                    <p className="text-[10px] text-amber-400 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Production Mode: Limited strictly to your assigned roles.
                    </p>
                  )}

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filter roles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto p-2 space-y-3">
                  {categories.map(cat => {
                    const catRoles = filteredRoles.filter(r => ROLE_DEFINITIONS[r]?.category === cat);
                    if (catRoles.length === 0) return null;

                    return (
                      <div key={cat} className="space-y-1">
                        <span className="px-2 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          {cat}
                        </span>
                        <div className="space-y-1">
                          {catRoles.map(r => {
                            const isSelected = r === currentRole;
                            const def = ROLE_DEFINITIONS[r];
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  setRole(r);
                                  setIsOpen(false);
                                }}
                                className={`w-full text-left p-2 rounded-xl transition-all flex items-start justify-between gap-2 cursor-pointer ${
                                  isSelected 
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold' 
                                    : 'hover:bg-slate-800/80 text-slate-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs">{def.role}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                  </div>
                                  <p className="text-[10px] text-slate-400 line-clamp-1">{def.title}</p>
                                </div>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${def.badgeColor}`}>
                                  {def.category.split(' ')[0]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

          <button
            onClick={() => setShowDetailModal(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="View Role Capabilities & Permissions Matrix"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-400">
            <span>Org: <strong className="text-white">{activeUser.organizationName || tenantContext.organisationId}</strong></span>
          </div>

          <button
            onClick={() => setShowLoginModal(true)}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{isAuthenticated ? 'Switch Login / Account' : 'Sign In'}</span>
          </button>
        </div>

      </div>

      {/* Role Details Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-xl text-xs font-black border ${roleDef.badgeColor}`}>
                {roleDef.category}
              </span>
              <h3 className="text-lg font-black">{currentRole}</h3>
            </div>

            <p className="text-xs text-slate-300">{roleDef.description}</p>

            <div className="p-3 bg-slate-800/40 rounded-2xl border border-slate-700 flex items-center gap-3">
              <img
                src={roleDef.demoUser.avatarUrl}
                alt={roleDef.demoUser.name}
                className="w-10 h-10 rounded-full border border-emerald-500 object-cover"
              />
              <div className="text-xs">
                <p className="font-bold text-white">{roleDef.demoUser.name}</p>
                <p className="text-slate-400 text-[11px]">{roleDef.demoUser.email} • {roleDef.demoUser.organization}</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
