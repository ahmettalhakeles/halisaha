
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
                if (fieldsData[pitch.fieldKey] && pitch.pitchNumber === 1) {
                    fieldsData[pitch.fieldKey].phone = pitch.phone;
                    fieldsData[pitch.fieldKey].hasService = pitch.hasService;
                    if (pitch.coordinates) {
                        fieldsData[pitch.fieldKey].coordinates = pitch.coordinates;
                    }
                    fieldsData[pitch.fieldKey].refreshments = pitch.refreshments || fieldsData[pitch.fieldKey].refreshments || "";
                    fieldsData[pitch.fieldKey].cleats = pitch.cleats || fieldsData[pitch.fieldKey].cleats || "Krampon Kiralanmaz";
                    fieldsData[pitch.fieldKey].shower = pitch.shower || fieldsData[pitch.fieldKey].shower || "Duş Yok";
                    fieldsData[pitch.fieldKey].market = pitch.market || fieldsData[pitch.fieldKey].market || "Market Yok";
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
    grid.innerHTML = Object.keys(fieldsData).map(key => {
        const field = fieldsData[key];
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.coordinates)}`;

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

        const cardClickHandler = isBlacklisted ? 'event.stopPropagation();' : ("selectField('" + key + "')");
        return `
        <div class="field-card ${isBlacklisted ? 'banned-card' : ''}" id="card-${key}" onclick="${cardClickHandler}" style="${isBlacklisted ? 'cursor: not-allowed; opacity: 0.7; border-color: var(--danger-red);' : ''}">
            ${isBlacklisted ? '<div style="background: var(--danger-red); color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 800; font-size: 0.85rem; text-align: center; margin-bottom: 10px; letter-spacing: 1px;">🚫 BANLANILDI</div>' : ''}
            <h3>${field.name}</h3>
            <div class="field-info-row">
                <div class="field-actions">
                    <a href="${mapUrl}" target="_blank" class="map-link" onclick="event.stopPropagation();">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        HARİTADA GÖSTER
                    </a>
                    <a href="tel:${field.phone}" class="phone-link" onclick="event.stopPropagation();">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        ${field.phone}
                    </a>
                </div>
                <button class="manage-btn" onclick="event.stopPropagation(); openBusinessPanel('${key}')" style="width:100%;padding:10px;font-size:0.85rem;font-weight:700;border:none;border-radius:8px;background:var(--warning-orange);color:#000;cursor:pointer;margin:10px 0;font-family:'Montserrat',sans-serif;text-transform:uppercase;">YÖNET</button>
                <div class="field-main-details">
                    <div class="pitch-badges-row">
                        ${serviceBadge}
                        ${cleatsBadge}
                        ${showerBadge}
                        ${marketBadge}
                    </div>
                    ${refreshmentsText ? `<div class="refreshments-display">${refreshmentsText}</div>` : ''}
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
    }).join('');
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
        alert("Bu halı saha tarafından engellendiğiniz için işlem yapamazsınız!");
        return;
    }
    currentSelectedFieldKey = key;
    document.querySelectorAll('.field-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('card-' + key);
    if(card) card.classList.add('active');
    
    document.getElementById('placeholderText').style.display = 'none';
    const bookingPanel = document.getElementById('bookingPanel');
    bookingPanel.style.display = 'block';
    
    // Mobil için accordion etkisi (Saha kartının altına taşı)
    if (window.innerWidth <= 768 && card) {
        const panel = document.getElementById('customerBookingPanel');
        panel.classList.add('mobile-open');
        card.parentNode.insertBefore(panel, card.nextSibling);
    } else {
        const layout = document.getElementById('customerBookingGridLayout');
        const panel = document.getElementById('customerBookingPanel');
        layout.appendChild(panel);
    }

    // Saha yorumlarını yükle
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

        const slotStartHour = parseInt(hour.split(':')[0]);
        const isEvening = slotStartHour >= 17 || slotStartHour < 6;
        const rateLabel = isEvening ? 'AKŞAM' : 'GÜNDÜZ';
        const rateBadge = `<span class="rate-badge ${isEvening ? 'rate-night' : 'rate-day'}">${rateLabel}</span>`;

        if (isTaken) {
            btn.classList.add('locked');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(DOLU)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (aboneHours.includes(`${effectiveDayOfWeek} ${hour}`)) {
            btn.classList.add('abone-state');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(ABONE)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (isPastSlot) {
            btn.classList.add('past-state');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(GEÇTİ)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (pitch.isClosed === 1 || pitch.isClosed === true || isWeekdayClosed) {
            btn.classList.add('closed-state');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(KAPALI)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else if (disabledHours.includes(hour)) {
            btn.classList.add('locked');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(DOLU)</span>${nextDayLabel}`;
            btn.disabled = true;
        } else {
            btn.classList.add('available');
            btn.innerHTML = `${rateBadge}<span class="hour-time">${hour}</span><span class="hour-status">(BOS)</span>${nextDayLabel}`;
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

            latestReservationId = result.id;
            resetPaymentUI();

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

// --- PAYMENT LOGIC ---
let latestReservationId = null;

function resetPaymentUI() {
    document.getElementById('paymentButtons').style.display = 'flex';
    document.getElementById('paymentShareInfo').style.display = 'none';
    const statusEl = document.getElementById('paymentStatus');
    statusEl.style.display = 'none';
    statusEl.className = '';
    statusEl.innerHTML = '';
    
    document.getElementById('btnPaySingle').disabled = false;
    document.getElementById('btnPaySplit').disabled = false;
    document.getElementById('btnPaySingle').innerHTML = 'Tek Kişi Öde';
    document.getElementById('btnPaySplit').innerHTML = 'İki Kişi Paylaş';
}

async function paySingle() {
    if (!latestReservationId) return;
    
    const btn = document.getElementById('btnPaySingle');
    btn.disabled = true;
    btn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;"><div class="spinner" style="width:20px;height:20px;border:3px solid rgba(255,255,255,0.2);border-left-color:#fff;border-radius:50%;animation:spin 1s linear infinite;"></div>İşleniyor...</div>';
    document.getElementById('btnPaySplit').disabled = true;

    setTimeout(async () => {
        try {
            const res = await fetch(`/api/reservations/${latestReservationId}/payment/pay-single`, { method: 'POST' });
            const result = await res.json();
            
            const statusEl = document.getElementById('paymentStatus');
            statusEl.style.display = 'block';
            
            if (result.success) {
                document.getElementById('paymentButtons').style.display = 'none';
                statusEl.style.background = 'rgba(16,185,129,0.1)';
                statusEl.style.color = 'var(--neon-green)';
                statusEl.style.border = '1px solid rgba(16,185,129,0.3)';
                statusEl.innerHTML = '✓ Ödeme Başarılı!';
            } else {
                statusEl.style.background = 'rgba(239,68,68,0.1)';
                statusEl.style.color = '#ef4444';
                statusEl.style.border = '1px solid rgba(239,68,68,0.3)';
                statusEl.innerHTML = `✗ ${result.message || 'Ödeme başarısız oldu'}`;
                btn.disabled = false;
                document.getElementById('btnPaySplit').disabled = false;
                btn.innerHTML = 'Tek Kişi Öde';
            }
        } catch (error) {
            btn.disabled = false;
            document.getElementById('btnPaySplit').disabled = false;
            btn.innerHTML = 'Tek Kişi Öde';
            alert('Bağlantı hatası!');
        }
    }, 2000); // simulate 2s payment processing
}

async function initSplitPayment() {
    if (!latestReservationId) return;
    
    const btn = document.getElementById('btnPaySplit');
    btn.disabled = true;
    btn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:10px;"><div class="spinner" style="width:20px;height:20px;border:3px solid rgba(16,185,129,0.2);border-left-color:var(--neon-green);border-radius:50%;animation:spin 1s linear infinite;"></div>İşleniyor...</div>';
    document.getElementById('btnPaySingle').disabled = true;

    try {
        const res = await fetch(`/api/reservations/${latestReservationId}/payment/init`, { method: 'POST' });
        const result = await res.json();
        
        if (result.success) {
            document.getElementById('paymentButtons').style.display = 'none';
            document.getElementById('paymentShareInfo').style.display = 'block';
            
            const shareUrl = `${window.location.origin}/payment/share/${result.share_code}`;
            document.getElementById('shareLinkInput').value = shareUrl;
            
            const statusEl = document.getElementById('paymentStatus');
            statusEl.style.display = 'block';
            statusEl.style.background = 'rgba(16,185,129,0.1)';
            statusEl.style.color = 'var(--neon-green)';
            statusEl.style.border = '1px solid rgba(16,185,129,0.3)';
            statusEl.innerHTML = '✓ Ortak ödeme başlatıldı! Kendi payınızı ödemek için linki kullanın.';
        } else {
            const statusEl = document.getElementById('paymentStatus');
            statusEl.style.display = 'block';
            statusEl.style.background = 'rgba(239,68,68,0.1)';
            statusEl.style.color = '#ef4444';
            statusEl.style.border = '1px solid rgba(239,68,68,0.3)';
            statusEl.innerHTML = `✗ ${result.message || 'İşlem başarısız oldu'}`;
            btn.disabled = false;
            document.getElementById('btnPaySingle').disabled = false;
            btn.innerHTML = 'İki Kişi Paylaş';
        }
    } catch (error) {
        btn.disabled = false;
        document.getElementById('btnPaySingle').disabled = false;
        btn.innerHTML = 'İki Kişi Paylaş';
        alert('Bağlantı hatası!');
    }
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value);
    
    const btn = document.getElementById('btnCopyLink');
    const originalText = btn.innerText;
    btn.innerText = 'Kopyalandı!';
    btn.style.background = '#fff';
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.background = 'var(--neon-green)';
    }, 2000);
}
