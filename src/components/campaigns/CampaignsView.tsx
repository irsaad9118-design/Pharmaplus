import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { 
  Megaphone, 
  Sparkles, 
  Send, 
  Users, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  PhoneCall, 
  MessageSquare, 
  TrendingUp,
  PlusCircle,
  X,
  Languages
} from 'lucide-react';
import { OutreachCampaign, PatientTag } from '../../types/pharmacy';

export const CampaignsView: React.FC = () => {
  const { 
    campaigns, 
    patients, 
    createCampaign, 
    generateCampaignCopy, 
    addToast 
  } = usePharmacy();

  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('Spring MedSync Alignment Campaign');
  const [type, setType] = useState<OutreachCampaign['type']>('medsync_enrollment');
  const [channel, setChannel] = useState<OutreachCampaign['channel']>('sms');
  const [targetCohort, setTargetCohort] = useState<string>('High-Risk Polypharmacy (>3 medications)');
  const [messageTemplate, setMessageTemplate] = useState<string>('Hello {Patient_Name}, sync all your monthly prescriptions into a single convenient pickup day at PharmPulse. Reply SYNC to enroll.');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState<boolean>(false);
  const [aiTone, setAiTone] = useState<'supportive' | 'urgent' | 'clinical' | 'educational'>('supportive');

  const targetPatientsCount = patients.filter(p => {
    if (type === 'refill_due') return p.adherenceScore < 80;
    if (type === 'vaccine_drive') return p.tags.includes('Senior');
    if (type === 'chronic_care_gap') return p.tags.includes('Diabetic');
    return true;
  }).length;

  const handleGenerateAiCopy = async () => {
    setIsGeneratingCopy(true);
    try {
      const copy = await generateCampaignCopy(type, targetCohort, aiTone);
      if (copy) {
        setMessageTemplate(copy);
        addToast({
          type: 'success',
          title: 'AI Campaign Copy Generated',
          message: 'Optimized adherence messaging applied!'
        });
      }
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  const handleLaunchCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !messageTemplate.trim()) {
      alert('Campaign name and message template are required.');
      return;
    }

    createCampaign({
      title: name,
      name,
      type,
      targetCohort,
      targetGroup: targetCohort,
      channel,
      status: 'active',
      totalAudience: targetPatientsCount || 12,
      patientCount: targetPatientsCount || 12,
      responseCount: 0,
      scheduledDate: new Date().toISOString().split('T')[0],
      messageTemplate
    });

    setIsNewModalOpen(false);
  };

  return (
    <div id="campaigns-view" className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-teal-600" />
              <span>Outreach, MedSync & Adherence Automation</span>
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">
              {campaigns.length} Campaigns
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automate HIPAA-compliant SMS reminders, synchronize multi-drug refills (MedSync), and close chronic disease care gaps.
          </p>
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all self-start md:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch New Outreach Program</span>
        </button>
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map(camp => {
          const conversionRate = camp.patientCount > 0 
            ? Math.round((camp.responseCount / camp.patientCount) * 100)
            : 0;

          return (
            <div
              key={camp.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-slate-900">{camp.name}</h3>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        camp.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                        camp.status === 'scheduled' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {camp.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Cohort: <strong className="text-slate-700">{camp.targetCohort}</strong>
                    </p>
                  </div>

                  <span className="text-xs font-semibold uppercase px-2 py-1 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                    {camp.channel}
                  </span>
                </div>

                {/* Message Body preview */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium italic mt-3">
                  "{camp.messageTemplate}"
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Target Cohort</span>
                    <span className="font-extrabold text-slate-900 text-sm">{camp.patientCount} Patients</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Responses / Opt-ins</span>
                    <span className="font-extrabold text-teal-700 text-sm">{camp.responseCount} Active</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[11px] block">Conversion Rate</span>
                    <span className="font-extrabold text-emerald-600 text-sm">{conversionRate}%</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Launched: {camp.scheduledDate}
                </span>
                <span className="text-teal-600 font-semibold cursor-pointer hover:underline">
                  View Patient Responses →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-6 max-h-[92vh] flex flex-col">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Create Patient Adherence Outreach Campaign</h3>
                  <p className="text-xs text-slate-500">Engage cohorts with AI-optimized health reminders.</p>
                </div>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLaunchCampaign} className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
              
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Senior Flu Vaccine & Pneumococcal Outreach"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Campaign Objective</label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="refill_reminder">Refill Adherence Reminder</option>
                    <option value="medsync_enrollment">MedSync Alignment Enrollment</option>
                    <option value="vaccine_drive">Immunization & Vaccine Drive</option>
                    <option value="chronic_care_gap">Chronic Care Gap (Diabetic / Cardio)</option>
                    <option value="educational">Medication Safety & Education</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Communication Channel</label>
                  <select
                    value={channel}
                    onChange={e => setChannel(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    <option value="sms">SMS Text Message (98% Open Rate)</option>
                    <option value="whatsapp">WhatsApp Business API</option>
                    <option value="email">Email Newsletter</option>
                    <option value="automated_call">Interactive Voice Call (IVR)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target Patient Cohort</label>
                <input
                  type="text"
                  value={targetCohort}
                  onChange={e => setTargetCohort(e.target.value)}
                  placeholder="e.g. Diabetics with PDC < 80% or Seniors age 65+"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              {/* AI Copy Generator Block */}
              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>AI Copywriting Engine</span>
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={aiTone}
                      onChange={e => setAiTone(e.target.value as any)}
                      className="px-2 py-1 bg-white border border-teal-300 rounded-lg text-[11px] font-semibold text-teal-900"
                    >
                      <option value="supportive">Warm & Supportive</option>
                      <option value="urgent">Urgent Refill</option>
                      <option value="clinical">Clinical & Concise</option>
                      <option value="educational">Educational Focus</option>
                    </select>

                    <button
                      type="button"
                      onClick={handleGenerateAiCopy}
                      disabled={isGeneratingCopy}
                      className="px-3 py-1 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold shadow-sm flex items-center gap-1 transition-colors"
                    >
                      <span>{isGeneratingCopy ? 'Drafting...' : 'Write with AI'}</span>
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-teal-800">
                  Click "Write with AI" to generate a HIPAA-compliant, high-converting message template tailored for this objective.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Message Body Template *</label>
                <textarea
                  rows={3}
                  required
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  placeholder="Hi {Patient_Name}, ..."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500/20 text-xs font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Schedule & Launch Campaign</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
