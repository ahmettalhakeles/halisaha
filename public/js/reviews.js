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
    if (currentUser.id) {
        try {
            const subResp = await fetch(`/api/subscriptions/by-user/${currentUser.id}`);
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
        const response = await fetch(`/api/player-reviews/${currentUser.id}`);
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
        const field = fieldsData[currentBusinessFieldKey];
        const resSettings = await fetch(`/api/pitch-settings/${currentBusinessFieldKey}`, {
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
        const response = await fetch(`/api/business-profile/${currentBusinessFieldKey}`, {
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
        const response = await fetch(`/api/business-debts/${currentBusinessFieldKey}?filter=${filter}`);
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

