import React, { useState } from 'react';
import { WealthPoolingLogo } from '../WealthPoolingLogo';
import {
  Building2,
  Globe2,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Newspaper,
  Sparkles,
  LogIn,
  ArrowRight,
  Compass,
  Users,
  Coins,
  CheckCircle2,
  ChevronDown,
  X,
  Menu
} from 'lucide-react';
import { INITIAL_COUNTRY_NODES } from '../../countryNodes/mockCountryNodes';
import { INITIAL_MARKETPLACE } from '../../data/initialData';
import { useRBAC } from '../../rbac/RBACContext';
import { LoginModal } from '../auth/LoginModal';
import {
  InfoPageLayout,
  AboutD8Page,
  MemberStatesPage,
  ShariahGovernancePage,
  NewsUpdatesPage,
  ContactPage,
  PublicPageId
} from '../info/InfoPages';

interface PublicLandingPageProps {
  onEnterPublicGuest: () => void;
}

export const PublicLandingPage: React.FC<PublicLandingPageProps> = ({ onEnterPublicGuest }) => {
  const countries = INITIAL_COUNTRY_NODES;
  const [selectedCountryId, setSelectedCountryId] = useState<string>('CN-MYS');
  const [pageId, setPageId] = useState<PublicPageId>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { setShowLoginModal, showLoginModal, isAuthenticated } = useRBAC();

  const navigate = (page: PublicPageId) => {
    setPageId(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (pageId !== 'home') {
    const page = {
      about: <AboutD8Page />,
      members: <MemberStatesPage />,
      shariah: <ShariahGovernancePage />,
      news: <NewsUpdatesPage />,
      contact: <ContactPage />
    }[pageId];
    return (
      <InfoPageLayout pageId={pageId} onNavigate={navigate} onSignIn={() => setShowLoginModal(true)}>
        {page}
      </InfoPageLayout>
    );
  }

  const selectedCountry =
    countries.find((c) => c.countryNodeId === selectedCountryId) || countries[0];

  // Public marketplace preview (Guest-tier visibility, restricted to 9 D-8 nodes)
  const marketPreview = INITIAL_MARKETPLACE.slice(0, 3);

  const totalProjects = countries.reduce((sum, c) => sum + c.activeProjectsCount, 0);
  const totalPools = countries.reduce((sum, c) => sum + c.activePoolsCount, 0);
  const totalUsers = countries.reduce((sum, c) => sum + c.activeUsersCount, 0);
  const totalOrgs = countries.reduce((sum, c) => sum + c.activeOrganisationsCount, 0);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans">
      {/* Top Utility Bar */}
      <div className="bg-slate-950 text-white border-b border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 font-medium">D-8 Member States:</span>
            <span className="text-emerald-400 font-extrabold uppercase tracking-wider text-[10px]">
              {countries.length} Nations • Islamic Circular Economy
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
              PUBLIC VISITOR — GUEST ACCESS
            </span>
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to System</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="w-full max-w-full lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 max-w-full overflow-hidden justify-between items-center h-16 gap-3">
            <div className="flex min-w-0 max-w-full items-center gap-3 cursor-pointer">
              <WealthPoolingLogo compact />
            </div>

            <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span onClick={() => navigate('about')} className="cursor-pointer hover:text-emerald-600">About D-8</span>
              <span onClick={() => navigate('members')} className="cursor-pointer hover:text-emerald-600">Member States</span>
              <span onClick={() => navigate('shariah')} className="cursor-pointer hover:text-emerald-600">Shariah Governance</span>
              <span onClick={() => navigate('news')} className="cursor-pointer hover:text-emerald-600">News &amp; Updates</span>
              <span onClick={() => navigate('contact')} className="cursor-pointer hover:text-emerald-600">Contact</span>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden shrink-0 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          {mobileMenuOpen && (
            <div className="lg:hidden w-full max-w-full overflow-hidden border-t border-slate-200 dark:border-slate-800 py-3 space-y-1">
              {(['about', 'members', 'shariah', 'news', 'contact'] as PublicPageId[]).map((page) => (
                <button key={page} onClick={() => { navigate(page); setMobileMenuOpen(false); }} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                  {page === 'about' ? 'About D-8' : page === 'members' ? 'Member States' : page === 'shariah' ? 'Shariah Governance' : page === 'news' ? 'News & Updates' : 'Contact'}
                </button>
              ))}
              <button onClick={() => setShowLoginModal(true)} className="w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">Sign In / Register</button>
            </div>
          )}
        </div>
      </header>

      {/* Country Selector Banner — default Malaysia */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <Globe2 className="w-4 h-4 text-emerald-500" />
              <span>Select your country node:</span>
            </div>
            <div className="w-full min-w-0 flex flex-wrap gap-2">
              {countries.map((c) => {
                const isSelected = c.countryNodeId === selectedCountryId;
                return (
                  <button
                    key={c.countryNodeId}
                    onClick={() => setSelectedCountryId(c.countryNodeId)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500/40'
                    }`}
                  >
                    <img src={c.flagUrl} alt={c.countryName} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
                    <span>{c.countryName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="min-w-0 space-y-6">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {selectedCountry.countryName} Node
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                  AAOIFI Certified
                </span>
              </div>

              <h1 className="min-w-0 break-words text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Cross-Border Islamic
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-400"> Circular Economy</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Wealth Pooling connects institutional capital, asset owners, and sustainable projects
                across the <strong>{countries.length} member states</strong> of the D-8 Organization for
                Economic Cooperation — powered by Shariah-compliant tokenization, smart contracts, and
                transparent wealth pooling.
              </p>

              {/* Live D-8 Network Stats */}
              <div className="grid min-w-0 grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="min-w-0 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{countries.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Member States</p>
                </div>
                <div className="min-w-0 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalProjects}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Active Projects</p>
                </div>
                <div className="min-w-0 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalPools}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Wealth Pools</p>
                </div>
                <div className="min-w-0 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalUsers.toLocaleString()}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Verified Users</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={onEnterPublicGuest}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white font-extrabold text-xs rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Browse Public Marketplace as Guest</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Enter Your Organisation</span>
                  <LogIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: Selected Country Card */}
            <div className="min-w-0 space-y-4">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-slate-700/60 shadow-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <img
                    src={selectedCountry.flagUrl}
                    alt={selectedCountry.countryName}
                    className="w-16 h-11 object-cover rounded-lg shadow-lg ring-2 ring-emerald-500/50"
                  />
                  <div>
                    <p className="text-xl font-black">{selectedCountry.countryName}</p>
                    <p className="text-xs text-slate-400">{selectedCountry.region}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-slate-400">Regulator</p>
                    <p className="font-bold mt-0.5 text-[10px] leading-snug">{selectedCountry.regulatoryProfile}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-slate-400">Currency / TZ</p>
                    <p className="font-bold mt-0.5">{selectedCountry.currency} • {selectedCountry.timezone}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-slate-400">Organisations</p>
                    <p className="font-bold mt-0.5 text-emerald-400">{selectedCountry.activeOrganisationsCount}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-slate-400">Projects</p>
                    <p className="font-bold mt-0.5 text-emerald-400">{selectedCountry.activeProjectsCount}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h4 className="font-black text-sm">Shariah & Regulatory Assurance</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>AAOIFI-compliant tokenization & smart contracts (Mudarabah, Musharakah, Ijarah, Murabaha, Wakalah)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>Central-bank regulated country nodes with independent Shariah supervisory councils</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>End-to-end immutable audit ledger & autonomous zakat purification</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* D-8 Member States Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl sm:text-2xl font-black">The {countries.length} Member States of the D-8</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {countries.map((c) => (
            <button
              key={c.countryNodeId}
              onClick={() => setSelectedCountryId(c.countryNodeId)}
              className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                c.countryNodeId === selectedCountryId
                  ? 'bg-emerald-500/10 border-emerald-500/50 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <img src={c.flagUrl} alt={c.countryName} className="w-8 h-6 object-cover rounded shadow" />
                <span className="text-[10px] font-mono text-slate-400">{c.countryCode}</span>
              </div>
              <p className="font-extrabold text-sm">{c.countryName}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{c.region} • {c.currency}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-600 dark:text-slate-300">
                <Coins className="w-3 h-3 text-emerald-500" />
                <span>{c.activeProjectsCount} projects</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Public Marketplace Preview (Guest-tier) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl sm:text-2xl font-black">Featured Public Offerings</h2>
          </div>
          <button
            onClick={onEnterPublicGuest}
            className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <span>Explore Full Marketplace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {marketPreview.map((item) => (
            <div key={item.id} className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="h-36 overflow-hidden relative">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-bold backdrop-blur">
                  {item.category}
                </span>
              </div>
              <div className="p-5 space-y-3">
                <h3 className="font-extrabold text-sm">{item.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{item.targetYield} yield</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    item.riskLevel === 'Low Risk' ? 'bg-emerald-500/10 text-emerald-600' :
                    item.riskLevel === 'Medium Risk' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-red-500/10 text-red-600'
                  }`}>
                    {item.riskLevel}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Raised {item.progressPercent}%</span>
                    <span>{item.raisedAmount.toLocaleString()} / {item.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.progressPercent}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Sign In to Invest</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Login Call-to-Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-8 sm:p-10 text-center border border-slate-700/60">
          <h2 className="text-2xl sm:text-3xl font-black mb-3">Ready to Participate in the D-8 Circular Economy?</h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto mb-6">
            Sign in to access your secure, role-based workspace — manage tokenized assets, originate
            wealth pools, review Shariah governance, and collaborate across all {countries.length} member states.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setShowLoginModal(true)}
              className="flex items-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <LogIn className="w-5 h-5" />
              <span>Sign In to My Organisation</span>
            </button>
            <button
              onClick={onEnterPublicGuest}
              className="flex items-center gap-2 px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm rounded-2xl border border-white/20 transition-all cursor-pointer"
            >
              <Compass className="w-5 h-5 text-emerald-400" />
              <span>Continue as Guest</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-white">Wealth Pooling</span>
            <span>· Islamic Circular Economy Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <span>D-8 {countries.length} Member States</span>
            <span>·</span>
            <span>Shariah Governance</span>
            <span>·</span>
            <span>AAOIFI Certified</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 text-[10px] text-slate-600">
          Public demonstration portal. Guest-tier content is limited to marketplace &amp; ecosystem overview.
          Authorised roles unlock role-scoped financial workspaces after identity gateway sign-in.
        </div>
      </footer>

      {showLoginModal && <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />}
    </div>
  );
};
