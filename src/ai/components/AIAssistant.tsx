import React, { useState, useEffect } from 'react';
import { Bot, Send, X, Sparkles, MessageSquare, HelpCircle, ShieldCheck, Coins, AlertCircle } from 'lucide-react';
import { AIConfidenceBadge } from './AIConfidenceBadge';
import { aiMonetisationService } from '../monetisation/aiMonetisationService';
import { AI_NON_ADVICE_DISCLAIMER } from '../monetisation/aiCreditPricingConfig';

interface AIAssistantProps {
  userRole: string;
  userName: string;
  userId?: string;
  currentContext?: string;
  onClose?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'USER' | 'AI';
  text: string;
  timestamp: string;
  confidence?: any;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  userRole, 
  userName, 
  userId = 'USR-8821', 
  currentContext = 'General Platform', 
  onClose 
}) => {
  const [credits, setCredits] = useState(aiMonetisationService.getCreditBalanceBreakdown(userId).remainingCredits);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'AI',
      text: `Assalamu Alaikum ${userName}! I am your House of Wealth AI Assistant. How can I assist you with Shariah wealth pooling, contract structure, due diligence, or risk assessment today? (1 Credit per query)`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: { level: 'HIGH', scorePercent: 96, disclaimer: 'AI guidance requires human review.' }
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const update = () => {
      setCredits(aiMonetisationService.getCreditBalanceBreakdown(userId).remainingCredits);
    };
    const unsubscribe = aiMonetisationService.subscribe(update);
    return () => unsubscribe();
  }, [userId]);

  const sampleQuestions = [
    'What pools match my profile?',
    'Summarise this project',
    'What are the main risks?',
    'What documents are missing?',
    'Explain this Musharakah structure',
    'What is my portfolio concentration?'
  ];

  const handleSend = (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    if (credits < 1) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'AI',
        text: 'Insufficient AI credits (0 remaining). Please top up your credits or upgrade your membership tier to continue using the AI assistant.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
      return;
    }

    // Deduct 1 credit for Simple AI Query
    aiMonetisationService.consumeCreditsForOperation(userId, 'SIMPLE_QUERY', {
      targetEntity: currentContext,
      userName
    });

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'USER',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      let aiReply = 'I have analyzed your query based on current House of Wealth database parameters.';
      
      const q = textToSend.toLowerCase();
      if (q.includes('match') || q.includes('profile') || q.includes('pools')) {
        aiReply = 'Based on your moderate risk profile, FELDA Agri Expansion Pool (92% match, 10.5% return) and Urban Commercial Waqf (88% match, 8.2% return) appear potentially aligned.';
      } else if (q.includes('summarise') || q.includes('project')) {
        aiReply = 'The FELDA Agriculture Expansion Project seeks $8M USD under a Mudarabah contract structure with an 80/20 profit sharing split. Operating cashflows indicate a projected DSCR of 1.65.';
      } else if (q.includes('risk')) {
        aiReply = 'Key identified risks include: 1) Secondary market liquidity constraints, 2) Commodity export price fluctuation, and 3) Pending land title appraisal verification.';
      } else if (q.includes('missing') || q.includes('document')) {
        aiReply = 'The due diligence checklist indicates 2 missing files: Independent Land Appraisal Report (Jengka-04) and Environmental RSPO Certification.';
      } else if (q.includes('musharakah') || q.includes('structure')) {
        aiReply = 'In a Musharakah joint venture, all partners contribute capital and share profits according to agreed ratios, while capital losses are borne strictly pro-rata to capital contribution.';
      } else if (q.includes('portfolio') || q.includes('concentration')) {
        aiReply = 'Your current portfolio holds 65% in Agriculture, 25% in Commercial Real Estate, and 10% Cash/Sukuk reserves. Consider diversifying into Green Energy or Infrastructure.';
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence: { level: 'HIGH', scorePercent: 94, disclaimer: 'AI output must be reviewed by authorized human decision makers.' }
      };

      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="flex flex-col h-[540px] max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden font-sans text-xs">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 to-purple-950 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30">
            <Bot className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white">AI Assistant</h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/30">
                <Coins className="w-3 h-3" /> {credits} Cr
              </span>
            </div>
            <p className="text-[10px] text-slate-300">Role: <strong className="text-emerald-400">{userRole}</strong> • 1 Cr / query</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-grow p-4 overflow-y-auto space-y-3">
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}>
            <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
              m.sender === 'USER'
                ? 'bg-emerald-600 text-white rounded-tr-none'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-none'
            }`}>
              <p className="text-xs">{m.text}</p>
              {m.confidence && (
                <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                  <AIConfidenceBadge confidence={m.confidence} />
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-400 mt-1 font-mono">{m.timestamp}</span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-[10px] italic">
            <Sparkles className="w-3 h-3 text-purple-500 animate-spin" />
            AI is analyzing House of Wealth records (-1 credit)...
          </div>
        )}
      </div>

      {/* Sample Question Chips */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200/80 dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 scrollbar-none shrink-0">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" /> Prompts:
        </span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-semibold text-[10px] whitespace-nowrap border border-slate-200/80 dark:border-slate-600 cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Mandatory Disclaimer Footer */}
      <div className="px-3 py-1 bg-amber-500/10 border-t border-amber-500/20 text-[9.5px] text-amber-800 dark:text-amber-300 text-center shrink-0">
        {AI_NON_ADVICE_DISCLAIMER}
      </div>

      {/* Input Field */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI about projects, contracts, risks... (1 Cr)"
          className="flex-grow p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
        />
        <button
          onClick={() => handleSend()}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1 font-bold text-xs"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
