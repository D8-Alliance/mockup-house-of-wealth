import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, BookOpen, Bot, CheckCircle2, Coins, History, HelpCircle, Plus, Send, Sparkles, X } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { AiGroundingStatus, apiClient, BackendAiCitation, BackendAiConversationSummary, BackendAiMessage } from '../../services/apiClient';
import { AI_NON_ADVICE_DISCLAIMER } from '../monetisation/aiCreditPricingConfig';

interface AIAssistantProps {
  userRole: string;
  userName: string;
  userId?: string;
  currentContext?: string;
  /** Adds this project's approved documents to the knowledge the assistant can cite. */
  projectId?: string;
  onClose?: () => void;
}

const GROUNDING: Record<AiGroundingStatus, { label: string; className: string }> = {
  GROUNDED: { label: 'Supported by cited sources', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  PARTIALLY_GROUNDED: { label: 'Partly supported — some statements have no source', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  UNSUPPORTED: { label: 'Not supported by the cited sources — verify before use', className: 'bg-rose-50 text-rose-700 border-rose-200' },
  NO_SOURCES: { label: 'Not covered by the approved knowledge base', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const SCOPE_BADGE: Record<string, string> = {
  GLOBAL: 'bg-purple-100 text-purple-800',
  COUNTRY: 'bg-blue-100 text-blue-800',
  PROJECT: 'bg-emerald-100 text-emerald-800',
};

const SAMPLE_QUESTIONS = [
  'What must be disclosed about Zakah?',
  'Explain Musharakah profit and loss sharing',
  'How are profits allocated to investment account holders?',
  'What is Istisna\'a?',
  'Apakah yang perlu didedahkan tentang zakat?',
];

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const pages = (citation: BackendAiCitation) => !citation.pageStart ? '' : citation.pageEnd && citation.pageEnd !== citation.pageStart ? `pp. ${citation.pageStart}-${citation.pageEnd}` : `p. ${citation.pageStart}`;

/** Renders "[1]" markers in an answer as buttons that open the matching source. */
const AnswerText: React.FC<{ text: string; citations: BackendAiCitation[]; onCite: (marker: number) => void }> = ({ text, citations, onCite }) => (
  <p className="whitespace-pre-wrap text-xs">
    {text.split(/(\[\d+\])/g).map((part, index) => {
      const marker = part.match(/^\[(\d+)\]$/);
      if (!marker || !citations.some((citation) => citation.marker === Number(marker[1]))) return <React.Fragment key={index}>{part}</React.Fragment>;
      return <button key={index} type="button" onClick={() => onCite(Number(marker[1]))} className="mx-0.5 rounded bg-purple-100 px-1 font-bold text-purple-700 hover:bg-purple-200 dark:bg-purple-900/60 dark:text-purple-200">{marker[1]}</button>;
    })}
  </p>
);

const SourceList: React.FC<{ message: BackendAiMessage; openMarker: number | null; onToggle: (marker: number) => void }> = ({ message, openMarker, onToggle }) => {
  const citations = message.citations || [];
  if (!citations.length) return null;
  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 dark:border-slate-700">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"><BookOpen className="h-3 w-3" /> Sources</span>
      {citations.map((citation) => {
        const open = openMarker === citation.marker;
        return (
          <div key={citation.id} className={`rounded-xl border p-2 text-[10px] ${open ? 'border-purple-300 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>
            <button type="button" onClick={() => onToggle(citation.marker)} className="flex w-full flex-wrap items-center gap-1.5 text-left">
              <span className="rounded bg-purple-100 px-1 font-bold text-purple-700">{citation.marker}</span>
              <strong className="text-slate-800 dark:text-slate-100">{citation.documentTitle}</strong>
              <span className={`rounded-full px-1.5 py-0.5 font-bold ${SCOPE_BADGE[citation.scope] || 'bg-slate-100 text-slate-600'}`}>{citation.scope}</span>
              {pages(citation) && <span className="text-slate-500">{pages(citation)}</span>}
              {citation.paragraphRefs?.length ? <span className="text-slate-500">{citation.paragraphRefs.join(' ')}</span> : null}
            </button>
            {citation.quote && (
              <p className={`mt-1 italic ${citation.quoteVerified ? 'text-slate-600 dark:text-slate-300' : 'text-amber-700'}`}>
                “{citation.quote}” {citation.quoteVerified
                  ? <span className="not-italic text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> found in source</span>
                  : <span className="not-italic">(not found verbatim in the source)</span>}
              </p>
            )}
            {(citation.reviewStatus === 'INCORRECT' || citation.reviewStatus === 'IRRELEVANT') && (
              <p className="mt-1 flex items-start gap-1 rounded-lg bg-rose-50 p-1.5 font-semibold text-rose-700">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                A reviewer flagged this source as {citation.reviewStatus === 'INCORRECT' ? 'incorrect' : 'not relevant'} for this answer{citation.reviewComment ? `: ${citation.reviewComment}` : '.'}
              </p>
            )}
            {citation.reviewStatus === 'CONFIRMED' && <p className="mt-1 text-emerald-700"><CheckCircle2 className="inline h-3 w-3" /> Confirmed by a reviewer</p>}
            {citation.document?.supersededById && <p className="mt-1 text-slate-500">This document has since been superseded by a newer version.</p>}
            {open && <p className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{citation.excerpt}</p>}
            {open && !citation.chunkId && <p className="mt-1 text-slate-400">Source text shown as it was when the answer was given; the document has since been re-indexed or removed.</p>}
          </div>
        );
      })}
    </div>
  );
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ userRole, userName, projectId, onClose }) => {
  const [credits, setCredits] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<BackendAiMessage[]>([]);
  const [conversations, setConversations] = useState<BackendAiConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [openSource, setOpenSource] = useState<{ messageId: string; marker: number } | null>(null);
  const [inputQuery, setInputQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const refreshCredits = useCallback(() => {
    apiClient.getMembershipCreditSummary().then((summary) => setCredits(summary.availableBalance)).catch(() => setCredits(null));
  }, []);
  const refreshConversations = useCallback(() => {
    apiClient.listAiConversations().then(setConversations).catch(() => setConversations([]));
  }, []);

  useEffect(() => { refreshCredits(); refreshConversations(); }, [refreshCredits, refreshConversations]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isSending]);

  const openConversation = async (id: string) => {
    setError('');
    setShowHistory(false);
    try {
      const conversation = await apiClient.getAiConversation(id);
      setConversationId(conversation.id);
      setMessages(conversation.messages);
      setOpenSource(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load the conversation.');
    }
  };

  const newConversation = () => {
    setConversationId(undefined);
    setMessages([]);
    setOpenSource(null);
    setShowHistory(false);
    setError('');
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText ?? inputQuery).trim();
    if (!text || isSending) return;
    setError('');
    setInputQuery('');
    // Optimistic user message; the server's copy replaces it when the conversation is reloaded.
    const pending: BackendAiMessage = { id: `pending-${Date.now()}`, conversationId: conversationId || '', role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, pending]);
    setIsSending(true);
    try {
      // Credits are charged by the server, and only when a sourced answer is generated.
      const response = await apiClient.aiChat({ message: text, conversationId, projectId });
      setConversationId(response.conversationId);
      setMessages((current) => [...current, response.message]);
      refreshConversations();
    } catch (cause) {
      setMessages((current) => current.filter((message) => message.id !== pending.id));
      setInputQuery(text);
      setError(cause instanceof Error ? cause.message : 'The AI assistant is unavailable. Please try again.');
    } finally {
      setIsSending(false);
      refreshCredits();
    }
  };

  return (
    <div className="flex h-[600px] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white font-sans text-xs shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-slate-900 to-purple-950 p-4 text-white">
        <div className="flex items-center gap-2.5">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 p-2"><Bot className="h-5 w-5 text-emerald-400" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">AI Assistant</h3>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                <Coins className="h-3 w-3" /> {credits ?? '–'} Cr
              </span>
            </div>
            <p className="text-[10px] text-slate-300">Role: <strong className="text-emerald-400">{userRole}</strong> • 1 Cr per sourced answer</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowHistory((value) => !value)} title="Conversation history" className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><History className="h-4 w-4" /></button>
          <button type="button" onClick={newConversation} title="New conversation" className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><Plus className="h-4 w-4" /></button>
          {onClose && <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>}
        </div>
      </div>

      {showHistory && (
        <div className="max-h-48 shrink-0 overflow-y-auto border-b border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/60">
          {conversations.length === 0 && <p className="p-2 text-[10px] text-slate-500">No previous conversations.</p>}
          {conversations.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => void openConversation(conversation.id)} className={`block w-full rounded-lg px-2 py-1.5 text-left text-[11px] hover:bg-white dark:hover:bg-slate-700 ${conversation.id === conversationId ? 'bg-white font-bold dark:bg-slate-700' : ''}`}>
              <span className="block truncate text-slate-800 dark:text-slate-100">{conversation.title || 'Conversation'}</span>
              <span className="text-[9px] text-slate-400">{new Date(conversation.updatedAt).toLocaleString()} · {conversation._count.messages} messages</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-grow space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <p>Assalamu Alaikum {userName}. I answer questions about Islamic finance using only the approved knowledge base (AAOIFI standards, country guidance{projectId ? ', and this project\'s documents' : ''}), and I cite the source of every statement. I do not give Shariah rulings, legal, financial or investment advice.</p>
          </div>
        )}
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const meta = message.metadata || {};
          const grounding = meta.groundingStatus ? GROUNDING[meta.groundingStatus] : null;
          const openMarker = openSource?.messageId === message.id ? openSource.marker : null;
          return (
            <div key={message.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-2xl p-3 leading-relaxed ${isUser ? 'rounded-tr-none bg-emerald-600 text-white' : 'rounded-tl-none border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-100'}`}>
                {isUser
                  ? <p className="whitespace-pre-wrap text-xs">{message.content}</p>
                  : <AnswerText text={message.content} citations={message.citations || []} onCite={(marker) => setOpenSource(openMarker === marker ? null : { messageId: message.id, marker })} />}
                {!isUser && grounding && <p className={`mt-2 rounded-lg border px-2 py-1 text-[10px] font-bold ${grounding.className}`}>{grounding.label}</p>}
                {!isUser && message.citations?.some((citation) => citation.reviewStatus === 'INCORRECT' || citation.reviewStatus === 'IRRELEVANT') && (
                  <p className="mt-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">A reviewer has flagged a source in this answer — see Sources below.</p>
                )}
                {!isUser && <SourceList message={message} openMarker={openMarker} onToggle={(marker) => setOpenSource(openMarker === marker ? null : { messageId: message.id, marker })} />}
                {!isUser && meta.limitations?.length ? <ul className="mt-2 list-disc pl-4 text-[10px] text-slate-500">{meta.limitations.map((item) => <li key={item}>{item}</li>)}</ul> : null}
                {!isUser && meta.confidence && <div className="mt-2 border-t border-slate-200 pt-1.5 dark:border-slate-700"><AIConfidenceBadge confidence={meta.confidence} /></div>}
              </div>
              <span className="mt-1 font-mono text-[9px] text-slate-400">{time(message.createdAt)}</span>
            </div>
          );
        })}
        {isSending && (
          <div className="flex items-center gap-2 text-[10px] italic text-slate-400">
            <Sparkles className="h-3 w-3 animate-spin text-purple-500" />
            Searching the approved knowledge base and preparing a sourced answer...
          </div>
        )}
        {error && <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-rose-50 p-2.5 text-[11px] font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Sample questions */}
      <div className="scrollbar-none flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-slate-200/80 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
        <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-slate-400"><HelpCircle className="h-3 w-3" /> Try:</span>
        {SAMPLE_QUESTIONS.map((question) => (
          <button key={question} type="button" onClick={() => void handleSend(question)} disabled={isSending} className="shrink-0 whitespace-nowrap rounded-xl border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-emerald-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
            {question}
          </button>
        ))}
      </div>

      <div className="shrink-0 border-t border-amber-500/20 bg-amber-500/10 px-3 py-1 text-center text-[9.5px] text-amber-800 dark:text-amber-300">{AI_NON_ADVICE_DISCLAIMER}</div>

      {/* Input */}
      <form onSubmit={(event) => { event.preventDefault(); void handleSend(); }} className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <input
          type="text"
          value={inputQuery}
          onChange={(event) => setInputQuery(event.target.value)}
          disabled={isSending}
          placeholder="Ask about Islamic finance standards, contracts, Zakah..."
          className="flex-grow rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <button type="submit" disabled={isSending || !inputQuery.trim()} className="flex items-center gap-1 rounded-xl bg-emerald-600 p-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
