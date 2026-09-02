import React, { useState } from 'react';
import { Globe, Search, Filter, Plus, Building2, Users, FolderKanban, Coins, ShieldCheck, ChevronRight } from 'lucide-react';
import { CountryNode, CountryNodeStatus } from './countryNodeTypes';
import { countryNodeService } from './countryNodeService';
import { useRBAC } from '../rbac/RBACContext';

interface CountryNodeListProps {
  onSelectCountryNode: (cn: CountryNode) => void;
  onCreateNewNode: () => void;
}

export const CountryNodeList: React.FC<CountryNodeListProps> = ({
  onSelectCountryNode,
  onCreateNewNode
}) => {
  const { currentRole, currentCountryNode } = useRBAC();
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const allNodes = countryNodeService.getAllCountryNodes();

  // Scoping check: Country Admin can only see their assigned Country Node! Super Admin sees all.
  const scopedNodes = allNodes.filter(node => {
    if (currentRole === 'Super Admin' || currentRole === 'Security Administrator' || currentRole === 'System Administrator') {
      return true;
    }
    if (currentRole === 'Country Admin') {
      return node.countryNodeId === currentCountryNode || node.countryCode === currentCountryNode;
    }
    return true;
  });

  const regions = Array.from(new Set(allNodes.map(n => n.region)));

  const filteredNodes = scopedNodes.filter(node => {
    const matchesSearch = node.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          node.countryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          node.regulatoryProfile.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === 'ALL' || node.region === regionFilter;
    const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Country-Level Governance
            </span>
            <span className="text-xs text-slate-400 font-mono">D-8 Sovereignty Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-purple-600" />
            Country Node Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage sovereign operating nodes, central bank profiles, regulatory boundaries, and national wealth capacities.
          </p>
        </div>

        {(currentRole === 'Super Admin' || currentRole === 'Security Administrator') && (
          <button
            onClick={onCreateNewNode}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Country Node</span>
          </button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search country name, code, regulator..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 rounded-xl text-xs border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        >
          <option value="ALL">All Regions ({regions.length})</option>
          {regions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white dark:bg-slate-800 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
        >
          <option value="ALL">All Node Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
          <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
          <option value="DEACTIVATED">DEACTIVATED</option>
        </select>
      </div>

      {/* Country Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map(node => (
          <div
            key={node.countryNodeId}
            onClick={() => onSelectCountryNode(node)}
            className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 hover:border-purple-500/50 shadow-sm hover:shadow-md transition-all cursor-pointer group space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img
                  src={node.flagUrl}
                  alt={node.countryName}
                  className="w-10 h-7 rounded object-cover shadow-sm border border-slate-200 dark:border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {node.countryName}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300">
                      {node.countryCode}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{node.region}</span>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider ${
                node.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-600'
              }`}>
                {node.status}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-800 dark:text-slate-200 block text-[10px] uppercase text-slate-400">Regulator:</strong>
              {node.regulatoryProfile}
            </p>

            <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold block">Orgs</span>
                <span className="font-black text-slate-900 dark:text-white">{node.activeOrganisationsCount}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold block">Users</span>
                <span className="font-black text-purple-600">{node.activeUsersCount}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold block">Projects</span>
                <span className="font-black text-emerald-600">{node.activeProjectsCount}</span>
              </div>
              <div className="p-2 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                <span className="text-[9px] text-slate-400 font-bold block">Pools</span>
                <span className="font-black text-amber-600">{node.activePoolsCount}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-purple-600 dark:text-purple-400 font-bold pt-1">
              <span>View Country Detail</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
