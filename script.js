// --- FIX HEADER, MÚSICA Y SCROLL ---
document.addEventListener("DOMContentLoaded", () => {
  // Mostrar nombre en header
  const username = localStorage.getItem('username') || 'Player';
  const headerUsername = document.getElementById('header-username');
  if (headerUsername) headerUsername.textContent = username;

  // Música de fondo en title screen
  const bgMusic = document.getElementById('bg-music');
  const titleMusic = document.getElementById('title-music');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.getElementById('title-screen').classList.contains('active')) {
      if (bgMusic) bgMusic.pause();
      if (titleMusic) titleMusic.play();
    }
  });

  // Scroll en comunidad

    /* --- BAN WATCHER: comprueba periódicamente si hay usuarios baneados --- */
    (function(){
      const BAN_POLL_INTERVAL = 10 * 1000; // 10 segundos, comprobación más frecuente
      console.log('[ban-check] watcher initializing');

      // Removed in-page visible debug panel to keep the UI clean; use console logs instead.

      // Request notification permission early (best-effort)
      try{ if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(p => console.log('[ban-check] Notification permission: '+p)).catch(()=>{}); }catch(e){}
      const STORAGE_KEY = 'astralx_banned_state_v1';

      function loadState(){
        try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }catch(e){ return {} }
      }
      function saveState(obj){
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }catch(e){}
      }

      function ensureAudio(){
        let a = document.getElementById('ban-audio');
        if(!a){
          a = document.createElement('audio');
          a.id = 'ban-audio';
          a.src = 'ban.mp3';
          a.preload = 'auto';
          document.body.appendChild(a);
        }
        return a;
      }

      function showBanToast(user, isOwnBan){
        let cont = document.getElementById('ban-toast-container');
        if(!cont){
          cont = document.createElement('div');
          cont.id = 'ban-toast-container';
          cont.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:200000;display:flex;flex-direction:column;gap:10px;align-items:flex-start;';
          document.body.appendChild(cont);
        }
        const el = document.createElement('div');
        el.style.cssText = 'background:rgba(20,6,6,0.98);border:1px solid rgba(255,0,0,0.12);color:#ff4d4d;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.6);font-weight:700;font-size:0.95rem;';

        // Determinar número de jugador (preferir campos numéricos / campos explícitos)
        let playerNumber = null;
        const idField = user && user.id;
        if (typeof idField === 'number') playerNumber = idField;
        // campos alternativos comunes
        const altNumFields = ['numero','numeroJugador','playerNumber','player_id','id_num'];
        for (const k of altNumFields){ if (!playerNumber && user && user[k]) playerNumber = user[k]; }
        if (!playerNumber){
          // intentar extraer dígitos del id o nombre
          const s = String(idField || user && (user.nombre || user.name || user.username) || '');
          const m = s.match(/\d+/);
          if (m) playerNumber = m[0];
        }
        if (!playerNumber) playerNumber = 'N/A';

        // Construir nombre y datos adicionales
        const nameParts = [];
        if (user){
          if (user.nombre) nameParts.push(user.nombre);
          if (user.apellido) nameParts.push(user.apellido);
          if (user.name && !user.nombre) nameParts.push(user.name);
          if (user.username && !user.nombre && !user.name) nameParts.push(user.username);
        }
        let displayName = nameParts.join(' ').trim();
        // Si no hay nombre, usar idField cuando no sea puramente numérico
        if (!displayName){
          if (typeof idField === 'string' && !/^\d+$/.test(idField)) displayName = idField;
          else displayName = '';
        }

        // Evitar duplicar número dentro del nombre (por si idField contenía ya el número)
        if (displayName){
          displayName = displayName.replace(/^#?\s*\d+\s*-?\s*/,'');
        }

        // Texto final: "Jugador #{Numero} {id} {nombre} eliminado"
        const idText = (typeof idField !== 'undefined' && idField !== null) ? String(idField) : '';
        const nameText = displayName ? (' ' + displayName) : '';
        el.textContent = `Jugador #${playerNumber} ${idText}${nameText} eliminado`;
        cont.appendChild(el);

        // Seleccionar audio según si el jugador baneado eres TÚ (usuario actual)
        const audio = ensureAudio();
        try{
          const me = getCurrentUserId();
          const isYouBanned = (me !== null && typeof user !== 'undefined' && String(me) === String(user.id));
          if (isYouBanned) audio.src = 'baneadotu.mp3'; else audio.src = 'ban.mp3';
          audio.currentTime = 0;
          audio.play().catch(()=>{});
        }catch(e){}

        // También generar una notificación del navegador si está permitida
        try{
          if ('Notification' in window && Notification.permission === 'granted'){
            const title = 'Jugador eliminado';
            const body = `Jugador #${playerNumber} ${idText}${nameText} eliminado`;
            new Notification(title, { body });
            try{ console.log('[ban-check] notification shown: '+body); }catch(e){}
          }
        }catch(e){ console.warn('[ban-check] notification failed', e); }

        // Si EL JUGADOR QUE FUE BANEADO eres TÚ, mostrar gif central (ban.gif)
        if (typeof user !== 'undefined'){
          const me = getCurrentUserId();
          const isYouBanned = (me !== null && String(me) === String(user.id));
          if (isYouBanned){
            try{
              let ov = document.getElementById('ban-gif-overlay');
              if (!ov){
                ov = document.createElement('div');
                ov.id = 'ban-gif-overlay';
                ov.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);z-index:300000;';
                const img = document.createElement('img');
                img.src = 'ban.gif';
                img.alt = 'Baneo';
                img.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.6);';
                ov.appendChild(img);
                document.body.appendChild(ov);
                // eliminar después de 6s
                setTimeout(()=>{ try{ ov.remove(); }catch(e){} }, 6000);
              }
                // Recargar la página automáticamente después de mostrar la animación
                try{
                  setTimeout(()=>{
                    try{ console.log('[ban-check] you were banned — reloading page'); }catch(e){}
                    try{ location.reload(); }catch(e){}
                  }, 4000);
                }catch(e){ console.error('[ban-check] failed to schedule reload', e); }
            }catch(e){ console.error('Error showing ban gif', e); }
          }
        }

        // Auto-eliminar después de 8s con transición
        setTimeout(()=>{
          try{
            el.style.transition = 'opacity .35s, transform .35s';
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            setTimeout(()=>{ el.remove(); }, 380);
          }catch(e){}
        }, 8000);
      }

      async function fetchBannedAndNotify(){
        try{
          console.log('[ban-check] starting fetchBannedAndNotify');
          try{ console.log('[ban-check] starting fetchBannedAndNotify'); }catch(e){}
          const res = await fetch(`${API}/usuarios`);
          if(!res.ok){
            console.warn('[ban-check] fetch returned non-ok', res.status);
            return;
          }
          const users = await res.json();
          console.log('[ban-check] fetched users count=', Array.isArray(users)?users.length:typeof users, users && users.slice?users.slice(0,3):undefined);
          try{ console.log('[ban-check] fetched users count= '+(Array.isArray(users)?users.length:String(typeof users))); }catch(e){}
          if(!Array.isArray(users)) return;
          const state = loadState();
          let changed = false;

          for(const u of users){
            if(!u || typeof u.id === 'undefined') continue;
            const isBanned = (u.baneado === true || u.baneado === 'true' || u.baneado == 1);
            const prev = state[u.id] && state[u.id].banned === true;

              if(isBanned && !prev){
                // transición: no estaba baneado (o desconocido) -> ahora baneado
                // detectar si el baneo fue realizado por el usuario actual
                const me = getCurrentUserId();
                const banActorFields = ['baneado_por','baneado_por_id','ban_by','banned_by','ban_by_id','ban_actor','baneador'];
                let banActor = null;
                for (const k of banActorFields){ if (!banActor && (u[k] || u[k] === 0)) banActor = u[k]; }
                const isOwnBan = (banActor && String(banActor) === String(me));
                showBanToast(u, !!isOwnBan);
                state[u.id] = { banned: true, lastNotified: Date.now(), bannedBy: banActor };
                changed = true;
              } else if(!isBanned && prev){
              // transición: estaba baneado -> ahora desbaneado, actualizar para permitir re-notificar en el futuro
              state[u.id] = { banned: false };
              changed = true;
            } else {
              // mantener o inicializar estado
              if(!state[u.id]) state[u.id] = { banned: !!isBanned };
            }
          }

          if(changed) saveState(state);
        }catch(e){
          console.error('[ban-check] Error checking banned users', e);
        }
      }

      // Exponer trigger manual para probar desde la consola: `window.triggerBanCheck()`
      try{ window.triggerBanCheck = fetchBannedAndNotify; }catch(e){}
      // Exponer helper de test para mostrar notificación manualmente
      try{ window.testShowBan = function(user, isOwn){ try{ fetchBannedAndNotify(); /* keep behavior consistent */ }catch(e){}; try{ showBanToast(user, !!isOwn); }catch(e){ console.error(e); } }; }catch(e){}

      document.addEventListener('DOMContentLoaded', ()=>{
        // comprobación inicial inmediata y luego intervalo
        fetchBannedAndNotify();
        setInterval(fetchBannedAndNotify, BAN_POLL_INTERVAL);
        // Forzar comprobación cada 5s usando trigger (user requested frequent checks)
        try{
          console.log('[ban-check] setting trigger interval every 5s');
          setInterval(() => {
            try{
              if (typeof window.triggerBanCheck === 'function') window.triggerBanCheck();
              else fetchBannedAndNotify();
            }catch(e){ console.error('[ban-check] trigger interval error', e); }
          }, 5000);
        }catch(e){ console.error('[ban-check] could not set trigger interval', e); }
      });
    })();
  const communityList = document.querySelector('.community-users-list');
  if (communityList) {
    communityList.style.overflowY = 'auto';
    communityList.style.maxHeight = '60vh';
  }
});
// Renderiza la sección de comunidad (usuarios)

// Wire setup/register tabs (CREAR CUENTA / YA TENGO CUENTA)
document.addEventListener('DOMContentLoaded', () => {
  try {
    const tabs = document.querySelectorAll('.setup-tabs .tab-btn');
    if (!tabs || !tabs.length) return;
    const setupForm = document.getElementById('setup-form');
    const loginForm = document.getElementById('login-form');
    const setupTitle = document.getElementById('setup-title');
    const setupSubtitle = document.getElementById('setup-subtitle');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabName = tab.dataset.tab;
        if (tabName === 'login') {
          if (setupForm) setupForm.classList.add('hidden');
          if (loginForm) loginForm.classList.remove('hidden');
          if (setupTitle) setupTitle.textContent = 'INICIAR SESIÓN';
          if (setupSubtitle) setupSubtitle.textContent = 'Accede con tu cuenta';
          setTimeout(() => { const f = document.getElementById('login-id'); if (f) f.focus(); }, 40);
        } else {
          if (loginForm) loginForm.classList.add('hidden');
          if (setupForm) setupForm.classList.remove('hidden');
          if (setupTitle) setupTitle.textContent = 'CONFIGURACIÓN INICIAL';
          if (setupSubtitle) setupSubtitle.textContent = 'Crea tu identidad en AstralX';
          setTimeout(() => { const f = document.getElementById('setup-id'); if (f) f.focus(); }, 40);
        }
      });
    });
  } catch (e) {
    console.error('Error wiring setup tabs', e);
  }
});

// --- COMUNIDAD: SISTEMA DE USUARIOS Y AMIGOS (importado de basevieja.js) ---
const API = "https://astral-ban-api.onrender.com"

async function fetchAllUsers() {
  try {
    const res = await fetch(`${API}/usuarios`)
    if (!res.ok) throw new Error("Error al obtener usuarios")
    return await res.json()
  } catch (e) {
    console.error("[AstralX] Error fetching users:", e)
    return []
  }
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("astralUser") || "{}")
    return user.id || null
  } catch (e) {
    return null
  }
}

async function renderCommunity(users) {
    const list = document.querySelector('.community-users-list');
    const loading = document.querySelector('.community-loading');
    const empty = document.querySelector('.community-empty');
    const error = document.querySelector('.community-error');
    if (!list) return;
    list.innerHTML = '';
    if (!users) {
        error.style.display = 'block';
        loading.style.display = empty.style.display = 'none';
        return;
    }
    if (users.length === 0) {
        empty.style.display = 'block';
        loading.style.display = error.style.display = 'none';
        return;
    }
    loading.style.display = error.style.display = empty.style.display = 'none';
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'community-user-card';
        card.innerHTML = `
          <div class="community-user-avatar">
            <img src="${user.avatar || 'logo.png'}" alt="Avatar" class="community-user-img" />
          </div>
          <div class="community-user-info">
            <span class="community-user-name">${user.nombre || user.id}</span>
            <span class="community-user-id">${user.id}</span>
          </div>
          <div style="margin-top:8px;text-align:center;">
            <button class="background-button profile-view-btn" onclick="openUserProfileModal('${user.id}')">Ver perfil</button>
          </div>
        `;
        list.appendChild(card);
    });
}

// --- PERFIL COMPLETO (MODAL): Mostrar relaciones sociales ---
window.openUserProfileModal = async (userId) => {
  const modal = document.getElementById("userProfileModal")
  const content = document.getElementById("userProfileModalContent")

  if (!modal || !content) {
    console.error("[AstralX] User profile modal elements not found")
    return
  }

  content.innerHTML = '<div style="text-align:center;padding:2em 0;">Cargando perfil...</div>'
  modal.style.display = "flex"

  try {
    // Trae los datos del usuario desde la API
    const resUser = await fetch(`${API}/usuarios/${userId}`)
    const user = await resUser.json()

    // Trae las relaciones aceptadas de ese usuario
    let relacionesHtml = ""
    try {
      const resRel = await fetch(`${API}/relaciones/${userId}`)
      const relaciones = await resRel.json()
      relaciones.forEach((rel) => {
        if (rel.estado !== "aceptada") return
        const otro = rel.de === userId ? rel.para : rel.de
        let frase = ""
        if (rel.tipo === "romantica") frase = `En una relación romántica con <b>@${otro}</b>`
        if (rel.tipo === "mejor_amigo") frase = `Mejor amigo de <b>@${otro}</b>`
        if (rel.tipo === "hermano") frase = `Hermano/a de <b>@${otro}</b>`
        if (rel.tipo === "enemigo") frase = `Enemigo jurado de <b>@${otro}</b>`
        if (rel.tipo === "compañero") frase = `Compañero de aventuras de <b>@${otro}</b>`
        relacionesHtml += `<div style="margin-bottom:0.3em;font-size:1em;opacity:0.85;">${frase}</div>`
      })
    } catch (e) {
      console.error("[AstralX] Error fetching user relations:", e)
    }

    // Renderiza el perfil completo
    content.innerHTML = `
            <div class="profile-modal-avatar" style="text-align:center;margin-bottom:1.2em;">
                ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:4px solid var(--accent-color);background:#222;">` : `<i class="fas fa-user" style="font-size:5em;"></i>`}
            </div>
            <div class="profile-modal-name" style="font-weight:700;font-size:1.6em;text-align:center;">
                ${user.nombre || user.id}
                ${user.rol === "owner" ? '<span style="color:#d1002f;font-weight:bold;margin-left:0.5em;">(Dueño)</span>' : ""}
                ${user.rol === "admin_senior" ? '<span style="color:#0d47a1;font-weight:bold;margin-left:0.5em;">(Admin Senior)</span>' : ""}
                ${user.rol === "admin" ? '<span style="color:#2196f3;font-weight:bold;margin-left:0.5em;">(Admin)</span>' : ""}
                ${user.rol === "candidate" ? '<span style="color:#b400ff;font-weight:bold;margin-left:0.5em;">(Candidato a Admin)</span>' : ""}
                ${user.baneado ? '<span style="color:#ff3333;font-weight:bold;margin-left:0.5em;">(BANEADO)</span>' : ""}
            </div>
            <div class="profile-modal-id" style="opacity:0.7;text-align:center;">@${user.id}</div>
            ${user.genero ? `<div class="profile-modal-gender" style="margin-top:0.2em;text-align:center;"><i class="fas fa-${user.genero === "male" ? "mars" : "venus"}"></i> ${user.genero === "male" ? "Masculino" : "Femenino"}</div>` : ""}
            ${user.edad ? `<div class="profile-modal-age" style="margin-top:0.2em;text-align:center;"><i class="fas fa-birthday-cake"></i> ${user.edad} años</div>` : ""}
            ${user.bio ? `<div class="profile-modal-bio" style="margin-top:0.7em;opacity:0.85;text-align:center;">${user.bio}</div>` : ""}
            ${relacionesHtml ? `<div class="profile-modal-relations" style="margin-top:1em;text-align:center;">${relacionesHtml}</div>` : ""}
            ${user.baneado && user.motivo_ban ? `<div class="profile-modal-ban-reason" style="color:#ff3333;margin-top:1em;text-align:center;"><b>Motivo de baneo:</b> ${user.motivo_ban}</div>` : ""}
            <div style="text-align:center;margin-top:1.2em;display:flex;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap;">
              <button id="addFriendBtnProfile" class="background-button">Agregar amigo</button>
              <button class="background-button" onclick="closeUserProfileModal()">Cerrar</button>
            </div>
        `
    // attach click handler to the add-friend button (use fetched user info)
    try {
      const profileAddBtn = document.getElementById('addFriendBtnProfile');
      if (profileAddBtn) {
        profileAddBtn.addEventListener('click', () => {
          openFriendRequestModal(user.id, user.nombre || user.id);
        });
      }
    } catch (e) { console.error('attach add friend handler failed', e); }
  } catch (e) {
    console.error("[AstralX] Error loading user profile:", e)
    content.innerHTML = '<div style="color:#ff3333;text-align:center;padding:2em 0;">Error al cargar el perfil.</div>'
  }
}

window.closeUserProfileModal = () => {
  const modal = document.getElementById("userProfileModal")
  if (modal) {
    modal.style.display = "none"
  }
}

window.openFriendRequestModal = (paraId, paraName) => {
  const modal = document.getElementById("friendRequestModal")
  const content = document.getElementById("friendRequestModalContent")

  if (!modal || !content) {
    console.error("[AstralX] Friend request modal elements not found")
    return
  }

  content.innerHTML = `
        <p style="margin-bottom:0.6em;text-align:center;font-weight:700;">Enviar solicitud de amistad a <b>${paraName || paraId}</b></p>
        <textarea id="friendRequestMessage" placeholder="Mensaje opcional..." rows="5" style="width:100%;padding:0.75rem;border-radius:8px;border:2px solid var(--accent-color,#4169e1);background:rgba(255,255,255,0.03);color:#fff;font-size:1rem;margin-bottom:0.9em;box-sizing:border-box;min-height:110px;"> </textarea>
        <div style="display:flex;gap:0.6em;justify-content:center;flex-wrap:wrap;">
            <button class="background-button" id="friendRequestSendBtn">Enviar</button>
            <button class="background-button" id="friendRequestCancelBtn" style="background:linear-gradient(45deg,#888,#666);">Cancelar</button>
        </div>
    `
  modal.style.display = "flex"

  // attach handlers for the new buttons
  try {
    const sendBtn = document.getElementById('friendRequestSendBtn');
    const cancelBtn = document.getElementById('friendRequestCancelBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => sendFriendRequest(paraId));
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => closeFriendRequestModal());
    }
  } catch (e) { console.error('attach friend request modal handlers failed', e); }
}

window.closeFriendRequestModal = () => {
  const modal = document.getElementById("friendRequestModal")
  if (modal) {
    modal.style.display = "none"
  }
}

// Update header friends icon indicator when there are pending requests
async function updateFriendRequestIndicator() {
  try {
    const btn = document.getElementById('btn-friends');
    const indicator = document.getElementById('friend-requests-indicator');
    if (!btn || !indicator) return;
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) {
      btn.classList.remove('has-pending');
      indicator.style.display = 'none';
      return;
    }
    const res = await fetch(`${API}/amigos/solicitudes/${encodeURIComponent(user.id)}`);
    if (!res.ok) {
      btn.classList.remove('has-pending');
      indicator.style.display = 'none';
      return;
    }
    const list = await res.json();
    if (Array.isArray(list) && list.length > 0) {
      btn.classList.add('has-pending');
      indicator.style.display = 'inline-block';
    } else {
      btn.classList.remove('has-pending');
      indicator.style.display = 'none';
    }
  } catch (e) {
    console.error('updateFriendRequestIndicator failed', e);
  }
}

// Run indicator check on load and whenever friends panel opens
document.addEventListener('DOMContentLoaded', () => {
  try { updateFriendRequestIndicator(); } catch(e){}
  const btn = document.getElementById('btn-friends');
  if (btn) btn.addEventListener('click', () => setTimeout(updateFriendRequestIndicator, 300));
});

window.sendFriendRequest = async (paraId) => {
  const mensaje = document.getElementById("friendRequestMessage")?.value || ""
  const userId = getCurrentUserId()

  if (!userId) {
    alert("Debes iniciar sesión para enviar solicitudes de amistad")
    return
  }

  try {
    const res = await fetch(`${API}/amigos/solicitar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ de: userId, para: paraId, mensaje }),
    })
    const data = await res.json()

    if (data.success) {
      alert("Solicitud de amistad enviada!")
      closeFriendRequestModal()
    } else {
      alert(data.error || "Error al enviar solicitud")
    }
  } catch (e) {
    console.error("[AstralX] Error sending friend request:", e)
    alert("Error al enviar solicitud de amistad")
  }
}

window.showCommunitySection = async () => {
  console.log("[AstralX] Loading community section...")
  // Ensure section is visible
  // Activate the community section using centralized function
  if (window.activateSection) {
    window.activateSection('community')
  } else {
    const mainContent = document.getElementById("main-content")
    if (mainContent) {
      mainContent.querySelectorAll(".content-section").forEach((sec) => sec.classList.remove("active"))
      const sec = document.getElementById("section-community")
      if (sec) sec.classList.add("active")
    }
  }
  // Fetch and render data
  const users = await fetchAllUsers()
  await renderCommunity(users)
}

// --- EVENTO: Cargar comunidad al hacer clic en el botón ---
document.addEventListener("DOMContentLoaded", () => {
  console.log("[AstralX] Community system loaded")

  // Buscar el botón de comunidad en el sidebar
  const communityBtn = document.querySelector('.sidebar-item[data-section="community"]')
  if (communityBtn) {
    communityBtn.addEventListener("click", async () => {
      await window.showCommunitySection()
    })
  }

  const altCommunityBtn = document.querySelector('[data-section="community"]:not(.sidebar-item)')
  if (altCommunityBtn) {
    altCommunityBtn.addEventListener("click", async () => {
      await window.showCommunitySection()
    })
  }
  // Música de pantalla de título
  const bgMusic = document.getElementById('bg-music');
  const titleScreen = document.getElementById('title-screen');
  let titleMusicStarted = false;

  function showTitleScreen() {
    document.querySelectorAll('.screen-container').forEach(s => s.classList.add('hidden'));
    titleScreen.classList.remove('hidden');
    if (bgMusic) {
      bgMusic.currentTime = 0;
      bgMusic.pause();
    }
    titleMusicStarted = false;
  }

  // Detecta interacción para iniciar música
  window.addEventListener('keydown', (e) => {
    if (!titleMusicStarted && !titleScreen.classList.contains('hidden')) {
      if (e.key === 'Enter') {
        if (bgMusic) {
          bgMusic.currentTime = 0;
          bgMusic.play();
        }
        titleMusicStarted = true;
      }
    }
  });
  window.addEventListener('click', () => {
    if (!titleMusicStarted && !titleScreen.classList.contains('hidden')) {
      if (bgMusic) {
        bgMusic.currentTime = 0;
        bgMusic.play();
      }
      titleMusicStarted = true;
    }
  });

  // Si tienes una función que muestra la pantalla de título, llama a showTitleScreen()
  // Ejemplo: showTitleScreen();
})



// --- NUEVA SECCIÓN: Renderizado de tarjetas anchas para `section-games` ---
// Centralized helpers for section activation and cleanup
window.hideCommunityUI = () => {
  const sec = document.getElementById('section-community')
  if (sec) sec.classList.remove('active')
  const list = document.querySelector('.community-users-list')
  if (list) list.innerHTML = ''
  const modals = document.querySelectorAll('#userProfileModal, #friendRequestModal, .community-panel, .community-overlay')
  modals.forEach((m) => {
    try {
      if (m.style) m.style.display = 'none'
      m.classList.remove('active')
    } catch (e) {}
  })
}

window.activateSection = (sectionName) => {
  // Hide all sections globally (works even if some sections are outside #main-content)
  document.querySelectorAll('.content-section').forEach((sec) => sec.classList.remove('active'))
  const target = document.getElementById(`section-${sectionName}`)
  if (target) target.classList.add('active')

  document.querySelectorAll('.sidebar-item, .drawer-item').forEach((btn) => {
    try {
      btn.classList.toggle('active', btn.dataset && btn.dataset.section === sectionName)
    } catch (e) {}
  })

  if (sectionName !== 'community') window.hideCommunityUI()
  // If opening Ayuda section, sync the checkbox with localStorage
  if (sectionName === 'ayuda') {
    try{
      if (typeof window.showHelpSection === 'function') window.showHelpSection();
    }catch(e){}
  }
  // If opening profile section, initialize profile UI
  if (sectionName === 'profile') {
    try { initProfileUI(); } catch (e) { console.error('activateSection initProfileUI error', e); }
  }
}

// Global click handler to route drawer/sidebar actions through activateSection
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.drawer-item, .sidebar-item')
  if (!btn) return
  const section = btn.dataset && btn.dataset.section
  if (!section) return
  if (section === 'community') {
    // ensure UI updates immediately and let existing handler load data
    window.activateSection('community')
    return
  }
  window.activateSection(section)
})
function populateGamesSection() {
  const container = document.getElementById('games-grid');
  const searchInput = document.getElementById('games-search');
  const emptyEl = document.getElementById('games-empty');
  if (!container) return;

  // Helper to create a single card
  function makeCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.setAttribute('tabindex', '0');
    const thumb = document.createElement('div');
    thumb.className = 'game-thumb';
    const img = game.thumbnail || game.thumb || game.image || '';
    if (img) thumb.style.backgroundImage = `url(${img})`;
    else thumb.style.background = 'linear-gradient(135deg,var(--accent-cyan),var(--accent-purple))';

    const info = document.createElement('div');
    info.className = 'game-info';
    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.title || game.name || game.game || 'Untitled';
    const artist = document.createElement('div');
    artist.className = 'game-artist';
    artist.textContent = game.artist || game.author || game.dev || '';

    const openBtn = document.createElement('button');
    openBtn.className = 'background-button primary';
    openBtn.style.marginTop = '8px';
    openBtn.textContent = 'JUGAR';
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (game.url) {
        if (typeof window.openGameInIframe === 'function') window.openGameInIframe(game.url);
        else window.open(game.url, '_blank');
      }
    });

    info.appendChild(title);
    if (artist && artist.textContent) info.appendChild(artist);
    info.appendChild(openBtn);

    card.appendChild(thumb);
    card.appendChild(info);

    // allow clicking the card to open game too (use iframe if available)
    card.addEventListener('click', () => {
      if (!game.url) return;
      if (typeof window.openGameInIframe === 'function') window.openGameInIframe(game.url);
      else window.open(game.url, '_blank');
    });
    return card;
  }

  // Source of games: try window.games or an inline list
  const games = window.games && Array.isArray(window.games) ? window.games : (window._gamesList || []);

  function renderList(list) {
    container.innerHTML = '';
    if (!list || list.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';
    list.forEach(g => container.appendChild(makeCard(g)));
  }

  // Initial render
  renderList(games);

  // Search filtering
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) return renderList(games);
      const filtered = games.filter(g => {
        const name = (g.title || g.name || g.game || '').toString().toLowerCase();
        const author = (g.artist || g.author || g.dev || '').toString().toLowerCase();
        return name.includes(q) || author.includes(q);
      });
      renderList(filtered);
    });
  }
}

// Initialize Ayuda section controls
window.showHelpSection = function(){
  try{
    const chk = document.getElementById('help-section-hide-checkbox');
    if(!chk) return;
    const key = 'astralx_hide_game_help';
    chk.checked = localStorage.getItem(key) === '1';
    chk.addEventListener('change', ()=>{
      try{ localStorage.setItem(key, chk.checked ? '1' : '0'); }catch(e){}
    });
  }catch(e){}
}

// Populate games section once DOM is ready. If `window.games` is filled later, you can call populateGamesSection() manually.
document.addEventListener('DOMContentLoaded', () => {
  // slight delay to let any earlier script populate `window.games`
  setTimeout(populateGamesSection, 120);
});

// --- SISTEMA DE AMIGOS: funciones importadas/adaptadas de basevieja.js ---
async function enviarSolicitudAmistad(paraId, mensaje = "") {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) return;
  const res = await fetch(`${API}/amigos/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ de: user.id, para: paraId, mensaje })
  });
  const data = await res.json();
  if (data.success) return true;
  throw new Error(data.error || 'Error al enviar solicitud');
}

async function cargarSolicitudesAmistad() {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) return;
  try {
    const res = await fetch(`${API}/amigos/solicitudes/${user.id}`);
    const solicitudes = await res.json();
    renderSolicitudesAmistad(solicitudes || []);
  } catch (e) {
    console.error('Error cargando solicitudes de amistad', e);
  }
}

async function cargarAmigos() {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) return;
  try {
    const res = await fetch(`${API}/amigos/lista/${user.id}`);
    const amigos = await res.json();
    renderListaAmigos(amigos || []);
  } catch (e) {
    console.error('Error cargando lista de amigos', e);
  }
}

async function responderSolicitudAmistad(id, aceptar) {
  try {
    const res = await fetch(`${API}/amigos/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, aceptar })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof showAlert === 'function') showAlert('Solicitud actualizada', aceptar ? '¡Ahora son amigos!' : 'Solicitud rechazada.');
      cargarSolicitudesAmistad();
      cargarAmigos();
    } else {
      if (typeof showAlert === 'function') showAlert('Error', data.error || 'No se pudo actualizar la solicitud.');
    }
  } catch (e) {
    console.error('Error respondiendo solicitud', e);
  }
}

async function eliminarAmigo(amigoId) {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) return;
  try {
    const res = await fetch(`${API}/amigos/eliminar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, amigoId })
    });
    const data = await res.json();
    if (data.success) {
      if (typeof showAlert === 'function') showAlert('Amigo eliminado', 'Ya no tienes a este usuario como amigo.');
      cargarAmigos();
    } else {
      if (typeof showAlert === 'function') showAlert('Error', data.error || 'No se pudo eliminar al amigo.');
    }
  } catch (e) {
    console.error('Error eliminando amigo', e);
  }
}

function renderSolicitudesAmistad(solicitudes) {
  const lista = document.getElementById('friendRequestsList');
  if (!lista) return;
  lista.innerHTML = '';
  if (!solicitudes || solicitudes.length === 0) {
    lista.innerHTML = '<li style="opacity:0.7;">No tienes solicitudes pendientes.</li>';
    return;
  }
  solicitudes.forEach(sol => {
    const li = document.createElement('li');
    li.className = 'friend-request-item';
    li.style = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);';
    li.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#333,#111);display:flex;align-items:center;justify-content:center;color:#fff;"> <i class="fas fa-user"></i> </div>
        <div style="display:flex;flex-direction:column;">
          <strong style="font-size:0.95rem">${sol.de}</strong>
          <small style="opacity:0.7">ID: ${sol.de}</small>
          ${sol.mensaje && sol.mensaje.trim() ? `<div class='friend-msg' style='margin-top:4px;'>${sol.mensaje.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="background-button" onclick="responderSolicitudAmistad(${sol.id}, true)">Aceptar</button>
        <button class="background-button" onclick="responderSolicitudAmistad(${sol.id}, false)" style="background:linear-gradient(45deg,#666,#444);">Rechazar</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

function renderListaAmigos(amigos) {
  const lista = document.getElementById('friendList');
  if (!lista) return;
  lista.innerHTML = '';
  if (!amigos || amigos.length === 0) {
    lista.innerHTML = '<li style="opacity:0.7;">No tienes amigos aún.</li>';
    return;
  }
  const myId = getCurrentUserId();
  amigos.forEach(am => {
    const amigoId = am.de === myId ? am.para : am.de;
    const li = document.createElement('li');
    li.className = 'friend-item';
    li.style = 'display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.03);';
    li.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#333,#111);display:flex;align-items:center;justify-content:center;color:#fff;"> <i class="fas fa-user"></i> </div>
        <div style="display:flex;flex-direction:column;">
          <strong style="font-size:0.95rem">${amigoId}</strong>
          <small style="opacity:0.7">ID: ${amigoId}</small>
        </div>
      </div>
      <div>
        <button class="background-button" onclick="eliminarAmigo('${amigoId}')">Eliminar</button>
      </div>
    `;
    lista.appendChild(li);
  });
}

// Funciones para abrir/cerrar el panel de mensajes (usadas desde HTML)
window.closeMessagesPanel = function(){
  try{
    const panel = document.getElementById('messagesPanel');
    if(panel) panel.style.display = 'none';
  }catch(e){ console.error('closeMessagesPanel error', e); }
}

window.openMessagesPanel = function(){
  try{
    const panel = document.getElementById('messagesPanel');
    if(!panel) return;
    panel.style.display = 'flex';
    // Si quieres cargar mensajes aquí, podemos llamar a una función como cargarChat(myId, amigoId)
  }catch(e){ console.error('openMessagesPanel error', e); }
}

// --- Mensajería: frontend funcional (conversaciones, carga, envío y polling) ---
window.__astral_currentConversation = null;
window.__astral_messagesPoll = null;

async function loadConversationsList() {
  const listEl = document.getElementById('conversationsList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="opacity:0.7">Cargando conversaciones...</div>';
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) { listEl.innerHTML = '<div style="opacity:0.7">Inicia sesión para usar Mensajes.</div>'; return; }

  try {
    // Obtener lista de amigos y para cada uno intentar leer el último mensaje
    const res = await fetch(`${API}/amigos/lista/${user.id}`);
    const amigos = await res.json();
    if (!amigos || amigos.length === 0) { listEl.innerHTML = '<div style="opacity:0.7">No hay conversaciones aún.</div>'; return; }

    // Construir elementos
    listEl.innerHTML = '';
    for (const am of amigos) {
      const friendId = (am.de === user.id) ? am.para : am.de;
      // try to get last messages (non fatal)
      let lastText = '';
      let lastTs = null;
        try {
          const r2 = await fetch(`${API}/amigos/mensajes/${friendId}?user=${encodeURIComponent(user.id)}`);
          const msgs = await r2.json();
        if (Array.isArray(msgs) && msgs.length) {
            const last = msgs[msgs.length - 1];
            lastText = last.texto || last.mensaje || last.message || '';
            lastTs = last.fecha || last.created_at || last.ts || null;
        }
      } catch (e) { /* ignore per-friend errors */ }

      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.style = 'display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03);';
      item.dataset.friendId = friendId;
      item.innerHTML = `
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#333,#111);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${String(friendId).charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="font-size:0.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${friendId}</strong>
            <small style="opacity:0.6;font-size:0.8rem;">${lastTs ? new Date(lastTs).toLocaleString() : ''}</small>
          </div>
          <div style="font-size:0.86rem;color:rgba(200,220,255,0.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(lastText||'').slice(0,80)}</div>
        </div>
      `;
      item.addEventListener('click', () => selectConversation(friendId));
      listEl.appendChild(item);
    }
  } catch (e) {
    console.error('Error cargando conversaciones', e);
    listEl.innerHTML = '<div style="opacity:0.7">Error al cargar conversaciones.</div>';
  }
}

async function selectConversation(friendId) {
  window.__astral_currentConversation = friendId;
  const header = document.getElementById('chatHeaderTitle');
  if (header) header.textContent = `Conversación — ${friendId}`;
  await loadConversationMessages(friendId, true);
}

async function loadConversationMessages(friendId, scrollToBottom = true) {
  const msgsEl = document.getElementById('chatMessages');
  if (!msgsEl) return;
  msgsEl.innerHTML = '<div style="opacity:0.7">Cargando mensajes...</div>';
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) { msgsEl.innerHTML = '<div style="opacity:0.7">Inicia sesión para ver mensajes.</div>'; return; }

  try {
    const res = await fetch(`${API}/amigos/mensajes/${friendId}?user=${encodeURIComponent(user.id)}`);
    const mensajes = await res.json();
    msgsEl.innerHTML = '';
    if (!Array.isArray(mensajes) || mensajes.length === 0) {
      msgsEl.innerHTML = '<div style="opacity:0.7">No hay mensajes en esta conversación.</div>';
      return;
    }

    for (const m of mensajes) {
      const row = document.createElement('div');
      const from = (m.de || m.from || m.sender || '');
      const text = m.texto || m.mensaje || m.message || '';
      const isMine = from === user.id;
      row.className = isMine ? 'msg-row msg-mine' : 'msg-row msg-other';
      row.style = 'display:flex;flex-direction:column;align-items:' + (isMine ? 'flex-end' : 'flex-start') + ';';
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble' + (isMine ? ' msg-mine' : '');
      bubble.style.maxWidth = '80%';
      bubble.innerHTML = `<div style="white-space:pre-wrap;">${String(text).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div><div class='msg-ts' style='font-size:11px;opacity:0.6;margin-top:6px;'>${m.fecha ? new Date(m.fecha).toLocaleString() : (m.created_at ? new Date(m.created_at).toLocaleString() : '')}</div>`;
      row.appendChild(bubble);
      msgsEl.appendChild(row);
    }
    if (scrollToBottom) try { msgsEl.scrollTop = msgsEl.scrollHeight; } catch(e){}
  } catch (e) {
    console.error('Error cargando mensajes de', friendId, e);
    msgsEl.innerHTML = '<div style="opacity:0.7">Error al cargar mensajes.</div>';
  }
}

async function sendMessageToCurrentConversation() {
  const friendId = window.__astral_currentConversation;
  if (!friendId) return alert('Selecciona una conversación primero');
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  if (!user.id) return alert('Debes iniciar sesión para enviar mensajes');

  try {
    const token = localStorage.getItem('astralToken') || '';
    const res = await fetch(`${API}/amigos/mensaje`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ de: user.id, para: friendId, texto: text, token })
    });
    const data = await res.json();
    if (data && data.success) {
      input.value = '';
      await loadConversationMessages(friendId, true);
    } else {
      throw new Error(data && data.error ? data.error : 'Error enviando mensaje');
    }
  } catch (e) {
    console.error('Error enviando mensaje', e);
    alert(e.message || 'No se pudo enviar el mensaje');
  }
}

function startMessagesPolling() {
  stopMessagesPolling();
  // Poll every 6 seconds
  window.__astral_messagesPoll = setInterval(async () => {
    try {
      await loadConversationsList();
      if (window.__astral_currentConversation) await loadConversationMessages(window.__astral_currentConversation, false);
    } catch (e) { console.error('polling error', e); }
  }, 6000);
}

function stopMessagesPolling() {
  if (window.__astral_messagesPoll) { clearInterval(window.__astral_messagesPoll); window.__astral_messagesPoll = null; }
}

// Wire panel open/close to start/stop polling and attach send handler
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('messagesPanel');
  const sendBtn = document.getElementById('chatSendBtn');
  const input = document.getElementById('chatInput');
  const reloadBtn = document.getElementById('chatReloadBtn');

  if (panel) {
    // when opened programmatically, ensure we load conversations and start polling
    const obs = new MutationObserver((mut) => {
      mut.forEach(m => {
        if (m.attributeName === 'style') {
          const disp = panel.style.display;
          if (disp && disp !== 'none') {
            loadConversationsList();
            startMessagesPolling();
          } else {
            stopMessagesPolling();
          }
        }
      });
    });
    obs.observe(panel, { attributes: true });
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessageToCurrentConversation);
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessageToCurrentConversation(); } });
  if (reloadBtn) reloadBtn.addEventListener('click', async () => { if (window.__astral_currentConversation) await loadConversationMessages(window.__astral_currentConversation, true); });
});

// Wire header friends button and panel controls
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-friends');
  if (btn) btn.addEventListener('click', () => {
    const panel = document.getElementById('friendsPanel');
    if (!panel) return;
    panel.style.display = 'flex';
    cargarAmigos();
    cargarSolicitudesAmistad();
  });

  const addBtn = document.getElementById('addFriendBtn');
  const addInput = document.getElementById('addFriendInput');
  if (addBtn && addInput) addBtn.addEventListener('click', async () => {
    const id = addInput.value.trim();
    if (!id) return alert('Ingresa un ID de usuario válido');
    try {
      await enviarSolicitudAmistad(id, '¡Hola! Te envío una solicitud desde AstralX');
      alert('Solicitud enviada');
      addInput.value = '';
    } catch (e) {
      console.error('Error enviando solicitud', e);
      alert(e.message || 'Error al enviar solicitud');
    }
  });
  // Wire messages button to open messages panel
  const msgBtn = document.getElementById('btn-messages');
  if (msgBtn) msgBtn.addEventListener('click', () => {
    try{
      const panel = document.getElementById('messagesPanel');
      if (!panel) return;
      panel.style.display = 'flex';
      // Optionally, focus an input inside the panel if exists
      const input = panel.querySelector('textarea, input[type="text"]');
      if (input) try{ input.focus(); }catch(e){}
    }catch(e){ console.error('btn-messages click error', e); }
  });
});

// Sidebar: initial active section (clicks handled globally by activateSection)
document.addEventListener("DOMContentLoaded", () => {
  const homeSection = document.getElementById("section-home");
  if (homeSection) homeSection.classList.add("active");
  // If there are pre-rendered sidebar/drawer items, ensure the 'home' one is active
  document.querySelectorAll('.sidebar-item, .drawer-item').forEach((btn) => {
    try { btn.classList.toggle('active', btn.dataset && btn.dataset.section === 'home') } catch (e) {}
  })
});

// Sidebar: initial active section (clicks handled globally by activateSection)
document.addEventListener("DOMContentLoaded", () => {
  const homeSection = document.getElementById("section-home");
  if (homeSection) homeSection.classList.add("active");
  // If there are pre-rendered sidebar/drawer items, ensure the 'home' one is active
  document.querySelectorAll('.sidebar-item, .drawer-item').forEach((btn) => {
    try { btn.classList.toggle('active', btn.dataset && btn.dataset.section === 'home') } catch (e) {}
  })
});
// Definir la lista de juegos aquí, solo en el script, no en el HTML
// Lista de juegos importada de lista.txt, formato multilínea y detallado
window.games = [
    {
        id: 100,
        title: "Dino",
        artist: "nodefinido",
        thumbnail: "imgjuegos/dino.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/dino/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 246734323,
        title: "Rooftop Snipers",
        artist: "nodefinido",
        thumbnail: "imgjuegos/rooftop.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/rooftopsnipers/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 2467323,
        title: "Sandtrix",
        artist: "nodefinido",
        thumbnail: "imgjuegos/sandtrix.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/sandtrix/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 246733,
        title: "Fluid Simulator",
        artist: "nodefinido",
        thumbnail: "imgjuegos/fuidsim.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/fluidsim/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 24673,
        title: "We become what we behold",
        artist: "nodefinido",
        thumbnail: "imgjuegos/wbw.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/wbwwb/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 2467,
        title: "Run",
        artist: "Ahora SI SIRVE DIOS MIO",
        thumbnail: "imgjuegos/run.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/run/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 246,
        title: "Run2",
        artist: "Ahora SI SIRVE DIOS MIO",
        thumbnail: "imgjuegos/run2.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/run2/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 26,
        title: "Run3",
        artist: "Ahora SI SIRVE DIOS MIO",
        thumbnail: "imgjuegos/run3.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/run3/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No sirve jaja",
            redirect: "Juegos/run3fix2/index.html"
        }
    },
    {
        id: 0.00000045,
        title: "FNAF 4",
        artist: "?",
        thumbnail: "imgjuegos/fnaf4.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fnaf4/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 0.00000044,
        title: "FNAF 3",
        artist: "?",
        thumbnail: "imgjuegos/fnaf3.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fnaf3/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 0.00000044,
        title: "FNAF 2",
        artist: "?",
        thumbnail: "imgjuegos/fnaf2.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fnaf2/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 0.00000042,
        title: "Fireboy and Watergirl 4",
        artist: "?",
        thumbnail: "imgjuegos/firewater4.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fireboywatergirl4/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 0.0000004,
        title: "Fireboy and Watergirl 3",
        artist: "?",
        thumbnail: "imgjuegos/firewater3.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fireboywatergirl3/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 0.0000003,
        title: "Fireboy and Watergirl 2",
        artist: "?",
        thumbnail: "imgjuegos/firewater2.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/fireboywatergirl2/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 56,
        title: "Subway Surfers",
        artist: "SYBO Games",
        thumbnail: "imgjuegos/SBS.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/subway/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Superaras mi bellisimo record de 28765? :o",
            redirect: "Juegos/subwaysurferssanfrancisco/index.html"
        }
    },
    {
        id: 1.000002,
        title: "Bad Piggies",
        artist: "Rovio Entertainment",
        thumbnail: "imgjuegos/badpiggies.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/badpiggies/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.000001,
        title: "There is no game",
        artist: "Ahi esta en el juego",
        thumbnail: "imgjuegos/ting.png",
        song: "titulonuevo.mp3",
        url: "Juegos/there-is-no-game/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.00001,
        title: "Stack",
        artist: "Vamos a apilar",
        thumbnail: "imgjuegos/stack.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/stack/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.0001,
        title: "Hacker typer",
        artist: "Vamos a hackear",
        thumbnail: "imgjuegos/hacker.png",
        song: "titulonuevo.mp3",
        url: "Juegos/hackertype/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.002,
        title: "FNF fixed",
        artist: "ninjamuffin99",
        thumbnail: "imgjuegos/fnfviejo.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fnffixed/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.001,
        title: "FNF: vs Sonic.exe",
        artist: "No sabemos quien hizo el port...",
        thumbnail: "imgjuegos/fnfsonicexe.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fnfsonic-exe/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.01,
        title: "FNF: vs Among Us",
        artist: "No sabemos quien hizo el port...",
        thumbnail: "imgjuegos/fnfsus.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fnfsus/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 1.02,
        title: "FNF: vs Doki Doki Literature Club",
        artist: "No sabemos quien hizo el port...",
        thumbnail: "imgjuegos/fnfdoki.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fnfdoki/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
        {
        id: 1,
        title: "Fruit Ninja",
        artist: "HalfBrick Studios",
        thumbnail: "imgjuegos/FN.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fruitninja/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Te sirvio la pagina?",
            redirect: "tube.html"
        }
    },
    {
        id: 2,
        title: "Plantas Vs Zombies",
        artist: "EA",
        thumbnail: "imgjuegos/pvz.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/pvz/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¿Cual es tu musica favorita de la pagina?",
            redirect: "musica.html"
        }
    },
    {
        id: 2.1,
        title: "Roblox",
        artist: "Roblox Corporation",
        thumbnail: "imgjuegos/roblox.jpeg",
        song: "titulonuevo.mp3",
        url: "robloxad.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Esto ya ni visible es en la pagina para que seguir poniendo frases?",
            redirect: "robloxad.html"
        }
    },
    {
        id: 2.2,
        title: "Mario VS Luigi ONLINE",
        artist: "ipodtouch",
        thumbnail: "imgjuegos/MVLO.gif",
        song: "titulonuevo.mp3",
        url: "Juegos/mariovsluigi/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Esto ya ni visible es en la pagina para que seguir poniendo frases?",
            redirect: "robloxad.html"
        }
    },
    {
        id: 2.3,
        title: "Color Switch",
        artist: "David Reichelt",
        thumbnail: "imgjuegos/colorswitch.png",
        song: "Juegosmusica/minecraft.mp3",
        url: "Juegos/colorswitch/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/colorswitch/index.html"
        }
    },
    {
        id: 2.4,
        title: "Google Gravity",
        artist: "Gugul",
        thumbnail: "imgjuegos/googlegravity.jpeg",
        song: "Juegosmusica/minecraft.mp3",
        url: "Juegos/googlegravity-main/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/googlegravity-main/index.html"
        }
    },
    {
        id: 2.5,
        title: "Paper IO 2",
        artist: "Paper IO Team",
        thumbnail: "imgjuegos/paperio2.jpeg",
        song: "Juegosmusica/minecraft.mp3",
        url: "Juegos/paperio2/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/paperio/index.html"
        }
    },
    {
        id: 2.5,
        title: "Friday Night Funkin: Undertale",
        artist: "ninjamuffin69, PhantomArcade, evilsk8r, Kawai Sprite, AstralTeam",
        thumbnail: "imgjuegos/fnfunder.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/fnfundertale/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/fnfundertale/index.html"
        }
    },
    {
        id: 3,
        title: "Block Blast",
        artist: "Hungry Studio",
        thumbnail: "imgjuegos/blockblast.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/blockblast/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/blockblast/index.html"
        }
    },
    {
        id: 4,
        title: "Death Run 3D",
        artist: "Y8",
        thumbnail: "imgjuegos/deathrun3d.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/death-run-3d/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/death-run-3d/index.html"
        }
    },
    {
        id: 5,
        title: "Unfair Mario",
        artist: "Ni idea mijo",
        thumbnail: "imgjuegos/unfairmario.jpg",
        song: "juegosmusica/unfairmario.mp3",
        url: "Juegos/ita13/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/ita13/index.html"
        }
    },
    {
        id: 6,
        title: "Tunnel Rush",
        artist: "Deer Cat Games",
        thumbnail: "imgjuegos/tunnel.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/tunnel-rush/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Superate mi record de 1000 puntos.",
            redirect: "Juegos/tunnel-rush/index.html"
        }
    },
    {
        id: 7,
        title: "DON'T YOU LECTURE ME WITH YOUR THIRTY DOLLAR WEBSITE",
        artist: "GD COLON",
        thumbnail: "imgjuegos/30dollar.png",
        song: "titulonuevo.mp3",
        url: "Juegos/30dollarwebsite/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Crea la mejor musica.",
            redirect: "Juegos/30dollarwebsite/index.html"
        }
    },
    {
        id: 8,
        title: "2048",
        artist: "Poki",
        thumbnail: "imgjuegos/2014.png",
        song: "titulonuevo.mp3",
        url: "Juegos/2048/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Sé INTELIGENTE y haz 2048!",
            redirect: "Juegos/2048/index.html"
        }
    },
    {
        id: 9,
        title: "Slope 2",
        artist: "Y8",
        thumbnail: "imgjuegos/slope2.jpeg",
        song: "juegosmusica/slope.mp3",
        url: "Juegos/slope-2/index.html",
        categories: ["action"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Es hora de esquivar los obstaculos! Pero ahora con tu pana.",
            redirect: "Juegos/slope-2/index.html"
        }
    },
    {
        id: 10,
        title: "Highway Racer",
        artist: "Bonecracker Games",
        thumbnail: "imgjuegos/highway.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/hwy-rcer/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Un juego en donde debes de correr a toda velocidad y evitar los demas carros.",
            redirect: "Juegos/hwy-rcer/index.html"
        }
    },
    {
        id: 11,
        title: "Stick Duel Battle",
        artist: "undefined",
        thumbnail: "imgjuegos/stick2.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/stick-duel-battle/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Un juego en donde debes de pelear contra tu compa o contra un bot con pistolas o a puño.",
            redirect: "Juegos/stick-duel-battle/index.html"
        }
    },
    {
        id: 12,
        title: "The World's Hardest Game",
        artist: "undefined",
        thumbnail: "imgjuegos/hard.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/ita10/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "El juego mas dificil del mundo, no te enojes si no puedes pasar el primer nivel. Esta demasiado dificil.",
            redirect: "Juegos/ita10/index.html"
        }
    },
    {
        id: 13,
        title: "Stickman Hook",
        artist: "?",
        thumbnail: "imgjuegos/stick.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/stickman-hook/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Un juego de balancearse como un loco, pero no te caigas.",
            redirect: "Juegos/stickman-hook/index.html"
        }
    },
    {
        id: 14,
        title: "PolyTrack",
        artist: "PolyTrack",
        thumbnail: "imgjuegos/poly.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/polytrack/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Un juego de carreras donde debes evitar los obstaculos y llegar a la meta.",
            redirect: "Juegos/polytrack/index.html"
        }
    },
    {
        id: 15,
        title: "Tertis Chafa",
        artist: "NotArtistAvailable",
        thumbnail: "imgjuegos/tetris.jpg",
        song: "titulonuevo.mp3",
        url: "Juegos/ita11/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Crea una linea de 4 bloques para eliminarla, pero no dejes que se llene la pantalla.",
            redirect: "Juegos/ita11/index.html"
        }
    },
    {
        id: 16,
        title: "A Dance of Fire and Ice",
        artist: "Ni idea crack",
        thumbnail: "imgjuegos/adofai.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/a-dance-of-fire-and-ice/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Music-rhythm game, donde debes seguir el ritmo de la musica, es un juego muy bueno.",
            redirect: "Juegos/a-dance-of-fire-and-ice/index.html"
        }
    },
    {
        id: 17,
        title: "Google Snake",
        artist: "Google",
        thumbnail: "imgjuegos/snake.jpeg",
        song: "titulonuevo.mp3",
        url: "Juegos/google-snake/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Comete esta manzana, pero no te comas a ti mismo. Poetico.",
            redirect: "Juegos/google-snake/index.html"
        }
    },
    {
        id: 18,
        title: "Super Mario Combat",
        artist: "Sun-studios",
        thumbnail: "imgjuegos/mariocombat.jpeg",
        song: "juegosmusica/mariocombat.mp3",
        url: "Juegos/ita9/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Un juego de combate bien chidoris, muevete con las flechas y ataca con la letra a",
            redirect: "Juegos/ita9/index.html"
        }
    },
    {
        id: 19,
        title: "BitLife",
        artist: "Ni idea crack",
        thumbnail: "imgjuegos/bitlife.png",
        song: "titulonuevo.mp3",
        url: "Juegos/bitlife/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "No seas abogado, te arruinara la vida, creeme.",
            redirect: "Juegos/bitlife/index.html"
        }
    },
    {
        id: 20,
        title: "Angry Birds",
        artist: "ROVIO",
        thumbnail: "imgjuegos/angry.jpeg",
        song: "juegosmusica/angry.mp3",
        url: "Juegos/angrybirds/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "Nunca uses el pajaro azul >:l",
            redirect: "Juegos/angrybirds/index.html"
        }
    },
    {
        id: 22,
        title: "Cat Tenis",
        artist: "AstralOriginals (Astral lo porteo)",
        thumbnail: "imgjuegos/cattenis.png",
        song: "juegosmusica/cattenis.mp3",
        url: "Juegos/cattenis/index.html",
        categories: ["puzzle"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Ganale en el tenis al gatito.",
            redirect: "Juegos/cattenis/index.html"
        }
    },
    {
        id: 23,
        title: "Slowroads",
        artist: "slowroads.io",
        thumbnail: "imgjuegos/slowroad.jpeg",
        song: "juegosmusica/cattenis.mp3",
        url: "Juegos/slowroads/index.html",
        categories: ["puzzle"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Ganale en el tenis al gatito.",
            redirect: "Juegos/slowroads/index.html"
        }
    },
    {
        id: 24,
        title: "8 Ball Pool",
        artist: "?",
        thumbnail: "imgjuegos/8ballpool.jpeg",
        song: "titulo.mp3",
        url: "Juegos/8ball/index.html",
        categories: ["puzzle"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "¿Alguien realmente lee esto?",
            redirect: "Juegos/8ball/index.html"
        }
    },
    {
        id: 25,
        title: "1v1.lol",
        artist: "?",
        thumbnail: "imgjuegos/1v1.png",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/1v1fixed/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "A ver si ahora si funciona este juego jajaja",
            redirect: "Juegos/1v1fixed/index.html"
        }
    },
    {
        id: 27,
        title: "Astral Chess",
        artist: "AstralOriginals",
        thumbnail: "imgjuegos/astralchess.png",
        song: "titulonuevo.mp3",
        url: "Juegos/astralchess/index.html",
        categories: ["arcade"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¡Recuerda siempre jugar con un amigo!",
            redirect: "Juegos/astralchess/index.html"
        }
    },
    {
        id: 28,
        title: "Wii Simulation",
        artist: "The Onliine Project",
        thumbnail: "imgjuegos/Wii.png",
        song: "juegosmusica/wii.mp3",
        url: "Juegos/vwii/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Nintendo no me demandes aaaa",
            redirect: "Juegos/vwii/index.html"
        }
    },
    {
        id: 29,
        title: "Minecraft: Astral x Precision Client",
        artist: "Mojang/Precision Client",
        thumbnail: "imgjuegos/minecraft.jpg",
        song: "juegosmusica/mc.mp3",
        url: "Juegos/minecraft/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Si quieres jugar con tus amigos abre el mundo a LAN!",
            redirect: "Juegos/minecraft/index.html"
        }
    },
    {
        id: 30,
        title: "Mario Party 2",
        artist: "Nintendo",
        thumbnail: "imgjuegos/mp2.jpeg",
        song: "juegosmusica/mp2.mp3",
        url: "Juegos/MarioParty2/index.html",
        categories: ["retro"],
        isNew: true,
        isUpdate: false,
        folder: "mario",
        alert: {
            type: "loading",
            message: "Cargando el juego... ¡Recuerda siempre ganarle al chango!",
            redirect: "Juegos/MarioParty2/index.html"
        }
    },
    {
        id: 31,
        title: "Geometry Dash (Unity WebGL)",
        artist: "Not Avaible",
        thumbnail: "imgjuegos/gds.jpeg",
        song: "juegosmusica/gd.mp3",
        url: "Juegos/geometry-dash-lite/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Pasate time machine en 1 intento",
            redirect: "Juegos/geometry-dash-lite/index.html"
        }
    },
    {
        id: 32,
        title: "Geometry Dash (Scratch)",
        artist: "Robert Nicholas Christian Topala",
        thumbnail: "imgjuegos/gds.jpeg",
        song: "juegosmusica/gd.mp3",
        url: "Juegos/geometrydash/index.html",
        categories: ["all"],
        isNew: true,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Pasate time machine en 1 intento",
            redirect: "Juegos/geometrydash/index.html"
        }
    },
    {
        id: 33,
        title: "Tetris pirata",
        artist: "NA",
        thumbnail: "imgjuegos/tetris.jpg",
        song: "",
        url: "Juegos/tetris/index.html",
        categories: ["all"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "info",
            message: "¡Bienvenido a Astral!",
            redirect: "mensaje.html"
        }
    },
    {
        id: 34,
        title: "Super Mario Construct",
        artist: "LSS",
        thumbnail: "imgjuegos/SMC.jpeg",
        song: "juegosmusica/smc.mp3",
        url: "Juegos/MARIO.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        folder: "mario",
        alert: {
            type: "loading",
            message: "Cargando el juego... ¡No olvides usar tu creatividad al maximo!",
            redirect: "Juegos/MARIO.html"
        }
    },
    {
        id: 35,
        title: "Sans",
        artist: "TobyFox?",
        thumbnail: "imgjuegos/sans.jpg",
        song: "juegosmusica/sans.mp3",
        url: "Juegos/sans/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Quieres pasar un mal rato?",
            redirect: "Juegos/sans/index.html"
        }
    },
    {
        id: 36,
        title: "Stack Ball",
        artist: "NA",
        thumbnail: "imgjuegos/stackball.jpg",
        song: "titulo.mp3",
        url: "Juegos/stack/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "No sé que decir aqui.",
            redirect: "Juegos/stack/index.html"
        }
    },
    {
        id: 37,
        title: "AstralEmulator",
        artist: "Aplicacion basada en la app codigo abierto emulator.js modificada por AstralTeam",
        thumbnail: "imgjuegos/noimg.png",
        song: "titulo.mp3",
        url: "Juegos/AstralEmulator1.5/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        alert: {
            type: "loading",
            message: "¡Le recomendamos mucho Jugar Super Mario World!",
            redirect: "Juegos/AstralEmulator1.5/index.html"
        }
    },
    {
        id: 38,
        title: "8 Ball Pool",
        artist: "?",
        thumbnail: "imgjuegos/8ballpool.jpeg",
        song: "titulo.mp3",
        url: "Juegos/ita8/index.html",
        categories: ["puzzle"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Alguien realmente lee esto?",
            redirect: "Juegos/ita8/index.html"
        }
    },
    {
        id: 39,
        title: "Fireboy & Watergirl",
        artist: "?",
        thumbnail: "imgjuegos/FYW.jpeg",
        song: "titulo.mp3",
        url: "Juegos/firewater/index.html",
        categories: ["puzzle"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Cual personaje prefieres ser?",
            redirect: "Juegos/firewater/index.html"
        }
    },
    {
        id: 40,
        title: "Cut the Rope",
        artist: "Zeptolabs",
        thumbnail: "imgjuegos/ctr.jpg",
        song: "juegosmusica/ctr.mp3",
        url: "Juegos/ctr/index.html",
        categories: ["puzzle"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡La araña se llevara tu caramelo pronto!",
            redirect: "Juegos/ctr/index.html"
        }
    },
    {
        id: 41,
        title: "DOOM",
        artist: "NA",
        thumbnail: "imgjuegos/doom.jpeg",
        song: "juegosmusica/doom.mp3",
        url: "Juegos/doom/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡No ejecutes esto en un cactus!",
            redirect: "Juegos/doom/index.html"
        }
    },
    {
        id: 42,
        title: "Windows XP",
        artist: "Open Source Docker",
        thumbnail: "imgjuegos/winxp.jpeg",
        song: "titulo.mp3",
        url: "Juegos/winxp/VirtualXP.htm",
        categories: ["all"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Tan siquiera alguien usa esto?",
            redirect: "Juegos/winxp/VirtualXP.htm"
        }
    },
    {
        id: 43,
        title: "FNF Garcello Mod",
        artist: "NA",
        thumbnail: "imgjuegos/fnfg.jpeg",
        song: "juegosmusica/fnfv.mp3",
        url: "Juegos/fnfg/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        folder: "fnf",
        alert: {
            type: "loading",
            message: "¡No vayas a matar a Garcello!",
            redirect: "Juegos/fnfg/index.html"
        }
    },
    {
        id: 44,
        title: "FNF",
        artist: "ninjamuffin",
        thumbnail: "imgjuegos/fnfviejo.jpeg",
        song: "juegosmusica/fnfv.mp3",
        url: "Juegos/fnfviejo/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        folder: "fnf",
        alert: {
            type: "loading",
            message: "¡No pierdas!",
            redirect: "Juegos/fnfviejo/index.html"
        }
    },
    {
        id: 45,
        title: "FNF Vs Shaggy",
        artist: "NA",
        thumbnail: "imgjuegos/fnfvsshaggy.jpeg",
        song: "juegosmusica/fnfv.mp3",
        url: "Juegos/fnfshaggy/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        folder: "fnf",
        alert: {
            type: "loading",
            message: "¡Valiste Churro!",
            redirect: "Juegos/fnfshaggy/index.html"
        }
    },
    {
        id: 46,
        title: "Super Mario 127",
        artist: "LSS",
        thumbnail: "imgjuegos/mario127.jpeg",
        song: "juegosmusica/mario127.mp3",
        url: "Juegos/MARIO127.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        folder: "mario",
        alert: {
            type: "loading",
            message: "¡No te caigas al vacio!",
            redirect: "Juegos/MARIO127.html"
        }
    },
    {
        id: 47,
        title: "Slope",
        artist: "Y8",
        thumbnail: "imgjuegos/slope.jpg",
        song: "juegosmusica/slope.mp3",
        url: "Juegos/slope/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Es hora de esquivar los obstaculos!",
            redirect: "Juegos/slope/index.html"
        }
    },
    {
        id: 48,
        title: "Baldi",
        artist: "NA",
        thumbnail: "imgjuegos/baldi.jpg",
        song: "juegosmusica/baldi.mp3",
        url: "Juegos/baldi/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "Recuerda: ¡1+1 = 2!",
            redirect: "Juegos/baldi/index.html"
        }
    },
    {
        id: 50,
        title: "FNAF 1",
        artist: "Scott",
        thumbnail: "imgjuegos/fnafbg.jpeg",
        song: "juegosmusica/fnaf.mp3",
        url: "Juegos/FNAF1/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "undefined",
            redirect: "Juegos/FNAF1/index.html"
        }
    },
    {
        id: 51,
        title: "Mario Kart 64",
        artist: "Nintendo",
        thumbnail: "imgjuegos/mk64b.jpg",
        song: "juegosmusica/mk64.mp3",
        url: "Juegos/MarioKart64/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: true,
        folder: "mario",
        alert: {
            type: "loading",
            message: "¡Recuerda siempre pegarle al chango!",
            redirect: "Juegos/MarioKart64/index.html"
        }
    },
    {
        id: 52,
        title: "Super Mario 64",
        artist: "Nintendo",
        thumbnail: "imgjuegos/mario64.jpg",
        song: "juegosmusica/mario64.mp3",
        url: "Juegos/SM64/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        folder: "mario",
        alert: {
            type: "loading",
            message: "¡No olvides tirar al pinguino por el vacio!",
            redirect: "Juegos/SM64/index.html"
        }
    },
    {
        id: 53,
        title: "Sonic Mania",
        artist: "SEGA",
        thumbnail: "imgjuegos/mania.jpg",
        song: "juegosmusica/mania.mp3",
        url: "Juegos/mania/index.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Cuando inicie el juego presiona ESC (Escape) en tu teclado para iniciar un mod menu, ahi elije el nivel porque el menu no sirve.",
            redirect: "Juegos/mania/index.html"
        }
    },
    {
        id: 54,
        title: "Super Yoshi Construct",
        artist: "LSS",
        thumbnail: "imgjuegos/yfs.jpeg",
        song: "juegosmusica/smc.mp3",
        url: "Juegos/YOSHI.html",
        categories: ["retro"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡No olvides usar tu creatividad al maximo!",
            redirect: "Juegos/YOSHI.html"
        }
    },
    {
        id: 55,
        title: "Tomb of The Mask",
        artist: "NA",
        thumbnail: "imgjuegos/totm.jpg",
        song: "titulo.mp3",
        url: "Juegos/totm/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Veremos quien es el mejor!",
            redirect: "Juegos/totm/index.html"
        }
    },
    {
        id: 57,
        title: "Henry Stickmin: BTB",
        artist: "Puffballs United & Newgrounds",
        thumbnail: "imgjuegos/btb.jpeg",
        song: "juegosmusica/hsita.mp3",
        url: "Juegos/ita3/index.html",
        categories: ["strategy"],
        isNew: false,
        isUpdate: false,
        folder: "henry",
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita3/index.html"
        }
    },
    {
        id: 58,
        title: "Henry Stickmin: ETP",
        artist: "Puffballs United & Newgrounds",
        thumbnail: "imgjuegos/etp.jpeg",
        song: "juegosmusica/hsita.mp3",
        url: "Juegos/ita4/index.html",
        categories: ["strategy"],
        isNew: false,
        isUpdate: false,
        folder: "henry",
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita4/index.html"
        }
    },
    {
        id: 59,
        title: "Henry Stickmin: STD",
        artist: "Puffballs United & Newgrounds",
        thumbnail: "imgjuegos/std.jpeg",
        song: "juegosmusica/hsita.mp3",
        url: "Juegos/ita5/index.html",
        categories: ["strategy"],
        isNew: false,
        isUpdate: false,
        folder: "henry",
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita5/index.html"
        }
    },
    {
        id: 60,
        title: "Henry Stickmin: ITA",
        artist: "Puffballs United & Newgrounds",
        thumbnail: "imgjuegos/ita.jpg",
        song: "juegosmusica/hsita.mp3",
        url: "Juegos/ita/index.html",
        categories: ["strategy"],
        isNew: false,
        isUpdate: false,
        folder: "henry",
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita/index.html"
        }
    },
    {
        id: 61,
        title: "Henry Stickmin: FTC",
        artist: "Puffballs United & Newgrounds",
        thumbnail: "imgjuegos/ftc.jpeg",
        song: "juegosmusica/hsita.mp3",
        url: "Juegos/ita6/index.html",
        categories: ["strategy"],
        isNew: false,
        isUpdate: false,
        folder: "henry",
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita6/index.html"
        }
    },
    {
        id: 62,
        title: "The Binding Of Isaac - FL",
        artist: "Edmund McMillen, Florian Himsl",
        thumbnail: "imgjuegos/isaacico.jpg",
        song: "juegosmusica/isaac.mp3",
        url: "Juegos/ita2/index.html",
        categories: ["action"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "info",
            message: "Recomendamos pantalla completa.",
            redirect: "Juegos/ita2/index.html"
        }
    },
    {
        id: 63,
        title: "Crossy Road",
        artist: "Hipster Whale",
        thumbnail: "imgjuegos/crossy.jpg",
        song: "juegosmusica/tloi.mp3",
        url: "Juegos/crossyroad/index.html",
        categories: ["arcade"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¡Mira 2 veces antes de cruzar la calle!",
            redirect: "Juegos/crossyroad/index.html"
        }
    },
    {
        id: 64,
        title: "Bad Ice Cream 1",
        artist: "NA",
        thumbnail: "Juegos/badicecream/bad-ice-cream.png",
        song: "titulo.mp3",
        url: "Juegos/badicecream/index.html",
        categories: ["puzzle"],
        isNew: false,
        isUpdate: false,
        alert: {
            type: "loading",
            message: "¿Realmente alguien juega esto? Ya ni sé porque lo meti.",
            redirect: "Juegos/badicecream/index.html"
        }
    }
];
const API_URL = "https://astral-ban-api.onrender.com"

document.addEventListener("DOMContentLoaded", () => {
    // Sidebar: navegación de secciones
    const sidebar = document.getElementById("main-sidebar")
    const mainContent = document.getElementById("main-content")
    if (sidebar && mainContent) {
      sidebar.addEventListener("click", (e) => {
        const btn = e.target.closest(".sidebar-item")
        if (!btn) return
        // Cambiar activo
        sidebar.querySelectorAll(".sidebar-item").forEach(b => b.classList.remove("active"))
        btn.classList.add("active")
        // Mostrar sección
        const section = btn.dataset.section
        mainContent.querySelectorAll(".content-section").forEach(sec => {
          sec.classList.remove("active")
          if (sec.id === `section-${section}`) {
            sec.classList.add("active")
          }
        })
      })
    }
  // Referencias al DOM
  const loaderScreen = document.getElementById("loader-screen")
  const titleScreen = document.getElementById("title-screen")
  const setupScreen = document.getElementById("setup-screen")
  const appScreen = document.getElementById("app-screen")
  const bgMusic = document.getElementById("bg-music")

  // Configuración
  const LOADING_TIME = 3000 // Tiempo de carga simulada (ms)
  let isTitleScreenActive = false


  // Paso 1: Simular Carga
  setTimeout(() => {
    transitionToTitle()
  }, LOADING_TIME)

  function transitionToTitle() {
    // Desvanecer loader
    loaderScreen.classList.add("fade-out")

    // Esperar a que termine la animación de fade-out (0.8s en CSS)
    setTimeout(() => {
      loaderScreen.classList.add("hidden") // Ocultar completamente
      loaderScreen.classList.remove("active")

      // Mostrar Title Screen
      titleScreen.classList.remove("hidden")
      titleScreen.classList.add("fade-in") // Clase para animar entrada
      isTitleScreenActive = true

      // Intentar reproducir música
      playMusic()
    }, 800)
  }

  async function showApp() {
    appScreen.classList.remove("hidden");
    appScreen.classList.add("fade-in");
    createFooterDrawer();

    // Mejorar sección de inicio con info y logo
    renderHomeSection();
    // Renderizar juegos
    renderGamesSection();

    // Mostrar nombre y avatar reales en el header, intentando varias fuentes
    try {
      let user = null;
      let avatarUrl = null;
      let username = null;
      // 1. Primero intenta localStorage
      const userStr = localStorage.getItem("astralUser");
      if (userStr) {
        user = JSON.parse(userStr);
        avatarUrl = user.avatar;
        username = user.username || user.name || user.id || "Player";
      }
      // 2. Si no hay avatar o es local, intenta obtenerlo de la API
      if (!avatarUrl || avatarUrl.startsWith("data:image") || avatarUrl.trim() === "") {
        // Intenta obtener por ID o username
        /* Lines 129-144 omitted */
      }
      // 3. Si sigue sin avatar, busca en /usuarios y filtra por username
      if ((!avatarUrl || avatarUrl.startsWith("data:image") || avatarUrl.trim() === "") && username) {/* Lines 147-155 omitted */}
      // 4. Si aún no hay avatar, usa generador externo
      if (!avatarUrl || avatarUrl.trim() === "" || avatarUrl.startsWith("data:image")) {/* Lines 158-159 omitted */}
      // Actualiza header
      const avatarImg = document.getElementById("header-avatar");
      const usernameSpan = document.getElementById("header-username");
      if (avatarImg) {
        avatarImg.src = avatarUrl;
        avatarImg.onerror = function() {
          avatarImg.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(username || "Player");
        };
      }
      if (usernameSpan) usernameSpan.textContent = username || "Player";
    } catch (e) {
      console.error("Error loading user data for header", e);
    }

    // Pausar música anterior y reproducir title.mp3
    try {
      const bgMusic = document.getElementById("bg-music");
      if (bgMusic && !bgMusic.paused) {/* Lines 178-180 omitted */}
      const titleMusic = document.getElementById("title-music");
      if (titleMusic) {/* Lines 183-213 omitted */}
    } catch (e) {
      console.error("Error loading user data for header", e);
    }
  }

  // Renderiza la sección de inicio mejorada
  function renderHomeSection() {
    const homeSection = document.getElementById("section-home");
    if (!homeSection) return;
    homeSection.innerHTML = `
      <img src="logo.png" alt="AstralX Logo" class="home-logo" style="width:120px;filter:drop-shadow(0 0 16px var(--accent-cyan));margin-bottom:18px;">
      <h1 class="section-title" style="font-size:2.8rem;">Bienvenido a <span style="color:var(--accent-purple)">AstralX</span></h1>
      <p class="welcome-message" style="font-size:1.3rem;max-width:600px;margin:0 auto 18px auto;">Explora el universo de AstralX: una plataforma de juegos, comunidad y novedades. ¡Disfruta de tus juegos favoritos, descubre nuevos lanzamientos y mantente al día con las actualizaciones!</p>
      <div class="home-info" style="background:rgba(0,242,255,0.07);border-radius:16px;padding:18px 24px;max-width:600px;margin:0 auto 0 auto;box-shadow:0 2px 16px rgba(0,242,255,0.08);">
        <b>¿Qué es AstralX?</b><br>
        AstralX es una plataforma web donde puedes jugar, compartir y descubrir juegos clásicos y nuevos, todo en un solo lugar.<br>
        <b>Características:</b> Juegos retro y modernos, comunidad, perfiles personalizados, y más.<br>
      </div>
    `;
  }

  // Renderiza la sección de juegos con la lista


  async function showApp() {

    appScreen.classList.remove("hidden");
    appScreen.classList.add("fade-in");
    createFooterDrawer();

    // Mostrar nombre y avatar reales en el header, intentando varias fuentes
    try {
      let user = null;
      let avatarUrl = null;
      let username = null;
      // 1. Primero intenta localStorage
      const userStr = localStorage.getItem("astralUser");
      if (userStr) {
        user = JSON.parse(userStr);
        avatarUrl = user.avatar;
        username = user.username || user.name || user.id || "Player";
      }
      // 2. Si no hay avatar o es local, intenta obtenerlo de la API
      if (!avatarUrl || avatarUrl.startsWith("data:image") || avatarUrl.trim() === "") {
        // Intenta obtener por ID o username
        let userId = user && (user.id || user.username);
        if (!userId && user && user.email) userId = user.email;
        if (userId) {
          try {
            // Buscar por ID
            let res = await fetch(`${API_URL}/usuarios/${encodeURIComponent(userId)}`);
            if (res.ok) {
              const apiUser = await res.json();
              if (apiUser && apiUser.avatar) {
                avatarUrl = apiUser.avatar;
                if (apiUser.username) username = apiUser.username;
              }
            }
          } catch {}
        }
      }
      // 3. Si sigue sin avatar, busca en /usuarios y filtra por username
      if ((!avatarUrl || avatarUrl.startsWith("data:image") || avatarUrl.trim() === "") && username) {
        try {
          let res = await fetch(`${API_URL}/usuarios`);
          if (res.ok) {
            const users = await res.json();
            const found = users.find(u => u.username === username || u.id === username);
            if (found && found.avatar) avatarUrl = found.avatar;
          }
        } catch {}
      }
      // 4. Si aún no hay avatar, usa generador externo
      if (!avatarUrl || avatarUrl.trim() === "" || avatarUrl.startsWith("data:image")) {
        avatarUrl = "https://ui-avatars.com/api/?name=" + encodeURIComponent(username || "Player");
      }
      // Actualiza header
      const avatarImg = document.getElementById("header-avatar");
      const usernameSpan = document.getElementById("header-username");
      if (avatarImg) {
        avatarImg.src = avatarUrl;
        avatarImg.onerror = function() {
          avatarImg.src = "https://ui-avatars.com/api/?name=" + encodeURIComponent(username || "Player");
        };
      }
      if (usernameSpan) usernameSpan.textContent = username || "Player";
    } catch (e) {
      console.error("Error loading user data for header", e);
    }

    // Pausar música anterior y reproducir title.mp3
    try {
      const bgMusic = document.getElementById("bg-music");
      if (bgMusic && !bgMusic.paused) {
        fadeOutAudio(bgMusic, 1000);
        setTimeout(() => { bgMusic.pause(); bgMusic.currentTime = 0 }, 1000);
      }
      const titleMusic = document.getElementById("title-music");
      if (titleMusic) {
        titleMusic.volume = 0;
        const fadeIn = () => {
          let v = 0;
          const fade = setInterval(() => {
            v += 0.05;
            titleMusic.volume = Math.min(v, 1);
            if (v >= 1) clearInterval(fade);
          }, 50);
        };
        const tryPlay = () => {
          titleMusic.play().then(fadeIn).catch(() => {
            // Autoplay bloqueado, esperar interacción
            const startAudio = () => {
              titleMusic.play().then(fadeIn);
              document.removeEventListener("click", startAudio);
              document.removeEventListener("keydown", startAudio);
            };
            document.addEventListener("click", startAudio);
            document.addEventListener("keydown", startAudio);
          });
        };
        tryPlay();
        // Visual animado
        const visual = document.getElementById("music-visual");
        if (visual) {
          visual.innerHTML = `<div class="music-bars">
            <div class="bar" style="animation-delay:0s"></div>
            <div class="bar" style="animation-delay:0.1s"></div>
            <div class="bar" style="animation-delay:0.2s"></div>
            <div class="bar" style="animation-delay:0.3s"></div>
            <div class="bar" style="animation-delay:0.4s"></div>
          </div>`;
        }
      }
    } catch (e) {
      console.error("Error loading user data for header", e);
    }
  }

  function transitionToApp() {
    if (!isTitleScreenActive) return
    isTitleScreenActive = false

    // Desvanecer música
    fadeOutAudio(bgMusic, 1000)

    // Desvanecer Title Screen
    titleScreen.classList.add("fade-out")

    setTimeout(() => {
      titleScreen.classList.add("hidden")

      checkFirstTimeSetup()
      // Start a one-time ban-check executor when the title screen is dismissed
      try {
        if (!window._banCheckExecutorStarted) {
          window._banCheckExecutorStarted = true
          // immediate attempt and then a repeating 10s interval
          const tryCall = () => {
            if (typeof window.triggerBanCheck === 'function') {
              try { window.triggerBanCheck() } catch(e){ console.error('[ban-executor] initial call error', e) }
            } else {
              console.log('[ban-executor] triggerBanCheck not defined yet; will keep trying')
            }
          }
          tryCall()
          window._banCheckExecutorInterval = setInterval(() => {
            if (typeof window.triggerBanCheck === 'function') {
              try { window.triggerBanCheck() } catch(e){ console.error('[ban-executor] interval call error', e) }
            } else {
              console.log('[ban-executor] triggerBanCheck not defined yet')
            }
          }, 10000)
          console.log('[ban-executor] started; calling every 10s')
        }
      } catch (e) {
        console.error('[ban-executor] failed to start', e)
      }
    }, 800)
  }

  function checkFirstTimeSetup() {
    const isSetupDone = localStorage.getItem("astralx_setup_complete")
    const hasToken = localStorage.getItem("astralToken")

    if (isSetupDone === "true" && hasToken) {
      showApp()
    } else {
      showSetupScreen()
    }
  }

  function showSetupScreen() {
    setupScreen.classList.remove("hidden")
    initAvatarPreview()
    initSetupTabs() // Init tabs logic
  }

  function initSetupTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn")
    const setupForm = document.getElementById("setup-form")
    const loginForm = document.getElementById("login-form")
    const title = document.getElementById("setup-title")
    const subtitle = document.getElementById("setup-subtitle")

    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove active class from all
        tabBtns.forEach((b) => b.classList.remove("active"))
        // Add to clicked
        btn.classList.add("active")

        const tab = btn.dataset.tab

        if (tab === "login") {
          setupForm.classList.add("hidden")
          loginForm.classList.remove("hidden")
          title.textContent = "BIENVENIDO DE NUEVO"
          subtitle.textContent = "Ingresa a tu cuenta AstralX"
        } else {
          loginForm.classList.add("hidden")
          setupForm.classList.remove("hidden")
          title.textContent = "CONFIGURACIÓN INICIAL"
          subtitle.textContent = "Crea tu identidad en AstralX"
        }
      })
    })
  }

  const loginForm = document.getElementById("login-form")
  const loginErrorMsg = document.getElementById("login-error")



  // --- SISTEMA DE INICIO DE SESIÓN CLONADO DE BASEVIEJA ---
  function saveSession(token, user) {
    localStorage.setItem("astralToken", token);
    localStorage.setItem("astralUser", JSON.stringify(user));
    localStorage.setItem("astralx_setup_complete", "true");
  }

  async function loginBaseVieja(username, password) {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token && data.user) {
      saveSession(data.token, data.user);
      return data.user;
    } else {
      throw new Error(data.message || data.error || "Credenciales incorrectas");
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginErrorMsg.textContent = "Autenticando...";
      loginErrorMsg.style.color = "#4169e1";

      // Adaptar a los IDs del HTML actual
      const username = document.getElementById("login-id").value.trim();
      const password = document.getElementById("login-password").value;

      if (!username || !password) {
        loginErrorMsg.textContent = "Usuario y contraseña son requeridos";
        loginErrorMsg.style.color = "#ff3c3c";
        return;
      }

      try {
        await loginBaseVieja(username, password);
        loginErrorMsg.textContent = "¡Bienvenido! Redirigiendo...";
        loginErrorMsg.style.color = "#00ffc8";
        setTimeout(() => {
          setupScreen.classList.add("hidden");
          showApp();
        }, 600);
      } catch (error) {
        loginErrorMsg.textContent = error.message || "Error de autenticación";
        loginErrorMsg.style.color = "#ff3c3c";
      }
    });
  }

  const setupForm = document.getElementById("setup-form")
  const errorMsg = document.getElementById("setup-error")

  if (setupForm) {
    setupForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      errorMsg.textContent = "Procesando..."
      errorMsg.style.color = "#4169e1"

      const id = document.getElementById("setup-id").value.trim()
      const username = document.getElementById("setup-name").value.trim()
      const surname = document.getElementById("setup-surname").value.trim()
      const password = document.getElementById("setup-password").value
      const age = document.getElementById("setup-age").value
      const gender = document.getElementById("setup-gender").value
      const bio = document.getElementById("setup-bio").value

      let avatar = document.getElementById("setup-avatar-url").value.trim()

      // Use preview src (base64) if file selected
      const preview = document.getElementById("avatar-preview")
      const fileInput = document.getElementById("setup-avatar-file")
      if (fileInput.files.length > 0) {
        avatar = preview.src
      }

      try {
        // 1. Register
        const registerRes = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: id,
            name: username,
            password: password,
          }),
        })

        const regData = await registerRes.json()
        if (!regData.success) throw new Error(regData.error || "Error en registro")

        const token = regData.token
        localStorage.setItem("astralToken", token)
        localStorage.setItem("astralUser", JSON.stringify(regData.user))

        // 2. Update Profile
        const updateRes = await fetch(`${API_URL}/usuarios/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            apellido: surname,
            edad: age,
            genero: gender,
            bio: bio,
            avatar: avatar,
          }),
        })

        const updateData = await updateRes.json()

        if (updateData.success || updateData.shopData) {
          localStorage.setItem("astralx_setup_complete", "true")

          // Hide setup, show app
          setupScreen.style.transition = "opacity 0.5s"
          setupScreen.style.opacity = "0"
          setTimeout(() => {
            setupScreen.classList.add("hidden")
            showApp()
          }, 500)
        } else {
          throw new Error("Cuenta creada, error guardando detalles.")
        }
      } catch (error) {
        console.error(error)
        errorMsg.textContent = error.message
        errorMsg.style.color = "#ff3366"
      }
    })
  }

  // --- FOOTER DRAWER ANIMADO ---

  function createFooterDrawer() {
    // Solo mostrar si appScreen está visible
    const appScreen = document.getElementById("app-screen");
    if (!appScreen || appScreen.classList.contains("hidden")) return;

    // Elimina sidebar anterior si existe
    const oldSidebar = document.getElementById("main-sidebar");
    if (oldSidebar && oldSidebar.parentNode) oldSidebar.parentNode.removeChild(oldSidebar);
    // Elimina drawer anterior si existe
    const oldDrawer = document.getElementById("footer-drawer");
    if (oldDrawer && oldDrawer.parentNode) oldDrawer.parentNode.removeChild(oldDrawer);
    const oldBtn = document.getElementById("footer-drawer-btn");
    if (oldBtn && oldBtn.parentNode) oldBtn.parentNode.removeChild(oldBtn);


    // Crea el drawer/footer oculto
    const drawer = document.createElement("nav");
    drawer.id = "footer-drawer";
    drawer.className = "footer-drawer";
    drawer.innerHTML = `
      <button class="drawer-close" id="drawer-close-btn" title="Cerrar"><span style="font-size:1.5em;">✖</span></button>
      <button class="drawer-item" data-section="home">
        <span class="drawer-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5L12 4l9 5.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9.5z"></path><path d="M9 22V12h6v10"></path></svg></span>
        <span class="drawer-label">Inicio</span>
      </button>
      <button class="drawer-item" data-section="games">
        <span class="drawer-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16v12H4z"></path><path d="M8 10h8v4H8z"></path></svg></span>
        <span class="drawer-label">Juegos</span>
      </button>
      <button class="drawer-item" data-section="community">
        <span class="drawer-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></span>
        <span class="drawer-label">Comunidad</span>
      </button>
      <button class="drawer-item" data-section="profile">
        <span class="drawer-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"></circle><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"></path></svg></span>
        <span class="drawer-label">Perfil</span>
      </button>
    `;
    document.body.appendChild(drawer);

    // Fallback: bind profile button directly in case event delegation misses it
    try {
      drawer.querySelectorAll('.drawer-item[data-section="profile"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const mainContent = document.getElementById('main-content');
          if (mainContent) mainContent.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
          const profileSection = document.getElementById('section-profile');
          if (profileSection) profileSection.classList.add('active');
          try { initProfileUI(); } catch (err) { console.error('initProfileUI error', err); }
        });
      });
    } catch (e) { /* ignore */ }

    // Crea el botón flotante con flecha (después del drawer para que esté encima)
    const drawerBtn = document.createElement("button");
    drawerBtn.id = "footer-drawer-btn";
    drawerBtn.className = "footer-drawer-btn";
    drawerBtn.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 15l6-6 6 6"/></svg>`;
    document.body.appendChild(drawerBtn);

    // Animación y lógica de mostrar/ocultar
    let isOpen = false;
    function openDrawer() {
      drawer.classList.add("open");
      drawerBtn.style.display = "none";
      isOpen = true;
    }
    function closeDrawer() {
      drawer.classList.remove("open");
      setTimeout(() => { drawerBtn.style.display = "flex"; }, 350); // Espera animación
      isOpen = false;
    }
    drawerBtn.onclick = (e) => {
      e.stopPropagation();
      if (isOpen) closeDrawer();
      else openDrawer();
    };
    // Botón cerrar dentro del drawer
    drawer.querySelector('#drawer-close-btn').onclick = (e) => {
      e.stopPropagation();
      closeDrawer();
    };
    // Cierra al hacer click en una opción
    drawer.addEventListener("click", (e) => {
      const btn = e.target.closest(".drawer-item");
      if (!btn) return;
      // SFX al hacer clic en drawer
      const sfx = document.getElementById('sfx-audio');
      if (sfx) { sfx.currentTime = 0; sfx.play(); }
      // Navega a la sección
      const section = btn.dataset.section;
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.querySelectorAll(".content-section").forEach(sec => sec.classList.remove("active"));
        if (section === "home") {
          const homeSection = document.getElementById("section-home");
          if (homeSection) homeSection.classList.add("active");
        } else if (section === "community") {
          showCommunitySection();
        } else if (section === "games") {
          // Show games section and populate cards
          const gamesSection = document.getElementById('section-games');
          if (gamesSection) gamesSection.classList.add('active');
          if (typeof populateGamesSection === 'function') {
            try { populateGamesSection(); } catch (e) { console.error('Error populating games:', e); }
          }
        } else if (section === "profile") {
          const profileSection = document.getElementById('section-profile');
          if (profileSection) profileSection.classList.add('active');
          try { initProfileUI(); } catch (e) { console.error('initProfileUI error', e); }
        } else if (btn.dataset.action === 'open-settings' || section === 'settings') {
          // Open settings modal
          const modal = document.getElementById('settingsModal');
          if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
          try { initSettingsUI(); } catch (e) { console.error('initSettingsUI error', e); }
        }
      }
      closeDrawer();
    });
    // Cierra si se hace click fuera del drawer y botón
    setTimeout(() => {
      document.addEventListener("click", outsideClickHandler);
    }, 0);
    function outsideClickHandler(e) {
      if (isOpen && !drawer.contains(e.target) && e.target !== drawerBtn) {
        closeDrawer();
      }
    }
  }

    // --- PROFILE: init and save profile UI ---
    async function initProfileUI(){
      try{
        const user = JSON.parse(localStorage.getItem('astralUser') || '{}') || {};
        const id = user.id || user.username || '';
        const nameEl = document.getElementById('profile-name');
        const idEl = document.getElementById('profile-id');
        const surnameEl = document.getElementById('profile-surname');
        const ageEl = document.getElementById('profile-age');
        const genderEl = document.getElementById('profile-gender');
        const bioEl = document.getElementById('profile-bio');
        const avatarUrlEl = document.getElementById('profile-avatar-url');
        const avatarFileEl = document.getElementById('profile-avatar-file');
        const preview = document.getElementById('avatar-preview-profile');
        const msg = document.getElementById('profile-msg');
        if (idEl) idEl.value = id;
        // Try to fetch latest user profile from API to populate fields reliably
        let fetched = null;
        try {
          const base = (typeof API_URL !== 'undefined') ? API_URL : ((typeof API !== 'undefined') ? API : '');
          if (id && base) {
            const resp = await fetch(`${base}/usuarios/${encodeURIComponent(id)}`);
            if (resp && resp.ok) {
              fetched = await resp.json();
            }
          }
        } catch (e) {
          console.warn('Could not fetch profile from API', e);
          fetched = null;
        }

        const source = Object.assign({}, user, fetched || {});
        if (nameEl) nameEl.value = source.name || source.username || '';
        if (surnameEl) surnameEl.value = source.apellido || source.surname || '';
        if (ageEl) ageEl.value = source.edad || source.age || '';
        if (genderEl) genderEl.value = source.genero || source.gender || 'unspecified';
        if (bioEl) bioEl.value = source.bio || '';
        if (avatarUrlEl) avatarUrlEl.value = source.avatar || '';
        if (preview) preview.src = source.avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(source.name || source.username || 'Player'));
        if (msg) msg.textContent = '';

        // file input preview
        if (avatarFileEl) {
          avatarFileEl.onchange = function(e){
            const f = avatarFileEl.files && avatarFileEl.files[0];
            if (!f) return;
            const reader = new FileReader();
            reader.onload = function(ev){ if(preview) preview.src = ev.target.result; };
            reader.readAsDataURL(f);
          }
        }

        // url input preview
        if (avatarUrlEl) {
          avatarUrlEl.addEventListener('input', (e)=>{
            const v = (avatarUrlEl.value||'').trim();
            if (!v) return;
            try{ if(preview) preview.src = v; }catch(e){}
          })
        }

            // save handler
        const saveBtn = document.getElementById('profile-save-btn');
        if (saveBtn) {
          saveBtn.onclick = async function(){
            try{
              if (msg) { msg.style.color = '#9fdcff'; msg.textContent = 'Guardando...'; }
              const token = localStorage.getItem('astralToken');
              if (!token) { alert('Debes iniciar sesión para editar tu perfil'); if(msg) { msg.style.color='#ff6666'; msg.textContent='No autenticado'; } return; }
              const payload = {};
              if (nameEl) payload.name = nameEl.value.trim();
              if (surnameEl) payload.apellido = surnameEl.value.trim();
              if (ageEl) payload.edad = ageEl.value ? Number(ageEl.value) : undefined;
              if (genderEl) payload.genero = genderEl.value;
              if (bioEl) payload.bio = bioEl.value.trim();
              // avatar: prefer file preview if file selected
              let avatarVal = '';
              if (avatarFileEl && avatarFileEl.files && avatarFileEl.files.length > 0) {
                // the preview src was set by FileReader; use it
                avatarVal = document.getElementById('avatar-preview-profile').src || '';
              } else if (avatarUrlEl && (avatarUrlEl.value||'').trim() !== '') {
                avatarVal = avatarUrlEl.value.trim();
              }
              if (avatarVal) payload.avatar = avatarVal;

              // remove undefined
              Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });

              const userId = id;
              const res = await fetch(`${API_URL}/usuarios/${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
              });
              const data = await res.json();
              if (res.ok && (data.success || data.user)) {
                // merge into localStorage astralUser
                const store = JSON.parse(localStorage.getItem('astralUser') || '{}');
                const updated = Object.assign({}, store, payload, (data.user || {}));
                localStorage.setItem('astralUser', JSON.stringify(updated));
                if (msg) { msg.style.color = '#7fffd4'; msg.textContent = 'Guardado correctamente'; }
                // update header avatar/username
                try{ const h = document.getElementById('header-avatar'); if(h && updated.avatar) h.src = updated.avatar; const hu = document.getElementById('header-username'); if(hu && (updated.name || updated.username)) hu.textContent = updated.name || updated.username; }catch(e){}
              } else {
                if (msg) { msg.style.color = '#ff6666'; msg.textContent = (data && (data.error||data.message)) || 'Error al guardar'; }
              }
            }catch(err){ console.error('save profile failed', err); if (document.getElementById('profile-msg')){ document.getElementById('profile-msg').style.color='#ff6666'; document.getElementById('profile-msg').textContent='Error al guardar'; } }
          }
        }

      }catch(e){ console.error('initProfileUI error', e); }
    }

    // --- SETTINGS: persistencia y aplicación de ajustes de UI ---
    const SETTINGS_KEY = 'astralx_settings';
    function defaultSettings(){
      return {
        theme: 'dark',
        accent: '#4169e1',
        fontSize: 16,
        showAvatars: true,
        headerColor: '#0f1724',
        footerColor: '#0b0d12',
        iframeFs: 'iframe',
        reducedMotion: false
      };
    }
    function loadSettings(){
      try{
        const raw = localStorage.getItem(SETTINGS_KEY);
        if(!raw) return defaultSettings();
        const parsed = JSON.parse(raw);
        return Object.assign(defaultSettings(), parsed);
      }catch(e){ console.warn('Failed to load settings, using defaults', e); return defaultSettings(); }
    }
    function saveSettings(settings){
      try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); applySettings(settings); }
      catch(e){ console.error('saveSettings failed', e); }
    }
    function applySettings(settings){
      if(!settings) settings = loadSettings();
      
      // <CHANGE> Aplicar color de acento
      try{ 
        document.documentElement.style.setProperty('--accent-color', settings.accent || defaultSettings().accent); 
      }catch(e){}
      
      // <CHANGE> Aplicar tamaño de fuente al root
      try{ 
        document.documentElement.style.fontSize = (settings.fontSize || 16) + 'px'; 
      }catch(e){}
      
      // <CHANGE> Aplicar color del header directamente al elemento
      try{ 
        const header = document.getElementById('header');
        if(header && settings.headerColor) {
          header.style.background = settings.headerColor;
        }
      }catch(e){}
      
      // <CHANGE> Aplicar color de la barra inferior directamente al elemento
      try{ 
        const footer = document.querySelector('.bottom-nav');
        if(footer && settings.footerColor) {
          footer.style.background = settings.footerColor;
        }
      }catch(e){}
      
      // <CHANGE> Ocultar/mostrar avatares con CSS
      try{ 
        if(settings.showAvatars === false) {
          document.body.classList.add('hide-avatars'); 
        } else {
          document.body.classList.remove('hide-avatars'); 
        }
      }catch(e){}
      
      // <CHANGE> Reducir animaciones
      try{ 
        if(settings.reducedMotion) {
          document.body.classList.add('reduced-motion'); 
        } else {
          document.body.classList.remove('reduced-motion'); 
        }
      }catch(e){}
      
      // <CHANGE> Aplicar tema claro/oscuro
      try{
        if(settings.theme === 'light') {
          document.body.classList.add('light-theme'); 
        } else {
          document.body.classList.remove('light-theme'); 
        }
      }catch(e){}
      
      // <CHANGE> Guardar preferencia de fullscreen para el iframe
      try{ 
        window.__ASTRAL_SETTINGS = window.__ASTRAL_SETTINGS || {}; 
        window.__ASTRAL_SETTINGS.iframeFs = settings.iframeFs || 'iframe'; 
      }catch(e){}
    }

    function initSettingsUI(){
      const s = loadSettings();
      const elTheme = document.getElementById('settings-theme'); if(elTheme) elTheme.value = s.theme;
      const elAccent = document.getElementById('settings-accent'); if(elAccent) elAccent.value = s.accent;
      const elFont = document.getElementById('settings-font-size'); if(elFont) elFont.value = s.fontSize;
      const elAv = document.getElementById('settings-show-avatars'); if(elAv) elAv.checked = !!s.showAvatars;
      const elHeaderColor = document.getElementById('settings-header-color'); if(elHeaderColor) elHeaderColor.value = s.headerColor || '#0f1724';
      const elFooterColor = document.getElementById('settings-footer-color'); if(elFooterColor) elFooterColor.value = s.footerColor || '#0b0d12';
      const elFs = document.getElementById('settings-iframe-fs'); if(elFs) elFs.value = s.iframeFs || 'iframe';
      const elRm = document.getElementById('settings-reduced-motion'); if(elRm) elRm.checked = !!s.reducedMotion;

      const applyBtn = document.getElementById('settings-apply');
      const saveBtn = document.getElementById('settings-save');
      const resetBtn = document.getElementById('settings-reset');
      function readUI(){
        return {
          theme: (elTheme && elTheme.value) || 'dark',
          accent: (elAccent && elAccent.value) || '#4169e1',
          fontSize: parseInt((elFont && elFont.value) || '16',10),
          showAvatars: !!(elAv && elAv.checked),
          headerColor: (elHeaderColor && elHeaderColor.value) || '#0f1724',
          footerColor: (elFooterColor && elFooterColor.value) || '#0b0d12',
          iframeFs: (elFs && elFs.value) || 'iframe',
          reducedMotion: !!(elRm && elRm.checked)
        };
      }
      if(applyBtn) applyBtn.onclick = (e)=>{ e.preventDefault(); applySettings(readUI()); };
      if(saveBtn) saveBtn.onclick = (e)=>{ e.preventDefault(); saveSettings(readUI()); };
      if(resetBtn) resetBtn.onclick = (e)=>{ e.preventDefault(); const d = defaultSettings(); saveSettings(d); initSettingsUI(); };
    }

    // Apply settings on load and bind header settings button
    try{
      document.addEventListener('DOMContentLoaded', ()=>{
        applySettings(loadSettings());
        // Header settings button binding
        try{
          const headerSettingsBtn = document.getElementById('btn-settings');
          if (headerSettingsBtn) headerSettingsBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const modal = document.getElementById('settingsModal');
            if (modal) { modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
            try { initSettingsUI(); } catch (e) { console.error('initSettingsUI error', e); }
          });
        }catch(e){}
      });
    }catch(e){}

  // --- SFX al hacer hover en botones/campos ---
  function setupSFXHover() {
    let sfx = document.getElementById('sfx-audio');
    if (!sfx) {
      sfx = document.createElement('audio');
      sfx.id = 'sfx-audio';
      sfx.src = 'sfx.mp3';
      document.body.appendChild(sfx);
    }
    // Helper para reproducir solo una vez por hover
    function playSFXOnce(e) {
      if (!e.target._hovered) {
        sfx.currentTime = 0;
        sfx.play();
        e.target._hovered = true;
      }
    }
    function clearSFXHover(e) {
      e.target._hovered = false;
    }
    // Botones y campos de texto
    const allBtns = document.querySelectorAll('button, input, select, textarea');
    allBtns.forEach(el => {
      el.addEventListener('mouseenter', playSFXOnce);
      el.addEventListener('mouseleave', clearSFXHover);
      el.addEventListener('blur', clearSFXHover);
    });
  }

  // Llamar SFX setup al cargar UI principal
  setupSFXHover();

  // Efecto de fade-out para el audio
  function fadeOutAudio(audio, duration) {
    const step = 0.05;
    const intervalTime = duration * step;
    let volume = audio.volume;
    const fadeInterval = setInterval(() => {
      if (volume > 0) {
        volume = Math.max(0, volume - step);
        audio.volume = volume;
      } else {
        audio.volume = 0;
        clearInterval(fadeInterval);
      }
    }, intervalTime);
  }

  // Event Listener para ENTER
  document.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && isTitleScreenActive) {
      transitionToApp()
    }
  })

  // Opcional: Permitir clic también si no tienen teclado a mano (UX básica)
  /* 
    titleScreen.addEventListener('click', () => {
        if (isTitleScreenActive) transitionToApp();
    }); 
    */
})

