const masterHoursList = [
    "06:00 - 07:00", "07:00 - 08:00", "08:00 - 09:00", "09:00 - 10:00",
    "10:00 - 11:00", "11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00",
    "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00",
    "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", "21:00 - 22:00",
    "22:00 - 23:00", "23:00 - 00:00",
    "00:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00",
    "04:00 - 05:00", "05:00 - 06:00"
];

const dayNamesMap = ["PAZAR", "PAZARTESİ", "SALI", "ÇARŞAMBA", "PERŞEMBE", "CUMA", "CUMARTESİ"];

// 6 Adet Izole Multi-Tenant Saha Veri Yapisi
const fieldsData = {
    "final": {
        name: "Final Halısaha",
        address: "Hacilar Meydani, Merkez, Amasya",
        coordinates: "40.66015930710386, 35.79187401098129",
        phone: "03582120001",
        password: "final123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "12:00",
        closingHour: "23:00",
        aboneHours: [],
        disabledHours: ["13:00 - 14:00"],
        pitchCount: 2,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    },
    "arena": {
        name: "Arena Halısaha",
        address: "Akbilek, Merkez, Amasya",
        coordinates: "40.69411694565239, 35.8179294637939",
        phone: "05051234562",
        password: "arena123",
        isClosed: false,
        hasService: "Servis: Yok",
        openingHour: "10:00",
        closingHour: "22:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    },
    "ciragan": {
        name: "Çırağan Halısaha",
        address: "Seyhcui, Merkez, Amasya",
        coordinates: "40.6528721257016, 35.79966936221245",
        phone: "05051234563",
        password: "ciragan123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "12:00",
        closingHour: "23:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    },
    "olimpiyat": {
        name: "Olimpiyat Halısaha",
        address: "Fatih, Merkez, Amasya",
        coordinates: "40.68148422172459, 35.82695848316526",
        phone: "05051234564",
        password: "olimpiyat123",
        isClosed: false,
        hasService: "Servis: Yok",
        openingHour: "08:00",
        closingHour: "23:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    },
    "sporium05": {
        name: "Sporium 05 Halısaha",
        address: "Kursunlu, Merkez, Amasya",
        coordinates: "40.61455229320892, 35.825450789697356",
        phone: "05051234565",
        password: "sporium123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "14:00",
        closingHour: "23:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    },
    "ziyaret": {
        name: "Ziyaret Halısaha",
        address: "Ziyaret Beldesi, Amasya",
        coordinates: "40.688429882215665, 35.86403902395539",
        phone: "05051234566",
        password: "ziyaret123",
        isClosed: false,
        hasService: "Servis: Var",
        openingHour: "15:00",
        closingHour: "00:00",
        aboneHours: [],
        disabledHours: [],
        pitchCount: 1,
        morningPrice: "2500",
        eveningPrice: "2800",
        pricing: "2500/2800",
        refreshments: "",
        cleats: "Krampon Kiralanmaz",
        shower: "Duş Yok",
        market: "Market Yok"
    }
};

// Durum Yonetim Havuzu
let loggedInUser = null;
let currentUser = null;
let currentSelectedFieldKey = "";
let currentSelectedPitchNumber = null;
let currentSelectedHourBtn = null;
let currentAdminSelectedHour = null;
let isBusinessLoggedIn = false;
let currentBusinessFieldKey = "";
let pitchObjectsList = [];
let userReservations = [];
let forumPosts = [];
let dailyHoursList = [];
let currentPitchDailyHours = [];
let pendingBookingData = null;
let userBlacklistedFields = [];

// =======================================================
// SAYFA YÜKLEME
// =======================================================
window.onload = async function() {
    await loadPitchSettingsFromDatabase();
    await initWeatherWidget();
    initDateDropdowns();
    await initPitchSelector();
    await loadDailyHoursList();
    renderFieldsGrid();
    initMatchSeekerForm();
    initTeamSeekerForm();
    updateLoginUIVisibility();

    await loadReservationsFromServer();
    await loadForumPostsFromServer();
    await loadMatchSeekers();
    await loadTeamSeekers();

    // Rezervasyonlar zaten loadReservationsFromServer() ile yüklendi (cancelled hariç)
    // Telefon maskelerini bağlama
    ['forumPhone', 'matchPhone', 'regPhone', 'subPhoneInput', 'profilePhoneInput', 'businessSettingPhone', 'completeProfilePhone', 'blacklistPhoneInput'].forEach(id => {
        const input = document.getElementById(id);
        if (input) applyPhoneMask(input);
    });

    // OAuth ve Yönlendirme Kontrolleri
    const urlParams = new URLSearchParams(window.location.search);
    const oauthError = urlParams.get('error');
    const needsPhone = urlParams.get('needs_phone');
    const oauthToken = urlParams.get('token');
    const oauthUserJson = urlParams.get('user');

    if (oauthError) {
        if (oauthError === 'globally_banned') {
            alert("Hesabınız suistimal nedeniyle kalıcı olarak askıya alınmıştır!");
        } else if (oauthError === 'oauth_registration_failed') {
            alert("Sosyal giriş ile kayıt esnasında hata oluştu!");
        } else {
            alert("Sosyal giriş doğrulaması başarısız oldu!");
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (needsPhone === 'true') {
        const completeUserId = urlParams.get('userId');
        const completeEmail = urlParams.get('email');
        document.getElementById('completeProfileUserId').value = completeUserId || '';
        openModal('socialCompleteProfileModal');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthToken && oauthUserJson) {
        try {
            const userObj = JSON.parse(decodeURIComponent(oauthUserJson));
            localStorage.setItem('userToken', oauthToken);
            loggedInUser = userObj.name.toLocaleUpperCase('tr-TR');
            currentUser = userObj;
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            alert(`Hoş geldiniz, ${userObj.name || 'Oyuncu'}! Giriş yapıldı.`);
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
            console.error("OAuth user parse error:", e);
        }
    }

    if (currentUser) {
        await loadUserBlacklist();
        renderFieldsGrid();
    }

    document.getElementById('confirmYesBtn').onclick = () => closeConfirmModal(true);
    document.getElementById('confirmNoBtn').onclick = () => closeConfirmModal(false);

    document.getElementById('bookingConfirmYesBtn').onclick = () => closeBookingConfirmModal(true);
    document.getElementById('bookingConfirmNoBtn').onclick = () => closeBookingConfirmModal(false);
};

// =======================================================
// KULLANICI GİRİŞ/ÇIKIŞ
// =======================================================
