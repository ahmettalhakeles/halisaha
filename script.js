let isAdminLoggedIn = false;
let adminToken = null;
let adminData = null;
let inMemoryBusinessToken = null;
let inMemoryBusinessFieldKey = null;

const isBusinessPage = window.location.pathname.includes('isletme');
const isAdminPage = window.location.pathname.includes('yonetici');
const isUserPage = !isBusinessPage && !isAdminPage;

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
window.fieldsData = fieldsData;

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

function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    // Kullanıcı token'ı: "Beni Hatırla" ise localStorage, değilse sessionStorage
    const userToken = localStorage.getItem('userToken') || sessionStorage.getItem('userToken');
    // İşletme token'ı: "Beni Hatırla" ise localStorage, değilse inMemoryBusinessToken
    const businessToken = localStorage.getItem('businessToken') || inMemoryBusinessToken;
    const adminToken = localStorage.getItem('adminToken');
    
    // Admin token sadece admin ve işletme sayfalarında ekle
    if (isAdminPage && adminToken) {
        headers['x-admin-token'] = adminToken;
    }
    
    if (isBusinessPage) {
        if (adminToken) {
            // Admin is impersonating a business
            headers['x-admin-token'] = adminToken;
        } else if (businessToken) {
            headers['Authorization'] = `Bearer ${businessToken}`;
        }
    } else if (!isAdminPage && userToken) {
        // Normal kullanıcı sayfasında sadece kullanıcı token'ı ekle
        headers['Authorization'] = `Bearer ${userToken}`;
    }
    return headers;
}

// =======================================================
// SAYFA YÜKLEME
// =======================================================
window.onload = async function() {
    await loadPitchSettingsFromDatabase();
    
    if (isUserPage) {
        // "Beni Hatırla" seçildiyse localStorage, yoksa sessionStorage'dan oku
        const userRemember = localStorage.getItem('userRemember');
        const storedUserToken = userRemember === 'true'
            ? localStorage.getItem('userToken')
            : sessionStorage.getItem('userToken');
        const storedUserData = userRemember === 'true'
            ? localStorage.getItem('userData')
            : sessionStorage.getItem('userData');
        if (storedUserToken && storedUserData) {
            try {
                currentUser = JSON.parse(storedUserData);
                loggedInUser = currentUser.name.toLocaleUpperCase('tr-TR');
                // getAuthHeaders için de doğru yere koy
                if (userRemember !== 'true') {
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                }
            } catch (e) {
                console.error("Stored user parse error:", e);
            }
        }
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

        if (currentUser) {
            await loadUserBlacklist();
            renderFieldsGrid();
        }

        const confirmYes = document.getElementById('confirmYesBtn');
        if (confirmYes) confirmYes.onclick = () => closeConfirmModal(true);
        const confirmNo = document.getElementById('confirmNoBtn');
        if (confirmNo) confirmNo.onclick = () => closeConfirmModal(false);

        const bookingConfirmYes = document.getElementById('bookingConfirmYesBtn');
        if (bookingConfirmYes) bookingConfirmYes.onclick = () => closeBookingConfirmModal(true);
        const bookingConfirmNo = document.getElementById('bookingConfirmNoBtn');
        if (bookingConfirmNo) bookingConfirmNo.onclick = () => closeBookingConfirmModal(false);
    }
    
    if (isBusinessPage) {
        await initPitchSelector();
        await loadPitchSettingsFromDatabase();
        await loadDailyHoursList();
        // "Beni Hatırla" veya admin impersonation için localStorage, değilse inMemoryBusinessFieldKey
        const storedKey = localStorage.getItem('businessFieldKey') || inMemoryBusinessFieldKey || (localStorage.getItem('adminToken') && localStorage.getItem('adminImpersonateField') ? JSON.parse(localStorage.getItem('adminImpersonateField')).key : null);
        const storedAdminToken = localStorage.getItem('adminToken');
        const impersonateDataStr = localStorage.getItem('adminImpersonateField');

        if (storedKey && storedAdminToken && impersonateDataStr) {
            currentBusinessFieldKey = storedKey;
            isBusinessLoggedIn = true;
            showBusinessUI();

            try {
                const impData = JSON.parse(impersonateDataStr);
                const banner = document.getElementById('adminImpersonationBanner');
                const fieldNameEl = document.getElementById('adminImpersonatedFieldName');
                if (banner && fieldNameEl) {
                    fieldNameEl.innerText = impData.name.toLocaleUpperCase('tr-TR');
                    banner.style.display = 'flex';
                    document.body.classList.add('admin-impersonating');
                }
            } catch (e) {
                console.error("Error parsing impersonate data:", e);
            }
        } else if (storedKey) {
            // Normal business login (from localStorage remember me)
            currentBusinessFieldKey = storedKey;
            isBusinessLoggedIn = true;
            showBusinessUI();
        } else {
            localStorage.removeItem('businessFieldKey');
            localStorage.removeItem('businessToken');
            inMemoryBusinessFieldKey = null;
            inMemoryBusinessToken = null;
            showBusinessLoginWrapper();
        }
        
        const confirmYes = document.getElementById('confirmYesBtn');
        if (confirmYes) confirmYes.onclick = () => closeConfirmModal(true);
        const confirmNo = document.getElementById('confirmNoBtn');
        if (confirmNo) confirmNo.onclick = () => closeConfirmModal(false);
    }
    
    if (isAdminPage) {
        const storedToken = localStorage.getItem('adminToken');
        const storedData = localStorage.getItem('adminData');
        const storedRemember = localStorage.getItem('adminRemember');
        if (storedToken && storedData && storedRemember === 'true') {
            isAdminLoggedIn = true;
            adminToken = storedToken;
            adminData = JSON.parse(storedData);
            showAdminUI();
        } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            localStorage.removeItem('adminRemember');
            showAdminLoginWrapper();
        }
        
        const confirmYes = document.getElementById('confirmYesBtn');
        if (confirmYes) confirmYes.onclick = () => closeConfirmModal(true);
        const confirmNo = document.getElementById('confirmNoBtn');
        if (confirmNo) confirmNo.onclick = () => closeConfirmModal(false);
    }

    // Telefon maskelerini bağlama
    ['forumPhone', 'matchPhone', 'regPhone', 'subPhoneInput', 'profilePhoneInput', 'businessSettingPhone', 'blacklistPhoneInput'].forEach(id => {
        const input = document.getElementById(id);
        if (input) applyPhoneMask(input);
    });
};

// =======================================================
// KULLANICI GİRİŞ/ÇIKIŞ
// =======================================================
function handleUserLogout() {
    loggedInUser = null;
    currentUser = null;
    userBlacklistedFields = [];
    // Tüm oturum verilerini temizle
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userRemember');
    sessionStorage.removeItem('userToken');
    sessionStorage.removeItem('userData');
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

    const kvkkChecked = document.getElementById('regKvkk').checked;
    if (!kvkkChecked) {
        alert("Kayıt olabilmek için KVKK Aydınlatma Metni'ni kabul etmelisiniz.");
        return;
    }

    if (!name || !phone || !email || !pass) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }

    // Telefon format kontrolü: 05 ile başlamalı, tam 11 hane
    const phoneClean = phone.replace(/\D/g, '');
    if (!phoneClean.startsWith('05') || phoneClean.length !== 11) {
        alert("Telefon numarası 05 ile başlamalı ve tam 11 rakam olmalıdır! (Örn: 05XXXXXXXXX)");
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone: phoneClean, email, password: pass })
        });
        let result;
        try { result = await response.json(); } catch (jsonError) {
            console.error("JSON Ayrıştırma Hatası:", jsonError);
            alert("Sunucu yanıtı okunamadı! (HTTP " + response.status + ")");
            return;
        }

        if (result.success) {
            currentUser = result.user || null;
            loggedInUser = (result.user && result.user.name) ? result.user.name.toLocaleUpperCase('tr-TR') : 'MÜŞTERİ';
            // Kayıt sonrası oturum sadece bu sekme için geçerli (beni hatırla yok)
            sessionStorage.setItem('userToken', result.token);
            sessionStorage.setItem('userData', JSON.stringify(result.user));
            localStorage.removeItem('userToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('userRemember');
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            closeModal('registerModal');
            document.getElementById('registerForm').reset();
            if (currentSelectedFieldKey) onDateOrFieldChange();
            fillFormsFromProfile();
            if (result.message) alert(result.message);
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
    const rememberMe = document.getElementById('userRememberMe');
    const remember = rememberMe && rememberMe.checked;

    if (!email || !pass) {
        alert("LÜTFEN ALANLARI DOLDURUNUZ.");
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pass })
        });
        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            loggedInUser = result.user.name.toLocaleUpperCase('tr-TR');
            if (remember) {
                localStorage.setItem('userToken', result.token);
                localStorage.setItem('userData', JSON.stringify(result.user));
                localStorage.setItem('userRemember', 'true');
            } else {
                sessionStorage.setItem('userToken', result.token);
                sessionStorage.setItem('userData', JSON.stringify(result.user));
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                localStorage.removeItem('userRemember');
            }
            await loadUserBlacklist();
            renderFieldsGrid();
            updateLoginUIVisibility();
            closeModal('loginModal');
            if (currentSelectedFieldKey) onDateOrFieldChange();
            fillFormsFromProfile();
        } else {
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
    
    const tabMap = {
        'stats': 'istatistikler',
        'reservations': 'rezervasyonlar',
        'debts': 'borçlar',
        'comments': 'yorumlar',
        'blacklist': 'kara liste',
        'pricing': 'fiyat tarifesi',
        'hours': 'saat & engel',
        'subscriptions': 'abonelik',
        'settings': 'işletme ayarları'
    };
    
    document.querySelectorAll('#businessMenuTabsContainer .nav-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const expected = tabMap[tabName];
        btn.classList.toggle('active', btnText.includes(expected));
    });

    if (tabName === 'debts') {
        loadBusinessDebts('all');
    } else if (tabName === 'comments') {
        loadBusinessComments();
    } else if (tabName === 'blacklist') {
        loadBusinessBlacklist();
    } else if (tabName === 'settings') {
        loadBusinessFieldPhotos();
    }
}

function showBusinessLoginWrapper() {
    document.body.classList.remove('logged-in');
    const loginWrapper = document.getElementById('businessLoginWrapper');
    if (loginWrapper) loginWrapper.style.display = 'flex';
    const panel = document.getElementById('businessPanel');
    if (panel) panel.style.display = 'none';
    const logoutSec = document.getElementById('businessLogoutSection');
    if (logoutSec) logoutSec.style.display = 'none';
    const burger = document.getElementById('mobileHamburgerBtn');
    if (burger) burger.style.display = 'none';
}

function showBusinessUI() {
    document.body.classList.add('logged-in');
    const loginWrapper = document.getElementById('businessLoginWrapper');
    if (loginWrapper) loginWrapper.style.display = 'none';
    const panel = document.getElementById('businessPanel');
    if (panel) panel.style.display = 'block';
    const logoutSec = document.getElementById('businessLogoutSection');
    if (logoutSec) logoutSec.style.display = 'flex';
    const burger = document.getElementById('mobileHamburgerBtn');
    if (burger) burger.style.display = 'block';

    const field = fieldsData[currentBusinessFieldKey];
    if (field) {
        const welcome = document.getElementById('businessWelcomeText');
        if (welcome) welcome.innerText = `İŞLETME: ${field.name}`;
        const badge = document.getElementById('businessActiveNameBadge');
        if (badge) badge.innerText = field.name.toLocaleUpperCase('tr-TR');
        const titleEl = document.getElementById('businessPanelTitle');
        if (titleEl) titleEl.innerText = `YÖNETİM PANELİ`;
        const hbf = document.getElementById('hamburgerFieldName');
        if (hbf) hbf.innerText = field.name.toLocaleUpperCase('tr-TR');
    }

    switchBusinessTab('stats');
    loadBusinessDashboard();
}

async function handleBusinessLogin() {
    const keyInput = document.getElementById('businessKey');
    const passInput = document.getElementById('businessPassword');
    if (!keyInput || !passInput) return;

    const key = keyInput.value.trim().toLowerCase();
    const password = passInput.value;

    if (!key || !password) {
        alert("Lütfen işletme adı ve şifreyi giriniz.");
        return;
    }

    let data;
    try {
        const resp = await fetch('/api/business-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey: key, password })
        });
        data = await resp.json();
        if (!data.success) {
            alert(data.message || "Hatalı şifre!");
            return;
        }
    } catch (e) {
        alert("Sunucu hatası! Lütfen tekrar deneyin.");
        return;
    }

    currentBusinessFieldKey = key;
    isBusinessLoggedIn = true;
    const bizRememberEl = document.getElementById('businessRememberMe');
    const bizRemember = bizRememberEl && bizRememberEl.checked;
    if (bizRemember) {
        localStorage.setItem('businessFieldKey', key);
        localStorage.setItem('businessToken', data.token);
        localStorage.setItem('businessRemember', 'true');
    } else {
        inMemoryBusinessFieldKey = key;
        inMemoryBusinessToken = data.token;
        localStorage.removeItem('businessFieldKey');
        localStorage.removeItem('businessToken');
        localStorage.removeItem('businessRemember');
    }
    passInput.value = '';

    showBusinessUI();
}

function handleBusinessLogout() {
    isBusinessLoggedIn = false;
    currentBusinessFieldKey = "";
    inMemoryBusinessFieldKey = null;
    inMemoryBusinessToken = null;
    localStorage.removeItem('businessFieldKey');
    localStorage.removeItem('businessToken');
    localStorage.removeItem('businessRemember');

    // Admin modunda işletme panelinden çıkış: admin paneline dön
    if (isAdminLoggedIn && isAdminPage) {
        document.querySelector('main').classList.remove('business-mode');
        document.body.classList.remove('business-mode');
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) adminPanel.style.display = 'block';
        document.querySelector('main').classList.add('admin-mode');
        document.body.classList.add('admin-mode');
        switchAdminTab('fields');
        return;
    }

    showBusinessLoginWrapper();
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
        const response = await fetch(`/api/stats-content/${currentBusinessFieldKey}`, { headers: getAuthHeaders() });
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
        const response = await fetch(`/api/pitch-settings/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
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
            const listResp = await fetch('/api/pitch-list');
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) {
        pitchNum = parseInt(document.getElementById('pricingPitchSelect').value);
        if (!pitchNum) { alert("Lütfen ayarlanacak sahayı seçin!"); return; }
    }
    const morningPrice = parseInt(document.getElementById('businessPriceMorning').value) || 2500;
    const eveningPrice = parseInt(document.getElementById('businessPriceEvening').value) || 3000;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};

    try {
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
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

            if (!fieldsData[currentBusinessFieldKey]) fieldsData[currentBusinessFieldKey] = {};
            const field = fieldsData[currentBusinessFieldKey];
            field.pricing = `${morningPrice}/${eveningPrice}`;
            if (pitchNum === 1) {
                await fetch(`/api/pitch-settings/${currentBusinessFieldKey}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
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
        const dhResp = await fetch(`/api/field-daily-hours/${currentBusinessFieldKey}`, { headers: getAuthHeaders() });
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: getAuthHeaders(),
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); if (!pitchNum) { alert("Lütfen saha seçin!"); return; } }
    const openHour = document.getElementById('adminOpeningHour').value;
    const closeHour = document.getElementById('adminClosingHour').value;
    const dayVal = document.getElementById('adminHoursDaySelect').value;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};

    try {
        if (dayVal === 'all') {
            const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
                method: 'PUT', headers: getAuthHeaders(),
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
            const response = await fetch(`/api/field-daily-hours/${currentBusinessFieldKey}`, {
                method: 'PUT', headers: getAuthHeaders(),
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
    let pitchNum = 1;
    if (count === 2) { pitchNum = parseInt(document.getElementById('hoursPitchSelect').value); if (!pitchNum) { alert("Lütfen saha seçin!"); return; } }
    const isClosed = document.getElementById('fieldClosureToggle').checked ? 1 : 0;
    const pitch = pitchObjectsList.find(p => p.fieldKey === currentBusinessFieldKey && p.pitchNumber === pitchNum) || {};
    try {
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: getAuthHeaders(),
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
    const count = parseInt((fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1);
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
            method: 'PUT', headers: getAuthHeaders(),
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
        const response = await fetch(`/api/business-reservations/${currentBusinessFieldKey}`, { headers: getAuthHeaders() });
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

    const pitchCount = (fieldsData[currentBusinessFieldKey] || {}).pitchCount || 1;

    if (activeList.length === 0) {
        activeContainer.innerHTML = '<p style="color: var(--text-muted); padding: 12px; text-align:center; font-size:0.85rem;">Aktif rezervasyon bulunmamaktadır.</p>';
    } else {
        activeContainer.innerHTML = activeList.map(res => {
            const aboneBadge = res.type === 'abone' ? '<span class="abone-badge">ABONE</span>' : '';
            return `
            <div class="res-card" onclick="toggleResCard(this)" data-res-id="${res.id}">
                <div class="res-card-header">
                    <div class="res-card-info">
                        <strong>${res.user_name}</strong> ${aboneBadge}
                        <span class="res-card-meta">${pitchCount > 1 ? `SAHA ${res.pitchNumber}` : 'TEK SAHA'} · ${res.dateText} · ${res.hourText}</span>
                    </div>
                    <span class="res-card-arrow">▼</span>
                </div>
                <div class="res-card-body" style="display:none;">
                    <div class="res-card-actions">
                        ${pitchCount > 1 ? `
                        <select id="newPitch_${res.id}" class="res-select">
                            <option value="1" ${res.pitchNumber === 1 ? 'selected' : ''}>Saha 1</option>
                            <option value="2" ${res.pitchNumber === 2 ? 'selected' : ''}>Saha 2</option>
                        </select>
                        ` : `<input type="hidden" id="newPitch_${res.id}" value="1">`}
                        <select id="newDate_${res.id}" class="res-select">
                            <option value="${res.dateText}">${res.dateText}</option>
                            ${getNext7Days().map(day => `<option value="${day}">${day}</option>`).join('')}
                        </select>
                        <select id="newHour_${res.id}" class="res-select">
                            <option value="${res.hourText}">${res.hourText}</option>
                            ${masterHoursList.map(h => `<option value="${h}">${h}</option>`).join('')}
                        </select>
                    </div>
                    <div class="res-card-buttons">
                        <button class="res-btn res-btn-postpone" onclick="event.stopPropagation();updateReservation(${res.id})">ERTELE</button>
                        <button class="res-btn res-btn-cancel" onclick="event.stopPropagation();removeReservation(${res.id})">İPTAL</button>
                    </div>
                    <div class="res-card-hint">▼ Ertlemek veya iptal etmek için tıklayın</div>
                </div>
            </div>`;
        }).join('');
    }

    if (pastList.length === 0) {
        pastContainer.innerHTML = '<p style="color: var(--text-muted); padding: 12px; text-align:center; font-size:0.85rem;">Geçmiş rezervasyon bulunmamaktadır.</p>';
    } else {
        pastContainer.innerHTML = pastList.map(res => `
            <div class="res-card res-card-past">
                <div class="res-card-header">
                    <div class="res-card-info">
                        <strong>${res.user_name}</strong>
                        <span class="res-card-meta">${pitchCount > 1 ? `SAHA ${res.pitchNumber}` : 'TEK SAHA'} · ${res.dateText} · ${res.hourText} · GEÇMİŞ</span>
                    </div>
                </div>
                <div class="res-card-body" style="display:none;">
                    <div class="res-card-buttons">
                        <button class="res-btn res-btn-cancel" onclick="event.stopPropagation();removeReservation(${res.id})">SİL</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function toggleResCard(el) {
    const body = el.querySelector('.res-card-body');
    const arrow = el.querySelector('.res-card-arrow');
    if (body) {
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.textContent = isOpen ? '▼' : '▲';
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

    grid.className = 'business-hours-grid-compact';
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
        pitchLabel.style.cssText = 'grid-column: 1 / -1; font-size:0.75rem; font-weight:700; color:var(--neon-green); text-transform:uppercase; margin:6px 0 2px;';
        pitchLabel.textContent = `SAHA ${p}`;
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
            const box = document.createElement('button');
            box.classList.add('business-hour-box');

            const hStartBiz = parseInt(hour.split(':')[0]);
            let taken = filtered.find(r => r.pitchNumber === p && r.hourText === hour && r.status !== 'cancelled');
            if (!taken && hStartBiz < 6) {
                const nextDate = getNextCalendarDayText(dateText);
                taken = currentBusinessReservations.find(r => r.dateText === nextDate && r.pitchNumber === p && r.hourText === hour && r.status !== 'cancelled');
            }
            if (taken) {
                box.classList.add(taken.type === 'abone' ? 'abone' : 'booked');
                box.textContent = hour;
                box.title = `${taken.user_name} | ${taken.payment_status === 'odendi' ? 'ÖDENDİ' : 'ÖDENMEDİ'}${taken.type === 'abone' ? ' | ABONE' : ''}`;
                box.onclick = () => {
                    selectedBusinessGridResId = taken.id;
                    const info = document.getElementById('businessGridSelectedInfo');
                    if (info) {
                        info.style.display = 'block';
                        document.getElementById('bizGridSelName').textContent = `${taken.user_name}${taken.type === 'abone' ? ' (ABONE)' : ''}`;
                        document.getElementById('bizGridSelDetail').textContent = `SAHA ${taken.pitchNumber} | ${taken.dateText} | ${taken.hourText} | ${taken.payment_status === 'odendi' ? 'ÖDENDİ' : 'ÖDENMEDİ'}${taken.reservation_price ? ` | ${taken.reservation_price} TL` : ''}`;
                    }
                };
            } else {
                box.textContent = hour;
            }
            grid.appendChild(box);
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
        const response = await fetch(`/api/reservations/${id}`, {
            method: 'PUT', headers: getAuthHeaders(),
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
        const response = await fetch(`/api/reservations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
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
        const response = await fetch(`/api/subscriptions/${currentBusinessFieldKey}`);
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
        const response = await fetch('/api/subscriptions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldKey: currentBusinessFieldKey, pitchNumber: pitchNum, dayOfWeek, hourText: hour, subscriberName: name, subscriberPhone: phone })
        });
        const result = await response.json();
        if (result.success) {
            alert("Haftalık abonelik başarıyla tanımlandı!");
            document.getElementById('subNameInput').value = "";
            document.getElementById('subPhoneInput').value = "";
            document.getElementById('subHourSelect').value = "";
            const listResp = await fetch('/api/pitch-list');
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
        const response = await fetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            alert("Abonelik başarıyla silindi ve saat boşa çıkarıldı!");
            const listResp = await fetch('/api/pitch-list');
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
        const response = await fetch('/api/pitch-list');
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            pitchObjectsList = result.data;
            
            // Override static fieldsData with database values dynamically
            pitchObjectsList.forEach(pitch => {
                if (pitch.pitchNumber === 1) {
                    if (!fieldsData[pitch.fieldKey]) {
                        fieldsData[pitch.fieldKey] = {
                            name: pitch.name ? pitch.name.replace(/\s*-\s*SAHA\s*1/i, '') : pitch.fieldKey.toUpperCase(),
                            address: pitch.address || '',
                            coordinates: pitch.coordinates || '',
                            phone: pitch.phone || '',
                            isClosed: false,
                            hasService: pitch.hasService || 'Servis: Yok',
                            openingHour: pitch.openingHour || '09:00',
                            closingHour: pitch.closingHour || '23:00',
                            aboneHours: [],
                            disabledHours: [],
                            pitchCount: 1,
                            pricing: '2500/3000',
                            refreshments: pitch.refreshments || '',
                            cleats: pitch.cleats || 'Krampon Kiralanmaz',
                            shower: pitch.shower || 'Duş Yok',
                            market: pitch.market || 'Market Yok'
                        };
                    } else {
                        fieldsData[pitch.fieldKey].name = pitch.name ? pitch.name.replace(/\s*-\s*SAHA\s*1/i, '') : pitch.fieldKey.toUpperCase();
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
                }
            });
        }
    } catch (error) { console.error("Saha listesi yüklenemedi:", error); }
}

async function loadPitchSettingsFromDatabase() {
    try {
        const response = await fetch('/api/pitch-settings');
        const result = await response.json();
        if (result.success) {
            result.data.forEach(setting => {
                const pitch1 = pitchObjectsList.find(p => p.fieldKey === setting.fieldKey && p.pitchNumber === 1);
                const displayName = pitch1 && pitch1.name ? pitch1.name.replace(/\s*-\s*SAHA\s*1/i, '') : setting.fieldKey.toUpperCase();

                if (!fieldsData[setting.fieldKey]) {
                    fieldsData[setting.fieldKey] = {
                        name: displayName,
                        address: '',
                        coordinates: '',
                        phone: '',
                        isClosed: setting.isClosed === 1,
                        hasService: 'Servis: Yok',
                        openingHour: setting.openingHour,
                        closingHour: setting.closingHour,
                        aboneHours: JSON.parse(setting.aboneHours || '[]'),
                        disabledHours: JSON.parse(setting.disabledHours || '[]'),
                        pitchCount: setting.field_count || 1,
                        pricing: setting.pricing || '2500/3000',
                        refreshments: '',
                        cleats: 'Krampon Kiralanmaz',
                        shower: 'Duş Yok',
                        market: 'Market Yok'
                    };
                } else {
                    fieldsData[setting.fieldKey].name = displayName;
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

    grid.innerHTML = Object.keys(fieldsData).filter(key => !fieldsData[key].isClosed).map(key => {
        const field = fieldsData[key];
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.coordinates)}`;

        const serviceStatus = (field.hasService || "Servis: Yok").toLowerCase().includes("var");
        const cleatsStatus = (field.cleats || "Krampon Kiralanmaz") === "Krampon Kiralanır";
        const showerStatus = (field.shower || "Duş Yok").toLowerCase().includes("var");
        const marketStatus = (field.market || "Market Yok").toLowerCase().includes("var");
        const refreshmentsText = field.refreshments ? `İKRAMLAR: ${field.refreshments.toLocaleUpperCase('tr-TR')}` : "";

        const fieldPitches = pitchObjectsList.filter(p => p.fieldKey === key);
        let fieldAvgRating = 0;
        let fieldReviewCount = 0;
        if (fieldPitches.length > 0) {
            const totalRating = fieldPitches.reduce((sum, p) => sum + (parseFloat(p.average_rating) || 0), 0);
            fieldAvgRating = totalRating / fieldPitches.length;
            fieldReviewCount = fieldPitches.reduce((sum, p) => sum + (parseInt(p.review_count) || 0), 0);
        }
        const ratingHtml = fieldAvgRating > 0
            ? `<span style="font-size:0.8rem; color:#fbbf24; font-weight:700; white-space:nowrap;">${fieldAvgRating.toFixed(1)} <span style="font-size:0.7rem;">★</span></span>`
            : `<span style="font-size:0.7rem; color:var(--text-muted); font-weight:600; white-space:nowrap;">— ★</span>`;

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
                    <h3>${field.name} ${ratingHtml}</h3>
                </div>
                <div class="mcard-sep"></div>
                <div class="pitch-badges-row">
                    ${serviceBadge}
                    ${cleatsBadge}
                    ${showerBadge}
                    ${marketBadge}
                </div>
                ${refreshmentsText ? `<div class="mcard-sep"></div><div class="refreshments-display">${refreshmentsText}</div>` : ''}
                <div class="mcard-sep"></div>
                <div class="field-card-meta">
                    <a href="tel:${field.phone}" class="phone-link" onclick="event.stopPropagation();">${field.phone}</a>
                    <a href="${mapUrl}" target="_blank" class="map-link" onclick="event.stopPropagation();">HARİTADA GÖSTER</a>
                </div>
                <div class="mcard-sep"></div>
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
                <div class="field-photos-thumbnails" id="field-photos-thumbnails-${key}" style="display:flex; gap:6px; overflow-x:auto; padding:6px 0; margin-bottom:6px;"></div>
                <div class="field-info-row">
                    <div class="field-main-details">
                        <h3>${field.name} ${ratingHtml}</h3>
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

    Object.keys(fieldsData).forEach(key => {
        loadFieldPhotos(key);
    });
}

// =======================================================
// SAHA FOTOĞRAFLARI YÜZEY / GALERİ
// =======================================================

// Fotoğrafları yükle ve thumbnail olarak göster
async function loadFieldPhotos(fieldKey) {
    const container = document.getElementById(`field-photos-thumbnails-${fieldKey}`);
    if (!container) return;
    try {
        const response = await fetch(`/api/field-photos/${fieldKey}`);
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(p =>
                `<img src="${p.url}" alt="${p.caption || ''}" style="width:80px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;flex-shrink:0;" onclick="event.stopPropagation();showPhotoGallery('${fieldKey}', ${p.id})">`
            ).join('');
        } else {
            container.innerHTML = '';
        }
    } catch(e) { console.error('Fotoğraf yükleme hatası:', e); }
}

// İşletme panelinde fotoğraf yükle
async function uploadFieldPhoto() {
    const fileInput = document.getElementById('fieldPhotoInput');
    const captionInput = document.getElementById('fieldPhotoCaption');
    const file = fileInput?.files?.[0];
    if (!file) { alert('Lütfen bir fotoğraf seçin!'); return; }
    if (!currentBusinessFieldKey) { alert('Önce bir sahaya giriş yapın!'); return; }
    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;
        try {
            const response = await fetch('/api/field-photos/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fieldKey: currentBusinessFieldKey, imageData, caption: captionInput?.value || '' })
            });
            const result = await response.json();
            if (result.success) {
                alert('Fotoğraf yüklendi!');
                fileInput.value = '';
                if (captionInput) captionInput.value = '';
                loadBusinessFieldPhotos();
                renderFieldsGrid();
            } else {
                alert('Hata: ' + (result.message || 'Yüklenemedi'));
            }
        } catch(err) { alert('Bağlantı hatası!'); }
    };
    reader.readAsDataURL(file);
}

// İşletme panelinde fotoğrafları listele
async function loadBusinessFieldPhotos() {
    const container = document.getElementById('fieldPhotoGallery');
    if (!container) return;
    try {
        const response = await fetch(`/api/field-photos/${currentBusinessFieldKey}`);
        const result = await response.json();
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(p =>
                `<div style="position:relative;">
                    <img src="${p.url}" alt="${p.caption || ''}" style="width:100%;height:90px;object-fit:cover;border-radius:6px;">
                    ${p.caption ? `<div style="font-size:0.65rem;color:var(--text-muted);margin-top:2px;">${p.caption}</div>` : ''}
                    <button style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:14px;cursor:pointer;line-height:1;padding:0;" onclick="deleteFieldPhoto(${p.id})">×</button>
                </div>`
            ).join('');
        } else {
            container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;">Henüz fotoğraf yüklenmemiş.</p>';
        }
    } catch(e) { console.error(e); }
}

async function deleteFieldPhoto(id) {
    if (!await showConfirmModal('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;
    try {
        const response = await fetch(`/api/field-photos/${id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
            loadBusinessFieldPhotos();
            renderFieldsGrid();
        } else { alert('Silme hatası!'); }
    } catch(e) { alert('Bağlantı hatası!'); }
}

// Tam ekran galeri gösterimi
function showPhotoGallery(fieldKey, startId) {
    fetch(`/api/field-photos/${fieldKey}`).then(r => r.json()).then(result => {
        if (!result.success || !result.data.length) return;
        const photos = result.data;
        let currentIndex = photos.findIndex(p => p.id === startId);
        if (currentIndex === -1) currentIndex = 0;

        const overlay = document.createElement('div');
        overlay.id = 'photo-gallery-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        document.body.appendChild(overlay);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = 'position:absolute;top:20px;right:30px;background:transparent;border:none;color:#fff;font-size:40px;cursor:pointer;z-index:1;';
        closeBtn.onclick = () => overlay.remove();
        overlay.appendChild(closeBtn);

        const img = document.createElement('img');
        img.style.cssText = 'max-width:90vw;max-height:80vh;border-radius:8px;object-fit:contain;';

        const caption = document.createElement('p');
        caption.style.cssText = 'color:#aaa;margin-top:12px;font-size:0.9rem;';

        const navDiv = document.createElement('div');
        navDiv.style.cssText = 'margin-top:15px;display:flex;gap:20px;';

        const prevBtn = document.createElement('button');
        prevBtn.textContent = '← ÖNCEKİ';
        prevBtn.style.cssText = 'background:var(--primary-green);color:#000;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;';
        prevBtn.onclick = () => {
            currentIndex = (currentIndex - 1 + photos.length) % photos.length;
            img.src = photos[currentIndex].url;
            caption.textContent = photos[currentIndex].caption || '';
        };
        navDiv.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'SONRAKİ →';
        nextBtn.style.cssText = 'background:var(--primary-green);color:#000;border:none;padding:8px 20px;border-radius:6px;font-weight:700;cursor:pointer;';
        nextBtn.onclick = () => {
            currentIndex = (currentIndex + 1) % photos.length;
            img.src = photos[currentIndex].url;
            caption.textContent = photos[currentIndex].caption || '';
        };
        navDiv.appendChild(nextBtn);

        overlay.appendChild(img);
        overlay.appendChild(caption);
        if (photos.length > 1) overlay.appendChild(navDiv);

        img.src = photos[currentIndex].url;
        caption.textContent = photos[currentIndex].caption || '';

        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }).catch(e => console.error(e));
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
        alert("Bu hal? saha taraf?ndan engellendi?iniz i?in işlem yapamazs?n?z!");
        return;
    }
    currentSelectedFieldKey = key;
    document.querySelectorAll('.field-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('card-' + key);
    if(card) card.classList.add('active');
    
    document.getElementById('placeholderText').style.display = 'none';
    const bookingPanel = document.getElementById('bookingPanel');
    bookingPanel.style.display = 'block';
    
    // Mobil i?in accordion etkisi (Saha kart?n?n alt?na ta??)
    if (window.innerWidth <= 768 && card) {
        const panel = document.getElementById('customerBookingPanel');
        panel.classList.add('mobile-open');
        panel.style.display = '';
        card.parentNode.insertBefore(panel, card.nextSibling);
    } else {
        const layout = document.getElementById('customerBookingGridLayout');
        const panel = document.getElementById('customerBookingPanel');
        layout.appendChild(panel);
    }

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
    let dateText = document.getElementById('datePicker').value;

    // Gece saatleri (00:00-05:59) aslında bir sonraki güne ait
    const slotStartH = parseInt(hour.split(':')[0]);
    if (slotStartH < 6) {
        const nextDay = getNextCalendarDayText(dateText);
        if (nextDay) dateText = nextDay;
    }

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
        const response = await fetch('/api/reservations', {
            method: 'POST', headers: getAuthHeaders(),
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
        const response = await fetch('/api/reservations');
        const result = await response.json();
        if (result.success) {
            userReservations = result.data.filter(r => r.status !== 'cancelled');
            if (currentSelectedFieldKey) onDateOrFieldChange();
        }
    } catch (error) { console.error("Dolu saatler veritabanından çekilemedi:", error); }
}

async function loadForumPostsFromServer() {
    try {
        const response = await fetch('/api/forum');
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
        const response = await fetch('/api/forum', {
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
    const foundBadge = post.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">ANLAŞMA SAĞLANDI</div>' : '';
    return `
    <div class="post-card" id="forum-post-${post.id}" style="display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: start; padding: 12px;">
        <!-- Tarih (Sol ?st) -->
        <div style="grid-column: 1; grid-row: 1; font-size: 0.85rem; color: var(--text-muted);">
            ${post.dateText} - ${post.hourText}
        </div>
        
        <!-- Aran?lan Mevki (Sa? ?st) -->
        <div style="grid-column: 2; grid-row: 1; text-align: right;">
            <span class="post-pos-badge" style="font-size: 0.75rem; padding: 2px 6px;">ARANAN: ${post.position}</span>
        </div>
        
        <!-- Detaylar (Sol Alt) -->
        <div style="grid-column: 1; grid-row: 2; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px;">
            <div style="color: var(--neon-green); font-weight: bold;">DURUM: ${post.payment}</div>
            <div style="font-style: italic;">"${(post.msg || '').toLocaleUpperCase('tr-TR')}"</div>
        </div>
        
        <!-- Butonlar (Sa? Alt) -->
        <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
            ${foundBadge}
            ${isOwner && post.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markForumFound(${post.id})">BULUNDU</button>' : ''}
        </div>

        <!-- Yorumlar -->
        <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
            <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('forum', ${post.id})">
                İLETİŞİM / YORUMLAR
            </div>
            <div id="forum-comments-forum-${post.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                <div id="forum-comments-list-forum-${post.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                <div style="display:flex;gap:5px;align-items:center;">
                    <input type="text" id="forum-comment-text-${post.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yazılır...' : 'Giriş yapın...'}" ${loggedInUser ? '' : 'disabled'}>
                    <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('forum', ${post.id})" ${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
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
        const response = await fetch('/api/team-seekers', {
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
        const response = await fetch('/api/match-seekers', {
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
        const response = await fetch(`/api/match-seekers?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
            let seekers = result.data;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            seekers = seekers.filter(s => {
                if (s.status === 'suresi_gecti' || s.status === 'bulundu') return false;
                
                // availableDates kontrolü
                try {
                    const dates = JSON.parse(s.availableDates || '[]');
                    if (dates.length > 0) {
                        const allPast = dates.every(d => {
                            const pDate = parseTurkishDateString(d);
                            if (!pDate) return false;
                            pDate.setHours(23, 59, 59, 999); // günün sonu
                            return pDate < todayStart;
                        });
                        if (allPast) return false;
                    }
                } catch(e) {
                    console.error("Match seeker date filter error:", e);
                }
                return true;
            });
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
        const foundBadge = s.status === 'bulundu' ? '<div style="background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:700;font-size:0.75rem;text-align:center;white-space:nowrap;">ANLAŞMA SAĞLANDI</div>' : '';
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
                <div style="font-weight:bold;">${s.playerName} <span style="color:var(--text-muted); font-weight:normal; font-size:0.75rem;">(${s.age} Yaş${s.height ? `, ${s.height}cm` : ''}${s.weight ? `, ${s.weight}kg` : ''})</span></div>
                ${ratingHtml}
                <div style="color:var(--neon-green); font-size:0.75rem;">${feeText ? 'ÜCRET: ' + feeText : 'ÜCRETSİZ'}</div>
                ${s.msg ? `<div style="font-style:italic; font-size:0.75rem;">"${s.msg.toLocaleUpperCase('tr-TR')}"</div>` : ''}
            </div>
            
            <!-- Bottom Right: Buttons -->
            <div style="grid-column: 2; grid-row: 2; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 5px;">
                ${foundBadge}
                ${isOwner && s.status !== 'bulundu' ? '<button class="action-btn" style="padding:4px 12px;font-size:0.75rem;background:#f59e0b;color:#000;white-space:nowrap;border-radius:4px;border:none;cursor:pointer;" onclick="markMatchFound(' + s.id + ')">BULUNDU</button>' : ''}
                <button class="profile-btn" style="padding:4px 12px;font-size:0.75rem;border-radius:4px;" onclick="openPlayerProfile('${s.phone || ''}', '${s.playerName.replace(/'/g, "\\'")}', ${s.age}, '${s.position}')">PROFİL</button>
            </div>
            
            <!-- Comments -->
            <div style="grid-column: 1 / -1; grid-row: 3; margin-top: 5px;">
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('match_seeker', ${s.id})">İLETİŞİM / YORUMLAR</div>
                <div id="forum-comments-match_seeker-${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-match_seeker-${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yazılır...' : 'Giriş yapın...'}" ${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('match_seeker', ${s.id})" ${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
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
        const response = await fetch('/api/team-seekers');
        const result = await response.json();

        if (result.success) {
            let seekers = result.data;
            const limitDate = new Date();
            limitDate.setDate(limitDate.getDate() - 30); // 30 günden eski olmasın

            seekers = seekers.filter(s => {
                if (s.status === 'suresi_gecti' || s.status === 'bulundu') return false;
                const created = new Date(s.created_at);
                return created >= limitDate;
            });
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
                <div class="card-comments-toggle" style="font-size: 0.8rem; padding: 6px;" onclick="toggleForumComments('team_seeker', ${s.id})">İLETİŞİM / YORUMLAR</div>
                <div id="forum-comments-team_seeker-${s.id}" style="display:none;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;">
                    <div id="forum-comments-list-team_seeker-${s.id}" style="max-height:150px;overflow-y:auto;margin-bottom:8px;font-size:0.8rem;"></div>
                    <div style="display:flex;gap:5px;align-items:center;">
                        <input type="text" id="forum-comment-text-${s.id}" class="form-control" style="flex:1; padding: 6px; font-size: 0.8rem;" placeholder="${loggedInUser ? 'Buradan yazılır...' : 'Giriş yapın...'}" ${loggedInUser ? '' : 'disabled'}>
                        <button style="padding:4px 8px; font-size:0.7rem; font-weight:700; border:none; border-radius:4px; background:var(--primary-green); color:#000; cursor:pointer;" onclick="submitForumComment('team_seeker', ${s.id})" ${loggedInUser ? '' : 'disabled'}>GÖNDER</button>
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
        const response = await fetch(`/api/team-seekers/${id}/found`, {
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
    const userAuthSection = document.getElementById('userAuthSection');
    const businessAuthSection = document.getElementById('businessAuthSection');
    const userLogoutSection = document.getElementById('userLogoutSection');
    const welcomeText = document.getElementById('welcomeText');

    if (loggedInUser) {
        document.body.classList.add('logged-in');
        if (userAuthSection) userAuthSection.style.display = 'none';
        if (businessAuthSection) businessAuthSection.style.display = 'none';
        if (userLogoutSection) userLogoutSection.style.display = 'flex';
        if (welcomeText) welcomeText.innerText = `HOŞ GELDİN: ${loggedInUser}`;
        
        if (playersLock) playersLock.style.display = 'none';
        if (matchesLock) matchesLock.style.display = 'none';
        if (teamsLock) teamsLock.style.display = 'none';
        
        const addRev = document.getElementById('addReviewSection');
        const authAlert = document.getElementById('reviewAuthAlert');
        if (addRev) addRev.style.display = 'block';
        if (authAlert) authAlert.style.display = 'none';
    } else {
        document.body.classList.remove('logged-in');
        if (userAuthSection) userAuthSection.style.display = 'flex';
        if (businessAuthSection) businessAuthSection.style.display = 'flex';
        if (userLogoutSection) userLogoutSection.style.display = 'none';
        if (welcomeText) welcomeText.innerText = '';
        
        if (playersLock) playersLock.style.display = 'flex';
        if (matchesLock) matchesLock.style.display = 'flex';
        if (teamsLock) teamsLock.style.display = 'flex';

        const addRev = document.getElementById('addReviewSection');
        const authAlert = document.getElementById('reviewAuthAlert');
        if (addRev) addRev.style.display = 'none';
        if (authAlert) authAlert.style.display = 'block';
    }
}

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
                if (btn) btn.innerText = '+ ?lan Ver';
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
        const response = await fetch(`/api/player-reviews/${phone}`);
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
        const response = await fetch('/api/player-reviews', {
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
    
    const hourPart = hourText.split(' - ')[1] || hourText.split(' - ')[0];
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
            const subResp = await fetch(`/api/subscriptions/by-phone/${encodeURIComponent(currentUser.phone)}`);
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
        const response = await fetch(`/api/player-reviews/${currentUser.phone}`);
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
    const position = document.getElementById('profilePositionInput') ? document.getElementById('profilePositionInput').value : '';
    const experience = document.getElementById('profileExperienceInput') ? document.getElementById('profileExperienceInput').value : '';
    
    if (!name || !phone) {
        alert("Ad Soyad ve Telefon alanları zorunludur!");
        return;
    }
    
    const phoneClean = phone.replace(/\D/g, '');
    if (!phoneClean.startsWith('05') || phoneClean.length !== 11) {
        alert("Telefon numarası 05 ile başlamalı ve tam 11 rakam olmalıdır! (Örn: 05XXXXXXXXX)");
        return;
    }
    
    const updateData = {
        id: currentUser.id,
        name,
        phone: phoneClean,
        age: age ? parseInt(age) : null,
        height: height ? parseInt(height) : null,
        weight: weight ? parseInt(weight) : null,
        position,
        experience
    };
    
    try {
        const response = await fetch('/api/users/profile', {
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
        if (!fieldsData[currentBusinessFieldKey]) fieldsData[currentBusinessFieldKey] = {};
        const field = fieldsData[currentBusinessFieldKey];
        const resSettings = await fetch(`/api/pitch-settings/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                isClosed: field.isClosed ? 1 : 0,
                openingHour: field.openingHour || '09:00',
                closingHour: field.closingHour || '23:00',
                disabledHours: JSON.stringify(field.disabledHours || []),
                aboneHours: JSON.stringify(field.aboneHours || []),
                pricing: field.pricing || '2500/3000',
                field_count: count
            })
        });
        const resultSettings = await resSettings.json();
        
        if (!resultSettings.success) {
            alert("Saha sayısı kaydedilemedi: " + resultSettings.message);
            return;
        }
        
        // 2. İletişim, Servis ve Konum Ayarlarını Kaydet
        const response = await fetch(`/api/business-profile/${currentBusinessFieldKey}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ phone, hasService, coordinates, refreshments, cleats, shower, market })
        });
        const result = await response.json();
        
        if (result.success) {
            // Lokal fieldsData güncelle
            if (!fieldsData[currentBusinessFieldKey]) fieldsData[currentBusinessFieldKey] = {};
            fieldsData[currentBusinessFieldKey].pitchCount = count;
            fieldsData[currentBusinessFieldKey].phone = phone;
            fieldsData[currentBusinessFieldKey].hasService = hasService;
            fieldsData[currentBusinessFieldKey].coordinates = coordinates;
            fieldsData[currentBusinessFieldKey].refreshments = refreshments;
            fieldsData[currentBusinessFieldKey].cleats = cleats;
            fieldsData[currentBusinessFieldKey].shower = shower;
            fieldsData[currentBusinessFieldKey].market = market;
            
            // pitchObjectsList güncellemek için sunucudan son listeyi çek
            const listResp = await fetch('/api/pitch-list');
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
        const response = await fetch('/api/all-daily-hours');
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
        const response = await fetch(`/api/subscriptions/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert("Aboneliğiniz başarıyla iptal edildi!");
            await loadReservationsFromServer();
            const listResp = await fetch('/api/pitch-list');
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
        const response = await fetch(`/api/reservations/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
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
        const response = await fetch(`/api/business-debts/${currentBusinessFieldKey}?filter=${filter}`, { headers: getAuthHeaders() });
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
        const response = await fetch(`/api/reservations/${id}/payment`, {
            method: 'PUT',
            headers: getAuthHeaders(),
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
        const response = await fetch(`/api/forum/${id}/found`, {
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
        const response = await fetch(`/api/match-seekers/${id}/found`, {
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
        const response = await fetch(`/api/forum-comments/${type}/${postId}`);
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
        const response = await fetch('/api/forum-comments', {
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
        const response = await fetch(`/api/field-comments/${fieldKey}`);
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
        const response = await fetch('/api/field-comments', {
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

// TURNSTILE DESTEĞİ
let latestTurnstileToken = "";
let turnstileScriptLoaded = false;
function loadTurnstileScript() {
    return new Promise((resolve) => {
        if (window.turnstile) { turnstileScriptLoaded = true; resolve(); return; }
        const interval = setInterval(() => {
            if (window.turnstile) {
                clearInterval(interval);
                turnstileScriptLoaded = true;
                resolve();
            }
        }, 50);
        setTimeout(() => {
            clearInterval(interval);
            resolve();
        }, 3000);
    });
}
function onTurnstileSuccess(token) {
    latestTurnstileToken = token;
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
        const response = await fetch(`/api/reviews/${currentBusinessFieldKey}`);
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
        const response = await fetch(`/api/reviews/${id}/reply`, {
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

async function loadUserBlacklist() {
    if (!currentUser || !currentUser.phone) {
        userBlacklistedFields = [];
        return;
    }
    try {
        const response = await fetch(`/api/blacklists/by-phone/${encodeURIComponent(currentUser.phone)}`);
        const result = await response.json();
        if (result.success) {
            userBlacklistedFields = result.data;
        }
    } catch (error) {
        console.error("Kara liste sorgulama hatası:", error);
    }
}


// =======================================================
// SÜPER YÖNETİCİ PANELİ
// =======================================================

function showAdminLoginWrapper() {
    document.body.classList.remove('logged-in');
    const loginWrapper = document.getElementById('adminLoginWrapper');
    if (loginWrapper) loginWrapper.style.display = 'flex';
    const panel = document.getElementById('adminPanel');
    if (panel) panel.style.display = 'none';
    const logoutSec = document.getElementById('adminLogoutSection');
    if (logoutSec) logoutSec.style.display = 'none';
    const burger = document.getElementById('mobileHamburgerBtn');
    if (burger) burger.style.display = 'none';
}

function showAdminUI() {
    document.body.classList.add('logged-in');
    const loginWrapper = document.getElementById('adminLoginWrapper');
    if (loginWrapper) loginWrapper.style.display = 'none';
    const panel = document.getElementById('adminPanel');
    if (panel) panel.style.display = 'block';
    const logoutSec = document.getElementById('adminLogoutSection');
    if (logoutSec) logoutSec.style.display = 'flex';
    const burger = document.getElementById('mobileHamburgerBtn');
    if (burger) burger.style.display = 'block';

    const welcome = document.getElementById('adminWelcomeText');
    if (welcome && adminData) welcome.textContent = `🛡️ ${adminData.display_name}`;

    switchAdminTab('dashboard');
}

function handleAdminLogin() {
    const usernameEl = document.getElementById('adminUsername');
    const passwordEl = document.getElementById('adminPassword');
    if (!usernameEl || !passwordEl) return;

    const username = usernameEl.value.trim();
    const password = passwordEl.value.trim();
    const errorEl = document.getElementById('adminLoginError');
    const loginBtn = document.getElementById('adminLoginBtn');
    
    if (!username || !password) { 
        if (errorEl) { errorEl.textContent = 'Kullanıcı adı ve şifre girin!'; errorEl.style.display = 'block'; } 
        return; 
    }
    if (errorEl) errorEl.style.display = 'none';
    if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'GİRİŞ YAPILIYOR...'; }
    
    fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(r => { if (!r.ok) return r.text().then(t => { throw new Error(t); }); return r.json(); })
    .then(data => {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'GİRİŞ YAP'; }
        if (!data.success) { 
            if (errorEl) { errorEl.textContent = data.message; errorEl.style.display = 'block'; } 
            return; 
        }
        isAdminLoggedIn = true;
        adminToken = data.token;
        adminData = data.admin;
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminData', JSON.stringify(data.admin));
        const rememberChecked = document.getElementById('adminRememberMe')?.checked || false;
        if (rememberChecked) {
            localStorage.setItem('adminRemember', 'true');
        } else {
            localStorage.removeItem('adminRemember');
        }
        passwordEl.value = "";
        showAdminUI();
    })
    .catch((err) => {
        if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'GİRİŞ YAP'; }
        let msg = 'Sunucu hatası!';
        try { const e = JSON.parse(err.message); if (e.message) msg = e.message; } catch(e) { msg = err.message || 'Sunucu hatası!'; }
        if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    });
}

function handleAdminLogout() {
    isAdminLoggedIn = false;
    adminToken = null;
    adminData = null;
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('adminRemember');
    showAdminLoginWrapper();
}

function openAdminPanel() {
    showAdminUI();
}

function exitAdminPanel() {
    handleAdminLogout();
}

function getAdminHeaders() {
    return { 'Content-Type': 'application/json', 'x-admin-token': adminToken || '' };
}

function switchAdminTab(tab) {
    const tabs = ['dashboard', 'fields', 'users', 'activity', 'blacklist', 'announcements', 'revenue', 'ads', 'addfield'];
    tabs.forEach(t => {
        const el = document.getElementById('admin' + t.charAt(0).toUpperCase() + t.slice(1));
        if (el) el.style.display = t === tab ? 'block' : 'none';
    });

    const tabMap = {
        'dashboard': 'dashboard',
        'fields': 'sahalar',
        'users': 'kullanıcılar',
        'activity': 'aktivite',
        'blacklist': 'kara liste',
        'announcements': 'duyurular',
        'revenue': 'gelir',
        'ads': 'ilan yönetimi',
        'addfield': 'saha ekle'
    };

    document.querySelectorAll('#adminPanel .admin-tabs .tab-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const expected = tabMap[tab];
        btn.classList.toggle('active', expected && btnText.includes(expected));
    });

    // Sidebar active tabs highlight support
    document.querySelectorAll('#adminMenuTabsContainer .nav-btn').forEach(btn => {
        const btnText = btn.textContent.trim().toLowerCase();
        const expected = tabMap[tab];
        btn.classList.toggle('active', expected && btnText.includes(expected));
    });

    if (tab === 'dashboard') loadAdminDashboard();
    if (tab === 'fields') renderAdminFields();
    if (tab === 'users') renderAdminUsers();
    if (tab === 'activity') renderAdminActivity();
    if (tab === 'blacklist') loadAdminGlobalBlacklist();
    if (tab === 'announcements') loadAdminAnnouncements();
    if (tab === 'revenue') renderAdminRevenue();
    if (tab === 'ads') renderAdminAds();
    if (tab === 'addfield') initAddFieldPanel();
}

function loadAdminDashboard() {
    fetch('/api/admin/dashboard', { headers: getAdminHeaders() })
    .then(r => r.json())
    .then(data => {
        if (!data.success) return;
        
        // Temel Statlar
        document.getElementById('adminStatPitches').textContent = data.data.totalPitches || 0;
        document.getElementById('adminStatActive').textContent = data.data.activePitches || 0;
        document.getElementById('adminStatUsers').textContent = data.data.totalUsers || 0;
        
        const breakDown = data.data.reservationsBreakdown || {};
        document.getElementById('adminStatReservations').textContent = breakDown.today || 0;
        
        // Rezervasyon Detayları
        document.getElementById('rStatToday').textContent = breakDown.today || 0;
        document.getElementById('rStatWeekly').textContent = breakDown.weekly || 0;
        document.getElementById('rStatMonthly').textContent = breakDown.monthly || 0;
        document.getElementById('rStatTotal').textContent = breakDown.total || 0;
        
        // En Aktif Sahalar
        const activeFieldsList = document.getElementById('adminActivePitchesList');
        if (activeFieldsList) {
            const activeFields = data.data.activeFields || [];
            if (activeFields.length === 0) {
                activeFieldsList.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Rezervasyon kaydı bulunmuyor.</div>';
            } else {
                const maxCount = Math.max(...activeFields.map(f => f.count), 1);
                activeFieldsList.innerHTML = activeFields.map(f => {
                    const percentage = Math.round((f.count / maxCount) * 100);
                    return `
                    <div style="margin-bottom:8px;">
                        <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:#e2e8f0;margin-bottom:4px;">
                            <span>${f.field_name || f.fieldKey}</span>
                            <strong>${f.count} Rezervasyon</strong>
                        </div>
                        <div style="background:rgba(255,255,255,0.05);height:8px;border-radius:4px;overflow:hidden;">
                            <div style="background:var(--primary-green);width:${percentage}%;height:100%;border-radius:4px;transition:width 0.5s ease;"></div>
                        </div>
                    </div>`;
                }).join('');
            }
        }
        
        // Top Üyeler
        const topUsersList = document.getElementById('adminTopUsersList');
        if (topUsersList) {
            const topUsers = data.data.topUsers || [];
            if (topUsers.length === 0) {
                topUsersList.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:10px;">Rezervasyon yapan üye bulunmuyor.</div>';
            } else {
                topUsersList.innerHTML = topUsers.map((u, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:0.8rem;">
                    <div>
                        <span style="color:#fbbf24;font-weight:bold;margin-right:6px;">#${i+1}</span>
                        <span style="color:#fff;">${u.user_name}</span><br>
                        <small style="color:var(--text-muted);">${u.user_phone}</small>
                    </div>
                    <div style="text-align:right;">
                        <strong style="color:var(--primary-green);">${u.count} Maç</strong><br>
                        <small style="color:var(--text-muted);">${u.spend || 0} TL</small>
                    </div>
                </div>`).join('');
            }
        }
        
        // 30 Günlük Rezervasyon Trendi (CSS Bar Grafik)
        const trendChart = document.getElementById('adminTrendChart');
        if (trendChart) {
            const trend = data.data.trendStats || [];
            if (trend.length === 0) {
                trendChart.innerHTML = '<div style="color:var(--text-muted);font-size:0.8rem;padding:40px;text-align:center;width:100%;">Son 30 güne ait rezervasyon trend verisi bulunmuyor.</div>';
            } else {
                const maxTrendCount = Math.max(...trend.map(t => t.count), 1);
                trendChart.innerHTML = trend.map(t => {
                    const heightPercent = Math.max((t.count / maxTrendCount) * 100, 5); // en az 5% yükseklik olsun
                    const dateFormatted = t.date.split('-').slice(1,3).reverse().join('/'); // DD/MM
                    return `
                    <div class="trend-bar-wrapper" style="flex:1;display:flex;flex-direction:column;align-items:center;min-width:24px;cursor:pointer;" title="${t.date}: ${t.count} Rezervasyon">
                        <div style="font-size:0.65rem;color:var(--text-muted);margin-bottom:4px;font-weight:bold;">${t.count}</div>
                        <div style="background:rgba(139,92,246,0.15);width:100%;height:120px;display:flex;align-items:flex-end;border-radius:4px;overflow:hidden;">
                            <div style="background:#8b5cf6;width:100%;height:${heightPercent}%;border-radius:4px 4px 0 0;transition:height 0.5s ease;"></div>
                        </div>
                        <div style="font-size:0.65rem;color:var(--text-muted);margin-top:6px;transform:rotate(-45deg);transform-origin:top left;white-space:nowrap;padding-left:4px;">${dateFormatted}</div>
                    </div>`;
                }).join('');
            }
        }
    });
}

// --- SAHA YÖNETİMİ ---
async function renderAdminFields() {
    const container = document.getElementById('adminFieldList');
    const deletedContainer = document.getElementById('adminDeletedFieldList');
    if (!container) return;

    // Populating dropdowns for opening/closing hour in "afOpening" and "afClosing" if empty
    const afOpening = document.getElementById('afOpening');
    const afClosing = document.getElementById('afClosing');
    if (afOpening && afOpening.innerHTML === "") {
        masterHoursList.forEach(h => {
            const prefix = h.split(' - ')[0];
            let opt1 = document.createElement('option'); opt1.value = prefix; opt1.text = prefix;
            let opt2 = document.createElement('option'); opt2.value = prefix; opt2.text = prefix;
            afOpening.appendChild(opt1); afClosing.appendChild(opt2);
        });
        afOpening.value = '09:00';
        afClosing.value = '23:00';
    }

    // Register phone mask for Add Field
    const afPhone = document.getElementById('afPhone');
    if (afPhone && !afPhone.dataset.masked) {
        afPhone.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.startsWith('0')) v = v.substring(1);
            if (v.length > 10) v = v.substring(0, 10);
            e.target.value = v ? '0' + v : '';
        });
        afPhone.dataset.masked = 'true';
    }

    const search = (document.getElementById('adminFieldSearch').value || '').toLowerCase();

    try {
        // Fetch active fields
        const res = await fetch('/api/admin/fields', { headers: getAdminHeaders() });
        const result = await res.json();
        if (result.success) {
            const fields = result.data.filter(f => (f.name || f.fieldKey).toLowerCase().includes(search));
            if (fields.length === 0) {
                container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Saha bulunamadı.</div>';
            } else {
                container.innerHTML = fields.map(f => {
                    const isClosed = f.isClosed === 1;
                    return `<div class="admin-field-card${isClosed ? ' passive' : ''}">
                        <div class="field-info">
                            <div class="field-name">${f.name || f.fieldKey.toUpperCase()}</div>
                            <div class="field-meta">${f.address || ''} · ${f.phone || ''} · ${f.pitch_count || 1} saha · ${isClosed ? '<span style="color:#ef4444;">PASİF (GİZLİ)</span>' : '<span style="color:#34d399;">AKTİF (GÖRÜNÜR)</span>'}</div>
                        </div>
                        <div class="field-actions">
                            <button class="btn-enter" onclick="adminEnterFieldPanel('${f.fieldKey}', '${(f.name || f.fieldKey).replace(/'/g, "\\'")}')">PANEL</button>
                            <button class="btn-visibility" onclick="adminToggleFieldVisibility('${f.fieldKey}')">${isClosed ? 'GÖSTER' : 'GİZLE'}</button>
                            <button class="btn-delete" onclick="adminDeleteField('${f.fieldKey}')">SİL</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // Fetch deleted fields
        const delRes = await fetch('/api/admin/deleted-fields', { headers: getAdminHeaders() });
        const delResult = await delRes.json();
        if (delResult.success) {
            const delFields = delResult.data.filter(f => (f.name || f.fieldKey).toLowerCase().includes(search));
            if (delFields.length === 0) {
                if (deletedContainer) deletedContainer.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Silinen saha geçmişi temiz.</div>';
            } else {
                deletedContainer.innerHTML = delFields.map(f => {
                    return `<div class="admin-field-card passive" style="border-color: rgba(239, 68, 68, 0.3);">
                        <div class="field-info">
                            <div class="field-name" style="text-decoration: line-through; color: var(--text-muted);">${f.name || f.fieldKey.toUpperCase()}</div>
                            <div class="field-meta">${f.address || ''} · ${f.phone || ''} · ${f.pitch_count || 1} saha · <span style="color:#ef4444;">SİLİNDİ</span></div>
                        </div>
                        <div class="field-actions">
                            <button class="action-btn" style="background:#10b981; color:#000; border-color:#10b981; font-size: 0.8rem; padding: 6px 12px; font-weight:800;" onclick="adminRestoreField('${f.fieldKey}')">GERİ GETİR</button>
                        </div>
                    </div>`;
                }).join('');
            }
        }
    } catch (error) {
        console.error("Saha verileri çekilemedi:", error);
    }
}

function adminToggleFieldVisibility(key) {
    fetch(`/api/admin/fields/${key}/visibility`, { method: 'PUT', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { 
            renderAdminFields(); 
            showToast(d.message, 'info'); 
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminDeleteField(key) {
    const confirmed = await showConfirmModal(`Saha silmek istediğinize emin misiniz? Bu sahayı daha sonra "Silinen Sahalar" geçmişinden geri getirebilirsiniz.`);
    if (!confirmed) return;
    fetch(`/api/admin/fields/${key}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { 
            renderAdminFields(); 
            showToast(d.message, 'info'); 
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminRestoreField(key) {
    const confirmed = await showConfirmModal(`Bu sahayı geri yüklemek istediğinize emin misiniz?`);
    if (!confirmed) return;
    fetch(`/api/admin/fields/${key}/restore`, { method: 'POST', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { 
            renderAdminFields(); 
            showToast(d.message, 'info'); 
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

function initAddFieldPanel() {
    // Populate hour dropdowns if empty
    ['afOpening', 'afClosing'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.innerHTML === '') {
            masterHoursList.forEach(h => {
                const prefix = h.split(' - ')[0];
                const opt = document.createElement('option');
                opt.value = prefix; opt.text = prefix;
                sel.appendChild(opt);
            });
            if (id === 'afOpening') sel.value = '09:00';
            if (id === 'afClosing') sel.value = '23:00';
        }
    });
    // Auto-sync afKey to afBusinessUsername
    const afKeyEl = document.getElementById('afKey');
    const afUserEl = document.getElementById('afBusinessUsername');
    if (afKeyEl && afUserEl && !afKeyEl.dataset.syncBound) {
        afKeyEl.addEventListener('input', () => {
            afUserEl.value = afKeyEl.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        });
        afKeyEl.dataset.syncBound = 'true';
    }
    // Phone mask for new panel
    const afPhone = document.getElementById('afPhone');
    if (afPhone && !afPhone.dataset.masked) {
        applyPhoneMask(afPhone);
        afPhone.dataset.masked = 'true';
    }
}

function submitAddField() {
    const afKeyVal = (document.getElementById('afKey').value || '').trim();
    const afNameVal = (document.getElementById('afName').value || '').trim();
    const afPhoneVal = (document.getElementById('afPhone').value || '').trim();
    const afPassVal = (document.getElementById('afBusinessPassword') ? document.getElementById('afBusinessPassword').value : '');
    const phoneClean = afPhoneVal.replace(/[^0-9]/g, '');

    if (!afKeyVal || !afNameVal) { showToast('Saha anahtarı ve adı zorunludur!', 'error'); return; }
    if (!phoneClean || !phoneClean.startsWith('05') || phoneClean.length !== 11) {
        showToast('Telefon numarası 05 ile başlamalı ve tam 11 hane olmalıdır!', 'error');
        return;
    }
    if (!afPassVal || afPassVal.length < 6) {
        showToast('İşletme şifresi en az 6 karakter olmalıdır!', 'error');
        return;
    }

    const data = {
        fieldKey: afKeyVal,
        name: afNameVal,
        address: (document.getElementById('afAddress').value || '').trim(),
        phone: phoneClean,
        openingHour: document.getElementById('afOpening').value || '09:00',
        closingHour: document.getElementById('afClosing').value || '23:00',
        pitchCount: parseInt(document.getElementById('afPitchCount').value) || 1,
        morningPrice: parseInt(document.getElementById('afMorningPrice').value) || 2500,
        eveningPrice: parseInt(document.getElementById('afEveningPrice').value) || 3000,
        businessPassword: afPassVal
    };
    fetch('/api/admin/fields', { method: 'POST', headers: getAdminHeaders(), body: JSON.stringify(data) })
    .then(r => r.json()).then(d => {
        if (d.success) {
            showToast(d.message, 'info');
            // Reset form
            ['afKey','afName','afAddress','afPhone','afPitchCount'].forEach(id => { const el = document.getElementById(id); if(el) el.value = id === 'afPitchCount' ? '1' : ''; });
            if (document.getElementById('afBusinessPassword')) document.getElementById('afBusinessPassword').value = '';
            if (document.getElementById('afBusinessUsername')) document.getElementById('afBusinessUsername').value = '';
            if (document.getElementById('afMorningPrice')) document.getElementById('afMorningPrice').value = '2500';
            if (document.getElementById('afEveningPrice')) document.getElementById('afEveningPrice').value = '3000';
            
            // Reload pitch data dynamically
            initPitchSelector().then(() => {
                loadPitchSettingsFromDatabase().then(() => {
                    renderFieldsGrid();
                });
            });

            switchAdminTab('fields');
        } else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

function adminEnterFieldPanel(key, name) {
    localStorage.setItem('businessFieldKey', key);
    localStorage.setItem('adminImpersonateField', JSON.stringify({ key, name: name || key }));
    adminLogAction('field_access', 'field', name || key, `${name || key} paneline admin erişimi`);
    window.location.href = '/isletme';
}

function adminReturnFromFieldPanel() {
    localStorage.removeItem('businessFieldKey');
    localStorage.removeItem('businessToken');
    localStorage.removeItem('adminImpersonateField');
    window.location.href = '/yonetici';
}

// --- KULLANICI YÖNETİMİ ---
function renderAdminUsers() {
    const container = document.getElementById('adminUserList');
    const search = document.getElementById('adminUserSearch').value.trim();
    const status = document.getElementById('adminUserStatusFilter').value;
    const sortBy = document.getElementById('adminUserSortBy').value;
    const startDate = document.getElementById('adminUserStartDate').value;
    const endDate = document.getElementById('adminUserEndDate').value;
    const suspicious = document.getElementById('adminUserSuspicious').checked;
    
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (sortBy) params.set('sortBy', sortBy);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (suspicious) params.set('suspicious', 'true');
    
    fetch(`/api/admin/users?${params}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        if (!data.success || !data.data || data.data.length === 0) { 
            container.innerHTML = '<div style="color:var(--text-muted);padding:20px;">Kullanıcı bulunamadı.</div>'; 
            return; 
        }
        container.innerHTML = data.data.map(u => {
            const statusClass = u.status === 'globally_banned' ? 'globally_banned' : (u.status === 'banned' ? 'banned' : 'active');
            const statusLabel = u.status === 'globally_banned' ? 'GLOBAL BAN' : (u.status === 'banned' ? 'BANLI' : 'AKTİF');
            
            // Rozet mantığı
            let badgeHtml = '';
            if (u.blacklist_count >= 3) {
                badgeHtml += `<span class="user-status banned" style="margin-right:5px;background:#ef4444;border-color:#ef4444;">⚠️ YASAK EŞİĞİ</span>`;
            }
            if (u.cancelled_reservations_30_days >= 3) {
                badgeHtml += `<span class="user-status banned" style="margin-right:5px;background:#f59e0b;border-color:#f59e0b;">⚠️ ÇOK SIK İPTAL</span>`;
            }
            
            return `
            <div class="admin-user-row-wrapper" style="border: 1px solid rgba(255,255,255,0.05); border-radius:10px; margin-bottom:10px; background: rgba(30,41,59,0.3); overflow:hidden;">
                <div class="admin-user-row" onclick="toggleAdminUserDetailInline(${u.id})" style="display:flex; justify-content:space-between; align-items:center; padding:15px; cursor:pointer; transition:background 0.2s ease;">
                    <div class="user-info">
                        <div class="user-name" style="font-weight:700; color:#fff;">${u.name}</div>
                        <div class="user-meta" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">${u.phone || ''} · ${u.email || ''} · ${u.age ? u.age + ' yaş' : ''} · Rezervasyon: ${u.total_reservations || 0}</div>
                    </div>
                    <div style="display:flex;align-items:center;">
                        ${badgeHtml}
                        <span class="user-status ${statusClass}">${statusLabel}</span>
                    </div>
                </div>
                <div class="admin-user-detail-inline" id="user-detail-${u.id}" style="display:none; background:rgba(15,23,42,0.6); border-top:1px solid rgba(255,255,255,0.05); padding:20px;"></div>
            </div>`;
        }).join('');
    }).catch(() => container.innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>');
}

function toggleAdminUserDetailInline(id) {
    const detailEl = document.getElementById(`user-detail-${id}`);
    if (!detailEl) return;
    
    if (detailEl.style.display === 'block') {
        detailEl.style.display = 'none';
        return;
    }
    
    // Close other expanded rows
    document.querySelectorAll('.admin-user-detail-inline').forEach(el => {
        if (el.id !== `user-detail-${id}`) el.style.display = 'none';
    });
    
    detailEl.style.display = 'block';
    
    if (detailEl.innerHTML === "" || detailEl.innerHTML.includes('Yükleniyor')) {
        detailEl.innerHTML = '<div style="text-align:center;padding:15px;color:var(--text-muted);">Yükleniyor...</div>';
        fetch(`/api/admin/users/${id}`, { headers: getAdminHeaders() })
        .then(r => r.json()).then(data => {
            if (!data.success || !data.data.user) { 
                detailEl.innerHTML = '<div style="color:var(--danger-red);padding:10px;">Kullanıcı bulunamadı!</div>'; 
                return; 
            }
            const u = data.data.user;
            detailEl.innerHTML = `
                <div style="display:flex;justify-content:flex-end;gap:10px;margin-bottom:15px;">
                    <button class="action-btn" onclick="adminToggleUserBanInline(event, ${u.id})" style="padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px; background:${u.status === 'banned' || u.status === 'globally_banned' ? 'rgba(16,185,129,0.15);border-color:#10b981;color:#34d399' : 'rgba(239,68,68,0.15);border-color:#ef4444;color:#f87171'}; cursor:pointer;">${u.status === 'banned' || u.status === 'globally_banned' ? 'BAN KALDIR' : 'BANLA'}</button>
                    <button class="action-btn" onclick="adminDeleteUserInline(event, ${u.id}, '${u.name}')" style="padding:6px 14px; font-size:0.75rem; font-weight:700; border-radius:6px; background:rgba(239,68,68,0.15); border-color:#ef4444; color:#f87171; cursor:pointer;">SİL</button>
                </div>
                <div class="detail-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap:12px; margin-bottom:15px; background:rgba(0,0,0,0.2); padding:12px; border-radius:8px;">
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Telefon</label><span style="font-size:0.85rem; color:#fff;">${u.phone || '-'}</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">E-posta</label><span style="font-size:0.85rem; color:#fff; word-break:break-all;">${u.email || '-'}</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Yaş</label><span style="font-size:0.85rem; color:#fff;">${u.age || '-'}</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Boy</label><span style="font-size:0.85rem; color:#fff;">${u.height || '-'} cm</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Kilo</label><span style="font-size:0.85rem; color:#fff;">${u.weight || '-'} kg</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Mevki</label><span style="font-size:0.85rem; color:#fff;">${u.position || '-'}</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Tecrübe</label><span style="font-size:0.85rem; color:#fff;">${u.experience || '-'}</span></div>
                    <div class="detail-item" style="display:flex; flex-direction:column;"><label style="font-size:0.7rem; color:var(--text-muted); font-weight:bold; margin-bottom:2px;">Durum</label><span style="font-size:0.85rem; font-weight:bold; color:${u.status === 'globally_banned' ? '#ef4444' : (u.status === 'banned' ? '#f87171' : '#34d399')}">${u.status}</span></div>
                </div>
                <div style="margin-top:15px;">
                    <h4 style="color:#8b5cf6; margin-bottom:8px; font-size:0.85rem; font-weight:700;">REZERVASYONLAR (${(data.data.reservations||[]).length})</h4>
                    ${(data.data.reservations||[]).slice(0,10).map(r => `<div style="font-size:0.75rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04); color:rgba(255,255,255,0.8);">${r.dateText} ${r.hourText} · ${r.field_name || r.fieldKey} · ${r.reservation_price} TL · <span style="color:${r.payment_status === 'odendi' ? '#34d399' : '#f87171'}">${r.payment_status}</span></div>`).join('') || '<div style="font-size:0.75rem;color:var(--text-muted);">Rezervasyon yok.</div>'}
                </div>
                <div style="margin-top:15px;">
                    <h4 style="color:#8b5cf6; margin-bottom:8px; font-size:0.85rem; font-weight:700;">YORUMLAR (${(data.data.reviews||[]).length})</h4>
                    ${(data.data.reviews||[]).map(r => `<div style="font-size:0.75rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04); color:rgba(255,255,255,0.8);">${r.field_name || r.fieldKey} · Puan: ${r.rating_turf || '-'}/5 · ${r.comment || ''}</div>`).join('') || '<div style="font-size:0.75rem;color:var(--text-muted);">Yorum yok.</div>'}
                </div>
            `;
        }).catch(() => detailEl.innerHTML = '<div style="color:var(--danger-red);padding:10px;">Yüklenemedi!</div>');
    }
}

function adminToggleUserBanInline(event, id) {
    event.stopPropagation();
    fetch(`/api/admin/users/${id}/ban`, { method: 'PUT', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { 
            showToast(d.message, 'info'); 
            renderAdminUsers(); 
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminDeleteUserInline(event, id, name) {
    event.stopPropagation();
    const confirmed = await showConfirmModal(`${name} kullanıcısını tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`);
    if (!confirmed) return;
    fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { 
            showToast(d.message, 'info'); 
            renderAdminUsers(); 
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

function exportAdminUsersCSV() {
    const search = document.getElementById('adminUserSearch').value.trim();
    const status = document.getElementById('adminUserStatusFilter').value;
    const sortBy = document.getElementById('adminUserSortBy').value;
    const startDate = document.getElementById('adminUserStartDate').value;
    const endDate = document.getElementById('adminUserEndDate').value;
    const suspicious = document.getElementById('adminUserSuspicious').checked;
    
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (sortBy) params.set('sortBy', sortBy);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (suspicious) params.set('suspicious', 'true');

    fetch(`/api/admin/users?${params}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        if (!data.success || !data.data || data.data.length === 0) {
            showToast('Dışa aktarılacak kullanıcı bulunamadı!', 'error');
            return;
        }
        
        let csvContent = "\ufeffKullanici ID,Isim,Telefon,E-posta,Yas,Boy,Kilo,Mevki,Tecrube,Rezervasyon Sayisi,30 Gunluk Iptal,Kara Liste Engeli,Durum,Kayit Tarihi\n";
        data.data.forEach(u => {
            csvContent += `"${u.id}","${u.name || ''}","${u.phone || ''}","${u.email || ''}","${u.age || ''}","${u.height || ''}","${u.weight || ''}","${u.position || ''}","${u.experience || ''}","${u.total_reservations || 0}","${u.cancelled_reservations_30_days || 0}","${u.blacklist_count || 0}","${u.status}","${u.created_at || ''}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ksk_kullanicilar_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(() => showToast('Dışa aktarma sırasında hata oluştu!', 'error'));
}

function showAdminUserDetail(id) {
    const container = document.getElementById('adminUserDetail');
    container.style.display = 'block';
    container.innerHTML = '<div style="text-align:center;padding:20px;">Yükleniyor...</div>';
    fetch(`/api/admin/users/${id}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        if (!data.success || !data.data.user) { container.innerHTML = '<div style="color:var(--danger-red);padding:20px;">Kullanıcı bulunamadı!</div>'; return; }
        const u = data.data.user;
        container.innerHTML = `<div class="admin-user-detail">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:15px;">
                <h3>${u.name}</h3>
                <div style="display:flex;gap:6px;">
                    <button class="action-btn" onclick="adminToggleUserBan(${u.id})" style="padding:5px 12px;font-size:0.7rem;background:${u.status === 'banned' || u.status === 'globally_banned' ? 'rgba(16,185,129,0.2);border-color:#10b981;color:#34d399' : 'rgba(239,68,68,0.2);border-color:#ef4444;color:#f87171'}">${u.status === 'banned' || u.status === 'globally_banned' ? 'BAN KALDIR' : 'BANLA'}</button>
                    <button class="action-btn" onclick="adminDeleteUser(${u.id},'${u.name}')" style="padding:5px 12px;font-size:0.7rem;background:rgba(239,68,68,0.2);border-color:#ef4444;color:#f87171;">SİL</button>
                </div>
            </div>
            <div class="detail-grid">
                <div class="detail-item"><label>Telefon</label><span>${u.phone || '-'}</span></div>
                <div class="detail-item"><label>E-posta</label><span>${u.email || '-'}</span></div>
                <div class="detail-item"><label>Yaş</label><span>${u.age || '-'}</span></div>
                <div class="detail-item"><label>Boy</label><span>${u.height || '-'} cm</span></div>
                <div class="detail-item"><label>Kilo</label><span>${u.weight || '-'} kg</span></div>
                <div class="detail-item"><label>Mevki</label><span>${u.position || '-'}</span></div>
                <div class="detail-item"><label>Tecrübe</label><span>${u.experience || '-'}</span></div>
                <div class="detail-item"><label>Durum</label><span style="color:${u.status === 'globally_banned' ? '#ef4444' : (u.status === 'banned' ? '#f87171' : '#34d399')}">${u.status}</span></div>
            </div>
            <div style="margin-top:15px;">
                <h4 style="color:#8b5cf6;margin-bottom:8px;">REZERVASYONLAR (${(data.data.reservations||[]).length})</h4>
                ${(data.data.reservations||[]).slice(0,10).map(r => `<div style="font-size:0.75rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">${r.dateText} ${r.hourText} · ${r.field_name || r.fieldKey} · ${r.reservation_price} TL · <span style="color:${r.payment_status === 'odendi' ? '#34d399' : '#f87171'}">${r.payment_status}</span></div>`).join('') || '<div style="font-size:0.75rem;color:var(--text-muted);">Rezervasyon yok.</div>'}
            </div>
            <div style="margin-top:15px;">
                <h4 style="color:#8b5cf6;margin-bottom:8px;">YORUMLAR (${(data.data.reviews||[]).length})</h4>
                ${(data.data.reviews||[]).map(r => `<div style="font-size:0.75rem;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);">${r.field_name || r.fieldKey} · Puan: ${r.rating_turf || '-'}/5 · ${r.comment || ''}</div>`).join('') || '<div style="font-size:0.75rem;color:var(--text-muted);">Yorum yok.</div>'}
            </div>
        </div>`;
    }).catch(() => container.innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>');
}

function adminToggleUserBan(id) {
    fetch(`/api/admin/users/${id}/ban`, { method: 'PUT', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { showToast(d.message, 'info'); renderAdminUsers(); document.getElementById('adminUserDetail').style.display = 'none'; }
        else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminDeleteUser(id, name) {
    const confirmed = await showConfirmModal(`${name} kullanıcısını tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`);
    if (!confirmed) return;
    fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { showToast(d.message, 'info'); renderAdminUsers(); document.getElementById('adminUserDetail').style.display = 'none'; }
        else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

// --- AKTİVİTE GÜNLÜĞÜ ---
function renderAdminActivity() {
    const type = document.getElementById('adminActivityFilter').value;
    const params = type ? `?type=${type}` : '';
    fetch(`/api/admin/activity-log${params}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        const container = document.getElementById('adminActivityList');
        if (!data.success || !data.data || data.data.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Aktivite kaydı bulunamadı.</div>'; return; }
        container.innerHTML = data.data.map(log => `
            <div class="admin-log-item">
                <span class="log-action">${log.action_type}</span>
                <span class="log-target">${log.target_name || ''}</span>
                <div>${log.description || ''}</div>
                <div class="log-date">${log.admin_username} · ${new Date(log.created_at).toLocaleString('tr-TR')}</div>
            </div>
        `).join('');
    }).catch(() => document.getElementById('adminActivityList').innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>');
}

function adminLogAction(action_type, target_type, target_name, description) {
    fetch('/api/admin/activity-log', { method: 'POST', headers: getAdminHeaders(), body: JSON.stringify({ action_type, target_type, target_name, description }) })
    .catch(() => {});
}

// --- GLOBAL KARA LİSTE ---
function loadAdminGlobalBlacklist() {
    // 1. Banlanmış Kullanıcıları Yükle
    fetch('/api/admin/users', { headers: getAdminHeaders() })
    .then(r => r.json()).then(result => {
        const container = document.getElementById('adminBannedUsersList');
        if (!container) return;
        if (!result.success || !result.data) { container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Hata oluştu.</div>'; return; }
        const bannedUsers = result.data.filter(u => u.status === 'banned' || u.status === 'globally_banned');
        if (bannedUsers.length === 0) {
            container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Yasaklı kullanıcı bulunmuyor.</div>';
            return;
        }
        container.innerHTML = bannedUsers.map(user => `
            <div class="admin-bl-item" style="border-color: rgba(239, 68, 68, 0.3); display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.4); padding:12px 18px; border-radius:8px; margin-bottom:8px;">
                <div class="bl-info">
                    <div class="bl-name" style="color: #fca5a5; font-weight:700;">${user.name || 'Bilinmeyen'} (${user.status.toUpperCase('tr-TR')})</div>
                    <div class="bl-meta" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">📞 ${user.phone} · 📧 ${user.email || '-'} · 🏆 Toplam Rezervasyon: ${user.total_reservations || 0}</div>
                </div>
                <button class="action-btn" onclick="adminUnbanUser(${user.id}, '${user.phone}', '${user.status}')" style="padding:6px 14px; font-size:0.75rem; background:rgba(16,185,129,0.15); border-color:#10b981; color:#34d399; font-weight:700; border-radius:6px; cursor:pointer;">BAN KALDIR</button>
            </div>
        `).join('');
    }).catch(e => {
        console.error(e);
        const container = document.getElementById('adminBannedUsersList');
        if (container) container.innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>';
    });

    // 2. Sahalardan Engellenen Şüpheli Numaraları Yükle
    fetch('/api/admin/global-blacklist', { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        const container = document.getElementById('adminGlobalBlacklist');
        if (!container) return;
        if (!data.success || !data.data || data.data.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Şüpheli numara bulunmuyor.</div>'; return; }
        container.innerHTML = data.data.map(item => `
            <div class="admin-bl-item" style="display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.4); padding:12px 18px; border-radius:8px; margin-bottom:8px;">
                <div class="bl-info">
                    <div class="bl-name" style="font-weight:700;">${item.name || 'Bilinmeyen'}</div>
                    <div class="bl-meta" style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">📞 ${item.phone_number} · 🚫 ${item.block_count} saha tarafından engellenmiş · Sahalar: ${item.fields || '-'}</div>
                </div>
                <button class="action-btn" onclick="adminRemoveGlobalBan('${item.phone_number}')" style="padding:6px 14px; font-size:0.75rem; background:rgba(16,185,129,0.15); border-color:#10b981; color:#34d399; font-weight:700; border-radius:6px; cursor:pointer;">LİSTEDEN ÇIKAR</button>
            </div>
        `).join('');
    }).catch(() => {
        const container = document.getElementById('adminGlobalBlacklist');
        if (container) container.innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>';
    });
}

function adminManualGlobalBan() {
    const phone = document.getElementById('adminGlobalBanPhone').value.trim();
    if (!phone) { showToast('Telefon numarası girin!', 'error'); return; }
    fetch('/api/admin/global-blacklist', { method: 'POST', headers: getAdminHeaders(), body: JSON.stringify({ phone }) })
    .then(r => r.json()).then(d => {
        if (d.success) { showToast(d.message, 'info'); loadAdminGlobalBlacklist(); document.getElementById('adminGlobalBanPhone').value = ''; }
        else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminRemoveGlobalBan(phone) {
    const confirmed = await showConfirmModal(`${phone} numarasının global yasağını kaldırmak istediğinize emin misiniz?`);
    if (!confirmed) return;
    fetch(`/api/admin/global-blacklist/${encodeURIComponent(phone)}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) { showToast(d.message, 'info'); loadAdminGlobalBlacklist(); }
        else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

async function adminUnbanUser(id, phone, status) {
    const confirmed = await showConfirmModal(`${phone} numarasının yasağını kaldırmak istediğinize emin misiniz?`);
    if (!confirmed) return;
    
    let url = `/api/admin/users/${id}/ban`;
    let method = 'PUT';
    if (status === 'globally_banned') {
        url = `/api/admin/global-blacklist/${encodeURIComponent(phone)}`;
        method = 'DELETE';
    }
    
    fetch(url, { method: method, headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) {
            showToast(d.message, 'info');
            loadAdminGlobalBlacklist();
            if (typeof renderAdminUsers === 'function') renderAdminUsers();
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

// --- DUYURULAR ---
function submitAnnouncement() {
    const title = document.getElementById('annTitle').value.trim();
    const message = document.getElementById('annMessage').value.trim();
    const target = document.getElementById('annTarget').value;
    if (!title || !message) { showToast('Başlık ve mesaj zorunludur!', 'error'); return; }
    fetch('/api/admin/announcements', { method: 'POST', headers: getAdminHeaders(), body: JSON.stringify({ title, message, target_audience: target }) })
    .then(r => r.json()).then(d => {
        if (d.success) { showToast(d.message, 'info'); document.getElementById('annTitle').value = ''; document.getElementById('annMessage').value = ''; loadAdminAnnouncements(); }
        else showToast(d.message, 'error');
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

function loadAdminAnnouncements() {
    fetch('/api/admin/announcements', { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        const container = document.getElementById('adminAnnouncementList');
        if (!data.success || !data.data || data.data.length === 0) { container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Henüz duyuru gönderilmemiş.</div>'; return; }
        container.innerHTML = data.data.map(a => `
            <div class="admin-ann-item" style="position:relative; padding:15px; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div class="ann-title" style="font-weight:700; font-size:1.05rem; color:#fff; margin-bottom:5px;">${a.title}</div>
                <div class="ann-meta" style="color:var(--text-muted); font-size:0.75rem; margin-bottom:8px;">${a.created_by} · ${new Date(a.created_at).toLocaleString('tr-TR')} · Hedef: ${a.target_audience}</div>
                <div class="ann-msg" style="color:rgba(255,255,255,0.85); font-size:0.85rem; line-height:1.4;">${a.message}</div>
                <button onclick="deleteAdminAnnouncement(${a.id})" style="position:absolute; right:15px; top:15px; background:rgba(239,68,68,0.15); border:1px solid #ef4444; color:#ef4444; padding:4px 8px; border-radius:4px; font-size:0.75rem; cursor:pointer; font-weight:bold;">SİL</button>
            </div>
        `).join('');
    }).catch(() => document.getElementById('adminAnnouncementList').innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>');
}

async function deleteAdminAnnouncement(id) {
    const confirmed = await showConfirmModal("Bu duyuruyu silmek istediğinize emin misiniz?");
    if (!confirmed) return;
    fetch(`/api/admin/announcements/${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) {
            showToast(d.message, 'info');
            loadAdminAnnouncements();
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

// --- GELİR RAPORU ---
function renderAdminRevenue() {
    const period = document.getElementById('adminRevenuePeriod').value;
    fetch(`/api/admin/revenue?period=${period}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        const container = document.getElementById('adminRevenueList');
        if (!data.success || !data.data || data.data.length === 0) { 
            container.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Veri bulunamadı.</div>'; 
            return; 
        }
        const fields = window.fieldsData || {};
        
        let totalRev = 0;
        let totalDebt = 0;
        let totalResCount = 0;
        
        let html = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px; font-family:'Montserrat',sans-serif; font-size:0.85rem; color:#fff;">
            <thead>
                <tr style="border-bottom:2px solid #334155; text-align:left; color:rgba(255,255,255,0.6);">
                    <th style="padding:10px;">Saha Adı</th>
                    <th style="padding:10px; text-align:right;">Rezervasyon</th>
                    <th style="padding:10px; text-align:right;">Tahsil Edilen (Ciro)</th>
                    <th style="padding:10px; text-align:right;">Kalan Borç</th>
                    <th style="padding:10px; text-align:right;">Toplam Hak Ediş</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        html += data.data.map(r => {
            const fieldName = fields[r.fieldKey]?.name || r.fieldKey;
            const revenue = parseFloat(r.total_revenue || 0);
            const debt = parseFloat(r.total_debt || 0);
            const resCount = parseInt(r.total_res || 0);
            
            const paidRevenue = revenue - debt;
            
            totalRev += paidRevenue;
            totalDebt += debt;
            totalResCount += resCount;
            
            return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                <td style="padding:12px; font-weight:700;">🏟️ ${fieldName}</td>
                <td style="padding:12px; text-align:right; color:#fbbf24;">${resCount} adet</td>
                <td style="padding:12px; text-align:right; color:#34d399; font-weight:700;">${paidRevenue.toLocaleString('tr-TR')} TL</td>
                <td style="padding:12px; text-align:right; color:#f87171; font-weight:700;">${debt.toLocaleString('tr-TR')} TL</td>
                <td style="padding:12px; text-align:right; color:#fff; font-weight:700;">${revenue.toLocaleString('tr-TR')} TL</td>
            </tr>`;
        }).join('');
        
        html += `
            </tbody>
            <tfoot>
                <tr style="border-top:2px solid #334155; font-weight:bold; background:rgba(255,255,255,0.02);">
                    <td style="padding:15px; font-size:0.9rem; color:#fff;">GENEL TOPLAM</td>
                    <td style="padding:15px; text-align:right; color:#fbbf24; font-size:0.9rem;">${totalResCount} adet</td>
                    <td style="padding:15px; text-align:right; color:#34d399; font-size:0.95rem;">${totalRev.toLocaleString('tr-TR')} TL</td>
                    <td style="padding:15px; text-align:right; color:#f87171; font-size:0.95rem;">${totalDebt.toLocaleString('tr-TR')} TL</td>
                    <td style="padding:15px; text-align:right; color:#fff; font-size:0.95rem;">${(totalRev + totalDebt).toLocaleString('tr-TR')} TL</td>
                </tr>
            </tfoot>
        </table>`;
        
        container.innerHTML = html;
    }).catch(() => document.getElementById('adminRevenueList').innerHTML = '<div style="color:var(--danger-red);padding:20px;">Yüklenemedi!</div>');
}

function exportAdminRevenueCSV() {
    const period = document.getElementById('adminRevenuePeriod').value;
    fetch(`/api/admin/revenue?period=${period}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        if (!data.success || !data.data || data.data.length === 0) {
            showToast('Dışa aktarılacak gelir verisi bulunamadı!', 'error');
            return;
        }
        
        const fields = window.fieldsData || {};
        let csvContent = "\ufeffSaha Anahtari,Saha Adi,Rezervasyon Adedi,Tahsil Edilen (TL),Kalan Borc (TL),Toplam Hak Edis (TL)\n";
        
        data.data.forEach(r => {
            const fieldName = fields[r.fieldKey]?.name || r.fieldKey;
            const revenue = parseFloat(r.total_revenue || 0);
            const debt = parseFloat(r.total_debt || 0);
            const paidRevenue = revenue - debt;
            csvContent += `"${r.fieldKey}","${fieldName}","${r.total_res}","${paidRevenue}","${debt}","${revenue}"\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ksk_gelir_raporu_${period}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }).catch(() => showToast('Dışa aktarma sırasında hata oluştu!', 'error'));
}

// Close admin login modal on Enter
document.addEventListener('keydown', (e) => {
    const adminModal = document.getElementById('adminLoginModal');
    if (e.key === 'Enter' && adminModal && adminModal.classList.contains('show')) {
        handleAdminLogin();
    }
});



// Kullanıcının kara listede olduğu sahaları yükle
async function loadUserBlacklist() {
    if (!currentUser || !currentUser.phone) {
        userBlacklistedFields = [];
        return;
    }
    try {
        const response = await fetch(`/api/blacklists/by-phone/${encodeURIComponent(currentUser.phone)}`);
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
        const response = await fetch(`/api/blacklist/${currentBusinessFieldKey}`);
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
        const response = await fetch('/api/blacklist', {
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
        const response = await fetch(`/api/blacklist/${currentBusinessFieldKey}/${encodeURIComponent(phone)}`, {
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
    if (lowerMsg.includes('hata') || lowerMsg.includes('başarısız') || lowerMsg.includes('lütfen') || lowerMsg.includes('kilitli')) {
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
    
    const btn = formContainer.previousElementSibling?.querySelector('.mobile-create-btn');
    
    if (formContainer.classList.contains('anim-slide-fade-in') || formContainer.style.display === 'block') {
        // Kapat
        formContainer.classList.remove('anim-slide-fade-in');
        formContainer.classList.add('anim-slide-fade-out');
        
        if (btn) btn.innerText = '+ ?lan Ver';
        
        // Animasyon bitince display none yap
        setTimeout(() => {
            if (formContainer.classList.contains('anim-slide-fade-out')) {
                formContainer.style.display = 'none';
                formContainer.classList.remove('anim-slide-fade-out');
            }
        }, 300);
    } else {
        // A?
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
    
    // Uygulama yüklendiğinde duyuruları kontrol et
    checkAnnouncements();
});

// Duyuru Kontrolleri (Uygulama İçi Bildirim)
let allAnnouncements = [];

function checkAnnouncements() {
    fetch('/api/announcements')
    .then(r => r.json())
    .then(data => {
        if (!data.success) return;
        allAnnouncements = data.data || [];
        
        // Okunmamış duyuru sayısını hesapla
        const readIds = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
        const unreadCount = allAnnouncements.filter(a => !readIds.includes(a.id)).length;
        
        const badge = document.getElementById('announcementBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }).catch(err => console.error("Duyurular yüklenemedi:", err));
}

function openAnnouncementsModal() {
    const list = document.getElementById('publicAnnouncementsList');
    if (!list) return;
    
    if (allAnnouncements.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted);padding:20px;text-align:center;">Aktif duyuru veya kampanya bulunmuyor.</div>';
    } else {
        list.innerHTML = allAnnouncements.map(a => {
            const dateStr = new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:15px;transition:transform 0.2s ease;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:5px;">
                    <h3 style="color:#fbbf24;font-size:1.05rem;font-weight:700;margin:0;">📢 ${a.title}</h3>
                    <small style="color:var(--text-muted);font-size:0.75rem;">${dateStr}</small>
                </div>
                <p style="color:#e2e8f0;font-size:0.88rem;line-height:1.5;margin:0;white-space:pre-wrap;">${a.message}</p>
            </div>`;
        }).join('');
    }
    
    // Tümünü okundu olarak işaretle
    const allIds = allAnnouncements.map(a => a.id);
    localStorage.setItem('readAnnouncements', JSON.stringify(allIds));
    const badge = document.getElementById('announcementBadge');
    if (badge) badge.style.display = 'none';
    
    openModal('announcementsModal');
}

function bypassAdminLogin() {
    isAdminLoggedIn = true;
    adminToken = 'bypass_token';
    adminData = { display_name: 'Süper Yönetici' };
    localStorage.setItem('adminToken', adminToken);
    localStorage.setItem('adminData', JSON.stringify(adminData));
    
    // UI Güncelle
    const authSec = document.getElementById('adminAuthSection');
    const logSec = document.getElementById('adminLogoutSection');
    const welcome = document.getElementById('adminWelcomeText');
    const panel = document.getElementById('adminPanel');
    const custContainer = document.getElementById('customerContainer');
    
    if (authSec) authSec.style.display = 'none';
    if (logSec) logSec.style.display = 'flex';
    if (welcome) welcome.textContent = `Süper Yönetici`;
    if (panel) panel.style.display = 'block';
    if (custContainer) custContainer.style.display = 'none';
    
    document.querySelector('main').classList.add('admin-mode');
    document.body.classList.add('admin-mode');
    
    // Admin verilerini yükle
    if (typeof loadAdminStats === 'function') loadAdminStats();
    if (typeof renderAdminFields === 'function') renderAdminFields();
    if (typeof renderAdminUsers === 'function') renderAdminUsers();
    if (typeof loadAdminGlobalBlacklist === 'function') loadAdminGlobalBlacklist();
    if (typeof loadAdminAnnouncements === 'function') loadAdminAnnouncements();
    if (typeof loadAdminRevenue === 'function') loadAdminRevenue();
    
    showToast('Yönetici Paneline Şifresiz Başarıyla Giriş Yapıldı!', 'success');
}

let currentAdSubTab = 'forum';
function switchAdSubTab(sub) {
    currentAdSubTab = sub;
    document.querySelectorAll('.ad-sub-btn').forEach(btn => {
        const isTarget = btn.id === `adSubBtn${sub.charAt(0).toUpperCase() + sub.slice(1)}`;
        btn.style.background = isTarget ? '#8b5cf6' : '#0f172a';
        btn.style.borderColor = isTarget ? '#8b5cf6' : 'rgba(255,255,255,0.05)';
        btn.style.color = isTarget ? '#fff' : 'rgba(255,255,255,0.6)';
    });
    
    document.querySelectorAll('.ad-sub-content').forEach(el => {
        el.style.display = el.id === `adSubContent${sub.charAt(0).toUpperCase() + sub.slice(1)}` ? 'block' : 'none';
    });
    
    loadAdminAdSubList(sub);
}

function renderAdminAds() {
    switchAdSubTab(currentAdSubTab);
}

function loadAdminAdSubList(sub) {
    const listContainerId = `adminAds${sub.charAt(0).toUpperCase() + sub.slice(1)}List`;
    const listEl = document.getElementById(listContainerId);
    if (!listEl) return;

    // Bulk delete button container — insert before the table if not exists
    const tableWrapper = listEl.closest('.table-responsive');
    const contentDiv = listEl.closest('.ad-sub-content');
    if (contentDiv && !contentDiv.querySelector('.bulk-delete-bar')) {
        const bar = document.createElement('div');
        bar.className = 'bulk-delete-bar';
        bar.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:10px;';
        bar.innerHTML = `
            <input type="checkbox" id="selectAll_${sub}" style="width:16px;height:16px;cursor:pointer;" onchange="toggleSelectAllAds('${sub}', this.checked)">
            <label for="selectAll_${sub}" style="font-size:0.82rem;color:var(--text-muted);cursor:pointer;">Tümünü Seç</label>
            <button class="action-btn" onclick="adminBulkDeleteAds('${sub}')" style="padding:6px 14px;font-size:0.8rem;background:rgba(239,68,68,0.15);border-color:#ef4444;color:#f87171;">SEÇİLENLERİ SİL</button>
        `;
        if (tableWrapper) tableWrapper.parentNode.insertBefore(bar, tableWrapper);
    }

    listEl.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted);">Yükleniyor...</td></tr>';
    
    fetch(`/api/admin/ads/${sub}`, { headers: getAdminHeaders() })
    .then(r => r.json()).then(data => {
        if (!data.success || !data.data || data.data.length === 0) {
            listEl.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--text-muted);">İlan bulunamadı.</td></tr>';
            return;
        }
        
        if (sub === 'forum') {
            listEl.innerHTML = data.data.map(p => `
                <tr>
                    <td style="width:36px;text-align:center;"><input type="checkbox" class="ad-check-${sub}" value="${p.id}" style="width:15px;height:15px;cursor:pointer;"></td>
                    <td style="font-weight:700;color:#fff;">${p.title}</td>
                    <td>${p.message}</td>
                    <td>${p.user_name || p.created_by}<br><span style="font-size:0.75rem;color:var(--text-muted);">${p.user_phone || ''}</span></td>
                    <td>${new Date(p.created_at).toLocaleString('tr-TR')}</td>
                    <td><span class="user-status ${p.status === 'aktif' ? 'active' : 'banned'}" style="font-size:0.7rem;padding:4px 8px;border-radius:4px;">${p.status.toUpperCase()}</span></td>
                    <td>
                        <button class="action-btn" onclick="adminDeleteAd('${sub}', ${p.id})" style="padding:4px 8px;font-size:0.7rem;background:rgba(239,68,68,0.15);border-color:#ef4444;color:#f87171;cursor:pointer;">SİL</button>
                    </td>
                </tr>
            `).join('');
        } else if (sub === 'matches') {
            listEl.innerHTML = data.data.map(p => `
                <tr>
                    <td style="width:36px;text-align:center;"><input type="checkbox" class="ad-check-${sub}" value="${p.id}" style="width:15px;height:15px;cursor:pointer;"></td>
                    <td style="font-weight:700;color:#fff;">${p.name}<br><span style="font-size:0.75rem;color:var(--text-muted);">${p.phone || ''}</span></td>
                    <td>${p.dateText} ${p.hourText}</td>
                    <td>${p.details || '-'}</td>
                    <td>${new Date(p.created_at).toLocaleString('tr-TR')}</td>
                    <td><span class="user-status ${p.status === 'aktif' ? 'active' : 'banned'}" style="font-size:0.7rem;padding:4px 8px;border-radius:4px;">${p.status.toUpperCase()}</span></td>
                    <td>
                        <button class="action-btn" onclick="adminDeleteAd('${sub}', ${p.id})" style="padding:4px 8px;font-size:0.7rem;background:rgba(239,68,68,0.15);border-color:#ef4444;color:#f87171;cursor:pointer;">SİL</button>
                    </td>
                </tr>
            `).join('');
        } else if (sub === 'teams') {
            listEl.innerHTML = data.data.map(p => `
                <tr>
                    <td style="width:36px;text-align:center;"><input type="checkbox" class="ad-check-${sub}" value="${p.id}" style="width:15px;height:15px;cursor:pointer;"></td>
                    <td style="font-weight:700;color:#fff;">${p.teamName}<br><span style="font-size:0.75rem;color:var(--text-muted);">Kaptan: ${p.captainName}</span></td>
                    <td>${p.ageGroup || '-'}<br><span style="font-size:0.75rem;color:var(--text-muted);">${p.matchSize || ''}</span></td>
                    <td>${p.skillLevel || '-'}<br><span style="font-size:0.75rem;color:var(--text-muted);">${p.availableDays || ''} ${p.timeRange || ''}</span></td>
                    <td>${p.message || ''}</td>
                    <td><span class="user-status ${p.status === 'aktif' ? 'active' : 'banned'}" style="font-size:0.7rem;padding:4px 8px;border-radius:4px;">${p.status.toUpperCase()}</span></td>
                    <td>
                        <button class="action-btn" onclick="adminDeleteAd('${sub}', ${p.id})" style="padding:4px 8px;font-size:0.7rem;background:rgba(239,68,68,0.15);border-color:#ef4444;color:#f87171;cursor:pointer;">SİL</button>
                    </td>
                </tr>
            `).join('');
        }
    }).catch(() => {
        listEl.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px;color:var(--danger-red);">Yüklenemedi!</td></tr>';
    });
}

function toggleSelectAllAds(sub, checked) {
    document.querySelectorAll(`.ad-check-${sub}`).forEach(cb => cb.checked = checked);
}

async function adminBulkDeleteAds(sub) {
    const checked = [...document.querySelectorAll(`.ad-check-${sub}:checked`)];
    if (checked.length === 0) { showToast('Lütfen silinecek ilanları seçin!', 'error'); return; }
    const confirmed = await showConfirmModal(`${checked.length} ilan silinecek. Emin misiniz?`);
    if (!confirmed) return;
    let done = 0;
    checked.forEach(cb => {
        fetch(`/api/admin/ads/${sub}/${cb.value}`, { method: 'DELETE', headers: getAdminHeaders() })
        .then(r => r.json()).then(d => {
            done++;
            if (done === checked.length) {
                showToast(`${done} ilan silindi.`, 'info');
                loadAdminAdSubList(sub);
                const allCheckbox = document.getElementById(`selectAll_${sub}`);
                if (allCheckbox) allCheckbox.checked = false;
            }
        }).catch(() => { done++; });
    });
}

async function adminDeleteAd(sub, id) {
    const confirmed = await showConfirmModal("Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
    if (!confirmed) return;
    
    fetch(`/api/admin/ads/${sub}/${id}`, { method: 'DELETE', headers: getAdminHeaders() })
    .then(r => r.json()).then(d => {
        if (d.success) {
            showToast(d.message, 'info');
            loadAdminAdSubList(sub);
        } else {
            showToast(d.message, 'error');
        }
    }).catch(() => showToast('Sunucu hatası!', 'error'));
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerText = 'GİZLE';
    } else {
        input.type = 'password';
        btn.innerText = 'GÖSTER';
    }
}




