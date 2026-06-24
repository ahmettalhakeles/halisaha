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
function handleUserLogout() {
    loggedInUser = null;
    currentUser = null;
    userBlacklistedFields = [];
    localStorage.removeItem('userToken');
    renderFieldsGrid();
    updateLoginUIVisibility();
    alert("ÇIKIŞ YAPILDI. Tekrar giriş yapmak için lütfen giriş yapın.");
    if (currentSelectedFieldKey) onDateOrFieldChange();
}

async function handleUserRegister(event) {
    event.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass = document.getElementById('regPassword').value;

    if (!name || !phone || !email || !pass) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, email, password: pass })
        });
        let result;
        try { result = await response.json(); } catch (jsonError) {
            console.error("JSON Ayrıştırma Hatası:", jsonError);
            alert("Sunucu yanıtı okunamadı! (HTTP " + response.status + ")");
            return;
        }

        if (result.success) {
            if (result.unverified) {
                document.getElementById('otpUserId').value = result.userId || '';
                document.getElementById('otpEmail').value = result.email || '';
                closeModal('registerModal');
                openModal('otpVerificationModal');
                alert(result.message);
            } else {
                currentUser = result.user || null;
                loggedInUser = (result.user && result.user.name) ? result.user.name.toLocaleUpperCase('tr-TR') : 'MÜŞTERİ';
                await loadUserBlacklist();
                renderFieldsGrid();
                updateLoginUIVisibility();
                closeModal('registerModal');
                document.getElementById('registerForm').reset();
                if (currentSelectedFieldKey) onDateOrFieldChange();
                fillFormsFromProfile();
                if (result.message) alert(result.message);
            }
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Hata:", error);
        alert("Sunucuya bağlanılamadı! Lütfen server.js çalıştığından ve MySQL'in açık olduğundan emin olun.");
    }
}

async function handleUserLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;

    if (!email || !pass) {
        alert("LÜTFEN ALANLARI DOLDURUNUZ.");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            loggedInUser = result.user.name.toLocaleUpperCase('tr-TR');
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            closeModal('loginModal');
            if (currentSelectedFieldKey) onDateOrFieldChange();
            fillFormsFromProfile();
        } else {
            if (result.unverified) {
                document.getElementById('otpUserId').value = result.userId || '';
                document.getElementById('otpEmail').value = result.email || '';
                closeModal('loginModal');
                openModal('otpVerificationModal');
            }
            alert("HATA: " + result.message);
        }
    } catch (error) {
        alert("SUNUCUYA BAĞLANILAMADI! node server.js çalışıyor mu?");
    }
}

// =======================================================
// İŞLETME GİRİŞ & ÇIKIŞ
// =======================================================
function openBusinessLogin() {
    openModal('businessLoginModal');
}

function switchBusinessTab(tabName) {
    document.querySelectorAll('.tab-content-zone').forEach(zone => {
        zone.style.display = 'none';
    });
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    document.querySelectorAll('.business-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    if (tabName === 'debts') {
        loadBusinessDebts('all');
    } else if (tabName === 'comments') {
        loadBusinessComments();
    } else if (tabName === 'blacklist') {
        loadBusinessBlacklist();
    }
}

async function handleBusinessLogin() {
    const key = document.getElementById('businessKey').value.trim().toLowerCase();
    const password = document.getElementById('businessPassword').value;

    if (!key || !password) {
        alert("Lütfen işletme adı ve şifreyi giriniz.");
        return;
    }

    const field = fieldsData[key];
    if (!field) {
        alert("İşletme bulunamadı! Lütfen doğru işletme adını giriniz.");
        return;
    }
    if (field.password !== password) {
        alert("Hatalı şifre!");
        return;
    }

    currentBusinessFieldKey = key;
    isBusinessLoggedIn = true;
    closeModal('businessLoginModal');
    document.getElementById('businessPassword').value = "";

    document.getElementById('userAuthSection').style.display = 'none';
    document.getElementById('businessAuthSection').style.display = 'none';
    document.getElementById('businessLogoutSection').style.display = 'flex';
    document.getElementById('welcomeText').style.display = 'none';

    const customerContainer = document.getElementById('customerContainer');
    if (customerContainer) customerContainer.style.display = 'none';

    document.querySelector('main').classList.add('business-mode');
    document.getElementById('businessPanel').style.display = 'block';
    document.getElementById('businessPanelTitle').innerText = `${field.name.toLocaleUpperCase('tr-TR')} YÖNETİM PANELİ`;
    document.getElementById('businessWelcomeText').innerText = `İŞLETME: ${field.name}`;

    switchBusinessTab('stats');
    await loadBusinessDashboard();
}

function handleBusinessLogout() {
    isBusinessLoggedIn = false;
    currentBusinessFieldKey = "";

    document.getElementById('userAuthSection').style.display = 'flex';
    document.getElementById('businessAuthSection').style.display = 'flex';
    document.getElementById('businessLogoutSection').style.display = 'none';

    const customerContainer = document.getElementById('customerContainer');
    if (customerContainer) customerContainer.style.display = 'block';

    document.querySelector('main').classList.remove('business-mode');
    document.getElementById('businessPanel').style.display = 'none';

    alert("İşletme panelinden çıkış yapıldı.");
    if (currentSelectedFieldKey) onDateOrFieldChange();
}

// =======================================================
// İŞLETME DASHBOARD YÜKLEME
// =======================================================
async function loadBusinessDashboard() {
    const field = fieldsData[currentBusinessFieldKey];
    await loadBusinessStats();
    document.getElementById('businessSettingFieldCount').value = field.pitchCount || 1;
    document.getElementById('businessSettingPhone').value = formatPhoneNumberInput(field.phone || "");
    document.getElementById('businessSettingService').value = field.hasService || "Servis: Yok";
    document.getElementById('businessSettingCoordinates').value = field.coordinates || "";
    document.getElementById('businessSettingRefreshments').value = field.refreshments || "";
    document.getElementById('businessSettingCleats').value = field.cleats || "Krampon Kiralanmaz";
    document.getElementById('businessSettingShower').value = field.shower || "Duş Yok";
    document.getElementById('businessSettingMarket').value = field.market || "Market Yok";
    onAdminFieldCountChange();
    await loadBusinessReservations();
    await loadBusinessSubscriptions();
}

async function loadBusinessStats() {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/stats-content/${currentBusinessFieldKey}`);
        const result = await response.json();
        if (result.success) {
            const data = result.data;
            document.getElementById('statTotal').innerText = data.total;
            document.getElementById('earnTotal').innerHTML = `
                <span style="color: var(--neon-green); display: block;">Ödenen: ${data.totalEarningsPaid || 0} TL</span>
                <span style="color: #fca5a5; display: block; font-size: 0.9rem;">Ödenmeyen: ${data.totalEarningsUnpaid || 0} TL</span>
            `;
            
            document.getElementById('statMonth').innerText = data.thisMonth;
            document.getElementById('earnMonth').innerHTML = `
                <span style="color: var(--neon-green); display: block;">Ödenen: ${data.thisMonthEarningsPaid || 0} TL</span>
                <span style="color: #fca5a5; display: block; font-size: 0.9rem;">Ödenmeyen: ${data.thisMonthEarningsUnpaid || 0} TL</span>
            `;
            
            document.getElementById('statToday').innerText = data.today;
            document.getElementById('earnToday').innerHTML = `
                <span style="color: var(--neon-green); display: block;">Ödenen: ${data.todayEarningsPaid || 0} TL</span>
                <span style="color: #fca5a5; display: block; font-size: 0.9rem;">Ödenmeyen: ${data.todayEarningsUnpaid || 0} TL</span>
            `;
            
            document.getElementById('statLast7Days').innerText = data.last7Days;
            document.getElementById('earnLast7Days').innerHTML = `
                <span style="color: var(--neon-green); display: block;">Ödenen: ${data.last7DaysEarningsPaid || 0} TL</span>
                <span style="color: #fca5a5; display: block; font-size: 0.9rem;">Ödenmeyen: ${data.last7DaysEarningsUnpaid || 0} TL</span>
            `;
        }
    } catch (error) {
        console.error("İstatistikler yüklenemedi:", error);
    }
}

// =======================================================
// SAHA SAYISI & FİYAT & SAAT YÖNETİMİ
// =======================================================
function onAdminFieldCountChange() {
    const field = fieldsData[currentBusinessFieldKey];
    const count = parseInt(document.getElementById('businessSettingFieldCount').value);
    if (field) field.pitchCount = count;

    const pricingSelectZone = document.getElementById('pricingPitchSelectorZone');
    const hoursSelectZone = document.getElementById('hoursPitchSelectorZone');
    const subPitchSelectZone = document.getElementById('subPitchSelectZone');
    const pricingInputsZone = document.getElementById('pricingInputsZone');
    const hoursInputsZone = document.getElementById('hoursInputsZone');

    if (count === 2) {
        pricingSelectZone.style.display = 'block';
        hoursSelectZone.style.display = 'block';
        subPitchSelectZone.style.display = 'block';

        const selectedPricingPitch = document.getElementById('pricingPitchSelect').value;
        pricingInputsZone.style.display = selectedPricingPitch ? 'block' : 'none';

        const selectedHoursPitch = document.getElementById('hoursPitchSelect').value;
        hoursInputsZone.style.display = selectedHoursPitch ? 'block' : 'none';
    } else {
        pricingSelectZone.style.display = 'none';
        hoursSelectZone.style.display = 'none';
        subPitchSelectZone.style.display = 'none';
        pricingInputsZone.style.display = 'block';
        hoursInputsZone.style.display = 'block';
        document.getElementById('pricingPitchSelect').value = "1";
        document.getElementById('hoursPitchSelect').value = "1";
        document.getElementById('subPitchSelect').value = "1";
    }

    loadPricingForSelectedPitch();
    loadHoursForSelectedPitch();
}

async function saveBusinessFieldCount() {
    const count = parseInt(document.getElementById('businessSettingFieldCount').value);
    const field = fieldsData[currentBusinessFieldKey];
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/pitch-settings/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isClosed: field.isClosed ? 1 : 0,
                openingHour: field.openingHour,
                closingHour: field.closingHour,
                disabledHours: JSON.stringify(field.disabledHours),
                aboneHours: JSON.stringify(field.aboneHours),
                pricing: field.pricing,
                field_count: count
            })
        });
        const result = await response.json();
        if (result.success) {
            alert("Saha sayısı başarıyla güncellendi!");
            field.pitchCount = count;
            const listResp = await fetch('http://127.0.0.1:5000/api/pitch-list');
            const listResult = await listResp.json();
            if (listResult.success) pitchObjectsList = listResult.data;
            onAdminFieldCountChange();
        } else {
            alert("Ayarlar kaydedilemedi: " + result.message);
        }
    } catch (error) {
        console.error("Hata:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

function loadPricingForSelectedPitch() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    const pricingInputsZone = document.getElementById('pricingInputsZone');
    if (count === 2) {
        pitchNum = parseInt(document.getElementById('pricingPitchSelect').value);
        if (!pitchNum) { pricingInputsZone.style.display = 'none'; return; }
    }
    pricingInputsZone.style.display = 'block';
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum);
    const morningPrice = pitch ? (pitch.morningPrice || 2500) : 2500;
    const eveningPrice = pitch ? (pitch.eveningPrice || 3000) : 3000;
    document.getElementById('businessPriceMorning').value = morningPrice;
    document.getElementById('businessPriceEvening').value = eveningPrice;
    document.getElementById('businessCurrentPricePreview').innerText = `${morningPrice} TL / ${eveningPrice} TL`;
}

async function savePricingSchedule() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) {
        pitchNum = parseInt(document.getElementById('pricingPitchSelect').value);
        if (!pitchNum) { alert("Lütfen ayarlanacak sahayı seçin!"); return; }
    }
    const morningPrice = parseInt(document.getElementById('businessPriceMorning').value) || 2500;
    const eveningPrice = parseInt(document.getElementById('businessPriceEvening').value) || 3000;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isClosed: pitch.isClosed || 0,
                openingHour: pitch.openingHour || '09:00',
                closingHour: pitch.closingHour || '23:00',
                disabledHours: JSON.stringify(pitch.disabledHours || []),
                aboneHours: JSON.stringify(pitch.aboneHours || []),
                morningPrice, eveningPrice,
                closedDays: typeof pitch.closedDays === 'string' ? pitch.closedDays : JSON.stringify(pitch.closedDays || [])
            })
        });
        const result = await response.json();
        if (result.success) {
            const existingPitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum);
            if (existingPitch) { existingPitch.morningPrice = morningPrice; existingPitch.eveningPrice = eveningPrice; }
            else { pitchObjectsList.push({ fieldKey: currentBusinessFieldKey, pitchNumber: pitchNum, morningPrice, eveningPrice }); }

            const field = fieldsData[currentBusinessFieldKey];
            field.pricing = `${morningPrice}/${eveningPrice}`;
            if (pitchNum === 1) {
                await fetch(`http://127.0.0.1:5000/api/pitch-settings/${currentBusinessFieldKey}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        isClosed: field.isClosed ? 1 : 0, openingHour: field.openingHour, closingHour: field.closingHour,
                        disabledHours: JSON.stringify(field.disabledHours), aboneHours: JSON.stringify(field.aboneHours),
                        pricing: field.pricing, field_count: field.pitchCount || 1
                    })
                });
            }
            alert(`Saha ${pitchNum} fiyatı başarıyla güncellendi!`);
            document.getElementById('businessCurrentPricePreview').innerText = `${morningPrice} TL / ${eveningPrice} TL`;
            renderFieldsGrid();
        } else { alert("Fiyat güncellenemedi: " + result.message); }
    } catch (error) { console.error("Fiyat kaydetme hatası:", error); alert("Sunucuya bağlanılamadı!"); }
}

async function loadHoursForSelectedPitch() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    const hoursInputsZone = document.getElementById('hoursInputsZone');
    if (count === 2) {
        pitchNum = parseInt(document.getElementById('hoursPitchSelect').value);
        if (!pitchNum) { hoursInputsZone.style.display = 'none'; return; }
    }
    hoursInputsZone.style.display = 'block';

    const daySelect = document.getElementById('adminHoursDaySelect');
    if (daySelect) daySelect.value = 'all';

    try {
        const dhResp = await fetch(`http://127.0.0.1:5000/api/field-daily-hours/${currentBusinessFieldKey}`);
        const dhResult = await dhResp.json();
        if (dhResult.success) {
            currentPitchDailyHours = dhResult.data;
        }
    } catch (e) {
        console.error("Günlük saatler çekilemedi:", e);
    }

    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {
        openingHour: '09:00', closingHour: '23:00', isClosed: 0, disabledHours: [], aboneHours: []
    };
    if (typeof pitch.disabledHours === 'string') pitch.disabledHours = JSON.parse(pitch.disabledHours || '[]');
    if (typeof pitch.aboneHours === 'string') pitch.aboneHours = JSON.parse(pitch.aboneHours || '[]');

    document.getElementById('fieldClosureToggle').checked = pitch.isClosed === 1;

    // Update weekday closure toggle based on selected day
    const dayVal = document.getElementById('adminHoursDaySelect').value;
    const weekdayCont = document.getElementById('weekdayClosureContainer');
    if (dayVal === 'all') {
        if (weekdayCont) weekdayCont.style.display = 'none';
    } else {
        if (weekdayCont) weekdayCont.style.display = 'flex';
        const dayName = getSelectedAdminDayName();
        const labelDayName = document.getElementById('selectedClosureDayName');
        if (labelDayName) labelDayName.innerText = dayName;
        let closedDaysArr = [];
        try {
            closedDaysArr = typeof pitch.closedDays === 'string' ? JSON.parse(pitch.closedDays || '[]') : (pitch.closedDays || []);
        } catch (e) {}
        const wkToggle = document.getElementById('weekdayClosureToggle');
        if (wkToggle) wkToggle.checked = closedDaysArr.includes(dayName);
    }

    const openSelect = document.getElementById('adminOpeningHour');
    const closeSelect = document.getElementById('adminClosingHour');
    openSelect.innerHTML = ""; closeSelect.innerHTML = "";

    masterHoursList.forEach(h => {
        const prefix = h.split(' - ')[0];
        let opt1 = document.createElement('option'); opt1.value = prefix; opt1.text = prefix;
        let opt2 = document.createElement('option'); opt2.value = prefix; opt2.text = prefix;
        openSelect.appendChild(opt1); closeSelect.appendChild(opt2);
    });
    openSelect.value = pitch.openingHour || '09:00';
    closeSelect.value = pitch.closingHour || '23:00';
    renderAdminHoursGrid(pitch);
}

function getSelectedAdminDayName() {
    const select = document.getElementById('adminHoursDaySelect');
    if (!select) return 'all';
    const val = select.value;
    if (val === 'all') return 'all';
    const opt = select.options[select.selectedIndex];
    return opt ? opt.text : 'all';
}

async function toggleWeekdayClosure() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { 
        pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); 
        if (!pitchNum) { alert("Lütfen saha seçin!"); return; } 
    }
    const dayVal = document.getElementById('adminHoursDaySelect').value;
    if (dayVal === 'all') {
        alert("Lütfen kapatmak istediğiniz belirli bir günü seçin!");
        return;
    }
    const dayName = getSelectedAdminDayName();
    const isDayClosed = document.getElementById('weekdayClosureToggle').checked;

    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};
    let closedDaysArr = [];
    try {
        closedDaysArr = typeof pitch.closedDays === 'string' ? JSON.parse(pitch.closedDays || '[]') : (pitch.closedDays || []);
    } catch (e) {}

    if (isDayClosed) {
        if (!closedDaysArr.includes(dayName)) {
            closedDaysArr.push(dayName);
        }
    } else {
        closedDaysArr = closedDaysArr.filter(d => d !== dayName);
    }

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                isClosed: pitch.isClosed || 0, 
                openingHour: pitch.openingHour || '09:00', 
                closingHour: pitch.closingHour || '23:00', 
                disabledHours: JSON.stringify(pitch.disabledHours || []), 
                aboneHours: JSON.stringify(pitch.aboneHours || []), 
                morningPrice: pitch.morningPrice || 2500, 
                eveningPrice: pitch.eveningPrice || 3000, 
                closedDays: JSON.stringify(closedDaysArr) 
            })
        });
        const result = await response.json();
        if (result.success) {
            pitch.closedDays = closedDaysArr;
            alert(`Saha ${pitchNum} için ${dayName} günü bakım durumu güncellendi.`);
            refreshCustomerPitchData();
        } else {
            alert("Durum güncellenemedi: " + result.message);
            document.getElementById('weekdayClosureToggle').checked = !isDayClosed;
        }
    } catch (error) {
        console.error("Haftalık durum güncelleme hatası:", error);
        document.getElementById('weekdayClosureToggle').checked = !isDayClosed;
    }
}

function onAdminHoursDayChange() {
    const dayVal = document.getElementById('adminHoursDaySelect').value;
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) {
        pitchNum = parseInt(document.getElementById('hoursPitchSelect').value);
        if (!pitchNum) return;
    }
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};

    let openHour = pitch.openingHour || '15:00';
    let closeHour = pitch.closingHour || '02:00';

    if (dayVal !== 'all') {
        const dayInt = parseInt(dayVal);
        const dayHour = currentPitchDailyHours.find(d => d.dayOfWeek === dayInt);
        if (dayHour) {
            openHour = dayHour.openingHour;
            closeHour = dayHour.closingHour;
        }
    }

    document.getElementById('adminOpeningHour').value = openHour;
    document.getElementById('adminClosingHour').value = closeHour;

    // Update weekday closure toggle based on selected day
    const weekdayCont = document.getElementById('weekdayClosureContainer');
    if (dayVal === 'all') {
        if (weekdayCont) weekdayCont.style.display = 'none';
    } else {
        if (weekdayCont) weekdayCont.style.display = 'flex';
        const dayName = getSelectedAdminDayName();
        const labelDayName = document.getElementById('selectedClosureDayName');
        if (labelDayName) labelDayName.innerText = dayName;
        let closedDaysArr = [];
        try {
            closedDaysArr = typeof pitch.closedDays === 'string' ? JSON.parse(pitch.closedDays || '[]') : (pitch.closedDays || []);
        } catch (e) {}
        const wkToggle = document.getElementById('weekdayClosureToggle');
        if (wkToggle) wkToggle.checked = closedDaysArr.includes(dayName);
    }

    // Gün seçimine göre grid'i yeniden render et
    renderAdminHoursGrid(pitch);
}

function renderAdminHoursGrid(pitch) {
    const grid = document.getElementById('adminHoursGrid');
    grid.innerHTML = "";
    const daySelect = document.getElementById('adminHoursDaySelect');
    const dayVal = daySelect ? daySelect.value : 'all';

    function timeToMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }

    // Açılış/kapanış saatini belirle
    let openHour = pitch.openingHour || '09:00';
    let closeHour = pitch.closingHour || '23:00';
    if (dayVal !== 'all') {
        const dayInt = parseInt(dayVal);
        const dayHour = currentPitchDailyHours.find(d => d.dayOfWeek === dayInt);
        if (dayHour) {
            openHour = dayHour.openingHour;
            closeHour = dayHour.closingHour;
        }
    }

    const openingMins = timeToMins(openHour);
    let closingMins = timeToMins(closeHour);
    if (closingMins <= openingMins) closingMins += 1440;

    const filteredHours = masterHoursList.filter(hour => {
        const slotStart = hour.split(' - ')[0];
        let slotStartMins = timeToMins(slotStart);
        if (slotStartMins < openingMins) slotStartMins += 1440;
        return slotStartMins >= openingMins && slotStartMins < closingMins;
    });

    filteredHours.sort((a, b) => {
        const startA = a.split(' - ')[0];
        const startB = b.split(' - ')[0];
        let minsA = timeToMins(startA);
        let minsB = timeToMins(startB);
        if (minsA < openingMins) minsA += 1440;
        if (minsB < openingMins) minsB += 1440;
        return minsA - minsB;
    });

    filteredHours.forEach(hour => {
        const btn = document.createElement('button');
        btn.classList.add('hour-btn');
        const disabledHours = pitch.disabledHours || [];
        const aboneHours = pitch.aboneHours || [];

        let isAboneSlot = false;
        let daysSubscribed = [];
        if (dayVal === 'all') {
            isAboneSlot = aboneHours.some(ah => ah.endsWith(hour));
            daysSubscribed = aboneHours.filter(ah => ah.endsWith(hour)).map(ah => ah.split(' ')[0].substring(0, 3));
        } else {
            const dayName = getSelectedAdminDayName();
            isAboneSlot = aboneHours.some(ah => ah.startsWith(dayName + ' ') && ah.endsWith(hour));
            if (isAboneSlot) daysSubscribed = [dayName.substring(0, 3)];
        }

        const hStart = parseInt(hour.split(':')[0]);
        const isNextDay = hStart < 6;
        const nextDayLabel = isNextDay ? `<span class="hour-next-day">(Sonraki Gün)</span>` : "";

        let statusHtml = "";
        if (isAboneSlot) {
            btn.classList.add('abone-state');
            statusHtml = `<span class="hour-status">(ABONE: ${daysSubscribed.join(',')})</span>`;
        } else if (disabledHours.includes(hour)) {
            btn.classList.add('locked');
            statusHtml = `<span class="hour-status">(ENGELLİ)</span>`;
        } else {
            btn.classList.add('available');
            statusHtml = `<span class="hour-status">(AÇIK)</span>`;
        }

        btn.innerHTML = `<span class="hour-time">${hour}</span>${statusHtml}${nextDayLabel}`;

        btn.onclick = function() {
            currentAdminSelectedHour = hour;
            document.getElementById('hourActionTitle').innerText = `${hour} AYARI`;
            openModal('hourActionModal');
        };
        grid.appendChild(btn);
    });
}

async function saveOperatingHours() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); if (!pitchNum) { alert("Lütfen saha seçin!"); return; } }
    const openHour = document.getElementById('adminOpeningHour').value;
    const closeHour = document.getElementById('adminClosingHour').value;
    const dayVal = document.getElementById('adminHoursDaySelect').value;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};

    try {
        if (dayVal === 'all') {
            const response = await fetch(`http://127.0.0.1:5000/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isClosed: pitch.isClosed || 0, openingHour: openHour, closingHour: closeHour, disabledHours: JSON.stringify(pitch.disabledHours || []), aboneHours: JSON.stringify(pitch.aboneHours || []), morningPrice: pitch.morningPrice || 2500, eveningPrice: pitch.eveningPrice || 3000, closedDays: typeof pitch.closedDays === 'string' ? pitch.closedDays : JSON.stringify(pitch.closedDays || []) })
            });
            const result = await response.json();
            if (result.success) {
                alert("Genel çalışma saatleri başarıyla güncellendi!");
                const existingPitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum);
                if (existingPitch) { existingPitch.openingHour = openHour; existingPitch.closingHour = closeHour; }
                loadHoursForSelectedPitch();
                refreshCustomerPitchData();
            } else { alert("Hata: " + result.message); }
        } else {
            const dayInt = parseInt(dayVal);
            const response = await fetch(`http://127.0.0.1:5000/api/field-daily-hours/${currentBusinessFieldKey}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    days: [{ dayOfWeek: dayInt, openingHour: openHour, closingHour: closeHour }]
                })
            });
            const result = await response.json();
            if (result.success) {
                alert("Günlük çalışma saati başarıyla güncellendi!");
                // Update cache
                const dayHour = currentPitchDailyHours.find(d => d.dayOfWeek === dayInt);
                if (dayHour) {
                    dayHour.openingHour = openHour;
                    dayHour.closingHour = closeHour;
                } else {
                    currentPitchDailyHours.push({ fieldKey: currentBusinessFieldKey, dayOfWeek: dayInt, openingHour: openHour, closingHour: closeHour });
                }
                // Update global dailyHoursList
                const globalDayHour = dailyHoursList.find(d => d.fieldKey === currentBusinessFieldKey && d.dayOfWeek === dayInt);
                if (globalDayHour) {
                    globalDayHour.openingHour = openHour;
                    globalDayHour.closingHour = closeHour;
                } else {
                    dailyHoursList.push({ fieldKey: currentBusinessFieldKey, dayOfWeek: dayInt, openingHour: openHour, closingHour: closeHour });
                }
                loadHoursForSelectedPitch();
                refreshCustomerPitchData();
            } else { alert("Hata: " + result.message); }
        }
    } catch (error) { console.error("Çalışma saatleri kaydetme hatası:", error); alert("Sunucuya bağlanılamadı!"); }
}

async function toggleFieldClosure() {
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); if (!pitchNum) { alert("Lütfen saha seçin!"); return; } }
    const isClosed = document.getElementById('fieldClosureToggle').checked ? 1 : 0;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isClosed, openingHour: pitch.openingHour || '09:00', closingHour: pitch.closingHour || '23:00', disabledHours: JSON.stringify(pitch.disabledHours || []), aboneHours: JSON.stringify(pitch.aboneHours || []), morningPrice: pitch.morningPrice || 2500, eveningPrice: pitch.eveningPrice || 3000, closedDays: typeof pitch.closedDays === 'string' ? pitch.closedDays : JSON.stringify(pitch.closedDays || []) })
        });
        const result = await response.json();
        if (result.success) {
            const existingPitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum);
            if (existingPitch) existingPitch.isClosed = isClosed;
            alert(`Saha ${pitchNum} durumu güncellendi.`);
            refreshCustomerPitchData();
        } else { alert("Durum güncellenemedi: " + result.message); }
    } catch (error) { console.error("Durum güncelleme hatası:", error); }
}

// SAAT ENGEL İŞLEM KAYDEDİCİ (ABONE SEÇENEĞİ KALDIRILDI)
async function saveHourAction() {
    const action = document.getElementById('hourActionSelect').value;
    const count = parseInt(fieldsData[currentBusinessFieldKey].pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); if (!pitchNum) { alert("Lütfen saha seçin!"); return; } }

    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || { disabledHours: [], aboneHours: [] };
    if (typeof pitch.disabledHours === 'string') pitch.disabledHours = JSON.parse(pitch.disabledHours || '[]');
    if (typeof pitch.aboneHours === 'string') pitch.aboneHours = JSON.parse(pitch.aboneHours || '[]');

    pitch.disabledHours = pitch.disabledHours.filter(h => h !== currentAdminSelectedHour);

    if (action === "KAPAT") {
        pitch.disabledHours.push(currentAdminSelectedHour);
    }
    // TEMIZLE durumunda sadece filtreleme yeterli

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isClosed: pitch.isClosed || 0, openingHour: pitch.openingHour || '09:00', closingHour: pitch.closingHour || '23:00', disabledHours: JSON.stringify(pitch.disabledHours), aboneHours: JSON.stringify(pitch.aboneHours), morningPrice: pitch.morningPrice || 2500, eveningPrice: pitch.eveningPrice || 3000, closedDays: typeof pitch.closedDays === 'string' ? pitch.closedDays : JSON.stringify(pitch.closedDays || []) })
        });
        const result = await response.json();
        if (result.success) { closeModal('hourActionModal'); loadHoursForSelectedPitch(); refreshCustomerPitchData(); }
        else { alert("Saat işlemi kaydedilemedi: " + result.message); }
    } catch (error) { console.error("Saat kaydetme hatası:", error); }
}

// =======================================================
// REZERVASYONLAR (İŞLETME PANELİ)
// =======================================================
async function loadBusinessReservations() {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/business-reservations/${currentBusinessFieldKey}`);
        const result = await response.json();
        if (result.success) {
            currentBusinessReservations = result.data;
            currentBusinessResFilter = 'all';
            renderBusinessReservations();
            initBusinessGridDateSelect();
            renderBusinessHoursGrid();
        }
    } catch (error) { console.error("Rezervasyonlar yüklenemedi:", error); }
}

let currentBusinessResFilter = 'all';
let currentBusinessReservations = [];

function filterBusinessReservations(type) {
    currentBusinessResFilter = type;
    document.querySelectorAll('.btn-filter-res').forEach(b => {
        b.style.background = 'rgba(16,185,129,0.15)';
        b.style.color = '#34d399';
        b.style.border = '1px solid rgba(16,185,129,0.3)';
    });
    const activeBtn = document.getElementById(`resFilter${type.charAt(0).toLocaleUpperCase('tr-TR') + type.slice(1)}`);
    if (activeBtn) {
        activeBtn.style.background = 'var(--primary-green)';
        activeBtn.style.color = '#000';
        activeBtn.style.border = 'none';
    }
    renderBusinessReservations();
}

function renderBusinessReservations() {
    const activeContainer = document.getElementById('businessActiveReservationsContainer');
    const pastContainer = document.getElementById('businessPastReservationsContainer');
    if (!activeContainer || !pastContainer) return;

    let filtered = currentBusinessReservations.filter(r => r.status !== 'cancelled');
    if (currentBusinessResFilter === 'normal') filtered = filtered.filter(r => r.type !== 'abone');
    else if (currentBusinessResFilter === 'abone') filtered = filtered.filter(r => r.type === 'abone');

    const activeList = [];
    const pastList = [];
    filtered.forEach(res => {
        if (isReservationPast(res.dateText, res.hourText)) pastList.push(res);
        else activeList.push(res);
    });

    const pitchCount = fieldsData[currentBusinessFieldKey].pitchCount || 1;

    if (activeList.length === 0) {
        activeContainer.innerHTML = '<p style="color: var(--text-muted);">Aktif rezervasyon bulunmamaktadır.</p>';
    } else {
        activeContainer.innerHTML = activeList.map(res => `
            <div class="admin-res-item" style="${res.type === 'abone' ? 'border-left: 4px solid #f59e0b;' : ''}">
                <div class="admin-res-info">
                    <strong>${res.user_name}${res.type === 'abone' ? ' <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;">ABONE</span>' : ''}</strong><br>
                    <small style="color: var(--text-muted);">${pitchCount > 1 ? `SAHA ${res.pitchNumber}` : 'TEK SAHA'} | ${res.dateText} | ${res.hourText}</small>
                </div>
                <div class="admin-res-actions" style="margin-top: 5px;">
                    ${pitchCount > 1 ? `
                    <select id="newPitch_${res.id}" class="admin-control-inline">
                        <option value="1" ${res.pitchNumber === 1 ? 'selected' : ''}>Saha 1</option>
                        <option value="2" ${res.pitchNumber === 2 ? 'selected' : ''}>Saha 2</option>
                    </select>
                    ` : `<input type="hidden" id="newPitch_${res.id}" value="1">`}
                    <select id="newDate_${res.id}" class="admin-control-inline">
                        <option value="${res.dateText}">Tarih: ${res.dateText}</option>
                        ${getNext7Days().map(day => `<option value="${day}">${day}</option>`).join('')}
                    </select>
                    <select id="newHour_${res.id}" class="admin-control-inline">
                        <option value="${res.hourText}">Saat: ${res.hourText}</option>
                        ${masterHoursList.map(h => `<option value="${h}">${h}</option>`).join('')}
                    </select>
                    <button class="btn-danger-sm" style="background-color: var(--primary-green); color: #000;" onclick="updateReservation(${res.id})">ERTELE</button>
                    <button class="btn-danger-sm" onclick="removeReservation(${res.id})">İPTAL</button>
                </div>
            </div>
        `).join('');
    }

    if (pastList.length === 0) {
        pastContainer.innerHTML = '<p style="color: var(--text-muted);">Geçmiş rezervasyon bulunmamaktadır.</p>';
    } else {
        pastContainer.innerHTML = pastList.map(res => `
            <div class="admin-res-item" style="opacity: 0.85;">
                <div class="admin-res-info">
                    <strong>${res.user_name}${res.type === 'abone' ? ' <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;">ABONE</span>' : ''}</strong><br>
                    <small style="color: var(--text-muted);">${pitchCount > 1 ? `SAHA ${res.pitchNumber}` : 'TEK SAHA'} | ${res.dateText} | ${res.hourText} (GEÇMİŞ)</small>
                </div>
                <div class="admin-res-actions">
                    <button class="btn-danger-sm" onclick="removeReservation(${res.id})">SİL</button>
                </div>
            </div>
        `).join('');
    }
}

function getNext7Days() {
    const optionsFormat = { day: 'numeric', month: 'long' };
    let days = [];
    for (let i = 0; i < 7; i++) {
        let d = new Date();
        d.setDate(d.getDate() + i);
        let dateText = d.toLocaleDateString('tr-TR', optionsFormat).toLocaleUpperCase('tr-TR');
        days.push(dateText);
    }
    return days;
}

let selectedBusinessGridResId = null;
let businessGridFilter = 'all';

function filterBusinessGrid(filter) {
    businessGridFilter = filter;
    document.querySelectorAll('#tab-reservations .btn-filter-res').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`bizGridFilter${filter.charAt(0).toLocaleUpperCase('tr-TR') + filter.slice(1)}`);
    if (btn) btn.classList.add('active');
    renderBusinessHoursGrid();
}

function initBusinessGridDateSelect() {
    const sel = document.getElementById('businessGridDateSelect');
    if (!sel) return;
    sel.innerHTML = '';
    const optionsFormat = { day: 'numeric', month: 'long' };
    for (let i = 0; i < 14; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateText = d.toLocaleDateString('tr-TR', optionsFormat).toLocaleUpperCase('tr-TR');
        const opt = document.createElement('option');
        opt.value = dateText;
        opt.textContent = dateText;
        if (i === 0) opt.selected = true;
        sel.appendChild(opt);
    }
}

function renderBusinessHoursGrid() {
    const grid = document.getElementById('businessHoursGrid');
    if (!grid) return;
    const sel = document.getElementById('businessGridDateSelect');
    const dateText = sel ? sel.value : '';
    if (!dateText) { grid.innerHTML = '<p style="color:var(--text-muted);">Tarih seçiniz.</p>'; return; }
    const field = fieldsData[currentBusinessFieldKey];
    if (!field) { grid.innerHTML = ''; return; }
    const pitchCount = field.pitchCount || 1;

    grid.innerHTML = '';

    const resForDate = currentBusinessReservations.filter(r => r.dateText === dateText);

    let filtered = resForDate;
    if (businessGridFilter === 'normal') filtered = resForDate.filter(r => r.type !== 'abone');
    else if (businessGridFilter === 'abone') filtered = resForDate.filter(r => r.type === 'abone');

    const dayNames = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
    const newPlayDate = getActualPlayDate(dateText, '12:00 - 13:00');
    const dayOfWeek = newPlayDate ? dayNames[newPlayDate.getDay()] : '';

    for (let p = 1; p <= pitchCount; p++) {
        const pitchLabel = document.createElement('div');
        pitchLabel.style.cssText = 'grid-column: 1 / -1; font-size:0.85rem; font-weight:700; color:var(--neon-green); text-transform:uppercase; margin-top:8px;';
        pitchLabel.textContent = `--- SAHA ${p} ---`;
        grid.appendChild(pitchLabel);

        const pitch = pitchObjectsList.find(po => po.fieldKey === currentBusinessFieldKey && po.pitchNumber === p) || field;

        const dailySetting = dailyHoursList.find(dh => dh.fieldKey === currentBusinessFieldKey && dh.dayOfWeek === newPlayDate?.getDay());
        const openHour = dailySetting ? dailySetting.openingHour : (pitch.openingHour || '12:00');
        const closeHour = dailySetting ? dailySetting.closingHour : (pitch.closingHour || '23:00');

        function timeToMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
        const openingMins = timeToMins(openHour);
        let closingMins = timeToMins(closeHour);
        if (closingMins <= openingMins) closingMins += 1440;

        const filteredHours = masterHoursList.filter(hour => {
            const slotStart = hour.split(' - ')[0];
            let slotStartMins = timeToMins(slotStart);
            if (slotStartMins < openingMins) slotStartMins += 1440;
            return slotStartMins >= openingMins && slotStartMins < closingMins;
        });

        filteredHours.sort((a, b) => {
            const startA = a.split(' - ')[0];
            const startB = b.split(' - ')[0];
            let minsA = timeToMins(startA);
            let minsB = timeToMins(startB);
            if (minsA < openingMins) minsA += 1440;
            if (minsB < openingMins) minsB += 1440;
            return minsA - minsB;
        });

        filteredHours.forEach(hour => {
            const btn = document.createElement('button');
            btn.classList.add('hour-btn');
            btn.dataset.hour = hour;
            btn.dataset.pitch = p;

            const hStartBiz = parseInt(hour.split(':')[0]);
            let taken = filtered.find(r => r.pitchNumber === p && r.hourText === hour && r.status !== 'cancelled');
            if (!taken && hStartBiz < 6) {
                const nextDate = getNextCalendarDayText(dateText);
                taken = currentBusinessReservations.find(r => r.dateText === nextDate && r.pitchNumber === p && r.hourText === hour && r.status !== 'cancelled');
            }
            if (taken) {
                btn.classList.add('taken-business');
                btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(${taken.user_name})</span>`;
                btn.title = `${taken.user_name} | ${taken.user_phone || ''} | ${taken.payment_status === 'odendi' ? 'ÖDENDİ' : 'ÖDENMEDİ'}${taken.type === 'abone' ? ' | ABONE' : ''}`;
                btn.onclick = () => {
                    selectedBusinessGridResId = taken.id;
                    const info = document.getElementById('businessGridSelectedInfo');
                    if (info) {
                        info.style.display = 'block';
                        document.getElementById('bizGridSelName').textContent = `${taken.user_name}${taken.type === 'abone' ? ' (ABONE)' : ''}`;
                        document.getElementById('bizGridSelDetail').textContent = `SAHA ${taken.pitchNumber} | ${taken.dateText} | ${taken.hourText} | ${taken.payment_status === 'odendi' ? '✅ ÖDENDİ' : '⚠️ ÖDENMEDİ'}${taken.reservation_price ? ` | ${taken.reservation_price} TL` : ''}`;
                    }
                };
            } else {
                btn.classList.add('business-empty');
                btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(BOS)</span>`;
            }
            grid.appendChild(btn);
        });
    }
}

function quickBusinessWhatsApp() {
    if (!selectedBusinessGridResId) return;
    const res = currentBusinessReservations.find(r => r.id === selectedBusinessGridResId);
    if (!res || !res.user_phone) { alert("Telefon numarası bulunamadı!"); return; }
    const phone = formatPhoneForWhatsApp(res.user_phone);
    const msg = encodeURIComponent(`Merhaba ${res.user_name}, rezervasyonunuzla ilgili: ${res.dateText} ${res.hourText} - SAHA ${res.pitchNumber}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

function quickBusinessCancel() {
    if (!selectedBusinessGridResId) return;
    removeReservation(selectedBusinessGridResId);
    selectedBusinessGridResId = null;
    document.getElementById('businessGridSelectedInfo').style.display = 'none';
}

async function updateReservation(id) {
    const newPitchEl = document.getElementById(`newPitch_${id}`);
    const newPitch = newPitchEl ? parseInt(newPitchEl.value) : 1;
    const newDate = document.getElementById(`newDate_${id}`).value;
    const newHour = document.getElementById(`newHour_${id}`).value;
    if (!confirm(`Rezervasyonu ${newDate} saat ${newHour} dilimine ertelemek istiyor musunuz?`)) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateText: newDate, hourText: newHour, pitchNumber: newPitch })
        });
        const result = await response.json();
        if (result.success) { alert("Rezervasyon başarıyla ertelendi!"); await loadBusinessReservations(); await loadBusinessStats(); renderBusinessHoursGrid(); await loadReservationsFromServer(); if (currentSelectedFieldKey) onDateOrFieldChange(); }
        else { alert("Hata: " + result.message); }
    } catch (error) { console.error("Rezervasyon güncellenemedi:", error); alert("Sunucuya bağlanılamadı!"); }
}

async function removeReservation(id) {
    const confirmed = await showConfirmModal("Bu rezervasyonu silmek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        const result = await response.json();
        if (result.success) { alert("Rezervasyon başarıyla iptal edildi!"); await loadBusinessReservations(); await loadBusinessStats(); await loadReservationsFromServer(); renderBusinessHoursGrid(); if (currentSelectedFieldKey) onDateOrFieldChange(); }
        else { alert("Hata: " + result.message); }
    } catch (error) { console.error("Rezervasyon silinemedi:", error); alert("Sunucuya bağlanılamadı!"); }
}

// =======================================================
// ABONELİK YÖNETİMİ
// =======================================================
async function loadBusinessSubscriptions() {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/subscriptions/${currentBusinessFieldKey}`);
        const result = await response.json();
        const container = document.getElementById('businessSubscriptionsContainer');
        if (!container) return;

        const hourSelect = document.getElementById('subHourSelect');
        if (hourSelect) {
            hourSelect.innerHTML = '<option value="">SAAT SEÇİNİZ...</option>';
            masterHoursList.forEach(h => {
                const opt = document.createElement('option'); opt.value = h; opt.text = h;
                hourSelect.appendChild(opt);
            });
        }

        if (result.success) {
            const subs = result.data;
            const field = fieldsData[currentBusinessFieldKey];
            const pitchCount = field ? (field.pitchCount || 1) : 1;
            if (subs.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted);">Aktif haftalık abonelik bulunmamaktadır.</p>';
                return;
            }
            container.innerHTML = subs.map(sub => `
                <div class="admin-res-item">
                    <div class="admin-res-info">
                        <strong>${sub.subscriberName}</strong> (${sub.subscriberPhone})<br>
                        <small style="color: var(--text-muted);">${pitchCount > 1 ? `SAHA ${sub.pitchNumber}` : 'TEK SAHA'} | HER ${sub.dayOfWeek} | ${sub.hourText}</small>
                    </div>
                    <div class="admin-res-actions">
                        <button class="btn-danger-sm" onclick="deleteSubscription(${sub.id})">İPTAL ET</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) { console.error("Abonelikler yüklenemedi:", error); }
}

// Temaya uygun stilize hata mesajı göster
function showStyledError(message) {
    const existing = document.getElementById('styledErrorToast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'styledErrorToast';
    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:1.3rem;">⚠️</span>
            <span style="flex:1;font-size:0.9rem;font-weight:600;">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--danger-red);font-size:1.2rem;cursor:pointer;font-weight:700;padding:0 4px;">&times;</button>
        </div>
    `;
    Object.assign(toast.style, {
        position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: '9999', background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(12px)',
        border: '2px solid var(--danger-red)', boxShadow: '0 0 30px rgba(239,68,68,0.4)',
        borderRadius: '12px', padding: '16px 24px', maxWidth: '500px', width: '90%',
        color: '#f8fafc', fontFamily: '"Montserrat",sans-serif',
        animation: 'slideDown 0.3s ease-out'
    });
    document.body.appendChild(toast);
    setTimeout(() => { const t = document.getElementById('styledErrorToast'); if (t) t.remove(); }, 5000);
}

async function saveSubscription() {
    const field = fieldsData[currentBusinessFieldKey];
    const count = field ? (field.pitchCount || 1) : 1;
    let pitchNum = 1;
    if (count === 2) pitchNum = parseInt(document.getElementById('subPitchSelect').value) || 1;

    const hour = document.getElementById('subHourSelect').value;
    const dayOfWeek = document.getElementById('subDaySelect').value;
    const name = document.getElementById('subNameInput').value.trim();
    const phoneInput = document.getElementById('subPhoneInput');
    const phone = phoneInput.value.trim();

    if (!hour || !dayOfWeek || !name) { alert("Lütfen tüm alanları doldurun!"); return; }

    // Telefon numarası zorunlu kontrol
    if (!phone) {
        phoneInput.classList.add('input-error');
        phoneInput.focus();
        showStyledError("Telefon numarası zorunludur! Lütfen geçerli bir telefon numarası giriniz.");
        return;
    }
    phoneInput.classList.remove('input-error');

    // Telefon format kontrolü (en az 10 hane)
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
        phoneInput.classList.add('input-error');
        phoneInput.focus();
        showStyledError("Telefon numarası en az 10 haneli olmalıdır! Lütfen geçerli bir numara giriniz.");
        return;
    }
    phoneInput.classList.remove('input-error');

    try {
        const response = await fetch('http://127.0.0.1:5000/api/subscriptions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey: currentBusinessFieldKey, pitchNumber: pitchNum, dayOfWeek, hourText: hour, subscriberName: name, subscriberPhone: phone })
        });
        const result = await response.json();
        if (result.success) {
            alert("Haftalık abonelik başarıyla tanımlandı!");
            document.getElementById('subNameInput').value = "";
            document.getElementById('subPhoneInput').value = "";
            document.getElementById('subHourSelect').value = "";
            const listResp = await fetch('http://127.0.0.1:5000/api/pitch-list');
            const listResult = await listResp.json();
            if (listResult.success) pitchObjectsList = listResult.data;
            await loadBusinessSubscriptions();
            loadHoursForSelectedPitch();
        } else { alert("Abonelik oluşturulamadı: " + result.message); }
    } catch (error) { console.error("Abonelik kaydetme hatası:", error); alert("Sunucuya bağlanılamadı!"); }
}

async function deleteSubscription(id) {
    const confirmed = await showConfirmModal("Bu haftalık aboneliği silmek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/subscriptions/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            alert("Abonelik başarıyla silindi ve saat boşa çıkarıldı!");
            const listResp = await fetch('http://127.0.0.1:5000/api/pitch-list');
            const listResult = await listResp.json();
            if (listResult.success) pitchObjectsList = listResult.data;
            await loadBusinessSubscriptions();
            loadHoursForSelectedPitch();
        } else { alert("Abonelik silinemedi: " + result.message); }
    } catch (error) { console.error("Abonelik silme hatası:", error); alert("Sunucuya bağlanılamadı!"); }
}

// =======================================================
// HAVA DURUMU & GÜNEŞ BATIŞI (wttr.in API)
// =======================================================
async function initWeatherWidget() {
    const container = document.getElementById('weatherDisplay');
    if (!container) return;
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.6558&longitude=35.8272&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset&timezone=auto');
        if (!response.ok) throw new Error("API hatası");
        const data = await response.json();

        const forecasts = [];
        const options = { weekday: 'short' };
        for (let i = 0; i < 7; i++) {
            const timeStr = data.daily.time[i];
            const date = new Date(timeStr);
            const dayName = date.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
            const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
            const minTemp = Math.round(data.daily.temperature_2m_min[i]);
            const weatherCode = data.daily.weathercode[i];
            const condition = translateWeatherCode(weatherCode);
            const isBad = minTemp < 10 || condition.includes('YAĞMUR') || condition.includes('FIRTINA');
            forecasts.push({ day: dayName, minTemp, maxTemp, condition, isBad });
        }

        container.innerHTML = forecasts.map(w => `
            <div class="weather-day-item ${w.isBad ? 'bad-weather' : ''}">
                <span>${w.day}</span>
                <strong>${w.minTemp}° / ${w.maxTemp}°C</strong>
                <small>${w.condition}</small>
            </div>
        `).join('');

        const sunsetText = document.getElementById('sunsetText');
        if (sunsetText && data.daily.sunset && data.daily.sunset.length > 0) {
            const sunsetStr = data.daily.sunset[0];
            const timePart = sunsetStr.split('T')[1];
            sunsetText.innerText = `${timePart} GÜN BATIMI`;
        }
    } catch (error) {
        console.error("Hava durumu yüklenemedi:", error);
        const daysShort = [];
        for (let i = 0; i < 7; i++) {
            let d = new Date(); d.setDate(d.getDate() + i);
            daysShort.push(d.toLocaleDateString('tr-TR', { weekday: 'short' }).toLocaleUpperCase('tr-TR'));
        }
        container.innerHTML = daysShort.map((day, idx) => {
            const min = 12 + idx;
            const max = 22 + idx * 2;
            return `<div class="weather-day-item"><span>${day}</span><strong>${min}° / ${max}°C</strong><small>BULUTLU</small></div>`;
        }).join('');
    }
}

function translateWeatherCode(code) {
    const map = {
        0: 'GÜNEŞLİ',
        1: 'PARÇALI BULUTLU', 2: 'PARÇALI BULUTLU', 3: 'PARÇALI BULUTLU',
        45: 'SİSLİ', 48: 'SİSLİ',
        51: 'HAFİF YAĞMUR', 53: 'HAFİF YAĞMUR', 55: 'HAFİF YAĞMUR',
        61: 'YAĞMURLU', 63: 'YAĞMURLU', 65: 'YAĞMURLU',
        66: 'DONDURUCU YAĞMUR', 67: 'DONDURUCU YAĞMUR',
        71: 'KARLI', 73: 'KARLI', 75: 'KARLI',
        77: 'HAFİF KAR',
        80: 'SAĞANAK YAĞMURLU', 81: 'SAĞANAK YAĞMURLU', 82: 'SAĞANAK YAĞMURLU',
        85: 'SAĞANAK KARLI', 86: 'SAĞANAK KARLI',
        95: 'FIRTINALI', 96: 'FIRTINALI', 99: 'FIRTINALI'
    };
    return map[code] || 'BULUTLU';
}

// =======================================================
// SAHA SEÇİM & TARİH & SAAT YÖNETİMİ
// =======================================================
async function initPitchSelector() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/pitch-list');
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            pitchObjectsList = result.data;
            
            // Override static fieldsData with database values dynamically
            pitchObjectsList.forEach(pitch => {
                if (fieldsData[pitch.fieldKey] && pitch.pitchNumber === 1) {
                    fieldsData[pitch.fieldKey].phone = pitch.phone;
                    fieldsData[pitch.fieldKey].hasService = pitch.hasService;
                    if (pitch.coordinates) {
                        fieldsData[pitch.fieldKey].coordinates = pitch.coordinates;
                    }
                    fieldsData[pitch.fieldKey].refreshments = pitch.refreshments || "";
                    fieldsData[pitch.fieldKey].cleats = pitch.cleats || "Krampon Kiralanmaz";
                    fieldsData[pitch.fieldKey].shower = pitch.shower || "Duş Yok";
                    fieldsData[pitch.fieldKey].market = pitch.market || "Market Yok";
                }
            });
        }
    } catch (error) { console.error("Saha listesi yüklenemedi:", error); }
}

async function loadPitchSettingsFromDatabase() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/pitch-settings');
        const result = await response.json();
        if (result.success) {
            result.data.forEach(setting => {
                if (fieldsData[setting.fieldKey]) {
                    fieldsData[setting.fieldKey].isClosed = setting.isClosed === 1;
                    fieldsData[setting.fieldKey].openingHour = setting.openingHour;
                    fieldsData[setting.fieldKey].closingHour = setting.closingHour;
                    fieldsData[setting.fieldKey].aboneHours = JSON.parse(setting.aboneHours || '[]');
                    fieldsData[setting.fieldKey].disabledHours = JSON.parse(setting.disabledHours || '[]');
                    fieldsData[setting.fieldKey].pitchCount = setting.field_count || 1;
                    fieldsData[setting.fieldKey].pricing = setting.pricing || '2500/3000';
                }
            });
        }
    } catch (error) { console.error("Pitch ayarları yüklenemedi:", error); }
}

async function refreshCustomerPitchData() {
    await loadPitchSettingsFromDatabase();
    await loadDailyHoursList();
    if (currentSelectedFieldKey) onDateOrFieldChange();
}

function initDateDropdowns() {
    const customerPicker = document.getElementById('datePicker');
    const forumPicker = document.getElementById('forumDate');
    const options = { day: 'numeric', month: 'long' };

    for (let i = 0; i < 14; i++) {
        let d = new Date(); d.setDate(d.getDate() + i);
        let dateText = d.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
        let dayName = dayNamesMap[d.getDay()];
        [customerPicker, forumPicker].forEach(p => {
            let opt = document.createElement('option');
            opt.value = dateText; opt.text = dateText;
            opt.dataset.dayName = dayName;
            p.appendChild(opt);
        });
    }

    const forumHourSelect = document.getElementById('forumHour');
    masterHoursList.forEach(h => {
        let opt = document.createElement('option'); opt.value = h; opt.text = h;
        forumHourSelect.appendChild(opt);
    });

    // Filtre tarih ve saat selectlerini doldur
    const filterDate = document.getElementById('filterDate');
    const filterHour = document.getElementById('filterHour');
    if (filterDate) {
        for (let i = 0; i < 7; i++) {
            let d = new Date(); d.setDate(d.getDate() + i);
            let dateText = d.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
            let opt = document.createElement('option'); opt.value = dateText; opt.text = dateText;
            filterDate.appendChild(opt);
        }
    }
    if (filterHour) {
        masterHoursList.forEach(h => {
            let opt = document.createElement('option'); opt.value = h; opt.text = h;
            filterHour.appendChild(opt);
        });
    }
}

// =======================================================
// SAHALARI LİSTELEME (ÇİFT FİYAT GÖSTERİMİ)
// =======================================================
function renderFieldsGrid() {
    const grid = document.getElementById('fieldsGrid');
    const isMobile = window.innerWidth <= 768;

    grid.innerHTML = Object.keys(fieldsData).map(key => {
        const field = fieldsData[key];
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.coordinates)}`;

        // Çift fiyat gösterimi
        let priceHtml = '';
        if (field.pitchCount >= 2) {
            const pitch1 = pitchObjectsList.find(p => p.fieldKey === key && p.pitchNumber === 1);
            const pitch2 = pitchObjectsList.find(p => p.fieldKey === key && p.pitchNumber === 2);
            const p1Morning = pitch1 ? (pitch1.morningPrice || 2500) : 2500;
            const p1Evening = pitch1 ? (pitch1.eveningPrice || 3000) : 3000;
            const p2Morning = pitch2 ? (pitch2.morningPrice || 2500) : 2500;
            const p2Evening = pitch2 ? (pitch2.eveningPrice || 3000) : 3000;
            priceHtml = `
                <div class="price-detail-line"><span class="pitch-label">SAHA 1)</span> ${p1Morning}/${p1Evening} TL</div>
                <div class="price-detail-line"><span class="pitch-label">SAHA 2)</span> ${p2Morning}/${p2Evening} TL</div>
            `;
        } else {
            const pitch1 = pitchObjectsList.find(p => p.fieldKey === key && p.pitchNumber === 1);
            const p1Pricing = pitch1 ? `${pitch1.morningPrice || 2500}/${pitch1.eveningPrice || 3000}` : (field.pricing || '2500/3000');
            priceHtml = `<div class="price-detail-line"><span class="pitch-label">SAHA 1)</span> ${p1Pricing} TL</div>`;
        }

        const serviceStatus = (field.hasService || "Servis: Yok").toLowerCase().includes("var");
        const cleatsStatus = (field.cleats || "Krampon Kiralanmaz") === "Krampon Kiralanır";
        const showerStatus = (field.shower || "Duş Yok").toLowerCase().includes("var");
        const marketStatus = (field.market || "Market Yok").toLowerCase().includes("var");
        const refreshmentsText = field.refreshments ? `İKRAMLAR: ${field.refreshments.toLocaleUpperCase('tr-TR')}` : "";

        // Make nice badges
        const serviceBadge = serviceStatus 
            ? `<span class="detail-badge badge-yes">SERVİS ✅</span>` 
            : `<span class="detail-badge badge-no">SERVİS ❌</span>`;
            
        const cleatsBadge = cleatsStatus
            ? `<span class="detail-badge badge-yes">KRAMPON ✅</span>`
            : `<span class="detail-badge badge-no">KRAMPON ❌</span>`;
            
        const showerBadge = showerStatus
            ? `<span class="detail-badge badge-yes">DUŞ ✅</span>`
            : `<span class="detail-badge badge-no">DUŞ ❌</span>`;

        const marketBadge = marketStatus
            ? `<span class="detail-badge badge-yes">MARKET ✅</span>`
            : `<span class="detail-badge badge-no">MARKET ❌</span>`;

        const isBlacklisted = currentUser && userBlacklistedFields.includes(key);

        if (isMobile) {
            const cardClickHandler = isBlacklisted ? 'event.stopPropagation();' : "toggleMobileFieldCard('" + key + "')";
            return `
            <div class="field-card ${isBlacklisted ? 'banned-card' : ''}" id="card-${key}" onclick="${cardClickHandler}" style="${isBlacklisted ? 'cursor: not-allowed; opacity: 0.7; border-color: var(--danger-red);' : ''}">
                ${isBlacklisted ? '<div style="background: var(--danger-red); color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 0.85rem; text-align: center; margin-bottom: 10px; letter-spacing: 1px;">🚫 BANLANILDI</div>' : ''}
                <div class="field-card-header">
                    <h3>${field.name}</h3>
                </div>
                <div class="field-card-meta">
                    <a href="tel:${field.phone}" class="phone-link" onclick="event.stopPropagation();">${field.phone}</a>
                    <a href="${mapUrl}" target="_blank" class="map-link" onclick="event.stopPropagation();">HARİTADA GÖSTER</a>
                </div>
                <div class="field-card-collapse">
                    <div class="pitch-badges-row">
                        ${serviceBadge}
                        ${cleatsBadge}
                        ${showerBadge}
                        ${marketBadge}
                    </div>
                    ${refreshmentsText ? `<div class="refreshments-display">${refreshmentsText}</div>` : ''}
                    <div class="price-tag">${priceHtml}</div>
                </div>
                <div class="field-comments-section" onclick="event.stopPropagation()">
                    <div class="card-comments-toggle" onclick="toggleFieldCardReviews('${key}', event)">
                        YORUMLAR VE DEĞERLENDİRMELER 💬
                    </div>
                    <div id="field-reviews-container-${key}" class="field-reviews-inline-container" style="display:none; margin-top:6px;">
                        <div id="field-reviews-list-${key}" style="max-height: 180px; overflow-y: auto; margin-bottom: 6px; display: flex; flex-direction: column; gap: 5px;"></div>
                        <div style="display:flex; gap:6px; align-items:center;">
                            <input type="text" id="field-comment-text-${key}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="Yorum yaz..." \${loggedInUser ? '' : 'disabled'}>
                            <button style="padding:3px 8px; font-size:0.65rem; font-weight:700; border:none; border-radius:6px; background:var(--primary-green); color:#000; cursor:pointer; white-space:nowrap; font-family:'Montserrat',sans-serif;" onclick="submitFieldCardComment('${key}', event)" \${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            const cardClickHandler = isBlacklisted ? 'event.stopPropagation();' : ("selectField('" + key + "')");
            return `
            <div class="field-card ${isBlacklisted ? 'banned-card' : ''}" id="card-${key}" onclick="${cardClickHandler}" style="${isBlacklisted ? 'cursor: not-allowed; opacity: 0.7; border-color: var(--danger-red);' : ''}">
                ${isBlacklisted ? '<div style="background: var(--danger-red); color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 0.85rem; text-align: center; margin-bottom: 10px; letter-spacing: 1px;">🚫 BANLANILDI</div>' : ''}
                <div class="field-info-row">
                    <div class="field-main-details">
                        <h3>${field.name}</h3>
                        <div class="pitch-badges-row">
                            ${serviceBadge}
                            ${cleatsBadge}
                            ${showerBadge}
                            ${marketBadge}
                        </div>
                        ${refreshmentsText ? `<div class="refreshments-display">${refreshmentsText}</div>` : ''}
                    </div>
                    <div class="field-actions">
                        <a href="tel:${field.phone}" class="phone-link" onclick="event.stopPropagation();">${field.phone}</a>
                        <a href="${mapUrl}" target="_blank" class="map-link" onclick="event.stopPropagation();">HARİTADA GÖSTER</a>
                        <div class="price-tag">${priceHtml}</div>
                    </div>
                </div>
                <div class="card-comments-toggle" onclick="toggleFieldCardReviews('${key}', event)">
                    YORUMLAR VE DEĞERLENDİRMELER 💬 ▶
                </div>
                <div id="field-reviews-container-${key}" class="field-reviews-inline-container" style="display:none; margin-top:12px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;" onclick="event.stopPropagation()">
                    <div id="field-reviews-list-${key}" style="max-height: 250px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;"></div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="text" id="field-comment-text-${key}" class="form-control" style="flex:1; padding: 10px; font-size: 0.9rem;" placeholder="Yorum yaz..." \${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 10px; font-size:0.75rem; font-weight:700; border:none; border-radius:6px; background:var(--primary-green); color:#000; cursor:pointer; white-space:nowrap; font-family:'Montserrat',sans-serif;" onclick="submitFieldCardComment('${key}', event)" \${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
                    </div>
                </div>
            </div>`;
        }
    }).join('');
}

// =======================================================
// MOBİL KOMPAKT KART AÇ/KAPA
// =======================================================
function toggleMobileFieldCard(key) {
    if (window.innerWidth > 768) {
        selectField(key);
        return;
    }

    const card = document.getElementById('card-' + key);
    if (!card) return;

    if (card.classList.contains('active')) {
        closeMobileFieldPanel();
    } else {
        selectField(key);
    }
}

function closeMobileFieldPanel() {
    document.querySelectorAll('.field-card.active').forEach(c => c.classList.remove('active'));

    const panel = document.getElementById('customerBookingPanel');
    if (panel) {
        panel.classList.remove('mobile-open');
        panel.style.display = 'none';
    }

    const placeholder = document.getElementById('placeholderText');
    if (placeholder) placeholder.style.display = 'block';

    currentSelectedFieldKey = null;
    currentSelectedPitchNumber = null;
    currentSelectedHourBtn = null;
}

document.addEventListener('click', function(e) {
    if (window.innerWidth <= 768 && currentSelectedFieldKey) {
        const card = e.target.closest('.field-card');
        const panel = e.target.closest('.booking-panel');
        const fieldReviews = e.target.closest('.field-reviews-inline-container');
        const commentsToggle = e.target.closest('.card-comments-toggle');
        const modal = e.target.closest('.modal-overlay');
        if (!card && !panel && !fieldReviews && !commentsToggle && !modal) {
            closeMobileFieldPanel();
        }
    }
});

// =======================================================
// SAHA SEÇME & REZERVASYON
// =======================================================
function selectField(key) {
    if (currentUser && userBlacklistedFields.includes(key)) {
        alert("Bu hal� saha taraf�ndan engellendi�iniz i�in i�lem yapamazs�n�z!");
        return;
    }
    currentSelectedFieldKey = key;
    document.querySelectorAll('.field-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('card-' + key);
    if(card) card.classList.add('active');
    
    document.getElementById('placeholderText').style.display = 'none';
    const bookingPanel = document.getElementById('bookingPanel');
    bookingPanel.style.display = 'block';
    
    // Mobil i�in accordion etkisi (Saha kart�n�n alt�na ta��)
    if (window.innerWidth <= 768 && card) {
        const panel = document.getElementById('customerBookingPanel');
        panel.classList.add('mobile-open');
        card.parentNode.insertBefore(panel, card.nextSibling);
    } else {
        const layout = document.getElementById('customerBookingGridLayout');
        const panel = document.getElementById('customerBookingPanel');
        layout.appendChild(panel);
    }

    // Saha yorumlar�n� y�kle
    loadFieldReviews(key);

    const field = fieldsData[key];
    const pitchCount = field.pitchCount || 1;
    const selectorGroup = document.getElementById('pitchSelectorGroup');
    const selector = document.getElementById('pitchSelector');

    if (pitchCount === 1) {
        currentSelectedPitchNumber = 1;
        selectorGroup.style.display = 'none';
        selector.disabled = true;
        onDateOrFieldChange();
    } else {
        currentSelectedPitchNumber = null;
        selectorGroup.style.display = 'block';
        selector.disabled = false;
        selector.innerHTML = '<option value="">LÜTFEN SAHA SEÇİN...</option>';
        const fieldPitches = pitchObjectsList.filter(p => p.fieldKey === key);
        if (fieldPitches.length === 0) {
            [1, 2].forEach(n => { const opt = document.createElement('option'); opt.value = n; opt.text = `SAHA ${n}`; opt.dataset.pitchNumber = n; selector.appendChild(opt); });
        } else {
            fieldPitches.forEach(pitch => { const opt = document.createElement('option'); opt.value = pitch.id; opt.text = `SAHA ${pitch.pitchNumber}`; opt.dataset.pitchNumber = pitch.pitchNumber; selector.appendChild(opt); });
        }
        selector.onchange = function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && selectedOption.value) { currentSelectedPitchNumber = parseInt(selectedOption.dataset.pitchNumber); onDateOrFieldChange(); }
            else { currentSelectedPitchNumber = null; document.getElementById('hoursGrid').innerHTML = ""; document.getElementById('submitBtn').style.display = 'none'; }
        };
        document.getElementById('hoursGrid').innerHTML = "";
        document.getElementById('submitBtn').style.display = 'none';
    }
}

function getNextCalendarDayText(dateStr) {
    const d = parseTurkishDateString(dateStr);
    if (!d) return "";
    d.setDate(d.getDate() + 1);
    const options = { day: 'numeric', month: 'long' };
    return d.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
}

function getPreviousCalendarDayText(dateStr) {
    const d = parseTurkishDateString(dateStr);
    if (!d) return "";
    d.setDate(d.getDate() - 1);
    const options = { day: 'numeric', month: 'long' };
    return d.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
}

function onDateOrFieldChange() {
    try {
    if (!currentSelectedFieldKey) return;
    const alertZone = document.getElementById('authRequiredAlert');
    if (!alertZone) return;
    alertZone.style.display = loggedInUser ? 'none' : 'block';

    const datePicker = document.getElementById('datePicker');
    if (!datePicker) return;
    const dateText = datePicker.value;
    if (!dateText) return;
    const selectedOpt = datePicker.options[datePicker.selectedIndex];
    const dayOfWeek = selectedOpt ? selectedOpt.dataset.dayName : "";

    const field = fieldsData[currentSelectedFieldKey];
    if (!field) return;
    const grid = document.getElementById('hoursGrid');
    if (!grid) return;
    grid.innerHTML = ""; 
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) submitBtn.style.display = 'none';
    currentSelectedHourBtn = null;
    if (!currentSelectedPitchNumber) return;

    const pitch = pitchObjectsList.find(p => p.fieldKey === currentSelectedFieldKey && p.pitchNumber === currentSelectedPitchNumber) || field;
    const morningPrice = pitch.morningPrice || 2500;
    const eveningPrice = pitch.eveningPrice || 3000;
    const pricePreviewZone = document.getElementById('customerPricePreviewZone');
    if (pricePreviewZone) pricePreviewZone.style.display = 'block';
    const priceText = document.getElementById('customerPriceText');
    if (priceText) priceText.innerText = `Gündüz: ${morningPrice} TL / Akşam: ${eveningPrice} TL`;

    let aboneHours = pitch.aboneHours || [];
    let disabledHours = pitch.disabledHours || [];
    try { if (typeof aboneHours === 'string') aboneHours = JSON.parse(aboneHours || '[]'); } catch(e) { aboneHours = []; }
    try { if (typeof disabledHours === 'string') disabledHours = JSON.parse(disabledHours || '[]'); } catch(e) { disabledHours = []; }

    const dayToIdx = {
        "PAZAR": 0,
        "PAZARTESİ": 1,
        "SALI": 2,
        "ÇARŞAMBA": 3,
        "PERŞEMBE": 4,
        "CUMA": 5,
        "CUMARTESİ": 6
    };
    const dayIdx = dayToIdx[dayOfWeek];
    
    // Find daily hour setting
    const dailySetting = dailyHoursList.find(dh => dh.fieldKey === currentSelectedFieldKey && dh.dayOfWeek === dayIdx);
    const openHour = dailySetting ? dailySetting.openingHour : (pitch.openingHour || '15:00');
    const closeHour = dailySetting ? dailySetting.closingHour : (pitch.closingHour || '02:00');

    function timeToMins(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
    const openingMins = timeToMins(openHour);
    let closingMins = timeToMins(closeHour);
    if (closingMins <= openingMins) closingMins += 1440;

    const filteredHours = masterHoursList.filter(hour => {
        const slotStart = hour.split(' - ')[0];
        let slotStartMins = timeToMins(slotStart);
        if (slotStartMins < openingMins) slotStartMins += 1440;
        return slotStartMins >= openingMins && slotStartMins < closingMins;
    });

    // Chronologically sort based on adjusted minutes
    filteredHours.sort((a, b) => {
        const startA = a.split(' - ')[0];
        const startB = b.split(' - ')[0];
        let minsA = timeToMins(startA);
        let minsB = timeToMins(startB);
        if (minsA < openingMins) minsA += 1440;
        if (minsB < openingMins) minsB += 1440;
        return minsA - minsB;
    });

    filteredHours.forEach(hour => {
        const btn = document.createElement('button');
        btn.classList.add('hour-btn');
        btn.dataset.hour = hour;
        const hStartCheck = parseInt(hour.split(':')[0]);
        const nextDateText = hStartCheck < 6 ? getNextCalendarDayText(dateText) : null;
        const isTaken = userReservations.some(r => r.fieldKey === currentSelectedFieldKey && r.pitchNumber === currentSelectedPitchNumber && r.hourText === hour && (r.dateText === dateText || (nextDateText && r.dateText === nextDateText)));

        const hStart = parseInt(hour.split(':')[0]);
        const isNextDay = hStart < 6;
        const nextDayLabel = isNextDay ? `<span class="hour-next-day">${getNextCalendarDayText(dateText)}</span>` : "";

        const actualPlayDate = getActualPlayDate(dateText, hour);
        const effectiveDayOfWeek = (actualPlayDate && dayNamesMap) ? dayNamesMap[actualPlayDate.getDay()] : dayOfWeek;

        let isWeekdayClosed = false;
        try {
            const closedDaysArr = typeof pitch.closedDays === 'string' ? JSON.parse(pitch.closedDays || '[]') : (pitch.closedDays || []);
            if (Array.isArray(closedDaysArr) && closedDaysArr.includes(effectiveDayOfWeek)) {
                isWeekdayClosed = true;
            }
        } catch(e) {}

        // Geçmiş saat kontrolü: slot başlangıç saati geçtiyse gri yap
        const now = new Date();
        let isPastSlot = false;
        if (actualPlayDate && actualPlayDate.toDateString() === now.toDateString()) {
            const slotStart = hour.split(' - ')[0];
            const [startH, startM] = slotStart.split(':').map(Number);
            const slotStartDate = new Date(actualPlayDate);
            slotStartDate.setHours(startH, startM, 0, 0);
            if (slotStartDate <= now) isPastSlot = true;
        }

        if (isTaken) {
            btn.classList.add('locked');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(DOLU)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (aboneHours.includes(`${effectiveDayOfWeek} ${hour}`)) {
            btn.classList.add('abone-state');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(ABONE)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (isPastSlot) {
            btn.classList.add('past-state');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(GEÇTİ)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (pitch.isClosed === 1 || pitch.isClosed === true || isWeekdayClosed) {
            btn.classList.add('closed-state');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(KAPALI)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (disabledHours.includes(hour)) {
            btn.classList.add('locked');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(DOLU)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else {
            btn.classList.add('available');
            btn.innerHTML = `<span class="hour-time">${hour}</span><span class="hour-status">(BOS)</span>${nextDayLabel}`;
            if (loggedInUser) {
                btn.onclick = async function() {
                    if (currentSelectedHourBtn) { currentSelectedHourBtn.classList.remove('selected'); currentSelectedHourBtn.classList.add('available'); }
                    currentSelectedHourBtn = btn; btn.classList.remove('available'); btn.classList.add('selected');
                    document.getElementById('submitBtn').style.display = 'block';
                    const turnstileCont = document.getElementById('turnstileContainer');
                    if (turnstileCont) {
                        turnstileCont.style.display = 'block';
                        await loadTurnstileScript();
                        if (typeof turnstile !== 'undefined') {
                            turnstile.reset('#bookingTurnstile');
                        }
                    }
                };
            }
        }
        grid.appendChild(btn);
    });
    } catch(e) { console.error("onDateOrFieldChange hatası:", e); alert("Saatler yüklenirken hata: " + e.message); }
}

async function completeBooking() {
    if (!loggedInUser || !currentUser || !currentSelectedFieldKey || !currentSelectedHourBtn || !currentSelectedPitchNumber) {
        alert("Lütfen giriş yapın ve saha seçin."); return;
    }
    const hour = currentSelectedHourBtn.dataset.hour;
    const dateText = document.getElementById('datePicker').value;

    // Aynı gün en fazla 3 (iptal dahil sunucu tarafında kontrol edilir), toplamda en fazla 2 aktif rezervasyon
    // NOT: Günlük limit kontrolü sunucu tarafında iptal edilenler dahil yapılır.
    // Client tarafında sadece aktif verilere dayalı ön kontrol yapılır.
    const userActiveRes = userReservations.filter(r => parseInt(r.user_id) === parseInt(currentUser.id));
    
    // 1. Aynı Gün İçin Ön Kontrol (Maks 3 - asıl kontrol sunucuda)
    const newPlayDate = getActualPlayDate(dateText, hour);
    const sameDayCount = userActiveRes.filter(r => {
        const playDate = getActualPlayDate(r.dateText, r.hourText);
        return playDate && newPlayDate && playDate.toDateString() === newPlayDate.toDateString();
    }).length;
    if (sameDayCount >= 3) {
        alert("Günlük rezervasyon hakkınız dolmuştur! Bir gün için en fazla 3 rezervasyon yapabilirsiniz.");
        return;
    }

    // 2. İleriye Dönük Aktif Rezervasyon Limiti (Maks 2)
    const now = new Date();
    const activeFutureCount = userActiveRes.filter(r => {
        const playDate = getActualPlayDate(r.dateText, r.hourText);
        if (!playDate) return false;
        const hourPart = r.hourText.split(' - ')[1] || '23:59';
        const [h, m] = hourPart.split(':').map(Number);
        playDate.setHours(h, m, 0, 0);
        return playDate.getTime() >= now.getTime();
    }).length;

    if (activeFutureCount >= 2) {
        alert("Aktif rezervasyon limitinize ulaştınız! Aynı anda en fazla 2 aktif rezervasyonunuz olabilir.");
        return;
    }

    let turnstileToken = latestTurnstileToken;
    if (typeof turnstile !== 'undefined') {
        const widgetToken = turnstile.getResponse();
        if (widgetToken) turnstileToken = widgetToken;
    }
    if (!turnstileToken) {
        alert("Lütfen güvenlik doğrulamasını (Turnstile) tamamlayın!");
        return;
    }
    
    // Fiyatı hesapla
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentSelectedFieldKey && p.pitchNumber === currentSelectedPitchNumber) || fieldsData[currentSelectedFieldKey];
    const morningPrice = pitch.morningPrice || 2500;
    const eveningPrice = pitch.eveningPrice || 3000;
    const slotStartHour = parseInt(hour.split(':')[0]);
    const isEvening = slotStartHour >= 17 || slotStartHour < 6;
    const price = isEvening ? eveningPrice : morningPrice;
    
    const bookingData = { 
        fieldKey: currentSelectedFieldKey, 
        pitchNumber: currentSelectedPitchNumber, 
        dateText, 
        hourText: hour, 
        user_name: loggedInUser,
        user_id: currentUser.id,
        user_phone: currentUser.phone,
        reservation_price: price,
        turnstileToken: turnstileToken
    };

    const field = fieldsData[currentSelectedFieldKey] || { name: currentSelectedFieldKey.toLocaleUpperCase('tr-TR'), address: "" };
    document.getElementById('bookingConfirmField').textContent = `${field.name.toLocaleUpperCase('tr-TR')} - SAHA ${currentSelectedPitchNumber}`;
    document.getElementById('bookingConfirmDate').textContent = dateText;
    document.getElementById('bookingConfirmHour').textContent = hour;
    document.getElementById('bookingConfirmPrice').textContent = `${price} TL`;

    pendingBookingData = bookingData;
    openModal('bookingConfirmModal');
}

async function executePendingBooking() {
    if (!pendingBookingData) return;
    const data = pendingBookingData;
    pendingBookingData = null;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/reservations', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            if (typeof turnstile !== 'undefined') {
                turnstile.reset('#bookingTurnstile');
                latestTurnstileToken = "";
            }
            const turnstileCont = document.getElementById('turnstileContainer');
            if (turnstileCont) turnstileCont.style.display = 'none';

            userReservations.push({ 
                id: result.id || Date.now(),
                fieldKey: data.fieldKey, 
                pitchNumber: data.pitchNumber, 
                dateText: data.dateText, 
                hourText: data.hourText, 
                user_name: data.user_name,
                user_id: data.user_id,
                reservation_price: data.reservation_price,
                payment_status: 'odenmedi'
            });
            
            const field = fieldsData[data.fieldKey] || { name: data.fieldKey.toLocaleUpperCase('tr-TR'), address: "" };

            document.getElementById('successFieldName').innerText = `${field.name.toLocaleUpperCase('tr-TR')} - SAHA ${data.pitchNumber}`;
            document.getElementById('successFieldAddress').innerText = field.address.toLocaleUpperCase('tr-TR');
            document.getElementById('successBookingTime').innerText = `${data.dateText} | ${data.hourText}`;
            document.getElementById('successBookingPrice').innerText = `${data.reservation_price} TL`;

            openModal('bookingSuccessModal');
            onDateOrFieldChange();
        } else {
            if (response.status === 403) {
                showStyledError(result.message || 'Bu işlem için yetkiniz bulunmamaktadır!');
            } else {
                alert("Hata: " + result.message);
            }
        }
    } catch (error) { console.error("Rezervasyon bağlantı hatası:", error); showStyledError("Rezervasyon veritabanına kaydedilemedi!"); }
}

function closeBookingConfirmModal(confirmed) {
    closeModal('bookingConfirmModal');
    if (confirmed) {
        executePendingBooking();
    } else {
        pendingBookingData = null;
    }
}

// =======================================================
// FORUM: OYUNCU ARANIYOR
// =======================================================
async function loadReservationsFromServer() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/reservations');
        const result = await response.json();
        if (result.success) {
            userReservations = result.data.filter(r => r.status !== 'cancelled');
            if (currentSelectedFieldKey) onDateOrFieldChange();
        }
    } catch (error) { console.error("Dolu saatler veritabanından çekilemedi:", error); }
}

async function loadForumPostsFromServer() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/forum');
        const result = await response.json();
        if (result.success) {
            forumPosts = result.data;
            renderForumWall();
        }
    } catch (error) { console.error("Forum verileri çekilemedi:", error); }
}

async function createForumPost() {
    if (!loggedInUser || !currentUser) {
        alert("Lütfen ilan yayınlamak için giriş yapın!");
        openModal('loginModal');
        return;
    }
    const date = document.getElementById('forumDate').value;
    const hour = document.getElementById('forumHour').value;
    const pos = document.getElementById('forumPosition').value;
    const payment = document.getElementById('forumPayment').value;
    const phone = document.getElementById('forumPhone')?.value?.trim() || null;
    const msg = document.getElementById('forumMessage').value.trim() || "EKİP TAMAMLANIYOR.";

    try {
        const response = await fetch('http://127.0.0.1:5000/api/forum', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateText: date, hourText: hour, position: pos, payment, phone, msg, user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("İlanınız başarıyla yayınlandı!");
            if (document.getElementById('forumPhone')) document.getElementById('forumPhone').value = "";
            document.getElementById('forumMessage').value = "";
            await loadForumPostsFromServer();
        } else { alert("Hata: " + result.message); }
    } catch (error) { alert("Sunucuya bağlanılamadı!"); }
}

function renderForumWall() {
    const container = document.getElementById('postsContainer');
    if (!container) return;

    const now = new Date();
    const activePosts = forumPosts.filter(post => {
        const postDateTime = parseReservationDateTime(post.dateText, post.hourText);
        if (!postDateTime) return true;
        return postDateTime >= now;
    });

    if (activePosts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Aktif ilan bulunmamaktadır.</p>';
        return;
    }

        container.innerHTML = activePosts.map(post => {
    const isOwner = currentUser && post.user_id && post.user_id === currentUser.id;
    const foundBadge = post.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">ANLA�MA SA�LANDI</div>' : '';
    return `
    <div class="post-card" id="forum-post-${post.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px;">
        <!-- Tarih (Sol �st) -->
        <div style="grid-column: 1; grid-row: 1; font-size: 0.85rem; color: var(--text-muted);">
            ${post.dateText} - ${post.hourText}
        </div>
        
        <!-- Aran�lan Mevki (Sa� �st) -->
        <div style="grid-column: 2; grid-row: 1; text-align: right;">
            <span class="post-pos-badge" style="font-size: 0.75rem; padding: 2px 6px;">ARANAN: ${post.position}</span>
        </div>
        
        <!-- Detaylar (Sol Alt) -->
        <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
            <div style="color: var(--neon-green); font-weight: bold;">DURUM: ${post.payment}</div>
            <div style="font-style: italic;">"${(post.msg || '').toLocaleUpperCase('tr-TR')}"</div>
        </div>
        
        <!-- Butonlar (Sa� Alt) -->
        <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
            ${foundBadge}
            ${isOwner && post.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markForumFound(${post.id})">BULUNDU</button>' : ''}
        </div>

        <!-- Yorumlar -->
        <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
            <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('forum', ${post.id})">
                �LET���M / YORUMLAR
            </div>
            <div id="forum-comments-forum-${post.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                <div id="forum-comments-list-forum-${post.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                <div style="display:flex;gap:5px;align-items:center;">
                    <input type="text" id="forum-comment-text-${post.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yaz�l�r...' : 'Giri� yap�n...'}" ${loggedInUser ? '' : 'disabled'}>
                    <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('forum', ${post.id})" ${loggedInUser ? '' : 'disabled'}>G�NDER</button>
                </div>
            </div>
        </div>
    </div>
    `;
}).join('');
}

// =======================================================
// FORUM: MAÇ ARANIYOR
// =======================================================
function initMatchSeekerForm() {
    const dateGrid = document.getElementById('matchDateCheckboxes');
    const hourGrid = document.getElementById('matchHourCheckboxes');
    if (!dateGrid || !hourGrid) return;

    // 7 günlük tarih checkboxları
    const options = { day: 'numeric', month: 'long' };
    for (let i = 0; i < 7; i++) {
        let d = new Date(); d.setDate(d.getDate() + i);
        let dateText = d.toLocaleDateString('tr-TR', options).toLocaleUpperCase('tr-TR');
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        label.innerHTML = `<input type="checkbox" value="${dateText}" onchange="this.parentElement.classList.toggle('checked', this.checked)"> ${dateText}`;
        dateGrid.appendChild(label);
    }

    // 17-18 den gece 01-02 dahil olacak şekilde saatler
    const popularHours = [
        "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00", 
        "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", 
        "21:00 - 22:00", "22:00 - 23:00", "23:00 - 00:00", 
        "00:00 - 01:00", "01:00 - 02:00"
    ];
    popularHours.forEach(h => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        label.innerHTML = `<input type="checkbox" value="${h}" onchange="this.parentElement.classList.toggle('checked', this.checked)"> ${h}`;
        hourGrid.appendChild(label);
    });
}

function initTeamSeekerForm() {
    const dayGrid = document.getElementById('teamDayCheckboxes');
    const hourGrid = document.getElementById('teamHourCheckboxes');
    if (!dayGrid) return;

    const days = ['PAZARTESİ','SALI','ÇARŞAMBA','PERŞEMBE','CUMA','CUMARTESİ','PAZAR'];
    days.forEach(day => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';
        label.innerHTML = `<input type="checkbox" value="${day}" onchange="this.parentElement.classList.toggle('checked', this.checked)"> ${day}`;
        dayGrid.appendChild(label);
    });

    if (hourGrid) {
        const popularHours = [
            "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00", 
            "18:00 - 19:00", "19:00 - 20:00", "20:00 - 21:00", 
            "21:00 - 22:00", "22:00 - 23:00", "23:00 - 00:00", 
            "00:00 - 01:00", "01:00 - 02:00"
        ];
        popularHours.forEach(h => {
            const label = document.createElement('label');
            label.className = 'checkbox-item';
            label.innerHTML = `<input type="checkbox" value="${h}" onchange="this.parentElement.classList.toggle('checked', this.checked)"> ${h}`;
            hourGrid.appendChild(label);
        });
    }
}

async function createTeamSeeker() {
    if (!loggedInUser || !currentUser) {
        alert("Lütfen ilan yayınlamak için giriş yapın!");
        openModal('loginModal');
        return;
    }

    const teamName = document.getElementById('teamName').value.trim();
    const ageGroup = document.getElementById('teamAgeGroup').value;
    const matchSize = document.getElementById('teamMatchSize').value;
    const skillLevel = document.getElementById('teamSkillLevel').value;
    const hourCheckboxes = document.querySelectorAll('#teamHourCheckboxes input[type="checkbox"]:checked');
    const timeRange = JSON.stringify(Array.from(hourCheckboxes).map(cb => cb.value));
    const captainName = document.getElementById('teamCaptainName').value.trim();
    const message = document.getElementById('teamMessage').value.trim();

    const dayCheckboxes = document.querySelectorAll('#teamDayCheckboxes input[type="checkbox"]:checked');
    const availableDays = Array.from(dayCheckboxes).map(cb => cb.value);

    if (!teamName) { alert("Lütfen takım adını girin!"); document.getElementById('teamName').focus(); return; }
    if (!ageGroup) { alert("Lütfen yaş ortalaması seçin!"); return; }
    if (!matchSize) { alert("Lütfen maç boyutunu seçin!"); return; }
    if (!skillLevel) { alert("Lütfen oyun seviyesi seçin!"); return; }
    if (!captainName) { alert("Lütfen kaptan adını girin!"); document.getElementById('teamCaptainName').focus(); return; }
    if (availableDays.length === 0) { alert("Lütfen en az bir müsait gün seçin!"); return; }
    if (hourCheckboxes.length === 0) { alert("Lütfen en az bir müsait saat seçin!"); return; }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/team-seekers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teamName, ageGroup, matchSize, skillLevel,
                availableDays: JSON.stringify(availableDays),
                timeRange, captainName, message,
                user_id: currentUser.id
            })
        });
        const result = await response.json();
        if (result.success) {
            alert("Takım arama ilanı başarıyla oluşturuldu!");
            document.getElementById('teamName').value = "";
            document.getElementById('teamAgeGroup').value = "";
            document.getElementById('teamMatchSize').value = "";
            document.getElementById('teamSkillLevel').value = "";
            document.querySelectorAll('#teamHourCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.parentElement.classList.remove('checked'); });
            document.getElementById('teamCaptainName').value = "";
            document.getElementById('teamMessage').value = "";
            document.querySelectorAll('#teamDayCheckboxes input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });
            await loadTeamSeekers();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Takım ilanı oluşturma hatası:", error);
        alert("Takım ilanı oluşturulamadı!");
    }
}

async function createMatchSeeker() {
    if (!loggedInUser || !currentUser) {
        alert("Lütfen ilan yayınlamak için giriş yapın!");
        openModal('loginModal');
        return;
    }
    const playerName = document.getElementById('matchName').value.trim();
    const age = document.getElementById('matchAge').value;
    const height = document.getElementById('matchHeight').value.trim();
    const weight = document.getElementById('matchWeight').value.trim();
    const position = document.getElementById('matchPosition').value;
    const phone = document.getElementById('matchPhone').value.trim() || null;
    const requestedFee = document.getElementById('matchFee').value;
    const msg = document.getElementById('matchMsg').value.trim();

    const dateCheckboxes = document.querySelectorAll('#matchDateCheckboxes input[type="checkbox"]:checked');
    const availableDates = Array.from(dateCheckboxes).map(cb => cb.value);

    const hourCheckboxes = document.querySelectorAll('#matchHourCheckboxes input[type="checkbox"]:checked');
    const availableHours = Array.from(hourCheckboxes).map(cb => cb.value);

    if (!playerName || !age) { alert("Lütfen Ad Soyad ve Yaş alanlarını doldurun!"); return; }
    if (availableDates.length === 0) { alert("Lütfen en az bir müsait tarih seçin!"); return; }
    if (availableHours.length === 0) { alert("Lütfen en az bir müsait saat seçin!"); return; }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/match-seekers', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, age: parseInt(age), height: height ? parseInt(height) : null, weight: weight ? parseInt(weight) : null, position, phone, availableHours: JSON.stringify(availableHours), availableDates: JSON.stringify(availableDates), requestedFee, msg, user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("Maç arama ilanınız başarıyla yayınlandı!");
            document.getElementById('matchName').value = "";
            document.getElementById('matchAge').value = "";
            document.getElementById('matchHeight').value = "";
            document.getElementById('matchWeight').value = "";
            document.getElementById('matchPhone').value = "";
            document.getElementById('matchMsg').value = "";
            document.querySelectorAll('#matchDateCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.parentElement.classList.remove('checked'); });
            document.querySelectorAll('#matchHourCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = false; cb.parentElement.classList.remove('checked'); });
            await loadMatchSeekers();
        } else { alert("Hata: " + result.message); }
    } catch (error) { console.error("Maç ilanı oluşturma hatası:", error); alert("Sunucuya bağlanılamadı!"); }
}

async function loadMatchSeekers() {
    const container = document.getElementById('matchSeekersContainer');
    if (!container) return;

    const params = new URLSearchParams();
    const position = document.getElementById('filterPosition')?.value;
    const minAge = document.getElementById('filterMinAge')?.value;
    const maxAge = document.getElementById('filterMaxAge')?.value;
    const date = document.getElementById('filterDate')?.value;
    const hour = document.getElementById('filterHour')?.value;
    const feeFilter = document.getElementById('filterFee')?.value;

    if (position) params.append('position', position);
    if (minAge) params.append('minAge', minAge);
    if (maxAge) params.append('maxAge', maxAge);
    if (date) params.append('date', date);
    if (hour) params.append('hour', hour);
    if (feeFilter) params.append('maxFee', feeFilter);

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/match-seekers?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            const seekers = result.data;
            if (seekers.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Filtrelere uygun ilan bulunamadı.</p>';
                return;
            }

            container.innerHTML = seekers.map(s => {
        let dates = [], hours = [];
        try { dates = JSON.parse(s.availableDates || '[]'); } catch(e) {}
        try { hours = JSON.parse(s.availableHours || '[]'); } catch(e) {}
        let feeText = s.requestedFee;
        if (feeText && !isNaN(feeText)) feeText = feeText + ' TL';
        const avgRating = parseFloat(s.averageRating) || 0;
        const reviewCount = parseInt(s.reviewCount) || 0;
        const ratingHtml = reviewCount > 0 ? `<span style="color:#fbbf24; font-weight:700; font-size:0.75rem;">? ${avgRating.toFixed(1)} (${reviewCount} Oy)</span>` : `<span style="color:var(--text-muted); font-size:0.7rem;">? Yeni Oyuncu</span>`;
        const isOwner = currentUser && s.user_id && s.user_id === currentUser.id;
        const foundBadge = s.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">ANLA�MA SA�LANDI</div>' : '';
        const posClass = s.position.replace(/\s+/g, '-');
        
        return `
        <div class="match-seeker-card" id="match-post-${s.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px; background: #1f2937; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 12px;">
            <!-- Top Left: Date/Time -->
            <div style="grid-column: 1; grid-row: 1; font-size: 0.8rem; color: var(--text-muted); display:flex; gap:4px; flex-wrap:wrap;">
                ${dates.map(d => `<span class="match-tag date-tag" style="padding:2px 4px;font-size:0.7rem;">${d}</span>`).join('')}
                ${hours.map(h => `<span class="match-tag hour-tag" style="padding:2px 4px;font-size:0.7rem;">${h}</span>`).join('')}
            </div>
            
            <!-- Top Right: Position -->
            <div style="grid-column: 2; grid-row: 1; text-align: right;">
                <span class="match-tag position ${posClass}" style="padding:2px 6px; font-size:0.75rem;">${s.position}</span>
            </div>
            
            <!-- Bottom Left: Details -->
            <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight:bold;">${s.playerName} <span style="color:var(--text-muted); font-weight:normal; font-size:0.75rem;">(${s.age} Ya�${s.height ? `, ${s.height}cm` : ''}${s.weight ? `, ${s.weight}kg` : ''})</span></div>
                ${ratingHtml}
                <div style="color:var(--neon-green); font-size:0.75rem;">${feeText ? '�CRET: ' + feeText : '�CRETS�Z'}</div>
                ${s.msg ? `<div style="font-style:italic; font-size:0.75rem;">"${s.msg.toLocaleUpperCase('tr-TR')}"</div>` : ''}
            </div>
            
            <!-- Bottom Right: Buttons -->
            <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
                ${foundBadge}
                ${isOwner && s.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markMatchFound(' + s.id + ')">BULUNDU</button>' : ''}
                <button class="profile-btn" style="padding:4px 12px;font-size:0.75rem;border-radius:4px;" onclick="openPlayerProfile('${s.phone || ''}', '${s.playerName.replace(/'/g, "\\'")}', ${s.age}, '${s.position}')">PROF�L</button>
            </div>
            
            <!-- Comments -->
            <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('match_seeker', ${s.id})">�LET���M / YORUMLAR</div>
                <div id="forum-comments-match_seeker-${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-match_seeker-${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yaz�l�r...' : 'Giri� yap�n...'}" ${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('match_seeker', ${s.id})" ${loggedInUser ? '' : 'disabled'}>G�NDER</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
        }
    } catch (error) { console.error("Maç arayanlar yüklenemedi:", error); }
}

// =======================================================
// FORUM: TAKIM ARA (TEAM SEEKERS)
// =======================================================
async function loadTeamSeekers() {
    const container = document.getElementById('teamSeekersContainer');
    if (!container) return;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/team-seekers');
        const result = await response.json();

        if (result.success) {
            const seekers = result.data;
            container.innerHTML = seekers.map(s => {
        const isOwner = loggedInUser && currentUser && parseInt(s.user_id) === parseInt(currentUser.id);
        let days = []; try { days = JSON.parse(s.availableDays || '[]'); } catch(e) { days = []; }
        let hours = []; try { hours = JSON.parse(s.timeRange || '[]'); if (!Array.isArray(hours)) hours = [s.timeRange]; } catch(e) { if (s.timeRange) hours = [s.timeRange]; else hours = []; }
        const foundBadge = s.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">TAKIM BULUNDU</div>' : '';
        
        return `
        <div class="team-seeker-card" id="team-post-${s.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px; background: #1f2937; border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; margin-bottom: 12px;">
            <!-- Top Left: Days/Hours -->
            <div style="grid-column: 1; grid-row: 1; font-size: 0.8rem; color: var(--text-muted); display:flex; gap:4px; flex-wrap:wrap;">
                ${days.map(d => `<span class="team-tag date-tag" style="padding:2px 4px;font-size:0.7rem;">${d}</span>`).join('')}
                ${hours.map(h => `<span class="team-tag hour-tag" style="padding:2px 4px;font-size:0.7rem;">${h}</span>`).join('')}
            </div>
            
            <!-- Top Right: Location -->
            <div style="grid-column: 2; grid-row: 1; text-align: right;">
                <span class="team-tag location-tag" style="padding:2px 6px; font-size:0.75rem;">${s.location || 'FARK ETMEZ'}</span>
            </div>
            
            <!-- Bottom Left: Details -->
            <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-weight:bold; color:var(--neon-green);">${s.teamName}</div>
                <div style="font-size:0.75rem;">KAPTAN: ${s.captainName}</div>
                <div style="display:flex; gap:4px; margin-top:2px;">
                    <span class="team-tag size-tag" style="padding:2px 4px;font-size:0.7rem;">${s.matchSize}</span>
                    <span class="team-tag age-tag" style="padding:2px 4px;font-size:0.7rem;">${s.ageGroup}</span>
                </div>
                ${s.msg ? `<div style="font-style:italic; font-size:0.75rem; margin-top:4px;">"${s.msg.toLocaleUpperCase('tr-TR')}"</div>` : ''}
            </div>
            
            <!-- Bottom Right: Buttons -->
            <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
                ${foundBadge}
                ${isOwner && s.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markTeamFound(' + s.id + ')">BULUNDU</button>' : ''}
            </div>
            
            <!-- Comments -->
            <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('team_seeker', ${s.id})">�LET���M / YORUMLAR</div>
                <div id="forum-comments-team_seeker-${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-team_seeker-${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yaz�l�r...' : 'Giri� yap�n...'}" ${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('team_seeker', ${s.id})" ${loggedInUser ? '' : 'disabled'}>G�NDER</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
        }
    } catch (error) { console.error("Takım arayanlar yüklenemedi:", error); }
}

async function markTeamFound(id) {
    const confirmed = await showConfirmModal("Bu ilanı 'Bulundu' olarak işaretlemek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/team-seekers/${id}/found`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("İlan 'Bulundu' olarak işaretlendi!");
            await loadTeamSeekers();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Takım ilanı güncelleme hatası:", error);
    }
}

// =======================================================
// OYUNCU PUANLAMA & SEKME / OAUTH YARDIMCILARI
// =======================================================
let currentActiveProfilePhone = "";

function updateLoginUIVisibility() {
    const playersLock = document.getElementById('playersFormLock');
    const matchesLock = document.getElementById('matchesFormLock');
    const teamsLock = document.getElementById('teamsFormLock');

    if (loggedInUser) {
        document.getElementById('userAuthSection').style.display = 'none';
        document.getElementById('businessAuthSection').style.display = 'none';
        document.getElementById('userLogoutSection').style.display = 'flex';
        document.getElementById('welcomeText').innerText = `HOŞ GELDİN: ${loggedInUser}`;
        
        if (playersLock) playersLock.style.display = 'none';
        if (matchesLock) matchesLock.style.display = 'none';
        if (teamsLock) teamsLock.style.display = 'none';
        
        const addRev = document.getElementById('addReviewSection');
        const authAlert = document.getElementById('reviewAuthAlert');
        if (addRev) addRev.style.display = 'block';
        if (authAlert) authAlert.style.display = 'none';
    } else {
        document.getElementById('userAuthSection').style.display = 'flex';
        document.getElementById('businessAuthSection').style.display = 'flex';
        document.getElementById('userLogoutSection').style.display = 'none';
        document.getElementById('welcomeText').innerText = "";
        
        if (playersLock) playersLock.style.display = 'flex';
        if (matchesLock) matchesLock.style.display = 'flex';
        if (teamsLock) teamsLock.style.display = 'flex';

        const addRev = document.getElementById('addReviewSection');
        const authAlert = document.getElementById('reviewAuthAlert');
        if (addRev) addRev.style.display = 'none';
        if (authAlert) authAlert.style.display = 'block';
    }
}

function openOAuth(provider) {
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    const url = provider === 'google' ? 'google_login.html' : 'apple_login.html';
    window.open(url, `${provider} Login`, `width=${width},height=${height},top=${top},left=${left}`);
}

window.addEventListener('message', async function(event) {
    if (event.data && event.data.type === 'oauth-success') {
        const user = event.data.user;
        currentUser = user;
        loggedInUser = user.name.toLocaleUpperCase('tr-TR');
        
        await loadUserBlacklist();
        renderFieldsGrid();
        
        closeModal('loginModal');
        closeModal('registerModal');
        
        updateLoginUIVisibility();
        
        if (currentSelectedFieldKey) onDateOrFieldChange();
        fillFormsFromProfile();
    }
});

function switchCustomerTab(tabName) {
    document.querySelectorAll('.customer-tab-content').forEach(zone => {
        zone.style.display = 'none';
    });
    document.getElementById('customer-tab-' + tabName).style.display = 'block';
    
    document.querySelectorAll('#customerTabsRow .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById('customer-tab-btn-' + tabName).classList.add('active');
    
    if (window.innerWidth <= 768) {
        ['playersFormContainer', 'matchesFormContainer', 'teamsFormContainer'].forEach(formId => {
            const form = document.getElementById(formId);
            if (form && form.style.display === 'block') {
                form.style.display = 'none';
                form.classList.remove('anim-slide-fade-in', 'anim-slide-fade-out');
                const btn = form.nextElementSibling?.querySelector('.mobile-create-btn');
                if (btn) btn.innerText = '+ �lan Ver';
            }
        });
    }
}

function selectRatingStar(val) {
    document.querySelectorAll('#ratingStarsSelect .star-option').forEach((star, idx) => {
        if (idx < val) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    document.getElementById('reviewRatingInput').value = val;
}

async function openPlayerProfile(phone, name, age, position) {
    currentActiveProfilePhone = phone;
    document.getElementById('profilePlayerName').innerText = name.toLocaleUpperCase('tr-TR');
    document.getElementById('profilePlayerSubText').innerText = `${age} YAŞ | MEVKİ: ${position}`;
    
    await loadPlayerReviews(phone);
    
    selectRatingStar(5);
    document.getElementById('reviewCommentInput').value = "";
    
    updateLoginUIVisibility();
    
    openModal('playerProfileModal');
}

async function loadPlayerReviews(phone) {
    const reviewsContainer = document.getElementById('playerReviewsContainer');
    if (!reviewsContainer) return;
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/player-reviews/${phone}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            document.getElementById('profileAvgStars').innerText = `${data.averageRating.toFixed(1)} ⭐`;
            document.getElementById('profileReviewCount').innerText = `${data.reviewCount} Değerlendirme`;
            
            if (data.reviews.length === 0) {
                reviewsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Henüz değerlendirme yapılmamış.</p>';
            } else {
                reviewsContainer.innerHTML = data.reviews.map(r => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-user">${r.reviewerName.toLocaleUpperCase('tr-TR')}</span>
                            <span class="review-stars">${'⭐'.repeat(r.rating)}</span>
                        </div>
                        <div class="review-comment">"${r.comment}"</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error("Yorumlar çekilemedi:", error);
    }
}

async function submitPlayerReview() {
    const rating = document.getElementById('reviewRatingInput').value;
    const comment = document.getElementById('reviewCommentInput').value.trim();
    if (!loggedInUser) {
        alert("Puanlama yapmak için giriş yapmalısınız!");
        return;
    }
    if (!currentActiveProfilePhone) return;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/player-reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerPhone: currentActiveProfilePhone,
                reviewerName: loggedInUser,
                rating: parseInt(rating),
                comment: comment || 'OYUNCUYU DEĞERLENDİRDİ.'
            })
        });
        const result = await response.json();
        if (result.success) {
            alert("Değerlendirmeniz başarıyla yayınlandı!");
            await loadPlayerReviews(currentActiveProfilePhone);
            await loadMatchSeekers();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Yorum gönderme hatası:", error);
        alert("Değerlendirme kaydedilemedi!");
    }
}

// =======================================================
// MODAL FONKSİYONLARI
// =======================================================
function openModal(id) {
    document.getElementById(id).classList.add('open');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

let confirmResolve = null;

function showConfirmModal(message) {
    return new Promise((resolve) => {
        document.getElementById('confirmModalMessage').textContent = message;
        confirmResolve = resolve;
        openModal('confirmModal');
    });
}

window.closeConfirmModal = function(result) {
    closeModal('confirmModal');
    if (confirmResolve) {
        confirmResolve(result);
        confirmResolve = null;
    }
};

// =======================================================
// KULLANICI PROFİL PANELİ MANTIĞI
// =======================================================

async function openProfilePanel() {
    if (!currentUser) {
        alert("Lütfen profilinizi görüntülemek için giriş yapınız.");
        return;
    }
    
    // Fill editing form fields
    document.getElementById('profileNameInput').value = currentUser.name || "";
    document.getElementById('profilePhoneInput').value = currentUser.phone || "";
    document.getElementById('profileAgeInput').value = currentUser.age || "";
    document.getElementById('profilePositionInput').value = currentUser.position || "";
    document.getElementById('profileExperienceInput').value = currentUser.experience || "";
    
    // Switch to active reservations tab by default
    switchProfileSection('active-res');
    
    // Load lists
    await loadProfileReservations();
    loadProfileReviews();
    
    openModal('userProfileModal');
}

function switchProfileSection(sec) {
    document.querySelectorAll('.profile-tab-content-zone').forEach(zone => {
        zone.style.display = 'none';
    });
    const selectedZone = document.getElementById(`profile-sec-${sec}`);
    if (selectedZone) selectedZone.style.display = 'block';
    
    document.querySelectorAll('.profile-tabs .profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const selectedBtn = document.getElementById(`profile-tab-btn-${sec}`);
    if (selectedBtn) selectedBtn.classList.add('active');
}

function formatPhoneForWhatsApp(phone) {
    if (!phone) return "";
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // If it starts with 90 and has 12 digits, it's correct
    if (cleaned.startsWith('90') && cleaned.length === 12) {
        return cleaned;
    }
    // If it starts with 0 and has 11 digits (e.g. 05551234567), remove 0 and prepend 90
    if (cleaned.startsWith('0') && cleaned.length === 11) {
        return '90' + cleaned.slice(1);
    }
    // If it has 10 digits (e.g. 5551234567), prepend 90
    if (cleaned.length === 10) {
        return '90' + cleaned;
    }
    // Otherwise return as is or normalize best effort
    return cleaned;
}

function parseTurkishDateString(dateStr) {
    if (!dateStr) return null;
    const turkishMonthsDotted = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
    const turkishMonthsUndotted = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
    
    const parts = dateStr.trim().split(' ');
    if (parts.length < 2) return null;
    const day = parseInt(parts[0]);
    
    const monthStr = parts[1].toLocaleUpperCase('tr-TR');
    
    // Normalization helper
    const normalize = (str) => {
        return str
            .replace(/İ/g, 'I')
            .replace(/Ş/g, 'S')
            .replace(/Ç/g, 'C')
            .replace(/Ğ/g, 'G')
            .replace(/Ü/g, 'U')
            .replace(/Ö/g, 'O');
    };
    
    let monthIdx = turkishMonthsDotted.indexOf(monthStr);
    if (monthIdx === -1) {
        monthIdx = turkishMonthsUndotted.indexOf(monthStr);
    }
    if (monthIdx === -1) {
        monthIdx = turkishMonthsUndotted.indexOf(normalize(monthStr));
    }
    
    // 3-letter abbreviation fallback
    if (monthIdx === -1 && monthStr.length >= 3) {
        const sub3 = monthStr.substring(0, 3);
        const dotted3 = turkishMonthsDotted.map(m => m.substring(0, 3));
        const undotted3 = turkishMonthsUndotted.map(m => m.substring(0, 3));
        
        monthIdx = dotted3.indexOf(sub3);
        if (monthIdx === -1) {
            monthIdx = undotted3.indexOf(sub3);
        }
        if (monthIdx === -1) {
            monthIdx = undotted3.indexOf(normalize(sub3));
        }
    }
    
    if (monthIdx === -1) return null;
    
    const today = new Date();
    let year = today.getFullYear();
    if (monthIdx < today.getMonth()) {
        year += 1;
    }
    
    return new Date(year, monthIdx, day);
}

function getActualPlayDate(dateText, hourText) {
    const d = parseTurkishDateString(dateText);
    if (!d) return null;
    const hourPart = hourText.split(' - ')[0];
    const [h, m] = hourPart.split(':').map(Number);
    if (h < 6) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

function parseReservationDateTime(dateText, hourText) {
    const resDate = parseTurkishDateString(dateText);
    if (!resDate) return null;
    
    const hourPart = hourText.split(' - ')[0]; // "19:00"
    const [h, m] = hourPart.split(':').map(Number);
    resDate.setHours(h, m, 0, 0);
    
    return resDate;
}

function isReservationPast(dateText, hourText) {
    const resDateTime = parseReservationDateTime(dateText, hourText);
    if (!resDateTime) return false;
    return resDateTime < new Date();
}

async function loadProfileReservations() {
    const activeContainer = document.getElementById('profileActiveReservationsContainer');
    const pastContainer = document.getElementById('profilePastReservationsContainer');
    const debtsContainer = document.getElementById('profileDebtsContainer');
    
    if (!activeContainer || !pastContainer) return;
    if (!currentUser) return;
    
    // Fetch subscriptions for this user
    let userSubscriptions = [];
    if (currentUser.phone) {
        try {
            const subResp = await fetch(`http://127.0.0.1:5000/api/subscriptions/by-phone/${encodeURIComponent(currentUser.phone)}`);
            const subResult = await subResp.json();
            if (subResult.success) userSubscriptions = subResult.data;
        } catch (e) { console.error("Abonelikler çekilemedi:", e); }
    }

    const userRes = userReservations.filter(r => 
        ((r.user_id && currentUser && parseInt(r.user_id) === parseInt(currentUser.id)) ||
        (r.user_name && currentUser && r.user_name.toLocaleUpperCase('tr-TR') === currentUser.name.toLocaleUpperCase('tr-TR'))) &&
        r.status !== 'cancelled'
    );
    
    const activeList = [];
    const pastList = [];
    
    userRes.forEach(r => {
        if (isReservationPast(r.dateText, r.hourText)) {
            pastList.push(r);
        } else {
            activeList.push(r);
        }
    });
    
    // Render Subscriptions first (if any)
    let subsHtml = '';
    if (userSubscriptions.length > 0) {
        subsHtml = '<h4 style="color:#f59e0b;margin:10px 0 8px;font-size:0.85rem;">­şôà HAFTALIK ABONELİKLERİM</h4>';
        subsHtml += userSubscriptions.map(sub => {
            const field = fieldsData[sub.fieldKey] || { name: sub.fieldKey.toLocaleUpperCase('tr-TR') };
            return `
                <div class="profile-booking-item" style="border:2px solid #f59e0b;background:rgba(245,158,11,0.08);margin-bottom:8px;">
                    <div class="profile-booking-details">
                        <h4 style="color:#fbbf24;">­şôà HAFTALIK ABONELİK - ${field.name}</h4>
                        <p>HER ${sub.dayOfWeek} | ${sub.hourText} | SAHA ${sub.pitchNumber}</p>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        <button class="btn-danger-sm" style="background:#ef4444;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:700;font-size:0.75rem;cursor:pointer;" onclick="cancelMySubscription(${sub.id})">ABONELİĞİ İPTAL ET</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Active
    if (activeList.length === 0) {
        activeContainer.innerHTML = subsHtml + '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; text-align: center;">Aktif rezervasyonunuz bulunmamaktadır.</p>';
    } else {
        activeContainer.innerHTML = subsHtml + activeList.map(r => {
            const field = fieldsData[r.fieldKey] || { name: r.fieldKey.toLocaleUpperCase('tr-TR'), address: "" };
            const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || field;
            const morningPrice = pitch.morningPrice || 2500;
            const eveningPrice = pitch.eveningPrice || 3000;
            const slotStartHour = parseInt(r.hourText.split(':')[0]);
            const isEvening = slotStartHour >= 17 || slotStartHour < 6;
            const price = r.reservation_price || (isEvening ? eveningPrice : morningPrice);
            
            return `
                <div class="profile-booking-item" id="prof-res-${r.id}" style="${r.type === 'abone' ? 'border: 2px solid #f59e0b; background:rgba(245,158,11,0.08);' : ''}">
                    <div class="profile-booking-details">
                        <h4>${field.name} - SAHA ${r.pitchNumber}${r.type === 'abone' ? ' <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;">ABONE</span>' : ''}</h4>
                        <p>${r.dateText} | ${r.hourText}</p>
                        <p style="font-size:0.75rem; color:${r.payment_status === 'odendi' ? 'var(--neon-green)' : '#fca5a5'}; font-weight:bold;">${r.payment_status === 'odendi' ? '✅ ÖDENDİ' : '⚠️ ÖDEME BEKLENIYOR'}</p>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
                        <div class="profile-booking-price">${price} TL</div>
                        <button class="btn-danger-sm" onclick="cancelMyReservation(${r.id})">İPTAL ET</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Render Past
    if (pastList.length === 0) {
        pastContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; text-align: center;">Geçmiş rezervasyonunuz bulunmamaktadır.</p>';
    } else {
        pastContainer.innerHTML = pastList.map(r => {
            const field = fieldsData[r.fieldKey] || { name: r.fieldKey.toLocaleUpperCase('tr-TR'), address: "" };
            const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || field;
            const morningPrice = pitch.morningPrice || 2500;
            const eveningPrice = pitch.eveningPrice || 3000;
            const slotStartHour = parseInt(r.hourText.split(':')[0]);
            const isEvening = slotStartHour >= 17 || slotStartHour < 6;
            const price = r.reservation_price || (isEvening ? eveningPrice : morningPrice);
            
            return `
                <div class="profile-booking-item" style="opacity: 0.6; border-left: 3px solid ${r.type === 'abone' ? '#f59e0b' : '#64748b'};${r.type === 'abone' ? ' border: 2px solid #f59e0b; background:rgba(245,158,11,0.08);' : ''}">
                    <div class="profile-booking-details">
                        <h4 style="color:${r.type === 'abone' ? '#fbbf24' : 'var(--text-muted)'};">${field.name} - SAHA ${r.pitchNumber}${r.type === 'abone' ? ' <span style="background:#f59e0b;color:#000;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:700;">ABONE</span>' : ''}</h4>
                        <p>${r.dateText} | ${r.hourText}</p>
                        <p style="font-size:0.7rem;color:var(--text-muted);">[GEÇMİŞ]</p>
                    </div>
                    <div class="profile-booking-price" style="color:${r.type === 'abone' ? '#fbbf24' : 'var(--text-muted)'};">${price} TL</div>
                </div>
            `;
        }).join('');
    }

    // Render Debts
    if (debtsContainer) {
        const unpaidList = userRes.filter(r => r.payment_status !== 'odendi' && !isReservationPast(r.dateText, r.hourText));
        const totalDebt = unpaidList.reduce((sum, r) => {
            const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || fieldsData[r.fieldKey] || {};
            const mp = pitch.morningPrice || 2500;
            const ep = pitch.eveningPrice || 3000;
            const h = parseInt(r.hourText.split(':')[0]);
            const ev = h >= 17 || h < 6;
            return sum + (r.reservation_price || (ev ? ep : mp));
        }, 0);

        if (unpaidList.length === 0) {
            debtsContainer.innerHTML = '<p style="color: var(--neon-green); font-size: 0.9rem; padding: 15px; text-align: center;">✅ Bekleyen borcunuz bulunmamaktadır.</p>';
        } else {
            debtsContainer.innerHTML = `
                <div style="background:rgba(239,68,68,0.12);border:1.5px solid rgba(239,68,68,0.4);border-radius:10px;padding:14px;margin-bottom:14px;">
                    <div style="font-size:1.1rem;font-weight:800;color:#fca5a5;">⚠️ TOPLAM BORÇ: ${totalDebt} TL</div>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">Ödeme işletme yerinde yapılır.</div>
                </div>
                ${unpaidList.map(r => {
                    const field = fieldsData[r.fieldKey] || { name: r.fieldKey.toLocaleUpperCase('tr-TR') };
                    const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || field;
                    const mp = pitch.morningPrice || 2500;
                    const ep = pitch.eveningPrice || 3000;
                    const h = parseInt(r.hourText.split(':')[0]);
                    const ev = h >= 17 || h < 6;
                    const price = r.reservation_price || (ev ? ep : mp);
                    return `
                        <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                            <div>
                                <div style="font-weight:600;">${field.name} - SAHA ${r.pitchNumber}</div>
                                <div style="font-size:0.8rem;color:var(--text-muted);">${r.dateText} | ${r.hourText}</div>
                            </div>
                            <div style="font-weight:800;color:#fca5a5;font-size:1rem;">${price} TL</div>
                        </div>
                    `;
                }).join('')}
            `;
        }
    }
}

async function loadProfileReviews() {
    const reviewsContainer = document.getElementById('profileMyReviewsContainer');
    if (!reviewsContainer || !currentUser) return;
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/player-reviews/${currentUser.phone}`);
        const result = await response.json();
        
        if (result.success) {
            const data = result.data;
            document.getElementById('profileMyAvgStars').innerText = `${data.averageRating.toFixed(1)} ⭐`;
            document.getElementById('profileMyReviewCount').innerText = `${data.reviewCount} Değerlendirme`;
            
            if (data.reviews.length === 0) {
                reviewsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 15px; text-align: center;">Henüz size yapılmış bir değerlendirme bulunmuyor.</p>';
            } else {
                reviewsContainer.innerHTML = data.reviews.map(r => `
                    <div class="review-item" style="margin-bottom: 8px;">
                        <div class="review-header">
                            <span class="review-user">${r.reviewerName.toLocaleUpperCase('tr-TR')}</span>
                            <span class="review-stars">${'⭐'.repeat(r.rating)}</span>
                        </div>
                        <div class="review-comment">"${r.comment}"</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error("Yorumlarınız çekilemedi:", error);
    }
}

async function saveUserProfile() {
    if (!currentUser) return;
    
    const name = document.getElementById('profileNameInput').value.trim();
    const phone = document.getElementById('profilePhoneInput').value.trim();
    const age = document.getElementById('profileAgeInput').value.trim();
    const height = document.getElementById('profileHeightInput').value.trim();
    const weight = document.getElementById('profileWeightInput').value.trim();
    const position = document.getElementById('profilePositionInput').value;
    const experience = document.getElementById('profileExperienceInput').value;
    
    if (!name || !phone) {
        alert("Ad Soyad ve Telefon alanları zorunludur!");
        return;
    }
    
    const updateData = {
        id: currentUser.id,
        name,
        phone,
        age: age ? parseInt(age) : null,
        height: height ? parseInt(height) : null,
        weight: weight ? parseInt(weight) : null,
        position,
        experience
    };
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/users/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const result = await response.json();
        
        if (result.success) {
            currentUser = result.user;
            loggedInUser = currentUser.name.toLocaleUpperCase('tr-TR');
            
            await loadUserBlacklist();
            renderFieldsGrid();
            
            // Update UI welcome text
            document.getElementById('welcomeText').innerText = `HOŞ GELDİN: ${loggedInUser}`;
            
            alert("Profiliniz başarıyla güncellendi!");
            fillFormsFromProfile();
            loadProfileReservations(); // Refresh profile lists
            loadProfileReviews();      // Refresh profile reviews
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Profil güncelleme hatası:", error);
        alert("Profil kaydedilirken sunucu hatası oluştu!");
    }
}

function fillFormsFromProfile() {
    if (!currentUser) return;
    
    // Auto-fill Maç Bul / Maç Arama İlanı Oluştur form
    const matchName = document.getElementById('matchName');
    const matchAge = document.getElementById('matchAge');
    const matchHeight = document.getElementById('matchHeight');
    const matchWeight = document.getElementById('matchWeight');
    const matchPosition = document.getElementById('matchPosition');
    const matchPhone = document.getElementById('matchPhone');
    
    if (matchName) matchName.value = currentUser.name || "";
    if (matchAge) matchAge.value = currentUser.age || "";
    if (matchHeight) matchHeight.value = currentUser.height || "";
    if (matchWeight) matchWeight.value = currentUser.weight || "";
    if (matchPosition) matchPosition.value = currentUser.position || "";
    if (matchPhone) matchPhone.value = formatPhoneNumberInput(currentUser.phone || "");
    
    // Auto-fill Oyuncu Bul / Yeni Oyuncu İlanı Oluştur form
    const forumPhone = document.getElementById('forumPhone');
    if (forumPhone) forumPhone.value = formatPhoneNumberInput(currentUser.phone || "");
}

// Telefon Giriş Maskesi Formatlama Yardımı
function formatPhoneNumberInput(value) {
    // Sadece rakamları al
    let digits = value.replace(/\D/g, '');

    // Başında 0 yoksa ekle
    if (digits.length > 0 && digits[0] !== '0') {
        digits = '0' + digits;
    }
    // İkinci rakam mutlaka 5 olmalı
    if (digits.length >= 2 && digits[1] !== '5') {
        digits = '05' + digits.substring(2);
    }
    // Boşsa veya tek karakterse sabit başlangıç
    if (digits.length === 0) {
        return '05';
    }
    if (digits.length === 1) {
        return '05';
    }

    // Maksimum 11 rakam (05XX XXX XXXX)
    digits = digits.substring(0, 11);

    // Format: 05XX XXX XXXX (4-3-4 gruplar)
    let formatted = digits.substring(0, Math.min(digits.length, 4));
    if (digits.length > 4) {
        formatted += ' ' + digits.substring(4, Math.min(digits.length, 7));
    }
    if (digits.length > 7) {
        formatted += ' ' + digits.substring(7);
    }
    return formatted;
}

function applyPhoneMask(input) {
    if (!input) return;

    // Başlangıç değeri yoksa sabit prefix koy
    if (!input.value || input.value.trim() === '') {
        input.value = '05';
    }

    input.addEventListener('focus', function() {
        if (!this.value || this.value.trim() === '') {
            this.value = '05';
        }
    });

    input.addEventListener('input', function(e) {
        const cursorPos = this.selectionStart;
        const oldValue = this.value;

        // İmleç sonrasındaki rakam sayısını say
        const digitsAfterCursor = oldValue.substring(cursorPos).replace(/\D/g, '').length;

        // Formatla
        let formatted = formatPhoneNumberInput(oldValue);

        // Minimum "05" olsun
        if (formatted.length < 2) {
            formatted = '05';
        }

        this.value = formatted;

        // İmleç pozisyonunu ayarla: sondaki rakam sayısına göre geri say
        let newCursor = formatted.length;
        let digitCount = 0;
        for (let i = formatted.length - 1; i >= 0; i--) {
            if (digitCount >= digitsAfterCursor) {
                newCursor = i + 1;
                break;
            }
            if (/\d/.test(formatted[i])) {
                digitCount++;
            }
        }
        if (digitCount < digitsAfterCursor) {
            newCursor = 0;
        }

        // "05" prefix'ini koruma: imleç en az 2. pozisyonda olsun
        if (newCursor < 2) newCursor = 2;

        this.setSelectionRange(newCursor, newCursor);
    });

    // Kullanıcı "05" prefix'ini silmeye çalışırsa engelle
    input.addEventListener('keydown', function(e) {
        const cursorPos = this.selectionStart;
        const selEnd = this.selectionEnd;

        // Backspace ile "05" silmeye çalışma
        if (e.key === 'Backspace') {
            if (cursorPos <= 2 && selEnd <= 2) {
                e.preventDefault();
                return;
            }
            // Seçili alanın başı 2'den küçükse, seçimi 2'den başlat
            if (cursorPos < 2) {
                e.preventDefault();
                const remaining = this.value.substring(selEnd);
                this.value = formatPhoneNumberInput('05' + remaining);
                this.setSelectionRange(2, 2);
                return;
            }
        }

        // Delete ile "05" silmeye çalışma
        if (e.key === 'Delete') {
            if (cursorPos < 2) {
                e.preventDefault();
                return;
            }
        }
    });

    // Yapıştırma desteği
    input.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const digits = pastedText.replace(/\D/g, '');
        this.value = formatPhoneNumberInput(digits);
        const len = this.value.length;
        this.setSelectionRange(len, len);
    });
}

// İşletme Tüm Genel Ayarlarını Kaydetme
async function saveAllBusinessSettings() {
    if (!currentBusinessFieldKey) return;
    const count = parseInt(document.getElementById('businessSettingFieldCount').value);
    const phone = document.getElementById('businessSettingPhone').value.trim();
    const hasService = document.getElementById('businessSettingService').value;
    const coordinates = document.getElementById('businessSettingCoordinates').value.trim();
    const refreshments = document.getElementById('businessSettingRefreshments').value.trim();
    const cleats = document.getElementById('businessSettingCleats').value;
    const shower = document.getElementById('businessSettingShower').value;
    const market = document.getElementById('businessSettingMarket').value;
    
    if (!phone) {
        alert("Lütfen telefon numarasını giriniz!");
        return;
    }
    if (!coordinates) {
        alert("Lütfen koordinatları giriniz!");
        return;
    }
    
    // Basit koordinat formatı kontrolü: enlem,boylam (örn: 40.6558,35.8272)
    const coordRegex = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
    if (!coordRegex.test(coordinates)) {
        alert("Lütfen geçerli bir koordinat formatı giriniz! Örn: 40.6558,35.8272");
        return;
    }
    
    try {
        // 1. Saha Sayısını Kaydet
        const field = fieldsData[currentBusinessFieldKey];
        const resSettings = await fetch(`http://127.0.0.1:5000/api/pitch-settings/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                isClosed: field.isClosed ? 1 : 0,
                openingHour: field.openingHour,
                closingHour: field.closingHour,
                disabledHours: JSON.stringify(field.disabledHours),
                aboneHours: JSON.stringify(field.aboneHours),
                pricing: field.pricing,
                field_count: count
            })
        });
        const resultSettings = await resSettings.json();
        
        if (!resultSettings.success) {
            alert("Saha sayısı kaydedilemedi: " + resultSettings.message);
            return;
        }
        
        // 2. İletişim, Servis ve Konum Ayarlarını Kaydet
        const response = await fetch(`http://127.0.0.1:5000/api/business-profile/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, hasService, coordinates, refreshments, cleats, shower, market })
        });
        const result = await response.json();
        
        if (result.success) {
            // Lokal fieldsData güncelle
            fieldsData[currentBusinessFieldKey].pitchCount = count;
            fieldsData[currentBusinessFieldKey].phone = phone;
            fieldsData[currentBusinessFieldKey].hasService = hasService;
            fieldsData[currentBusinessFieldKey].coordinates = coordinates;
            fieldsData[currentBusinessFieldKey].refreshments = refreshments;
            fieldsData[currentBusinessFieldKey].cleats = cleats;
            fieldsData[currentBusinessFieldKey].shower = shower;
            fieldsData[currentBusinessFieldKey].market = market;
            
            // pitchObjectsList güncellemek için sunucudan son listeyi çek
            const listResp = await fetch('http://127.0.0.1:5000/api/pitch-list');
            const listResult = await listResp.json();
            if (listResult.success) {
                pitchObjectsList = listResult.data;
            }
            
            onAdminFieldCountChange();
            renderFieldsGrid();
            
            alert("İletişim ve hizmet ayarları başarıyla kaydedildi!");
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("İşletme profili güncelleme hatası:", error);
        alert("İşletme profili kaydedilirken sunucu hatası oluştu!");
    }
}

async function loadDailyHoursList() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/all-daily-hours');
        const result = await response.json();
        if (result.success) {
            dailyHoursList = result.data;
        }
    } catch (error) {
        console.error("Günlük saatler veritabanından çekilemedi:", error);
    }
}

async function cancelMySubscription(id) {
    const confirmed = await showConfirmModal("Bu haftalık aboneliğinizi iptal etmek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/subscriptions/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert("Aboneliğiniz başarıyla iptal edildi!");
            await loadReservationsFromServer();
            const listResp = await fetch('http://127.0.0.1:5000/api/pitch-list');
            const listResult = await listResp.json();
            if (listResult.success) pitchObjectsList = listResult.data;
            loadProfileReservations();
            if (currentSelectedFieldKey) onDateOrFieldChange();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Abonelik iptal hatası:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

async function cancelMyReservation(id) {
    const confirmed = await showConfirmModal("Rezervasyonunuzu iptal etmek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert("Rezervasyonunuz başarıyla iptal edildi!");
            await loadReservationsFromServer();
            loadProfileReservations();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Rezervasyon iptal hatası:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

let currentDebtStatusFilter = 'all';
let currentDebtTimeFilter = 'all';
let currentDebtSortOrder = 'desc';

function toggleDebtSortOrder() {
    currentDebtSortOrder = currentDebtSortOrder === 'desc' ? 'asc' : 'desc';
    const btn = document.getElementById('debt-sort-toggle');
    if (btn) {
        btn.innerHTML = currentDebtSortOrder === 'desc' ? '🔽 YENİDEN ESKİYE' : '🔼 ESKİDEN YENİYE';
    }
    loadBusinessDebts(currentDebtTimeFilter);
}

function setDebtStatusFilter(status) {
    currentDebtStatusFilter = status;
    document.querySelectorAll('.debt-status-filter-bar button').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`debt-status-${status}`);
    if (activeBtn) activeBtn.classList.add('active');

    loadBusinessDebts(currentDebtTimeFilter);
}

async function loadBusinessDebts(filter = 'all') {
    currentDebtTimeFilter = filter;
    document.querySelectorAll('.debt-filter-bar button').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`debt-filter-${filter}`);
    if (activeBtn) activeBtn.classList.add('active');

    const container = document.getElementById('businessDebtsContainer');
    if (!container) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/business-debts/${currentBusinessFieldKey}?filter=${filter}`);
        const result = await response.json();
        if (result.success) {
            let debts = result.data;

            // Calculate totals
            let totalPaid = 0;
            let totalUnpaid = 0;
            debts.forEach(r => {
                const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || {};
                const mp = pitch.morningPrice || 2500;
                const ep = pitch.eveningPrice || 3000;
                const h = parseInt(r.hourText.split(':')[0]);
                const ev = h >= 17 || h < 6;
                const price = Number(r.reservation_price || (ev ? ep : mp));
                if (r.payment_status === 'odendi') {
                    totalPaid += price;
                } else {
                    totalUnpaid += price;
                }
            });
            const pElem = document.getElementById('debtsSumPaid');
            const uElem = document.getElementById('debtsSumUnpaid');
            if (pElem) pElem.innerText = totalPaid;
            if (uElem) uElem.innerText = totalUnpaid;

            // Ödeme durumuna göre yerel filtreleme uygula
            if (currentDebtStatusFilter === 'unpaid') {
                debts = debts.filter(r => r.payment_status === 'odenmedi');
            } else if (currentDebtStatusFilter === 'paid') {
                debts = debts.filter(r => r.payment_status === 'odendi');
            }

            // Sıralama
            debts.sort((a, b) => {
                const dateA = parseTurkishDateString(a.dateText);
                const dateB = parseTurkishDateString(b.dateText);
                const timeA = a.hourText.split(' - ')[0];
                const timeB = b.hourText.split(' - ')[0];
                const cmp = dateA - dateB || timeA.localeCompare(timeB);
                return currentDebtSortOrder === 'desc' ? -cmp : cmp;
            });

            if (debts.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); padding: 15px; text-align: center;">Kayıt bulunamadı.</p>';
                return;
            }

            container.innerHTML = debts.map(r => {
                const pitch = pitchObjectsList.find(p => p.fieldKey === r.fieldKey && p.pitchNumber === r.pitchNumber) || {};
                const mp = pitch.morningPrice || 2500;
                const ep = pitch.eveningPrice || 3000;
                const h = parseInt(r.hourText.split(':')[0]);
                const ev = h >= 17 || h < 6;
                const price = Number(r.reservation_price || (ev ? ep : mp));
                const isPaid = r.payment_status === 'odendi';

                return `
                    <div class="admin-res-item" style="border-left: 4px solid ${isPaid ? 'var(--neon-green)' : '#ef4444'};">
                        <div class="admin-res-info">
                            <strong>${r.user_name}</strong> ${r.user_phone ? `(${r.user_phone})` : ''}<br>
                            <small style="color: var(--text-muted);">SAHA ${r.pitchNumber} | ${r.dateText} | ${r.hourText}</small>
                            <div style="font-weight: bold; margin-top: 4px; color: ${isPaid ? 'var(--neon-green)' : '#fca5a5'};">
                                Ücret: ${price} TL | ${isPaid ? 'ÖDENDİ' : 'ÖDENMEDİ'}
                            </div>
                        </div>
                        <div class="admin-res-actions">
                            <button class="action-btn" style="background: ${isPaid ? '#ef4444' : 'var(--primary-green)'}; color: #000; font-size: 0.8rem; padding: 6px 12px;" onclick="togglePaymentStatus(${r.id}, '${isPaid ? 'odenmedi' : 'odendi'}', '${filter}')">
                                ${isPaid ? 'ÖDENMEDİ YAP' : 'ÖDENDİ YAP'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error("Borçlar yüklenemedi:", error);
    }
}

async function togglePaymentStatus(id, newStatus, currentFilter) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reservations/${id}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_status: newStatus })
        });
        const result = await response.json();
        if (result.success) {
            await loadBusinessDebts(currentFilter);
            await loadBusinessStats();
            await loadReservationsFromServer();
            loadProfileReservations();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Ödeme durumu güncellenemedi:", error);
    }
}

async function markForumFound(id) {
    const confirmed = await showConfirmModal("Bu ilanı 'Bulundu' olarak işaretlemek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/forum/${id}/found`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("İlan 'Bulundu' olarak işaretlendi!");
            await loadForumPostsFromServer();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Forum ilanı güncelleme hatası:", error);
    }
}

async function markMatchFound(id) {
    const confirmed = await showConfirmModal("Bu ilanı 'Bulundu' olarak işaretlemek istediğinize emin misiniz?");
    if (!confirmed) return;
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/match-seekers/${id}/found`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("İlan 'Bulundu' olarak işaretlendi!");
            await loadMatchSeekers();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Maç ilanı güncelleme hatası:", error);
    }
}

async function toggleForumComments(type, postId) {
    const wrapper = document.getElementById(`forum-comments-${type}-${postId}`);
    if (!wrapper) return;

    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
        await loadForumComments(type, postId);
    } else {
        wrapper.style.display = 'none';
    }
}

async function loadForumComments(type, postId) {
    const listContainer = document.getElementById(`forum-comments-list-${type}-${postId}`);
    if (!listContainer) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/forum-comments/${type}/${postId}`);
        const result = await response.json();
        if (result.success) {
            const comments = result.data;
            if (comments.length === 0) {
                listContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; padding: 5px;">Henüz yorum yapılmamış.</p>';
                return;
            }
            listContainer.innerHTML = comments.map(c => `
                <div style="background: rgba(255,255,255,0.05); padding: 6px 10px; border-radius: 6px; margin-bottom: 6px; font-size: 0.8rem;">
                    <strong style="color: var(--neon-green);">${c.commenter_name.toLocaleUpperCase('tr-TR')}:</strong>
                    <span style="color: #e2e8f0;">${c.comment}</span>
                </div>
            `).join('');
            listContainer.scrollTop = listContainer.scrollHeight;
        }
    } catch (error) {
        console.error("Yorumlar yüklenemedi:", error);
    }
}

async function submitForumComment(type, postId) {
    if (!loggedInUser) {
        alert("Yorum yapabilmek için lütfen giriş yapınız!");
        return;
    }
    const textInputId = type === 'match_seeker' 
        ? `forum-comment-text-match-${postId}` 
        : type === 'team_seeker'
        ? `forum-comment-text-team-${postId}`
        : `forum-comment-text-${postId}`;

    const textInput = document.getElementById(textInputId);
    if (!textInput) return;

    const commenter_name = loggedInUser;
    const comment = textInput.value.trim();

    if (!comment) {
        alert("Lütfen bir yorum yazın!");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/forum-comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_type: type, post_id: postId, commenter_name, comment })
        });
        const result = await response.json();
        if (result.success) {
            textInput.value = "";
            await loadForumComments(type, postId);
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Yorum gönderme hatası:", error);
    }
}

async function toggleFieldCardReviews(fieldKey, event) {
    if (event) event.stopPropagation();
    const container = document.getElementById(`field-reviews-container-${fieldKey}`);
    if (!container) return;
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        await loadFieldCardReviews(fieldKey);
    } else {
        container.style.display = 'none';
    }
}

async function loadFieldCardReviews(fieldKey) {
    const listContainer = document.getElementById(`field-reviews-list-${fieldKey}`);
    if (!listContainer) return;
    
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/field-comments/${fieldKey}`);
        const result = await response.json();
        if (result.success) {
            const comments = result.data;
            if (comments.length === 0) {
                listContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem; padding: 5px; text-align: center;">Henüz yorum yapılmamış.</p>';
                return;
            }
            listContainer.innerHTML = comments.map(c => {
                const dateStr = new Date(c.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                return `
                    <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 4px; font-size: 0.8rem; text-align: left;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                            <strong style="color: var(--neon-green);">${c.commenter_name.toLocaleUpperCase('tr-TR')}</strong>
                            <span style="color: var(--text-muted); font-size: 0.7rem;">${dateStr}</span>
                        </div>
                        <span style="color: #e2e8f0; word-break: break-all;">${c.comment}</span>
                    </div>
                `;
            }).join('');
            listContainer.scrollTop = listContainer.scrollHeight;
        }
    } catch (error) {
        console.error("Saha yorumları yüklenemedi:", error);
    }
}

async function submitFieldCardComment(fieldKey, event) {
    if (event) event.stopPropagation();
    if (!loggedInUser) {
        alert("Yorum yapabilmek için lütfen giriş yapınız!");
        return;
    }
    const textInput = document.getElementById(`field-comment-text-${fieldKey}`);
    if (!textInput) return;
    
    const comment = textInput.value.trim();
    if (!comment) {
        alert("Lütfen bir yorum yazın!");
        return;
    }
    
    try {
        const response = await fetch('http://127.0.0.1:5000/api/field-comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey, commenter_name: loggedInUser, comment })
        });
        const result = await response.json();
        if (result.success) {
            textInput.value = "";
            await loadFieldCardReviews(fieldKey);
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Yorum gönderme hatası:", error);
    }
}

// =======================================================
// ENTEGRASYON, OTP, YORUM VE KARALİSTE DESTEKLERİ
// =======================================================

// OTP DOĞRULAMA GÖNDERİMİ
async function submitOTPVerification() {
    const userId = document.getElementById('otpUserId').value;
    const email = document.getElementById('otpEmail').value;
    const otpCode = document.getElementById('otpCodeInput').value.trim();

    if (!otpCode) {
        alert("Lütfen 6 haneli doğrulama kodunu girin!");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, email, otpCode })
        });
        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            loggedInUser = result.user.name.toLocaleUpperCase('tr-TR');
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            closeModal('otpVerificationModal');
            document.getElementById('otpCodeInput').value = "";
            alert(result.message);
            if (currentSelectedFieldKey) onDateOrFieldChange();
            fillFormsFromProfile();
        } else {
            alert("Doğrulama Hatası: " + result.message);
        }
    } catch (error) {
        console.error("OTP Verification Error:", error);
        alert("Bağlantı hatası oluştu!");
    }
}

// SOSYAL GİRİŞ PROFİL TAMAMLAMA
async function submitCompleteProfile() {
    const userId = document.getElementById('completeProfileUserId').value;
    const phone = document.getElementById('completeProfilePhone').value.trim();

    if (!phone) {
        alert("Lütfen telefon numaranızı girin!");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/auth/complete-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, phone })
        });
        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            loggedInUser = result.user.name.toLocaleUpperCase('tr-TR');
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            closeModal('socialCompleteProfileModal');
            document.getElementById('completeProfilePhone').value = "";
            alert(result.message);
            if (currentSelectedFieldKey) onDateOrFieldChange();
            fillFormsFromProfile();
        } else {
            alert("Profil Tamamlama Hatası: " + result.message);
        }
    } catch (error) {
        console.error("Complete Profile Error:", error);
        alert("Bağlantı hatası oluştu!");
    }
}

// OAUTH PENCERESİ AÇMA
function openOAuth(provider) {
    if (provider === 'google') {
        window.location.href = 'http://127.0.0.1:5000/api/auth/google';
    } else if (provider === 'apple') {
        window.location.href = 'http://127.0.0.1:5000/api/auth/apple/callback?code=mock_apple_code';
    }
}

// TURNSTILE DESTEĞİ
let latestTurnstileToken = "";
let turnstileScriptLoaded = false;
function loadTurnstileScript() {
    return new Promise((resolve) => {
        if (window.turnstile) { turnstileScriptLoaded = true; resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => { turnstileScriptLoaded = true; resolve(); };
        document.head.appendChild(script);
    });
}
function onTurnstileSuccess(token) {
    latestTurnstileToken = token;
}

// MÜŞTERİ PANELİ SAHA YORUMLARINI YÜKLE
async function loadFieldReviews(fieldKey) {
    const listContainer = document.getElementById('fieldReviewsList');
    if (!listContainer) return;
    
    document.getElementById('fieldReviewsSection').style.display = 'block';

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reviews/${fieldKey}`);
        const result = await response.json();
        
        if (result.success) {
            // Check if the user has a reviewable reservation
            let reviewableRes = null;
            if (currentUser && userReservations) {
                const now = new Date();
                const fieldReservations = userReservations.filter(r => r.fieldKey === fieldKey && r.user_id === currentUser.id);
                for (const r of fieldReservations) {
                    const playDate = getActualPlayDate(r.dateText, r.hourText);
                    if (!playDate) continue;
                    const hourPart = r.hourText.split(' - ')[1] || '23:59';
                    const [h, m] = hourPart.split(':').map(Number);
                    playDate.setHours(h, m, 0, 0);
                    
                    const ageInMs = now.getTime() - playDate.getTime();
                    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
                    
                    if (playDate.getTime() <= now.getTime() && ageInDays <= 7) {
                        const alreadyReviewed = result.data.some(rev => rev.reservation_id === r.id);
                        if (!alreadyReviewed) {
                            reviewableRes = r;
                            break;
                        }
                    }
                }
            }

            const formContainer = document.getElementById('addReviewFormContainer');
            if (reviewableRes) {
                document.getElementById('reviewResId').value = reviewableRes.id;
                formContainer.style.display = 'block';
            } else {
                formContainer.style.display = 'none';
            }

            if (result.data.length === 0) {
                listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Henüz bu sahaya yorum yapılmamış.</p>';
                return;
            }

            // Averages
            let sumTurf = 0, sumLight = 0, sumFac = 0, sumServ = 0;
            result.data.forEach(rev => {
                sumTurf += rev.rating_turf;
                sumLight += rev.rating_lighting;
                sumFac += rev.rating_facilities;
                sumServ += rev.rating_service;
            });
            const count = result.data.length;
            const avgTurf = (sumTurf / count).toFixed(1);
            const avgLight = (sumLight / count).toFixed(1);
            const avgFac = (sumFac / count).toFixed(1);
            const avgServ = (sumServ / count).toFixed(1);
            const overallAvg = ((sumTurf + sumLight + sumFac + sumServ) / (count * 4)).toFixed(1);

            const summaryHtml = `
                <div class="reviews-summary-row">
                    <div>
                        <div class="review-average-big">${overallAvg} ⭐</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">${count} DEĞERLENDİRME</div>
                    </div>
                    <div class="reviews-grid-details" style="flex: 1; max-width: 300px; margin-left: 20px;">
                        <div class="review-sub-rating-item"><span>ZEMİN:</span> <span>${avgTurf} ⭐</span></div>
                        <div class="review-sub-rating-item"><span>IŞIK:</span> <span>${avgLight} ⭐</span></div>
                        <div class="review-sub-rating-item"><span>TESİS:</span> <span>${avgFac} ⭐</span></div>
                        <div class="review-sub-rating-item"><span>HİZMET:</span> <span>${avgServ} ⭐</span></div>
                    </div>
                </div>
            `;

            const reviewsHtml = result.data.map(rev => {
                const dateStr = new Date(rev.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                const rating = ((rev.rating_turf + rev.rating_lighting + rev.rating_facilities + rev.rating_service) / 4).toFixed(1);
                
                let ownerReplyHtml = '';
                if (rev.owner_reply) {
                    ownerReplyHtml = `
                        <div class="review-owner-reply">
                            <div class="review-owner-reply-title">İŞLETME YANITI:</div>
                            <div class="review-owner-reply-text">${rev.owner_reply}</div>
                        </div>
                    `;
                }

                return `
                    <div class="review-comment-card">
                        <div class="review-comment-header">
                            <span class="review-comment-user">${rev.userName} <span class="review-star-badge">${rating} ⭐</span></span>
                            <span class="review-comment-date">${dateStr}</span>
                        </div>
                        <div class="review-comment-text">"${rev.comment || 'Puan verildi.'}"</div>
                        ${ownerReplyHtml}
                    </div>
                `;
            }).join('');

            listContainer.innerHTML = summaryHtml + reviewsHtml;
        }
    } catch (error) {
        console.error("Reviews load error:", error);
    }
}

// MÜŞTERİ YORUM GÖNDERME
async function submitFieldReview() {
    if (!loggedInUser || !currentUser) {
        alert("Yorum yapabilmek için lütfen giriş yapınız!");
        return;
    }
    const resId = document.getElementById('reviewResId').value;
    const ratingTurf = document.getElementById('ratingTurf').value;
    const ratingLighting = document.getElementById('ratingLighting').value;
    const ratingFacilities = document.getElementById('ratingFacilities').value;
    const ratingService = document.getElementById('ratingService').value;
    const comment = document.getElementById('reviewCommentText').value.trim();
    const isAnonymous = document.getElementById('reviewIsAnonymous').checked;

    if (!resId) return;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser.id,
                reservation_id: resId,
                rating_turf: parseInt(ratingTurf),
                rating_lighting: parseInt(ratingLighting),
                rating_facilities: parseInt(ratingFacilities),
                rating_service: parseInt(ratingService),
                comment,
                is_anonymous: isAnonymous ? 1 : 0
            })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            document.getElementById('reviewCommentText').value = "";
            document.getElementById('reviewIsAnonymous').checked = false;
            await loadFieldReviews(currentSelectedFieldKey);
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Yorum gönderme hatası:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

// İŞLETME YORUM YÖNETİMİ
let currentBusinessCommentFilter = 'all';
function setBusinessCommentFilter(filter) {
    currentBusinessCommentFilter = filter;
    document.querySelectorAll('[id^="comment-filter-"]').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`comment-filter-${filter}`);
    if (activeBtn) activeBtn.classList.add('active');
    loadBusinessComments();
}

async function loadBusinessComments() {
    const container = document.getElementById('businessCommentsList');
    if (!container) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reviews/${currentBusinessFieldKey}`);
        const result = await response.json();
        if (result.success) {
            let reviews = result.data;

            if (currentBusinessCommentFilter === 'unanswered') {
                reviews = reviews.filter(r => !r.owner_reply);
            } else if (currentBusinessCommentFilter === 'answered') {
                reviews = reviews.filter(r => r.owner_reply);
            }

            if (reviews.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); padding: 15px; text-align: center;">Yorum bulunamadı.</p>';
                return;
            }

            container.innerHTML = reviews.map(r => {
                const rating = ((r.rating_turf + r.rating_lighting + r.rating_facilities + r.rating_service) / 4).toFixed(1);
                const dateStr = new Date(r.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
                
                let actionHtml = '';
                if (r.owner_reply) {
                    actionHtml = `
                        <div style="margin-top: 10px;">
                            <div style="color: var(--neon-green); font-size: 0.8rem; font-weight: 700; margin-bottom: 5px;">YANITINIZ:</div>
                            <div style="font-size: 0.85rem; color: #cbd5e1; font-style: italic; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 6px; border-left: 3px solid var(--primary-green); margin-bottom: 8px;">"${r.owner_reply}"</div>
                            <button class="action-btn" style="background: var(--warning-orange); color: #000; font-size: 0.75rem; padding: 4px 10px; width: auto;" onclick="showReplyForm(${r.id}, \`${r.owner_reply.replace(/`/g, '\\`').replace(/"/g, '&quot;')}\`)">GÜNCELLE</button>
                        </div>
                    `;
                } else {
                    actionHtml = `
                        <div id="reply-form-${r.id}" style="margin-top: 10px;">
                            <textarea id="reply-text-${r.id}" class="form-control" rows="2" style="font-size: 0.8rem; padding: 8px;" placeholder="Cevabınızı buraya yazın..."></textarea>
                            <button class="action-btn" style="font-size: 0.75rem; padding: 6px 12px; margin-top: 5px; width: auto;" onclick="submitOwnerReply(${r.id})">CEVAPLA</button>
                        </div>
                    `;
                }

                return `
                    <div class="review-comment-card" style="background: rgba(21, 31, 50, 0.4); border: 1px solid rgba(16, 185, 129, 0.15);">
                        <div class="review-comment-header">
                            <span class="review-comment-user">${r.userName} <span class="review-star-badge">${rating} ⭐</span></span>
                            <span class="review-comment-date">Saha ${r.pitchNumber} | ${dateStr}</span>
                        </div>
                        <div class="review-comment-text" style="margin-bottom: 10px;">"${r.comment || 'Puan verildi.'}"</div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: rgba(0,0,0,0.15); padding: 6px 10px; border-radius: 6px; font-size: 0.75rem; margin-bottom: 10px;">
                            <div style="color: var(--text-muted);">Zemin: <span style="color:#fbbf24">${r.rating_turf}⭐</span></div>
                            <div style="color: var(--text-muted);">Işık: <span style="color:#fbbf24">${r.rating_lighting}⭐</span></div>
                            <div style="color: var(--text-muted);">Tesis: <span style="color:#fbbf24">${r.rating_facilities}⭐</span></div>
                            <div style="color: var(--text-muted);">Hizmet: <span style="color:#fbbf24">${r.rating_service}⭐</span></div>
                        </div>
                        <div id="reply-zone-${r.id}">
                            ${actionHtml}
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error("Yorumlar yüklenemedi:", error);
    }
}

function showReplyForm(id, currentReply) {
    const zone = document.getElementById(`reply-zone-${id}`);
    if (!zone) return;
    zone.innerHTML = `
        <div style="margin-top: 10px;">
            <textarea id="reply-text-${id}" class="form-control" rows="2" style="font-size: 0.8rem; padding: 8px;">${currentReply}</textarea>
            <div style="display: flex; gap: 8px; margin-top: 5px;">
                <button class="action-btn" style="font-size: 0.75rem; padding: 6px 12px; width: auto;" onclick="submitOwnerReply(${id})">KAYDET</button>
                <button class="action-btn" style="background: var(--text-muted); color: #000; font-size: 0.75rem; padding: 6px 12px; width: auto;" onclick="loadBusinessComments()">İPTAL</button>
            </div>
        </div>
    `;
}

async function submitOwnerReply(id) {
    const replyText = document.getElementById(`reply-text-${id}`).value.trim();
    if (!replyText) {
        alert("Lütfen bir cevap yazın!");
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/reviews/${id}/reply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_reply: replyText })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            await loadBusinessComments();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Owner reply submit error:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

// Kullanıcının kara listede olduğu sahaları yükle
async function loadUserBlacklist() {
    if (!currentUser || !currentUser.phone) {
        userBlacklistedFields = [];
        return;
    }
    try {
        const response = await fetch(`http://127.0.0.1:5000/api/blacklists/by-phone/${encodeURIComponent(currentUser.phone)}`);
        const result = await response.json();
        if (result.success) {
            userBlacklistedFields = result.data;
        }
    } catch (error) {
        console.error("Kara liste sorgulama hatası:", error);
    }
}

// İŞLETME KARA LİSTE (BLACKLIST) YÖNETİMİ
async function loadBusinessBlacklist() {
    const container = document.getElementById('businessBlacklistContainer');
    if (!container) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/blacklist/${currentBusinessFieldKey}`);
        const result = await response.json();
        if (result.success) {
            const blacklist = result.data;
            if (blacklist.length === 0) {
                container.innerHTML = '<p style="color: var(--text-muted); padding: 15px; text-align: center;">Kara listede engellenen numara bulunmuyor.</p>';
                return;
            }
            container.innerHTML = blacklist.map(b => `
                <div class="blacklist-item">
                    <span class="blacklist-phone">${b.phone_number}</span>
                    <button class="btn-danger-sm" style="padding: 4px 10px; font-size: 0.75rem; width: auto;" onclick="deleteFromBusinessBlacklist('${b.phone_number}')">ENGELİ KALDIR</button>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error("Blacklist load error:", error);
    }
}

async function addToBusinessBlacklist() {
    const phoneInput = document.getElementById('blacklistPhoneInput');
    if (!phoneInput) return;
    const phone = phoneInput.value.trim();
    if (!phone) {
        alert("Lütfen engellenecek telefon numarasını girin!");
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:5000/api/blacklist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey: currentBusinessFieldKey, phone_number: phone })
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            phoneInput.value = "";
            await loadBusinessBlacklist();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Blacklist add error:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

async function deleteFromBusinessBlacklist(phone) {
    if (!confirm(`${phone} numarasının engelini kaldırmak istediğinize emin misiniz?`)) return;

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/blacklist/${currentBusinessFieldKey}/${encodeURIComponent(phone)}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            await loadBusinessBlacklist();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Blacklist delete error:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}



// TOAST BILDIRIM SISTEMI
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = "toast-box ";
    toast.innerText = message;
    
    container.appendChild(toast);
    
    // Animate
    void toast.offsetWidth;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Override native alert
window.alert = function(msg) {
    if (typeof msg !== 'string') msg = String(msg);
    const lowerMsg = msg.toLowerCase();
    if (lowerMsg.includes('hata') || lowerMsg.includes('ba�ar�s�z') || lowerMsg.includes('l�tfen') || lowerMsg.includes('kilitli')) {
        showToast(msg, 'error');
    } else if (lowerMsg.includes('emin misiniz')) {
        showToast(msg, 'info');
    } else {
        showToast(msg, 'success');
    }
};

function toggleMobileForm(formId) {
    const formContainer = document.getElementById(formId);
    if (!formContainer) return;
    
    // Find the corresponding button
    // The button is inside the previous sibling (mobile-listing-header)
    const btn = formContainer.nextElementSibling?.querySelector('.mobile-create-btn');
    
    if (formContainer.classList.contains('anim-slide-fade-in') || formContainer.style.display === 'block') {
        // Kapat
        formContainer.classList.remove('anim-slide-fade-in');
        formContainer.classList.add('anim-slide-fade-out');
        
        if (btn) btn.innerText = '+ �lan Ver';
        
        // Animasyon bitince display none yap
        setTimeout(() => {
            if (formContainer.classList.contains('anim-slide-fade-out')) {
                formContainer.style.display = 'none';
                formContainer.classList.remove('anim-slide-fade-out');
            }
        }, 300);
    } else {
        // A�
        formContainer.style.display = 'block';
        formContainer.classList.remove('anim-slide-fade-out');
        formContainer.classList.add('anim-slide-fade-in');
        
        if (btn) btn.innerText = 'Kapat';
    }
}


// Mobile menu toggle functions
function toggleMobileMenu() {
    const panel = document.querySelector('.header-actions');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (!panel) return;
    const isOpen = panel.classList.contains('open');
    if (isOpen) {
        panel.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    } else {
        panel.classList.add('open');
        if (overlay) overlay.classList.add('show');
    }
}

function closeMobileMenu() {
    const panel = document.querySelector('.header-actions');
    const overlay = document.getElementById('mobileMenuOverlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

// Close mobile menu on action
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.header-actions .nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
});




