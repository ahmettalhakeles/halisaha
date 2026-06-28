
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
        const response = await fetch('/api/auth/verify-otp', {
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
        const response = await fetch('/api/auth/complete-profile', {
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
        window.location.href = '/api/auth/google';
    } else if (provider === 'apple') {
        window.location.href = '/api/auth/apple/callback?code=mock_apple_code';
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
        const response = await fetch(`/api/reviews/${fieldKey}`);
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
        const response = await fetch('/api/reviews', {
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
    
    // Find the corresponding button
    // The button is inside the previous sibling (mobile-listing-header)
    const btn = formContainer.nextElementSibling?.querySelector('.mobile-create-btn');
    
    if (formContainer.classList.contains('anim-slide-fade-in') || formContainer.style.display === 'block') {
        // Kapat
        formContainer.classList.remove('anim-slide-fade-in');
        formContainer.classList.add('anim-slide-fade-out');
        
        if (btn) btn.innerText = '+ İlan Ver';
        
        // Animasyon bitince display none yap
        setTimeout(() => {
            if (formContainer.classList.contains('anim-slide-fade-out')) {
                formContainer.style.display = 'none';
                formContainer.classList.remove('anim-slide-fade-out');
            }
        }, 300);
    } else {
        // Aç
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




