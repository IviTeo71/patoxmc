// PatoxMC Auth System (Simple npoint Edition)
const OWNER_USERNAME = 'PATOMURCIANO';

// State Management
let currentUser = null;

// Initialization
async function initAuth() {
    injectAuthModal();

    // Simular persistencia con localStorage para que no se cierre sesión al refrescar
    const savedUser = localStorage.getItem('patox_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
    }

    updateAuthUI();
}

// Logic: Register
async function register(username, password) {
    const data = await DB_SYSTEM.load();

    // Verificar si el usuario ya existe
    if (data.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, message: 'El usuario ya existe.' };
    }

    const newUser = {
        username: username,
        password: password, // En un entorno real esto debería estar hasheado
        role: username.toUpperCase() === OWNER_USERNAME ? 'OWNER' : 'USER',
        joined: Date.now()
    };

    data.users.push(newUser);
    const saved = await DB_SYSTEM.save(data);

    if (saved) {
        currentUser = newUser;
        localStorage.setItem('patox_user', JSON.stringify(newUser));
        updateAuthUI();
        return { success: true };
    } else {
        return { success: false, message: 'Error al conectar con la base de datos.' };
    }
}

// Logic: Login
async function login(username, password) {
    const data = await DB_SYSTEM.load();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('patox_user', JSON.stringify(user));
        updateAuthUI();
        return { success: true };
    } else {
        return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }
}

// Logic: Logout
function logout() {
    currentUser = null;
    localStorage.removeItem('patox_user');
    window.location.reload();
}

// Roles Management
async function getAdmins() {
    const data = await DB_SYSTEM.load();
    return data.settings?.admins || [];
}

async function getUserRole(username) {
    if (!username) return 'GUEST';
    if (username.toUpperCase() === OWNER_USERNAME) return 'OWNER';

    const admins = await getAdmins();
    if (admins.map(a => a.toLowerCase()).includes(username.toLowerCase())) return 'ADMIN';

    return 'USER';
}

function getUserRoleSync(username) {
    if (!username) return 'GUEST';
    if (username.toUpperCase() === OWNER_USERNAME) return 'OWNER';

    // Para el UI rápido, usamos el rol que tenga el usuario actual si coincide
    if (currentUser && currentUser.username === username) {
        return currentUser.role || 'USER';
    }
    return 'USER';
}

// UI Helpers
function getDisplayName(username) {
    const role = getUserRoleSync(username);
    if (role === 'OWNER') return `<span style="color: #ff5555; font-weight: bold; margin-right: 5px;">[OWNER]</span>${username}`;
    if (role === 'ADMIN') return `<span style="color: #C71585; font-weight: bold; margin-right: 5px;">[Admin]</span>${username}`;
    return username;
}

function getCurrentUser() {
    return currentUser ? currentUser.username : null;
}

// Navbar UI
async function updateAuthUI() {
    const container = document.getElementById('auth-section');
    if (!container) return;

    if (currentUser) {
        const username = currentUser.username;
        const role = await getUserRole(username);

        let adminControls = '';
        if (role === 'OWNER') {
            adminControls = `
                <button onclick="openAdminPanel()" title="Gestionar Admins" style="background: rgba(255, 85, 85, 0.2); border: 1px solid rgba(255, 85, 85, 0.5); color: #ff5555; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; margin-right: 10px;">
                    <i data-lucide="shield-alert" style="width: 16px;"></i>
                </button>
            `;
        }

        container.innerHTML = `
            <div class="user-profile" style="display: flex; align-items: center; gap: 10px; margin-left: 20px;">
                ${adminControls}
                <div style="text-align: right;">
                    <div style="font-weight: 600; font-size: 0.9rem;">${getDisplayName(username)}</div>
                    <a href="#" onclick="logout()" style="font-size: 0.8rem; color: hsl(var(--text-muted)); text-decoration: none;">Cerrar Sesión</a>
                </div>
                <img src="https://mc-heads.net/avatar/${username}/100" alt="Avatar" style="width: 35px; height: 35px; border-radius: 8px; border: 1px solid hsla(var(--primary), 0.5);">
            </div>
        `;
    } else {
        container.innerHTML = `
            <button class="btn btn-secondary" onclick="openAuthModal()" style="padding: 0.5rem 1rem; margin-left: 1rem; font-size: 0.9rem;">
                <i data-lucide="log-in" style="width: 16px;"></i> Entrar
            </button>
        `;
    }
    if (window.lucide) lucide.createIcons();
}

// Admin Panel Logic
async function openAdminPanel() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('open');
    renderAdminList();
}

async function renderAdminList() {
    const listDiv = document.getElementById('admin-list-content');
    const admins = await getAdmins();

    if (admins.length === 0) {
        listDiv.innerHTML = '<div style="color: hsl(var(--text-muted));">No hay admins extra.</div>';
        return;
    }

    let html = '';
    admins.forEach(admin => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 0.5rem 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
                <span style="font-weight: 600; color: #C71585;">${admin}</span>
                <button onclick="handleRemoveAdmin('${admin}')" style="background: none; border: none; color: #ff5555; cursor: pointer; padding: 0;"><i data-lucide="x" style="width: 16px;"></i></button>
            </div>
        `;
    });
    listDiv.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

async function handleAddAdmin() {
    const input = document.getElementById('new-admin-input');
    const name = input.value.trim();
    if (!name) return;

    const data = await DB_SYSTEM.load();
    if (!data.settings) data.settings = { admins: [] };

    if (!data.settings.admins.map(u => u.toLowerCase()).includes(name.toLowerCase())) {
        data.settings.admins.push(name);
        await DB_SYSTEM.save(data);
        input.value = '';
        renderAdminList();
    }
}

async function handleRemoveAdmin(name) {
    if (!confirm(`¿Quitar rango Admin a ${name}?`)) return;
    const data = await DB_SYSTEM.load();
    data.settings.admins = data.settings.admins.filter(u => u.toLowerCase() !== name.toLowerCase());
    await DB_SYSTEM.save(data);
    renderAdminList();
}

// Modal Setup
function injectAuthModal() {
    if (document.getElementById('auth-modal')) return;

    const authModalHTML = `
    <div class="modal-overlay" id="auth-modal">
        <div class="modal-content" style="max-width: 400px; text-align: center;">
            <button class="close-modal" onclick="closeAuthModal()">
                <i data-lucide="x"></i>
            </button>
            <h2 style="margin-bottom: 1.5rem;" id="auth-title">Iniciar Sesión</h2>
            <div id="auth-error" style="background: rgba(255, 85, 85, 0.2); color: #ff5555; padding: 0.5rem; border-radius: 4px; margin-bottom: 1rem; display: none; font-size: 0.9rem;"></div>
            <input type="text" id="auth-user" placeholder="Usuario de Minecraft" style="width: 100%; margin-bottom: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;">
            <input type="password" id="auth-pass" placeholder="Contraseña" style="width: 100%; margin-bottom: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;">
            <input type="password" id="auth-pass-confirm" placeholder="Confirmar Contraseña" style="width: 100%; margin-bottom: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px; display: none;">
            <button class="btn btn-primary" onclick="submitAuth()" style="width: 100%; justify-content: center;">Continuar</button>
            <div style="margin-top: 1rem; font-size: 0.9rem; color: hsl(var(--text-muted));">
                <span id="auth-toggle-text">¿No tienes cuenta?</span> 
                <a href="#" onclick="toggleAuthMode()" style="color: hsl(var(--primary)); text-decoration: none; font-weight: 600;" id="auth-toggle-btn">Regístrate</a>
            </div>
        </div>
    </div>
    `;

    const adminModalHTML = `
    <div class="modal-overlay" id="admin-modal">
        <div class="modal-content" style="max-width: 500px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="color: #ff5555; display: flex; align-items: center; gap: 10px;"><i data-lucide="shield-alert"></i> Gestión de Admins</h2>
                <button onclick="closeAdminPanel()" style="background: none; border: none; color: white; cursor: pointer;"><i data-lucide="x"></i></button>
            </div>
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-bottom: 0.5rem; color: hsl(var(--text-muted));">Añadir Administrador</h4>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="new-admin-input" placeholder="Nombre exacto del usuario" style="flex: 1; padding: 0.8rem; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 6px;">
                    <button class="btn btn-primary" onclick="handleAddAdmin()">Añadir</button>
                </div>
            </div>
            <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                <h4 style="margin-bottom: 1rem; color: hsl(var(--text-muted));">Admins Actuales</h4>
                <div id="admin-list-content" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', authModalHTML + adminModalHTML);
    if (window.lucide) lucide.createIcons();
}

let isLoginMode = true;

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('open');
    isLoginMode = true;
    updateModalState();
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
}

function closeAdminPanel() {
    document.getElementById('admin-modal').classList.remove('open');
}

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    updateModalState();
}

function updateModalState() {
    const title = document.getElementById('auth-title');
    const toggleText = document.getElementById('auth-toggle-text');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const confirmInput = document.getElementById('auth-pass-confirm');
    if (isLoginMode) {
        if (title) title.innerText = 'Iniciar Sesión';
        if (toggleText) toggleText.innerText = '¿No tienes cuenta?';
        if (toggleBtn) toggleBtn.innerText = 'Regístrate';
        if (confirmInput) confirmInput.style.display = 'none';
    } else {
        if (title) title.innerText = 'Registrarse';
        if (toggleText) toggleText.innerText = '¿Ya tienes cuenta?';
        if (toggleBtn) toggleBtn.innerText = 'Inicia Sesión';
        if (confirmInput) confirmInput.style.display = 'block';
    }
}

async function submitAuth() {
    const user = document.getElementById('auth-user').value.trim();
    const pass = document.getElementById('auth-pass').value.trim();
    const errorDiv = document.getElementById('auth-error');

    if (!user || !pass) {
        errorDiv.innerText = 'Rellena todos los campos';
        errorDiv.style.display = 'block';
        return;
    }

    let result;
    if (isLoginMode) {
        result = await login(user, pass);
    } else {
        const passConfirm = document.getElementById('auth-pass-confirm').value.trim();
        if (pass !== passConfirm) {
            errorDiv.innerText = 'Las contraseñas no coinciden';
            errorDiv.style.display = 'block';
            return;
        }
        result = await register(user, pass);
    }

    if (result.success) {
        closeAuthModal();
    } else {
        errorDiv.innerText = result.message;
        errorDiv.style.display = 'block';
    }
}

// Auto-init
document.addEventListener('DOMContentLoaded', initAuth);
