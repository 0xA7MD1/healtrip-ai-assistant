import type {
  DoctorSearchResult,
  EmergencyInfo,
  RecommendationResult,
  UrgencyAssessment,
} from "@/lib/agent-contracts";

/**
 * Sample tool results for building and previewing the chat UI without a model or API key.
 * Generated from the real catalog (data/raw/seed-data.json), so they match what the agent
 * returns. Doctors are synthetic; hospitals are real.
 */

export const assessRoutine: UrgencyAssessment = {
  urgency: "routine",
  next_step: "book_specialist",
  suggested_specialty: "cardiology",
  reasons: ["red_flags_screened_negative", "mild_symptoms"],
};

export const searchRiyadhCardiology: DoctorSearchResult = {
  "doctors": [
    {
      "id": "doc_003",
      "isSynthetic": true,
      "name": {
        "en": "Dr. Mohammed Al-Otaibi",
        "ar": "د. محمد العتيبي"
      },
      "gender": "male",
      "title": "specialist",
      "specialty": {
        "code": "cardiology",
        "en": "Cardiology",
        "ar": "أمراض القلب"
      },
      "hospital": {
        "id": "hosp_riyadh_dallah",
        "name": {
          "en": "Dallah Hospital Al Nakheel",
          "ar": "مستشفى دلة النخيل"
        },
        "city": {
          "code": "riyadh",
          "en": "Riyadh",
          "ar": "الرياض",
          "countryCode": "SA"
        },
        "hasEmergency24x7": true,
        "accreditations": [
          "GHA",
          "JCI",
          "CBAHI"
        ]
      },
      "yearsExperience": 9,
      "languages": [
        "ar"
      ],
      "fee": {
        "amount": 400,
        "currency": "SAR"
      },
      "offersSecondOpinion": false,
      "offersTelemedicine": true,
      "nextAvailableInDays": 2
    },
    {
      "id": "doc_001",
      "isSynthetic": true,
      "name": {
        "en": "Dr. Ahmed Al-Rashid",
        "ar": "د. أحمد الراشد"
      },
      "gender": "male",
      "title": "consultant",
      "specialty": {
        "code": "cardiology",
        "en": "Cardiology",
        "ar": "أمراض القلب"
      },
      "hospital": {
        "id": "hosp_riyadh_kfshrc",
        "name": {
          "en": "King Faisal Specialist Hospital and Research Centre",
          "ar": "مستشفى الملك فيصل التخصصي ومركز الأبحاث"
        },
        "city": {
          "code": "riyadh",
          "en": "Riyadh",
          "ar": "الرياض",
          "countryCode": "SA"
        },
        "hasEmergency24x7": true,
        "accreditations": [
          "JCI",
          "CBAHI",
          "Magnet"
        ]
      },
      "yearsExperience": 18,
      "languages": [
        "ar",
        "en"
      ],
      "fee": {
        "amount": 650,
        "currency": "SAR"
      },
      "offersSecondOpinion": true,
      "offersTelemedicine": true,
      "nextAvailableInDays": 3
    },
    {
      "id": "doc_002",
      "isSynthetic": true,
      "name": {
        "en": "Dr. Fatima Al-Zahrani",
        "ar": "د. فاطمة الزهراني"
      },
      "gender": "female",
      "title": "consultant",
      "specialty": {
        "code": "cardiology",
        "en": "Cardiology",
        "ar": "أمراض القلب"
      },
      "hospital": {
        "id": "hosp_riyadh_dsh",
        "name": {
          "en": "Dr. Sulaiman Al Habib Hospital",
          "ar": "مستشفى د. سليمان الحبيب"
        },
        "city": {
          "code": "riyadh",
          "en": "Riyadh",
          "ar": "الرياض",
          "countryCode": "SA"
        },
        "hasEmergency24x7": true,
        "accreditations": [
          "JCI",
          "CBAHI"
        ]
      },
      "yearsExperience": 15,
      "languages": [
        "ar",
        "en"
      ],
      "fee": {
        "amount": 550,
        "currency": "SAR"
      },
      "offersSecondOpinion": true,
      "offersTelemedicine": false,
      "nextAvailableInDays": 7
    }
  ],
  "searchedCities": [
    {
      "code": "riyadh",
      "en": "Riyadh",
      "ar": "الرياض",
      "countryCode": "SA"
    }
  ],
  "note": "ok"
};

/** Riyadh cardiology: three matches in the patient's city. */
export const recommendationOk: RecommendationResult = {
  status: "ok",
  urgency: "routine",
  nextStep: "book_specialist",
  specialty: {
  "code": "cardiology",
  "en": "Cardiology",
  "ar": "أمراض القلب"
},
  doctors: searchRiyadhCardiology.doctors,
  searchedCities: searchRiyadhCardiology.searchedCities,
  expandedToNearby: false,
};

/** Al Khobar has no cardiologist, so the search expanded to Dammam. */
export const recommendationExpanded: RecommendationResult = {
  status: "ok",
  urgency: "urgent",
  nextStep: "see_doctor_within_24h",
  specialty: {
  "code": "cardiology",
  "en": "Cardiology",
  "ar": "أمراض القلب"
},
  doctors: [
  {
    "id": "doc_006",
    "isSynthetic": true,
    "name": {
      "en": "Dr. Omar Al-Shehri",
      "ar": "د. عمر الشهري"
    },
    "gender": "male",
    "title": "consultant",
    "specialty": {
      "code": "cardiology",
      "en": "Cardiology",
      "ar": "أمراض القلب"
    },
    "hospital": {
      "id": "hosp_dammam_mouwasat",
      "name": {
        "en": "Mouwasat Hospital",
        "ar": "مستشفى المواساة"
      },
      "city": {
        "code": "dammam",
        "en": "Dammam",
        "ar": "الدمام",
        "countryCode": "SA"
      },
      "hasEmergency24x7": true,
      "accreditations": [
        "CBAHI",
        "JCI"
      ]
    },
    "yearsExperience": 16,
    "languages": [
      "ar"
    ],
    "fee": {
      "amount": 600,
      "currency": "SAR"
    },
    "offersSecondOpinion": false,
    "offersTelemedicine": true,
    "nextAvailableInDays": 4
  }
],
  searchedCities: [
  {
    "code": "al-khobar",
    "en": "Al Khobar",
    "ar": "الخبر",
    "countryCode": "SA"
  },
  {
    "code": "dammam",
    "en": "Dammam",
    "ar": "الدمام",
    "countryCode": "SA"
  }
],
  expandedToNearby: true,
};

/** No dermatologist in Dammam in the catalog. */
export const recommendationNoMatch: RecommendationResult = {
  status: "no_match",
  urgency: "routine",
  nextStep: "book_specialist",
  specialty: {
  "code": "dermatology",
  "en": "Dermatology",
  "ar": "الجلدية"
},
  searchedCities: [
  {
    "code": "dammam",
    "en": "Dammam",
    "ar": "الدمام",
    "countryCode": "SA"
  }
],
};

/** Riyadh emergency numbers and verified 24/7 emergency departments. */
export const emergencyRiyadh: EmergencyInfo = {
  "country": "SA",
  "numbers": [
    {
      "number": "997",
      "service": "ambulance",
      "name": {
        "en": "Saudi Red Crescent Ambulance",
        "ar": "الهلال الأحمر السعودي - الإسعاف"
      }
    },
    {
      "number": "911",
      "service": "unified_emergency",
      "name": {
        "en": "Unified Emergency Number",
        "ar": "الطوارئ الموحد"
      }
    }
  ],
  "facilities": [
    {
      "id": "hosp_riyadh_dallah",
      "name": {
        "en": "Dallah Hospital Al Nakheel",
        "ar": "مستشفى دلة النخيل"
      },
      "city": {
        "code": "riyadh",
        "en": "Riyadh",
        "ar": "الرياض",
        "countryCode": "SA"
      },
      "website": "https://www.dallah-hospital.com"
    },
    {
      "id": "hosp_riyadh_dsh",
      "name": {
        "en": "Dr. Sulaiman Al Habib Hospital",
        "ar": "مستشفى د. سليمان الحبيب"
      },
      "city": {
        "code": "riyadh",
        "en": "Riyadh",
        "ar": "الرياض",
        "countryCode": "SA"
      },
      "website": "https://hmg.com"
    },
    {
      "id": "hosp_riyadh_kfshrc",
      "name": {
        "en": "King Faisal Specialist Hospital and Research Centre",
        "ar": "مستشفى الملك فيصل التخصصي ومركز الأبحاث"
      },
      "city": {
        "code": "riyadh",
        "en": "Riyadh",
        "ar": "الرياض",
        "countryCode": "SA"
      },
      "website": "https://www.kfshrc.edu.sa"
    }
  ]
};
