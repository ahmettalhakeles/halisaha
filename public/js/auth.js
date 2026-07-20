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
        const response = await fetch('/api/register', {
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
        const response = await fetch('/api/login', {
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

