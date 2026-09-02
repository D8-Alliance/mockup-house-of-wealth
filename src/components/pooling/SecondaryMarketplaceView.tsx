import React, { useState } from 'react';
import { SecondaryMarketOrder } from './PoolingTypes';
import { 
  ArrowUpRight, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  ShoppingCart,
  Filter,
  Layers
} from 'lucide-react';

interface SecondaryMarketplaceViewProps {
  orders: SecondaryMarketOrder[];
  onExecuteTrade: (orderId: string) => void;
}

export const SecondaryMarketplaceView: React.FC<SecondaryMarketplaceViewProps> = ({
  orders,
  onExecuteTrade
}) => {
  const [filterType, setFilterType] = useState<string>('All');

  const filteredOrders = orders.filter(o => filterType === 'All' || o.orderType === filterType);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-emerald-950 rounded-3xl text-white border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Shariah Compliant Peer-to-Peer Orderbook
          </span>
          <h3 className="text-xl font-black mt-1">Secondary Liquidity Marketplace</h3>
          <p className="text-xs text-slate-300">
            Trade tokenized pool shares & Sukuk tokens with instant atomic settlement and zero interest discounting.
          </p>
        </div>

        <div className="flex gap-2">
          {['All', 'Sell', 'Buy'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                filterType === t 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t} Orders
            </button>
          ))}
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredOrders.map(ord => (
          <div 
            key={ord.id}
            className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono font-bold text-slate-400">{ord.id}</span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                  ord.orderType === 'Sell' 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' 
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}>
                  {ord.orderType} Order
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mt-2">
                {ord.poolName}
              </h4>
              <p className="text-xs text-slate-500 mt-1">Seller: {ord.sellerName}</p>

              <div className="grid grid-cols-3 gap-2 text-xs my-4 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Units</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{ord.tokenUnits}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Unit Price</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">${ord.unitPrice}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Yield (YTM)</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{ord.yieldToMaturity}%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                ${ord.totalPrice.toLocaleString()} USD
              </span>
              <button
                onClick={() => onExecuteTrade(ord.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Buy Liquidity</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
