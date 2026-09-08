import { Patient, ChronicMedicationEntry, ShopSettings } from '../types/pharmacy';

export interface WhatsAppRefillTemplate {
  id: string;
  name: string;
  category: 'due_soon' | 'overdue' | 'medsync' | 'delivery' | 'discount' | 'ayurvedic' | 'regional' | 'custom';
  title: string;
  badge: string;
  badgeColor: string;
  language: 'English' | 'Hinglish' | 'Hindi';
  tone: 'Friendly' | 'Clinical & Urgent' | 'Convenient' | 'Promotional';
  templateBody: string;
  description: string;
  tags: string[];
}

export interface RefillQueueItem {
  id: string;
  patientId: string;
  patient: Patient;
  medication: ChronicMedicationEntry;
  daysRemaining: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isDueSoon: boolean; // within 7 days
  status: 'pending' | 'sent' | 'refilled' | 'overdue' | 'snoozed';
  lastReminderSent?: string;
  urgencyScore: number; // 0 to 100
  recommendedTemplateId: string;
  selected: boolean;
}

export interface RefillDispatchLog {
  id: string;
  timestamp: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  medicationName: string;
  templateId: string;
  templateName: string;
  messageText: string;
  status: 'dispatched' | 'copied' | 'simulated' | 'failed';
  channel: 'whatsapp_web' | 'whatsapp_app' | 'copy';
}

// Comprehensive Library of Pre-Approved Clinical & Commercial WhatsApp Templates
export const WHATSAPP_REFILL_TEMPLATES: WhatsAppRefillTemplate[] = [
  {
    id: 'tpl-due-soon-standard',
    name: 'Standard 30-Day Refill Reminder',
    category: 'due_soon',
    title: 'Friendly Upcoming Refill (3-5 Days Ahead)',
    badge: 'Standard',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300',
    language: 'English',
    tone: 'Friendly',
    description: 'Polite reminder sent 3 to 5 days before medication exhaustion.',
    tags: ['Due Soon', 'Routine', 'High Adherence'],
    templateBody: `Hello {patient_name} 👋,

This is a gentle refill reminder from *{pharmacy_name}*.

💊 *Medication:* {medicine_name} ({dosage_instructions})
📅 *Next Refill Due Date:* *{due_date}* ({days_remaining_text})

We have freshly packed your regular monthly supply at our dispensary. 

Reply *1* to confirm ready for store pickup, or reply *DELIVER* for free doorstep drop at {patient_address}.

📍 *Dispensary Desk:* {pharmacy_phone}
Stay healthy and take care!`
  },
  {
    id: 'tpl-overdue-urgent',
    name: 'Overdue Adherence Care Alert',
    category: 'overdue',
    title: 'Urgent Care Alert (Dose Interruption Prevention)',
    badge: 'Overdue / Urgent',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300',
    language: 'English',
    tone: 'Clinical & Urgent',
    description: 'Sent when patient is 3+ days overdue to prevent therapy gap and clinical complications.',
    tags: ['Overdue', 'Hypertension', 'Diabetic', 'High Risk'],
    templateBody: `⚠️ *Important Health & Refill Alert*

Dear {patient_name},

Our pharmacy clinical records indicate that your regular prescription for *{medicine_name}* was due for refill on *{due_date}* (*{days_overdue} days ago*).

Maintaining uninterrupted daily doses is crucial for managing your condition effectively.

📦 *Current Status:* Your refill is reserved and ready at our counter.
⚡ *Instant Action:* Reply *YES* to hold it for pickup today, or call *{pharmacy_phone}* for priority home delivery.

Best regards,
*Chief Pharmacist*, {pharmacy_name}`
  },
  {
    id: 'tpl-medsync-bundle',
    name: 'MedSync Multi-Drug Synchronized Pack',
    category: 'medsync',
    title: 'All-in-One Multi-Prescription Synchronized Bundle',
    badge: 'MedSync Bundle',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300',
    language: 'English',
    tone: 'Convenient',
    description: 'Designed for polypharmacy patients with multiple monthly chronic medications.',
    tags: ['Polypharmacy', 'Senior', 'MedSync'],
    templateBody: `Hello {patient_name} 👋,

Your *Monthly Synchronized Medicine Pack* from *{pharmacy_name}* is ready!

📋 *Synchronized Medications ({med_count} items):*
{medicine_list}

📅 *Cycle Due Date:* *{due_date}*
🏷️ *Rack Location:* {rack_location}

All your daily doses are sorted in our tamper-proof care package. 
Would you like to pick them up today, or should we dispatch to {patient_address}?

📞 Quick Support: {pharmacy_phone} | UPI: {upi_id}`
  },
  {
    id: 'tpl-home-delivery-upi',
    name: 'Doorstep Delivery & UPI 1-Click Order',
    category: 'delivery',
    title: 'Home Delivery with Contactless UPI Payment',
    badge: 'Home Delivery',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
    language: 'English',
    tone: 'Convenient',
    description: 'Encourages fast home delivery orders with cashless UPI payment.',
    tags: ['Delivery', 'UPI', 'Convenience'],
    templateBody: `Namaste {patient_name} 🙏,

Running out of your daily *{medicine_name}*? No need to step out in traffic!

*{pharmacy_name}* is pleased to offer *Free Doorstep Delivery* for your refill due on *{due_date}*.

🛵 *Delivery Address:* {patient_address}
💳 *Easy UPI Payment:* {upi_id} (or Cash on Delivery)

Reply *CONFIRM* to have our delivery rider arrive at your address within 60 minutes!
📞 Helpline: {pharmacy_phone}`
  },
  {
    id: 'tpl-hinglish-conversational',
    name: 'Hinglish Friendly Refill Alert',
    category: 'regional',
    title: 'Conversational Hinglish Reminder',
    badge: 'Hinglish',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
    language: 'Hinglish',
    tone: 'Friendly',
    description: 'Warm conversational Hindi-English mix ideal for local Indian retail pharmacies.',
    tags: ['India', 'Hinglish', 'Local Retail'],
    templateBody: `Namaste {patient_name} ji 🙏

Aapki monthly regular medicine *{medicine_name}* ki refill date *{due_date}* ko due hai.

Dawai ka dose miss na karein! Humne aapka fresh batch *{pharmacy_name}* par ready rakha hai.

✅ Store se lene ke liye reply karein: *SHOP*
🛵 Home delivery chahiye toh reply karein: *DELIVERY*

📍 Store Contact: {pharmacy_phone}
Aapki achhi sehat ki shubh-kamnayein!`
  },
  {
    id: 'tpl-discount-loyalty',
    name: 'Loyalty Bonus & On-Time Refill Discount',
    category: 'discount',
    title: 'On-Time Refill Discount Offer (10% Off + Points)',
    badge: 'Loyalty Reward',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300',
    language: 'English',
    tone: 'Promotional',
    description: 'Incentivizes on-time refills with loyalty points and discounts.',
    tags: ['Loyalty', 'Discount', 'Retention'],
    templateBody: `🎉 *Exclusive Member Refill Reward for {patient_name}*

Your *{medicine_name}* is scheduled for refill on *{due_date}*.

As a valued *{pharmacy_name}* member:
🎁 Refill within 48 hours and get *Flat 10% OFF* + *50 Extra Loyalty Points*!
⭐ *Your Current Loyalty Balance:* {loyalty_points} Points

Show this WhatsApp memo at our counter or reply *APPLY OFFER* for delivery.
📞 Pharmacy Desk: {pharmacy_phone}`
  },
  {
    id: 'tpl-ayurvedic-wellness',
    name: 'Ayurvedic & Herbal Chronic Wellness Refill',
    category: 'ayurvedic',
    title: 'Herbal, Wellness & Immunity Refill',
    badge: 'Ayurvedic',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
    language: 'English',
    tone: 'Friendly',
    description: 'Tailored for chronic herbal supplements, Chyawanprash, and Ayurvedic wellness courses.',
    tags: ['Ayurveda', 'Herbal', 'Wellness'],
    templateBody: `🌿 *Ayurvedic Care & Wellness Update*

Dear {patient_name},

Your regular herbal course for *{medicine_name}* is due for replenishment on *{due_date}*.

Consistency is key to holistic vitality and long-term wellness. Fresh, authentic batches are available at *{pharmacy_name}*.

Reply *YES* to dispatch your order with free herbal lifestyle tips.
📞 Wellness Support: {pharmacy_phone}`
  }
];

// Helper: Calculate days difference between target date and today
export function getDaysDifference(targetDateStr: string, referenceDateStr = '2026-08-23'): number {
  try {
    const target = new Date(targetDateStr).getTime();
    const ref = new Date(referenceDateStr).getTime();
    if (isNaN(target)) return 0;
    return Math.ceil((target - ref) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// Helper: Build Refill Queue from Patients List
export function buildRefillQueue(patients: Patient[], referenceDateStr = '2026-08-23'): RefillQueueItem[] {
  const queue: RefillQueueItem[] = [];

  (patients || []).forEach(patient => {
    const meds = patient.chronicMedications || [];
    meds.forEach(med => {
      const dueDate = med.nextRefillDueDate || med.nextDueDate || '2026-08-23';
      const daysDiff = getDaysDifference(dueDate, referenceDateStr);
      
      const isOverdue = daysDiff < 0;
      const isDueToday = daysDiff === 0;
      const isDueSoon = daysDiff > 0 && daysDiff <= 7;

      let status: RefillQueueItem['status'] = 'pending';
      if (med.reminderStatus === 'sent') status = 'sent';
      else if (med.reminderStatus === 'refilled') status = 'refilled';
      else if (isOverdue) status = 'overdue';

      // Urgency scoring: lower adherence and higher overdue days increase urgency
      let urgencyScore = 50;
      if (isOverdue) urgencyScore += Math.min(40, Math.abs(daysDiff) * 5);
      if (patient.adherenceScore && patient.adherenceScore < 70) urgencyScore += 15;
      if (patient.tags?.includes('High-Risk') || patient.tags?.includes('Cardio') || patient.tags?.includes('Diabetic')) urgencyScore += 10;

      // Recommended Template selection
      let recommendedTemplateId = 'tpl-due-soon-standard';
      if (isOverdue) {
        recommendedTemplateId = 'tpl-overdue-urgent';
      } else if (meds.length > 2) {
        recommendedTemplateId = 'tpl-medsync-bundle';
      } else if (patient.preferredContact === 'WhatsApp' && patient.tags?.includes('Senior')) {
        recommendedTemplateId = 'tpl-home-delivery-upi';
      }

      queue.push({
        id: `${patient.id}_${med.id}`,
        patientId: patient.id,
        patient,
        medication: med,
        daysRemaining: daysDiff,
        isOverdue,
        isDueToday,
        isDueSoon,
        status,
        lastReminderSent: med.lastReminderSent,
        urgencyScore: Math.min(100, Math.max(0, urgencyScore)),
        recommendedTemplateId,
        selected: false
      });
    });
  });

  // Sort by urgency descending (overdue and high risk first)
  return queue.sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.daysRemaining - b.daysRemaining;
  });
}

// Variable Interpolation Engine
export function interpolateWhatsAppTemplate(
  templateBody: string,
  patient: Patient,
  medication: ChronicMedicationEntry,
  shopSettings?: ShopSettings | null,
  customNotes = ''
): string {
  const storeName = shopSettings?.shopName || shopSettings?.storeName || 'PharmPulse Pharmacy & Dispensary';
  const storePhone = shopSettings?.phone || shopSettings?.whatsappPhone || '+91 98765 43210';
  const storeAddress = shopSettings?.address || 'Shop #12, Market Square, City';
  const upiId = shopSettings?.upiId || 'pharmpulse@upi';
  const dlNumber = shopSettings?.dlNumber || shopSettings?.drugLicense || 'DL-20B/3891';

  const dueDate = medication.nextRefillDueDate || medication.nextDueDate || 'Upcoming';
  const daysDiff = getDaysDifference(dueDate);

  let daysRemainingText = 'Due in a few days';
  if (daysDiff < 0) {
    daysRemainingText = `Overdue by ${Math.abs(daysDiff)} days`;
  } else if (daysDiff === 0) {
    daysRemainingText = 'Due Today';
  } else if (daysDiff === 1) {
    daysRemainingText = 'Due Tomorrow';
  } else {
    daysRemainingText = `Due in ${daysDiff} days`;
  }

  // Multi-med list for MedSync templates
  const allMeds = patient.chronicMedications || [medication];
  const medListFormatted = allMeds.map((m, idx) => `  ${idx + 1}. *${m.medicineName}* (${m.dosageInstructions || 'As directed'})`).join('\n');

  let result = templateBody
    .replace(/{patient_name}/g, `${patient.firstName} ${patient.lastName}`.trim())
    .replace(/{first_name}/g, patient.firstName || 'Customer')
    .replace(/{medicine_name}/g, medication.medicineName || 'Prescribed Medicine')
    .replace(/{generic_salt}/g, medication.genericSalt || '')
    .replace(/{dosage_instructions}/g, medication.dosageInstructions || medication.dosage || '1 daily')
    .replace(/{days_supply}/g, String(medication.daysSupply || 30))
    .replace(/{due_date}/g, dueDate)
    .replace(/{days_remaining_text}/g, daysRemainingText)
    .replace(/{days_overdue}/g, String(Math.max(1, Math.abs(daysDiff))))
    .replace(/{pharmacy_name}/g, storeName)
    .replace(/{pharmacy_phone}/g, storePhone)
    .replace(/{pharmacy_address}/g, storeAddress)
    .replace(/{upi_id}/g, upiId)
    .replace(/{dl_number}/g, dlNumber)
    .replace(/{patient_address}/g, patient.address || 'Your registered address')
    .replace(/{rack_location}/g, 'Rack R-04 / Shelf B')
    .replace(/{doctor_name}/g, patient.doctorReference || 'Prescribing Physician')
    .replace(/{loyalty_points}/g, String(patient.loyaltyPoints || 120))
    .replace(/{adherence_score}/g, `${patient.adherenceScore || 85}%`)
    .replace(/{med_count}/g, String(allMeds.length))
    .replace(/{medicine_list}/g, medListFormatted);

  if (customNotes && customNotes.trim()) {
    result += `\n\n📝 *Special Pharmacist Note:* ${customNotes.trim()}`;
  }

  return result;
}

// WhatsApp URL Generator with standard phone cleaning
export function generateWhatsAppUrl(phone: string, message: string): string {
  // Strip all non-numeric characters except leading +
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // Default to Indian country code 91 if 10-digit mobile number provided
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Format Phone for Display
export function formatPhoneNumber(phone: string): string {
  if (!phone) return 'No Phone';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return phone;
}
