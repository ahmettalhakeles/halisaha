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
            body: JSON.stringify({ playerName, age: parseInt(age), height: height ? parseInt(height) : null, weight: weight ? parseInt(weight) : null, position, availableHours: JSON.stringify(availableHours), availableDates: JSON.stringify(availableDates), requestedFee, msg, user_id: currentUser.id })
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
                <button class="profile-btn" style="padding:4px 12px;font-size:0.75rem;border-radius:4px;" onclick="openPlayerProfile(${s.user_id || 0}, '${s.playerName.replace(/'/g, "\\'")}', ${s.age}, '${s.position}')">PROFİL</button>
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
let currentActiveProfileId = null;

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
                if (btn) btn.innerText = '+ İlan Ver';
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

async function openPlayerProfile(playerId, name, age, position) {
    currentActiveProfileId = playerId;
    document.getElementById('profilePlayerName').innerText = name.toLocaleUpperCase('tr-TR');
    document.getElementById('profilePlayerSubText').innerText = `${age} YAŞ | MEVKİ: ${position}`;
    
    if (playerId) await loadPlayerReviews(playerId);
    
    selectRatingStar(5);
    document.getElementById('reviewCommentInput').value = "";
    
    updateLoginUIVisibility();
    
    openModal('playerProfileModal');
}

async function loadPlayerReviews(playerId) {
    const reviewsContainer = document.getElementById('playerReviewsContainer');
    if (!reviewsContainer) return;
    
    try {
        const response = await fetch(`/api/player-reviews/${playerId}`);
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
    if (!currentActiveProfileId) return;

    try {
        const response = await fetch('/api/player-reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: currentActiveProfileId,
                reviewerName: loggedInUser,
                rating: parseInt(rating),
                comment: comment || 'OYUNCUYU DEĞERLENDİRDİ.'
            })
        });
        const result = await response.json();
        if (result.success) {
            alert("Değerlendirmeniz başarıyla yayınlandı!");
            await loadPlayerReviews(currentActiveProfileId);
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
