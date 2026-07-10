
// =======================================================
// İŞLETME GİRİŞ & ÇIKIŞ
// =======================================================
const businessTabNames = {
    'subscriptions': 'ABONELİK YÖNETİMİ',
    'debts': 'BORÇLAR',
    'pricing': 'FİYAT TARİFESİ',
    'stats': 'İSTATİSTİKLER',
    'settings': 'İŞLETME AYARLARI',
    'blacklist': 'KARA LİSTE',
    'reservations': 'REZERVASYONLAR',
    'hours': 'SAAT & ENGEL AYARLARI',
    'comments': 'YORUMLAR'
};

function switchBusinessTab(tabName) {
    document.querySelectorAll('.tab-content-zone').forEach(zone => {
        zone.style.display = 'none';
    });
    const tabEl = document.getElementById(`tab-${tabName}`);
    if (tabEl) tabEl.style.display = 'block';
    document.querySelectorAll('.business-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const tabBtn = document.getElementById(`tab-btn-${tabName}`);
    if (tabBtn) tabBtn.classList.add('active');
    document.querySelectorAll('#businessMobileTabs .biz-mobile-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const mobileBtn = document.getElementById(`biz-mob-${tabName}`);
    if (mobileBtn) mobileBtn.classList.add('active');
    if (tabName === 'debts') {
        loadBusinessDebts('all');
    } else if (tabName === 'comments') {
        loadBusinessComments();
    } else if (tabName === 'blacklist') {
        loadBusinessBlacklist();
    }
    closeMobileMenu();
}

function buildBusinessMobileTabs() {
    const container = document.getElementById('businessMobileTabs');
    if (!container) return;
    container.innerHTML = '';
    const sorted = Object.keys(businessTabNames).sort((a, b) => businessTabNames[a].localeCompare(businessTabNames[b]));
    sorted.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn biz-mobile-tab';
        btn.id = `biz-mob-${key}`;
        btn.textContent = businessTabNames[key];
        btn.dataset.click = `switchBusinessTab-${key}`;
        container.appendChild(btn);
    });
}

async function openBusinessPanel(fieldKey) {
    const field = fieldsData[fieldKey];
    if (!field) {
        alert("Saha bulunamadı!");
        return;
    }

    if (isBusinessLoggedIn && currentBusinessFieldKey === fieldKey) {
        document.querySelector('main').classList.add('business-mode');
        document.getElementById('businessPanel').style.display = 'block';
        document.querySelector('.header-actions').classList.add('business-mode');
        return;
    }

    currentBusinessFieldKey = fieldKey;
    isBusinessLoggedIn = true;

    document.getElementById('userAuthSection').style.display = 'none';
    document.getElementById('businessLogoutSection').style.display = 'flex';
    document.getElementById('welcomeText').style.display = 'none';

    const customerContainer = document.getElementById('customerContainer');
    if (customerContainer) customerContainer.style.display = 'none';

    document.querySelector('main').classList.add('business-mode');
    document.querySelector('.header-actions').classList.add('business-mode');
    document.getElementById('businessPanel').style.display = 'block';
    document.getElementById('businessPanelTitle').innerText = `${field.name.toLocaleUpperCase('tr-TR')} YÖNETİM PANELİ`;
    document.getElementById('businessWelcomeText').innerText = `İŞLETME: ${field.name}`;

    buildBusinessMobileTabs();
    document.getElementById('businessMobileTabs').style.display = 'flex';

    switchBusinessTab('stats');
    await loadBusinessDashboard();
}

function handleBusinessLogout() {
    isBusinessLoggedIn = false;
    currentBusinessFieldKey = "";

    document.getElementById('userAuthSection').style.display = 'flex';
    document.getElementById('businessLogoutSection').style.display = 'none';
    document.getElementById('businessMobileTabs').style.display = 'none';
    document.querySelector('.header-actions').classList.remove('business-mode');

    const customerContainer = document.getElementById('customerContainer');
    if (customerContainer) customerContainer.style.display = 'block';

    document.querySelector('main').classList.remove('business-mode');
    document.getElementById('businessPanel').style.display = 'none';

    alert("İşletme panelinden çıkış yapıldı.");
    if (currentSelectedFieldKey) onDateOrFieldChange();
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
        const response = await fetch(`/api/stats-content/${currentBusinessFieldKey}`);
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
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
                await fetch(`/api/pitch-settings/${currentBusinessFieldKey}`, {
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
        const dhResp = await fetch(`/api/field-daily-hours/${currentBusinessFieldKey}`);
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
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
            const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
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
            const response = await fetch(`/api/field-daily-hours/${currentBusinessFieldKey}`, {
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
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
        const response = await fetch(`/api/pitch-objects/${currentBusinessFieldKey}/${pitchNum}`, {
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
        const response = await fetch(`/api/business-reservations/${currentBusinessFieldKey}`);
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
        const response = await fetch(`/api/reservations/${id}`, {
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
        const response = await fetch(`/api/reservations/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        const result = await response.json();
        if (result.success) { alert("Rezervasyon başarıyla iptal edildi!"); await loadBusinessReservations(); await loadBusinessStats(); await loadReservationsFromServer(); renderBusinessHoursGrid(); if (currentSelectedFieldKey) onDateOrFieldChange(); }
        else { alert("Hata: " + result.message); }
    } catch (error) { console.error("Rezervasyon silinemedi:", error); alert("Sunucuya bağlanılamadı!"); }
}

