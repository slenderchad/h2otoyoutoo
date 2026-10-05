/**
 * H2O To You Too (h2otoyoutoo.in)
 * Aquatic Web Application Frontend
 */

// Application State
const state = {
    currentUser: null,
    currentView: 'login',
    requests: [],
    stats: null,
    pollingInterval: null
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
    initOceanBackground();
    checkAuthSession();
    setupEventListeners();
    setupTankVisualizer();
});

/* ==========================================================================
   OCEAN BUBBLES GENERATOR
   ========================================================================== */
function initOceanBackground() {
    const bg = document.getElementById('oceanBackground');
    if (!bg) return;

    for (let i = 0; i < 20; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const size = Math.floor(Math.random() * 35) + 12;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${Math.random() * 8 + 8}s`;
        bubble.style.animationDelay = `${Math.random() * 6}s`;
        bg.appendChild(bubble);
    }
}

/* ==========================================================================
   AUTHENTICATION & SESSION
   ========================================================================== */
async function checkAuthSession() {
    try {
        const res = await fetch('/api/me');
        const data = await res.json();
        if (data.logged_in && data.user) {
            state.currentUser = data.user;
            updateNavUser();
            routeToRoleView(data.user.role);
            startPolling();
        } else {
            navigateTo('login');
        }
    } catch (err) {
        console.error('Session check failed:', err);
        navigateTo('login');
    }
}

function updateNavUser() {
    const navUserEl = document.getElementById('navUserStatus');
    const navAuthButtons = document.getElementById('navAuthButtons');

    if (state.currentUser) {
        navUserEl.style.display = 'flex';
        navAuthButtons.style.display = 'none';

        document.getElementById('navUsername').textContent = state.currentUser.username;
        const roleBadge = document.getElementById('navRoleBadge');
        roleBadge.textContent = state.currentUser.role;
        roleBadge.className = `role-badge role-${state.currentUser.role}`;
    } else {
        navUserEl.style.display = 'none';
        navAuthButtons.style.display = 'flex';
    }
}

function routeToRoleView(role) {
    if (role === 'resident') {
        navigateTo('resident');
        loadResidentData();
    } else if (role === 'supplier') {
        navigateTo('supplier');
        loadSupplierData();
    } else if (role === 'admin') {
        navigateTo('admin');
        loadAdminData();
    } else {
        navigateTo('login');
    }
}

function navigateTo(viewName) {
    state.currentView = viewName;

    // Hide all view containers
    document.querySelectorAll('.view-panel').forEach(panel => {
        panel.style.display = 'none';
    });

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateNavUser();
}

/* ==========================================================================
   EVENT LISTENERS & FORM HANDLERS
   ========================================================================== */
function setupEventListeners() {
    // Navigation items
    document.getElementById('brandLogo').addEventListener('click', () => {
        if (state.currentUser) {
            routeToRoleView(state.currentUser.role);
        } else {
            navigateTo('login');
        }
    });

    document.getElementById('btnLogout').addEventListener('click', handleLogout);

    // Login page: "New User?" button
    document.getElementById('btnGoToRegister').addEventListener('click', () => {
        navigateTo('register');
        resetRegisterForm();
    });

    // Register page: "Already have an account?"
    document.getElementById('btnBackToLogin').addEventListener('click', () => {
        navigateTo('login');
    });

    // Quick Demo Logins
    document.querySelectorAll('.demo-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const user = e.target.getAttribute('data-user');
            const pass = e.target.getAttribute('data-pass');
            document.getElementById('loginUsername').value = user;
            document.getElementById('loginPassword').value = pass;
            handleLogin();
        });
    });

    // Login Form Submit
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });

    // Register Role Selector Cards
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => {
            document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            const radio = card.querySelector('input[type="radio"]');
            radio.checked = true;
            updateRegisterRoleFields(radio.value);
        });
    });

    // Register Identifier input live update
    const idInput = document.getElementById('regIdentifier');
    idInput.addEventListener('input', updateUsernamePreview);

    // Register Form Submit
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegister();
    });

    // Modal "OK" button -> MUST redirect to login page
    document.getElementById('btnModalOk').addEventListener('click', () => {
        hideModal();
        navigateTo('login');
    });

    // Resident Water Request Liter Input & Chips
    const literInput = document.getElementById('reqLiters');
    const literSlider = document.getElementById('reqSlider');

    literInput.addEventListener('input', () => {
        const val = parseFloat(literInput.value) || 0;
        literSlider.value = Math.min(val, 100);
        updateLiterSelection(val);
    });

    literSlider.addEventListener('input', () => {
        literInput.value = literSlider.value;
        updateLiterSelection(parseFloat(literSlider.value));
    });

    document.querySelectorAll('.liter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const liters = parseFloat(chip.getAttribute('data-liters'));
            literInput.value = liters;
            literSlider.value = Math.min(liters, 100);
            updateLiterSelection(liters);
        });
    });

    // Resident Request Form Submit
    document.getElementById('waterRequestForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleCreateWaterRequest();
    });

    // Copy Credential Buttons in Modal
    document.getElementById('btnCopyUsername').addEventListener('click', () => {
        copyToClipboard(document.getElementById('modalUsername').textContent, 'Username copied!');
    });

    document.getElementById('btnCopyPassword').addEventListener('click', () => {
        copyToClipboard(document.getElementById('modalPassword').textContent, 'Password copied!');
    });

    // Toggle password visibility
    setupPasswordToggles();

    // Domain Guide Modal triggers
    document.getElementById('btnDomainGuideNav').addEventListener('click', () => {
        showDomainModal();
    });
    document.getElementById('btnCloseDomainModal').addEventListener('click', () => {
        hideDomainModal();
    });
}

function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
            }
        });
    });
}

/* ==========================================================================
   REGISTRATION LOGIC & USERNAME FORMATTING
   ========================================================================== */
function getSelectedRole() {
    const checked = document.querySelector('input[name="regRole"]:checked');
    return checked ? checked.value : 'resident';
}

function updateRegisterRoleFields(role) {
    const labelEl = document.getElementById('regIdentifierLabel');
    const inputEl = document.getElementById('regIdentifier');
    const hintEl = document.getElementById('regIdentifierHint');

    if (role === 'resident') {
        labelEl.textContent = 'Flat Number';
        inputEl.placeholder = 'e.g. 101, 204, B-402';
        hintEl.textContent = 'Format: flat-<flatnumber>';
    } else if (role === 'supplier') {
        labelEl.textContent = 'Supplier Name';
        inputEl.placeholder = 'e.g. AquaPure, BlueStream, JalDhara';
        hintEl.textContent = 'Format: supply-<suppliername>';
    } else if (role === 'admin') {
        labelEl.textContent = 'Admin ID';
        inputEl.placeholder = 'e.g. 001, security, master';
        hintEl.textContent = 'Format: admin-<adminid>';
    }

    updateUsernamePreview();
}

function updateUsernamePreview() {
    const role = getSelectedRole();
    const rawVal = document.getElementById('regIdentifier').value.trim();
    const cleanVal = rawVal.replace(/\s+/g, '') || '[your-id]';
    let prefix = 'flat-';
    if (role === 'supplier') prefix = 'supply-';
    if (role === 'admin') prefix = 'admin-';

    const fullUsername = `${prefix}${cleanVal}`;
    document.getElementById('previewUsername').textContent = fullUsername;
}

function resetRegisterForm() {
    document.getElementById('registerForm').reset();
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('active'));
    document.querySelector('.role-card[data-role="resident"]').classList.add('active');
    document.querySelector('input[value="resident"]').checked = true;
    updateRegisterRoleFields('resident');
}

async function handleRegister() {
    const role = getSelectedRole();
    const identifier = document.getElementById('regIdentifier').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!identifier) {
        showToast('Please enter your identifier / flat number.', 'warning');
        return;
    }
    if (!password) {
        showToast('Please choose a password.', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, identifier, password })
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Registration failed.', 'error');
            return;
        }

        // Display username and password in modal dialog till user presses OK
        showCredentialModal(data.username, data.password, data.role);

    } catch (err) {
        console.error('Registration error:', err);
        showToast('Failed to connect to server. Please try again.', 'error');
    }
}

/* ==========================================================================
   CREDENTIAL DISPLAY MODAL (Key Requirement)
   ========================================================================== */
function showCredentialModal(username, password, role) {
    document.getElementById('modalUsername').textContent = username;
    document.getElementById('modalPassword').textContent = password;
    document.getElementById('modalRoleBadge').textContent = role.toUpperCase();
    document.getElementById('modalRoleBadge').className = `role-badge role-${role}`;

    // Pre-fill the login input so when they press OK it's ready!
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';

    const modal = document.getElementById('credentialModal');
    modal.classList.add('active');
}

function hideModal() {
    const modal = document.getElementById('credentialModal');
    modal.classList.remove('active');
}

/* ==========================================================================
   LOGIN & LOGOUT LOGIC
   ========================================================================== */
async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) {
        showToast('Please enter your username and password.', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Login failed.', 'error');
            return;
        }

        state.currentUser = data.user;
        showToast(`Welcome back, ${data.user.username}!`, 'success');
        updateNavUser();
        routeToRoleView(data.redirect_role);
        startPolling();

    } catch (err) {
        console.error('Login error:', err);
        showToast('Network error during login.', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {
        console.error('Logout error:', e);
    }
    stopPolling();
    state.currentUser = null;
    state.requests = [];
    document.getElementById('loginPassword').value = '';
    updateNavUser();
    navigateTo('login');
    showToast('You have logged out safely.', 'success');
}

/* ==========================================================================
   RESIDENT PAGE LOGIC
   ========================================================================== */
function setupTankVisualizer() {
    updateLiterSelection(20);
}

function updateLiterSelection(liters) {
    // Update tank height (max 100L visually)
    const tankFill = document.getElementById('waterTankFill');
    const gaugeEl = document.getElementById('tankGaugeValue');
    const quotaBanner = document.getElementById('quotaBanner');
    const quotaBannerText = document.getElementById('quotaBannerText');

    if (tankFill) {
        const percentage = Math.min(Math.max((liters / 100) * 100, 5), 98);
        tankFill.style.height = `${percentage}%`;
    }
    if (gaugeEl) {
        gaugeEl.textContent = `${liters} L`;
    }

    // Update chips active state
    document.querySelectorAll('.liter-chip').forEach(chip => {
        const chipVal = parseFloat(chip.getAttribute('data-liters'));
        if (chipVal === liters) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    // Quota notice: >20L requires admin approval!
    if (liters > 20) {
        quotaBanner.className = 'quota-banner quota-banner-warning';
        quotaBannerText.innerHTML = `<strong>⚠️ High Volume Notice (&gt; 20 Liters):</strong> Orders exceeding 20L require Society Admin verification and approval before dispatching to suppliers.`;
    } else {
        quotaBanner.className = 'quota-banner quota-banner-normal';
        quotaBannerText.innerHTML = `<strong>✅ Standard Quota (&le; 20 Liters):</strong> Automatically verified! Your request will be directly queued for supplier delivery scheduling.`;
    }
}

async function handleCreateWaterRequest() {
    const liters = parseFloat(document.getElementById('reqLiters').value);
    const purpose = document.getElementById('reqPurpose').value;

    if (!liters || liters <= 0) {
        showToast('Please specify a water quantity greater than 0 Liters.', 'warning');
        return;
    }

    try {
        const res = await fetch('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ liters, purpose })
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Failed to submit request.', 'error');
            return;
        }

        showToast(data.message, 'success');
        loadResidentData();

    } catch (err) {
        console.error('Request creation error:', err);
        showToast('Network error while requesting water.', 'error');
    }
}

async function loadResidentData() {
    if (!state.currentUser) return;
    document.getElementById('residentWelcomeFlat').textContent = state.currentUser.identifier;

    try {
        const res = await fetch('/api/requests');
        const data = await res.json();
        if (data.success) {
            state.requests = data.requests;
            renderResidentRequests(data.requests);
        }
    } catch (err) {
        console.error('Error fetching resident requests:', err);
    }
}

function renderResidentRequests(requests) {
    const tbody = document.getElementById('residentRequestsBody');
    const emptyState = document.getElementById('residentEmptyState');

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    tbody.innerHTML = requests.map(req => {
        let approvalBadge = '';
        if (!req.needs_admin_approval) {
            approvalBadge = `<span class="badge badge-auto">Auto-Approved (&le;20L)</span>`;
        } else if (req.admin_status === 'pending') {
            approvalBadge = `<span class="badge badge-pending">Pending Admin (&gt;20L)</span>`;
        } else if (req.admin_status === 'approved') {
            approvalBadge = `<span class="badge badge-approved">Admin Approved</span>`;
        } else {
            approvalBadge = `<span class="badge badge-rejected">Rejected</span>`;
        }

        let timingDisplay = '';
        if (req.delivery_timing) {
            timingDisplay = `
                <div class="timing-box scheduled">
                    <span>🚚 ${escapeHtml(req.delivery_timing)}</span>
                </div>
            `;
        } else if (req.admin_status === 'pending') {
            timingDisplay = `<span style="color: var(--text-muted); font-size:0.85rem;">Awaiting Admin Approval</span>`;
        } else {
            timingDisplay = `<span style="color: var(--text-muted); font-size:0.85rem;">⏳ Awaiting Supplier Timing</span>`;
        }

        let deliveryStatusBadge = '';
        if (req.delivery_status === 'delivered') {
            deliveryStatusBadge = `<span class="badge badge-delivered">Delivered ✅</span>`;
        } else if (req.delivery_status === 'in_transit') {
            deliveryStatusBadge = `<span class="badge badge-scheduled">En Route 🚚</span>`;
        } else if (req.delivery_status === 'scheduled') {
            deliveryStatusBadge = `<span class="badge badge-approved">Timing Scheduled</span>`;
        } else if (req.delivery_status === 'rejected') {
            deliveryStatusBadge = `<span class="badge badge-rejected">Cancelled</span>`;
        } else {
            deliveryStatusBadge = `<span class="badge badge-pending">Processing</span>`;
        }

        return `
            <tr>
                <td><strong>#${escapeHtml(req.request_code)}</strong></td>
                <td><strong style="color: var(--aqua-primary); font-size: 1.05rem;">${req.liters} L</strong></td>
                <td><span style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(req.purpose)}</span></td>
                <td>${approvalBadge}</td>
                <td>${timingDisplay}</td>
                <td>${deliveryStatusBadge}</td>
                <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(req.created_at)}</td>
            </tr>
        `;
    }).join('');
}

/* ==========================================================================
   SUPPLIER PAGE LOGIC
   ========================================================================== */
async function loadSupplierData() {
    if (!state.currentUser) return;
    document.getElementById('supplierNameDisplay').textContent = state.currentUser.identifier;

    try {
        const res = await fetch('/api/requests');
        const data = await res.json();
        if (data.success) {
            state.requests = data.requests;
            renderSupplierRequests(data.requests);
        }
    } catch (err) {
        console.error('Error fetching supplier requests:', err);
    }
}

function renderSupplierRequests(requests) {
    const tbody = document.getElementById('supplierRequestsBody');
    const emptyState = document.getElementById('supplierEmptyState');

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    tbody.innerHTML = requests.map(req => {
        const timingVal = req.delivery_timing || '';
        const isScheduled = !!req.delivery_timing;

        return `
            <tr>
                <td><strong>#${escapeHtml(req.request_code)}</strong></td>
                <td>
                    <span style="font-weight: 700; color: #ffffff;">Flat ${escapeHtml(req.flat_number)}</span>
                </td>
                <td><strong style="color: var(--aqua-primary);">${req.liters} L</strong></td>
                <td>
                    <span style="font-size:0.85rem;">${escapeHtml(req.purpose)}</span>
                </td>
                <td>
                    <div style="display: flex; gap: 0.4rem; align-items: center; max-width: 280px;">
                        <input type="text" class="form-input form-input-timing" id="timing-input-${req.id}" 
                               style="padding: 0.4rem 0.6rem; font-size: 0.82rem;" 
                               placeholder="e.g. Today at 5:00 PM" 
                               value="${escapeHtml(timingVal)}">
                        <button class="btn btn-primary btn-sm" onclick="handleSetTiming(${req.id})" title="Save Timing">
                            Save
                        </button>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="handleUpdateDeliveryStatus(${req.id}, 'in_transit')">
                            🚚 In Transit
                        </button>
                        <button class="btn btn-success btn-sm" onclick="handleUpdateDeliveryStatus(${req.id}, 'delivered')">
                            ✅ Delivered
                        </button>
                    </div>
                </td>
                <td>
                    <span class="badge ${req.delivery_status === 'delivered' ? 'badge-delivered' : 'badge-scheduled'}">
                        ${escapeHtml(req.delivery_status)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleSetTiming(reqId) {
    const input = document.getElementById(`timing-input-${reqId}`);
    if (!input) return;
    const timing = input.value.trim();

    if (!timing) {
        showToast('Please enter an estimated arrival time.', 'warning');
        return;
    }

    try {
        const res = await fetch(`/api/requests/${reqId}/schedule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_timing: timing, delivery_status: 'scheduled' })
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Failed to update timing.', 'error');
            return;
        }

        showToast(data.message, 'success');
        loadSupplierData();

    } catch (err) {
        console.error('Error saving timing:', err);
        showToast('Failed to save delivery timing.', 'error');
    }
}

async function handleUpdateDeliveryStatus(reqId, newStatus) {
    try {
        const res = await fetch(`/api/requests/${reqId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delivery_status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'success');
            loadSupplierData();
        } else {
            showToast(data.message, 'error');
        }
    } catch (err) {
        console.error('Status error:', err);
    }
}

/* ==========================================================================
   ADMIN PAGE LOGIC (>20L VERIFICATION & OVERSIGHT)
   ========================================================================== */
async function loadAdminData() {
    if (!state.currentUser) return;
    document.getElementById('adminIdDisplay').textContent = state.currentUser.identifier;

    try {
        // Load stats
        const statsRes = await fetch('/api/stats');
        const statsData = await statsRes.json();
        if (statsData.success) {
            renderAdminStats(statsData.stats);
        }

        // Load all requests
        const reqsRes = await fetch('/api/requests');
        const reqsData = await reqsRes.json();
        if (reqsData.success) {
            state.requests = reqsData.requests;
            renderAdminVerificationList(reqsData.requests);
            renderAdminMasterTable(reqsData.requests);
        }
    } catch (err) {
        console.error('Admin data fetch error:', err);
    }
}

function renderAdminStats(stats) {
    document.getElementById('statTotalRequests').textContent = stats.total_requests;
    document.getElementById('statTotalLiters').textContent = `${stats.total_liters} L`;
    document.getElementById('statPendingVerifications').textContent = stats.pending_approvals;
    document.getElementById('statActiveDeliveries').textContent = stats.active_deliveries;
}

function renderAdminVerificationList(requests) {
    // Filter specifically for requests > 20L that need admin verification
    const pendingHighVolume = requests.filter(r => r.needs_admin_approval && r.admin_status === 'pending');
    const container = document.getElementById('adminVerificationContainer');
    const countBadge = document.getElementById('pendingVerificationCount');

    countBadge.textContent = `${pendingHighVolume.length} Action Needed`;

    if (pendingHighVolume.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                <span style="font-size: 2rem; display: block; margin-bottom: 0.5rem;">🎉</span>
                All high-volume water orders (>20L) are currently reviewed and approved!
            </div>
        `;
        return;
    }

    container.innerHTML = pendingHighVolume.map(req => {
        return `
            <div style="background: rgba(8, 26, 48, 0.7); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem;">
                        <strong style="font-size: 1.1rem; color: #ffffff;">#${escapeHtml(req.request_code)}</strong>
                        <span class="badge badge-pending">⚠️ Exceeds 20L Limit (${req.liters} Liters)</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--water-foam);">
                        Resident Flat: <strong>${escapeHtml(req.flat_number)}</strong> | Purpose: <em>${escapeHtml(req.purpose)}</em>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                        Requested at: ${escapeHtml(req.created_at)}
                    </div>
                </div>
                <div style="display: flex; gap: 0.6rem;">
                    <button class="btn btn-success btn-sm" onclick="handleAdminVerify(${req.id}, 'approve')">
                        ✅ Verify & Approve
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="handleAdminVerify(${req.id}, 'reject')">
                        ❌ Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderAdminMasterTable(requests) {
    const tbody = document.getElementById('adminMasterTableBody');
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem;">No water requests recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = requests.map(req => {
        let approvalCol = '';
        if (!req.needs_admin_approval) {
            approvalCol = `<span class="badge badge-auto">Auto-Approved (&le;20L)</span>`;
        } else if (req.admin_status === 'pending') {
            approvalCol = `<span class="badge badge-pending">Needs Admin Verification</span>`;
        } else if (req.admin_status === 'approved') {
            approvalCol = `<span class="badge badge-approved">Admin Verified (${escapeHtml(req.admin_verified_by || 'Admin')})</span>`;
        } else {
            approvalCol = `<span class="badge badge-rejected">Rejected</span>`;
        }

        const timingCol = req.delivery_timing 
            ? `<div class="timing-box scheduled">🚚 ${escapeHtml(req.delivery_timing)}</div>`
            : `<span style="color: var(--text-muted); font-size:0.82rem;">Not yet scheduled</span>`;

        return `
            <tr>
                <td><strong>#${escapeHtml(req.request_code)}</strong></td>
                <td><strong style="color: #ffffff;">Flat ${escapeHtml(req.flat_number)}</strong></td>
                <td><strong style="color: var(--aqua-primary);">${req.liters} L</strong></td>
                <td>${approvalCol}</td>
                <td>${escapeHtml(req.supplier_username || 'Unassigned')}</td>
                <td>${timingCol}</td>
                <td>
                    <span class="badge ${req.delivery_status === 'delivered' ? 'badge-delivered' : 'badge-scheduled'}">
                        ${escapeHtml(req.delivery_status)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleAdminVerify(reqId, action) {
    let notes = '';
    if (action === 'approve') {
        notes = 'Verified valid residential water requirement by society administrator.';
    } else {
        notes = prompt('Reason for rejecting this request:');
        if (notes === null) return; // user cancelled prompt
    }

    try {
        const res = await fetch(`/api/requests/${reqId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, notes })
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Action failed.', 'error');
            return;
        }

        showToast(data.message, 'success');
        loadAdminData();

    } catch (err) {
        console.error('Verification error:', err);
        showToast('Failed to process verification.', 'error');
    }
}

/* ==========================================================================
   REAL-TIME SYNC & POLLING
   ========================================================================== */
function startPolling() {
    stopPolling();
    state.pollingInterval = setInterval(() => {
        if (!state.currentUser) return;
        if (state.currentView === 'resident') loadResidentData();
        if (state.currentView === 'supplier') loadSupplierData();
        if (state.currentView === 'admin') loadAdminData();
    }, 10000); // sync every 10 seconds
}

function stopPolling() {
    if (state.pollingInterval) {
        clearInterval(state.pollingInterval);
        state.pollingInterval = null;
    }
}

/* ==========================================================================
   GODADDY DOMAIN MODAL HELPERS
   ========================================================================== */
function showDomainModal() {
    document.getElementById('domainModal').classList.add('active');
}
function hideDomainModal() {
    document.getElementById('domainModal').classList.remove('active');
}

/* ==========================================================================
   UTILITIES & TOASTS
   ========================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '💧';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span style="font-size: 1.2rem;">${icon}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function copyToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg, 'success');
    }).catch(() => {
        showToast('Could not copy automatically.', 'warning');
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Global scope bindings for inline onclicks
window.handleSetTiming = handleSetTiming;
window.handleUpdateDeliveryStatus = handleUpdateDeliveryStatus;
window.handleAdminVerify = handleAdminVerify;
window.showDomainModal = showDomainModal;
window.hideDomainModal = hideDomainModal;
