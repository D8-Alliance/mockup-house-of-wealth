import React, { useState } from 'react';
import { Upload, FileText, Sparkles, ShieldCheck, CheckCircle2, TrendingUp, AlertTriangle, Layers, ArrowRight } from 'lucide-react';
import { AIProjectSponsorInputs, AIProjectAnalysisResult } from './AITypes';
import { AIConfidenceBadge } from './AIConfidenceBadge';

export const AIProjectAdvisorModule: React.FC = () => {
  const [inputs, setInputs] = useState<AIProjectSponsorInputs>({
    projectTitle: 'D-8 Cold-Chain Halal Logistics Expansion',
    sector: 'Property & Logistics',
    fundingTargetUSD: 5000000,
    country: 'Malaysia',
    businessPlanFilename: 'D8_Halal_Logistics_Business_Plan_v3.pdf',
    projectedRevenueYear1: 1200000,
    projectedCostYear1: 650000,
    collateralValueUSD: 7200000
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [analysisResult, setAnalysisResult] = useState<AIProjectAnalysisResult>({
    swot: {
      strengths: [
        'Strong asset collateral (Cold storage hubs valued at $7.2M)',
        'Pre-signed 5-year off-take supply contracts with regional exporters',
        'Certified AAOIFI Shariah-compliant asset backing'
      ],
      weaknesses: [
        'Initial electricity expenditure dependency in remote logistics corridors',
        'Seasonal harvest volume fluctuations'
      ],
      opportunities: [
        'D-8 intra-trade tax exemptions under preferential trade agreements',
        'Expansion into pharmaceutical cold chain logistics across ASEAN'
      ],
      threats: [
        'Diesel and energy price inflation in Southeast Asia',
        'Port customs clearance delays'
      ]
    },
    npvUSD: 1840000,
    irrPercent: 14.8,
    dscrRatio: 2.15, // Debt Service Coverage Ratio
    fundingReadinessScore: 92,
    recommendedIslamicContract: 'Ijarah',
    contractRationale: 'Asset-backed Ijarah (Lease) contract structure is recommended because physical cold-storage hubs generate predictable lease yields, eliminating capital guarantee issues.',
    riskRating: 'Grade A (Low-to-Moderate Risk)',
    confidence: {
      score: 94,
      modelName: 'Gemini 3.6 Flash • Sponsor Pitch & DCF Evaluator',
      dataPointsEvaluated: 12400,
      factors: [
        { factor: 'DSCR Debt Service Cushion', weightPercent: 35, direction: 'Positive' },
        { factor: 'Collateral-to-Target LTV (144%)', weightPercent: 30, direction: 'Positive' },
        { factor: 'Regional Energy Cost Volatility', weightPercent: 20, direction: 'Negative' },
        { factor: 'AAOIFI Asset Verification Score', weightPercent: 15, direction: 'Positive' }
      ],
      auditHash: '0x3c71...90a1'
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const filename = e.target.files[0].name;
      setInputs(prev => ({ ...prev, businessPlanFilename: filename }));
    }
  };

  const handleAnalyzeProject = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisResult(prev => ({
        ...prev,
        fundingReadinessScore: 94,
        contractRationale: `Re-evaluated business plan '${inputs.businessPlanFilename}'. Confirms Ijarah / Wakalah contract structure with NPV $${(inputs.fundingTargetUSD * 0.35).toLocaleString()} USD.`
      }));
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* Upload & Sponsor Inputs */}
      <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Module 2
            </span>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-0.5">
              AI Project Advisor
            </h3>
          </div>
          <FileText className="w-5 h-5 text-purple-500" />
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Project Title</label>
            <input 
              type="text" 
              value={inputs.projectTitle} 
              onChange={e => setInputs({ ...inputs, projectTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Funding Target (USD)</label>
              <input 
                type="number" 
                step={100000}
                value={inputs.fundingTargetUSD} 
                onChange={e => setInputs({ ...inputs, fundingTargetUSD: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Collateral Value (USD)</label>
              <input 
                type="number" 
                step={100000}
                value={inputs.collateralValueUSD} 
                onChange={e => setInputs({ ...inputs, collateralValueUSD: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Drag & Drop Business Plan Upload */}
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              Upload Business Plan / Pitch Deck
            </label>
            <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-50 dark:bg-slate-900/60 transition-colors">
              <Upload className="w-6 h-6 text-emerald-500 mb-1" />
              <span className="font-extrabold text-slate-900 dark:text-white text-xs">
                {inputs.businessPlanFilename || 'Click to select PDF or DOCX file'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">Supports Business Plans, Financial Forecasts & Teasers</span>
              <input type="file" accept=".pdf,.docx,.xlsx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <button 
            onClick={handleAnalyzeProject}
            disabled={isAnalyzing}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
          >
            {isAnalyzing ? (
              <span>Analyzing NPV, IRR & Shariah Readiness...</span>
            ) : (
              <span>Run AI Due Diligence & Contract Recommendation</span>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Output Dashboard */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-6 shadow-sm space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Funding Readiness Score: {analysisResult.fundingReadinessScore}/100
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                Project Feasibility Analysis
              </h3>
            </div>

            <AIConfidenceBadge confidence={analysisResult.confidence} size="md" />
          </div>

          {/* Financial Metrics Grid */}
          <div className="grid grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Net Present Value (NPV)</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">+${analysisResult.npvUSD.toLocaleString()} USD</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Internal Rate of Return (IRR)</span>
              <span className="font-extrabold text-purple-600 dark:text-purple-400 text-sm">{analysisResult.irrPercent}% p.a.</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Debt Service Ratio (DSCR)</span>
              <span className="font-extrabold text-slate-900 dark:text-white text-sm">{analysisResult.dscrRatio}x (Healthy)</span>
            </div>
          </div>

          {/* Recommended Islamic Contract Box */}
          <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-500/20 space-y-1 text-xs">
            <span className="font-black text-purple-700 dark:text-purple-400 uppercase text-[10px]">
              Recommended Islamic Contract: {analysisResult.recommendedIslamicContract}
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {analysisResult.contractRationale}
            </p>
          </div>

          {/* SWOT Grid */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              SWOT Matrix Analysis
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20">
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase mb-1">Strengths</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {analysisResult.swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/20">
                <span className="font-extrabold text-amber-700 dark:text-amber-400 block text-[10px] uppercase mb-1">Weaknesses</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-300">
                  {analysisResult.swot.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
