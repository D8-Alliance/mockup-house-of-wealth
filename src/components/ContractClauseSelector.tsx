import React from 'react';
import { Handshake, Users, Key, Receipt, CheckCircle2 } from 'lucide-react';
import { ContractType } from '../types';

interface ContractClauseSelectorProps {
  contractType: ContractType;
  setContractType: (type: ContractType) => void;
}

export const ContractClauseSelector: React.FC<ContractClauseSelectorProps> = ({ contractType, setContractType }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        onClick={() => setContractType('Mudarabah')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
          contractType === 'Mudarabah'
            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md'
            : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        {contractType === 'Mudarabah' && <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute top-4 right-4" />}
        <div className="p-2.5 w-fit rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
          <Handshake className="w-5 h-5" />
        </div>
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Mudarabah</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Profit-sharing partnership where investor provides capital and manager handles operations.
        </p>
      </div>

      <div 
        onClick={() => setContractType('Musharakah')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
          contractType === 'Musharakah'
            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md'
            : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        {contractType === 'Musharakah' && <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute top-4 right-4" />}
        <div className="p-2.5 w-fit rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
          <Users className="w-5 h-5" />
        </div>
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Musharakah</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Joint venture where partners contribute both capital and management, sharing profits & losses.
        </p>
      </div>

      <div 
        onClick={() => setContractType('Ijarah')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
          contractType === 'Ijarah'
            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md'
            : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        {contractType === 'Ijarah' && <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute top-4 right-4" />}
        <div className="p-2.5 w-fit rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
          <Key className="w-5 h-5" />
        </div>
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Ijarah</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Leasing agreement transferring usufruct of tangible property for a fixed rental rate.
        </p>
      </div>

      <div 
        onClick={() => setContractType('Murabaha')}
        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
          contractType === 'Murabaha'
            ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md'
            : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        {contractType === 'Murabaha' && <CheckCircle2 className="w-5 h-5 text-emerald-500 absolute top-4 right-4" />}
        <div className="p-2.5 w-fit rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
          <Receipt className="w-5 h-5" />
        </div>
        <h4 className="font-extrabold text-base text-slate-900 dark:text-white">Murabaha</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Cost-plus financing where asset cost and disclosed margin are repaid via installments.
        </p>
      </div>
    </div>
  );
};
