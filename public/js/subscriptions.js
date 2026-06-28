
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
            body: JSON.stringify({ fieldKey: currentBusinessFieldKey, pitchNumber: pitchNum, dayOfWeek, hourText: hour, subscriberName: name, subscriberPhone: phone, user_id: currentUser?.id || null })
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

