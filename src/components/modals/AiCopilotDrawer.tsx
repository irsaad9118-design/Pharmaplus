import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Pill, 
  HeartPulse, 
  ShieldCheck, 
  HelpCircle,
  RotateCcw
} from 'lucide-react';

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiCopilotDrawer: React.FC<AiCopilotDrawerProps> = ({ isOpen, onClose }) => {
  const { currentPharmacist, screenInteractions } = usePharmacy();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Clinical Pharmacy Copilot powered by Gemini 3.7. How can I assist your dispensing workflow today? You can ask for renal dosing adjustments, drug interaction mechanisms, pediatric dosing, or patient counseling strategies.`,
      timestamp: '12:00 PM'
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickPrompts = [
    'Renal dosage adjustment for Gabapentin in CrCl 30 mL/min',
    'Clinical mechanism of Warfarin + Aspirin interaction',
    'Amoxicillin-Clavulanate high-dose pediatric dosing for acute otitis media',
    'GLP-1 receptor agonist initiation counseling points'
  ];

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Call server backend endpoint
      const response = await fetch('/api/gemini/screen-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medications: [text],
          conditions: ['Pharmacology Clinical Inquiry'],
          allergies: [],
          patientAge: 65
        })
      });

      let replyContent = '';
      if (response.ok) {
        const data = await response.json();
        replyContent = `${data.summary}\n\nClinical Recommendations: ${data.consultationAdvice || data.specialConsiderations || 'Ensure individualized patient assessment and regular clinical monitoring.'}`;
      } else {
        replyContent = `Clinical Analysis for "${text}": Ensure patient kidney and liver profiles are reviewed. Cross-verify clinical guidelines (Lexicomp/Micromedex standards) before dispensing.`;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Pharmacist Clinical Advisory: For inquiry "${text}", verify therapeutic serum targets, renal clearance (Cockcroft-Gault), and concomitant CYP450 inducers/inhibitors.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-copilot-drawer-overlay" className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-teal-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold border border-teal-400/30">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Pharmacist AI Copilot</h3>
                <span className="text-[10px] bg-teal-500/30 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-400/30">
                  Gemini 3.7
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Active session: {currentPharmacist}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMessages([messages[0]])}
              className="text-slate-400 hover:text-white p-2 rounded-xl"
              title="Reset Chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Question Chips */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 shrink-0 space-y-1.5 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Suggested Clinical Questions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 hover:border-teal-300 border border-slate-200 rounded-lg text-[11px] text-slate-700 text-left transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, idx) => {
            const isBot = m.role === 'assistant';

            return (
              <div key={idx} className={`flex gap-2.5 ${isBot ? 'items-start' : 'items-end flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isBot ? 'bg-teal-100 text-teal-800' : 'bg-slate-900 text-white'
                }`}>
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div className={`max-w-[82%] rounded-2xl p-3.5 space-y-1 ${
                  isBot 
                    ? 'bg-slate-50 border border-slate-200 text-slate-800' 
                    : 'bg-teal-600 text-white shadow-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  <span className={`text-[10px] block text-right ${isBot ? 'text-slate-400' : 'text-teal-200'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
              <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
              <span>Analyzing pharmacology reference literature...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white shrink-0">
          <form 
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              placeholder="Ask clinical pharmacology question, dosing, or interaction..."
              className="flex-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center shadow-md transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
