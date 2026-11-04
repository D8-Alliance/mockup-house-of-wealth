import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Send, Sparkles } from 'lucide-react';
import { apiClient, BackendAiMessage } from '../../services/apiClient';
import { useT } from '../i18n';

const errorText = (cause: unknown, fallback: string) => (cause instanceof Error ? cause.message : fallback);

/** Questions a member can start from; the answer comes in the language the question is asked in. */
const STARTERS = ['What is Ijarah?', 'How is profit shared in Mudarabah?', 'What makes an investment Shariah-compliant?', 'How is zakat on investments calculated?'];

const CONFIDENCE_STYLE: Record<string, string> = {
  HIGH: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  MEDIUM: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  LOW: 'bg-slate-500/10 text-slate-500',
};

const pages = (start: number | null, end: number | null) => (!start ? '' : end && end !== start ? `${start}-${end}` : String(start));

/**
 * Ask: questions answered only from the approved knowledge base (AAOIFI standards, platform policy), each answer
 * with its sources. When nothing in the knowledge base fits, it says so instead of guessing. It is not investment
 * advice or a Shariah ruling. Uses the same /ai/chat as the web portal, so AI credits and the citation audit apply.
 */
export const MobileAssistant: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t, serverText } = useT();
  const [messages, setMessages] = useState<BackendAiMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError('');
    setQuestion('');
    const pending: BackendAiMessage = { id: `local-${Date.now()}`, conversationId: conversationId ?? '', role: 'user', content: message, createdAt: new Date().toISOString() };
    setMessages(current => [...current, pending]);
    try {
      const reply = await apiClient.aiChat({ message, conversationId });
      setConversationId(reply.conversationId);
      setMessages(current => [...current, reply.message]);
    } catch (cause) {
      setMessages(current => current.filter(item => item.id !== pending.id));
      setQuestion(message);
      setError(serverText(errorText(cause, t('The question could not be answered. Try again.'))));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400"><ArrowLeft className="w-4 h-4" />{t('Back')}</button>
      <div>
        <h1 className="text-lg font-black flex items-center gap-1.5"><Sparkles className="w-5 h-5 text-amber-500" />{t('Ask')}</h1>
        <p className="text-xs text-slate-500">{t('Answers come only from approved references such as AAOIFI standards, with their sources. Not investment advice or a Shariah ruling.')}</p>
      </div>

      {messages.length === 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500">{t('Try asking')}</p>
          <div className="flex flex-wrap gap-2">
            {STARTERS.map(starter => <button key={starter} type="button" disabled={busy} onClick={() => ask(t(starter))} className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-bold disabled:opacity-50">{t(starter)}</button>)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {messages.map(item => item.role === 'user'
          ? <p key={item.id} className="ml-10 rounded-2xl rounded-br-sm bg-emerald-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">{item.content}</p>
          : <Answer key={item.id} message={item} />)}
        {busy && <p className="mr-10 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs text-slate-500">{t('Looking through the references... this can take up to a minute.')}</p>}
        <div ref={end} />
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">{error}</p>}

      <form onSubmit={(event) => { event.preventDefault(); void ask(question); }} className="sticky bottom-20 flex gap-2 rounded-2xl bg-slate-50/95 dark:bg-slate-950/95 py-2">
        <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void ask(question); } }} maxLength={1000} rows={2} placeholder={t('Ask about Islamic finance, akad or zakat')} className="min-w-0 flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm" />
        <button type="submit" aria-label={t('Send')} disabled={busy || !question.trim()} className="w-12 shrink-0 rounded-xl bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
};

/** One answer: the text, how well the sources support it, and the sources themselves. */
const Answer: React.FC<{ message: BackendAiMessage }> = ({ message }) => {
  const { t, serverText } = useT();
  const [open, setOpen] = useState(false);
  const confidence = message.metadata?.confidence;
  const citations = message.citations ?? [];
  return (
    <div className="mr-6 rounded-2xl rounded-bl-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 space-y-2">
      <p className="text-sm whitespace-pre-wrap">{serverText(message.content)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {confidence && <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${CONFIDENCE_STYLE[confidence.level] ?? CONFIDENCE_STYLE.LOW}`}>{t(`Support: ${confidence.level.toLowerCase()}`)}</span>}
        {citations.length > 0 && <button type="button" onClick={() => setOpen(value => !value)} className="flex items-center gap-1 text-[11px] font-black text-emerald-700 dark:text-emerald-400"><BookOpen className="w-3.5 h-3.5" />{open ? t('Hide sources') : t('{count} source(s)', { count: citations.length })}</button>}
      </div>
      {open && (
        <ol className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
          {citations.map(citation => (
            <li key={citation.id} className="text-[11px]">
              <p className="font-bold">[{citation.marker}] {citation.documentTitle}{pages(citation.pageStart, citation.pageEnd) ? ` · ${t('p. {pages}', { pages: pages(citation.pageStart, citation.pageEnd) })}` : ''}{citation.paragraphRefs?.length ? ` · ${citation.paragraphRefs.join(' ')}` : ''}</p>
              {citation.quote && <p className="text-slate-500 italic">“{citation.quote}”</p>}
            </li>
          ))}
        </ol>
      )}
      <p className="text-[10px] text-slate-400">{t('Not investment advice or a Shariah ruling. Ask a qualified adviser before deciding.')}</p>
    </div>
  );
};
