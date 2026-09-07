import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  Globe2,
  Handshake,
  Landmark,
  Mail,
  MapPin,
  Newspaper,
  PencilLine,
  Phone,
  Scale,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet
} from 'lucide-react';
import { INITIAL_COUNTRY_NODES } from '../../countryNodes/mockCountryNodes';
import { useRBAC } from '../../rbac/RBACContext';
import { ContentStatus } from '../../shariah/coreValuesTypes';
import { shariahContentService } from '../../shariah/shariahContentService';
import { ShariahContentEditor } from './ShariahContentEditor';
import { isAdminRole } from './AdminShariahContentManager';
import { useEditablePageContent, EditablePageAdminBar } from './useEditablePageContent';
import { PAGE_CONTENT_SCHEMAS } from './pageContentSchemas';
import { pageContentService } from './pageContentService';
import { PageContentEditor } from './PageContentEditor';

export type PublicPageId = 'home' | 'about' | 'members' | 'shariah' | 'news' | 'contact';

interface InfoPageLayoutProps {
  children: React.ReactNode;
  pageId: PublicPageId;
  onNavigate: (page: PublicPageId) => void;
  onSignIn: () => void;
}

const NAV_LINKS: { id: PublicPageId; label: string }[] = [
  { id: 'about', label: 'About D-8' },
  { id: 'members', label: 'Member States' },
  { id: 'shariah', label: 'Shariah Governance' },
  { id: 'news', label: 'News & Updates' },
  { id: 'contact', label: 'Contact' }
];

const countries = INITIAL_COUNTRY_NODES;

function SectionHeading({
  icon,
  title,
  subtitle
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-emerald-500 mb-2">
        {icon}
        <span className="text-xs font-black uppercase tracking-widest">D-8 House of Wealth</span>
      </div>
      <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h1>
      {subtitle && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{subtitle}</p>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6">
      {children}
    </div>
  );
}

function PageBanner({ title, blurb }: { title: string; blurb: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="max-w-3xl">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Islamic Circular Economy Platform
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-900 dark:text-white">
            {title}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">{blurb}</p>
        </div>
      </div>
    </section>
  );
}

function InfoHeader({
  pageId,
  onNavigate,
  onSignIn
}: {
  pageId: PublicPageId;
  onNavigate: (page: PublicPageId) => void;
  onSignIn: () => void;
}) {
  return (
    <>
      <div className="bg-slate-950 text-white border-b border-slate-800 py-2.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
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
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Sign In to System</span>
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            <button onClick={() => onNavigate('home')} className="flex items-center gap-3 cursor-pointer bg-transparent border-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white">House of Wealth</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">D-8</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Islamic Circular Economy Platform</p>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-5 text-xs font-bold text-slate-600 dark:text-slate-300">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.id}
                  onClick={() => onNavigate(link.id)}
                  className={`cursor-pointer hover:text-emerald-600 transition-colors ${
                    pageId === link.id ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export function InfoPageLayout({ children, pageId, onNavigate, onSignIn }: InfoPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 font-sans flex flex-col">
      <InfoHeader pageId={pageId} onNavigate={onNavigate} onSignIn={onSignIn} />

      <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-2">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                pageId === link.id
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-grow">{children}</main>

      <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-white">House of Wealth</span>
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
          Public demonstration portal. Guest-tier content is limited to marketplace & ecosystem overview.
          Authorised roles unlock role-scoped financial workspaces after identity gateway sign-in.
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* About D-8                                                           */
/* ------------------------------------------------------------------ */
export function AboutD8Page() {
  const { content, status, canEdit, editorName, editorOpen, openEditor, closeEditor } = useEditablePageContent('about');

  const milestones = content.sections.milestones;
  const pillars = content.sections.pillars;
  const pillarIcons = [<Globe2 className="w-6 h-6" />, <Wallet className="w-6 h-6" />, <ShieldCheck className="w-6 h-6" />, <Scale className="w-6 h-6" />];

  const stats = countries.reduce(
    (acc, c) => ({
      projects: acc.projects + c.activeProjectsCount,
      pools: acc.pools + c.activePoolsCount,
      orgs: acc.orgs + c.activeOrganisationsCount,
      users: acc.users + c.activeUsersCount
    }),
    { projects: 0, pools: 0, orgs: 0, users: 0 }
  );

  return (
    <>
      <PageBanner
        title={content.meta.title}
        blurb={content.meta.subtitle}
      />

      <EditablePageAdminBar schemaLabel="About D-8" status={status} canEdit={canEdit} onEdit={openEditor} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {content.meta.intro && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl mb-8">{content.meta.intro}</p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{countries.length}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Member States</p>
          </Card>
          <Card>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.projects}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Projects</p>
          </Card>
          <Card>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.pools}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wealth Pools</p>
          </Card>
          <Card>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.users.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Verified Users</p>
          </Card>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading
          icon={<Landmark className="w-4 h-4" />}
          title="Our Four Strategic Pillars"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((p, i) => (
            <Card key={p.id}>
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 mb-4">
                {pillarIcons[i % pillarIcons.length]}
              </div>
              <h3 className="font-black text-sm mb-2">{p.values.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.values.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading
          icon={<ScrollText className="w-4 h-4" />}
          title="Our Journey"
          subtitle="From a shared economic vision to a live digital marketplace."
        />
        <div className="relative border-l border-slate-200 dark:border-slate-700 ml-3 pl-8 space-y-8">
          {milestones.map((m) => (
            <div key={m.id} className="relative">
              <span className="absolute -left-[2.35rem] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900" />
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                  {m.values.year}
                </span>
                <h3 className="font-black text-sm">{m.values.title}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">{m.values.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {editorOpen && canEdit && (
        <PageContentEditor
          schema={PAGE_CONTENT_SCHEMAS.about}
          initialContent={pageContentService.getDraft('about')}
          status={status}
          editorName={editorName}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Member States                                                       */
/* ------------------------------------------------------------------ */
export function MemberStatesPage() {
  const { content, status, canEdit, editorName, editorOpen, openEditor, closeEditor } = useEditablePageContent('members');

  const featured = countries[5]; // CN-MYS default highlight
  const [focus, setFocus] = React.useState<string>(featured.countryNodeId);
  const active = countries.find((c) => c.countryNodeId === focus) || featured;

  const contributions: Record<string, string> = {};
  content.sections.contributions.forEach((c) => {
    contributions[c.values.countryCode] = c.values.detail;
  });

  return (
    <>
      <PageBanner
        title={content.meta.title}
        blurb={content.meta.subtitle}
      />

      <EditablePageAdminBar schemaLabel="Member States" status={status} canEdit={canEdit} onEdit={openEditor} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2">
          {countries.map((c) => (
            <button
              key={c.countryNodeId}
              onClick={() => setFocus(c.countryNodeId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                c.countryNodeId === active.countryNodeId
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-500/40'
              }`}
            >
              <img src={c.flagUrl} alt={c.countryName} className="w-5 h-3.5 object-cover rounded-sm shadow-sm" />
              <span>{c.countryName}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white border border-slate-700/60 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
            <img
              src={active.flagUrl}
              alt={active.countryName}
              className="w-16 h-11 object-cover rounded-lg shadow-lg ring-2 ring-emerald-500/50"
            />
            <div>
              <h2 className="text-2xl font-black">{active.countryName}</h2>
              <p className="text-xs text-slate-400">{active.region} • {active.countryCode} • {active.currency}</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-5">{contributions[active.countryNodeId]}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-slate-400">Regulator</p>
              <p className="font-bold mt-0.5 text-[10px] leading-snug">{active.regulatoryProfile}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-slate-400">Organisations</p>
              <p className="font-bold mt-0.5 text-emerald-400">{active.activeOrganisationsCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-slate-400">Projects</p>
              <p className="font-bold mt-0.5 text-emerald-400">{active.activeProjectsCount}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-slate-400">Wealth Pools</p>
              <p className="font-bold mt-0.5 text-emerald-400">{active.activePoolsCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading icon={<Users className="w-4 h-4" />} title="Member States Overview" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {countries.map((c) => (
            <Card key={c.countryNodeId}>
              <div className="flex items-center gap-3 mb-3">
                <img src={c.flagUrl} alt={c.countryName} className="w-9 h-6 object-cover rounded shadow" />
                <div>
                  <p className="font-extrabold text-sm">{c.countryName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{c.countryCode} • {c.region}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{c.activeProjectsCount}</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500">Projects</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{c.activePoolsCount}</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500">Pools</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{c.activeUsersCount}</p>
                  <p className="text-[9px] font-bold uppercase text-slate-500">Users</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {editorOpen && canEdit && (
        <PageContentEditor
          schema={PAGE_CONTENT_SCHEMAS.members}
          initialContent={pageContentService.getDraft('members')}
          status={status}
          editorName={editorName}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shariah Governance                                                  */
/* ------------------------------------------------------------------ */
export function ShariahGovernancePage() {
  const [content, setContent] = useState(shariahContentService.getPublishedContent());
  const [status, setStatus] = useState<ContentStatus>(shariahContentService.getStatus());
  const [editorOpen, setEditorOpen] = useState(false);
  const { activeUser, currentRole, authMode, isAuthenticated } = useRBAC();

  useEffect(() => {
    shariahContentService.setMode(authMode);
    const unsub = shariahContentService.subscribe(() => {
      setContent(shariahContentService.getPublishedContent());
      setStatus(shariahContentService.getStatus());
    });
    return unsub;
  }, [authMode]);

  const canEdit = isAuthenticated && isAdminRole(currentRole);

  const principles = [
    { title: 'No Riba (Interest)', detail: 'All financing structures are strictly interest-free. Returns derive from real economic activity and risk sharing.' },
    { title: 'No Gharar (Excessive Uncertainty)', detail: 'Contracts are transparent and fully specified, eliminating ambiguity in terms, assets, and obligations.' },
    { title: 'No Haram (Prohibited) Activities', detail: 'Capital may not flow into prohibited industries such as alcohol, gambling, conventional banking, or speculative derivatives.' },
    { title: 'Profit & Loss Sharing', detail: 'Investors and entrepreneurs share returns and risk through Mudarabah and Musharakah partnerships.' },
    { title: 'Asset Backing', detail: 'Every instrument is underpinned by tangible real-economy assets — no pure money-on-money trading.' },
    { title: 'No Short-Selling or Excessive Leverage', detail: 'Speculative short-selling and highly leveraged positions are prohibited to curb systemic instability.' }
  ];

  const structures = [
    { name: 'Mudarabah', detail: 'A profit-sharing partnership where capital providers (Rabb-ul-Mal) fund entrepreneurs (Mudarib), who manage the venture. Losses are borne by capital unless caused by negligence.' },
    { name: 'Musharakah', detail: 'A joint-partnership where all parties contribute capital and share profits and losses pro-rata, widely used for project and infrastructure finance.' },
    { name: 'Ijarah', detail: 'An Islamic lease-and-lease-back arrangement used to finance equipment, real estate, and maritime assets with fixed rental streams.' },
    { name: 'Murabaha', detail: 'A cost-plus mark-up sale where the financier purchases an asset and resells it to the client at a disclosed profit margin, paid in instalments.' },
    { name: 'Wakalah', detail: 'An agency arrangement where one party appoints another to act on its behalf — often used in syndication and pooled investment mandates.' },
    { name: 'Sukuk', detail: 'Islamic investment certificates representing proportionate ownership of an underlying asset or project, tradable and asset-backed.' }
  ];

  const reassurance = [
    { step: '01', icon: <CheckCircle2 className="w-6 h-6" />, title: 'Instrument Screening', detail: 'Every structure is screened at origination by the issuer and validated against AAOIFI standards before listing.' },
    { step: '02', icon: <ShieldCheck className="w-6 h-6" />, title: 'Independent Supervisory Council', detail: 'Each country node maintains an independent Shariah Supervisory Council that reviews contracts, structures, and fatwa conformity.' },
    { step: '03', icon: <ScrollText className="w-6 h-6" />, title: 'Automated Purification & Audit', detail: 'The platform auto-deducts Zakat and any impermissible income for purification, with every step logged on an immutable audit ledger.' }
  ];

  return (
    <>
      <PageBanner
        title={content.title}
        blurb={content.subtitle}
      />

      {canEdit && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-4">
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
              status === 'published'
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
            }`}>
              {status === 'published' ? '● Published' : '● Draft — preview only'}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">
              You are viewing as an administrator. Visitors see the published version.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setEditorOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
              >
                <PencilLine className="w-3.5 h-3.5" /> Edit Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Core Values intro */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading
          icon={<Award className="w-4 h-4" />}
          title="The 10 Islamic Intangible Core Values"
          subtitle="Ten standard digital-culture values adapted for the Islamic Digital Economy — selected to align with Islamic ethics, Muamalat, and responsible economic practice."
        />
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl -mt-2 mb-6">{content.intro}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {content.values.map((v) => (
            <Card key={v.id}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono text-sm font-black border border-emerald-500/20">
                    {v.order}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{v.translation}</p>
                    <h3 className="font-black text-sm">{v.name} <span className="font-normal text-slate-400" dir="rtl">{v.arabic}</span></h3>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-2">{v.meaning}</p>
              <div className="mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">For D-8 IDEAS</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{v.whatItMeans}</p>
              </div>
              {v.applications.length > 0 && (
                <ul className="space-y-1.5 mb-3">
                  {v.applications.filter(Boolean).map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-emerald-500 mt-0.5">•</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}
              {v.guidingPrinciple && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border-l-4 border-emerald-500/50 text-xs italic text-slate-600 dark:text-slate-300 leading-relaxed">
                  {v.guidingPrinciple}
                </div>
              )}
              {v.simpleExample && (
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  <span className="font-bold text-slate-500 dark:text-slate-300">Example: </span>{v.simpleExample}
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading icon={<ShieldCheck className="w-4 h-4" />} title="Core Shariah Principles" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {principles.map((p) => (
            <Card key={p.title}>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-black text-sm mb-1.5">{p.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{p.detail}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading
          icon={<BookOpen className="w-4 h-4" />}
          title="Shariah-Compliant Structures"
          subtitle="The building blocks powering every tokenized asset and wealth pool on the platform."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {structures.map((s) => (
            <Card key={s.name}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/20">
                  {s.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading icon={<Scale className="w-4 h-4" />} title="Three-Tier Assurance Framework" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reassurance.map((t) => (
            <Card key={t.step}>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  {t.icon}
                </div>
                <span className="font-mono text-3xl font-black text-slate-100 dark:text-slate-800">{t.step}</span>
              </div>
              <h3 className="font-black text-sm mb-2">{t.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {editorOpen && canEdit && (
        <ShariahContentEditor
          initialContent={content}
          status={status}
          editorName={activeUser.name || currentRole}
          onClose={() => setEditorOpen(false)}
          onSaved={(c, s) => {
            setContent(c);
            setStatus(s);
            setEditorOpen(false);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* News & Updates                                                      */
/* ------------------------------------------------------------------ */
export function NewsUpdatesPage() {
  const { content, status, canEdit, editorName, editorOpen, openEditor, closeEditor } = useEditablePageContent('news');

  const featured = content.sections.featured[0]
    ? content.sections.featured[0].values
    : { tag: '', date: '', title: '', excerpt: '' };
  const items = content.sections.items.map((n) => n.values);

  return (
    <>
      <PageBanner
        title={content.meta.title}
        blurb={content.meta.subtitle}
      />

      <EditablePageAdminBar schemaLabel="News & Updates" status={status} canEdit={canEdit} onEdit={openEditor} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="lg:col-span-2 h-56 lg:h-auto bg-gradient-to-br from-emerald-600 to-teal-700 relative">
              <div className="absolute inset-0 flex items-center justify-center text-white/90">
                <Newspaper className="w-24 h-24" />
              </div>
            </div>
            <div className="lg:col-span-3 p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                  {featured.tag}
                </span>
                <span className="text-xs text-slate-400">{featured.date}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mb-3">{featured.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{featured.excerpt}</p>
              <button className="mt-5 flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">
                <span>Read Announcement</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SectionHeading icon={<Newspaper className="w-4 h-4" />} title="Latest Updates" />
        <div className="space-y-4">
          {items.map((n, i) => (
            <Card key={`${n.title}-${i}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20 w-fit">
                  {n.tag}
                </span>
                <span className="text-xs text-slate-400 sm:ml-auto">{n.date}</span>
              </div>
              <h3 className="font-black text-sm mt-2.5">{n.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5">{n.excerpt}</p>
            </Card>
          ))}
        </div>
      </section>

      {editorOpen && canEdit && (
        <PageContentEditor
          schema={PAGE_CONTENT_SCHEMAS.news}
          initialContent={pageContentService.getDraft('news')}
          status={status}
          editorName={editorName}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */
export function ContactPage() {
  const { content, status, canEdit, editorName, editorOpen, openEditor, closeEditor } = useEditablePageContent('contact');

  const [form, setForm] = React.useState({ name: '', email: '', subject: 'General Enquiry', message: '' });
  const [sent, setSent] = React.useState(false);

  const offices = content.sections.offices.map((o) => o.values);

  return (
    <>
      <PageBanner
        title={content.meta.title}
        blurb={content.meta.subtitle}
      />

      <EditablePageAdminBar schemaLabel="Contact" status={status} canEdit={canEdit} onEdit={openEditor} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <SectionHeading
              icon={<Mail className="w-4 h-4" />}
              title="Send a Message"
              subtitle="Our team responds within one business day."
            />
            {sent ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="font-black text-sm mb-1">Message Sent</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thank you, {form.name || 'there'}. We have received your enquiry and will be in touch shortly.
                </p>
              </div>
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Full Name</label>
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      placeholder="you@organisation.org"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    <option>General Enquiry</option>
                    <option>List an Offering</option>
                    <option>Institutional Investment</option>
                    <option>Shariah Governance</option>
                    <option>Media & Partnerships</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="How can we help?"
                  />
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </form>
            )}
          </Card>

          <div className="space-y-5">
            <Card>
              <SectionHeading icon={<Phone className="w-4 h-4" />} title="Direct Lines" />
              <ul className="space-y-3 text-xs">
                <li className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-500">General:</span>
                  <span className="font-bold">secretariat@houseofwealth.d8.org</span>
                </li>
                <li className="flex items-center gap-3">
                  <Handshake className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-500">Partnerships:</span>
                  <span className="font-bold">partners@houseofwealth.d8.org</span>
                </li>
                <li className="flex items-center gap-3">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-500">Shariah:</span>
                  <span className="font-bold">shariah@houseofwealth.d8.org</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span className="text-slate-500">Hotline:</span>
                  <span className="font-bold">+60 3 2191 2100</span>
                </li>
              </ul>
            </Card>

            <Card>
              <SectionHeading icon={<MapPin className="w-4 h-4" />} title="Regional Offices" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {offices.map((o) => (
                  <div key={o.region} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{o.region}</p>
                    <p className="font-bold text-xs mt-1.5">{o.city}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{o.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {editorOpen && canEdit && (
        <PageContentEditor
          schema={PAGE_CONTENT_SCHEMAS.contact}
          initialContent={pageContentService.getDraft('contact')}
          status={status}
          editorName={editorName}
          onClose={closeEditor}
          onSaved={closeEditor}
        />
      )}
    </>
  );
}
