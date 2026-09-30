"use client";

import type { NextStep, Urgency } from "./agent-contracts";
import { useLocale, type Locale } from "./locale";

/**
 * UI strings. Catalog values (doctor, hospital, city and specialty names) are bilingual in
 * the data itself and are picked with `localized()`; this file only holds interface copy.
 */

const ar = {
  languageToggle: "English",
  languageToggleLabel: "Switch to English",
  newChat: "محادثة جديدة",

  welcomeTitle: "كيف أقدر أساعدك اليوم؟",
  welcomeSubtitle: "اوصف حالتك، وأساعدك تعرف خطوتك الجاية وأرشّح لك أطباء موثّقين.",
  quickPrompts: [
    { icon: "heart", title: "عندي ألم في الصدر", prompt: "عندي ألم في الصدر" },
    { icon: "stethoscope", title: "أبي طبيب قلب في الرياض", prompt: "أبي طبيب قلب في الرياض" },
    { icon: "second-opinion", title: "أبي رأي طبي ثاني", prompt: "عندي تشخيص وأبي رأي طبي ثاني" },
    { icon: "baby", title: "طفلي عنده حرارة", prompt: "طفلي عمره 4 سنوات وعنده حرارة من يومين" },
  ],

  composerPlaceholder: "اكتب أعراضك أو اسأل عن طبيب…",
  composerLabel: "اكتب رسالتك",
  disclaimer: "المساعد ما يقدّم تشخيصاً طبياً. في الطوارئ اتصل على 997.",
  send: "إرسال",
  stop: "إيقاف",
  copy: "نسخ",
  refresh: "إعادة التوليد",
  edit: "تعديل",
  cancel: "إلغاء",
  update: "تحديث",
  scrollToBottom: "للأسفل",
  previous: "السابق",
  next: "التالي",
  working: "يفكّر…",

  errors: {
    model_unavailable: "المساعد غير متاح مؤقتاً. حاول بعد دقيقة.",
    rate_limited: "أرسلت رسائل كثيرة بسرعة. انتظر دقيقة وحاول مرة ثانية.",
    message_too_long: "الرسالة طويلة جداً. اختصرها وحاول مرة ثانية.",
    history_too_long: "المحادثة طويلة جداً. ابدأ محادثة جديدة.",
    generic: "صار خطأ غير متوقع. حاول مرة ثانية.",
  } as Record<string, string>,

  reasoning: "التفكير",
  toolSteps: (n: number) => (n === 1 ? "خطوة تحليل واحدة" : `${n} خطوات تحليل`),
  toolFailed: "تعذّر إكمال هذه الخطوة",
  assessing: "أقيّم مدى الاستعجال…",
  assessed: "تقييم الاستعجال",
  searching: "أبحث عن أطباء…",
  searched: (specialty: string, cities: string, n: number) =>
    `بحثت عن ${specialty}${cities ? ` في ${cities}` : ""}: ${n === 0 ? "لا نتائج" : n === 1 ? "نتيجة واحدة" : `${n} نتائج`}`,
  unknownCity: "المدينة غير مدعومة حالياً",
  preparing: "أجهّز التوصية…",
  findingEmergency: "أجيب أرقام الطوارئ…",

  urgency: {
    emergency: "طارئ",
    needs_screening: "يحتاج أسئلة إضافية",
    urgent: "عاجل",
    routine: "غير عاجل",
  } satisfies Record<Urgency, string>,
  nextStep: {
    go_to_er: "توجّه للطوارئ الآن",
    ask_red_flag_questions: "أسئلة عن علامات الخطر",
    see_doctor_within_24h: "راجع طبيب خلال 24 ساعة",
    book_specialist: "احجز موعد مع أخصائي",
    seek_second_opinion: "اطلب رأي طبي ثاني",
  } satisfies Record<NextStep, string>,

  recommendedDoctors: (specialty: string) => `أطباء ${specialty} المقترحون`,
  fromCatalog: "أطباء موثّقون",
  expandedNote: (city: string, nearby: string) => `ما لقينا نتيجة في ${city}، فعرضنا لك أطباء في ${nearby}.`,
  noMatchTitle: (specialty: string, cities: string) => `ما فيه أطباء ${specialty} في ${cities} حالياً`,
  noMatchDescription: "جرّب استشارة عن بعد، أو ابحث في مدينة قريبة.",
  everywhere: "كل المدن",

  consultant: "استشاري",
  specialist: "أخصائي",
  yearsExperience: (n: number) => `${n} سنة خبرة`,
  availableToday: "متاح اليوم",
  availableTomorrow: "متاح بكرة",
  availableIn: (n: number) => `متاح بعد ${n} أيام`,
  consultationFee: "الكشفية",
  speaks: "يتكلم",
  secondOpinion: "رأي ثاني",
  telemedicine: "استشارة عن بعد",
  sampleProfile: "ملف تجريبي",
  sampleProfileHint: "الأطباء في هذا النموذج بيانات تجريبية، والمستشفيات حقيقية.",
  er24: "طوارئ 24/7",

  emergencyTitle: "قد تكون حالة طارئة",
  emergencyBody: "اتصل بالإسعاف الآن أو توجّه لأقرب قسم طوارئ. لا تقُد السيارة بنفسك.",
  call: (number: string) => `اتصل ${number}`,
  emergencyFacilities: "مستشفيات فيها طوارئ 24/7 موثّقة",
  website: "الموقع",

  followUps: {
    telemedicine: "أبي أطباء يقدّمون استشارة عن بعد",
    secondOpinion: "أبي رأي طبي ثاني بدلاً من ذلك",
    otherCity: "ابحث لي في مدينة ثانية",
    noRedFlags: "لا، ما عندي أي منها",
    breathless: "إيه، عندي ضيق في التنفس",
  },
};

export type Dictionary = typeof ar;

const en: Dictionary = {
  languageToggle: "العربية",
  languageToggleLabel: "التبديل إلى العربية",
  newChat: "New chat",

  welcomeTitle: "How can I help you today?",
  welcomeSubtitle: "Describe your situation. I'll help you decide your next step and suggest verified doctors.",
  quickPrompts: [
    { icon: "heart", title: "I have chest pain", prompt: "I have chest pain" },
    { icon: "stethoscope", title: "Find a cardiologist in Riyadh", prompt: "I need a cardiologist in Riyadh" },
    { icon: "second-opinion", title: "Get a second opinion", prompt: "I have a diagnosis and want a second opinion" },
    { icon: "baby", title: "My child has a fever", prompt: "My 4-year-old has had a fever for two days" },
  ],

  composerPlaceholder: "Describe your symptoms or ask for a doctor…",
  composerLabel: "Message",
  disclaimer: "This assistant does not give a medical diagnosis. In an emergency call 997.",
  send: "Send",
  stop: "Stop",
  copy: "Copy",
  refresh: "Regenerate",
  edit: "Edit",
  cancel: "Cancel",
  update: "Update",
  scrollToBottom: "Scroll to bottom",
  previous: "Previous",
  next: "Next",
  working: "Thinking…",

  errors: {
    model_unavailable: "The assistant is temporarily unavailable. Please try again in a minute.",
    rate_limited: "You're sending messages too quickly. Please wait a minute and try again.",
    message_too_long: "That message is too long. Please shorten it and try again.",
    history_too_long: "This conversation is too long. Please start a new chat.",
    generic: "Something went wrong. Please try again.",
  },

  reasoning: "Thinking",
  toolSteps: (n) => (n === 1 ? "1 analysis step" : `${n} analysis steps`),
  toolFailed: "This step could not be completed",
  assessing: "Assessing urgency…",
  assessed: "Urgency assessment",
  searching: "Searching for doctors…",
  searched: (specialty, cities, n) =>
    `Searched ${specialty}${cities ? ` in ${cities}` : ""}: ${n === 0 ? "no results" : n === 1 ? "1 result" : `${n} results`}`,
  unknownCity: "City not supported right now",
  preparing: "Preparing the recommendation…",
  findingEmergency: "Getting emergency numbers…",

  urgency: {
    emergency: "Emergency",
    needs_screening: "Needs more questions",
    urgent: "Urgent",
    routine: "Not urgent",
  },
  nextStep: {
    go_to_er: "Go to the ER now",
    ask_red_flag_questions: "Red-flag questions",
    see_doctor_within_24h: "See a doctor within 24 hours",
    book_specialist: "Book a specialist",
    seek_second_opinion: "Get a second opinion",
  },

  recommendedDoctors: (specialty) => `Recommended ${specialty} doctors`,
  fromCatalog: "Verified doctors",
  expandedNote: (city, nearby) => `No match in ${city}, so these doctors are in ${nearby}.`,
  noMatchTitle: (specialty, cities) => `No ${specialty} doctors in ${cities} right now`,
  noMatchDescription: "Try a telemedicine consultation or search a nearby city.",
  everywhere: "all cities",

  consultant: "Consultant",
  specialist: "Specialist",
  yearsExperience: (n) => `${n} years' experience`,
  availableToday: "Available today",
  availableTomorrow: "Available tomorrow",
  availableIn: (n) => `Available in ${n} days`,
  consultationFee: "Consultation",
  speaks: "Speaks",
  secondOpinion: "Second opinion",
  telemedicine: "Telemedicine",
  sampleProfile: "Sample profile",
  sampleProfileHint: "Doctors in this prototype are sample profiles; hospitals are real.",
  er24: "24/7 ER",

  emergencyTitle: "This may be an emergency",
  emergencyBody: "Call an ambulance now or go to the nearest emergency department. Do not drive yourself.",
  call: (number) => `Call ${number}`,
  emergencyFacilities: "Hospitals with a verified 24/7 emergency department",
  website: "Website",

  followUps: {
    telemedicine: "Show doctors who offer telemedicine",
    secondOpinion: "I'd like a second opinion instead",
    otherCity: "Search in another city",
    noRedFlags: "No, I don't have any of those",
    breathless: "Yes, I'm short of breath",
  },
};

export const DICTIONARIES: Record<Locale, Dictionary> = { ar, en };

export function useT(): Dictionary {
  return DICTIONARIES[useLocale()];
}

/** Number formatting with Latin digits in both languages, so fees and phone numbers read the same. */
export function intlLocale(locale: Locale): string {
  return locale === "ar" ? "ar-SA-u-nu-latn" : "en-US";
}
