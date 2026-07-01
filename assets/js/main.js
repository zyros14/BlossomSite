// ===== Blossom SMP — shared behavior =====

// cursor glow
(function () {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;
    let raf = null;
    window.addEventListener('mousemove', (e) => {
        glow.style.opacity = '1';
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
    });
    window.addEventListener('mouseleave', () => glow.style.opacity = '0');
})();

// petals
(function createPetals() {
    const layer = document.getElementById('petals');
    if (!layer) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const count = window.innerWidth < 700 ? 10 : 20;
    const colors = ['#f3b6cb', '#e587a8', '#f5d0d9', '#d4b8a7', '#b5c9a8'];
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'petal';
        const size = 8 + Math.random() * 14;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (10 + Math.random() * 14) + 's, ' + (4 + Math.random() * 4) + 's';
        p.style.animationDelay = (Math.random() * -18) + 's, ' + (Math.random() * -4) + 's';
        p.style.opacity = 0.3 + Math.random() * 0.4;
        layer.appendChild(p);
    }
})();

// scroll reveal
const blossomSections = document.querySelectorAll('section');
const blossomObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            blossomObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
blossomSections.forEach(s => blossomObserver.observe(s));

function animateHero() {
    const heroCard = document.querySelector('.hero-card');
    if (!heroCard) return;
    requestAnimationFrame(() => heroCard.classList.add('ready'));
}

// mobile nav toggle
(function () {
    const btn = document.querySelector('.nav-toggle');
    const links = document.querySelector('nav .links');
    if (!btn || !links) return;
    btn.addEventListener('click', () => links.classList.toggle('open'));
})();

// copy IP (used on home + status pill areas)
function copyIP(text, boxId) {
    const box = document.getElementById(boxId);
    const finish = () => {
        const btn = box.querySelector('button');
        const original = btn.textContent;
        box.classList.add('copied');
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = original; box.classList.remove('copied'); }, 1800);
    };
    navigator.clipboard.writeText(text).then(finish).catch(() => {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
        finish();
    });
}

// live server status — used on home (full card) and other pages (status pill)
async function fetchServerStatus() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const motd = document.getElementById('motdDisplay');
    const refreshBtn = document.querySelector('.status-refresh');
    const pillDot = document.getElementById('pillDot');
    const pillText = document.getElementById('pillText');
    const badge = document.getElementById('statusBadge');
    const badgeText = document.getElementById('statusBadgeText');

    const setBadge = (state, label) => {
        if (badge) {
            badge.className = `status-badge ${state}`;
        }
        if (badgeText) {
            badgeText.textContent = label;
        }
    };

    if (dot) { dot.className = 'dot checking'; }
    if (text) text.textContent = 'Checking...';
    if (motd) motd.style.opacity = '0.4';
    setBadge('checking', 'Checking the breeze...');

    try {
        const res = await fetch('https://api.mcsrvstat.us/2/108.181.119.197:50002', { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error('API responded with ' + res.status);
        const data = await res.json();

        if (data.online) {
            if (dot) dot.className = 'dot online';
            if (text) text.textContent = 'Online';
            if (pillDot) pillDot.className = 'dot online';
            if (pillText) pillText.textContent = 'Server Online';
            setBadge('online', '🌸 Blooming now');
            if (motd) {
                let motdText = '✨ Welcome to Blossom SMP';
                if (data.motd && data.motd.clean && data.motd.clean.length > 0) motdText = data.motd.clean.join(' · ');
                else if (data.motd && data.motd.raw) motdText = data.motd.raw.join(' ').replace(/§[0-9a-z]/gi, '').trim() || motdText;
                motd.textContent = motdText;
            }
        } else {
            if (dot) dot.className = 'dot offline';
            if (text) text.textContent = 'Offline';
            if (pillDot) pillDot.className = 'dot offline';
            if (pillText) pillText.textContent = 'Server Offline';
            setBadge('offline', '🌿 Quiet for now');
            if (motd) motd.textContent = '⚠️ Server is currently unreachable. Try again later.';
        }
    } catch (error) {
        console.warn('Status fetch failed:', error);
        if (dot) dot.className = 'dot offline';
        if (text) text.textContent = 'Offline (no response)';
        if (pillDot) pillDot.className = 'dot offline';
        if (pillText) pillText.textContent = 'Status unavailable';
        setBadge('offline', '🌧️ Reconnecting...');
        if (motd) motd.textContent = '⚠️ Could not reach the status endpoint. Please refresh or check back later.';
    } finally {
        if (motd) motd.style.opacity = '1';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('statusDot') || document.getElementById('pillDot')) {
        fetchServerStatus();
        setInterval(fetchServerStatus, 60000);
    }
    animateHero();
});

// ===== Editable site content + changelog (powered by admin.html) =====
const BLOSSOM_CONTENT_KEY = 'blossom_content_v1';
const BLOSSOM_CHANGELOG_KEY = 'blossom_changelog_v1';

const defaultContent = {
    heroEyebrow: 'Java & Bedrock · 1.21.11',
    heroLine1: 'A slower kind of',
    heroLine2: 'survival.',
    heroSubtitle: 'Blossom SMP is a chill, community-built survival world — no pay-to-win, no crates, just a calm cherry-blossom map and a friendly playerbase.',
    aboutP1: 'Blossom SMP is a chill Minecraft survival server built for players who want a relaxed, community-focused experience without pay-to-win systems or overcomplicated mechanics. Set in a calm, cherry-blossom-inspired world, the server is designed around simple survival gameplay enhanced with quality-of-life features like Waystones, proximity voice chat, and land claims to keep things fair and fun.',
    aboutP2: "Whether you're building, exploring, or just hanging out with friends, Blossom SMP focuses on creativity, community, and a laid-back atmosphere where everyone can play at their own pace. No crates, no unfair advantages — just pure survival with a friendly playerbase.",
    statusTitle: 'Server Status',
    statusSubtitle: 'Live data pulled directly from the server — always up to date.',
    ctaTitle: 'Come hang out',
    ctaText: 'Join the Discord for updates, support, and to meet the community before you log on.',
    ctaButton: 'Join the Discord →'
};

const defaultChangelog = [
    { date: 'June 2026', title: 'Site rebuild + admin panel', body: 'Streamlined the site to Home, Rules, Gallery, and Changelog, with live server status and a staff admin panel for easy editing.' },
    { date: 'May 2026', title: 'TAB & tab-list overhaul', body: 'Cleaner, Stray-SMP-inspired tab list with compact stat display: ping, TPS, RAM, online/staff counts.' },
    { date: 'April 2026', title: 'Playtime plugin added', body: 'Playtime tracking introduced for future stat displays.' },
    { date: 'March 2026', title: 'Server launch', body: 'Blossom SMP opens with Waystones, proximity chat, and land claims on a fresh cherry-blossom map.' }
];

function getContent() {
    try {
        const raw = localStorage.getItem(BLOSSOM_CONTENT_KEY);
        if (!raw) return { ...defaultContent };
        return { ...defaultContent, ...JSON.parse(raw) };
    } catch { return { ...defaultContent }; }
}

function saveContent(content) {
    localStorage.setItem(BLOSSOM_CONTENT_KEY, JSON.stringify(content));
}

function getChangelog() {
    try {
        const raw = localStorage.getItem(BLOSSOM_CHANGELOG_KEY);
        if (!raw) return [...defaultChangelog];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length ? parsed : [...defaultChangelog];
    } catch { return [...defaultChangelog]; }
}

function saveChangelog(entries) {
    localStorage.setItem(BLOSSOM_CHANGELOG_KEY, JSON.stringify(entries));
}

async function fetchServerContent() {
    try {
        const res = await fetch('/content');
        if (!res.ok) throw new Error('no content');
        const body = await res.json();
        return { ...defaultContent, ...body };
    } catch (e) {
        return { ...defaultContent, ...getContent() };
    }
}

async function fetchServerChangelog() {
    try {
        const res = await fetch('/changelog');
        if (!res.ok) throw new Error('no changelog');
        const body = await res.json();
        if (Array.isArray(body) && body.length) return body;
        return getChangelog();
    } catch (e) {
        return getChangelog();
    }
}

// applies stored content overrides to index.html's editable elements
async function applyContentOverrides() {
    const c = await fetchServerContent();
    const map = {
        heroEyebrow: 'heroEyebrow',
        heroLine1: 'heroLine1',
        heroLine2: 'heroLine2',
        heroSubtitle: 'heroSubtitle',
        aboutP1: 'aboutP1',
        aboutP2: 'aboutP2',
        statusTitle: 'statusTitle',
        statusSubtitle: 'statusSubtitle',
        ctaTitle: 'ctaTitle',
        ctaText: 'ctaText',
        ctaButton: 'ctaButton'
    };
    Object.entries(map).forEach(([key, id]) => {
        const el = document.getElementById(id);
        if (el && c[key] !== undefined) el.textContent = c[key];
    });
}

// renders the changelog timeline into the given container id
async function renderChangelog(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const entries = await fetchServerChangelog();
    el.innerHTML = entries.map(e => `
        <div class="tl-item">
            <div class="tl-date">${escapeHtml(e.date)}</div>
            <h3>${escapeHtml(e.title)}</h3>
            <p>${escapeHtml(e.body)}</p>
        </div>
    `).join('');
    // re-trigger reveal animation if section already visible
    const section = el.closest('section');
    if (section && section.classList.contains('visible')) {
        el.querySelectorAll('.tl-item').forEach((item, i) => {
            item.style.animationDelay = (i * 0.08) + 's';
        });
    }
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
}

function getCookie(name) {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const cookie = cookies.find(c => c.startsWith(`${name}=`));
    return cookie ? cookie.slice(name.length + 1) : '';
}

function getPublicSessionFromCookie() {
    const raw = getCookie('blossom_discord_public');
    if (!raw) return null;

    try {
        const data = JSON.parse(decodeURIComponent(raw));
        if (!data || !data.username || Number(data.expiresAt || 0) <= Date.now()) return null;
        return { authorized: true, user: { username: data.username, avatarUrl: data.avatarUrl || null } };
    } catch (e) {
        return null;
    }
}

async function fetchSessionStatus() {
    try {
        const res = await fetch('/auth/session', { credentials: 'include' });
        if (res.ok) {
            const session = await res.json();
            if (session.authorized) return session;
        }
    } catch (e) {
        console.warn('Session endpoint failed', e);
    }

    return getPublicSessionFromCookie() || { authorized: false };
}

function clearPublicSessionCookie() {
    document.cookie = 'blossom_discord_public=; Path=/; Max-Age=0; SameSite=Lax; Secure';
}

async function logoutDiscord() {
    try {
        const res = await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
        if (!res.ok) throw new Error('Logout failed');
        clearPublicSessionCookie();
        return true;
    } catch (e) {
        console.warn('Logout failed', e);
        clearPublicSessionCookie();
        return false;
    }
}

function renderUserButtonContent(userButton, username, avatarUrl) {
    if (avatarUrl) {
        userButton.innerHTML = `<img class="user-avatar" src="${escapeHtml(avatarUrl)}" alt="" width="28" height="28"><span>${escapeHtml(`Hi, ${username}`)}</span>`;
    } else {
        userButton.textContent = `Hi, ${username}`;
    }
}

function updateUserMenu(session = { authorized: false }) {
    const userButton = document.getElementById('userButton');
    const userDropdown = document.getElementById('userDropdown');
    const adminLink = document.getElementById('nav-admin-link');
    if (userDropdown) userDropdown.classList.remove('open');
    if (!userButton) return;

    if (session.authorized && session.user && session.user.username) {
        renderUserButtonContent(userButton, session.user.username, session.user.avatarUrl);
        userButton.dataset.auth = 'true';
        userButton.classList.add('logged-in');
        userButton.classList.remove('discord-login');
        userButton.setAttribute('aria-expanded', 'false');
        if (adminLink) adminLink.style.display = 'inline-flex';
    } else {
        userButton.innerHTML = '<span class="user-button-icon">🎮</span><span>Log in with Discord</span>';
        userButton.dataset.auth = 'false';
        userButton.classList.remove('logged-in');
        userButton.classList.add('discord-login');
        userButton.removeAttribute('aria-expanded');
        if (adminLink) adminLink.style.display = 'none';
    }
}

function setupUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const userButton = document.getElementById('userButton');
    const userDropdown = document.getElementById('userDropdown');
    const logoutAction = document.getElementById('logoutAction');

    if (!userMenu || !userButton || !userDropdown) return;

    userButton.setAttribute('aria-haspopup', 'true');
    userButton.setAttribute('aria-controls', 'userDropdown');

    userButton.addEventListener('click', async (event) => {
        event.stopPropagation();
        const isAuth = userButton.dataset.auth === 'true';
        if (!isAuth) {
            window.location.href = '/auth/discord';
            return;
        }
        const opened = userDropdown.classList.toggle('open');
        userButton.setAttribute('aria-expanded', String(opened));
    });

    if (logoutAction) {
        logoutAction.addEventListener('click', async () => {
            const ok = await logoutDiscord();
            if (ok) {
                updateUserMenu({ authorized: false });
                if (userDropdown) {
                    userDropdown.classList.remove('open');
                    userButton.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    document.addEventListener('click', (event) => {
        if (!userMenu.contains(event.target)) {
            userDropdown.classList.remove('open');
            userButton.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && userDropdown.classList.contains('open')) {
            userDropdown.classList.remove('open');
            userButton.setAttribute('aria-expanded', 'false');
        }
    });
}

window.addEventListener('DOMContentLoaded', () => {
    (async () => {
        const session = await fetchSessionStatus();
        updateUserMenu(session);
        setupUserMenu();

        if (document.getElementById('heroEyebrow')) {
            await applyContentOverrides();
        }
        if (document.getElementById('changelog-timeline')) {
            await renderChangelog('changelog-timeline');
        }
    })();

    if (document.getElementById('statusDot') || document.getElementById('pillDot')) {
        fetchServerStatus();
        setInterval(fetchServerStatus, 60000);
    }

    animateHero();
});
