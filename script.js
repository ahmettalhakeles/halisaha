// Master Saat Skalasi (Tum Gun Döngusu)
const masterHoursList = [
    "00:00 - 01:00", "01:00 - 02:00", "02:00 - 03:00", "03:00 - 04:00",
    "04:00 - 05:00", "05:00 - 06:00", "06:00 - 07:00", "07:00 - 08:00",
    "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00",
    "12:00 - 13:00", "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00",
    "16:00 - 17:00", "17:00 - 18:00", "18:00 - 19:00", "19:00 - 20:00",
    "20:00 - 21:00", "21:00 - 22:00", "22:00 - 23:00", "23:00 - 00:00"
];

// Sembolik 7 Günlük Hava Durumu Verisi
const weatherForecast = [
    { day: "BUGUN", temp: "15°C", bad: true },
    { day: "YARIN", temp: "18°C", bad: false },
    { day: "CARS.", temp: "14°C", bad: true },
    { day: "PERS.", temp: "19°C", bad: false },
    { day: "CUMA", temp: "22°C", bad: false },
    { day: "CMT", temp: "23°C", bad: false },
    { day: "PAZ", temp: "17°C", bad: true }
];

// 6 Adet Izole Multi-Tenant Saha Veri Yapisi
const fieldsData = {
    "final": { 
        name: "Final Halisahasi", address: "Hacilar Meydani, Merkez, Amasya", coordinates: "40.6558,35.8272", phone: "03582120001", 
        isClosed: false, hasService: "Servis: Var", openingHour: "12:00", closingHour: "23:00",
        aboneHours: ["19:00 - 20:00", "21:00 - 22:00"], disabledHours: ["13:00 - 14:00"]
    },
    "arena": { 
        name: "Arena Halisahasi", address: "Akbilek, Merkez, Amasya", coordinates: "40.6621,35.8415", phone: "05051234562", 
        isClosed: false, hasService: "Servis: Yok", openingHour: "10:00", closingHour: "22:00",
        aboneHours: ["20:00 - 21:00"], disabledHours: []
    },
    "ciragan": { 
        name: "Ciragan Halisahasi", address: "Seyhcui, Merkez, Amasya", coordinates: "40.6710,35.8190", phone: "05051234563", 
        isClosed: false, hasService: "Servis: Var", openingHour: "12:00", closingHour: "23:00",
        aboneHours: ["22:00 - 23:00"], disabledHours: []
    },
    "olimpiyat": { 
        name: "Olimpiyat Halisahasi", address: "Fatih, Merkez, Amasya", coordinates: "40.6480,35.8350", phone: "05051234564", 
        isClosed: false, hasService: "Servis: Yok", openingHour: "08:00", closingHour: "23:00",
        aboneHours: [], disabledHours: []
    },
    "sporium05": { 
        name: "Sporium 05 Halisahasi", address: "Kursunlu, Merkez, Amasya", coordinates: "40.6590,35.8520", phone: "05051234565", 
        isClosed: false, hasService: "Servis: Var", openingHour: "14:00", closingHour: "23:00",
        aboneHours: ["18:00 - 19:00"], disabledHours: []
    },
    "ziyaret": { 
        name: "Ziyaret Halisahasi", address: "Ziyaret Beldesi, Amasya", coordinates: "40.6320,35.7980", phone: "05051234566", 
        isClosed: false, hasService: "Servis: Var", openingHour: "15:00", closingHour: "00:00",
        aboneHours: [], disabledHours: []
    }
};

// Durum Yonetim Havuzu
let loggedInUser = null;
let registeredUserName = "";
let currentSelectedFieldKey = "";
let currentSelectedHourBtn = null;
let activeAdminFieldKey = null; 
let currentAdminSelectedHour = null;
let secretClickCount = 0;

let userReservations = [];
let forumPosts = [
    { date: "BUGUN", hour: "21:00 - 22:00", position: "KALECI", payment: "UCRET KARSILANACAK", phone: "5051112233", msg: "FINAL SAHASINDAKI MACIMIZA ACIL ELDIVENI KUVVETLI KALECI LAZIM" }
];

// Sayfa ilk yüklendiğinde çalışacak olan fonksiyonu asenkron yapıp veritabanını dinletiyoruz
window.onload = async function() {
    initWeatherWidget(); // 7 Günlük hava tahminini yükleme
    initDateDropdowns();
    renderFieldsGrid();
    checkUrlForAdminGateway();

    // 🚨 SİHRİN GERÇEKLEŞTİĞİ YER: Sayfa açılır açılmaz veritabanından dolu saatleri ve ilanları çekiyoruz!
    await loadReservationsFromServer();
    await loadForumPostsFromServer();


    // 🚨 EN KRİTİK EKLEME: Sayfa açıldığı an veritabanındaki dolu saatleri hafızaya çekiyoruz
    try {
        const response = await fetch('http://127.0.0.1:5000/api/reservations');
        const result = await response.json();
        if (result.success) {
            userReservations = result.data; // Veritabanındaki dolu saatleri dizimize yükledik!
        }
    } catch (error) {
        console.error("Dolu saatler veritabanından çekilemedi:", error);
    }
};

// 7 Günlük Hava Durumu Widget Çıktısı (Yatay Flex Yapı)
function initWeatherWidget() {
    const container = document.getElementById('weatherDisplay');
    if (!container) return;
    container.innerHTML = weatherForecast.map(w => `
        <div class="weather-day-item ${w.bad ? 'bad-weather' : ''}">
            <span>${w.day}</span>
            <strong>${w.temp}</strong>
        </div>
    `).join('');
}

function checkUrlForAdminGateway() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'isletme') {
        openModal('adminAuthModal');
    }
}

function handleSecretLogoClick() {
    secretClickCount++;
    if (secretClickCount >= 5) {
        secretClickCount = 0;
        openModal('adminAuthModal');
    }
}

// 14 Gunluk (2 Haftalik) Esnek Takvim Uretimi
function initDateDropdowns() {
    const customerPicker = document.getElementById('datePicker');
    const forumPicker = document.getElementById('forumDate');
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    
    for (let i = 0; i < 14; i++) {
        let d = new Date();
        d.setDate(d.getDate() + i);
        let dateText = d.toLocaleDateString('tr-TR', options);
        let finalValue = (i === 0) ? "BUGUN" : (i === 1) ? "YARIN" : dateText.toUpperCase();
        
        [customerPicker, forumPicker].forEach(p => {
            let opt = document.createElement('option');
            opt.value = finalValue; opt.text = finalValue;
            p.appendChild(opt);
        });
    }

    const forumHourSelect = document.getElementById('forumHour');
    masterHoursList.forEach(h => {
        let opt = document.createElement('option');
        opt.value = h; opt.text = h;
        forumHourSelect.appendChild(opt);
    });
}

// Sahalari Gizli Koordinat Mimarisiyle Basma
function renderFieldsGrid() {
    const grid = document.getElementById('fieldsGrid');
    grid.innerHTML = Object.keys(fieldsData).map(key => {
        const field = fieldsData[key];
        const mapUrl = `http://googleusercontent.com/maps.google.com/?q=${field.coordinates}`;
        return `
            <div class="field-card" id="card-${key}" onclick="selectField('${key}')">
                <div class="field-info-row">
                    <div class="field-main-details">
                        <h3>${field.name}</h3>
                        <div class="field-meta-inputs">
                            <span>ADRES: ${field.address}</span>
                            <a href="tel:${field.phone}" class="phone-link" onclick="event.stopPropagation();">${field.phone}</a>
                        </div>
                        <div class="service-badge">SERVIS: ${field.hasService.split(': ')[1].toUpperCase()}</div>
                    </div>
                    <div class="field-actions">
                        <a href="${mapUrl}" target="_blank" class="map-link" onclick="event.stopPropagation();">HARITADA GOSTER</a>
                        <div class="price-tag">FIYAT TARIFESI: 2600 TL/2800 TL</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectField(key) {
    currentSelectedFieldKey = key;
    document.querySelectorAll('.field-card').forEach(c => c.classList.remove('active'));
    document.getElementById(`card-${key}`).classList.add('active');
    document.getElementById('placeholderText').style.display = 'none';
    document.getElementById('bookingPanel').style.display = 'block';
    onDateOrFieldChange();
}

function onDateOrFieldChange() {
    if (!currentSelectedFieldKey) return;
    
    const alertZone = document.getElementById('authRequiredAlert');
    if (!loggedInUser) {
        alertZone.style.display = 'block';
    } else {
        alertZone.style.display = 'none';
    }

    const dateText = document.getElementById('datePicker').value;
    const field = fieldsData[currentSelectedFieldKey];
    const grid = document.getElementById('hoursGrid');
    grid.innerHTML = "";
    document.getElementById('submitBtn').style.display = 'none';
    currentSelectedHourBtn = null;

    const startIdx = masterHoursList.findIndex(h => h.startsWith(field.openingHour));
    const endIdx = masterHoursList.findIndex(h => h.startsWith(field.closingHour));
    let filteredHours = [];

    if (startIdx !== -1 && endIdx !== -1) {
        if (startIdx <= endIdx) {
            filteredHours = masterHoursList.slice(startIdx, endIdx + 1);
        } else {
            filteredHours = masterHoursList.slice(startIdx).concat(masterHoursList.slice(0, endIdx + 1));
        }
    } else {
        filteredHours = masterHoursList;
    }

    filteredHours.forEach(hour => {
        const btn = document.createElement('button');
        btn.classList.add('hour-btn');

const isTaken = userReservations.some(r => r.fieldKey === currentSelectedFieldKey && r.dateText === dateText && r.hourText === hour);
        if (field.isClosed) {
            btn.classList.add('closed-state'); btn.innerText = hour + "\n(KAPALI)"; btn.disabled = true;
        } else if (field.aboneHours.includes(hour)) {
            btn.classList.add('abone-state'); btn.innerText = hour + "\n(ABONE)"; btn.disabled = true;
        } else if (field.disabledHours.includes(hour) || isTaken) {
            btn.classList.add('locked'); btn.innerText = hour + "\n(DOLU)"; btn.disabled = true;
        } else {
            btn.classList.add('available'); btn.innerText = hour + "\n(BOS)";
            if (loggedInUser) {
                btn.onclick = function() {
                    if (currentSelectedHourBtn) {
                        currentSelectedHourBtn.classList.remove('selected'); currentSelectedHourBtn.classList.add('available');
                    }
                    currentSelectedHourBtn = btn; btn.classList.remove('available'); btn.classList.add('selected');
                    document.getElementById('submitBtn').style.display = 'block';
                };
            }
        }
        grid.appendChild(btn);
    });
}

// 📝 SEÇİLEN SAATİ VERİTABANINA KALICI YAZAN ASENKRON REZERVASYON FONKSİYONU
async function completeBooking() {
    // Giriş yapılmış mı, saha ve saat seçilmiş mi kontrolü
    if (!loggedInUser || !currentSelectedFieldKey || !currentSelectedHourBtn) return;
    
    const hour = currentSelectedHourBtn.innerText.split('\n')[0];
    const dateText = document.getElementById('datePicker').value;

    // Arka plan (server.js) için kargo paketini hazırlıyoruz
    const bookingData = {
        fieldKey: currentSelectedFieldKey,
        dateText: dateText,
        hourText: hour,
        user_name: loggedInUser
    };

    try {
        // Sunucumuzun yeni reservations kapısını çalıyoruz
        const response = await fetch('http://127.0.0.1:5000/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (result.success) {
            // İşte gerçek veritabanı onayı uyarısı!
            alert("MÜJDE! Seçilen saha ve saat veritabanında adınıza kalıcı olarak rezerve edildi.");
            
            // Ekranın anlık olarak güncellenmesi için yerel hafızayı besleyelim
            userReservations.push({
                fieldKey: currentSelectedFieldKey,
                dateText: dateText,
                hourText: hour
            });

            // Ekranı tazeleyip saati kırmızıya (doluya) çeviriyoruz
            onDateOrFieldChange();
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Rezervasyon bağlantı hatası:", error);
        alert("Rezervasyon veritabanına kaydedilemedi! Lütfen sunucunun açık olduğundan emin olun.");
    }
}

// ... (Daha önce yazdığımız masterHoursList, fieldsData ve diğer yardımcı fonksiyonların buraya kalsın) ...

// 🚨 EN ÖNEMLİ KISIM: HTML ile uyumlu Kayıt Fonksiyonu
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

    const userData = { name, phone, email, password: pass };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();

        if (result.success) {
            // ✅ KAYIT BAŞARILI → ANINDA OTOMATİK GİRİŞ YAP
            loggedInUser = name.toUpperCase();
            document.getElementById('userAuthSection').innerHTML = 
                `<span style="font-weight:bold; color:var(--neon-green);">HOS GELDIN: ${loggedInUser}</span>`;

            closeModal('registerModal');
            document.getElementById('registerForm').reset();

            if (currentSelectedFieldKey) onDateOrFieldChange();

            alert(`Hoş geldin, ${name}! Kayıt tamamlandı, otomatik giriş yapıldı.`);
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        console.error("Hata:", error);
        alert("Sunucuya bağlanılamadı!");
    }
}

// 🚨 EĞER HTML'DE onsubmit="handleUserRegister(event)" yazıyorsa, 
// yukarıdaki fonksiyon otomatik olarak tetiklenecektir.

// =========================================================================
// GÜNCELLENEN KISIM: Veritabanından Kullanıcıyı Sorgulayan Giriş Fonksiyonu
// =========================================================================
async function handleUserLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPassword').value;

    if (!email || !pass) { 
        alert("LÜTFEN ALANLARI DOLDURUNUZ."); 
        return; 
    }

    const loginData = { email: email, password: pass }; // Sadece giriş verisi

    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (result.success) {
            loggedInUser = result.name.toUpperCase();
            document.getElementById('userAuthSection').innerHTML = `<span style="font-weight:bold; color:var(--neon-green);">HOS GELDIN: ${loggedInUser}</span>`;
            
            alert(`BAŞARILI GİRİŞ! Hoş geldin, ${result.name}.`);
            closeModal('loginModal');
            
            // Eğer girişten sonra bir saha seçildiyse, saatleri güncelle
            if (currentSelectedFieldKey) onDateOrFieldChange();
        } else {
            alert("HATA: " + result.message);
        }
    } catch (error) {
        console.error("Giriş hatası:", error);
        alert("SUNUCUYA BAĞLANILAMADI! node server.js çalışıyor mu?");
    }
}
/* --- MULTI-TENANT ISLETME GUVENLIK DUZENEGI --- */
function handleAdminLogin() {
    const token = document.getElementById('adminToken').value.trim().toLowerCase();
    
    if (fieldsData[token]) {
        activeAdminFieldKey = token;
        closeModal('adminAuthModal');
        document.getElementById('adminToken').value = "";
        openModal('adminDashboardModal');
        loadAdminDashboard();
    } else {
        alert("HATALI ISLETME SIFRESI.");
    }
}

function loadAdminDashboard() {
    const field = fieldsData[activeAdminFieldKey];
    document.getElementById('adminPanelTitle').innerText = `${field.name.toUpperCase()} YONETIM DASHBOARD`;
    document.getElementById('fieldClosureToggle').checked = field.isClosed;

    const openSelect = document.getElementById('adminOpeningHour');
    const closeSelect = document.getElementById('adminClosingHour');
    openSelect.innerHTML = ""; closeSelect.innerHTML = "";

    masterHoursList.forEach(h => {
        const prefix = h.split(' - ')[0];
        let opt1 = document.createElement('option'); opt1.value = prefix; opt1.text = prefix;
        let opt2 = document.createElement('option'); opt2.value = prefix; opt2.text = prefix;
        openSelect.appendChild(opt1); closeSelect.appendChild(opt2);
    });

    openSelect.value = field.openingHour;
    closeSelect.value = field.closingHour;

    renderAdminHoursGrid(field);
    renderAdminReservations();
}

function renderAdminHoursGrid(field) {
    const grid = document.getElementById('adminHoursGrid');
    grid.innerHTML = "";

    masterHoursList.forEach(hour => {
        const btn = document.createElement('button');
        btn.classList.add('hour-btn');

        if (field.aboneHours.includes(hour)) {
            btn.classList.add('abone-state'); btn.innerText = hour + "\n(ABONE)";
        } else if (field.disabledHours.includes(hour)) {
            btn.classList.add('locked'); btn.innerText = hour + "\n(ENGELLI)";
        } else {
            btn.classList.add('available'); btn.innerText = hour + "\n(ACIK)";
        }

        btn.onclick = function() {
            currentAdminSelectedHour = hour;
            document.getElementById('hourActionTitle').innerText = `${hour} AYARI`;
            openModal('hourActionModal');
        };
        grid.appendChild(btn);
    });
}

// Kalan işlevler tamamen korundu
function saveHourAction() {
    const action = document.getElementById('hourActionSelect').value;
    const field = fieldsData[activeAdminFieldKey];

    field.aboneHours = field.aboneHours.filter(h => h !== currentAdminSelectedHour);
    field.disabledHours = field.disabledHours.filter(h => h !== currentAdminSelectedHour);

    if (action === "ABONE") {
        field.aboneHours.push(currentAdminSelectedHour);
    } else if (action === "KAPAT") {
        field.disabledHours.push(currentAdminSelectedHour);
    }

    closeModal('hourActionModal');
    loadAdminDashboard();
}

function updateOperatingHours() {
    fieldsData[activeAdminFieldKey].openingHour = document.getElementById('adminOpeningHour').value;
    fieldsData[activeAdminFieldKey].closingHour = document.getElementById('adminClosingHour').value;
}

function toggleFieldClosure() {
    fieldsData[activeAdminFieldKey].isClosed = document.getElementById('fieldClosureToggle').checked;
}

function renderAdminReservations() {
    const container = document.getElementById('adminReservationsContainer');
    const filtered = userReservations.filter(r => r.fieldKey === activeAdminFieldKey);

    if (filtered.length === 0) {
        container.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">AKTIF MUSTERI REZERVASYONU BULUNMAMAKTADIR.</p>`;
        return;
    }

    const optionsFormat = { weekday: 'short', month: 'short', day: 'numeric' };
    let next7Days = [];
    for (let i = 0; i < 7; i++) {
        let d = new Date();
        d.setDate(d.getDate() + i); 
        let dateText = d.toLocaleDateString('tr-TR', optionsFormat).toUpperCase();
        next7Days.push(dateText);
    }

    container.innerHTML = filtered.map(res => `
        <div class="admin-res-item">
            <div class="admin-res-info">
                <strong>${res.user}</strong><br>
                <small style="color:var(--warning-orange);">Mevcut: ${res.date} | ${res.hour}</small>
            </div>
            <div class="admin-res-actions" style="margin-top: 5px;">
                <select id="newDate_${res.id}" class="admin-control-inline">
                    <option value="${res.date}">Tarih: ${res.date}</option>
                    ${next7Days.map(day => `<option value="${day}">${day}</option>`).join('')}
                </select>
                <select id="newHour_${res.id}" class="admin-control-inline">
                    <option value="${res.hour}">Saat: ${res.hour}</option>
                    ${masterHoursList.map(h => `<option value="${h}">${h}</option>`).join('')}
                </select>
                <button class="btn-danger-sm" style="background-color: var(--primary-green); color: #000;" onclick="updateReservation(${res.id})">KAYDET</button>
                <button class="btn-danger-sm" onclick="removeReservation(${res.id})">IPTAL</button>
            </div>
        </div>
    `).join('');
}

function updateReservation(id) {
    const newDate = document.getElementById(`newDate_${id}`).value;
    const newHour = document.getElementById(`newHour_${id}`).value;
    const res = userReservations.find(r => r.id === id);
    if (res) {
        res.date = newDate;
        res.hour = newHour;
        alert("Rezervasyon tarihi ve saati başarıyla güncellendi!");
        loadAdminDashboard();
    }
}

function removeReservation(id) {
    userReservations = userReservations.filter(r => r.id !== id);
    loadAdminDashboard();
}

// 📢 FORUM İLANLARINI VERİTABANINDAN ÇEKME FONKSİYONU


// =====================================================================
// 🔍 EKSİK OLAN: VERİTABANINDAN DOLU SAATLERİ ÇEKME FONKSİYONU
// =====================================================================
async function loadReservationsFromServer() {
    try {
        console.log("Veritabanından veriler çekiliyor..."); // Terminalde izlemek için
        const response = await fetch('http://127.0.0.1:5000/api/reservations');
        const result = await response.json();
        
        console.log("Sunucudan gelen cevap:", result); // 🚨 BU ÇOK ÖNEMLİ

        if (result.success) {
            userReservations = result.data; // Verileri hafızaya aldık
            console.log("Hafızaya yüklenen rezervasyonlar:", userReservations);
            
            // Eğer saha seçiliyse, veritabanından gelen verilerle kilitleri tazele
            if (currentSelectedFieldKey) {
                onDateOrFieldChange();
            }
        }
    } catch (error) {
        console.error("Dolu saatler veritabanından çekilemedi:", error);
    }
}

// =====================================================================
// 📢 FORUM İLANLARINI VERİTABANINDAN ÇEKME FONKSİYONU
// =====================================================================
async function loadForumPostsFromServer() {
    try {
        const response = await fetch('http://127.0.0.1:5000/api/forum');
        const result = await response.json();
        if (result.success) {
            forumPosts = result.data; // Veritabanından gelen ilanları diziye eşitle
            renderForumWall(); // Ekrana bas
        }
    } catch (error) {
        console.error("Forum verileri çekilemedi:", error);
    }
}

// =====================================================================
// 📢 YENİ İLANI VERİTABANINA YAZMA FONKSİYONU
// =====================================================================
async function createForumPost() {
    const date = document.getElementById('forumDate').value;
    const hour = document.getElementById('forumHour').value;
    const pos = document.getElementById('forumPosition').value;
    const payment = document.getElementById('forumPayment').value;
    const phone = document.getElementById('forumPhone').value.trim();
    const msg = document.getElementById('forumMessage').value.trim() || "EKIP TAMAMLANIYOR.";

    if (!phone) { alert("LÜTFEN WHATSAPP TELEFONUNUZU GİRİNİZ."); return; }

    const postData = { dateText: date, hourText: hour, position: pos, payment: payment, phone: phone, msg: msg };

    try {
        const response = await fetch('http://127.0.0.1:5000/api/forum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        const result = await response.json();
        if (result.success) {
            alert("İlanınız başarıyla yayınlandı!");
            document.getElementById('forumPhone').value = "";
            document.getElementById('forumMessage').value = "";
            
            // İlan veritabanına düştüğü an güncel listeyi yeniden çekip ekrana yansıt
            loadForumPostsFromServer(); 
        } else {
            alert("Hata: " + result.message);
        }
    } catch (error) {
        alert("Sunucuya bağlanılamadı!");
    }
}

// =====================================================================
// 📢 İLANLARI HTML EKRANINA BASTIRMA
// =====================================================================
function renderForumWall() {
    const container = document.getElementById('postsContainer');
    if (!container) return;
    
    // Veritabanı sütun isimlerimize (dateText, hourText) göre ekrana basıyoruz
    container.innerHTML = forumPosts.map(post => `
        <div class="post-card">
            <div class="post-meta">
                <span class="post-date-large">${post.dateText} - ${post.hourText}</span>
                <span class="post-pos-badge">ARANAN: ${post.position}</span>
            </div>
            <div class="post-main">DURUM: ${post.payment}</div>
            <div class="post-note">"${post.msg.toUpperCase()}"</div>
            <div class="post-footer">
                <a href="https://wa.me/90${post.phone}?text=KSK ILANI ICIN YAZIYORUM" target="_blank" class="whatsapp-btn">WHATSAPP'TAN ULAS</a>
            </div>
        </div>
    `).join('');
}


function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }