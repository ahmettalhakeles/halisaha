
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
    const msg = document.getElementById('forumMessage').value.trim() || "EKİP TAMAMLANIYOR.";

    try {
        const response = await fetch('/api/forum', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dateText: date, hourText: hour, position: pos, payment, msg, user_id: currentUser.id })
        });
        const result = await response.json();
        if (result.success) {
            alert("İlanınız başarıyla yayınlandı!");
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
