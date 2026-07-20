import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      // Navbar & Tabs
      home: "Home",
      myBookings: "My Bookings",
      adminPortal: "Admin Portal",
      logout: "Logout",
      login: "Login",
      register: "Register",
      providerDashboard: "Provider Dashboard",

      // Customer Discovery Hero
      heroTitle: "Local Services, Instantly Verified.",
      heroSubtitle: "Find, chat with, and book certified local service professionals in your neighborhood within minutes.",
      aiButton: "Try AI Service Assistant",

      // Search filters
      searchRadius: "Search Radius",
      radius5: "Within 5 KM",
      radius10: "Within 10 KM",
      radius20: "Within 20 KM",
      radius50: "Within 50 KM",
      searchBtn: "Search Providers",
      refreshLocBtn: "Refresh Location",
      activeCoords: "Active Coordinates",

      // Categories
      browseCategories: "Browse Service Categories",
      selectCategoryText: "Select a category to filter local service professionals",
      allServices: "All Services",
      electrician: "Electrician",
      plumber: "Plumber",
      mechanic: "Mechanic",
      carpenter: "Carpenter",
      painter: "Painter",
      acRepair: "AC Repair",
      applianceRepair: "Appliance Repair",
      cleaningService: "Cleaning Service",

      // Providers list
      nearbyProviders: "Nearby Providers",
      showingProvidersText: "Showing providers based on selected radius and category filters",
      onlineStatus: "Online",
      offlineStatus: "Offline",
      verifiedBadge: "Verified",
      ratingLabel: "Rating",
      experienceLabel: "{{count}} Yrs Exp",
      viewProfileBtn: "View Profile & Book",
      noProvidersMsg: "No nearby service providers matched your search parameters. Try expanding your search radius.",

      // My Bookings
      bookingsTitle: "Your Service Bookings",
      bookingsSubtitle: "Manage your ongoing service assignments, tracks, payments and chat details.",
      statusPending: "Pending Approval",
      statusAccepted: "Partner Assigned",
      statusOnTheWay: "Partner On The Way",
      statusArrived: "Partner Arrived",
      statusStarted: "Service In Progress",
      statusCompleted: "Completed",
      statusCancelled: "Cancelled",
      amountLabel: "Amount Paid",
      dateLabel: "Service Date",
      trackPartnerBtn: "Track Service Partner",
      chatPartnerBtn: "Chat with Partner",
      disputeBtn: "File Dispute"
    }
  },
  ta: {
    translation: {
      // Navbar & Tabs
      home: "முகப்பு",
      myBookings: "எனது பதிவுகள்",
      adminPortal: "நிர்வாகி போர்டல்",
      logout: "வெளியேறு",
      login: "உள்நுழை",
      register: "பதிவு செய்",
      providerDashboard: "வழங்குநர் டாஷ்போர்டு",

      // Customer Discovery Hero
      heroTitle: "உள்ளூர் சேவைகள், உடனுக்குடன் சரிபார்க்கப்பட்டது.",
      heroSubtitle: "உங்கள் அருகிலுள்ள சான்றளிக்கப்பட்ட சேவை நிபுணர்களை சில நிமிடங்களில் கண்டறிந்து, அரட்டையடித்து, முன்பதிவு செய்யுங்கள்.",
      aiButton: "AI சேவை உதவியாளர்",

      // Search filters
      searchRadius: "தேடல் ஆரம்",
      radius5: "5 கி.மீ க்குள்",
      radius10: "10 கி.மீ க்குள்",
      radius20: "20 கி.மீ க்குள்",
      radius50: "50 கி.மீ க்குள்",
      searchBtn: "நிபுணர்களை தேடு",
      refreshLocBtn: "இருப்பிடத்தை புதுப்பி",
      activeCoords: "செயலில் உள்ள ஆயத்தொலைவுகள்",

      // Categories
      browseCategories: "சேவை பிரிவுகளை உலாவுக",
      selectCategoryText: "உள்ளூர் சேவை நிபுணர்களை வடிகட்ட ஒரு பிரிவைத் தேர்ந்தெடுக்கவும்",
      allServices: "அனைத்து சேவைகள்",
      electrician: "மின்சார வல்லுநர்",
      plumber: "குழாய் பழுதுபார்ப்பவர்",
      mechanic: "இயந்திர வல்லுநர்",
      carpenter: "தச்சர்",
      painter: "வண்ணப்பூச்சு செய்பவர்",
      acRepair: "ஏசி பழுதுபார்ப்பு",
      applianceRepair: "சாதன பழுதுபார்ப்பு",
      cleaningService: "சுத்திகரிப்பு சேவை",

      // Providers list
      nearbyProviders: "அருகிலுள்ள சேவை வழங்குநர்கள்",
      showingProvidersText: "தேர்ந்தெடுக்கப்பட்ட ஆரம் மற்றும் பிரிவு வடிகட்டிகளின் அடிப்படையில் வழங்குநர்களைக் காட்டுகிறது",
      onlineStatus: "செயலில் உள்ளார்",
      offlineStatus: "செயலில் இல்லை",
      verifiedBadge: "சரிபார்க்கப்பட்டது",
      ratingLabel: "மதிப்பீடு",
      experienceLabel: "{{count}} வருட அனுபவம்",
      viewProfileBtn: "சுயவிவரம் பார்த்து முன்பதிவு செய்க",
      noProvidersMsg: "உங்கள் தேடல் அளவுகோல்களுடன் எந்த சேவை வழங்குநர்களும் பொருந்தவில்லை. தேடல் ஆரத்தை விரிவுபடுத்த முயற்சிக்கவும்.",

      // My Bookings
      bookingsTitle: "உங்கள் சேவை முன்பதிவுகள்",
      bookingsSubtitle: "உங்கள் தற்போதைய முன்பதிவு பணிகள், வரைபடங்கள், கட்டணங்கள் மற்றும் அரட்டை விவரங்களை நிர்வகிக்கவும்.",
      statusPending: "ஒப்புதலுக்காக காத்திருக்கிறது",
      statusAccepted: "நிபுணர் நியமிக்கப்பட்டுள்ளார்",
      statusOnTheWay: "நிபுணர் கிளம்பிவிட்டார்",
      statusArrived: "நிபுணர் வந்துவிட்டார்",
      statusStarted: "வேலை நடந்து கொண்டிருக்கிறது",
      statusCompleted: "முடிந்தது",
      statusCancelled: "ரத்து செய்யப்பட்டது",
      amountLabel: "செலுத்தப்பட்ட தொகை",
      dateLabel: "சேவை தேதி",
      trackPartnerBtn: "வழங்குநரை கண்காணிக்கவும்",
      chatPartnerBtn: "அரட்டையடிக்கவும்",
      disputeBtn: "புகார் அளிக்கவும்"
    }
  }
};

const savedLang = localStorage.getItem("language") || "en";

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLang,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
