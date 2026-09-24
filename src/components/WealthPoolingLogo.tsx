import React from 'react';

interface WealthPoolingLogoProps {
  className?: string;
  compact?: boolean;
}

export const WealthPoolingLogo: React.FC<WealthPoolingLogoProps> = ({ className = '', compact = false }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <img
      src="/wealth-pooling-logo.svg"
      alt=""
      aria-hidden="true"
      className={`${compact ? 'h-9 w-12' : 'h-11 w-14'} object-contain shrink-0`}
    />
    <div className="min-w-0 text-left leading-none">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className={`${compact ? 'text-sm' : 'text-base'} font-extrabold tracking-tight text-slate-900 dark:text-white`}>
          Wealth Pooling
        </span>
        <span className="text-[9px] uppercase font-bold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          D-8
        </span>
      </div>
      <p className="mt-1 text-[9px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
        Islamic Circular Economy Platform
      </p>
    </div>
  </div>
);
