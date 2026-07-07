import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      app: {
        title: "CivicGuard AI",
        subtitle: "Your intelligent gateway to city services and support"
      },
      nav: {
        services: "Public Services",
        report: "Report Issue",
        track: "Track Complaints",
        companion: "AI Companion"
      },
      services: {
        title: "Available Public Services",
        description: "Browse, request documentation, or get information simplified by our AI agent.",
        search_placeholder: "Search for services (e.g. driving license, business permit)...",
        simplify_btn: "Simplify Docs",
        loading: "Analyzing documents with AI..."
      },
      reporter: {
        title: "Report a Civic Issue",
        desc: "Help improve our city by reporting potholes, sanitation issues, or infrastructure problems.",
        form_title: "Issue Title",
        form_desc: "Detailed Description",
        form_category: "Category",
        form_lat: "Latitude",
        form_lng: "Longitude",
        get_location: "Get Current Location",
        getting_location: "Fetching Location...",
        location_error: "Could not fetch location. Please enter manually.",
        submit: "Submit Report",
        success: "Report submitted successfully!",
        error: "Failed to submit. Check inputs.",
        categories: {
          select: "-- Select a Category --",
          sanitation: "Sanitation & Garbage",
          infra: "Infrastructure (Roads, Potholes)",
          utility: "Water & Utilities",
          other: "Other"
        }
      },
      tracker: {
        title: "Citizen Complaints Status Tracker",
        empty: "No complaints filed under this session yet.",
        id: "Complaint ID",
        status: "Current Status",
        date: "Submitted On",
        details: "Updates Log",
        pending: "Pending",
        progress: "In Progress",
        resolved: "Resolved"
      },
      companion: {
        title: "Intelligent Civic Companion",
        welcome: "Hello! I am your AI companion. I can help simplify policies, recommend services, or help you structure your complaints. Ask me anything!",
        placeholder: "Type a query (e.g. How do I get a street light repaired?)...",
        send: "Send",
        confidence: "AI Confidence Score",
        sources: "Sources Used"
      }
    }
  },
  hi: {
    translation: {
      app: {
        title: "नागरिकगार्ड AI (CivicGuard)",
        subtitle: "शहर की सेवाओं और सहायता के लिए आपका बुद्धिमान प्रवेश द्वार"
      },
      nav: {
        services: "सार्वजनिक सेवाएँ",
        report: "समस्या दर्ज करें",
        track: "शिकायतें ट्रैक करें",
        companion: "AI साथी"
      },
      services: {
        title: "उपलब्ध सार्वजनिक सेवाएँ",
        description: "सेवाएं खोजें, दस्तावेजों का अनुरोध करें, या हमारे AI एजेंट से सरलीकृत जानकारी प्राप्त करें।",
        search_placeholder: "सेवाएं खोजें (जैसे ड्राइविंग लाइसेंस, व्यावसायिक परमिट)...",
        simplify_btn: "दस्तावेज़ सरल करें",
        loading: "AI द्वारा दस्तावेज़ों का विश्लेषण किया जा रहा है..."
      },
      reporter: {
        title: "नागरिक समस्या दर्ज करें",
        desc: "सड़कों के गड्ढों, स्वच्छता की समस्याओं या बुनियादी ढांचे की शिकायतों को दर्ज करके हमारे शहर को बेहतर बनाने में मदद करें।",
        form_title: "समस्या का शीर्षक",
        form_desc: "विस्तृत विवरण",
        form_category: "श्रेणी",
        form_lat: "अक्षांश (Latitude)",
        form_lng: "रेखांश (Longitude)",
        get_location: "वर्तमान स्थान प्राप्त करें",
        getting_location: "स्थान प्राप्त किया जा रहा है...",
        location_error: "स्थान प्राप्त करने में असमर्थ। कृपया मैन्युअल रूप से दर्ज करें।",
        submit: "शिकायत जमा करें",
        success: "शिकायत सफलतापूर्वक दर्ज कर ली गई है!",
        error: "शिकायत दर्ज करने में विफल। इनपुट जांचें।",
        categories: {
          select: "-- श्रेणी का चयन करें --",
          sanitation: "स्वच्छता और कचरा",
          infra: "बुनियादी ढांचा (सड़कें, गड्ढे)",
          utility: "पानी और उपयोगिताएँ",
          other: "अन्य"
        }
      },
      tracker: {
        title: "नागरिक शिकायत स्थिति ट्रैकर",
        empty: "इस सत्र के तहत अभी तक कोई शिकायत दर्ज नहीं की गई है।",
        id: "शिकायत आईडी",
        status: "वर्तमान स्थिति",
        date: "जमा करने की तिथि",
        details: "अपडेट लॉग",
        pending: "लंबित",
        progress: "प्रगति पर",
        resolved: "समाधान किया गया"
      },
      companion: {
        title: "बुद्धिमान नागरिक सहायक",
        welcome: "नमस्ते! मैं आपका AI साथी हूँ। मैं नीतियों को सरल बनाने, सेवाओं की सिफारिश करने, या आपकी शिकायतों को संरचित करने में मदद कर सकता हूँ। मुझसे कुछ भी पूछें!",
        placeholder: "कोई प्रश्न पूछें (जैसे मैं स्ट्रीट लाइट कैसे ठीक करवाऊं?)...",
        send: "भेजें",
        confidence: "AI विश्वसनीयता स्कोर",
        sources: "प्रयुक्त स्रोत"
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;
