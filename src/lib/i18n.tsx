"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi";

const translations = {
  en: {
    // App header & Nav
    appName: "Our Family",
    appSubtitle: "Tap anyone to see documents",
    adminBtn: "Admin",
    searchPlaceholder: "Search by name (Mustafa, Akhtar, Aadhaar)...",
    langToggle: "हिंदी",

    // Navigation
    navTree: "Family Tree",
    navVault: "Document Vault",
    navPhotos: "Photos",
    navSearch: "Search",
    navAdmin: "Admin",

    // Section Titles
    grandparentsTitle: "Grandparents (Generation 1)",
    brothersTitle: "The 4 Brothers & Families (Eldest to Youngest)",
    childrenTitle: "Children & Grandchildren:",
    childrenHeading: "Children:",
    spouseLabel: "Spouse",
    wifeLabel: "Wife",
    leadBadge: "👑 Lead",
    inMemoryBadge: "🕊️ In Memory",
    tapForDocs: "Tap for docs →",
    docsBtn: "Docs",

    // Drawer / Modal
    docsDrawerTitle: "Documents & Records",
    noDocsYet: "No documents yet",
    noDocsPrompt: "Tap the green '+ Add Document(s)' button above to take a photo or upload!",
    addDocsBtn: "+ Add Document(s)",
    takePhotoOrChoose: "Take Photo or Choose Files",
    multiFilePrompt: "You can select multiple files / photos at once",
    chooseDocType: "Choose Document Type (1-Tap):",
    uploadBtn: "Upload Document(s)",
    uploadingBtn: "Uploading...",
    viewBtn: "View",
    downloadBtn: "Download",
    deleteBtn: "Delete",
    viewModalTitle: "Document Viewer",
    closeModal: "Close",
    tapToPreview: "Click to preview",

    // Categories
    catIdentity: "Identity",
    catMedical: "Medical",
    catFinancial: "Financial",
    catProperty: "Property",
    catEducation: "Education",
    catGeneral: "General",

    // Document types
    docAadhaar: "Aadhaar Card",
    docPan: "PAN Card",
    docVoter: "Voter ID",
    docPassportPhoto: "Passport Photo",
    docAbha: "ABHA Health Card",
    docMedical: "Medical Record",

    // Additional UI keys
    matchingMembers: "Matching Members",
    noNameFound: "No name found.",
    changePhoto: "Change Photo",
    addProfilePhoto: "+ Add Profile Photo",
    preview: "Preview",
    cancel: "Cancel",
    documentsCount: "Documents",
    spouse: "Spouse",
    childrenCount: "Children",

    // Google Drive & Admin
    gdriveTitle: "Google Drive Integration",
    testConnection: "Test Connection",
    importFromDrive: "Import from Drive",
    migrateFiles: "Migrate Local Files",
    saveSettings: "Save Settings",
  },
  hi: {
    // App header & Nav
    appName: "हमारा परिवार",
    appSubtitle: "दस्तावेज़ देखने के लिए किसी पर भी टैप करें",
    adminBtn: "व्यवस्थापक",
    searchPlaceholder: "नाम से खोजें (मुस्तफा, अख़्तर, आधार)...",
    langToggle: "English",

    // Navigation
    navTree: "वंशवृक्ष",
    navVault: "दस्तावेज़ वॉल्ट",
    navPhotos: "तस्वीरें",
    navSearch: "खोजें",
    navAdmin: "व्यवस्थापक",

    // Section Titles
    grandparentsTitle: "दादा-दादी / बुजुर्ग (पीढ़ी 1)",
    brothersTitle: "4 भाई और उनके परिवार (बड़े से छोटे)",
    childrenTitle: "बच्चे और पोते-पोतियां:",
    childrenHeading: "बच्चे:",
    spouseLabel: "जीवनसाथी",
    wifeLabel: "पत्नी",
    leadBadge: "👑 परिवार मुखिया",
    inMemoryBadge: "🕊️ स्मृति में",
    tapForDocs: "दस्तावेज़ देखें →",
    docsBtn: "दस्तावेज़",

    // Drawer / Modal
    docsDrawerTitle: "दस्तावेज़ और रिकॉर्ड्स",
    noDocsYet: "अभी कोई दस्तावेज़ नहीं है",
    noDocsPrompt: "फोटो खींचने या अपलोड करने के लिए ऊपर हरे '+ दस्तावेज़ जोड़ें' बटन पर टैप करें!",
    addDocsBtn: "+ दस्तावेज़ जोड़ें",
    takePhotoOrChoose: "फोटो खींचें या फाइल चुनें",
    multiFilePrompt: "आप एक साथ कई फाइलें या फोटो चुन सकते हैं",
    chooseDocType: "दस्तावेज़ का प्रकार चुनें (1-क्लिक):",
    uploadBtn: "दस्तावेज़ अपलोड करें",
    uploadingBtn: "अपलोड हो रहा है...",
    viewBtn: "देखें",
    downloadBtn: "डाउनलोड",
    deleteBtn: "हटाएं",
    viewModalTitle: "दस्तावेज़ दर्शक",
    closeModal: "बंद करें",
    tapToPreview: "देखने के लिए क्लिक करें",

    // Categories
    catIdentity: "पहचान पत्र",
    catMedical: "चिकित्सा / स्वास्थ्य",
    catFinancial: "वित्तीय",
    catProperty: "संपत्ति",
    catEducation: "शिक्षा",
    catGeneral: "सामान्य",

    // Document types
    docAadhaar: "आधार कार्ड",
    docPan: "पैन कार्ड",
    docVoter: "मतदाता पहचान पत्र",
    docPassportPhoto: "पासपोर्ट फोटो",
    docAbha: "आभा हेल्थ कार्ड",
    docMedical: "चिकित्सा रिकॉर्ड",

    // Additional UI keys
    matchingMembers: "मिलते-जुलते सदस्य",
    noNameFound: "कोई नाम नहीं मिला।",
    changePhoto: "फोटो बदलें",
    addProfilePhoto: "+ प्रोफाइल फोटो जोड़ें",
    preview: "झलक",
    cancel: "रद्द करें",
    documentsCount: "दस्तावेज़",
    spouse: "जीवनसाथी",
    childrenCount: "बच्चे",

    // Google Drive & Admin
    gdriveTitle: "गूगल ड्राइव एकीकरण",
    testConnection: "कनेक्शन जांचें",
    importFromDrive: "ड्राइव से आयात करें",
    migrateFiles: "स्थानीय फाइलें स्थानांतरित करें",
    saveSettings: "सेटिंग्स सहेजें",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => translations.en[key] || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("family_archive_lang") as Language | null;
      if (saved === "hi" || saved === "en") {
        setLangState(saved);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLangState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("family_archive_lang", lang);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "hi" : "en");
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
