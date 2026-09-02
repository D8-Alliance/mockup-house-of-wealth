import React, { useState } from 'react';
import { 
  FileText, 
  Upload, 
  Search, 
  ShieldCheck, 
  Download, 
  Trash2, 
  Eye, 
  FileCheck, 
  Lock, 
  Plus, 
  CheckCircle2, 
  FileCode,
  FolderKanban
} from 'lucide-react';

interface VaultDocument {
  id: string;
  name: string;
  category: 'Shariah Certificate' | 'Asset Title Deed' | 'KYC & Identification' | 'Wasiyyah / Will' | 'Audit Report';
  fileSize: string;
  uploadedAt: string;
  verified: boolean;
  securityLevel: 'Restricted' | 'Confidential' | 'Public';
}

export const DocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<VaultDocument[]>([
    {
      id: 'DOC-101',
      name: 'AAOIFI_Shariah_Compliance_Certificate_2026.pdf',
      category: 'Shariah Certificate',
      fileSize: '2.4 MB',
      uploadedAt: '2026-06-12',
      verified: true,
      securityLevel: 'Public'
    },
    {
      id: 'DOC-102',
      name: 'KL_Logistics_Hub_Title_Deed_Registry.pdf',
      category: 'Asset Title Deed',
      fileSize: '8.1 MB',
      uploadedAt: '2026-05-19',
      verified: true,
      securityLevel: 'Confidential'
    },
    {
      id: 'DOC-103',
      name: 'Identity_Passport_Proof_of_Address.pdf',
      category: 'KYC & Identification',
      fileSize: '1.8 MB',
      uploadedAt: '2026-01-10',
      verified: true,
      securityLevel: 'Restricted'
    },
    {
      id: 'DOC-104',
      name: 'Islamic_Wasiyyah_Distribution_Preference_v2.pdf',
      category: 'Wasiyyah / Will',
      fileSize: '3.5 MB',
      uploadedAt: '2026-04-02',
      verified: true,
      securityLevel: 'Restricted'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredDocs = documents.filter(d => 
    (selectedCategory === 'All' || d.category === selectedCategory) &&
    (d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2 border border-blue-500/20">
            Encrypted Document Vault & Compliance
          </span>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Document Vault Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Securely store, verify, and share Shariah rulings, title deeds, KYC identity records, and Wasiyyah instruments.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => alert("Simulating secure document upload with AES-256 encryption...")}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search documents by name or ID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
          {['All', 'Shariah Certificate', 'Asset Title Deed', 'KYC & Identification', 'Wasiyyah / Will'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                selectedCategory === cat ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Documents */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map(doc => (
          <div 
            key={doc.id}
            className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-5 shadow-sm hover:shadow-md transition-all flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {doc.category}
                  </span>
                  {doc.verified && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Certified
                    </span>
                  )}
                </div>

                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-snug line-clamp-1 mb-1">
                  {doc.name}
                </h4>

                <div className="text-[11px] text-slate-400">
                  {doc.fileSize} • Uploaded {doc.uploadedAt}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => alert(`Previewing ${doc.name}...`)}
                className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button 
                onClick={() => alert(`Downloading ${doc.name}...`)}
                className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
