import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Landmark, 
  Coins, 
  TrendingUp, 
  CheckCircle2, 
  UploadCloud, 
  ShieldCheck, 
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { AssetItem, AssetType } from '../types';

interface AssetRegistrationWizardModalProps {
  onClose: () => void;
  onAddAsset: (newAsset: AssetItem) => void;
}

export const AssetRegistrationWizardModal: React.FC<AssetRegistrationWizardModalProps> = ({
  onClose,
  onAddAsset
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [assetType, setAssetType] = useState<AssetType>('Real Estate');
  const [assetName, setAssetName] = useState('');
  const [location, setLocation] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [formError, setFormError] = useState('');
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find(file => (
      !['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ));

    if (invalidFile) {
      setUploadedFiles([]);
      setImagePreviewUrl('');
      setImagePreviewUrls([]);
      setFileError(`${invalidFile.name} must be a PDF, PNG, JPG, or SVG file no larger than 10MB.`);
      event.target.value = '';
      return;
    }

    setUploadedFiles(files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const imageDataUrls = await Promise.all(imageFiles.map(file => new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    })));
    const validImageDataUrls = imageDataUrls.filter(Boolean);
    setImagePreviewUrls(validImageDataUrls);
    setImagePreviewUrl(validImageDataUrls[0] || '');
    setFileError('');
  };

  const handleRegister = () => {
    const normalizedName = assetName.trim();
    const valNum = Number(estimatedValue);

    if (!normalizedName && !estimatedValue) {
      setFormError('Please provide asset name and estimated market value.');
      setStep(2);
      return;
    }

    if (!normalizedName) {
      setFormError('Please provide an asset name.');
      setStep(2);
      return;
    }

    if (!estimatedValue || !Number.isFinite(valNum) || valNum <= 0) {
      setFormError('Please provide a valid estimated market value greater than zero.');
      setStep(2);
      return;
    }

    if (uploadedFiles.length === 0) {
      setFileError('Upload at least one ownership deed or property photo before completing registration.');
      setStep(3);
      return;
    }

    const created: AssetItem = {
      id: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: normalizedName,
      type: assetType,
      location: location || 'Kuala Lumpur, Malaysia',
      value: valNum,
      valueDisplay: `$${valNum.toLocaleString()}`,
      ytdReturn: '+2.5% YTD',
      status: 'Pending',
      shariahStatus: 'Pending Review',
      collateralPercent: 80,
      liquidityPercent: 60,
       imageUrl: imagePreviewUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
       imageUrls: imagePreviewUrls.length > 0 ? imagePreviewUrls : undefined,
      description: description || 'Registered Shariah-compliant asset pending final valuation audit.',
      owner: 'Ahmad bin Razak',
      custodian: 'Wealth Pooling Vault'
    };

    onAddAsset(created);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/60 pb-5">
          <div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Step {step} of 3: {step === 1 ? 'Asset Classification' : step === 2 ? 'Details & Valuation' : 'Documentation Upload'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Register Asset to D-8 Ecosystem
            </h2>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP 1: Select Type */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Select Asset Category</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { type: 'Real Estate', icon: <Building2 className="w-5 h-5" />, desc: 'Commercial & Residential Properties' },
                { type: 'Commodities', icon: <Coins className="w-5 h-5" />, desc: 'Gold, Agriculture, Energy' },
                { type: 'Financial Inst.', icon: <Landmark className="w-5 h-5" />, desc: 'Sukuk, Bank Accounts' },
                { type: 'Private Equity', icon: <TrendingUp className="w-5 h-5" />, desc: 'Halal Startup Stakes' }
              ].map(item => (
                <div 
                  key={item.type}
                  onClick={() => setAssetType(item.type as AssetType)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-1.5 ${
                    assetType === item.type
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-200/80 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="text-emerald-600 dark:text-emerald-400">{item.icon}</div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">{item.type}</h4>
                  <p className="text-[10px] text-slate-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: General Details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Asset Name
              </label>
              <input 
                type="text"
                value={assetName}
                onChange={e => { setAssetName(e.target.value); setFormError(''); }}
                placeholder="e.g. Kuala Lumpur Commercial Unit #12"
                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Location / Region
                </label>
                <input 
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Kuala Lumpur, Malaysia"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                  Estimated Value (USD)
                </label>
                <input 
                  type="number"
                  value={estimatedValue}
                  onChange={e => { setEstimatedValue(e.target.value); setFormError(''); }}
                  placeholder="e.g. 250000"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{formError}</p>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Description & Shariah Notes
              </label>
              <textarea 
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Provide physical condition, tenancy status, or ownership deed information..."
                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Documentation Upload */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Upload Ownership Deed & Photos</h3>

            <label
              htmlFor="asset-registration-files"
              className={`h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                uploadedFiles.length > 0
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-400'
              }`}
            >
              <input
                id="asset-registration-files"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.svg,application/pdf,image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="sr-only"
              />
              {uploadedFiles.length > 0 ? (
                <div className="flex flex-col items-center gap-1">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Selected asset preview"
                      className="h-16 w-24 rounded-lg object-cover border border-emerald-500/40"
                    />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  )}
                  <span className="font-bold text-xs text-center px-4">
                    {uploadedFiles.length} file{uploadedFiles.length === 1 ? '' : 's'} selected
                  </span>
                  <span className="text-[10px] opacity-70 text-center px-4">
                    {uploadedFiles.map(file => file.name).join(', ')}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <UploadCloud className="w-8 h-8" />
                  <span className="text-xs font-semibold">Click to upload title deed or property photos</span>
                  <span className="text-[10px] opacity-70">PDF, PNG, JPG, SVG up to 10MB each</span>
                </div>
              )}
            </label>

            {fileError && (
              <p role="alert" className="text-xs font-semibold text-rose-600 dark:text-rose-400">{fileError}</p>
            )}

            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Files are selected for this MVP registration only. Permanent document storage and review upload are not connected yet.
            </p>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <span>Asset will undergo automated Shariah screening & valuation audit upon submission.</span>
            </div>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
          <button
            disabled={step === 1}
            onClick={() => setStep((step - 1) as any)}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as any)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md shadow-emerald-600/20 flex items-center gap-1 cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleRegister}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Complete Asset Registration</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
