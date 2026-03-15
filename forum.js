// PatoxMC Forum System (npoint Edition)
let forumData = [];
let currentView = 'home';
let currentForumId = null;
let currentThreadId = null;
let currentSearch = '';
let currentSort = 'recent';

const forumStructure = {
    categories: [
        {
            id: 'official',
            title: 'Información Oficial',
            forums: [
                { id: 'announcements', title: 'Anuncios', description: 'Noticias y actualizaciones oficiales.', icon: 'megaphone' },
                { id: 'rules', title: 'Reglas & Políticas', description: 'Lectura obligatoria.', icon: 'scroll' }
            ]
        },
        {
            id: 'community_cat',
            title: 'Comunidad',
            forums: [
                { id: 'general', title: 'Discusión General', description: 'Habla de lo que quieras.', icon: 'message-square' },
                { id: 'comunidad', title: 'Comunidad', description: 'Sección libre para todos los usuarios.', icon: 'users' }
            ]
        }
    ]
};

// Initialization
async function initForum() {
    await refreshData();
    setInterval(refreshData, 10000);
}

async function refreshData() {
    const data = await DB_SYSTEM.load();
    forumData = data.forum || [];
    refreshCurrentView();
}

function refreshCurrentView() {
    if (currentView === 'home') renderHome();
    else if (currentView === 'forum') viewForum(currentForumId);
    else if (currentView === 'thread') viewThread(currentThreadId);
}

// Logic: Actions
async function createNewThread(forumId, title, content) {
    const author = getCurrentUser();
    if (!author) return openAuthModal();

    const isOfficial = forumStructure.categories[0].forums.find(f => f.id === forumId);
    const role = await getUserRole(author);
    if (isOfficial && role !== 'OWNER' && role !== 'ADMIN') {
        return alert('Solo el Staff puede publicar en esta sección.');
    }

    try {
        const data = await DB_SYSTEM.load();
        const newThread = {
            id: Date.now().toString(),
            forumId,
            title,
            author,
            date: Date.now(),
            posts: [{ author, content, date: Date.now() }]
        };

        if (!data.forum) data.forum = [];
        data.forum.unshift(newThread);

        await DB_SYSTEM.save(data);
        await refreshData();
    } catch (e) { console.error(e); }
}

async function addPost(threadId, content) {
    const author = getCurrentUser();
    if (!author) return openAuthModal();

    try {
        const data = await DB_SYSTEM.load();
        const threadIndex = data.forum.findIndex(t => t.id === threadId);
        if (threadIndex === -1) return;

        data.forum[threadIndex].posts.push({ author, content, date: Date.now() });

        await DB_SYSTEM.save(data);
        await refreshData();
    } catch (e) { console.error(e); }
}

async function deleteThread(threadId) {
    const user = getCurrentUser();
    const role = await getUserRole(user);
    const thread = forumData.find(t => t.id === threadId);

    if (role === 'ADMIN' || role === 'OWNER' || (thread && thread.author === user)) {
        if (confirm('¿Eliminar este tema completo?')) {
            const data = await DB_SYSTEM.load();
            data.forum = data.forum.filter(t => t.id !== threadId);
            await DB_SYSTEM.save(data);
            await refreshData();
            renderHome();
        }
    } else {
        alert('No tienes permiso para borrar este tema.');
    }
}

async function deletePost(threadId, postIndex) {
    const user = getCurrentUser();
    const role = await getUserRole(user);
    const thread = forumData.find(t => t.id === threadId);
    const post = thread?.posts[postIndex];

    if (role === 'ADMIN' || role === 'OWNER' || (post && post.author === user)) {
        if (confirm('¿Eliminar este mensaje?')) {
            const data = await DB_SYSTEM.load();
            const tIndex = data.forum.findIndex(t => t.id === threadId);
            if (tIndex !== -1) {
                if (postIndex === 0) {
                    data.forum.splice(tIndex, 1);
                    renderHome();
                } else {
                    data.forum[tIndex].posts.splice(postIndex, 1);
                }
                await DB_SYSTEM.save(data);
                await refreshData();
            }
        }
    }
}

// Rendering Logic
function renderHome() {
    currentView = 'home';
    const container = document.getElementById('forum-content');
    if (!container) return;
    let html = '';

    forumStructure.categories.forEach(cat => {
        html += `
            <div class="forum-category animate-fade-in">
                <div class="category-title">${cat.title}</div>
                <table class="forum-list">
                    <thead>
                        <tr>
                            <th style="width: 50px;"></th>
                            <th>Foro</th>
                            <th style="width: 100px; text-align: center;">Temas</th>
                            <th style="width: 250px;">Último Post</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        cat.forums.forEach(forum => {
            const threads = forumData.filter(t => t.forumId === forum.id);
            const lastThread = threads[0];
            html += `
                <tr class="forum-row" onclick="viewForum('${forum.id}')" style="cursor: pointer;">
                    <td style="text-align: center;"><i data-lucide="${forum.icon}" class="forum-icon"></i></td>
                    <td class="forum-info">
                        <h4>${forum.title}</h4>
                        <p>${forum.description}</p>
                    </td>
                    <td style="text-align: center; color: hsl(var(--text-muted));">${threads.length}</td>
                    <td>
                        ${lastThread ? `
                            <div style="font-size: 0.9rem; font-weight: 600; color: hsl(var(--primary));">${lastThread.title}</div>
                            <div style="font-size: 0.8rem; color: hsl(var(--text-muted));">por ${getDisplayName(lastThread.author)} • ${formatDate(lastThread.date)}</div>
                        ` : '<span style="color: hsl(var(--text-muted));">Sin temas</span>'}
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
    updateBreadcrumbs('Inicio > Foro');
    const btn = document.getElementById('new-thread-btn');
    if (btn) btn.style.display = 'none';

    if (window.lucide) lucide.createIcons();
    if (window.revealObserver) {
        container.querySelectorAll('.animate-fade-in').forEach(el => window.revealObserver.observe(el));
    }
}

async function viewForum(forumId) {
    currentView = 'forum';
    currentForumId = forumId;
    const container = document.getElementById('forum-content');
    let selectedForum = null;
    forumStructure.categories.forEach(cat => {
        const found = cat.forums.find(f => f.id === forumId);
        if (found) selectedForum = found;
    });
    if (!selectedForum) return;

    let threads = forumData.filter(t => t.forumId === forumId);

    if (currentSort === 'recent') threads.sort((a, b) => b.date - a.date);
    else if (currentSort === 'famous') threads.sort((a, b) => (b.posts?.length || 0) - (a.posts?.length || 0));

    if (currentSearch) {
        threads = threads.filter(t => t.title.toLowerCase().includes(currentSearch.toLowerCase()));
    }

    let controls = `
        <div class="forum-controls" style="display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; background: hsla(var(--bg-card), 0.5); padding: 1rem; border-radius: 8px; border: 1px solid hsla(255,255,255,0.05);">
            <div style="flex: 1; display: flex; align-items: center; background: rgba(0,0,0,0.2); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); padding: 0.5rem;">
                <i data-lucide="search" style="width: 18px; color: hsl(var(--text-muted)); margin-right: 0.5rem;"></i>
                <input type="text" placeholder="Buscar por tema..." value="${currentSearch}" oninput="updateSearch(this.value)" 
                    style="background: transparent; border: none; color: white; width: 100%; outline: none;">
            </div>
            <select onchange="updateSort(this.value)" style="background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 0.5rem; border-radius: 6px; outline: none; cursor: pointer;">
                <option value="recent" ${currentSort === 'recent' ? 'selected' : ''}>Más Recientes</option>
                <option value="famous" ${currentSort === 'famous' ? 'selected' : ''}>Más Famosos</option>
            </select>
        </div>
    `;

    let html = `
        <div class="forum-category animate-fade-in">
            <div class="category-title">${selectedForum.title}</div>
            ${controls}
            <table class="forum-list">
                <thead>
                    <tr>
                        <th style="width: 50%;">Tema</th>
                        <th style="width: 20%;">Autor</th>
                        <th style="width: 10%; text-align: center;">Respuestas</th>
                        <th style="width: 20%; text-align: right;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (threads.length === 0) {
        html += `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: hsl(var(--text-muted));">No se encontraron temas.</td></tr>`;
    } else {
        const user = getCurrentUser();
        const role = await getUserRole(user);
        threads.forEach(thread => {
            let deleteBtn = '';
            if (role === 'OWNER' || role === 'ADMIN' || thread.author === user) {
                deleteBtn = `<button onclick="event.stopPropagation(); deleteThread('${thread.id}')" style="background: none; border: none; color: #ff5555; cursor: pointer; float: right;" title="Eliminar Tema"><i data-lucide="trash-2" style="width: 16px;"></i></button>`;
            }
            html += `
                <tr class="forum-row" onclick="viewThread('${thread.id}')" style="cursor: pointer;">
                    <td style="font-weight: 600;">${thread.title} ${deleteBtn}</td>
                    <td>${getDisplayName(thread.author)}</td>
                    <td style="text-align: center;">${(thread.posts?.length || 1) - 1}</td>
                    <td style="text-align: right; color: hsl(var(--text-muted));">${formatDate(thread.date)}</td>
                </tr>
            `;
        });
    }

    html += `</tbody></table></div>`;
    container.innerHTML = html;
    updateBreadcrumbs(`<a href="#" onclick="renderHome(); return false;">Inicio</a> > ${selectedForum.title}`);

    const btn = document.getElementById('new-thread-btn');
    if (btn) {
        btn.style.display = 'inline-flex';
        btn.onclick = () => openNewThreadModal();
    }
    if (window.lucide) lucide.createIcons();
    if (window.revealObserver) {
        container.querySelectorAll('.animate-fade-in, .forum-row').forEach(el => window.revealObserver.observe(el));
    }
}

async function viewThread(threadId) {
    currentView = 'thread';
    currentThreadId = threadId;
    const thread = forumData.find(t => t.id === threadId);
    if (!thread) return renderHome();

    const container = document.getElementById('forum-content');
    const user = getCurrentUser();
    const role = await getUserRole(user);

    let html = `<div class="thread-view animate-fade-in">`;
    thread.posts?.forEach((post, index) => {
        let deleteBtn = '';
        if (role === 'OWNER' || role === 'ADMIN' || post.author === user) {
            deleteBtn = `<button onclick="deletePost('${threadId}', ${index})" style="background: none; border: none; color: #ff5555; cursor: pointer;" title="Eliminar Mensaje"><i data-lucide="x" style="width: 14px;"></i></button>`;
        }

        html += `
            <div class="forum-post" style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.05);">
                <div class="post-meta" style="display: flex; justify-content: space-between; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="https://mc-heads.net/avatar/${post.author}/100" style="width: 40px; height: 40px; border-radius: 6px;">
                        <div style="font-weight: 700; color: hsl(var(--primary));">${getDisplayName(post.author)}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${deleteBtn}
                        <span style="font-size: 0.8rem; color: hsl(var(--text-muted));">#${index + 1} • ${formatDate(post.date)}</span>
                    </div>
                </div>
                <div style="line-height: 1.6; padding-left: 3.5rem;">${post.content}</div>
            </div>
        `;
    });

    if (user) {
        html += `
            <div style="margin-top: 2rem;">
                <h3>Responder</h3>
                <textarea id="reply-content" style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 1rem; border-radius: 8px; min-height: 100px; margin-top: 0.5rem; outline: none;" placeholder="Escribe tu respuesta..."></textarea>
                <button class="btn btn-primary" style="margin-top: 1rem;" onclick="handleReply('${threadId}')">Publicar Respuesta</button>
            </div>
        `;
    } else {
        html += `<div style="text-align: center; color: hsl(var(--text-muted)); padding: 2rem;">Debes estar conectado para responder.</div>`;
    }
    html += `</div>`;

    container.innerHTML = html;
    updateBreadcrumbs(`<a href="#" onclick="renderHome(); return false;">Inicio</a> > Hilo`);
    const btn = document.getElementById('new-thread-btn');
    if (btn) btn.style.display = 'none';
    if (window.lucide) lucide.createIcons();
    if (window.revealObserver) {
        container.querySelectorAll('.animate-fade-in, .forum-post').forEach(el => window.revealObserver.observe(el));
    }
}

// Helpers
function updateSearch(val) { currentSearch = val; viewForum(currentForumId); }
function updateSort(val) { currentSort = val; viewForum(currentForumId); }
async function handleReply(id) {
    const textarea = document.getElementById('reply-content');
    if (textarea.value.trim()) {
        await addPost(id, textarea.value.trim());
        textarea.value = '';
    }
}
function updateBreadcrumbs(html) { document.getElementById('breadcrumbs').innerHTML = html; }
function formatDate(t) {
    const d = new Date(t);
    const diff = (new Date() - d) / 1000;
    if (diff < 60) return 'hace poco';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString();
}
function openNewThreadModal() { if (!getCurrentUser()) return openAuthModal(); document.getElementById('thread-modal').classList.add('open'); }
function closeNewThreadModal() { document.getElementById('thread-modal').classList.remove('open'); }
async function handleSubmitThread() {
    const title = document.getElementById('new-thread-title').value.trim();
    const content = document.getElementById('new-thread-content').value.trim();
    if (!title || !content) return alert('Campos vacíos');
    await createNewThread(currentForumId, title, content);
    closeNewThreadModal();
}

document.addEventListener('DOMContentLoaded', initForum);
