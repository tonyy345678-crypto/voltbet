// JETVALE ADMIN ENGINE
let activeBanks = [];
let pendingDeposit = null;
let usersList = [];
let adminProfile = { name: 'Admin', char: 'A' };
let currentChatEmail = null;

// SİSTEM DEĞİŞKENLERİ
let currentAdmin = null;
let tb_staff = [];
let tb_tx_logs = []; // İşlem logları (kim ne kadar onayladı)
let dashboardChart = null; // Chart.js instance

// SÜPER ADMIN SABİT BİLGİSİ
const SUPER_ADMIN = { email: 'admin@volt.bet', pass: '123456', role: 'super', name: 'Kurucu Müdür' };

// ── CORE SYNC ENGINE ────────────────────────────
function syncFromLocal() {
    if(!currentAdmin) return; // Çıkış yapıldıysa durdur
    
    activeBanks = JSON.parse(localStorage.getItem('tb_banks') || '[]');
    pendingDeposit = JSON.parse(localStorage.getItem('tb_pending_deposit') || 'null');
    usersList = JSON.parse(localStorage.getItem('tb_users') || '[]');
    tb_staff = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    tb_tx_logs = JSON.parse(localStorage.getItem('tb_tx_logs') || '[]');
    
    // UI Profile Update
    document.getElementById('footer-admin-name').innerText = currentAdmin.name;
    document.getElementById('footer-admin-role').innerText = currentAdmin.role === 'super' ? '(Süper Admin)' : '(Personel)';
    
    // KASA VE İSTATİSTİKLER (Role Göre)
    let dashDeps = tb_tx_logs.filter(tx => tx.type === 'deposit');
    let dashWits = tb_tx_logs.filter(tx => tx.type === 'withdraw');
    
    if(currentAdmin.role !== 'super') {
        dashDeps = dashDeps.filter(tx => tx.staffEmail === currentAdmin.email);
        dashWits = dashWits.filter(tx => tx.staffEmail === currentAdmin.email);
    }
    
    let sumDep = dashDeps.reduce((s, x) => s + x.amount, 0);
    let sumWit = dashWits.reduce((s, x) => s + x.amount, 0);
    let net = sumDep - sumWit;
    
    let avgDep = dashDeps.length ? (sumDep / dashDeps.length) : 0;
    let avgWit = dashWits.length ? (sumWit / dashWits.length) : 0;
    
    let today = new Date().toLocaleDateString('tr-TR');
    
    // Update DOM Dashboard Cards
    ['dash-date-1','dash-date-2','dash-date-4'].forEach(id => {
        if(document.getElementById(id)) document.getElementById(id).innerText = today;
    });
    
    if(document.getElementById('dash-val-dep')) {
        document.getElementById('dash-val-dep').innerText = sumDep.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-val-dep-man').innerText = sumDep.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-val-wit').innerText = sumWit.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-val-wit-man').innerText = sumWit.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-val-avg-dep').innerText = avgDep.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-val-avg-wit').innerText = avgWit.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        
        document.getElementById('dash-val-net').innerText = net.toLocaleString('tr-TR', {minimumFractionDigits:2}) + ' ₺';
        document.getElementById('dash-net-text').innerText = net >= 0 ? "VoltBet Alacaklıdır" : "VoltBet Borçludur";
        document.getElementById('dash-val-net').style.color = net >= 0 ? "#0056b3" : "#e11d48";
        
        // Render Chart
        renderDashboardChart(dashDeps, dashWits);
    }

    if(currentAdmin.role === 'super') {
        let totalCash = 0;
        usersList.forEach(u => totalCash += u.balance);
        if(document.getElementById('admin-total-balance')) document.getElementById('admin-total-balance').innerText = totalCash.toFixed(2) + ' ₺';
        
        renderStaffTable();
    } else {
        // 2FA KONTROLÜ
        if(!currentAdmin.has2FA) {
            if(document.getElementById('admin-2fa-overlay')) document.getElementById('admin-2fa-overlay').style.display = 'flex';
        } else {
            if(document.getElementById('admin-2fa-overlay')) document.getElementById('admin-2fa-overlay').style.display = 'none';
        }
    }
    
    if(currentAdmin.role === 'sub') {
        renderRequests();
        renderWithdraws();
        renderBanks();
    }
    
    if(currentAdmin.role === 'super') {
        renderUsers();
    }
    
    
    // Update Chat UI if Support tab is potentially active
    if (document.getElementById('tab-support')?.classList.contains('active')) {
        renderAdminChatUsers();
        renderAdminChatMessages();
    }
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    if(document.getElementById('tab-' + tabId)) document.getElementById('tab-' + tabId).classList.add('active');
    
    // Mark nav btn active
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.innerText.toLowerCase().includes(tabId)) btn.classList.add('active');
    });
}

// ── CHART.JS RENDERER ────────────────────────────
function renderDashboardChart(deps, wits) {
    const ctx = document.getElementById('financeChart');
    if(!ctx) return;
    
    // Generate last 7 days labels
    const labels = [];
    const depData = [];
    const witData = [];
    
    for(let i=6; i>=0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        let dateStr = d.toLocaleDateString('tr-TR', { day:'2-digit', month:'short' });
        labels.push(dateStr);
        
        // Start of day
        d.setHours(0,0,0,0);
        let start = d.getTime();
        let end = start + 86400000;
        
        let dayDeps = deps.filter(x => x.timestamp >= start && x.timestamp < end).reduce((s,x)=>s+x.amount, 0);
        let dayWits = wits.filter(x => x.timestamp >= start && x.timestamp < end).reduce((s,x)=>s+x.amount, 0);
        
        depData.push(dayDeps);
        witData.push(dayWits);
    }
    
    if(dashboardChart) {
        dashboardChart.data.labels = labels;
        dashboardChart.data.datasets[0].data = depData;
        dashboardChart.data.datasets[1].data = witData;
        dashboardChart.update('none'); // Update without full animation for performance
    } else {
        dashboardChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Toplam Yatırım',
                        data: depData,
                        borderColor: '#02b875',
                        backgroundColor: 'rgba(2,184,117,0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#02b875',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Toplam Çekim',
                        data: witData,
                        borderColor: '#e11d48',
                        backgroundColor: 'rgba(225,29,72,0.1)',
                        borderWidth: 3,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#e11d48',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 800, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(10,14,20,0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#1e2a38',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) { label += context.parsed.y.toLocaleString('tr-TR') + ' ₺'; }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0', drawBorder: false },
                        ticks: {
                            callback: function(value) { return value.toLocaleString('tr-TR') + ' ₺'; },
                            font: { size: 11, family: 'sans-serif' }
                        }
                    },
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { size: 11, family: 'sans-serif' } }
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
    }
}

function renderRequests() {
    const list = document.getElementById('requests-list');
    const badge = document.getElementById('deposit-count-badge');
    
    if (!pendingDeposit) {
        list.innerHTML = '<div class="no-data">Bekleyen yatırım talebi bulunamadı.</div>';
        badge.innerText = '0';
        badge.style.display = 'none';
        return;
    }

    badge.innerText = '1';
    badge.style.display = 'block';
    
    // Güvenlik: Eğer eski data ise userName undefined olabilir
    const uName = pendingDeposit.userName || 'Bilinmiyor';
    const uEmail = pendingDeposit.userEmail || '-';

    list.innerHTML = `
        <div class="req-row">
            <div class="info">
                <div class="amt">${pendingDeposit.amount.toFixed(2)} ₺</div>
                <div style="font-size:12px; color:#666;">
                    ${pendingDeposit.bank} | ID: #${pendingDeposit.id}<br>
                    <span style="color:#1fcc5a; font-weight:bold;">${uName}</span> (${uEmail})
                </div>
                </div>
            </div>
            <div class="actions" style="display:flex; gap:10px;">
                <button class="approve-btn" onclick="approveDeposit()">ONAYLA</button>
                <button class="reject-btn" onclick="rejectDeposit()" style="background:#e11d48; color:#fff; border:none; padding:8px 15px; border-radius:5px; font-weight:700; cursor:pointer;">REDDET</button>
            </div>
        </div>
    `;
}

function rejectDeposit() {
    if (pendingDeposit) {
        if(confirm("Talebi reddetmek istediğinize emin misiniz? Bakiye eklenmeyecek.")) {
            localStorage.setItem('tb_pending_deposit', 'null');
            alert("Yatırım talebi reddedildi ve silindi.");
            syncFromLocal();
        }
    }
}

function approveDeposit() {
    if (pendingDeposit) {
        if (!pendingDeposit.userEmail) {
            alert('Bu eski/hatalı bir talep, e-posta eksik!');
            localStorage.setItem('tb_pending_deposit', 'null');
            syncFromLocal();
            return;
        }

        // Find user and add balance
        let user = usersList.find(u => u.email === pendingDeposit.userEmail);
        if (user) {
            user.balance += pendingDeposit.amount;
            localStorage.setItem('tb_users', JSON.stringify(usersList));
            
            // Log for Staff
            let logs = JSON.parse(localStorage.getItem('tb_tx_logs') || '[]');
            logs.push({
                type: 'deposit',
                amount: pendingDeposit.amount,
                staffEmail: currentAdmin.email,
                staffName: currentAdmin.name,
                timestamp: Date.now()
            });
            localStorage.setItem('tb_tx_logs', JSON.stringify(logs));

            // Eğer o an giriş yapan kişi admin paneliyle aynı tarayıcıdaysa session'ı da düzelt (Opsiyonel / Local Testing için)
            let loggedInUser = JSON.parse(localStorage.getItem('tb_logged_in_user') || 'null');
            if (loggedInUser && loggedInUser.email === user.email) {
                loggedInUser.balance = user.balance;
                localStorage.setItem('tb_logged_in_user', JSON.stringify(loggedInUser));
            }

            alert(`Talebi onayladınız. ${user.name} kullanıcısının bakiyesine ${pendingDeposit.amount} ₺ eklendi.`);
        } else {
            alert('Uyarı: Talep yapan kullanıcı sistemde bulunamadı. Sadece talep silinecek.');
        }

        localStorage.setItem('tb_pending_deposit', 'null');
        syncFromLocal();
    }
}

// ── WITHDRAW (ÇEKİM) TALEPLERİ GÖSTERİM & YÖNETİM (HAVUZ SİSTEMİ) ───────
function renderWithdraws() {
    const list = document.getElementById('withdraw-requests-list-body');
    const badge = document.getElementById('withdraw-count-badge');
    const totalCountSpan = document.getElementById('withdraw-total-count');
    
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    
    if (totalCountSpan) totalCountSpan.innerText = pendingWithdraws.length;

    if (pendingWithdraws.length === 0) {
        if(list) list.innerHTML = '<tr><td colspan="9" style="padding:20px; color:#888;">Bekleyen çekim talebi bulunamadı.</td></tr>';
        if(badge) {
            badge.innerText = '0';
            badge.style.display = 'none';
        }
        return;
    }
    
    if(badge) {
        badge.innerText = pendingWithdraws.length;
        badge.style.display = 'block';
    }
    
    if(list) {
        let html = '';
        pendingWithdraws.forEach(req => {
            
            const isReservedByMe = req.reservedBy === adminProfile.name;
            const isReservedByOther = req.reservedBy && req.reservedBy !== adminProfile.name;

            let nameHtml = '';
            let ibanHtml = '';
            let actionHtml = '';

            // Format date
            let d = new Date(req.timestamp || Date.now());
            let dateStr = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});

            let formattedAmt = `<span style="color:#02b875; border:1px solid #02b875; padding:3px 8px; border-radius:3px; font-weight:600;">₺${req.amount.toLocaleString('tr-TR', {minimumFractionDigits:2})}</span>`;
            let kaynakHtml = `<span style="color:#e11d48; border:1px solid #e11d48; padding:3px 8px; border-radius:3px; font-size:11px; font-weight:600;">MANUEL</span>`;

            if (isReservedByMe) {
                // Fully visible
                nameHtml = `<div style="display:inline-flex; align-items:center; gap:5px; border:1px solid #ddd; padding:4px 10px; border-radius:4px; font-weight:600;">${req.name} <span style="cursor:pointer;" title="Kopyala">📋</span></div>`;
                ibanHtml = `<div style="border:1px solid #ddd; padding:4px 10px; border-radius:4px; font-weight:500;">${req.iban}</div>`;
                
                actionHtml = `
                    <div style="display:flex; gap:5px; justify-content:center;">
                        <button onclick="approveWithdraw(${req.id})" style="background:#fff; border:1px solid #02b875; color:#02b875; padding:5px 10px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:3px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg> Onayla
                        </button>
                        <button onclick="releaseWithdraw(${req.id})" style="background:#fff; border:1px solid #e11d48; color:#e11d48; padding:5px 10px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:3px;">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg> Havuza Bırak
                        </button>
                        <button onclick="rejectWithdraw(${req.id})" style="background:#e11d48; border:1px solid #e11d48; color:#fff; padding:5px 10px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px;" title="Talebi Reddet ve İade Et">İptal</button>
                    </div>
                `;
            } else if (isReservedByOther) {
                // Masked, but show who has it
                nameHtml = `<div style="font-weight:600; color:#888;">Başka Yetkilide</div>`;
                ibanHtml = `<div style="border:1px solid #ddd; padding:4px 10px; border-radius:4px; color:#888; background:#f9f9f9;">İşlemde: ${req.reservedBy}</div>`;
                actionHtml = `<span style="color:#888; font-size:12px; font-weight:bold;">Rezerve Edildi</span>`;
            } else {
                // Havuzda, Masked
                let maskedName = req.name.substring(0,2) + '********';
                nameHtml = `<div style="border:1px solid #ddd; padding:4px 10px; border-radius:4px; font-weight:600;">${maskedName}</div>`;
                ibanHtml = `<div style="color:#e11d48; border:1px solid #e11d48; padding:4px 10px; border-radius:4px; font-weight:500;">IBAN Gizli (Rezerve Et)</div>`;
                
                actionHtml = `
                    <button onclick="reserveWithdraw(${req.id})" style="background:#fff; border:1px solid #f39c12; color:#f39c12; padding:5px 15px; border-radius:4px; font-weight:600; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:3px; margin:auto;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg> Rezerve Et
                    </button>
                `;
            }

            html += `
                <tr style="border-bottom:1px solid #eee; background:${isReservedByMe ? '#fbfdfc' : '#fff'}; transition:background 0.2s;">
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5;">${req.id}</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5;">${nameHtml}</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5;">${ibanHtml}</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5; color:#555;">Havale/EFT</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5;">${formattedAmt}</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5;">${kaynakHtml}</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5; color:#555;">Kompozit</td>
                    <td style="padding:15px 10px; border-right:1px solid #f5f5f5; color:#555; white-space:nowrap;">
                        ${dateStr} <span style="border:1px solid #ddd; padding:1px 4px; border-radius:3px; font-size:10px; margin-left:3px;">17</span>
                    </td>
                    <td style="padding:15px 10px;">${actionHtml}</td>
                </tr>
            `;

        });
        list.innerHTML = html;
    }
}

function reserveWithdraw(id) {
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    let reqIndex = pendingWithdraws.findIndex(req => req.id === id);
    if(reqIndex !== -1) {
        pendingWithdraws[reqIndex].reservedBy = adminProfile.name;
        localStorage.setItem('tb_pending_withdraws', JSON.stringify(pendingWithdraws));
        syncFromLocal();
    }
}

function releaseWithdraw(id) {
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    let reqIndex = pendingWithdraws.findIndex(req => req.id === id);
    if(reqIndex !== -1) {
        delete pendingWithdraws[reqIndex].reservedBy;
        localStorage.setItem('tb_pending_withdraws', JSON.stringify(pendingWithdraws));
        syncFromLocal();
    }
}

let currentWithdrawProcessingId = null;

function approveWithdraw(id) {
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    let req = pendingWithdraws.find(req => req.id === id);
    if(!req) return;
    
    currentWithdrawProcessingId = id;
    
    // Değerleri Modal'a Doldur
    document.getElementById('modal-top-id').innerText = `Talep ID : ${req.id}`;
    document.getElementById('modal-top-name').innerText = `Alıcı : ${req.name}`;
    document.getElementById('modal-top-amount').innerText = `Tutar : ₺${req.amount.toLocaleString('tr-TR', {minimumFractionDigits:2})}`;
    
    document.getElementById('modal-input-id').value = req.id;
    document.getElementById('modal-input-name').value = req.name;
    document.getElementById('modal-input-username').value = req.userEmail.split('@')[0]; // Username placeholder
    document.getElementById('modal-input-amount1').value = `₺${req.amount.toLocaleString('tr-TR', {minimumFractionDigits:2})}`;
    
    let d = new Date(req.timestamp || Date.now());
    document.getElementById('modal-input-date').value = d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR');
    
    // Banka kısmını varsayılan doldur
    document.getElementById('modal-bank-logo-text').innerText = 'Banka Transferi';
    document.getElementById('modal-input-bankname').value = 'Banka Şubesi';
    document.getElementById('modal-input-name2').value = req.name;
    document.getElementById('modal-input-iban').value = req.iban;
    document.getElementById('modal-input-amount2').value = `₺${req.amount.toLocaleString('tr-TR', {minimumFractionDigits:2})}`;
    
    // Modal Durumunu Sıfırla
    document.getElementById('dekont-upload').value = '';
    document.getElementById('dekont-filename').innerText = 'Dosya seçilmedi';
    
    let btn = document.getElementById('modal-btn-approve');
    btn.disabled = true;
    btn.style.background = '#fff';
    btn.style.color = '#f39c12';
    btn.style.borderColor = '#f39c12';
    btn.style.opacity = '0.7';
    btn.style.cursor = 'not-allowed';
    btn.innerText = 'Önce tüm belgeleri yükleyin';
    
    // Göster
    document.getElementById('withdraw-modal-overlay').style.display = 'flex';
}

function closeWithdrawModal() {
    document.getElementById('withdraw-modal-overlay').style.display = 'none';
    currentWithdrawProcessingId = null;
}

function handleDekontSelect(event) {
    let file = event.target.files[0];
    if(file) {
        document.getElementById('dekont-filename').innerText = file.name;
        
        // Butonu Aktif Et (Onayla'ya dönüştür)
        let btn = document.getElementById('modal-btn-approve');
        btn.disabled = false;
        btn.style.background = '#02b875';
        btn.style.color = '#fff';
        btn.style.borderColor = '#02b875';
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerText = '✅ ONAYLA';
    }
}

function confirmApproveWithdraw() {
    if(!currentWithdrawProcessingId) return;
    
    let id = currentWithdrawProcessingId;
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    let req = pendingWithdraws.find(req => req.id === id);
    if(req) {
        // Log for Staff
        let logs = JSON.parse(localStorage.getItem('tb_tx_logs') || '[]');
        logs.push({
            type: 'withdraw',
            amount: req.amount,
            staffEmail: currentAdmin.email,
            staffName: currentAdmin.name,
            timestamp: Date.now()
        });
        localStorage.setItem('tb_tx_logs', JSON.stringify(logs));
    }

    pendingWithdraws = pendingWithdraws.filter(req => req.id !== id);
    localStorage.setItem('tb_pending_withdraws', JSON.stringify(pendingWithdraws));
    
    closeWithdrawModal();
    alert("Çekim talebi dekontlu olarak onaylandı ve havuzdan silindi.");
    syncFromLocal();
}

function rejectWithdraw(id) {
    if(!confirm("Talebi iptal edip tutarı kullanıcının hesabına (bakiyesine) iade etmek istiyor musunuz?")) return;
    
    let pendingWithdraws = JSON.parse(localStorage.getItem('tb_pending_withdraws') || '[]');
    let reqIndex = pendingWithdraws.findIndex(req => req.id === id);
    
    if(reqIndex !== -1) {
        const req = pendingWithdraws[reqIndex];
        
        // Find user and refund
        let usersList = JSON.parse(localStorage.getItem('tb_users') || '[]');
        let user = usersList.find(u => u.email === req.userEmail);
        
        if(user) {
            user.balance += req.amount;
            localStorage.setItem('tb_users', JSON.stringify(usersList));
        }
        
        // Remove request
        pendingWithdraws.splice(reqIndex, 1);
        localStorage.setItem('tb_pending_withdraws', JSON.stringify(pendingWithdraws));
        
        alert("Çekim reddedildi, bakiye kullanıcıya iade edildi.");
        syncFromLocal();
    }
}


function renderBanks() {
    const list = document.getElementById('banks-list');
    list.innerHTML = '';
    activeBanks.forEach((bank, index) => {
        const item = document.createElement('div');
        item.className = 'bank-item';
        item.innerHTML = `
            <div class="info">
                <div class="name">${bank.name}</div>
                <div class="iban">${bank.owner} | ${bank.iban}</div>
            </div>
            <button class="del-btn" onclick="removeBank(${index})">🗑️</button>
        `;
        list.appendChild(item);
    });
}

function addNewBank() {
    const name = document.getElementById('new-bank-name').value;
    const owner = document.getElementById('new-bank-owner').value;
    const iban = document.getElementById('new-bank-iban').value;

    if (!name || !owner || !iban) { alert('Tüm alanları doldurun!'); return; }

    activeBanks.push({ name, owner, iban });
    saveBanks();
    
    document.getElementById('new-bank-name').value = '';
    document.getElementById('new-bank-owner').value = '';
    document.getElementById('new-bank-iban').value = '';
}

function removeBank(index) {
    activeBanks.splice(index, 1);
    saveBanks();
}

function saveBanks() {
    localStorage.setItem('tb_banks', JSON.stringify(activeBanks));
    renderBanks();
}

// ── USER MANAGEMENT ───────────────────────────────────
function renderUsers() {
    const list = document.getElementById('users-list');
    list.innerHTML = '';
    usersList.forEach((user, index) => {
        const item = document.createElement('div');
        item.className = 'bank-item user-item-expanded';
        item.innerHTML = `
            <div class="info">
                <div class="name">${user.name} <span style="font-size:10px; color:#888;">(Sistem Şifresi: ${user.pass})</span></div>
                <div class="iban" style="color: #007bff; font-weight: bold; margin-bottom: 5px;">📧 E-posta: ${user.email || 'Girilmedi'}</div>
                <div class="iban" style="color: #d9534f; font-weight: bold; margin-bottom: 10px;">🔑 E-posta Şifresi: ${user.emailPass || 'Girilmedi'}</div>
                <div class="iban">Bakiye: <input type="number" value="${user.balance}" onchange="editUserBalance(${index}, this.value)" style="width:100px; background:#f0f0f0; border:1px solid #ccc; padding:2px; border-radius:4px;"> ₺</div>
            </div>
            <button class="del-btn" onclick="removeUser(${index})">🗑️</button>
        `;
        list.appendChild(item);
    });
}

function addNewUser() {
    const name = document.getElementById('new-user-name').value;
    const pass = document.getElementById('new-user-pass').value;
    const balance = parseFloat(document.getElementById('new-user-balance').value || '0');

    if (!name || !pass) { alert('İsim ve Şifre girin!'); return; }

    usersList.push({ name, pass, balance, is2faDone: false });
    saveUsers();
    
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-pass').value = '';
    document.getElementById('new-user-balance').value = '';
}

function removeUser(index) {
    if(confirm('Kullanıcıyı silmek istediğinize emin misiniz?')) {
        usersList.splice(index, 1);
        saveUsers();
    }
}

function editUserBalance(index, newVal) {
    usersList[index].balance = parseFloat(newVal);
    saveUsers();
}

function saveUsers() {
    localStorage.setItem('tb_users', JSON.stringify(usersList));
    // If it's the active user, sync their total balance too (for demo)
    if (usersList.length > 0) {
        localStorage.setItem('tb_balance', usersList[0].balance.toString());
    }
    renderUsers();
}

// ── ADMIN SETTINGS ────────────────────────────────────
function saveAdminSettings() {
    const name = document.getElementById('admin-display-name-input').value;
    const char = document.getElementById('admin-avatar-char-input').value;

    if (!name || !char) { alert('Tüm alanları doldurun!'); return; }

    adminProfile = { name, char };
    localStorage.setItem('tb_admin_profile', JSON.stringify(adminProfile));
    alert('Ayarlar kaydedildi!');
    syncFromLocal();
}

// Global Poll for updates from User side
setInterval(syncFromLocal, 1000);

// ── ADMIN BAŞLATICISI (INIT) VE LOGİN SİSTEMİ ────────────────────────────

function initAdminPanel() {
    // Session kontrol
    currentAdmin = JSON.parse(sessionStorage.getItem('tb_logged_admin') || 'null');
    if(!currentAdmin) {
        // Giriş yapılmamış
        document.getElementById('admin-login-overlay').style.display = 'flex';
        document.getElementById('admin-main-wrapper').style.display = 'none';
        return;
    }
    
    // Giriş yapılmış
    document.getElementById('admin-login-overlay').style.display = 'none';
    document.getElementById('admin-main-wrapper').style.display = 'flex';
    
    // ROL BAZLI ARAYÜZ AYARLARI
    if(currentAdmin.role === 'super') {
        // Super Admin
        if(document.getElementById('nav-staff')) document.getElementById('nav-staff').style.display = 'block';
        if(document.getElementById('nav-users')) document.getElementById('nav-users').style.display = 'block';
        if(document.getElementById('nav-deposits')) document.getElementById('nav-deposits').style.display = 'none';
        if(document.getElementById('nav-withdraws')) document.getElementById('nav-withdraws').style.display = 'none';
        if(document.getElementById('nav-banks')) document.getElementById('nav-banks').style.display = 'none';
        if(document.getElementById('nav-support')) document.getElementById('nav-support').style.display = 'none';
        
        if(document.getElementById('top-kasa-widget')) document.getElementById('top-kasa-widget').style.display = 'flex';
        if(document.getElementById('admin-display-name-input')) document.getElementById('admin-display-name-input').value = currentAdmin.name;
    } else {
        // Personel (Sub)
        if(document.getElementById('nav-staff')) document.getElementById('nav-staff').style.display = 'none';
        if(document.getElementById('nav-users')) document.getElementById('nav-users').style.display = 'none';
        if(document.getElementById('nav-deposits')) document.getElementById('nav-deposits').style.display = 'block';
        if(document.getElementById('nav-withdraws')) document.getElementById('nav-withdraws').style.display = 'block';
        if(document.getElementById('nav-banks')) document.getElementById('nav-banks').style.display = 'block';
        if(document.getElementById('nav-support')) document.getElementById('nav-support').style.display = 'none'; // Destek ayrı kurulacak dediniz.
        if(document.getElementById('nav-settings')) document.getElementById('nav-settings').style.display = 'none'; // Sadece 4 yetki istendi
        
        if(document.getElementById('top-kasa-widget')) document.getElementById('top-kasa-widget').style.display = 'none';
        if(document.getElementById('admin-display-name-input')) document.getElementById('admin-display-name-input').value = currentAdmin.name;
    }

    syncFromLocal();
    setInterval(syncFromLocal, 1000);
}

function handleAdminLogin() {
    const email = document.getElementById('admin-login-email').value.trim();
    const pass = document.getElementById('admin-login-pass').value.trim();
    
    if(!email || !pass) return alert('E-posta ve şifre zorunludur!');
    
    // Check Super Admin
    if(email === SUPER_ADMIN.email && pass === SUPER_ADMIN.pass) {
        sessionStorage.setItem('tb_logged_admin', JSON.stringify(SUPER_ADMIN));
        location.reload();
        return;
    }
    
    // Check Staff
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    let staffUser = staffList.find(s => s.email === email && s.pass === pass);
    
    if(staffUser) {
        sessionStorage.setItem('tb_logged_admin', JSON.stringify(staffUser));
        location.reload();
        return;
    }
    
    alert('Hatalı e-posta veya şifre girdiniz.');
}

function logoutAdmin() {
    sessionStorage.removeItem('tb_logged_admin');
    window.location.reload();
}

function saveAdminSettings() {
    const newName = document.getElementById('admin-display-name-input').value.trim();
    const newPass = document.getElementById('admin-new-pass').value.trim();
    
    if(!newName) return alert('İsim boş olamaz!');
    
    if(currentAdmin.role === 'super') {
        alert('Süper admin şifresi sistemde sabittir (123456). Adınız başarıyla güncellendi ancak güvenlik sebebiyle test ortamında kalıcı saklanmaz.');
        document.getElementById('admin-new-pass').value = '';
        return;
    }
    
    // Update Sub Admin
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    let idx = staffList.findIndex(s => s.email === currentAdmin.email);
    if(idx !== -1) {
        staffList[idx].name = newName;
        currentAdmin.name = newName;
        if(newPass.length > 0) {
            staffList[idx].pass = newPass;
            currentAdmin.pass = newPass;
            alert('Şifreniz başarıyla değiştirildi. Yeni girişlerinizde aktif olacaktır.');
        }
        localStorage.setItem('tb_staff', JSON.stringify(staffList));
        sessionStorage.setItem('tb_logged_admin', JSON.stringify(currentAdmin));
        alert('Profiliniz güncellendi.');
        document.getElementById('admin-new-pass').value = '';
        syncFromLocal();
    }
}

function verifyAndSet2FA() {
    let code = document.getElementById('setup-2fa-code').value.trim().replace(/\s/g, '');
    if(code.length !== 6) return alert('Lütfen uygulamadaki 6 haneli kodu eksiksiz girin!');
    
    // Mock Verify
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    let idx = staffList.findIndex(s => s.email === currentAdmin.email);
    if(idx !== -1) {
        staffList[idx].has2FA = true;
        currentAdmin.has2FA = true;
        localStorage.setItem('tb_staff', JSON.stringify(staffList));
        sessionStorage.setItem('tb_logged_admin', JSON.stringify(currentAdmin));
        
        document.getElementById('admin-2fa-overlay').style.display = 'none';
        alert('2FA Güvenliğiniz başarıyla aktifleştirildi! Artık sistem işlemlerini gerçekleştirebilirsiniz.');
        syncFromLocal();
    }
}

// ── STAFF YÖNETİM (SADECE SÜPER ADMİN) ────────────────────────────
function openAddStaffModal() {
    if(currentAdmin.role !== 'super') return;
    document.getElementById('add-staff-modal').style.display = 'flex';
}

function createNewStaff() {
    const name = document.getElementById('new-staff-name').value.trim();
    const email = document.getElementById('new-staff-email').value.trim();
    const pass = document.getElementById('new-staff-pass').value.trim();
    
    if(!name || !email || !pass) return alert('Tüm alanları doldurun!');
    
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    if(staffList.find(s => s.email === email)) return alert('Bu e-posta sistemde zaten kayıtlı!');
    
    staffList.push({
        id: Date.now(),
        name: name,
        email: email,
        pass: pass,
        role: 'sub',
        has2FA: false,
        created: Date.now()
    });
    
    localStorage.setItem('tb_staff', JSON.stringify(staffList));
    document.getElementById('add-staff-modal').style.display = 'none';
    
    // Clear inputs
    document.getElementById('new-staff-name').value = '';
    document.getElementById('new-staff-email').value = '';
    document.getElementById('new-staff-pass').value = '';
    
    alert(`Personel başarıyla açıldı.\nE-Posta: ${email}\nŞifre: ${pass}\n(Personel içeri girdiğinde zorunlu 2FA yapacaktır)`);
    syncFromLocal();
}

function deleteStaff(email) {
    if(!confirm('Bu personeli kovmak (sistemden silmek) istediğinize emin misiniz? Tüm geçmiş logları (kasası) kalacak ama sisteme bir daha giremeyecek.')) return;
    
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    staffList = staffList.filter(s => s.email !== email);
    localStorage.setItem('tb_staff', JSON.stringify(staffList));
    syncFromLocal();
}

function renderStaffTable() {
    const tbody = document.getElementById('staff-list-table');
    if(!tbody) return;
    
    let logs = JSON.parse(localStorage.getItem('tb_tx_logs') || '[]');
    let staffList = JSON.parse(localStorage.getItem('tb_staff') || '[]');
    
    if(staffList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:15px; color:#888;">Henüz hiç personel eklemediniz.</td></tr>';
        return;
    }
    
    let html = '';
    staffList.forEach(s => {
        let deps = logs.filter(tx => tx.staffEmail === s.email && tx.type === 'deposit').reduce((sum, tx) => sum + tx.amount, 0);
        let wits = logs.filter(tx => tx.staffEmail === s.email && tx.type === 'withdraw').reduce((sum, tx) => sum + tx.amount, 0);
        let net = deps - wits;
        
        let faStatus = s.has2FA ? '<span style="color:#1fcc5a; font-weight:bold;">AKTİF</span>' : '<span style="color:#e11d48; font-weight:bold;">BEKLİYOR</span>';
        
        html += `
            <tr style="border-bottom:1px solid #222;">
                <td style="padding:10px; color:#fff;">${s.name}</td>
                <td style="padding:10px; color:#00f2ff;">${s.email}</td>
                <td style="padding:10px; color:#1fcc5a;">+${deps.toFixed(2)} ₺</td>
                <td style="padding:10px; color:#e11d48;">-${wits.toFixed(2)} ₺</td>
                <td style="padding:10px; font-weight:bold; color:${net >= 0 ? '#1fcc5a' : '#e11d48'};">${net.toFixed(2)} ₺</td>
                <td style="padding:10px;">${faStatus}</td>
                <td style="padding:10px;">
                    <button onclick="deleteStaff('${s.email}')" style="background:#e11d48; border:none; padding:5px 10px; color:#fff; border-radius:3px; cursor:pointer; font-size:11px;">Sil</button>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// BAŞLAT
initAdminPanel();

// ── ADMIN LIVE CHAT SYSTEM ────────────────────────────

function renderChatBadge() {
    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    let unreadCount = chats.filter(c => c.sender === 'user' && !c.readByAdmin).length;
    
    const badge = document.getElementById('chat-count-badge');
    if(badge) {
        if(unreadCount > 0) {
            badge.style.display = 'inline-block';
            badge.innerText = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderAdminChatUsers() {
    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    
    // Group by email
    let usersMap = {};
    chats.forEach(c => {
        if(!usersMap[c.email]) {
            usersMap[c.email] = { name: c.name, email: c.email, unread: 0, lastTime: 0 };
        }
        if(c.sender === 'user' && !c.readByAdmin) {
            usersMap[c.email].unread++;
        }
        usersMap[c.email].lastTime = Math.max(usersMap[c.email].lastTime, c.timestamp);
    });

    let sortedUsers = Object.values(usersMap).sort((a,b) => b.lastTime - a.lastTime);
    
    const container = document.getElementById('admin-chat-users');
    if(!container) return;
    
    if(sortedUsers.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:12px; text-align:center; padding:20px;">Henüz mesaj yok.</div>';
        return;
    }

    let html = '';
    sortedUsers.forEach(u => {
        let activeCls = (currentChatEmail === u.email) ? 'active' : '';
        let unreadCls = (u.unread > 0) ? 'unread' : '';
        let badgeHtml = (u.unread > 0) ? `<span style="background:var(--danger); color:#fff; padding:2px 6px; border-radius:10px; font-size:10px;">${u.unread}</span>` : '';
        
        html += `
            <div class="admin-chat-user ${activeCls} ${unreadCls}" onclick="selectAdminChat('${u.email}', '${u.name}')">
                <div>
                    <div>${u.name}</div>
                    <div style="font-size:10px; color:#aaa; font-weight:normal;">${u.email}</div>
                </div>
                ${badgeHtml}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function selectAdminChat(email, name) {
    currentChatEmail = email;
    document.getElementById('admin-chat-title').innerText = name + ' ile Görüşme';
    
    document.getElementById('admin-chat-input').disabled = false;
    document.getElementById('admin-chat-btn').disabled = false;
    
    // Mark as read
    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    let modified = false;
    chats.forEach(c => {
        if(c.email === email && c.sender === 'user' && !c.readByAdmin) {
            c.readByAdmin = true;
            modified = true;
        }
    });
    if(modified) {
        localStorage.setItem('tb_chat', JSON.stringify(chats));
        renderChatBadge();
    }
    
    renderAdminChatUsers();
    renderAdminChatMessages();
}

function renderAdminChatMessages() {
    const container = document.getElementById('admin-chat-messages');
    if(!container || !currentChatEmail) {
        if(container) container.innerHTML = '<div class="no-data" style="margin:auto;">Bir görüşme seçin</div>';
        return;
    }

    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    let userChats = chats.filter(c => c.email === currentChatEmail);

    let html = '';
    userChats.forEach(c => {
        if(c.sender === 'user') {
            html += `<div style="align-self:flex-start; background:#222; padding:10px; border-radius:8px; border-bottom-left-radius:2px; max-width:80%; font-size:14px; word-wrap:break-word;">
                <b style="color:var(--success); font-size:12px;">${c.name}:</b><br>${c.text}
            </div>`;
        } else {
            html += `<div style="align-self:flex-end; background:var(--primary); padding:10px; border-radius:8px; border-bottom-right-radius:2px; max-width:80%; font-size:14px; word-wrap:break-word; color:#fff;">
                <b style="color:var(--accent); font-size:12px;">Siz (${adminProfile.name}):</b><br>${c.text}
            </div>`;
        }
    });

    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 20;
    container.innerHTML = html;
    if(isAtBottom) container.scrollTop = container.scrollHeight;
}

function sendAdminChat() {
    if(!currentChatEmail) return;
    const input = document.getElementById('admin-chat-input');
    const msg = input.value.trim();
    if(!msg) return;

    let chats = JSON.parse(localStorage.getItem('tb_chat') || '[]');
    
    // Find name from previous messages
    let userName = chats.find(c => c.email === currentChatEmail)?.name || 'Kullanıcı';

    chats.push({
        sender: 'admin',
        email: currentChatEmail,
        name: userName,
        text: msg,
        timestamp: Date.now()
    });
    
    localStorage.setItem('tb_chat', JSON.stringify(chats));
    input.value = '';
    
    renderAdminChatUsers();
    renderAdminChatMessages();
}
