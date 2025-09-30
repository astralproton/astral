// --- AVATAR PERSONALIZADO ---
function setProfileAvatar(src) {
    const img = document.getElementById('profileAvatarImg');
    const icon = document.getElementById('profileAvatarIcon');
    if (src) {
        img.src = src;
        img.style.display = '';
        icon.style.display = 'none';
        localStorage.setItem('profileAvatar', src);
    } else {
        img.src = '';
        img.style.display = 'none';
        icon.style.display = '';
        localStorage.removeItem('profileAvatar');
    }
    // También actualizar header
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar) {
        let headerImg = headerAvatar.querySelector('img');
        let headerIcon = headerAvatar.querySelector('i');
        if (!headerImg) {
            headerImg = document.createElement('img');
            headerImg.style.width = '100%';
            headerImg.style.height = '100%';
            headerImg.style.objectFit = 'cover';
            headerImg.style.borderRadius = '50%';
            headerAvatar.insertBefore(headerImg, headerIcon);
        }
        if (src) {
            headerImg.src = src;
            headerImg.style.display = '';
            if (headerIcon) headerIcon.style.display = 'none';
        } else {
            headerImg.src = '';
            headerImg.style.display = 'none';
            if (headerIcon) headerIcon.style.display = '';
        }
    }
}

function initProfileAvatar() {
    const saved = localStorage.getItem('profileAvatar');
    setProfileAvatar(saved);
    // Botón subir archivo
    const uploadBtn = document.getElementById('avatarUploadBtn');
    const fileInput = document.getElementById('avatarFileInput');
    const urlInput = document.getElementById('avatarUrlInput');
    if (uploadBtn && fileInput) {
        uploadBtn.onclick = () => fileInput.click();
        fileInput.onchange = e => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = ev => {
                    setProfileAvatar(ev.target.result);
                };
                reader.readAsDataURL(file);
            }
        };
    }
    if (urlInput) {
        urlInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const url = urlInput.value.trim();
                if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
                    // Validar imagen
                    const testImg = new window.Image();
                    testImg.onload = () => setProfileAvatar(url);
                    testImg.onerror = () => alert('URL de imagen no válida');
                    testImg.src = url;
                } else {
                    alert('Pega una URL de imagen válida (http/https)');
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('profileAvatar')) {
        initProfileAvatar();
    }
});
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    return user.id;
}

// --- AUTENTICACIÓN AstralProton API MODERNA ---
const API = 'https://astral-ban-api.onrender.com';

// Mostrar/Ocultar modal
function showAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
  document.querySelector('.main-container').style.display = 'none';
}
function hideAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  document.body.style.overflow = '';
  document.querySelector('.main-container').style.display = '';
}

// Guardar sesión
function saveSession(token, user) {
  localStorage.setItem('astralToken', token);
  localStorage.setItem('astralUser', JSON.stringify(user));
}

// Cerrar sesión
function clearSession() {
  localStorage.removeItem('astralToken');
  localStorage.removeItem('astralUser');
  location.reload();
}

// Verificar token con la API
async function verifyToken() {
  const token = localStorage.getItem('astralToken');
  if (!token) return false;
  try {
    const res = await fetch(`${API}/verify-token`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    return data.valid && data.user;
  } catch {
    return false;
  }
}

// Login
async function login(username, password) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (data.success && data.token) {
    saveSession(data.token, data.user);
    return true;
  }
  throw new Error(data.error || 'Error al iniciar sesión');
}

// Registro
async function register(username, name, password) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, name, password })
  });
  const data = await res.json();
  if (data.success && data.token) {
    saveSession(data.token, data.user);
    return true;
  }
  throw new Error(data.error || 'Error al registrar');
}

// --- PERFIL: Cargar y guardar datos desde la API ---
async function fetchUserProfile(userId, token) {
    try {
        const res = await fetch(`${API}/usuarios/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('No se pudo cargar el perfil');
        return await res.json();
    } catch (e) {
        return null;
    }
}

async function saveUserProfile(userId, token, profileData) {
    try {
        const res = await fetch(`${API}/usuarios/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });
        return await res.json();
    } catch (e) {
        return { success: false, error: e.message };
    }
}

// --- Inicializar perfil sincronizado ---
async function initProfile() {
    const profileForm = document.getElementById('profileForm');
    const profileSurname = document.getElementById('profileSurname');
    const profileAge = document.getElementById('profileAge');
    const genderMale = document.getElementById('genderMale');
    const genderFemale = document.getElementById('genderFemale');
    const avatarUrlInput = document.getElementById('avatarUrlInput');
    const profileBio = document.getElementById('profileBio');

    // Obtener usuario autenticado
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    const userId = user.id;
    const token = localStorage.getItem('astralToken');
    if (!userId || !token) return;

    // Cargar datos del perfil desde la API
    const profile = await fetchUserProfile(userId, token);
    if (!profile) return;

    // Sincronizar campos del formulario
    profileSurname.value = profile.apellido || '';
    profileAge.value = profile.edad || '';
    profileBio.value = profile.bio || '';
    avatarUrlInput.value = profile.avatar || '';
    setProfileAvatar(profile.avatar);
    if (profile.genero === 'male') genderMale.checked = true;
    if (profile.genero === 'female') genderFemale.checked = true;

    // Guardar cambios al enviar el formulario
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const apellido = profileSurname.value;
        const edad = profileAge.value;
        const bio = profileBio.value;
        const genero = genderMale.checked ? 'male' : genderFemale.checked ? 'female' : null;
        const avatar = avatarUrlInput.value;

        const profileData = { apellido, edad, bio, genero, avatar };
        const result = await saveUserProfile(userId, token, profileData);

        if (result.success) {
            showAlert('Perfil guardado', 'Tus datos se han actualizado correctamente.');
        } else {
            showAlert('Error', result.error || 'No se pudo guardar el perfil.');
        }
    });
}

async function guardarPerfilUsuario() {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) return alert('No hay sesión activa.');

    // Recoge los datos del formulario
    const avatar = document.getElementById('profileAvatarImg')?.src || null;
    const bio = document.getElementById('profileBio')?.value.trim() || null;
    const edad = parseInt(document.getElementById('profileAge')?.value, 10) || null;
    const apellido = document.getElementById('profileSurname')?.value.trim() || null;
    const genero = document.getElementById('genderMale')?.checked ? 'male' :
                   document.getElementById('genderFemale')?.checked ? 'female' : null;

    // PATCH a la API
    const res = await fetch(`${API}/usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar, bio, edad, apellido, genero })
    });
    const data = await res.json();
    if (data.success) {
        alert('Perfil guardado correctamente');
    } else {
        alert('Error al guardar perfil: ' + (data.error || ''));
    }
}

document.addEventListener('DOMContentLoaded', initProfile);

// --- UI ---
document.addEventListener('DOMContentLoaded', async () => {
  // Si ya hay sesión válida, no mostrar modal
  const tokenOk = await verifyToken();
  if (tokenOk) {
    hideAuthModal();
    document.querySelector('.main-container').style.display = '';
    return;
  }
  showAuthModal();

  // Elementos
  const authForm = document.getElementById('authForm');
  const authTitle = document.getElementById('authTitle');
  const authNameField = document.getElementById('authNameField');
  const authName = document.getElementById('authName');
  const authUsername = document.getElementById('authUsername');
  const authPassword = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authSwitchBtn = document.getElementById('authSwitchBtn');
  const authError = document.getElementById('authError');

  let isRegister = false;

  function switchMode() {
    isRegister = !isRegister;
    authTitle.textContent = isRegister ? 'Registrarse' : 'Iniciar Sesión';
    authSubmitBtn.textContent = isRegister ? 'Registrarse' : 'Iniciar Sesión';
    authSwitchBtn.textContent = isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
    authNameField.style.display = isRegister ? '' : 'none';
    authError.textContent = '';
  }
  authSwitchBtn.onclick = switchMode;

  authForm.onsubmit = async (e) => {
    e.preventDefault();
    authError.textContent = '';
    const username = authUsername.value.trim().toLowerCase();
    const password = authPassword.value;
    if (!username || !password || (isRegister && !authName.value.trim())) {
      authError.textContent = 'Completa todos los campos.';
      return;
    }
    if (isRegister && password.length < 6) {
      authError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }
    try {
      if (isRegister) {
        await register(username, authName.value.trim(), password);
      } else {
        await login(username, password);
      }
      hideAuthModal();
      document.querySelector('.main-container').style.display = '';
      location.reload();
    } catch (err) {
      authError.textContent = err.message;
    }
  };
});

// --- Proteger la app si no hay sesión ---
(async function () {
  const tokenOk = await verifyToken();
  if (!tokenOk) {
    document.querySelector('.main-container').style.display = 'none';
  } else {
    document.querySelector('.main-container').style.display = '';
  }
})();

// --- OPCIONAL: Botón de cerrar sesión en el perfil ---
document.addEventListener('DOMContentLoaded', () => {
  const profileSection = document.getElementById('profileSection');
  if (profileSection && !document.getElementById('logoutBtn')) {
    const btn = document.createElement('button');
    btn.id = 'logoutBtn';
    btn.className = 'background-button danger';
    btn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Cerrar sesión';
    btn.onclick = clearSession;
    profileSection.querySelector('.profile-container').appendChild(btn);
  }
});

// --- SISTEMA DE AMIGOS ---

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

// Listar solicitudes recibidas
async function cargarSolicitudesAmistad() {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) return;
    const res = await fetch(`${API}/amigos/solicitudes/${user.id}`);
    const solicitudes = await res.json();
    // Renderiza en tu UI
    renderSolicitudesAmistad(solicitudes);
}

// Listar amigos
async function cargarAmigos() {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) return;
    const res = await fetch(`${API}/amigos/lista/${user.id}`);
    const amigos = await res.json();
    // Renderiza en tu UI
    renderListaAmigos(amigos);
}

// Aceptar/rechazar solicitud
async function responderSolicitudAmistad(id, aceptar) {
    const res = await fetch(`${API}/amigos/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, aceptar })
    });
    const data = await res.json();
    if (data.success) {
        showAlert('Solicitud actualizada', aceptar ? '¡Ahora son amigos!' : 'Solicitud rechazada.');
        cargarSolicitudesAmistad();
        cargarAmigos();
    } else {
        showAlert('Error', data.error || 'No se pudo actualizar la solicitud.');
    }
}

// Eliminar amigo
async function eliminarAmigo(amigoId) {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) return;
    const res = await fetch(`${API}/amigos/eliminar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amigoId })
    });
    const data = await res.json();
    if (data.success) {
        showAlert('Amigo eliminado', 'Ya no tienes a este usuario como amigo.');
        cargarAmigos();
    } else {
        showAlert('Error', data.error || 'No se pudo eliminar al amigo.');
    }
}

function renderSolicitudesAmistad(solicitudes) {
    const lista = document.getElementById('friendRequestsList');
    if (!lista) return;
    lista.innerHTML = '';
    if (!solicitudes.length) {
        lista.innerHTML = '<li style="opacity:0.7;">No tienes solicitudes pendientes.</li>';
        return;
    }
    solicitudes.forEach(sol => {
        const li = document.createElement('li');
        li.className = 'friend-request-item';
        li.innerHTML = `
            <div class="friend-avatar"><i class="fas fa-user"></i></div>
            <span class="friend-name">${sol.de}</span>
            <span class="friend-id">ID: ${sol.de}</span>
            <div class="friend-actions">
                <button class="friend-btn accept" onclick="responderSolicitudAmistad(${sol.id}, true)">Aceptar</button>
                <button class="friend-btn reject" onclick="responderSolicitudAmistad(${sol.id}, false)">Rechazar</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function renderListaAmigos(amigos) {
    const lista = document.getElementById('friendList');
    const myId = getCurrentUserId();
    if (!lista) return;
    lista.innerHTML = '';
    if (!amigos.length) {
        lista.innerHTML = '<li style="opacity:0.7;">No tienes amigos aún.</li>';
        return;
    }
    amigos.forEach(am => {
        const amigoId = am.de === myId ? am.para : am.de;
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.innerHTML = `
            <div class="friend-avatar"><i class="fas fa-user"></i></div>
            <span class="friend-name">${amigoId}</span>
            <span class="friend-id">ID: ${amigoId}</span>
            <div class="friend-actions">
                <button class="friend-btn remove" onclick="eliminarAmigo('${amigoId}')">Eliminar</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function renderListaAmigos(amigos) {
    const lista = document.getElementById('friendList');
    const myId = getCurrentUserId();
    if (!lista) return;
    lista.innerHTML = '';
    if (!amigos.length) {
        lista.innerHTML = '<li style="opacity:0.7;">No tienes amigos aún.</li>';
        return;
    }
    amigos.forEach(am => {
        const amigoId = am.de === myId ? am.para : am.de;
        const li = document.createElement('li');
        li.className = 'friend-item';
        li.innerHTML = `
            <div class="friend-avatar"><i class="fas fa-user"></i></div>
            <span class="friend-name">${amigoId}</span>
            <span class="friend-id">ID: ${amigoId}</span>
            <div class="friend-actions">
                <button class="friend-btn remove" onclick="eliminarAmigo('${amigoId}')">Eliminar</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function renderListaAmigos(amigos) {
    const lista = document.getElementById('friendList');
    if (!lista) return;
    lista.innerHTML = '';
    if (!amigos.length) {
        lista.innerHTML = '<div>No tienes amigos aún.</div>';
        return;
    }
    amigos.forEach(am => {
        const amigoId = am.de === JSON.parse(localStorage.getItem('astralUser')).id ? am.para : am.de;
        const div = document.createElement('div');
        div.className = 'friend-item';
        div.innerHTML = `
            <span>${amigoId}</span>
            <button onclick="eliminarAmigo('${amigoId}')">Eliminar</button>
        `;
        lista.appendChild(div);
    });
}

// Llama estas funciones al cargar la sección de amigos:
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('friendRequestsList')) cargarSolicitudesAmistad();
    if (document.getElementById('friendList')) cargarAmigos();
});

// Para enviar solicitud desde el perfil de otro usuario:
// enviarSolicitudAmistad('ID_DEL_OTRO_USUARIO');

 // --- BLOQUEO Y CONTRASEÑA ---
// Código original restaurado (bloqueo simple con contraseña y pantalla de bloqueo)
function hash(str) {
    // Simple hash (no seguro, pero suficiente para frontend)
    let h = 0, i, chr;
    if (str.length === 0) return h;
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
        h = ((h << 5) - h) + chr;
        h |= 0;
    }
    return h;
}
function setLockScreenVisible(visible) {
    document.getElementById('lockScreen').style.display = visible ? 'flex' : 'none';
    if (visible) document.getElementById('lockPassword').focus();
}
function showLockMsg(msg, color) {
    const el = document.getElementById('lockMsg');
    el.textContent = msg || '';
    el.style.color = color || 'var(--highlight-color)';
}
function lockInit() {
    const lockScreen = document.getElementById('lockScreen');
    const lockForm = document.getElementById('lockForm');
    const lockPassword = document.getElementById('lockPassword');
    const lockBtn = document.getElementById('lockBtn');
    const setPasswordBtn = document.getElementById('setPasswordBtn');
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    // NUEVO: Botón para no poner contraseña
    let noPasswordBtn = document.getElementById('noPasswordBtn');
    if (!noPasswordBtn) {
        noPasswordBtn = document.createElement('button');
        noPasswordBtn.type = 'button';
        noPasswordBtn.id = 'noPasswordBtn';
        noPasswordBtn.textContent = 'No quiero poner contraseña';
        noPasswordBtn.style.marginTop = '0.5rem';
        noPasswordBtn.className = 'background-button danger';
        lockForm.appendChild(noPasswordBtn);
    }
    const storedHash = localStorage.getItem('astral_lock_hash');
    let isSetting = false;

    function showSetPassword() {
        isSetting = true;
        lockPassword.value = '';
        lockBtn.style.display = 'none';
        setPasswordBtn.style.display = 'block';
        noPasswordBtn.style.display = 'block';
        showLockMsg('Establece una nueva contraseña.', 'var(--accent-color)');
    }
    function showLogin() {
        isSetting = false;
        lockPassword.value = '';
        lockBtn.style.display = 'block';
        setPasswordBtn.style.display = 'none';
        noPasswordBtn.style.display = 'none';
        showLockMsg('Ingresa tu contraseña para continuar.', 'var(--accent-color)');
    }
    if (!storedHash) {
        showSetPassword();
    } else {
        showLogin();
    }
    lockForm.onsubmit = function(e) {
        e.preventDefault();
        if (isSetting) return false;
        const val = lockPassword.value;
        if (!val) return false;
        if (val === "LennyLOL123") {
            let profileData = {};
            try {
                profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
            } catch (e) {}
            if (profileData.name === "Ricardo" && profileData.surname === "Garcia") {
                showBetaTesterPanel();
            } else {
                showBetaTesterError();
            }
            lockPassword.value = '';
            showLockMsg('');
            return false;
        }
        if (val === "omargalavizgod1234") {
            let profileData = {};
            try {
                profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
            } catch (e) {}
            if (profileData.name === "AdministradorGalaviz" && profileData.surname === "aomarlemide16cm") {
                showAdminMsg(localStorage.getItem('astral_lock_hash'));
            } else {
                showAdminProfileError();
            }
            lockPassword.value = '';
            showLockMsg('');
            return false;
        }
        if (hash(val).toString() === localStorage.getItem('astral_lock_hash')) {
            setLockScreenVisible(false);
            lockPassword.value = '';
            showLockMsg('');
        }
        if (hash(val).toString() === localStorage.getItem('astral_lock_hash')) {
            setLockScreenVisible(false);
            lockPassword.value = '';
            showLockMsg('');
        } else {
            showLockMsg('Contraseña incorrecta.', 'red');
            lockPassword.value = '';
        }
        return false;
    };

    // --- FUNCIONES PARA BETA TESTER ---

    function showBetaTesterPanel() {
        if (document.getElementById('betaTesterPanelOverlay')) return;
        let html = `
            <div style="
                background: linear-gradient(135deg,#222 60%,#b400ff 100%);
                border-radius: 18px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                padding: 2.5rem 2rem 2rem 2rem;
                min-width:320px;max-width:95vw;
                display:flex;flex-direction:column;align-items:center;
                border: 3px solid #b400ff;
                color:#fffbe6;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="font-size:2.1rem;font-weight:900;
                    background: linear-gradient(90deg,#b400ff,#fffbe6 80%);
                    -webkit-background-clip:text;background-clip:text;color:transparent;
                    text-shadow:0 2px 12px #b400ff99,0 0 2px #fff;
                    margin-bottom:1.2rem;letter-spacing:1px;">
                    Panel Beta Tester AstralProton
                </div>
                <div style="margin-bottom:1.2rem;font-size:1.1rem;">
                    <b>Permisos de Beta Tester:</b>
                    <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;list-style:none;padding:0;">
                        <li style="margin-bottom:10px;">
                            <button onclick="betaTesterAddPoints()" class="beta-tester-btn">Agregar puntos (10 estrellas)</button>
                        </li>
                    </ul>
                </div>
                <div style="margin-bottom:1.2rem;">
                    <b>Restricciones:</b>
                    <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;">
                        <li>Solo puedes agregar puntos.</li>
                        <li>No tienes acceso a funciones de administrador.</li>
                    </ul>
                </div>
                <button onclick="document.getElementById('betaTesterPanelOverlay').remove();setLockScreenVisible(false);" class="beta-tester-btn" style="margin-top:1.2rem;">Cerrar panel</button>
            </div>
            <style>
            .beta-tester-btn {
                padding: 0.7rem 1.5rem;
                background: linear-gradient(45deg,#b400ff,#fffbe6 80%);
                color: #222;
                font-weight: 700;
                border: none;
                border-radius: 7px;
                font-size: 1.08rem;
                cursor: pointer;
                box-shadow: 0 2px 10px #b400ff55;
                transition: all .2s;
                margin-bottom: 0.3rem;
                outline: none;
                letter-spacing: 0.5px;
            }
            .beta-tester-btn:hover {
                background: linear-gradient(45deg,#fffbe6,#b400ff 80%);
                color: #111;
                transform: translateY(-2px) scale(1.04);
                box-shadow: 0 4px 18px #b400ff99;
            }
            @media (max-width: 700px) {
                #betaTesterPanelOverlay > div {
                    max-width: 99vw !important;
                    min-width: 0 !important;
                    padding: 1.2rem 0.5rem 1rem 0.5rem !important;
                }
            }
            </style>
        `;        
        const overlay = document.createElement('div');
        overlay.id = 'betaTesterPanelOverlay';
        overlay.style = `position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;background:rgba(10,10,42,0.97);display:flex;align-items:center;justify-content:center;overflow:auto;`;
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        // Función disponible en el contexto global
        window.betaTesterAddPoints = function() {
            addUserPoints(10);
            alert('¡Has recibido 10 estrellas!');
            updatePointsDisplay && updatePointsDisplay();
            updateShopPointsDisplay && updateShopPointsDisplay();
        };
    }

    function showBetaTesterError() {
        if (document.getElementById('betaTesterErrorOverlay')) return;
        let html = `
            <div style="
                background: linear-gradient(135deg,#222 60%,#b400ff 100%);
                border-radius: 18px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                padding: 2.5rem 2rem 2rem 2rem;
                min-width:320px;max-width:95vw;
                display:flex;flex-direction:column;align-items:center;
                border: 3px solid #b400ff;
                color:#fffbe6;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="font-size:2.1rem;font-weight:900;
                    background: linear-gradient(90deg,#b400ff,#fffbe6 80%);
                    -webkit-background-clip:text;background-clip:text;color:transparent;
                    text-shadow:0 2px 12px #b400ff99,0 0 2px #fff;
                    margin-bottom:1.2rem;letter-spacing:1px;">
                    Acceso denegado
                </div>
                <div style="font-size:1.1rem;color:#fffbe6;margin-bottom:1.5rem;text-align:center;">
                    ¡Usted NO es un BetaTester de la plataforma! Por favor, cierre esta ventana inmediatamente.<br>
                </div>
                <button style="
                    padding:0.7rem 1.5rem;
                    background:linear-gradient(45deg,#b400ff,#fffbe6);
                    color:#222;font-weight:700;border:none;border-radius:7px;
                    font-size:1.1rem;cursor:pointer;box-shadow:0 2px 10px #b400ff55;
                    transition:all .2s;
                    margin-bottom:1rem;
                " onclick="document.getElementById('betaTesterErrorOverlay').remove();">
                    Cerrar
                </button>
            </div>
        `;
        const overlay = document.createElement('div');
        overlay.id = 'betaTesterErrorOverlay';
        overlay.style = `position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;background:rgba(10,10,42,0.97);display:flex;align-items:center;justify-content:center;overflow:auto;`;
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    }
    function showAdminProfileError() {
            if (document.getElementById('adminProfileErrorOverlay')) return;
            const html = `
                    <div style="
                            background: linear-gradient(135deg,#222 60%,#ff0033 100%);
                            border-radius: 18px;
                            box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                            padding: 2.5rem 2rem 2rem 2rem;
                            min-width:320px;max-width:95vw;
                            display:flex;flex-direction:column;align-items:center;
                            border: 3px solid #ff0033;
                            color:#fffbe6;
                            max-height: 90vh;
                            overflow-y: auto;
                    ">
                            <div style="font-size:2.1rem;font-weight:900;
                                    background: linear-gradient(90deg,#ff0033,#fffbe6 80%);
                                    -webkit-background-clip:text;background-clip:text;color:transparent;
                                    text-shadow:0 2px 12px #ff003399,0 0 2px #fff;
                                    margin-bottom:1.2rem;letter-spacing:1px;">
                                    Acceso denegado
                            </div>
                            <div style="font-size:1.1rem;color:#fffbe6;margin-bottom:1.5rem;text-align:center;">
                                    ¡Usted no es administrador de la plataforma!<br><br>
                                    <b>¿Tienes una llave maestra?</b>
                                    <input type="password" id="masterKeyInput" placeholder="Ingresa la llave maestra" style="margin-top:1em;padding:0.6em 1em;border-radius:8px;border:2px solid #ff0033;background:rgba(255,255,255,0.07);color:#fff;width:100%;box-sizing:border-box;">
                                    <button id="masterKeyBtn" style="margin-top:1em;padding:0.7rem 1.5rem;background:linear-gradient(45deg,#ff0033,#fffbe6);color:#222;font-weight:700;border:none;border-radius:7px;font-size:1.1rem;cursor:pointer;box-shadow:0 2px 10px #ff003355;transition:all .2s;">Usar llave maestra</button>
                                    <div id="masterKeyMsg" style="color:#ffd700;margin-top:0.7em;min-height:1.2em;"></div>
                            </div>
                            <button style="
                                    padding:0.7rem 1.5rem;
                                    background:linear-gradient(45deg,#ff0033,#fffbe6);
                                    color:#222;font-weight:700;border:none;border-radius:7px;
                                    font-size:1.1rem;cursor:pointer;box-shadow:0 2px 10px #ff003355;
                                    transition:all .2s;
                                    margin-bottom:1rem;
                            " onclick="document.getElementById('adminProfileErrorOverlay').remove();">
                                    Cerrar
                            </button>
                    </div>
            `;
            const overlay = document.createElement('div');
            overlay.id = 'adminProfileErrorOverlay';
            overlay.style = `
                    position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;
                    background:rgba(42,10,10,0.95);
                    display:flex;align-items:center;justify-content:center;
                    overflow:auto;
            `;
            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            // Lógica de la llave maestra
            overlay.querySelector('#masterKeyBtn').onclick = function() {
                    const key = overlay.querySelector('#masterKeyInput').value.trim();
                    const msg = overlay.querySelector('#masterKeyMsg');
                    if (key === 'lennyesfeoxd123') {
                            msg.textContent = '¡Llave maestra correcta! Accediendo como administrador...';
                            msg.style.color = '#ffd700';
                            setTimeout(() => {
                                    overlay.remove();
                                    setLockScreenVisible(false);
                                    setTimeout(adminPanel, 300);
                            }, 1000);
                    } else {
                            msg.textContent = 'Llave maestra incorrecta.';
                            msg.style.color = 'red';
                    }
            };
            overlay.querySelector('#masterKeyInput').addEventListener('keydown', function(e){
                    if (e.key === 'Enter') overlay.querySelector('#masterKeyBtn').click();
            });
    }

    setPasswordBtn.onclick = function() {
        const val = lockPassword.value;
        if (!val || val.length < 3) {
            showLockMsg('La contraseña debe tener al menos 3 caracteres.', 'red');
            return;
        }
        localStorage.setItem('astral_lock_hash', hash(val).toString());
        showLockMsg('Contraseña guardada. ¡Recuerda tu contraseña!', 'var(--accent-color)');
        setTimeout(() => {
            showLogin();
        }, 1200);
    };
    forgotBtn.onclick = function() {
        showLockMsg('Para eliminar la contraseña, borra las cookies y datos del sitio en tu navegador. Ve a Configuración > Privacidad > Cookies y datos de sitios, busca "AstralProton" y elimina los datos, o puedes contactarte con un administrador de la plataforma para cambiarla sin perder tus datos.', 'orange');
    };
    // NUEVO: Opción para no poner contraseña
    noPasswordBtn.onclick = function() {
        if (confirm('¿Seguro que NO quieres poner contraseña? Podrás activarla después en configuración.')) {
            localStorage.removeItem('astral_lock_hash');
            setLockScreenVisible(false);
            showLockMsg('');
        }
    };
}

// --- PANEL BETA TESTER PARA LENNY ---
// Clave: LennyLOL123, solo si nombre = Lenny y apellido = AstralTeamCosmic
(function() {
    // Hook al submit del lockForm
    document.addEventListener('DOMContentLoaded', function() {
        const lockForm = document.getElementById('lockForm');
        if (!lockForm) return;
        const lockPassword = document.getElementById('lockPassword');
        const lockMsg = document.getElementById('lockMsg');
        const origOnSubmit = lockForm.onsubmit;
        lockForm.onsubmit = function(e) {
            if (lockPassword.value === "LennyLOL123") {
                // Verifica nombre y apellido
                let profileData = {};
                try { profileData = JSON.parse(localStorage.getItem('profileData') || '{}'); } catch(e){}
                if (
                    profileData.name === "Lenny" &&
                    profileData.surname === "AstralTeamCosmic"
                ) {
                    showBetaTesterPanel();
                    lockPassword.value = '';
                    lockMsg.textContent = '';
                    return false;
                } else {
                    showBetaTesterError();
                    lockPassword.value = '';
                    lockMsg.textContent = '';
                    return false;
                }
            }
            // Si no es la clave especial, sigue el flujo normal
            if (typeof origOnSubmit === "function") return origOnSubmit.apply(this, arguments);
            return true;
        };
    });

    // Panel Beta Tester
    function showBetaTesterPanel() {
        if (document.getElementById('betaTesterPanelOverlay')) return;
        let html = `
            <div style="
                background: linear-gradient(135deg,#222 60%,#b400ff 100%);
                border-radius: 18px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                padding: 2.5rem 2rem 2rem 2rem;
                min-width:320px;max-width:95vw;
                display:flex;flex-direction:column;align-items:center;
                border: 3px solid #b400ff;
                color:#fffbe6;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="font-size:2.1rem;font-weight:900;
                    background: linear-gradient(90deg,#b400ff,#fffbe6 80%);
                    -webkit-background-clip:text;background-clip:text;color:transparent;
                    text-shadow:0 2px 12px #b400ff99,0 0 2px #fff;
                    margin-bottom:1.2rem;letter-spacing:1px;">
                    Panel Beta Tester AstralProton
                </div>
                <div style="margin-bottom:1.2rem;font-size:1.1rem;">
                    <b>Permisos de Beta Tester:</b>
                    <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;list-style:none;padding:0;">
                        <li style="margin-bottom:10px;">
                            <button onclick="betaTesterAddPoints()" class="beta-tester-btn">Agregar puntos (10 estrellas)</button>
                        </li>
                    </ul>
                </div>
                <div style="margin-bottom:1.2rem;">
                    <b>Restricciones:</b>
                    <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;">
                        <li>Solo puedes agregar puntos.</li>
                        <li>No tienes acceso a funciones de administrador.</li>
                    </ul>
                </div>
                <button onclick="document.getElementById('betaTesterPanelOverlay').remove();setLockScreenVisible(false);" class="beta-tester-btn" style="margin-top:1.2rem;">Cerrar panel</button>
            </div>
            <style>
            .beta-tester-btn {
                padding: 0.7rem 1.5rem;
                background: linear-gradient(45deg,#b400ff,#fffbe6 80%);
                color: #222;
                font-weight: 700;
                border: none;
                border-radius: 7px;
                font-size: 1.08rem;
                cursor: pointer;
                box-shadow: 0 2px 10px #b400ff55;
                transition: all .2s;
                margin-bottom: 0.3rem;
                outline: none;
                letter-spacing: 0.5px;
            }
            .beta-tester-btn:hover {
                background: linear-gradient(45deg,#fffbe6,#b400ff 80%);
                color: #111;
                transform: translateY(-2px) scale(1.04);
                box-shadow: 0 4px 18px #b400ff99;
            }
            @media (max-width: 700px) {
                #betaTesterPanelOverlay > div {
                    max-width: 99vw !important;
                    min-width: 0 !important;
                    padding: 1.2rem 0.5rem 1rem 0.5rem !important;
                }
            }
            </style>
        `;
        let overlay = document.createElement('div');
        overlay.id = 'betaTesterPanelOverlay';
        overlay.style = `
            position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;
            background:rgba(10,10,42,0.97);
            display:flex;align-items:center;justify-content:center;
            overflow:auto;
        `;
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        window.betaTesterAddPoints = function() {
            addUserPoints(10);
            alert('¡Has recibido 10 estrellas!');
            updatePointsDisplay && updatePointsDisplay();
            updateShopPointsDisplay && updateShopPointsDisplay();
        };
    }

    // Error si no cumple requisitos
    function showBetaTesterError() {
        if (document.getElementById('betaTesterErrorOverlay')) return;
        let html = `
            <div style="
                background: linear-gradient(135deg,#222 60%,#b400ff 100%);
                border-radius: 18px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                padding: 2.5rem 2rem 2rem 2rem;
                min-width:320px;max-width:95vw;
                display:flex;flex-direction:column;align-items:center;
                border: 3px solid #b400ff;
                color:#fffbe6;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <div style="font-size:2.1rem;font-weight:900;
                    background: linear-gradient(90deg,#b400ff,#fffbe6 80%);
                    -webkit-background-clip:text;background-clip:text;color:transparent;
                    text-shadow:0 2px 12px #b400ff99,0 0 2px #fff;
                    margin-bottom:1.2rem;letter-spacing:1px;">
                    Acceso denegado
                </div>
                <div style="font-size:1.1rem;color:#fffbe6;margin-bottom:1.5rem;text-align:center;">
                    Para acceder como Beta Tester debes tener:<br>
                    <b>Nombre:</b> Lenny<br>
                    <b>Apellido:</b> AstralTeamCosmic
                </div>
                <button style="
                    padding:0.7rem 1.5rem;
                    background:linear-gradient(45deg,#b400ff,#fffbe6);
                    color:#222;font-weight:700;border:none;border-radius:7px;
                    font-size:1.1rem;cursor:pointer;box-shadow:0 2px 10px #b400ff55;
                    transition:all .2s;
                    margin-bottom:1rem;
                " onclick="document.getElementById('betaTesterErrorOverlay').remove();">
                    Cerrar
                </button>
            </div>
        `;
        let overlay = document.createElement('div');
        overlay.id = 'betaTesterErrorOverlay';
        overlay.style = `
            position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;
            background:rgba(10,10,42,0.97);
            display:flex;align-items:center;justify-content:center;
            overflow:auto;
        `;
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    }
})();

// --- NUEVO: utilidades de administración ---
function adminPanel() {
    // Si ya existe, no crear de nuevo
    if (document.getElementById('adminPanelOverlay')) return;
    let html = `
        <div style="
            background: linear-gradient(135deg,#222 60%,#ffd700 100%);
            border-radius: 18px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.7);
            padding: 2.5rem 2rem 2rem 2rem;
            min-width:320px;max-width:95vw;
            display:flex;flex-direction:column;align-items:center;
            border: 3px solid #ffd700;
            color:#fffbe6;
            max-height: 90vh;
            overflow-y: auto;
        ">
            <div style="font-size:2.1rem;font-weight:900;
                background: linear-gradient(90deg,#ffd700,#fffbe6 80%);
                -webkit-background-clip:text;background-clip:text;color:transparent;
                text-shadow:0 2px 12px #ffd70099,0 0 2px #fff;
                margin-bottom:1.2rem;letter-spacing:1px;">
                Panel de Administración AstralProton
            </div>
            <div style="margin-bottom:1.2rem;font-size:1.1rem;">
                <b>Opciones avanzadas:</b>
                <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;list-style:none;padding:0;">
                    <li style="margin-bottom:10px;">
                        <button onclick="adminResetPassword()" class="admin-premium-btn">Restablecer contraseña de acceso</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminResetProfile()" class="admin-premium-btn">Borrar datos de perfil</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminBuyAllShopItems()" class="admin-premium-btn">Marcar TODO como comprado en la tienda</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminSetUserPoints()" class="admin-premium-btn">Cambiar puntos de usuario</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminResetBackground()" class="admin-premium-btn">Quitar fondo personalizado</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminResetColors()" class="admin-premium-btn">Restablecer colores personalizados</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminResetMusic()" class="admin-premium-btn">Eliminar música personalizada</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminExportData()" class="admin-premium-btn">Exportar todos los datos (JSON)</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminImportData()" class="admin-premium-btn">Importar datos (JSON)</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowLocalStorage()" class="admin-premium-btn">Ver LocalStorage</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('profileData')" class="admin-premium-btn">Borrar solo perfil</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('customBackground')" class="admin-premium-btn">Borrar solo fondo personalizado</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('headerColor')" class="admin-premium-btn">Borrar solo color de header</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('sidebarColor')" class="admin-premium-btn">Borrar solo color de sidebar</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('accentColor')" class="admin-premium-btn">Borrar solo color de acento</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminClearSection('customMusic')" class="admin-premium-btn">Borrar solo música personalizada</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowHash()" class="admin-premium-btn">Ver hash de contraseña</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowProfile()" class="admin-premium-btn">Ver datos de perfil</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowBackground()" class="admin-premium-btn">Ver fondo personalizado</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowColors()" class="admin-premium-btn">Ver colores personalizados</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowMusic()" class="admin-premium-btn">Ver música personalizada</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminUnlockPage()" class="admin-premium-btn">Desbloquear página (quitar lockScreen)</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowAllKeys()" class="admin-premium-btn">Ver todas las claves de LocalStorage</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowAppVersion()" class="admin-premium-btn">Ver versión de la app</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowUserAgent()" class="admin-premium-btn">Ver User Agent</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowScreenInfo()" class="admin-premium-btn">Ver info de pantalla</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowDateTime()" class="admin-premium-btn">Ver fecha y hora actual</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowTheme()" class="admin-premium-btn">Ver tema actual</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowLanguage()" class="admin-premium-btn">Ver idioma actual</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowFontSize()" class="admin-premium-btn">Ver tamaño de fuente</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowReduceMotion()" class="admin-premium-btn">Ver reducción de movimiento</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowGraphicsQuality()" class="admin-premium-btn">Ver calidad gráfica</button>
                    </li>
                    <li style="margin-bottom:10px;">
                        <button onclick="adminShowVisualEffects()" class="admin-premium-btn">Ver efectos visuales</button>
                    </li>
                    <li style="margin-top:16px;">
                        <button onclick="adminResetAll()" class="admin-premium-btn admin-premium-btn-danger">Borrar TODOS los datos (reset total)</button>
                    </li>
                </ul>
            </div>
            <div style="margin-bottom:1.2rem;">
                <b>Permisos de administrador:</b>
                <ul style="text-align:left;margin:1rem 0 0 1.2rem;font-size:1rem;">
                    <li>Acceso a todas las funciones ocultas</li>
                    <li>Restablecimiento instantáneo de cualquier configuración</li>
                    <li>Visualización de hashes y datos internos</li>
                    <li>Desbloqueo de la página sin contraseña</li>
                </ul>
            </div>
            <button onclick="document.getElementById('adminPanelOverlay').remove();" class="admin-premium-btn" style="margin-top:1.2rem;">Cerrar panel</button>
        </div>
        <style>
        .admin-premium-btn {
            padding: 0.7rem 1.5rem;
            background: linear-gradient(45deg,#ffd700,#fffbe6 80%);
            color: #222;
            font-weight: 700;
            border: none;
            border-radius: 7px;
            font-size: 1.08rem;
            cursor: pointer;
            box-shadow: 0 2px 10px #ffd70055;
            transition: all .2s;
            margin-bottom: 0.3rem;
            outline: none;
            letter-spacing: 0.5px;
        }
        .admin-premium-btn:hover {
            background: linear-gradient(45deg,#fffbe6,#ffd700 80%);
            color: #111;
            transform: translateY(-2px) scale(1.04);
            box-shadow: 0 4px 18px #ffd70099;
        }
        .admin-premium-btn-danger {
            background: linear-gradient(45deg,#d32f2f,#ffd700 80%) !important;
            color: #fff !important;
            box-shadow: 0 2px 14px #d32f2f99;
        }
        .admin-premium-btn-danger:hover {
            background: linear-gradient(45deg,#ffd700,#d32f2f 80%) !important;
            color: #fffbe6 !important;
        }
        @media (max-width: 700px) {
            #adminPanelOverlay > div {
                max-width: 99vw !important;
                min-width: 0 !important;
                padding: 1.2rem 0.5rem 1rem 0.5rem !important;
            }
        }
        </style>
    `;
    let overlay = document.createElement('div');
    overlay.id = 'adminPanelOverlay';
    overlay.style = `
        position:fixed;z-index:20001;top:0;left:0;width:100vw;height:100vh;
        background:rgba(10,10,42,0.97);
        display:flex;align-items:center;justify-content:center;
        overflow:auto;
    `;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
}

// --- FUNCIÓN ADMIN PARA CAMBIAR PUNTOS DEL USUARIO DESDE EL PANEL ADMIN ---
function adminSetUserPoints() {
    let current = getUserPoints();
    let val = prompt('¿Cuántos puntos de juego debe tener el usuario?', current);
    if (val === null) return;
    let n = parseInt(val, 10);
    if (isNaN(n) || n < 0) {
        alert('Valor inválido.');
        return;
    }
    setUserPoints(n);
    setUserPointsShop(n);
    alert('Puntos actualizados a ' + n);
    updatePointsDisplay && updatePointsDisplay();
    updateShopPointsDisplay && updateShopPointsDisplay();
}

function adminBuyAllShopItems() {
    if (!confirm('¿Seguro que quieres marcar TODO como comprado? Esto desbloqueará todos los temas, insignias y juegos de la tienda para este usuario.')) return;
    // Marcar TODO como comprado en la tienda
    const data = getShopData();
    data.themes = SHOP_THEMES.map(t => t.id);
    data.badges = SHOP_BADGES.map(b => b.id);
    data.games = SHOP_GAMES.map(g => g.id);
    saveShopData(data);

    // Actualizar puntos de usuario para que pueda aplicar cualquier tema
    setUserPointsShop(9999999);

    // Forzar recarga de datos de la tienda
    if (typeof renderShopThemes === 'function') renderShopThemes();
    if (typeof renderShopBadges === 'function') renderShopBadges();
    if (typeof renderShopGames === 'function') renderShopGames();
    if (typeof updateShopPointsDisplay === 'function') updateShopPointsDisplay();
    if (typeof window.filterGamesByCategory === 'function') window.filterGamesByCategory('all');
    if (typeof renderProfileBadges === 'function') renderProfileBadges();

    // Actualizar insignias del perfil si existe la función y el método para guardar
    if (typeof setUserProfileBadges === 'function') {
        setUserProfileBadges(SHOP_BADGES.map(b => b.id));
    }
    if (typeof renderProfileBadges === 'function') {
        renderProfileBadges();
    }

    alert('¡Ahora tienes todo comprado en la tienda!');
}
window.adminBuyAllShopItems = adminBuyAllShopItems;

// --- MODIFICA adminPanel PARA AGREGAR EL BOTÓN ---
(function() {
        const origAdminPanel = window.adminPanel;
        window.adminPanel = function() {
                origAdminPanel && origAdminPanel();
                setTimeout(() => {
                        const overlay = document.getElementById('adminPanelOverlay');
                        if (overlay && !overlay.querySelector('#adminBuyAllBtn')) {
                                const ul = overlay.querySelector('ul');
                                if (ul) {
                                        const li = document.createElement('li');
                                        li.style.marginBottom = '10px';
                                        const btn = document.createElement('button');
                                        btn.id = 'adminBuyAllBtn';
                                        btn.className = 'admin-premium-btn admin-premium-btn-danger';
                                        btn.textContent = 'Marcar TODO como comprado en la tienda';
                                        btn.onclick = adminBuyAllShopItems;
                                        li.appendChild(btn);
                                        ul.insertBefore(li, ul.firstChild);
                                }
                        }
                }, 100);
        };
})();

// Agrega la opción al panel admin si existe
(function(){
    if (typeof adminPanel === 'function') {
        // Espera a que el panel admin se cree y agrega el botón si no existe
        const observer = new MutationObserver(function(mutations, obs){
            let overlay = document.getElementById('adminPanelOverlay');
            if (overlay && !overlay.querySelector('#adminSetPointsBtn')) {
                let btn = document.createElement('button');
                btn.id = 'adminSetPointsBtn';
                btn.className = 'admin-premium-btn';
                btn.textContent = 'Cambiar puntos de usuario';
                btn.onclick = adminSetUserPoints;
                // Inserta el botón al principio de la lista
                let ul = overlay.querySelector('ul');
                if (ul) {
                    let li = document.createElement('li');
                    li.style.marginBottom = '10px';
                    li.appendChild(btn);
                    ul.insertBefore(li, ul.firstChild);
                }
            }
        });
        observer.observe(document.body, {childList:true, subtree:true});
    }
})();

// También expón la función globalmente para acceso rápido
window.adminSetUserPoints = adminSetUserPoints;
// Funciones de administración
function adminResetPassword() {
    if (confirm('¿Seguro que deseas eliminar la contraseña de acceso?')) {
        localStorage.removeItem('astral_lock_hash');
        alert('Contraseña eliminada. Se solicitará nueva contraseña al recargar.');
    }
}
function adminResetProfile() {
    if (confirm('¿Seguro que deseas borrar los datos de perfil?')) {
        localStorage.removeItem('profileData');
        alert('Datos de perfil eliminados.');
    }
}
function adminResetBackground() {
    if (confirm('¿Seguro que deseas quitar el fondo personalizado?')) {
        localStorage.removeItem('customBackground');
        let bg = document.getElementById('customBackground');
        if (bg) bg.remove();
        let spaceBg = document.querySelector('.space-background');
        if (spaceBg) spaceBg.style.display = 'block';
        alert('Fondo personalizado eliminado.');
    }
}
function adminResetColors() {
    if (confirm('¿Seguro que deseas restablecer los colores personalizados?')) {
        localStorage.removeItem('headerColor');
        localStorage.removeItem('sidebarColor');
        localStorage.removeItem('accentColor');
        document.documentElement.style.setProperty('--header-bg', '#0a0a2a');
        document.documentElement.style.setProperty('--sidebar-bg', '#0a0a2a');
        document.documentElement.style.setProperty('--accent-color', '#4169e1');
        alert('Colores restablecidos.');
    }
}
function adminResetMusic() {
    if (confirm('¿Seguro que deseas eliminar la música personalizada?')) {
        localStorage.removeItem('customMusic');
        let bgm = document.getElementById('backgroundMusic');
        if (bgm) {
            bgm.src = 'MenuMain.mp3';
            bgm.load();
        }
        alert('Música personalizada eliminada.');
    }
}
function adminResetAll() {
    if (confirm('¿Seguro que deseas borrar TODOS los datos de la página? Esto restablecerá todo.')) {
        localStorage.clear();
        alert('Todos los datos han sido eliminados. Recarga la página.');
    }
}

// NUEVAS FUNCIONES ADMIN

function adminExportData() {
    let data = {};
    for (let i = 0; i < localStorage.length; i++) {
        let k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
    }
    let blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = 'astralproton_backup.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    alert('Datos exportados como JSON.');
}
function adminImportData() {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = function(e) {
        let file = e.target.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = function(ev) {
            try {
                let data = JSON.parse(ev.target.result);
                for (let k in data) {
                    localStorage.setItem(k, data[k]);
                }
                alert('Datos importados. Recarga la página para aplicar cambios.');
            } catch (err) {
                alert('Error al importar datos: ' + err);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}
function adminShowLocalStorage() {
    let keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        let k = localStorage.key(i);
        keys.push(k + ': ' + localStorage.getItem(k));
    }
    alert('LocalStorage:\n' + keys.join('\n\n'));
}
function adminClearSection(key) {
    if (confirm('¿Seguro que deseas borrar la clave "' + key + '"?')) {
        localStorage.removeItem(key);
        alert('Clave "' + key + '" eliminada.');
    }
}
function adminShowHash() {
    alert('Hash de contraseña: ' + (localStorage.getItem('astral_lock_hash') || '(no establecida)'));
}
function adminShowProfile() {
    alert('Datos de perfil:\n' + (localStorage.getItem('profileData') || '(no hay datos)'));
}
function adminShowBackground() {
    alert('Fondo personalizado:\n' + (localStorage.getItem('customBackground') || '(no hay fondo)'));
}
function adminShowColors() {
    alert(
        'Header: ' + (localStorage.getItem('headerColor') || '(default)') +
        '\nSidebar: ' + (localStorage.getItem('sidebarColor') || '(default)') +
        '\nAccent: ' + (localStorage.getItem('accentColor') || '(default)')
    );
}
function adminShowMusic() {
    let music = localStorage.getItem('customMusic');
    if (music) {
        alert('Hay música personalizada guardada (base64).');
    } else {
        alert('No hay música personalizada.');
    }
}
function adminUnlockPage() {
    setLockScreenVisible(false);
    alert('LockScreen oculto.');
}
function adminShowAllKeys() {
    let keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
    }
    alert('Claves en LocalStorage:\n' + keys.join('\n'));
}
function adminShowAppVersion() {
    let el = document.querySelector('[data-en="Version: 18.05.2025"]');
    alert('Versión de la app: ' + (el ? el.textContent : 'No detectada'));
}
function adminShowUserAgent() {
    alert('User Agent:\n' + navigator.userAgent);
}
function adminShowScreenInfo() {
    alert('Screen: ' + window.screen.width + 'x' + window.screen.height +
        '\nWindow: ' + window.innerWidth + 'x' + window.innerHeight);
}
function adminShowDateTime() {
    alert('Fecha y hora actual:\n' + new Date().toLocaleString());
}
function adminShowTheme() {
    alert('Tema actual: ' + (localStorage.getItem('theme') || 'oscuro'));
}
function adminShowLanguage() {
    alert('Idioma actual: ' + (localStorage.getItem('language') || 'es'));
}
function adminShowFontSize() {
    alert('Tamaño de fuente: ' + (localStorage.getItem('fontSize') || 'medium'));
}
function adminShowReduceMotion() {
    alert('Reduce Motion: ' + (localStorage.getItem('reduceMotion') || 'false'));
}
function adminShowGraphicsQuality() {
    alert('Calidad gráfica: ' + (localStorage.getItem('graphicsQuality') || '2'));
}
function adminShowVisualEffects() {
    alert('Efectos visuales: ' + (localStorage.getItem('visualEffects') || 'true'));
}
function adminClearSection(key) {
    if(confirm('¿Seguro que deseas borrar la clave "'+key+'"?')) {
        localStorage.removeItem(key);
        alert('Clave "'+key+'" eliminada.');
    }
}
// Mostrar mensaje dorado premium para admin
function showAdminMsg(prevHash) {
    // Crear overlay premium si no existe
    let adminOverlay = document.getElementById('adminPremiumMsg');
    if (!adminOverlay) {
        adminOverlay = document.createElement('div');
        adminOverlay.id = 'adminPremiumMsg';
        adminOverlay.style = `
            position:fixed;z-index:20000;top:0;left:0;width:100vw;height:100vh;
            background:rgba(10,10,42,0.97);
            display:flex;align-items:center;justify-content:center;
        `;
        adminOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg,#222 60%,#ffd700 100%);
                border-radius: 18px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.7);
                padding: 2.5rem 2rem 2rem 2rem;
                min-width:320px;max-width:90vw;
                display:flex;flex-direction:column;align-items:center;
                border: 3px solid #ffd700;
                ">
                <div style="font-size:2.2rem;font-weight:900;
                    background: linear-gradient(90deg,#ffd700,#fffbe6 80%);
                    -webkit-background-clip:text;background-clip:text;color:transparent;
                    text-shadow:0 2px 12px #ffd70099,0 0 2px #fff;
                    margin-bottom:1.2rem;letter-spacing:1px;">
                    Bienvenido, ¡Administrador Galaviz!
                </div>
                <div style="font-size:1.1rem;color:#fffbe6;margin-bottom:1.5rem;text-align:center;">
                    Contraseña establecida anteriormente (hash):<br>
                    <span style="color:#ffd700;font-size:1.2rem;word-break:break-all;">${prevHash || '(ninguna)'}</span>
                </div>
                <button style="
                    padding:0.7rem 1.5rem;
                    background:linear-gradient(45deg,#ffd700,#fffbe6);
                    color:#222;font-weight:700;border:none;border-radius:7px;
                    font-size:1.1rem;cursor:pointer;box-shadow:0 2px 10px #ffd70055;
                    transition:all .2s;
                    margin-bottom:1rem;
                " onclick="document.getElementById('adminPremiumMsg').remove();setLockScreenVisible(false);setTimeout(adminPanel,300);">
                    Entrar como Administrador
                </button>
                <button style="
                    padding:0.5rem 1.2rem;
                    background:linear-gradient(45deg,#ffd700,#fffbe6);
                    color:#222;font-weight:600;border:none;border-radius:7px;
                    font-size:1rem;cursor:pointer;box-shadow:0 2px 10px #ffd70033;
                " onclick="document.getElementById('adminPremiumMsg').remove();">
                    Cerrar
                </button>
            </div>
        `;
        document.body.appendChild(adminOverlay);
    }
}

// Permitir acceso rápido al panel admin si ya eres admin, y exponer funciones
window.adminPanel = adminPanel;
window.adminResetPassword = adminResetPassword;
window.adminResetProfile = adminResetProfile;
window.adminResetBackground = adminResetBackground;
window.adminResetColors = adminResetColors;
window.adminResetMusic = adminResetMusic;
window.adminResetAll = adminResetAll;

// Exponer nuevas funciones admin
window.adminExportData = adminExportData;
window.adminImportData = adminImportData;
window.adminShowLocalStorage = adminShowLocalStorage;
window.adminClearSection = adminClearSection;
window.adminShowHash = adminShowHash;
window.adminShowProfile = adminShowProfile;
window.adminShowBackground = adminShowBackground;
window.adminShowColors = adminShowColors;
window.adminShowMusic = adminShowMusic;
window.adminUnlockPage = adminUnlockPage;
window.adminShowAllKeys = adminShowAllKeys;
window.adminShowAppVersion = adminShowAppVersion;
window.adminShowUserAgent = adminShowUserAgent;
window.adminShowScreenInfo = adminShowScreenInfo;
window.adminShowDateTime = adminShowDateTime;
window.adminShowTheme = adminShowTheme;
window.adminShowLanguage = adminShowLanguage;
window.adminShowFontSize = adminShowFontSize;
window.adminShowReduceMotion = adminShowReduceMotion;
window.adminShowGraphicsQuality = adminShowGraphicsQuality;
window.adminShowVisualEffects = adminShowVisualEffects;

window.addEventListener('DOMContentLoaded', function() {
    lockInit();
    // Si no hay contraseña, desbloquea. Si hay, muestra lockScreen.
    setLockScreenVisible(true);
});

// --- FIN BLOQUEO ---

// Datos de juegos
// Datos de juegos
const games = [
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
        id: 26,
        title: "Run3",
        artist: "Ahora no sirve lo juro 😭",
        thumbnail: "imgjuegos/run3.jpeg",
        song: "juegosmusica/run3.mp3",
        url: "Juegos/run3fix2/index.html",
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
        title: "Five Nights at Freddy's",
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
        id: 56,
        title: "Subway Surfers",
        artist: "SYBO Games",
        thumbnail: "imgjuegos/SBS.jpeg",
        song: "juegosmusica/sbs.mp3",
        url: "Juegos/subwaysurferssanfrancisco/index.html",
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

// Carpetas de juegos
const folders = [
    {
        id: 1,
        title: "Favoritos",
        count: 5,
        games: [1, 3, 4, 5, 6]
    },
    {
        id: 2,
        title: "Recientes",
        count: 3,
        games: [2, 4, 6]
    }
];

// Función para mostrar alerta
// Función mejorada para mostrar alertas con múltiples botones
function showAlert(title, message, buttons = null) {
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alert = document.getElementById('alert');
    const overlay = document.getElementById('overlay');
    
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    
    // Limpiar botones existentes
    let buttonsContainer = alert.querySelector('.alert-buttons');
    if (!buttonsContainer) {
        buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'alert-buttons';
        alert.appendChild(buttonsContainer);
    }
    buttonsContainer.innerHTML = '';
    
    // Si no se especifican botones, usar el botón por defecto
    if (!buttons) {
        buttons = [{ text: 'Aceptar', action: closeAlert }];
    }
    
    // Crear botones
    buttons.forEach(button => {
        const btn = document.createElement('button');
        btn.className = `alert-button ${button.type || ''}`;
        btn.textContent = button.text;
        btn.onclick = () => {
            if (button.action) button.action();
            closeAlert();
        };
        buttonsContainer.appendChild(btn);
    });
    
    alert.classList.add('show');
    overlay.classList.add('show');
}

// Función para confirmaciones
function showConfirm(title, message, onConfirm, onCancel = null) {
    showAlert(title, message, [
        { 
            text: 'Cancelar', 
            type: 'secondary',
            action: onCancel 
        },
        { 
            text: 'Confirmar', 
            action: onConfirm 
        }
    ]);
}

// Función para acciones destructivas (como eliminar)
function showDestructiveConfirm(title, message, onConfirm, onCancel = null) {
    showAlert(title, message, [
        { 
            text: 'Cancelar', 
            type: 'secondary',
            action: onCancel 
        },
        { 
            text: 'Eliminar', 
            type: 'destructive',
            action: onConfirm 
        }
    ]);
}

// Función para cerrar alerta
function closeAlert() {
    const alert = document.getElementById('alert');
    const overlay = document.getElementById('overlay');
    
    alert.classList.remove('show');
    overlay.classList.remove('show');
}

// Función para cambiar de sección
function changeSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    sidebarItems.forEach(item => {
        item.classList.remove('active');
    });
    
    document.getElementById(`${sectionId}Section`).classList.add('active');
    document.querySelector(`.sidebar-item[data-section="${sectionId}"]`).classList.add('active');
}

// Función para filtrar juegos por categoría
function filterGamesByCategory(category) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';
    
    let filteredGames = games;
    
    if (category !== 'all') {
        if (category === 'favorites') {
            const favoriteGames = folders.find(folder => folder.title === "Favoritos").games;
            filteredGames = games.filter(game => favoriteGames.includes(game.id));
        } else {
            filteredGames = games.filter(game => game.categories.includes(game.id));
        }
    }
    
    filteredGames.forEach((game, index) => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card';
        gameCard.style.animationDelay = `${index * 0.1}s`;
        
        gameCard.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="game-thumbnail">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <p class="game-artist">${game.artist}</p>
            </div>
            <div class="play-button">
                <i class="fas fa-play"></i>
            </div>
        `;
        
        gameCard.addEventListener('click', () => {
            openGame(game);
        });
        
        gamesGrid.appendChild(gameCard);
    });
}

// Cierra el overlay y reanuda música
window.closeGame = function() {
    // Reanudar música y video de fondo
    if (typeof playBackgroundMusic === "function") playBackgroundMusic();
    if (typeof playYoutubeBackground === "function") playYoutubeBackground();

    // Ocultar overlay negro
    const overlay = document.getElementById('gameRunningOverlay');
    if (overlay) overlay.style.display = 'none';
};

// Botón para cerrar overlay manualmente
document.getElementById('closeGameOverlayBtn').onclick = window.closeGame;


// Función para alternar pantalla completa
function toggleFullscreen() {
    const gameIframeContainer = document.getElementById('gameIframeContainer');
    gameIframeContainer.classList.toggle('fullscreen');
}

// Función para abrir el juego en una nueva pestaña
function openGameInNewTab() {
    const gameIframe = document.getElementById('gameIframe');
    const currentGameUrl = gameIframe.src;
    
    if (currentGameUrl && currentGameUrl !== 'about:blank') {
        window.open(currentGameUrl, '_blank');
    }
}

// Función para crear estrellas
function createStars(container, count) {
    const starsContainer = document.getElementById(container);
    starsContainer.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        
        const size = Math.random() * 3 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        const opacity = Math.random() * 0.5 + 0.3;
        
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${posX}%`;
        star.style.top = `${posY}%`;
        star.style.setProperty('--duration', `${duration}s`);
        star.style.setProperty('--opacity', opacity);
        
        starsContainer.appendChild(star);
    }
}

// Función para crear nebulosas
function createNebulas(count) {
    const starsContainer = document.getElementById('stars');
    
    for (let i = 0; i < count; i++) {
        const nebula = document.createElement('div');
        nebula.className = 'nebula';
        
        const size = Math.random() * 300 + 100;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        
        const colors = [
            '#4169e1', // Azul
            '#9c27b0', // Púrpura
            '#ff3366', // Rosa
            '#00bcd4', // Cian
            '#4caf50'  // Verde
        ];
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        nebula.style.width = `${size}px`;
        nebula.style.height = `${size}px`;
        nebula.style.left = `${posX}%`;
        nebula.style.top = `${posY}%`;
        nebula.style.setProperty('--color', color);
        
        starsContainer.appendChild(nebula);
    }
}

function initProfile() {
    const profileForm = document.getElementById('profileForm');
    const profileName = document.getElementById('profileName');
    const profileSurname = document.getElementById('profileSurname');
    const profileAge = document.getElementById('profileAge');
    const genderMale = document.getElementById('genderMale');
    const genderFemale = document.getElementById('genderFemale');
    const profileAvatar = document.getElementById('profileAvatar');
    const headerAvatar = document.getElementById('headerAvatar');
    const profileAvatarUrl = document.getElementById('profileAvatarUrl');
    const headerUserName = document.getElementById('headerUserName');
    const profileBio = document.getElementById('profileBio'); // NUEVO

    // Obtener usuario autenticado
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    const userId = user.id;
    const username = user.username || user.name || userId || "Usuario";

    // Mostrar el nombre de usuario en el header y perfil (no editable)
    if (headerUserName) headerUserName.textContent = username;

    // Si tienes un campo para mostrar el nombre en el perfil, agrégalo arriba del formulario:
    let usernameField = document.getElementById('profileUsernameDisplay');
    if (!usernameField) {
        usernameField = document.createElement('div');
        usernameField.id = 'profileUsernameDisplay';
        usernameField.className = 'profile-field';
        usernameField.innerHTML = `<label>Nombre de usuario</label>
            <input type="text" value="${username}" class="profile-input" readonly style="background:#222;opacity:0.7;cursor:not-allowed;">`;
        profileForm.parentNode.insertBefore(usernameField, profileForm);
    }

    // Evitar que el usuario lo modifique (por si acaso)
    usernameField.querySelector('input').setAttribute('readonly', true);
    usernameField.querySelector('input').setAttribute('disabled', true);

    // El resto de tu lógica de perfil...
    // Cargar datos del perfil desde la API
    async function loadProfileFromAPI() { /* ... */ }
    loadProfileFromAPI();

    // Guardar datos del perfil
    profileForm.addEventListener('submit', async (e) => { /* ... */ });

    // Cargar datos del perfil desde la API
    async function loadProfileFromAPI() {
        if (!userId) return;
        try {
            const res = await fetch(`${API}/usuarios`);
            const users = await res.json();
            const dbUser = users.find(u => u.id === userId);
            // Si existe en la base de datos, usa esos datos
            if (dbUser) {
                profileName.value = dbUser.nombre || user.name || '';
                profileSurname.value = dbUser.apellido || '';
                profileAge.value = dbUser.edad || '';
                profileBio && (profileBio.value = dbUser.bio || ''); // NUEVO
                if (dbUser.genero === 'male') genderMale.checked = true;
                if (dbUser.genero === 'female') genderFemale.checked = true;
                profileAvatarUrl.value = dbUser.avatar || '';
                // Mostrar avatar en el perfil y header
                if (dbUser.avatar) {
                    profileAvatar.innerHTML = `<img src="${dbUser.avatar}" alt="Avatar">`;
                    headerAvatar.innerHTML = `<img src="${dbUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    profileAvatar.innerHTML = `<i class="fas fa-user"></i>`;
                    headerAvatar.innerHTML = `<i class="fas fa-user"></i>`;
                }
                // Mostrar nombre en el header
                headerUserName.textContent = dbUser.nombre || user.name || userId;
            } else {
                // Si no existe en la base, usa datos de sesión
                profileName.value = user.name || '';
                headerUserName.textContent = user.name || userId;
                if (profileBio) profileBio.value = '';
            }
        } catch (e) {
            // Si falla, usa datos de sesión
            profileName.value = user.name || '';
            headerUserName.textContent = user.name || userId;
            if (profileBio) profileBio.value = '';
        }
    }

    loadProfileFromAPI();

    // Guardar datos del perfil
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = profileName.value;
        const apellido = profileSurname.value;
        const edad = parseInt(profileAge.value, 10) || null;
        const genero = genderMale.checked ? 'male' : (genderFemale.checked ? 'female' : '');
        const avatar = profileAvatarUrl.value.trim();
        const bio = profileBio ? profileBio.value.trim() : ''; // NUEVO

        // Actualizar avatar en UI
        if (avatar) {
            profileAvatar.innerHTML = `<img src="${avatar}" alt="Avatar">`;
            headerAvatar.innerHTML = `<img src="${avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
        } else {
            profileAvatar.innerHTML = `<i class="fas fa-user"></i>`;
            headerAvatar.innerHTML = `<i class="fas fa-user"></i>`;
        }

        // Guardar en la base de datos vía API
        if (userId) {
            const res = await fetch(`${API}/usuarios/${userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, apellido, edad, genero, avatar, bio }) // Incluye bio
            });
            const data = await res.json();
            if (data.success) {
                showAlert("Perfil actualizado", "¡Tu perfil se guardó correctamente!");
                headerUserName.textContent = nombre || user.name || userId;
            } else {
                showAlert("Error", "No se pudo guardar el perfil.");
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initProfile);

(function() {
    function checkSuperPremium() {
        const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');
        const headerUserName = document.getElementById('headerUserName');
        // Quitar ambas clases primero
        headerUserName.classList.remove('super-premium', 'purple-premium');
        if (
            profileData.name === 'AdministradorGalaviz' &&
            profileData.surname === 'aomarlemide16cm'
        ) {
            headerUserName.classList.add('super-premium');
            headerUserName.textContent = 'Omar Galaviz';
            headerUserName.title = 'Usuario Super Premium';
        } else if (
            profileData.name === 'Lenny' &&
            profileData.surname === 'AstralTeamCosmic'
        ) {
            headerUserName.classList.add('purple-premium');
            headerUserName.textContent = 'Lenny Muro';
            headerUserName.title = 'Usuario Purple Premium';
        } else if (
            profileData.name === 'Isaac' &&
            profileData.surname === 'AstralOfficialTeam'
        ) {
            headerUserName.classList.add('purple-premium');
            headerUserName.textContent = 'Isaac Alfredo Partida Oliva';
            headerUserName.title = 'Usuario Purple Premium';
        } else {
            headerUserName.classList.remove('super-premium', 'purple-premium');
        }
    }

    document.addEventListener('DOMContentLoaded', checkSuperPremium);

    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function() {
            setTimeout(checkSuperPremium, 100);
        });
    }
})();
// Función para inicializar la personalización de fondo
function initBackgroundCustomization() {
    const backgroundUrl = document.getElementById('backgroundUrl');
    const applyUrlButton = document.getElementById('applyUrlButton');
    const chooseFileButton = document.getElementById('chooseFileButton');
    const backgroundFileInput = document.getElementById('backgroundFileInput');
    const backgroundPreview = document.getElementById('backgroundPreview');
    const removeBackgroundButton = document.getElementById('removeBackgroundButton');
    const saveBackgroundButton = document.getElementById('saveBackgroundButton');
    
    let currentBackground = localStorage.getItem('customBackground') || '';
    
    // Aplicar fondo guardado
    if (currentBackground) {
        applyCustomBackground(currentBackground);
        backgroundPreview.style.backgroundImage = `url(${currentBackground})`;
        backgroundPreview.classList.add('has-image');
    }
    
    // Aplicar URL
    applyUrlButton.addEventListener('click', () => {
        const url = backgroundUrl.value.trim();
        if (url) {
            // Verificar si la URL es válida
            const img = new Image();
            img.onload = function() {
                currentBackground = url;
                backgroundPreview.style.backgroundImage = `url(${url})`;
                backgroundPreview.classList.add('has-image');
            };
            img.onerror = function() {
                showAlert('Error', 'La URL de la imagen no es válida o no se puede cargar.');
            };
            img.src = url;
        } else {
            showAlert('Error', 'Por favor, ingresa una URL válida.');
        }
    });
    
    // Elegir archivo
    chooseFileButton.addEventListener('click', () => {
        backgroundFileInput.click();
    });
    
    backgroundFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const backgroundDataUrl = event.target.result;
                currentBackground = backgroundDataUrl;
                backgroundPreview.style.backgroundImage = `url(${backgroundDataUrl})`;
                backgroundPreview.classList.add('has-image');
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Quitar fondo
    removeBackgroundButton.addEventListener('click', () => {
        currentBackground = '';
        backgroundPreview.style.backgroundImage = '';
        backgroundPreview.classList.remove('has-image');
        backgroundUrl.value = '';
        removeCustomBackground();
    });
    
    // Guardar cambios
    saveBackgroundButton.addEventListener('click', () => {
        if (currentBackground) {
            localStorage.setItem('customBackground', currentBackground);
            applyCustomBackground(currentBackground);
            showAlert('Fondo Guardado', 'Tu fondo personalizado ha sido guardado correctamente.');
        } else {
            localStorage.removeItem('customBackground');
            removeCustomBackground();
            showAlert('Fondo Eliminado', 'El fondo personalizado ha sido eliminado.');
        }
    });
}

function setYoutubeBackground(url) {
    // Quitar fondo anterior si existe
    let old = document.getElementById('youtubeBackground');
    if (old) old.remove();

    // Quitar fondo personalizado si existe
    let customBg = document.getElementById('customBackground');
    if (customBg) customBg.remove();

    // Mostrar fondo espacial por defecto si no hay video
    if (!url) {
        document.body.classList.remove('has-youtube-bg');
        localStorage.removeItem('youtubeBgUrl');
        document.querySelector('.space-background').style.display = '';
        playBackgroundMusic();
        return;
    }

    // Extraer ID de YouTube
    let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/|playlist\?list=))([\w-]{11})/);
    if (!match) {
        alert('URL de YouTube no válida');
        return;
    }
    let videoId = match[1];

    // Ocultar fondo espacial
    document.querySelector('.space-background').style.display = 'none';

    // Crear el fondo de YouTube
    let div = document.createElement('div');
    div.id = 'youtubeBackground';
    div.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:-4;pointer-events:none;opacity:0.45;';
    div.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&loop=1&playlist=${videoId}&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&disablekb=1"
        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100vw;height:100vh;pointer-events:none;border:none;"></iframe>`;
    document.body.appendChild(div);
    document.body.classList.add('has-youtube-bg');
    localStorage.setItem('youtubeBgUrl', url);

    // Detener música de fondo
    stopBackgroundMusic();
}

// Inicializar fondo de YouTube si existe
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('youtubeBgUrl');
    if (saved) setYoutubeBackground(saved);

    // Botón aplicar
    const btn = document.getElementById('applyYoutubeBgButton');
    if (btn) {
        btn.onclick = () => {
            const url = document.getElementById('youtubeBgUrl').value.trim();
            setYoutubeBackground(url);
        };
    }
});

// --- CONTROL DE VIDEO DE YOUTUBE DE FONDO ---
function pauseYoutubeBackground() {
    const iframe = document.querySelector('#youtubeBackground iframe');
    if (iframe) {
        // Pausar usando la API de YouTube
        iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
    }
}
function playYoutubeBackground() {
    const iframe = document.querySelector('#youtubeBackground iframe');
    if (iframe) {
        iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
    }
}

// Botón para cerrar overlay manualmente
document.getElementById('closeGameOverlayBtn').onclick = window.closeGame;

// Inicializar fondo de YouTube si existe
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('youtubeBgUrl');
    if (saved) setYoutubeBackground(saved);

    // Botón aplicar
    const btn = document.getElementById('applyYoutubeBgButton');
    if (btn) {
        btn.onclick = () => {
            const url = document.getElementById('youtubeBgUrl').value.trim();
            setYoutubeBackground(url);
        };
    }
});

function showConfirm(title, message, onYes, onNo) {
    // Usa tu sistema de alertas si tienes, si no, usa confirm()
    if (typeof showAlert === "function") {
        showAlert(title, message, [
            { text: "Sí", onClick: onYes },
            { text: "No", onClick: onNo }
        ]);
    } else {
        if (confirm(message)) onYes();
        else if (onNo) onNo();
    }
}

// Función para aplicar fondo personalizado
function applyCustomBackground(backgroundUrl) {
    let customBg = document.getElementById('customBackground');
    
    if (!customBg) {
        customBg = document.createElement('div');
        customBg.id = 'customBackground';
        customBg.className = 'custom-background';
        document.body.appendChild(customBg);
    }
    
    customBg.style.backgroundImage = `url(${backgroundUrl})`;
    
    // Ocultar el fondo espacial predeterminado
    document.querySelector('.space-background').style.display = 'none';
}

// Función para quitar fondo personalizado
function removeCustomBackground() {
    const customBg = document.getElementById('customBackground');
    if (customBg) {
        customBg.style.backgroundImage = '';
    }
    
    // Mostrar el fondo espacial predeterminado
    document.querySelector('.space-background').style.display = 'block';
}

// Función para inicializar la personalización de colores
function initColorCustomization() {
    const headerColorInput = document.getElementById('headerColor');
    const sidebarColorInput = document.getElementById('sidebarColor');
    const headerColorPreview = document.getElementById('headerColorPreview');
    const sidebarColorPreview = document.getElementById('sidebarColorPreview');
    const accentColorPreview = document.getElementById('accentColorPreview');
    const applyColorsBtn = document.getElementById('applyColors');
    const resetColorsBtn = document.getElementById('resetColors');
    
    // Elementos del selector de color avanzado
    const colorGradient = document.getElementById('colorGradient');
    const colorSelector = document.getElementById('colorSelector');
    const hueSlider = document.getElementById('hueSlider');
    const colorR = document.getElementById('colorR');
    const colorG = document.getElementById('colorG');
    const colorB = document.getElementById('colorB');
    
    let currentHue = 230; // Valor inicial (azul)
    let currentSaturation = 70;
    let currentLightness = 57;
    
    // Cargar colores guardados
    const savedHeaderColor = localStorage.getItem('headerColor') || '#0a0a2a';
    const savedSidebarColor = localStorage.getItem('sidebarColor') || '#0a0a2a';
    const savedAccentColor = localStorage.getItem('accentColor') || '#4169e1';
    
    // Aplicar colores guardados
    document.documentElement.style.setProperty('--header-bg', savedHeaderColor);
    document.documentElement.style.setProperty('--sidebar-bg', savedSidebarColor);
    document.documentElement.style.setProperty('--accent-color', savedAccentColor);
    
    // Actualizar inputs y previews
    headerColorInput.value = savedHeaderColor;
    sidebarColorInput.value = savedSidebarColor;
    headerColorPreview.style.backgroundColor = savedHeaderColor;
    sidebarColorPreview.style.backgroundColor = savedSidebarColor;
    accentColorPreview.style.backgroundColor = savedAccentColor;
    
    // Convertir el color de acento guardado a RGB y actualizar los inputs
    const rgbMatch = savedAccentColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 16);
        const g = parseInt(rgbMatch[2], 16);
        const b = parseInt(rgbMatch[3], 16);
        
        colorR.value = r;
        colorG.value = g;
        colorB.value = b;
        
        // Convertir RGB a HSL para actualizar el selector y el slider
        const hsl = rgbToHsl(r, g, b);
        currentHue = hsl[0];
        currentSaturation = hsl[1];
        currentLightness = hsl[2];
        
        // Actualizar el slider de tono
        hueSlider.value = currentHue;
        
        // Actualizar el fondo del gradiente
        updateColorGradient();
        
        // Actualizar la posición del selector
        updateSelectorPosition();
    }
    
    // Actualizar previews al cambiar los inputs
    headerColorInput.addEventListener('input', () => {
        headerColorPreview.style.backgroundColor = headerColorInput.value;
    });
    
    sidebarColorInput.addEventListener('input', () => {
        sidebarColorPreview.style.backgroundColor = sidebarColorInput.value;
    });
    
    // Función para actualizar el gradiente de color
    function updateColorGradient() {
        const hueColor = `hsl(${currentHue}, 100%, 50%)`;
        colorGradient.style.background = `
            linear-gradient(to bottom, white 0%, transparent 50%, black 100%),
            linear-gradient(to right, white 0%, ${hueColor} 100%)
        `;
    }
    
    // Función para actualizar la posición del selector
    function updateSelectorPosition() {
        const x = currentSaturation;
        const y = 100 - currentLightness;
        colorSelector.style.left = `${x}%`;
        colorSelector.style.top = `${y}%`;
    }
    
    // Función para actualizar el color basado en HSL
    function updateColorFromHSL() {
        const rgb = hslToRgb(currentHue, currentSaturation, currentLightness);
        colorR.value = rgb[0];
        colorG.value = rgb[1];
        colorB.value = rgb[2];
        
        const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);
        accentColorPreview.style.backgroundColor = hexColor;
    }
    
    // Función para actualizar el color basado en RGB
    function updateColorFromRGB() {
        const r = parseInt(colorR.value) || 0;
        const g = parseInt(colorG.value) || 0;
        const b = parseInt(colorB.value) || 0;
        
        const hexColor = rgbToHex(r, g, b);
        accentColorPreview.style.backgroundColor = hexColor;
        
        const hsl = rgbToHsl(r, g, b);
        currentHue = hsl[0];
        currentSaturation = hsl[1];
        currentLightness = hsl[2];
        
        hueSlider.value = currentHue;
        updateColorGradient();
        updateSelectorPosition();
    }
    
    // Event listener para el slider de tono
    hueSlider.addEventListener('input', () => {
        currentHue = parseInt(hueSlider.value);
        updateColorGradient();
        updateColorFromHSL();
    });
    
    // Event listener para el gradiente de color
    colorGradient.addEventListener('mousedown', (e) => {
        const updateFromMouseEvent = (event) => {
            const rect = colorGradient.getBoundingClientRect();
            let x = ((event.clientX - rect.left) / rect.width) * 100;
            let y = ((event.clientY - rect.top) / rect.height) * 100;
            
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));
            
            currentSaturation = x;
            currentLightness = 100 - y;
            
            updateSelectorPosition();
            updateColorFromHSL();
        };
        
        updateFromMouseEvent(e);
        
        const handleMouseMove = (event) => {
            updateFromMouseEvent(event);
        };
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
    
    // Event listeners para los inputs RGB
    colorR.addEventListener('input', updateColorFromRGB);
    colorG.addEventListener('input', updateColorFromRGB);
    colorB.addEventListener('input', updateColorFromRGB);
    
    // Aplicar colores
    applyColorsBtn.addEventListener('click', () => {
        const headerColor = headerColorInput.value;
        const sidebarColor = sidebarColorInput.value;
        const r = parseInt(colorR.value) || 0;
        const g = parseInt(colorG.value) || 0;
        const b = parseInt(colorB.value) || 0;
        const accentColor = rgbToHex(r, g, b);
        
        document.documentElement.style.setProperty('--header-bg', headerColor);
        document.documentElement.style.setProperty('--sidebar-bg', sidebarColor);
        document.documentElement.style.setProperty('--accent-color', accentColor);
        
        localStorage.setItem('headerColor', headerColor);
        localStorage.setItem('sidebarColor', sidebarColor);
        localStorage.setItem('accentColor', accentColor);
        
        showAlert('Colores aplicados', 'Los colores se han aplicado correctamente y se guardarán para tu próxima visita.');
    });
    
    // Restablecer colores
    resetColorsBtn.addEventListener('click', () => {
        const defaultHeaderColor = '#0a0a2a';
        const defaultSidebarColor = '#0a0a2a';
        const defaultAccentColor = '#4169e1';
        
        headerColorInput.value = defaultHeaderColor;
        sidebarColorInput.value = defaultSidebarColor;
        headerColorPreview.style.backgroundColor = defaultHeaderColor;
        sidebarColorPreview.style.backgroundColor = defaultSidebarColor;
        
        document.documentElement.style.setProperty('--header-bg', defaultHeaderColor);
        document.documentElement.style.setProperty('--sidebar-bg', defaultSidebarColor);
        document.documentElement.style.setProperty('--accent-color', defaultAccentColor);
        
        // Actualizar el selector de color de acento
        const rgbMatch = defaultAccentColor.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
        if (rgbMatch) {
            const r = parseInt(rgbMatch[1], 16);
            const g = parseInt(rgbMatch[2], 16);
            const b = parseInt(rgbMatch[3], 16);
            
            colorR.value = r;
            colorG.value = g;
            colorB.value = b;
            
            const hsl = rgbToHsl(r, g, b);
            currentHue = hsl[0];
            currentSaturation = hsl[1];
            currentLightness = hsl[2];
            
            hueSlider.value = currentHue;
            updateColorGradient();
            updateSelectorPosition();
            accentColorPreview.style.backgroundColor = defaultAccentColor;
        }
        
        localStorage.setItem('headerColor', defaultHeaderColor);
        localStorage.setItem('sidebarColor', defaultSidebarColor);
        localStorage.setItem('accentColor', defaultAccentColor);
        
        showAlert('Colores restablecidos', 'Los colores se han restablecido a los valores predeterminados.');
    });
    
    // Inicializar el gradiente de color
    updateColorGradient();
    updateSelectorPosition();
}

// Funciones de conversión de colores
function rgbToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        
        h /= 6;
    }

    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Funciones para manejar la música personalizada
function initCustomMusicUpload() {
    const chooseCustomMusicButton = document.getElementById('chooseCustomMusicButton');
    const customMusicFile = document.getElementById('customMusicFile');
    const customMusicInfo = document.getElementById('customMusicInfo');
    const removeCustomMusicButton = document.getElementById('removeCustomMusicButton');
    const saveCustomMusicButton = document.getElementById('saveCustomMusicButton');
    
    let customMusicData = null;
    
    // Cargar información de música personalizada si existe
    const savedCustomMusic = localStorage.getItem('customMusic');
    if (savedCustomMusic) {
        customMusicInfo.textContent = 'Música personalizada guardada';
        customMusicInfo.style.color = 'var(--accent-color)';
        
        // Actualizar la fuente de audio con la música personalizada
        updateBackgroundMusicSource(savedCustomMusic);
    }
    
    // Elegir archivo de música
    chooseCustomMusicButton.addEventListener('click', () => {
        customMusicFile.click();
    });
    
    customMusicFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                customMusicData = event.target.result;
                customMusicInfo.textContent = `Seleccionado: ${file.name}`;
                customMusicInfo.style.color = 'var(--accent-color)';
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Eliminar música personalizada
    removeCustomMusicButton.addEventListener('click', () => {
        customMusicData = null;
        customMusicInfo.textContent = 'No hay música personalizada seleccionada';
        customMusicInfo.style.color = '';
        localStorage.removeItem('customMusic');
        
        // Restaurar la música predeterminada
        const backgroundMusic = document.getElementById('backgroundMusic');
        backgroundMusic.src = 'https://assets.codepen.io/21542/howling-wind.mp3';
        
        if (isMusicPlaying) {
            backgroundMusic.load();
            backgroundMusic.play().catch(error => {
                console.log('Error al reproducir música predeterminada:', error);
            });
        }
        
        showAlert('Música Eliminada', 'La música personalizada ha sido eliminada.');
    });
    
    // Guardar música personalizada
    saveCustomMusicButton.addEventListener('click', () => {
        if (customMusicData) {
            localStorage.setItem('customMusic', customMusicData);
            
            // Actualizar la fuente de audio con la música personalizada
            updateBackgroundMusicSource(customMusicData);
            
            showAlert('Música Guardada', 'Tu música personalizada ha sido guardada correctamente.');
        } else {
            showAlert('Error', 'No hay música personalizada para guardar.');
        }
    });
}

// Función para actualizar la fuente de la música de fondo
function updateBackgroundMusicSource(musicDataUrl) {
    const backgroundMusic = document.getElementById('backgroundMusic');
    backgroundMusic.src = musicDataUrl;
    
    if (isMusicPlaying) {
        backgroundMusic.load();
        backgroundMusic.play().catch(error => {
            console.log('Error al reproducir música personalizada:', error);
        });
    }
}

// Modificar la función playBackgroundMusic para verificar si hay música personalizada
function playBackgroundMusic() {
    const backgroundMusic = document.getElementById('backgroundMusic');
    backgroundMusic.volume = 0.3; // Volumen moderado
    
    // Verificar si hay música personalizada guardada
    const savedCustomMusic = localStorage.getItem('customMusic');
    if (savedCustomMusic && backgroundMusic.src !== savedCustomMusic) {
        backgroundMusic.src = savedCustomMusic;
        backgroundMusic.load();
    }
    
    backgroundMusic.play().catch(error => {
        console.log('Reproducción automática bloqueada por el navegador:', error);
    });
    
    isMusicPlaying = true;
    audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
}

// Inicialización de la aplicación
function initApp() {
    // Crear estrellas
    createStars('stars', 200);
    createStars('splashStars', 200);
    
    // Crear nebulosas
    createNebulas(5);
    
    // Inicializar juegos
    filterGamesByCategory('all');
    
    // Event listeners para categorías
    const categories = document.querySelectorAll('.category');
    categories.forEach(category => {
        category.addEventListener('click', () => {
            categories.forEach(c => c.classList.remove('active'));
            category.classList.add('active');
            filterGamesByCategory(category.dataset.category);
        });
    });
    
    // Event listeners para sidebar
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            changeSection(item.dataset.section);
        });
    });
    
    // Event listener para botón de alerta
    document.getElementById('alertButton').addEventListener('click', closeAlert);
    
    // Event listeners para controles de juego
    document.getElementById('backToMenuButton').addEventListener('click', closeGame);
    document.getElementById('fullscreenButton').addEventListener('click', toggleFullscreen);
    document.getElementById('openDirectoryButton').addEventListener('click', openGameInNewTab);
    
    // Event listener para botón de inicio
    document.getElementById('startButton').addEventListener('click', () => {
        document.getElementById('splashScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('splashScreen').style.display = 'none';
        }, 1000);
    });
    
    // Event listeners para configuraciones
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light-theme', themeToggle.checked);
    });
    
    const fontSizeRadios = document.querySelectorAll('input[name="fontSize"]');
    fontSizeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            document.body.classList.remove('font-small', 'font-large');
            if (radio.value !== 'medium') {
                document.body.classList.add(`font-${radio.value}`);
            }
        });
    });
    
    const reduceMotionToggle = document.getElementById('reduceMotionToggle');
    reduceMotionToggle.addEventListener('change', () => {
        document.body.classList.toggle('reduced-motion', reduceMotionToggle.checked);
    });
    
    const languageSelect = document.getElementById('languageSelect');
    languageSelect.addEventListener('change', () => {
        const lang = languageSelect.value;
        document.querySelectorAll('[data-en]').forEach(el => {
            el.textContent = el.dataset[lang];
        });
    });
    
    const graphicsQualitySlider = document.getElementById('graphicsQualitySlider');
    const graphicsQualityValue = document.getElementById('graphicsQualityValue');
    graphicsQualitySlider.addEventListener('input', () => {
        graphicsQualityValue.textContent = graphicsQualitySlider.value;
    });
    
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    saveSettingsButton.addEventListener('click', () => {
        // Guardar configuraciones en localStorage
        localStorage.setItem('theme', themeToggle.checked ? 'light' : 'dark');
        localStorage.setItem('fontSize', document.querySelector('input[name="fontSize"]:checked').value);
        localStorage.setItem('reduceMotion', reduceMotionToggle.checked);
        localStorage.setItem('language', languageSelect.value);
        localStorage.setItem('graphicsQuality', graphicsQualitySlider.value);
        localStorage.setItem('visualEffects', document.getElementById('visualEffectsToggle').checked);
        
        showAlert('Configuración Guardada', 'Tu configuración ha sido guardada correctamente y se aplicará en tu próxima visita.');
    });
    
    // Cargar configuraciones guardadas
    if (localStorage.getItem('theme') === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
    }
    
    if (localStorage.getItem('fontSize')) {
        const savedFontSize = localStorage.getItem('fontSize');
        document.querySelector(`input[name="fontSize"][value="${savedFontSize}"]`).checked = true;
        if (savedFontSize !== 'medium') {
            document.body.classList.add(`font-${savedFontSize}`);
        }
    }
    
    if (localStorage.getItem('reduceMotion') === 'true') {
        reduceMotionToggle.checked = true;
        document.body.classList.add('reduced-motion');
    }
    
    if (localStorage.getItem('language')) {
        const savedLanguage = localStorage.getItem('language');
        languageSelect.value = savedLanguage;
        document.querySelectorAll('[data-en]').forEach(el => {
            el.textContent = el.dataset[savedLanguage];
        });
    }
    
    if (localStorage.getItem('graphicsQuality')) {
        const savedGraphicsQuality = localStorage.getItem('graphicsQuality');
        graphicsQualitySlider.value = savedGraphicsQuality;
        graphicsQualityValue.textContent = savedGraphicsQuality;
    }
    
    if (localStorage.getItem('visualEffects') === 'false') {
        document.getElementById('visualEffectsToggle').checked = false;
    }
    
    // Inicializar perfil
    initProfile();
    
    // Inicializar personalización de fondo
    initBackgroundCustomization();
    
    // Inicializar personalización de colores
    initColorCustomization();
    
    // Inicializar subida de música personalizada
    initCustomMusicUpload();
    
    // Observar cambios en el DOM para aplicar el cursor personalizado a nuevos elementos
    const customCursor = localStorage.getItem('customCursor');
    
}
    // --- Personalización de fuente ---
(function(){
    const fontSelect = document.getElementById('profileFont');
    // Cargar fuente guardada
    const savedFont = localStorage.getItem('profileFont');
    if(savedFont) {
        fontSelect.value = savedFont;
        document.body.style.fontFamily = savedFont;
    }
    fontSelect.addEventListener('change', function() {
        document.body.style.fontFamily = this.value;
        localStorage.setItem('profileFont', this.value);
    });
})();

// --- Personalización de sonido hover ---
(function(){
    const chooseHoverSoundButton = document.getElementById('chooseHoverSoundButton');
    const hoverSoundFileInput = document.getElementById('hoverSoundFileInput');
    const hoverSoundInfo = document.getElementById('hoverSoundInfo');
    const removeHoverSoundButton = document.getElementById('removeHoverSoundButton');
    const saveHoverSoundButton = document.getElementById('saveHoverSoundButton');
    let hoverSoundData = null;

    // Cargar sonido guardado
    const savedHoverSound = localStorage.getItem('customHoverSound');
    if(savedHoverSound) {
        hoverSoundInfo.textContent = 'Sonido personalizado guardado';
        hoverSoundInfo.style.color = 'var(--accent-color)';
    }

    chooseHoverSoundButton.addEventListener('click', () => hoverSoundFileInput.click());
    hoverSoundFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                hoverSoundData = event.target.result;
                hoverSoundInfo.textContent = `Seleccionado: ${file.name}`;
                hoverSoundInfo.style.color = 'var(--accent-color)';
            };
            reader.readAsDataURL(file);
        }
    });
    removeHoverSoundButton.addEventListener('click', () => {
        hoverSoundData = null;
        hoverSoundInfo.textContent = 'No hay sonido personalizado seleccionado';
        hoverSoundInfo.style.color = '';
        localStorage.removeItem('customHoverSound');
    });
    saveHoverSoundButton.addEventListener('click', () => {
        if(hoverSoundData) {
            localStorage.setItem('customHoverSound', hoverSoundData);
            hoverSoundInfo.textContent = 'Sonido personalizado guardado';
            hoverSoundInfo.style.color = 'var(--accent-color)';
        }
    });

    // Sobrescribir playHoverSound para usar el sonido personalizado si existe
    window.playHoverSound = function() {
        const custom = localStorage.getItem('customHoverSound');
        let audio;
        if(custom) {
            audio = new Audio(custom);
            audio.volume = 0.2;
        } else {
            const hoverSound = document.getElementById('hoverSound');
            audio = hoverSound.cloneNode(true);
            audio.volume = 0.2;
        }
        audio.play().catch(()=>{});
    };
})();
(function(){
    const fontSelect = document.getElementById('profileFont');
    const customFontUrlInput = document.getElementById('customFontUrl');
    const applyCustomFontUrlBtn = document.getElementById('applyCustomFontUrl');
    const customFontUrlInfo = document.getElementById('customFontUrlInfo');

    // Cargar fuente guardada
    const savedFont = localStorage.getItem('profileFont');
    if(savedFont) {
        fontSelect.value = savedFont;
        document.body.style.fontFamily = savedFont;
    }

    // Cargar fuente personalizada guardada
    const savedFontUrl = localStorage.getItem('customFontUrl');
    const savedFontFamily = localStorage.getItem('customFontFamily');
    if(savedFontUrl && savedFontFamily) {
        loadGoogleFont(savedFontUrl, savedFontFamily);
        document.body.style.fontFamily = savedFontFamily;
        customFontUrlInput.value = savedFontUrl;
        customFontUrlInfo.textContent = 'Fuente personalizada aplicada';
        customFontUrlInfo.style.color = 'var(--accent-color)';
    }

    fontSelect.addEventListener('change', function() {
        document.body.style.fontFamily = this.value;
        localStorage.setItem('profileFont', this.value);
        // Limpiar fuente personalizada
        localStorage.removeItem('customFontUrl');
        localStorage.removeItem('customFontFamily');
        customFontUrlInfo.textContent = '';
    });

    applyCustomFontUrlBtn.addEventListener('click', function() {
        const url = customFontUrlInput.value.trim();
        if(!url) return;
        // Extraer el nombre de la familia de la URL
        const match = url.match(/family=([^:&]*)/);
        if(!match) {
            customFontUrlInfo.textContent = 'URL inválida';
            customFontUrlInfo.style.color = 'red';
            return;
        }
        let family = decodeURIComponent(match[1]).replace(/\+/g, ' ');
        // Cargar la fuente
        loadGoogleFont(url, family);
        document.body.style.fontFamily = family;
        localStorage.setItem('customFontUrl', url);
        localStorage.setItem('customFontFamily', family);
        customFontUrlInfo.textContent = 'Fuente personalizada aplicada';
        customFontUrlInfo.style.color = 'var(--accent-color)';
        // Limpiar select
        fontSelect.value = '';
        localStorage.removeItem('profileFont');
    });

    function loadGoogleFont(url, family) {
        // Elimina link anterior si existe
        let old = document.getElementById('customFontLink');
        if(old) old.remove();
        let link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        link.id = 'customFontLink';
        document.head.appendChild(link);
    }
})();

        // Variables para los elementos de audio
let isMusicPlaying = false;
const backgroundMusic = document.getElementById('backgroundMusic');
const hoverSound = document.getElementById('hoverSound');
const audioToggle = document.getElementById('audioToggle');

// --- MÚSICA DE FONDO PERSONALIZADA ---
function playBackgroundMusic() {
    const savedCustomMusic = localStorage.getItem('customMusic');
    if (savedCustomMusic) {
        if (backgroundMusic.src !== savedCustomMusic) {
            backgroundMusic.src = savedCustomMusic;
            backgroundMusic.load();
        }
    } else {
        if (!backgroundMusic.src.endsWith('titulo.mp3')) {
            backgroundMusic.src = 'titulo.mp3';
            backgroundMusic.load();
        }
    }
    backgroundMusic.volume = 0.3;
    backgroundMusic.play().catch(()=>{});
    isMusicPlaying = true;
    audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
}
function stopBackgroundMusic() {
    backgroundMusic.pause();
    isMusicPlaying = false;
    audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
}

// --- SONIDO DE HOVER PERSONALIZADO ---
function playHoverSound() {
    const custom = localStorage.getItem('customHoverSound');
    let audio;
    if (custom) {
        audio = new Audio(custom);
        audio.volume = 0.2;
    } else {
        audio = hoverSound.cloneNode(true);
        audio.volume = 0.2;
    }
    audio.play().catch(()=>{});
}

// --- BOTÓN DE CONTROL DE AUDIO ---
audioToggle.addEventListener('click', () => {
    if (isMusicPlaying) stopBackgroundMusic();
    else playBackgroundMusic();
});

// --- INICIAR MÚSICA AL INICIAR ---
document.getElementById('startButton').addEventListener('click', () => {
    playBackgroundMusic();
});
window._originalOpenGame = window.openGame;
let coinTimeout = null;

// --- DETENER MÚSICA AL ABRIR JUEGO ---
window.openGame = function(game) {
    const gameIframe = document.getElementById('gameIframe');
    const gameIframeContainer = document.getElementById('gameIframeContainer');
    if (isMusicPlaying) stopBackgroundMusic();
    gameIframe.src = game.url;
    gameIframeContainer.style.display = 'flex';
    if (typeof stopBackgroundMusic === "function") stopBackgroundMusic();
};

// --- REANUDAR MÚSICA AL CERRAR JUEGO ---
window.closeGame = function() {
    const gameIframe = document.getElementById('gameIframe');
    const gameIframeContainer = document.getElementById('gameIframeContainer');
    gameIframe.src = 'about:blank';
    gameIframeContainer.style.display = 'none';
    gameIframeContainer.classList.remove('fullscreen');
    playBackgroundMusic();
};

// --- SONIDO DE HOVER EN ELEMENTOS INTERACTIVOS ---
function addHoverSoundToElements() {
    const interactiveElements = document.querySelectorAll('.sidebar-item, .game-card, .category, button, .settings-option, .toggle-switch, .radio-option');
    interactiveElements.forEach(element => {
        element.removeEventListener('mouseenter', playHoverSound);
        element.addEventListener('mouseenter', playHoverSound);
    });
}
document.addEventListener('DOMContentLoaded', addHoverSoundToElements);
// Observar DOM para elementos dinámicos
const observer = new MutationObserver(addHoverSoundToElements);
observer.observe(document.body, { childList: true, subtree: true });
        
        // Función para iniciar la música de fondo
        function playBackgroundMusic() {
            const backgroundMusic = document.getElementById('backgroundMusic');
            backgroundMusic.volume = 0.3; // Volumen moderado
            
            // Verificar si hay música personalizada guardada
            const savedCustomMusic = localStorage.getItem('customMusic');
            if (savedCustomMusic && backgroundMusic.src !== savedCustomMusic) {
                backgroundMusic.src = savedCustomMusic;
                backgroundMusic.load();
            }
            
            backgroundMusic.play().catch(error => {
                console.log('Reproducción automática bloqueada por el navegador:', error);
            });
            
            isMusicPlaying = true;
            audioToggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        
        // Función para detener la música de fondo
        function stopBackgroundMusic() {
            backgroundMusic.pause();
            isMusicPlaying = false;
            audioToggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
        
        // Función para reproducir el sonido de hover
        function playHoverSound() {
            // Clonamos el sonido para permitir múltiples reproducciones simultáneas
            const hoverSoundClone = hoverSound.cloneNode(true);
            hoverSoundClone.volume = 0.2; // Volumen bajo para no molestar
            hoverSoundClone.play().catch(error => {
                console.log('Reproducción de sonido bloqueada:', error);
            });
        }
        
        // Iniciar música después de la interacción del usuario
        document.getElementById('startButton').addEventListener('click', () => {
            playBackgroundMusic();
            // Mantén el código existente para este evento
        });
        
        // Alternar música con el botón de control
        audioToggle.addEventListener('click', () => {
            if (isMusicPlaying) {
                stopBackgroundMusic();
            } else {
                playBackgroundMusic();
            }
        });
        

        
        // Reanudar música cuando se cierra un juego

        
        // Añadir efecto de sonido a elementos interactivos
        document.addEventListener('DOMContentLoaded', () => {
            // Añadir sonido a los elementos interactivos
            const interactiveElements = document.querySelectorAll('.sidebar-item, .game-card, .category, button, .settings-option, .toggle-switch, .radio-option');
            
            interactiveElements.forEach(element => {
                element.addEventListener('mouseenter', playHoverSound);
            });
            
            // Observador de mutaciones para añadir sonido a elementos creados dinámicamente
            const observer = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) { // Elemento
                                if (node.classList && (
                                    node.classList.contains('game-card') || 
                                    node.classList.contains('category') || 
                                    node.tagName === 'BUTTON'
                                )) {
                                    node.addEventListener('mouseenter', playHoverSound);
                                }
                                
                                // Buscar elementos hijos que puedan ser interactivos
                                const childInteractives = node.querySelectorAll('.sidebar-item, .game-card, .category, button, .settings-option, .toggle-switch, .radio-option');
                                childInteractives.forEach(child => {
                                    child.addEventListener('mouseenter', playHoverSound);
                                });
                            }
                        });
                    }
                });
            });
            
            // Observar cambios en el DOM
            observer.observe(document.body, { childList: true, subtree: true });
            
            // Reemplazar las funciones originales
            window.openGame = openGame;
            window.closeGame = closeGame;
        });
// --- Sistema de puntos ---
// Guardar y mostrar puntos del usuario al jugar juegos

// Inicializar puntos si no existen
function getUserPoints() {
    return parseInt(localStorage.getItem('userPoints') || '0', 10);
}
function setUserPoints(points) {
    localStorage.setItem('userPoints', points);
    updatePointsDisplay();
}
function addUserPoints(amount) {
    const current = getUserPoints();
    setUserPoints(current + amount);
}

// Mostrar puntos en la interfaz
function updatePointsDisplay() {
    let pointsBar = document.getElementById('pointsBar');
    if (!pointsBar) {
        // Crear barra de puntos en el header si no existe
        const header = document.querySelector('header .user-profile');
        pointsBar = document.createElement('div');
        pointsBar.id = 'pointsBar';
        pointsBar.style.marginLeft = '1rem';
        pointsBar.style.background = 'var(--accent-color)';
        pointsBar.style.color = 'white';
        pointsBar.style.borderRadius = '20px';
        pointsBar.style.padding = '0.3rem 1rem';
        pointsBar.style.fontWeight = '700';
        pointsBar.style.fontSize = '1rem';
        pointsBar.style.display = 'flex';
        pointsBar.style.alignItems = 'center';
        pointsBar.innerHTML = `<i class="fas fa-star" style="margin-right:6px;"></i> <span id="pointsValue">0</span> pts`;
        header.appendChild(pointsBar);
    }
    document.getElementById('pointsValue').textContent = getUserPoints();
}

// Sumar puntos al abrir un juego
function openGameWithPoints(game) {
    window._originalOpenGame(game);

    let rewardTimeout;
    let rewardGiven = false;

    function giveReward() {
        if (!rewardGiven) {
            addUserPoints(10);
            showAlert('¡Felicidades!', 'Has ganado 10 estrellas por jugar 5 segundos.');
            rewardGiven = true;
            cleanupListeners();
        }
    }

    function cancelReward(reason) {
        if (!rewardGiven) {
            clearTimeout(rewardTimeout);
            cleanupListeners();
            console.log('Recompensa cancelada:', reason);
        }
    }

    function handleVisibilityChange() {
        if (document.visibilityState !== 'visible') {
            cancelReward('Saliste de la pestaña o minimizaste la ventana');
        }
    }

    function handleBackToMenuClick() {
        cancelReward('Saliste al menú antes de tiempo');
    }

    function cleanupListeners() {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        const backButton = document.getElementById('backToMenuButton');
        if (backButton) {
            backButton.removeEventListener('click', handleBackToMenuClick);
        }
    }

    // Escuchamos el cambio de visibilidad
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Escuchamos el clic en el botón de salir al menú
    const backButton = document.getElementById('backToMenuButton');
    if (backButton) {
        backButton.addEventListener('click', handleBackToMenuClick);
    }

    // Esperamos 5 segundos antes de otorgar la recompensa
    rewardTimeout = setTimeout(giveReward, 5000);
}



// Inicializar sistema de puntos al cargar la app
(function() {
    // Mostrar puntos al cargar
    document.addEventListener('DOMContentLoaded', updatePointsDisplay);

    // Guardar referencia a la función original
    window._originalOpenGame = window.openGame;
    // Sobrescribir openGame para sumar puntos
    window.openGame = openGameWithPoints;
})();

// --- SISTEMA DE LOGROS MODERNO ---
// 1. Define los logros
const ACHIEVEMENTS = [
    // Logros de juegos
    {
        id: 'first_play',
        icon: 'fa-play-circle',
        title: '¡Primer Juego!',
        desc: 'Juega tu primer juego en la plataforma.',
        trigger: 'onGamePlayed',
        points: 10
    },
    {
        id: 'five_games',
        icon: 'fa-dice-five',
        title: 'Jugador Casual',
        desc: 'Juega 5 partidas en cualquier juego.',
        trigger: 'onGamePlayedCount',
        count: 5,
        points: 20
    },
    {
        id: 'win_first_game',
        icon: 'fa-trophy',
        title: '¡Victoria!',
        desc: 'Gana tu primer juego.',
        trigger: 'onGameWin',
        points: 15
    },
    {
        id: 'ten_wins',
        icon: 'fa-crown',
        title: 'Ganador Consistente',
        desc: 'Gana 10 partidas.',
        trigger: 'onGameWinCount',
        count: 10,
        points: 30
    },
    {
        id: 'try_all_games',
        icon: 'fa-gamepad',
        title: 'Explorador de Juegos',
        desc: 'Juega al menos una vez cada juego disponible.',
        trigger: 'onAllGamesPlayed',
        points: 40
    },
    {
        id: 'score_1000',
        icon: 'fa-star',
        title: 'Puntaje Maestro',
        desc: 'Alcanza 1000 puntos en cualquier juego.',
        trigger: 'onScoreReached',
        count: 1000,
        points: 25
    },
    {
        id: 'play_with_friend',
        icon: 'fa-user-friends',
        title: 'Juego en Compañía',
        desc: 'Juega una partida multijugador con un amigo.',
        trigger: 'onMultiplayerGame',
        points: 20
    },
    {
        id: 'daily_play_7',
        icon: 'fa-calendar-week',
        title: 'Constancia Gamer',
        desc: 'Juega al menos una partida diaria durante 7 días seguidos.',
        trigger: 'onDailyGameStreak',
        count: 7,
        points: 35
    },
    // NUEVOS LOGROS RELACIONADOS CON LA PÁGINA
    {
        id: 'visit_home',
        icon: 'fa-home',
        title: 'Bienvenido',
        desc: 'Visita la página principal.',
        trigger: 'onVisitHome',
        points: 5
    },
    {
        id: 'visit_about',
        icon: 'fa-info-circle',
        title: 'Curioso',
        desc: 'Visita la sección "Acerca de".',
        trigger: 'onVisitAbout',
        points: 5
    },
    {
        id: 'visit_contact',
        icon: 'fa-envelope',
        title: '¿Dudas?',
        desc: 'Visita la sección de contacto.',
        trigger: 'onVisitContact',
        points: 5
    },
    {
        id: 'change_theme',
        icon: 'fa-adjust',
        title: 'Personalizador',
        desc: 'Cambia el tema de la página.',
        trigger: 'onChangeTheme',
        points: 10
    },
    {
        id: 'scroll_down',
        icon: 'fa-arrow-down',
        title: 'Explorador',
        desc: 'Desplázate hasta el final de la página.',
        trigger: 'onScrollDown',
        points: 10
    },
    {
        id: 'share_page',
        icon: 'fa-share-alt',
        title: 'Compartidor',
        desc: 'Comparte la página usando el botón de compartir.',
        trigger: 'onSharePage',
        points: 15
    },
    {
        id: 'feedback_sent',
        icon: 'fa-comment-dots',
        title: 'Colaborador',
        desc: 'Envía un comentario o sugerencia.',
        trigger: 'onFeedbackSent',
        points: 20
    },
    {
        id: 'visit_10_days',
        icon: 'fa-calendar-check',
        title: 'Visitante Frecuente',
        desc: 'Visita la página durante 10 días diferentes.',
        trigger: 'onVisitDays',
        count: 10,
        points: 30
    },
    {
        id: 'play_3_games_one_day',
        icon: 'fa-bolt',
        title: 'Maratón Relámpago',
        desc: 'Juega 3 juegos diferentes en un solo día.',
        trigger: 'onThreeGamesOneDay',
        points: 25
    },
    {
        id: 'night_owl',
        icon: 'fa-moon',
        title: 'Búho Nocturno',
        desc: 'Juega un juego entre la medianoche y las 6am.',
        trigger: 'onNightPlay',
        points: 20
    },
    {
        id: 'early_bird',
        icon: 'fa-sun',
        title: 'Madrugador',
        desc: 'Juega un juego entre las 6am y las 8am.',
        trigger: 'onEarlyPlay',
        points: 20
    },
    {
        id: 'settings_opened',
        icon: 'fa-cogs',
        title: 'Curioso Técnico',
        desc: 'Abre la configuración de la página.',
        trigger: 'onSettingsOpened',
        points: 10
    },
    {
        id: 'mute_sound',
        icon: 'fa-volume-mute',
        title: 'Silencio',
        desc: 'Silencia el sonido de la página.',
        trigger: 'onMuteSound',
        points: 10
    },
    {
        id: 'unmute_sound',
        icon: 'fa-volume-up',
        title: '¡Que suene!',
        desc: 'Activa el sonido de la página.',
        trigger: 'onUnmuteSound',
        points: 10
    },
    {
        id: 'first_logout',
        icon: 'fa-sign-out-alt',
        title: 'Hasta Pronto',
        desc: 'Cierra sesión por primera vez.',
        trigger: 'onLogout',
        points: 10
    }
];

// 2. Utilidades de logros
function getAchievementsData() {
    return JSON.parse(localStorage.getItem('astral_achievements') || '{}');
}
function saveAchievementsData(data) {
    localStorage.setItem('astral_achievements', JSON.stringify(data));
}
function unlockAchievement(id) {
    let data = getAchievementsData();
    if (data[id] && data[id].unlocked) return;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    data[id] = { unlocked: true, date: new Date().toISOString() };
    saveAchievementsData(data);
    if (ach.points) addUserPoints(ach.points);
    showAchievementToast(ach);
    renderAchievementsPanel();
    renderAchievementsSection();
}
function isAchievementUnlocked(id) {
    const data = getAchievementsData();
    return data[id] && data[id].unlocked;
}
function showAchievementToast(ach) {
    const toast = document.getElementById('achievementToast');
    toast.innerHTML = `<span class="achievement-icon"><i class="fas ${ach.icon}"></i></span> ¡Logro desbloqueado! <b>${ach.title}</b>`;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 3500);
}
function renderAchievementsPanel() {
    const list = document.getElementById('achievementList');
    if (!list) return;
    const data = getAchievementsData();
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
        const unlocked = data[ach.id] && data[ach.id].unlocked;
        const date = unlocked ? new Date(data[ach.id].date).toLocaleString() : '';
        const li = document.createElement('li');
        li.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
        li.innerHTML = `
            <span class="achievement-icon"><i class="fas ${ach.icon}"></i></span>
            <div class="achievement-info">
                <div class="achievement-title">${ach.title}</div>
                <div class="achievement-desc">${ach.desc}</div>
                ${unlocked ? `<div class="achievement-date">Desbloqueado: ${date}</div>` : ''}
            </div>
        `;
        list.appendChild(li);
    });
}
function renderAchievementsSection() {
    const list = document.getElementById('achievementListMain');
    if (!list) return;
    const data = getAchievementsData();
    list.innerHTML = '';
    ACHIEVEMENTS.forEach(ach => {
        const unlocked = data[ach.id] && data[ach.id].unlocked;
        const date = unlocked ? new Date(data[ach.id].date).toLocaleString() : '';
        const li = document.createElement('li');
        li.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
        li.innerHTML = `
            <span class="achievement-icon"><i class="fas ${ach.icon}"></i></span>
            <div class="achievement-info">
                <div class="achievement-title">${ach.title}</div>
                <div class="achievement-desc">${ach.desc}</div>
                ${unlocked ? `<div class="achievement-date">Desbloqueado: ${date}</div>` : ''}
            </div>
        `;
        list.appendChild(li);
    });
}

// 3. Triggers automáticos de logros
(function(){
    // Panel de logros
    const btn = document.getElementById('achievementsBtn');
    const panel = document.getElementById('achievementsPanel');
    if (btn && panel) {
        btn.onclick = function() {
            panel.classList.toggle('show');
            renderAchievementsPanel();
        };
        document.addEventListener('click', function(e){
            if (!panel.contains(e.target) && e.target !== btn && panel.classList.contains('show')) {
                panel.classList.remove('show');
            }
        });
    }
    // Render inicial
    renderAchievementsPanel();
    renderAchievementsSection();

    // --- Triggers automáticos ---
    // 1. Jugar juegos
    let playedGames = JSON.parse(localStorage.getItem('astral_played_games') || '[]');
    window._originalOpenGameAchievements = window.openGame;
    window.openGame = function(game) {
        if (!playedGames.includes(game.id)) {
            playedGames.push(game.id);
            localStorage.setItem('astral_played_games', JSON.stringify(playedGames));
            if (playedGames.length === 1) unlockAchievement('first_play');
            if (playedGames.length === 5) unlockAchievement('five_games');
        }
        window._originalOpenGameAchievements(game);
    };
    // 2. Perfil completo
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function() {
            setTimeout(()=>{
                const data = JSON.parse(localStorage.getItem('profileData')||'{}');
                if (data.name && data.surname && data.age && data.gender) unlockAchievement('profile_complete');
            }, 200);
        });
    }
    // 3. Fondo personalizado
    const saveBgBtn = document.getElementById('saveBackgroundButton');
    if (saveBgBtn) {
        saveBgBtn.addEventListener('click', function() {
            setTimeout(()=>{
                if (localStorage.getItem('customBackground')) unlockAchievement('custom_bg');
            }, 200);
        });
    }
    // 4. Música personalizada
    const saveMusicBtn = document.getElementById('saveCustomMusicButton');
    if (saveMusicBtn) {
        saveMusicBtn.addEventListener('click', function() {
            setTimeout(()=>{
                if (localStorage.getItem('customMusic')) unlockAchievement('custom_music');
            }, 200);
        });
    }
    // 5. Colores personalizados
    const applyColorsBtn = document.getElementById('applyColors');
    if (applyColorsBtn) {
        applyColorsBtn.addEventListener('click', function() {
            setTimeout(()=>{
                if (localStorage.getItem('headerColor') || localStorage.getItem('sidebarColor') || localStorage.getItem('accentColor')) unlockAchievement('custom_colors');
            }, 200);
        });
    }
})();

const STORAGE_KEY = 'user_achievements';

function getUnlockedAchievements() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

function unlockAchievement(id) {
    const unlocked = getUnlockedAchievements();
    if (!unlocked[id]) {
        unlocked[id] = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
        showAchievementPopup(id);
    }
}

function showAchievementPopup(id) {
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;
    let popup = document.createElement('div');
    popup.className = 'achievement-popup';
    popup.innerHTML = `<i class="fas ${ach.icon}"></i> <strong>${ach.title}</strong><br>${ach.desc}`;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 4000);
}

// 3. Variables y contadores
let gamePlayedCount = 0;
let gameWinCount = 0;
let playedGames = new Set();
let dailyStreak = 0;
let lastPlayDate = '';
let visitDates = new Set();
let gamesPlayedToday = new Set();

// 4. Inicialización de contadores desde localStorage
(function initAchievementCounters() {
    gamePlayedCount = parseInt(localStorage.getItem('gamePlayedCount') || '0');
    gameWinCount = parseInt(localStorage.getItem('gameWinCount') || '0');
    playedGames = new Set(JSON.parse(localStorage.getItem('playedGames') || '[]'));
    dailyStreak = parseInt(localStorage.getItem('dailyStreak') || '0');
    lastPlayDate = localStorage.getItem('lastPlayDate') || '';
    visitDates = new Set(JSON.parse(localStorage.getItem('visitDates') || '[]'));
    gamesPlayedToday = new Set(JSON.parse(localStorage.getItem('gamesPlayedToday') || '[]'));
})();

// 5. Guardar progreso en localStorage
function saveProgress() {
    localStorage.setItem('gamePlayedCount', gamePlayedCount);
    localStorage.setItem('gameWinCount', gameWinCount);
    localStorage.setItem('playedGames', JSON.stringify(Array.from(playedGames)));
    localStorage.setItem('visitDates', JSON.stringify(Array.from(visitDates)));
    localStorage.setItem('gamesPlayedToday', JSON.stringify(Array.from(gamesPlayedToday)));
}

// 6. Ejemplo de integración con tus juegos
function onGamePlayed(gameName) {
    gamePlayedCount++;
    playedGames.add(gameName);

    // Para el logro de juegos en un día
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('gamesPlayedTodayDate') !== today) {
        gamesPlayedToday = new Set();
        localStorage.setItem('gamesPlayedTodayDate', today);
    }
    gamesPlayedToday.add(gameName);
    if (gamesPlayedToday.size >= 3) unlockAchievement('play_3_games_one_day');
    saveProgress();

    unlockAchievement('first_play');
    if (gamePlayedCount === 5) unlockAchievement('five_games');
    if (playedGames.size === getAllGameNames().length) unlockAchievement('try_all_games');
    handleDailyStreak();
    saveProgress();

    // Logro nocturno y madrugador
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 6) unlockAchievement('night_owl');
    if (hour >= 6 && hour < 8) unlockAchievement('early_bird');
    saveProgress();
}

function onGameWin() {
    gameWinCount++;
    unlockAchievement('win_first_game');
    if (gameWinCount === 10) unlockAchievement('ten_wins');
    saveProgress();
}

function onScoreReached(score) {
    if (score >= 1000) unlockAchievement('score_1000');
}

function onMultiplayerGame() {
    unlockAchievement('play_with_friend');
}

function handleDailyStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (lastPlayDate !== today) {
        if (lastPlayDate && (new Date(today) - new Date(lastPlayDate) === 86400000)) {
            dailyStreak++;
        } else {
            dailyStreak = 1;
        }
        lastPlayDate = today;
        if (dailyStreak === 7) unlockAchievement('daily_play_7');
    }
    localStorage.setItem('lastPlayDate', lastPlayDate);
    localStorage.setItem('dailyStreak', dailyStreak);
}

// 7. Utilidad para obtener todos los nombres de juegos (ajusta según tus juegos)
function getAllGameNames() {
    // Ejemplo: ['Ajedrez', 'Sudoku', 'Tetris']
    return ['Ajedrez', 'Sudoku', 'Tetris'];
}

// 8. Logros de interacción con la página
function onVisitHome() { unlockAchievement('visit_home'); }
function onVisitAbout() { unlockAchievement('visit_about'); }
function onVisitContact() { unlockAchievement('visit_contact'); }
function onChangeTheme() { unlockAchievement('change_theme'); }
function onScrollDown() { unlockAchievement('scroll_down'); }
function onSharePage() { unlockAchievement('share_page'); }
function onFeedbackSent() { unlockAchievement('feedback_sent'); }
function onSettingsOpened() { unlockAchievement('settings_opened'); }
function onMuteSound() { unlockAchievement('mute_sound'); }
function onUnmuteSound() { unlockAchievement('unmute_sound'); }
function onLogout() { unlockAchievement('first_logout'); }

// 9. Logro de visitas en días diferentes
(function trackVisitDays() {
    const today = new Date().toISOString().slice(0, 10);
    visitDates.add(today);
    if (visitDates.size >= 10) unlockAchievement('visit_10_days');
    saveProgress();
})();

// 10. Detectar scroll al fondo de la página
window.addEventListener('scroll', function() {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 2) {
        onScrollDown();
    }
});

// 11. Ejemplo de integración con botones/secciones
// Llama a estas funciones desde tu lógica de navegación o UI:
// onVisitHome(), onVisitAbout(), onVisitContact(), onChangeTheme(), onSharePage(), onFeedbackSent(), onSettingsOpened(), onMuteSound(), onUnmuteSound(), onLogout()

// 12. Estilos para el popup de logros
const style = document.createElement('style');
style.textContent = `
.achievement-popup {
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: #222;
    color: #fff;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    font-size: 1.1em;
    z-index: 9999;
    opacity: 0.95;
    display: flex;
    align-items: center;
    gap: 12px;
}
.achievement-popup i {
    font-size: 2em;
    margin-right: 10px;
}
`;
document.head.appendChild(style);
// --- Mostrar pantalla de error negra hiperrealista con informe y redirección de seguridad ---
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        var sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(function(item) {
            var span = item.querySelector('span');
            if (span && (span.textContent.trim().toLowerCase() === 'logros' || span.dataset.section === 'achievements')) {
                item.addEventListener('click', function(e) {
                    e.preventDefault();

                    // Detener todos los audios de la página
                    document.querySelectorAll('audio').forEach(function(audio) {
                        audio.pause();
                        audio.currentTime = 0;
                    });
                    var audio = new Audio('error.mp3');
                    audio.volume = 0.7;
                    audio.play().catch(()=>{});

                    // Crear overlay de error negra
                    var overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100vw';
                    overlay.style.height = '100vh';
                    overlay.style.background = '#111';
                    overlay.style.display = 'flex';
                    overlay.style.flexDirection = 'column';
                    overlay.style.alignItems = 'center';
                    overlay.style.justifyContent = 'center';
                    overlay.style.zIndex = '99999';
                    overlay.style.userSelect = 'none';

                    // Icono de advertencia
                    var icon = document.createElement('div');
                    icon.innerHTML = `
                        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                          <circle cx="40" cy="40" r="38" stroke="#ff5252" stroke-width="4" fill="#222"/>
                          <rect x="36" y="18" width="8" height="30" rx="4" fill="#ff5252"/>
                          <rect x="36" y="54" width="8" height="8" rx="4" fill="#ff5252"/>
                        </svg>
                    `;
                    overlay.appendChild(icon);

                    // Mensaje de error hiperrealista
                    var msg = document.createElement('div');
                    msg.innerHTML = `
                        <center>
                        <h1 style="color:#fff;font-size:2em;margin:18px 0 8px 0;font-family:Roboto,Arial,sans-serif;font-weight:500;letter-spacing:0.01em;">
                            Se ha producido un error crítico del sistema
                        </h1>
                        <p style="color:#ff5252;font-size:1.1em;font-family:monospace;text-align:center;max-width:520px;margin-bottom:18px;">
                            Código de error: <b>SECURITY_PROTOCOL_VIOLATION</b><br>
                            Protocolo de seguridad activado. El sistema recopilará información de diagnóstico.
                        </p>
                        <div style="background:#181818;border-radius:8px;padding:18px 24px;margin-bottom:18px;box-shadow:0 2px 12px #0004;">
                            <pre style="color:#bdbdbd;font-size:1em;line-height:1.5;font-family:Consolas,monospace;overflow-x:auto;margin:0;">
Timestamp: ${new Date().toLocaleString()}
Session ID: ${Math.random().toString(36).substr(2,12).toUpperCase()}
User Agent: ${navigator.userAgent}
Error Ref: 0x${Math.floor(Math.random()*0xFFFFFFF).toString(16).toUpperCase()}
Stacktrace:
    at SecurityProtocol.activate (core.js:42)
    at System.main (main.js:11)
    at &lt;anonymous&gt;
                            </pre>
                        </div>
                        <p style="color:#ffd740;font-size:1em;text-align:center;">
                            Serás redirigido automáticamente por seguridad en <span id="sec-countdown" style="font-weight:bold;">5</span> segundos...
                        </p>
                    `;
                    overlay.appendChild(msg);

                    // Sonido de alerta (opcional, puedes comentar si no tienes archivo)
                    // var audio = new Audio('ALERT_SOUND.mp3');
                    // audio.volume = 0.7;
                    // audio.play().catch(()=>{});

                    document.body.appendChild(overlay);

                    // Pantalla completa automática
                    if (overlay.requestFullscreen) {
                        overlay.requestFullscreen();
                    } else if (overlay.webkitRequestFullscreen) {
                        overlay.webkitRequestFullscreen();
                    } else if (overlay.msRequestFullscreen) {
                        overlay.msRequestFullscreen();
                    }

                    // Cuenta regresiva visual
                    var countdown = 5;
                    var countdownSpan = overlay.querySelector('#sec-countdown');
                    var interval = setInterval(function() {
                        countdown--;
                        if (countdownSpan) countdownSpan.textContent = countdown;
                        if (countdown <= 0) clearInterval(interval);
                    }, 1000);

                    // Redirigir después de 5 segundos
                    setTimeout(function() {
                        // if (audio) { audio.pause(); audio.currentTime = 0; }
                        if (document.fullscreenElement) {
                            document.exitFullscreen();
                        }
                        document.body.removeChild(overlay);
                        window.location.href = 'https://classroom.google.com/h';
                    }, 5000);
                });
            }
        });
    });
})();

// --- SHOP DE TEMAS, INSIGNIAS Y JUEGOS --- //
// --- UTILIDADES DE COOKIES --- //
function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/";
}
function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? decodeURIComponent(v.pop()) : null;
}

const SHOP_THEMES = [
    // Temas básicos
    { id: 'theme_dark', title: 'Tema Oscuro', desc: 'El clásico tema oscuro de AstralProton.', price: 0, preview: '', apply: () => { document.body.classList.remove('light-theme'); localStorage.setItem('theme', 'dark'); } },
    { id: 'theme_light', title: 'Tema Claro', desc: 'Tema claro para una experiencia más brillante.', price: 50, preview: '', apply: () => { document.body.classList.add('light-theme'); localStorage.setItem('theme', 'light'); } },
    // Temas adicionales
    { id: 'theme_pink', title: 'Tema Rosado', desc: 'Un tema rosado vibrante y alegre.', price: 100, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffb6d5');
        document.documentElement.style.setProperty('--secondary-color', '#ffe0ef');
        document.documentElement.style.setProperty('--accent-color', '#ff3366');
        document.documentElement.style.setProperty('--header-bg', '#ffb6d5');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffe0ef');
        localStorage.setItem('theme', 'pink');
    }},
    { id: 'theme_green', title: 'Tema Verde', desc: 'Un tema verde relajante.', price: 100, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#1b3c1b');
        document.documentElement.style.setProperty('--secondary-color', '#2e7d32');
        document.documentElement.style.setProperty('--accent-color', '#4caf50');
        document.documentElement.style.setProperty('--header-bg', '#1b3c1b');
        document.documentElement.style.setProperty('--sidebar-bg', '#2e7d32');
        localStorage.setItem('theme', 'green');
    }},
    { id: 'theme_blue', title: 'Tema Azul', desc: 'Un tema azul profundo y elegante.', price: 120, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0a2342');
        document.documentElement.style.setProperty('--secondary-color', '#185adb');
        document.documentElement.style.setProperty('--accent-color', '#00b4d8');
        document.documentElement.style.setProperty('--header-bg', '#0a2342');
        document.documentElement.style.setProperty('--sidebar-bg', '#185adb');
        localStorage.setItem('theme', 'blue');
    }},
    { id: 'theme_orange', title: 'Tema Naranja', desc: 'Un tema cálido y energético.', price: 120, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ff9800');
        document.documentElement.style.setProperty('--secondary-color', '#ffe0b2');
        document.documentElement.style.setProperty('--accent-color', '#ff5722');
        document.documentElement.style.setProperty('--header-bg', '#ff9800');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffe0b2');
        localStorage.setItem('theme', 'orange');
    }},
    { id: 'theme_purple', title: 'Tema Morado', desc: 'Un tema místico y moderno.', price: 130, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#4b006e');
        document.documentElement.style.setProperty('--secondary-color', '#a259f7');
        document.documentElement.style.setProperty('--accent-color', '#d72660');
        document.documentElement.style.setProperty('--header-bg', '#4b006e');
        document.documentElement.style.setProperty('--sidebar-bg', '#a259f7');
        localStorage.setItem('theme', 'purple');
    }},
    { id: 'theme_red', title: 'Tema Rojo', desc: 'Un tema intenso y apasionado.', price: 130, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#b71c1c');
        document.documentElement.style.setProperty('--secondary-color', '#ff8a80');
        document.documentElement.style.setProperty('--accent-color', '#ff1744');
        document.documentElement.style.setProperty('--header-bg', '#b71c1c');
        document.documentElement.style.setProperty('--sidebar-bg', '#ff8a80');
        localStorage.setItem('theme', 'red');
    }},
    { id: 'theme_gold', title: 'Tema Dorado', desc: '¡Brilla como el oro!', price: 200, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#fff8e1');
        document.documentElement.style.setProperty('--secondary-color', '#ffd700');
        document.documentElement.style.setProperty('--accent-color', '#ffb300');
        document.documentElement.style.setProperty('--header-bg', '#ffd700');
        document.documentElement.style.setProperty('--sidebar-bg', '#fff8e1');
        localStorage.setItem('theme', 'gold');
    }},
    { id: 'theme_cyber', title: 'Tema Cyberpunk', desc: 'Futurista y vibrante.', price: 250, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0f1021');
        document.documentElement.style.setProperty('--secondary-color', '#232946');
        document.documentElement.style.setProperty('--accent-color', '#ff00c8');
        document.documentElement.style.setProperty('--header-bg', '#232946');
        document.documentElement.style.setProperty('--sidebar-bg', '#0f1021');
        localStorage.setItem('theme', 'cyber');
    }},
    { id: 'theme_mint', title: 'Tema Menta', desc: 'Fresco y minimalista.', price: 110, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e0fff7');
        document.documentElement.style.setProperty('--secondary-color', '#a7ffeb');
        document.documentElement.style.setProperty('--accent-color', '#00bfae');
        document.documentElement.style.setProperty('--header-bg', '#a7ffeb');
        document.documentElement.style.setProperty('--sidebar-bg', '#e0fff7');
        localStorage.setItem('theme', 'mint');
    }},
    { id: 'theme_gray', title: 'Tema Gris', desc: 'Elegante y sobrio.', price: 90, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#232323');
        document.documentElement.style.setProperty('--secondary-color', '#616161');
        document.documentElement.style.setProperty('--accent-color', '#bdbdbd');
        document.documentElement.style.setProperty('--header-bg', '#232323');
        document.documentElement.style.setProperty('--sidebar-bg', '#616161');
        localStorage.setItem('theme', 'gray');
    }},
    { id: 'theme_night', title: 'Tema Noche Estrellada', desc: 'Oscuridad con toques de azul y estrellas.', price: 180, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0a0a2a');
        document.documentElement.style.setProperty('--secondary-color', '#1a1a4a');
        document.documentElement.style.setProperty('--accent-color', '#4169e1');
        document.documentElement.style.setProperty('--header-bg', '#0a0a2a');
        document.documentElement.style.setProperty('--sidebar-bg', '#1a1a4a');
        localStorage.setItem('theme', 'night');
    }},
    { id: 'theme_aqua', title: 'Tema Aqua', desc: 'Relajante y acuático.', price: 120, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e0f7fa');
        document.documentElement.style.setProperty('--secondary-color', '#00bcd4');
        document.documentElement.style.setProperty('--accent-color', '#0097a7');
        document.documentElement.style.setProperty('--header-bg', '#00bcd4');
        document.documentElement.style.setProperty('--sidebar-bg', '#e0f7fa');
        localStorage.setItem('theme', 'aqua');
    }},
    // TEMA RAINBOW FUNCIONAL
    { id: 'theme_rainbow', title: 'Tema Arcoíris', desc: '¡Colores para todos!', price: 300, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#fff');
        document.documentElement.style.setProperty('--secondary-color', '#fff');
        document.documentElement.style.setProperty('--accent-color', '#ff00c8');
        document.documentElement.style.setProperty('--header-bg', 'linear-gradient(90deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #cc00ff)');
        document.documentElement.style.setProperty('--sidebar-bg', 'linear-gradient(180deg, #ff0000, #ff9900, #ffee00, #33ff00, #00ffee, #0066ff, #cc00ff)');
        localStorage.setItem('theme', 'rainbow');
    }},
    // MÁS TEMAS
    { id: 'theme_forest', title: 'Tema Bosque', desc: 'Verde profundo y madera.', price: 140, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#355c3a');
        document.documentElement.style.setProperty('--secondary-color', '#a3c9a8');
        document.documentElement.style.setProperty('--accent-color', '#6b4226');
        document.documentElement.style.setProperty('--header-bg', '#355c3a');
        document.documentElement.style.setProperty('--sidebar-bg', '#a3c9a8');
        localStorage.setItem('theme', 'forest');
    }},
    { id: 'theme_sunset', title: 'Tema Atardecer', desc: 'Colores cálidos y románticos.', price: 160, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffb347');
        document.documentElement.style.setProperty('--secondary-color', '#ffcc33');
        document.documentElement.style.setProperty('--accent-color', '#ff5e62');
        document.documentElement.style.setProperty('--header-bg', '#ffb347');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffcc33');
        localStorage.setItem('theme', 'sunset');
    }},
    { id: 'theme_neon', title: 'Tema Neón', desc: 'Brilla en la oscuridad.', price: 180, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0f0c29');
        document.documentElement.style.setProperty('--secondary-color', '#302b63');
        document.documentElement.style.setProperty('--accent-color', '#00ffea');
        document.documentElement.style.setProperty('--header-bg', '#0f0c29');
        document.documentElement.style.setProperty('--sidebar-bg', '#302b63');
        localStorage.setItem('theme', 'neon');
    }},
    { id: 'theme_pastel', title: 'Tema Pastel', desc: 'Colores suaves y dulces.', price: 110, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffd1dc');
        document.documentElement.style.setProperty('--secondary-color', '#c1f7d3');
        document.documentElement.style.setProperty('--accent-color', '#b5ead7');
        document.documentElement.style.setProperty('--header-bg', '#ffd1dc');
        document.documentElement.style.setProperty('--sidebar-bg', '#c1f7d3');
        localStorage.setItem('theme', 'pastel');
    }},
    { id: 'theme_coffee', title: 'Tema Café', desc: 'Tonos marrones y cálidos.', price: 100, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#6f4e37');
        document.documentElement.style.setProperty('--secondary-color', '#c19a6b');
        document.documentElement.style.setProperty('--accent-color', '#a67b5b');
        document.documentElement.style.setProperty('--header-bg', '#6f4e37');
        document.documentElement.style.setProperty('--sidebar-bg', '#c19a6b');
        localStorage.setItem('theme', 'coffee');
    }},
    { id: 'theme_space', title: 'Tema Espacial', desc: 'Oscuro con acentos galácticos.', price: 200, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#1a1a2e');
        document.documentElement.style.setProperty('--secondary-color', '#16213e');
        document.documentElement.style.setProperty('--accent-color', '#0f3460');
        document.documentElement.style.setProperty('--header-bg', '#1a1a2e');
        document.documentElement.style.setProperty('--sidebar-bg', '#16213e');
        localStorage.setItem('theme', 'space');
    }},
    { id: 'theme_lime', title: 'Tema Lima', desc: 'Verde lima brillante.', price: 100, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#d4fc79');
        document.documentElement.style.setProperty('--secondary-color', '#96e6a1');
        document.documentElement.style.setProperty('--accent-color', '#a8ff78');
        document.documentElement.style.setProperty('--header-bg', '#d4fc79');
        document.documentElement.style.setProperty('--sidebar-bg', '#96e6a1');
        localStorage.setItem('theme', 'lime');
    }},
    { id: 'theme_sakura', title: 'Tema Sakura', desc: 'Inspirado en los cerezos japoneses.', price: 170, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffe3e3');
        document.documentElement.style.setProperty('--secondary-color', '#ffb7b2');
        document.documentElement.style.setProperty('--accent-color', '#ff6f91');
        document.documentElement.style.setProperty('--header-bg', '#ffe3e3');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffb7b2');
        localStorage.setItem('theme', 'sakura');
    }},
    { id: 'theme_terminal', title: 'Tema Terminal', desc: 'Estilo hacker clásico.', price: 150, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#222');
        document.documentElement.style.setProperty('--secondary-color', '#111');
        document.documentElement.style.setProperty('--accent-color', '#00ff00');
        document.documentElement.style.setProperty('--header-bg', '#111');
        document.documentElement.style.setProperty('--sidebar-bg', '#222');
        localStorage.setItem('theme', 'terminal');
    }},
    // MUCHOS MÁS TEMAS
    { id: 'theme_sea', title: 'Tema Mar', desc: 'Azul marino y olas.', price: 130, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0077be');
        document.documentElement.style.setProperty('--secondary-color', '#00c6fb');
        document.documentElement.style.setProperty('--accent-color', '#005082');
        document.documentElement.style.setProperty('--header-bg', '#0077be');
        document.documentElement.style.setProperty('--sidebar-bg', '#00c6fb');
        localStorage.setItem('theme', 'sea');
    }},
    { id: 'theme_fire', title: 'Tema Fuego', desc: 'Rojo y naranja ardiente.', price: 180, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ff512f');
        document.documentElement.style.setProperty('--secondary-color', '#dd2476');
        document.documentElement.style.setProperty('--accent-color', '#ff6e7f');
        document.documentElement.style.setProperty('--header-bg', '#ff512f');
        document.documentElement.style.setProperty('--sidebar-bg', '#dd2476');
        localStorage.setItem('theme', 'fire');
    }},
    { id: 'theme_ice', title: 'Tema Hielo', desc: 'Azul claro y blanco.', price: 150, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e0f7fa');
        document.documentElement.style.setProperty('--secondary-color', '#b2ebf2');
        document.documentElement.style.setProperty('--accent-color', '#00bcd4');
        document.documentElement.style.setProperty('--header-bg', '#e0f7fa');
        document.documentElement.style.setProperty('--sidebar-bg', '#b2ebf2');
        localStorage.setItem('theme', 'ice');
    }},
    { id: 'theme_bubblegum', title: 'Tema Bubblegum', desc: 'Rosa y azul pastel.', price: 140, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffb6b9');
        document.documentElement.style.setProperty('--secondary-color', '#fae3d9');
        document.documentElement.style.setProperty('--accent-color', '#bbded6');
        document.documentElement.style.setProperty('--header-bg', '#ffb6b9');
        document.documentElement.style.setProperty('--sidebar-bg', '#fae3d9');
        localStorage.setItem('theme', 'bubblegum');
    }},
    { id: 'theme_emerald', title: 'Tema Esmeralda', desc: 'Verde esmeralda y blanco.', price: 200, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#2ecc71');
        document.documentElement.style.setProperty('--secondary-color', '#27ae60');
        document.documentElement.style.setProperty('--accent-color', '#a3e635');
        document.documentElement.style.setProperty('--header-bg', '#2ecc71');
        document.documentElement.style.setProperty('--sidebar-bg', '#27ae60');
        localStorage.setItem('theme', 'emerald');
    }},
    { id: 'theme_sand', title: 'Tema Arena', desc: 'Beige y marrón claro.', price: 120, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#f4e2d8');
        document.documentElement.style.setProperty('--secondary-color', '#ba9474');
        document.documentElement.style.setProperty('--accent-color', '#e2c290');
        document.documentElement.style.setProperty('--header-bg', '#f4e2d8');
        document.documentElement.style.setProperty('--sidebar-bg', '#ba9474');
        localStorage.setItem('theme', 'sand');
    }},
    { id: 'theme_royal', title: 'Tema Real', desc: 'Azul real y dorado.', price: 250, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#4169e1');
        document.documentElement.style.setProperty('--secondary-color', '#ffd700');
        document.documentElement.style.setProperty('--accent-color', '#fff');
        document.documentElement.style.setProperty('--header-bg', '#4169e1');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffd700');
        localStorage.setItem('theme', 'royal');
    }},
    { id: 'theme_coral', title: 'Tema Coral', desc: 'Coral y azul suave.', price: 160, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ff7e67');
        document.documentElement.style.setProperty('--secondary-color', '#92a9bd');
        document.documentElement.style.setProperty('--accent-color', '#f6cd61');
        document.documentElement.style.setProperty('--header-bg', '#ff7e67');
        document.documentElement.style.setProperty('--sidebar-bg', '#92a9bd');
        localStorage.setItem('theme', 'coral');
    }},
    { id: 'theme_wood', title: 'Tema Madera', desc: 'Marrón madera y beige.', price: 130, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#8d5524');
        document.documentElement.style.setProperty('--secondary-color', '#c68642');
        document.documentElement.style.setProperty('--accent-color', '#e0ac69');
        document.documentElement.style.setProperty('--header-bg', '#8d5524');
        document.documentElement.style.setProperty('--sidebar-bg', '#c68642');
        localStorage.setItem('theme', 'wood');
    }},
    { id: 'theme_rose', title: 'Tema Rosa', desc: 'Rosa suave y blanco.', price: 110, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffe4e1');
        document.documentElement.style.setProperty('--secondary-color', '#ffb6c1');
        document.documentElement.style.setProperty('--accent-color', '#ff69b4');
        document.documentElement.style.setProperty('--header-bg', '#ffe4e1');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffb6c1');
        localStorage.setItem('theme', 'rose');
    }},
    { id: 'theme_olive', title: 'Tema Oliva', desc: 'Verde oliva y dorado.', price: 170, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#808000');
        document.documentElement.style.setProperty('--secondary-color', '#bdb76b');
        document.documentElement.style.setProperty('--accent-color', '#f5deb3');
        document.documentElement.style.setProperty('--header-bg', '#808000');
        document.documentElement.style.setProperty('--sidebar-bg', '#bdb76b');
        localStorage.setItem('theme', 'olive');
    }},
    { id: 'theme_midnight', title: 'Tema Medianoche', desc: 'Azul oscuro y negro.', price: 190, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#191970');
        document.documentElement.style.setProperty('--secondary-color', '#000');
        document.documentElement.style.setProperty('--accent-color', '#4169e1');
        document.documentElement.style.setProperty('--header-bg', '#191970');
        document.documentElement.style.setProperty('--sidebar-bg', '#000');
        localStorage.setItem('theme', 'midnight');
    }},
    { id: 'theme_sky', title: 'Tema Cielo', desc: 'Celeste y blanco.', price: 100, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#87ceeb');
        document.documentElement.style.setProperty('--secondary-color', '#fff');
        document.documentElement.style.setProperty('--accent-color', '#00bfff');
        document.documentElement.style.setProperty('--header-bg', '#87ceeb');
        document.documentElement.style.setProperty('--sidebar-bg', '#fff');
        localStorage.setItem('theme', 'sky');
    }},
    { id: 'theme_lemon', title: 'Tema Limón', desc: 'Amarillo limón y verde.', price: 120, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#fff700');
        document.documentElement.style.setProperty('--secondary-color', '#bfff00');
        document.documentElement.style.setProperty('--accent-color', '#e1ff00');
        document.documentElement.style.setProperty('--header-bg', '#fff700');
        document.documentElement.style.setProperty('--sidebar-bg', '#bfff00');
        localStorage.setItem('theme', 'lemon');
    }},
    { id: 'theme_shadow', title: 'Tema Sombra', desc: 'Negro y gris oscuro.', price: 150, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#111');
        document.documentElement.style.setProperty('--secondary-color', '#333');
        document.documentElement.style.setProperty('--accent-color', '#555');
        document.documentElement.style.setProperty('--header-bg', '#111');
        document.documentElement.style.setProperty('--sidebar-bg', '#333');
        localStorage.setItem('theme', 'shadow');
    }},
    { id: 'theme_metal', title: 'Tema Metal', desc: 'Gris metálico y azul.', price: 210, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#b0b0b0');
        document.documentElement.style.setProperty('--secondary-color', '#5c5c5c');
        document.documentElement.style.setProperty('--accent-color', '#2196f3');
        document.documentElement.style.setProperty('--header-bg', '#b0b0b0');
        document.documentElement.style.setProperty('--sidebar-bg', '#5c5c5c');
        localStorage.setItem('theme', 'metal');
    }},
    { id: 'theme_peach', title: 'Tema Durazno', desc: 'Naranja suave y rosa.', price: 130, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffdab9');
        document.documentElement.style.setProperty('--secondary-color', '#ffe5b4');
        document.documentElement.style.setProperty('--accent-color', '#ffb347');
        document.documentElement.style.setProperty('--header-bg', '#ffdab9');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffe5b4');
        localStorage.setItem('theme', 'peach');
    }},
    { id: 'theme_lavender', title: 'Tema Lavanda', desc: 'Lavanda y violeta.', price: 140, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e6e6fa');
        document.documentElement.style.setProperty('--secondary-color', '#b57edc');
        document.documentElement.style.setProperty('--accent-color', '#c3aed6');
        document.documentElement.style.setProperty('--header-bg', '#e6e6fa');
        document.documentElement.style.setProperty('--sidebar-bg', '#b57edc');
        localStorage.setItem('theme', 'lavender');
    }},
    { id: 'theme_glass', title: 'Tema Glass', desc: 'Transparente, premium y elegante.', price: 30000, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', 'rgba(255,255,255,0.15)');
        document.documentElement.style.setProperty('--secondary-color', 'rgba(255,255,255,0.25)');
        document.documentElement.style.setProperty('--accent-color', '#00eaff');
        document.documentElement.style.setProperty('--header-bg', 'rgba(255,255,255,0.10)');
        document.documentElement.style.setProperty('--sidebar-bg', 'rgba(255,255,255,0.20)');
        document.body.style.backdropFilter = 'blur(16px)';
        document.body.style.webkitBackdropFilter = 'blur(16px)';
        localStorage.setItem('theme', 'glass');
    }},
    { id: 'theme_pixel', title: 'Tema Pixel', desc: 'Estilo retro de 8 bits.', price: 180, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#22223b');
        document.documentElement.style.setProperty('--secondary-color', '#4a4e69');
        document.documentElement.style.setProperty('--accent-color', '#f2e9e4');
        document.documentElement.style.setProperty('--header-bg', '#9a8c98');
        document.documentElement.style.setProperty('--sidebar-bg', '#c9ada7');
        localStorage.setItem('theme', 'pixel');
    }},
    { id: 'theme_matrix', title: 'Tema Matrix', desc: 'Verde digital y negro.', price: 220, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0f0');
        document.documentElement.style.setProperty('--secondary-color', '#222');
        document.documentElement.style.setProperty('--accent-color', '#39ff14');
        document.documentElement.style.setProperty('--header-bg', '#111');
        document.documentElement.style.setProperty('--sidebar-bg', '#222');
        localStorage.setItem('theme', 'matrix');
    }},
    { id: 'theme_candy', title: 'Tema Caramelo', desc: 'Colores dulces y vibrantes.', price: 160, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffb3ba');
        document.documentElement.style.setProperty('--secondary-color', '#ffdfba');
        document.documentElement.style.setProperty('--accent-color', '#baffc9');
        document.documentElement.style.setProperty('--header-bg', '#bae1ff');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffffba');
        localStorage.setItem('theme', 'candy');
    }},
    { id: 'theme_steampunk', title: 'Tema Steampunk', desc: 'Cobre, bronce y engranajes.', price: 350, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#6b4226');
        document.documentElement.style.setProperty('--secondary-color', '#c9b18a');
        document.documentElement.style.setProperty('--accent-color', '#b87333');
        document.documentElement.style.setProperty('--header-bg', '#3e2723');
        document.documentElement.style.setProperty('--sidebar-bg', '#c9b18a');
        localStorage.setItem('theme', 'steampunk');
    }},
    { id: 'theme_galaxy', title: 'Tema Galaxia', desc: 'Morado, azul y estrellas.', price: 400, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#2d006e');
        document.documentElement.style.setProperty('--secondary-color', '#4e148c');
        document.documentElement.style.setProperty('--accent-color', '#00d2ff');
        document.documentElement.style.setProperty('--header-bg', 'linear-gradient(90deg, #2d006e, #4e148c, #00d2ff)');
        document.documentElement.style.setProperty('--sidebar-bg', '#4e148c');
        localStorage.setItem('theme', 'galaxy');
    }},
    { id: 'theme_vaporwave', title: 'Tema Vaporwave', desc: 'Rosa, azul y estética retro.', price: 320, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ff71ce');
        document.documentElement.style.setProperty('--secondary-color', '#01cdfe');
        document.documentElement.style.setProperty('--accent-color', '#05ffa1');
        document.documentElement.style.setProperty('--header-bg', '#b967ff');
        document.documentElement.style.setProperty('--sidebar-bg', '#fffb96');
        localStorage.setItem('theme', 'vaporwave');
    }},
    { id: 'theme_woodland', title: 'Tema Bosque Encantado', desc: 'Verde musgo y marrón.', price: 210, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#355c3a');
        document.documentElement.style.setProperty('--secondary-color', '#a3c9a8');
        document.documentElement.style.setProperty('--accent-color', '#6b4226');
        document.documentElement.style.setProperty('--header-bg', '#355c3a');
        document.documentElement.style.setProperty('--sidebar-bg', '#a3c9a8');
        localStorage.setItem('theme', 'woodland');
    }},
    { id: 'theme_aurora', title: 'Tema Aurora', desc: 'Colores del norte.', price: 380, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0f2027');
        document.documentElement.style.setProperty('--secondary-color', '#2c5364');
        document.documentElement.style.setProperty('--accent-color', '#00c3ff');
        document.documentElement.style.setProperty('--header-bg', 'linear-gradient(90deg, #0f2027, #2c5364, #00c3ff)');
        document.documentElement.style.setProperty('--sidebar-bg', '#2c5364');
        localStorage.setItem('theme', 'aurora');
    }},
    { id: 'theme_sunset_beach', title: 'Tema Playa al Atardecer', desc: 'Naranja, rosa y azul suave.', price: 250, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ff9966');
        document.documentElement.style.setProperty('--secondary-color', '#ff5e62');
        document.documentElement.style.setProperty('--accent-color', '#00c3ff');
        document.documentElement.style.setProperty('--header-bg', 'linear-gradient(90deg, #ff9966, #ff5e62, #00c3ff)');
        document.documentElement.style.setProperty('--sidebar-bg', '#ff9966');
        localStorage.setItem('theme', 'sunset_beach');
    }},
    { id: 'theme_icecream', title: 'Tema Helado', desc: 'Colores pastel y dulces.', price: 170, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#f7cac9');
        document.documentElement.style.setProperty('--secondary-color', '#92a8d1');
        document.documentElement.style.setProperty('--accent-color', '#ffe5b4');
        document.documentElement.style.setProperty('--header-bg', '#f7cac9');
        document.documentElement.style.setProperty('--sidebar-bg', '#92a8d1');
        localStorage.setItem('theme', 'icecream');
    }},
    { id: 'theme_techno', title: 'Tema Techno', desc: 'Neón y negro.', price: 260, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#0f0c29');
        document.documentElement.style.setProperty('--secondary-color', '#302b63');
        document.documentElement.style.setProperty('--accent-color', '#ff00c8');
        document.documentElement.style.setProperty('--header-bg', '#0f0c29');
        document.documentElement.style.setProperty('--sidebar-bg', '#302b63');
        localStorage.setItem('theme', 'techno');
    }},
    { id: 'theme_jeans', title: 'Tema Jeans', desc: 'Azul denim y costuras.', price: 195, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#3b5998');
        document.documentElement.style.setProperty('--secondary-color', '#8b9dc3');
        document.documentElement.style.setProperty('--accent-color', '#dfe3ee');
        document.documentElement.style.setProperty('--header-bg', '#3b5998');
        document.documentElement.style.setProperty('--sidebar-bg', '#8b9dc3');
        localStorage.setItem('theme', 'jeans');
    }},
    { id: 'theme_sakura_night', title: 'Tema Sakura Nocturno', desc: 'Cerezos bajo la luna.', price: 270, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#2d3142');
        document.documentElement.style.setProperty('--secondary-color', '#ef8354');
        document.documentElement.style.setProperty('--accent-color', '#f6abb6');
        document.documentElement.style.setProperty('--header-bg', '#2d3142');
        document.documentElement.style.setProperty('--sidebar-bg', '#f6abb6');
        localStorage.setItem('theme', 'sakura_night');
    }},
    { id: 'theme_royal_purple', title: 'Tema Púrpura Real', desc: 'Púrpura y dorado.', price: 420, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#6a0572');
        document.documentElement.style.setProperty('--secondary-color', '#ab83a1');
        document.documentElement.style.setProperty('--accent-color', '#ffd700');
        document.documentElement.style.setProperty('--header-bg', '#6a0572');
        document.documentElement.style.setProperty('--sidebar-bg', '#ab83a1');
        localStorage.setItem('theme', 'royal_purple');
    }},
    { id: 'theme_emerald_city', title: 'Tema Ciudad Esmeralda', desc: 'Verde brillante y dorado.', price: 380, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#50c878');
        document.documentElement.style.setProperty('--secondary-color', '#b2f7ef');
        document.documentElement.style.setProperty('--accent-color', '#ffd700');
        document.documentElement.style.setProperty('--header-bg', '#50c878');
        document.documentElement.style.setProperty('--sidebar-bg', '#b2f7ef');
        localStorage.setItem('theme', 'emerald_city');
    }},
    { id: 'theme_ink', title: 'Tema Tinta', desc: 'Negro profundo y azul oscuro.', price: 210, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#22223b');
        document.documentElement.style.setProperty('--secondary-color', '#4a4e69');
        document.documentElement.style.setProperty('--accent-color', '#9a8c98');
        document.documentElement.style.setProperty('--header-bg', '#22223b');
        document.documentElement.style.setProperty('--sidebar-bg', '#4a4e69');
        localStorage.setItem('theme', 'ink');
    }},
    { id: 'theme_blossom', title: 'Tema Floración', desc: 'Flores y primavera.', price: 230, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#ffe3e3');
        document.documentElement.style.setProperty('--secondary-color', '#b5ead7');
        document.documentElement.style.setProperty('--accent-color', '#ffb7b2');
        document.documentElement.style.setProperty('--header-bg', '#ffe3e3');
        document.documentElement.style.setProperty('--sidebar-bg', '#b5ead7');
        localStorage.setItem('theme', 'blossom');
    }},
    { id: 'theme_icefire', title: 'Tema Hielo y Fuego', desc: 'Azul y rojo intenso.', price: 350, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#00bcd4');
        document.documentElement.style.setProperty('--secondary-color', '#ff1744');
        document.documentElement.style.setProperty('--accent-color', '#fff');
        document.documentElement.style.setProperty('--header-bg', 'linear-gradient(90deg, #00bcd4, #ff1744)');
        document.documentElement.style.setProperty('--sidebar-bg', '#ff1744');
        localStorage.setItem('theme', 'icefire');
    }},
    { id: 'theme_zen', title: 'Tema Zen', desc: 'Minimalista y relajante.', price: 200, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e0e1dd');
        document.documentElement.style.setProperty('--secondary-color', '#778da9');
        document.documentElement.style.setProperty('--accent-color', '#415a77');
        document.documentElement.style.setProperty('--header-bg', '#e0e1dd');
        document.documentElement.style.setProperty('--sidebar-bg', '#778da9');
        localStorage.setItem('theme', 'zen');
    }},
    { id: 'theme_royal_black', title: 'Tema Negro Real', desc: 'Negro y dorado elegante.', price: 500, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#000');
        document.documentElement.style.setProperty('--secondary-color', '#222');
        document.documentElement.style.setProperty('--accent-color', '#ffd700');
        document.documentElement.style.setProperty('--header-bg', '#000');
        document.documentElement.style.setProperty('--sidebar-bg', '#222');
        localStorage.setItem('theme', 'royal_black');
    }},
    { id: 'theme_rainforest', title: 'Tema Selva Tropical', desc: 'Verde intenso y amarillo.', price: 270, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#006400');
        document.documentElement.style.setProperty('--secondary-color', '#bfff00');
        document.documentElement.style.setProperty('--accent-color', '#ffd700');
        document.documentElement.style.setProperty('--header-bg', '#006400');
        document.documentElement.style.setProperty('--sidebar-bg', '#bfff00');
        localStorage.setItem('theme', 'rainforest');
    }},
    { id: 'theme_icequeen', title: 'Tema Reina de Hielo', desc: 'Azul hielo y blanco.', price: 420, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#e0f7fa');
        document.documentElement.style.setProperty('--secondary-color', '#b2ebf2');
        document.documentElement.style.setProperty('--accent-color', '#00bcd4');
        document.documentElement.style.setProperty('--header-bg', '#e0f7fa');
        document.documentElement.style.setProperty('--sidebar-bg', '#b2ebf2');
        localStorage.setItem('theme', 'icequeen');
    }},
    { id: 'theme_sandstorm', title: 'Tema Tormenta de Arena', desc: 'Beige y marrón oscuro.', price: 210, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#f4e2d8');
        document.documentElement.style.setProperty('--secondary-color', '#ba9474');
        document.documentElement.style.setProperty('--accent-color', '#e2c290');
        document.documentElement.style.setProperty('--header-bg', '#ba9474');
        document.documentElement.style.setProperty('--sidebar-bg', '#f4e2d8');
        localStorage.setItem('theme', 'sandstorm');
    }},
    { id: 'theme_berry', title: 'Tema Frutos Rojos', desc: 'Rojo, morado y azul.', price: 180, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#b71c1c');
        document.documentElement.style.setProperty('--secondary-color', '#8e24aa');
        document.documentElement.style.setProperty('--accent-color', '#1976d2');
        document.documentElement.style.setProperty('--header-bg', '#b71c1c');
        document.documentElement.style.setProperty('--sidebar-bg', '#8e24aa');
        localStorage.setItem('theme', 'berry');
    }},
    { id: 'theme_royal_emerald', title: 'Tema Esmeralda Real', desc: 'Verde esmeralda y dorado.', price: 600, preview: '', apply: () => {
        document.body.classList.remove('light-theme');
        document.documentElement.style.setProperty('--primary-color', '#50c878');
        document.documentElement.style.setProperty('--secondary-color', '#ffd700');
        document.documentElement.style.setProperty('--accent-color', '#fff');
        document.documentElement.style.setProperty('--header-bg', '#50c878');
        document.documentElement.style.setProperty('--sidebar-bg', '#ffd700');
        localStorage.setItem('theme', 'royal_emerald');
    }},
];
// --- MUCHAS MÁS INSIGNIAS PARA LA TIENDA ---
const SHOP_BADGES = [
    { id: 'badge_star', title: 'Estrella', desc: 'Demuestra que eres una estrella.', price: 30, icon: 'fa-star' },
    { id: 'badge_fire', title: 'Fuego', desc: '¡Estás en racha!', price: 50, icon: 'fa-fire' },
    { id: 'badge_crown', title: 'Corona', desc: 'Para los verdaderos reyes.', price: 100, icon: 'fa-crown' },
    { id: 'badge_rocket', title: 'Cohete', desc: '¡Vuela alto!', price: 60, icon: 'fa-rocket' },
    { id: 'badge_heart', title: 'Corazón', desc: '¡Mucho amor por AstralProton!', price: 40, icon: 'fa-heart' },
    { id: 'badge_trophy', title: 'Trofeo', desc: '¡Eres un campeón!', price: 80, icon: 'fa-trophy' },
    { id: 'badge_moon', title: 'Luna', desc: 'Nocturno y misterioso.', price: 45, icon: 'fa-moon' },
    { id: 'badge_sun', title: 'Sol', desc: 'Brillas con luz propia.', price: 45, icon: 'fa-sun' },
    { id: 'badge_gem', title: 'Gema', desc: '¡Eres una joya!', price: 90, icon: 'fa-gem' },
    { id: 'badge_music', title: 'Música', desc: 'Amante de la música.', price: 35, icon: 'fa-music' },
    { id: 'badge_gamepad', title: 'Gamer', desc: 'Jugador de corazón.', price: 55, icon: 'fa-gamepad' },
    { id: 'badge_code', title: 'Coder', desc: '¡Te gusta programar!', price: 70, icon: 'fa-code' },
    { id: 'badge_ghost', title: 'Fantasma', desc: '¡Buu! Nadie te ve venir.', price: 65, icon: 'fa-ghost' },
    { id: 'badge_leaf', title: 'Hoja', desc: 'Amante de la naturaleza.', price: 30, icon: 'fa-leaf' },
    { id: 'badge_bolt', title: 'Rayo', desc: '¡Energía pura!', price: 60, icon: 'fa-bolt' },
    { id: 'badge_shield', title: 'Escudo', desc: 'Protector de la comunidad.', price: 80, icon: 'fa-shield-alt' },
    { id: 'badge_medal', title: 'Medalla', desc: '¡Premio a la constancia!', price: 75, icon: 'fa-medal' },
    { id: 'badge_hat', title: 'Sombrero', desc: '¡Con mucho estilo!', price: 35, icon: 'fa-hat-wizard' },
    { id: 'badge_puzzle', title: 'Puzzle', desc: '¡Te encantan los retos!', price: 50, icon: 'fa-puzzle-piece' },
    { id: 'badge_icecream', title: 'Helado', desc: '¡Dulce y refrescante!', price: 25, icon: 'fa-ice-cream' },
    { id: 'badge_bomb', title: 'Bomba', desc: '¡Explosivo!', price: 55, icon: 'fa-bomb' },
    { id: 'badge_diamond', title: 'Diamante', desc: '¡Brillas como un diamante!', price: 120, icon: 'fa-gem' },
    { id: 'badge_unicorn', title: 'Unicornio', desc: '¡Mágico y único!', price: 150, icon: 'fa-horse-head' },
    { id: 'badge_cake', title: 'Pastel', desc: '¡Feliz cumpleaños!', price: 20, icon: 'fa-birthday-cake' },
    { id: 'badge_rocket2', title: 'Astronauta', desc: '¡Explorador del espacio!', price: 100, icon: 'fa-user-astronaut' },
    // MÁS INSIGNIAS
    { id: 'badge_book', title: 'Libro', desc: 'Amante de la lectura.', price: 30, icon: 'fa-book' },
    { id: 'badge_camera', title: 'Cámara', desc: 'Fotógrafo aficionado.', price: 40, icon: 'fa-camera' },
    { id: 'badge_paint', title: 'Pintor', desc: 'Artista creativo.', price: 50, icon: 'fa-paint-brush' },
    { id: 'badge_tree', title: 'Árbol', desc: 'Amigo del medio ambiente.', price: 35, icon: 'fa-tree' },
    { id: 'badge_robot', title: 'Robot', desc: 'Fan de la tecnología.', price: 60, icon: 'fa-robot' },
    { id: 'badge_cookie', title: 'Galleta', desc: '¡Dulce y crujiente!', price: 25, icon: 'fa-cookie' },
    { id: 'badge_peace', title: 'Paz', desc: 'Promotor de la armonía.', price: 45, icon: 'fa-peace' },
    { id: 'badge_anchor', title: 'Ancla', desc: 'Siempre firme.', price: 40, icon: 'fa-anchor' },
    { id: 'badge_wand', title: 'Varita', desc: 'Un poco de magia.', price: 55, icon: 'fa-magic' },
    { id: 'badge_paw', title: 'Huella', desc: 'Amante de los animales.', price: 30, icon: 'fa-paw' },
    { id: 'badge_globe', title: 'Globo', desc: 'Ciudadano del mundo.', price: 50, icon: 'fa-globe' },
    { id: 'badge_smile', title: 'Sonrisa', desc: 'Siempre feliz.', price: 20, icon: 'fa-smile' },
    { id: 'badge_fish', title: 'Pez', desc: 'Amante del agua.', price: 25, icon: 'fa-fish' },
    { id: 'badge_bicycle', title: 'Bicicleta', desc: 'Deportista.', price: 35, icon: 'fa-bicycle' },
    { id: 'badge_plane', title: 'Avión', desc: 'Viajero frecuente.', price: 60, icon: 'fa-plane' },
    { id: 'badge_microphone', title: 'Micrófono', desc: 'Locutor o cantante.', price: 40, icon: 'fa-microphone' },
    { id: 'badge_lightbulb', title: 'Idea', desc: 'Siempre creativo.', price: 45, icon: 'fa-lightbulb' },
    { id: 'badge_snowflake', title: 'Copo de Nieve', desc: 'Frío pero único.', price: 30, icon: 'fa-snowflake' },
    { id: 'badge_flag', title: 'Bandera', desc: 'Orgulloso de tu país.', price: 35, icon: 'fa-flag' },
    { id: 'badge_handshake', title: 'Apretón de manos', desc: 'Buen compañero.', price: 50, icon: 'fa-handshake' },
    // MUCHAS MÁS INSIGNIAS
    { id: 'badge_star2', title: 'Superestrella', desc: '¡Brillas aún más!', price: 200, icon: 'fa-star-half-alt' },
    { id: 'badge_owl', title: 'Búho', desc: 'Sabiduría nocturna.', price: 80, icon: 'fa-owl' },
    { id: 'badge_crown2', title: 'Corona Real', desc: 'Realeza absoluta.', price: 300, icon: 'fa-chess-king' },
    { id: 'badge_rocket3', title: 'Nave Espacial', desc: '¡Más allá del espacio!', price: 200, icon: 'fa-space-shuttle' },
    { id: 'badge_earth', title: 'Planeta', desc: 'Cuidando el mundo.', price: 90, icon: 'fa-globe-americas' },
    { id: 'badge_flower', title: 'Flor', desc: 'Belleza natural.', price: 40, icon: 'fa-seedling' },
    { id: 'badge_sword', title: 'Espada', desc: 'Guerrero valiente.', price: 100, icon: 'fa-sword' },
    { id: 'badge_magic', title: 'Magia', desc: '¡Hechicero supremo!', price: 120, icon: 'fa-hat-wizard' },
    { id: 'badge_king', title: 'Rey', desc: 'Líder nato.', price: 150, icon: 'fa-chess-king' },
    { id: 'badge_queen', title: 'Reina', desc: 'Elegancia y poder.', price: 150, icon: 'fa-chess-queen' },
    { id: 'badge_knight', title: 'Caballero', desc: 'Honor y coraje.', price: 120, icon: 'fa-chess-knight' },
    { id: 'badge_pawn', title: 'Peón', desc: 'Siempre avanzando.', price: 30, icon: 'fa-chess-pawn' },
    { id: 'badge_wizard', title: 'Hechicero', desc: 'Maestro de la magia.', price: 110, icon: 'fa-hat-wizard' },
    { id: 'badge_dragon', title: 'Dragón', desc: 'Fuerza legendaria.', price: 200, icon: 'fa-dragon' },
    { id: 'badge_phoenix', title: 'Fénix', desc: 'Renace de las cenizas.', price: 180, icon: 'fa-fire-alt' },
    { id: 'badge_rocket4', title: 'Turbo', desc: '¡A toda velocidad!', price: 90, icon: 'fa-rocket' },
    { id: 'badge_ice', title: 'Hielo', desc: 'Frío como el ártico.', price: 60, icon: 'fa-snowflake' },
    { id: 'badge_fire2', title: 'Llama', desc: 'Arde con pasión.', price: 70, icon: 'fa-fire' },
    { id: 'badge_apple', title: 'Manzana', desc: 'Salud y conocimiento.', price: 30, icon: 'fa-apple-alt' },
    { id: 'badge_banana', title: 'Banana', desc: '¡Energía tropical!', price: 25, icon: 'fa-lemon' },
    { id: 'badge_pizza', title: 'Pizza', desc: '¡Fan de la pizza!', price: 35, icon: 'fa-pizza-slice' },
    { id: 'badge_burger', title: 'Hamburguesa', desc: '¡Comida rápida!', price: 35, icon: 'fa-hamburger' },
    { id: 'badge_crown3', title: 'Corona de Oro', desc: 'Realeza máxima.', price: 500, icon: 'fa-crown' },
    { id: 'badge_rocket5', title: 'Explorador', desc: 'Siempre descubriendo.', price: 80, icon: 'fa-rocket' },
    { id: 'badge_fox', title: 'Zorro', desc: 'Astucia y rapidez.', price: 70, icon: 'fa-fox' },
    { id: 'badge_cat', title: 'Gato', desc: 'Independiente y curioso.', price: 60, icon: 'fa-cat' },
    { id: 'badge_dog', title: 'Perro', desc: 'Leal y amigable.', price: 60, icon: 'fa-dog' },
    { id: 'badge_bird', title: 'Pájaro', desc: 'Libre como el viento.', price: 50, icon: 'fa-dove' },
    { id: 'badge_frog', title: 'Rana', desc: 'Saltando siempre.', price: 40, icon: 'fa-frog' },
    { id: 'badge_crown4', title: 'Corona Platino', desc: 'El más exclusivo.', price: 1000, icon: 'fa-crown' },
    { id: 'badge_rocket6', title: 'Turbo Rocket', desc: '¡Velocidad máxima!', price: 150, icon: 'fa-rocket' },
    { id: 'badge_heart2', title: 'Corazón de Oro', desc: 'Bondad infinita.', price: 200, icon: 'fa-heart' },
    { id: 'badge_star3', title: 'Estrella Fugaz', desc: '¡Haz un deseo!', price: 120, icon: 'fa-star' },
    { id: 'badge_plant', title: 'Planta', desc: 'Creciendo siempre.', price: 30, icon: 'fa-seedling' },
    { id: 'badge_sushi', title: 'Sushi', desc: 'Fan de la comida japonesa.', price: 40, icon: 'fa-fish' },
    { id: 'badge_camera2', title: 'Fotógrafo Pro', desc: 'Capturando momentos.', price: 90, icon: 'fa-camera-retro' },
    { id: 'badge_rocket7', title: 'Rocket Legend', desc: '¡El más rápido!', price: 300, icon: 'fa-rocket' },
    { id: 'badge_king2', title: 'Rey Supremo', desc: 'Dominio total.', price: 2000, icon: 'fa-chess-king' },
    { id: 'badge_queen2', title: 'Reina Suprema', desc: 'Elegancia total.', price: 2000, icon: 'fa-chess-queen' },
    { id: 'badge_egg', title: 'Huevo', desc: '¡Sorpresa!', price: 10, icon: 'fa-egg' },
    { id: 'badge_cupcake', title: 'Cupcake', desc: 'Dulzura total.', price: 20, icon: 'fa-birthday-cake' },
    { id: 'badge_rocket8', title: 'Rocket Ultra', desc: '¡Sin límites!', price: 500, icon: 'fa-rocket' },
    { id: 'badge_icecream2', title: 'Helado Doble', desc: '¡Más dulce!', price: 40, icon: 'fa-ice-cream' },
    { id: 'badge_galaxy', title: 'Galaxia', desc: 'Universal.', price: 300, icon: 'fa-globe' },
    { id: 'badge_rocket9', title: 'Rocket Infinity', desc: '¡Hasta el infinito!', price: 1000, icon: 'fa-rocket' },
    { id: 'badge_panda', title: 'Panda', desc: 'Tierno y fuerte.', price: 80, icon: 'fa-paw' },
    { id: 'badge_ninja', title: 'Ninja', desc: 'Sigiloso y veloz.', price: 120, icon: 'fa-user-ninja' },
    { id: 'badge_cactus', title: 'Cactus', desc: 'Resistente y único.', price: 40, icon: 'fa-seedling' },
    { id: 'badge_rocket10', title: 'Rocket Pro', desc: '¡Explorador profesional!', price: 350, icon: 'fa-rocket' },
    { id: 'badge_owl2', title: 'Gran Búho', desc: 'Sabiduría suprema.', price: 200, icon: 'fa-owl' },
    { id: 'badge_fox2', title: 'Zorro Ártico', desc: 'Astucia polar.', price: 110, icon: 'fa-fox' },
    { id: 'badge_koala', title: 'Koala', desc: 'Relajado y adorable.', price: 70, icon: 'fa-paw' },
    { id: 'badge_rocket11', title: 'Rocket Supremo', desc: '¡El más veloz!', price: 1000, icon: 'fa-rocket' },
    { id: 'badge_icecream3', title: 'Helado Triple', desc: '¡Ultra dulce!', price: 60, icon: 'fa-ice-cream' },
    { id: 'badge_galaxy2', title: 'Galaxia Premium', desc: 'Universal y brillante.', price: 500, icon: 'fa-globe' },
    { id: 'badge_sun2', title: 'Super Sol', desc: 'Brillas como nunca.', price: 120, icon: 'fa-sun' },
    { id: 'badge_moon2', title: 'Luna Llena', desc: 'Misterio total.', price: 130, icon: 'fa-moon' },
    { id: 'badge_earth2', title: 'Planeta Azul', desc: 'Cuidando la Tierra.', price: 150, icon: 'fa-globe-americas' },
    { id: 'badge_rocket12', title: 'Rocket Ultra Pro', desc: '¡Sin límites!', price: 2000, icon: 'fa-rocket' },
    { id: 'badge_ghost2', title: 'Fantasma Pro', desc: '¡Buu! Nivel experto.', price: 120, icon: 'fa-ghost' },
    { id: 'badge_heart3', title: 'Corazón Arcoíris', desc: 'Amor para todos.', price: 180, icon: 'fa-heart' },
    { id: 'badge_dragon2', title: 'Dragón Dorado', desc: 'Fuerza legendaria.', price: 400, icon: 'fa-dragon' },
    { id: 'badge_phoenix2', title: 'Fénix de Fuego', desc: 'Renace siempre.', price: 350, icon: 'fa-fire-alt' },
    { id: 'badge_unicorn2', title: 'Unicornio Real', desc: 'Magia infinita.', price: 500, icon: 'fa-horse-head' },
    { id: 'badge_rocket13', title: 'Rocket Legendario', desc: '¡El más legendario!', price: 3000, icon: 'fa-rocket' },
    { id: 'badge_king3', title: 'Rey de Reyes', desc: 'Dominio absoluto.', price: 5000, icon: 'fa-chess-king' },
    { id: 'badge_queen3', title: 'Reina de Reinas', desc: 'Elegancia suprema.', price: 5000, icon: 'fa-chess-queen' },
    { id: 'badge_ice2', title: 'Hielo Supremo', desc: 'Frío extremo.', price: 200, icon: 'fa-snowflake' },
    { id: 'badge_fire3', title: 'Fuego Supremo', desc: 'Arde sin parar.', price: 200, icon: 'fa-fire' },
    { id: 'badge_leaf2', title: 'Hoja Dorada', desc: 'Naturaleza premium.', price: 150, icon: 'fa-leaf' },
    { id: 'badge_magic2', title: 'Magia Suprema', desc: 'Hechicero legendario.', price: 400, icon: 'fa-hat-wizard' },
    { id: 'badge_rocket14', title: 'Rocket Infinity Pro', desc: '¡Hasta el infinito y más allá!', price: 5000, icon: 'fa-rocket' },
    { id: 'badge_apple2', title: 'Manzana Dorada', desc: 'Conocimiento infinito.', price: 120, icon: 'fa-apple-alt' },
    { id: 'badge_banana2', title: 'Banana Ultra', desc: '¡Energía máxima!', price: 80, icon: 'fa-lemon' },
    { id: 'badge_pizza2', title: 'Pizza Suprema', desc: '¡Fan total!', price: 90, icon: 'fa-pizza-slice' },
    { id: 'badge_burger2', title: 'Hamburguesa Deluxe', desc: '¡Comida premium!', price: 90, icon: 'fa-hamburger' },
    { id: 'badge_rocket15', title: 'Rocket Platinum', desc: '¡Exclusivo!', price: 10000, icon: 'fa-rocket' },
    { id: 'badge_cat2', title: 'Gato Ninja', desc: 'Sigiloso y curioso.', price: 120, icon: 'fa-cat' },
    { id: 'badge_dog2', title: 'Perro Héroe', desc: 'Lealtad máxima.', price: 120, icon: 'fa-dog' },
    { id: 'badge_bird2', title: 'Águila', desc: 'Vista aguda.', price: 200, icon: 'fa-dove' },
    { id: 'badge_turtle2', title: 'Tortuga Ninja', desc: 'Paciencia y fuerza.', price: 120, icon: 'imgjuegos/tortle.png' },
    { id: 'badge_frog2', title: 'Rana Dorada', desc: 'Salto legendario.', price: 100, icon: 'fa-frog' },
    { id: 'badge_plant2', title: 'Planta Legendaria', desc: 'Creciendo sin parar.', price: 90, icon: 'fa-seedling' },
    { id: 'badge_sushi2', title: 'Sushi Deluxe', desc: 'Fan premium.', price: 80, icon: 'fa-fish' },
    { id: 'badge_camera3', title: 'Cámara Legendaria', desc: 'Capturando todo.', price: 200, icon: 'fa-camera-retro' },
    { id: 'badge_rocket16', title: 'Rocket Ultra Legend', desc: '¡El más exclusivo!', price: 20000, icon: 'fa-rocket' },
    { id: 'badge_egg2', title: 'Huevo de Oro', desc: '¡Sorpresa premium!', price: 100, icon: 'fa-egg' },
    { id: 'badge_cupcake2', title: 'Cupcake Deluxe', desc: 'Dulzura máxima.', price: 60, icon: 'fa-birthday-cake' },
    { id: 'badge_galaxy3', title: 'Galaxia Legendaria', desc: 'Universal y único.', price: 1000, icon: 'fa-globe' },
    { id: 'badge_rocket17', title: 'Rocket Infinity Ultra', desc: '¡Sin límites reales!', price: 50000, icon: 'fa-rocket' },
    { id: 'tortlegames', title: 'TORTLEGAMES REFERENCE', desc: '¿Sigue con vida?', price: 550000, icon: 'tortle.ico' },
];
const SHOP_GAMES = [
    {
        id: 'game_premium1',
        title: 'Juego Exclusivo: Snake Deluxe',
        desc: 'Versión premium de Snake solo para usuarios que lo compren. (Es broma no lo compren, es solo el snake pero lo puse para una prueba)',
        price: 10,
        thumbnail: 'imgjuegos/snake.jpeg',
        url: 'Juegos/google-snake/index.html'
    },
    {
        id: 'game_premium2',
        title: 'Papa´s Pizzeria',
        desc: 'El brillante y divertido juego de gestión de pizzerías. ¡Crea las mejores pizzas y atiende a tus clientes! No vayas a envenenar a nadie, eh.',
        price: 200,
        thumbnail: 'imgjuegos/papaspizza.jpeg',
        url: 'Juegos/papaspizzeria/index.html'
    },
    {
        id: 'game_premium3',
        title: 'Bottle Flip 3D',
        desc: 'El brillante y divertido juego de lanzar botellas. ¡Intenta hacer el mejor truco!',
        price: 2500,
        thumbnail: 'imgjuegos/bottleflip3d.jpeg',
        url: 'Juegos/bottleflip3dnew/index.html'
    }
];

function getShopData() {
    // Lee primero de cookie, si no existe usa localStorage
    let data = getCookie('shopData');
    if (data) {
        try { return JSON.parse(data); } catch(e) {}
    }
    data = localStorage.getItem('shopData');
    if (data) {
        try { return JSON.parse(data); } catch(e) {}
    }
    return {};
}
function saveShopData(data) {
    localStorage.setItem('shopData', JSON.stringify(data));
    setCookie('shopData', JSON.stringify(data));
}
function addShopOwned(type, id) {
    const data = getShopData();
    if (!data[type]) data[type] = [];
    if (!data[type].includes(id)) data[type].push(id);
    saveShopData(data);
}
function isShopOwned(type, id) {
    const data = getShopData();
    return data[type] && data[type].includes(id);
}
function addShopOwned(type, id) {
    const data = getShopData();
    if (!data[type]) data[type] = [];
    if (!data[type].includes(id)) data[type].push(id);
    saveShopData(data);
}
function getUserPointsShop() {
    // Sincroniza puntos con cookie
    let points = getCookie('userPoints');
    if (points !== null) return parseInt(points, 10);
    return parseInt(localStorage.getItem('userPoints') || '0', 10);
}
function setUserPointsShop(points) {
    localStorage.setItem('userPoints', points);
    setCookie('userPoints', points);
    updatePointsDisplay && updatePointsDisplay();
    updateShopPointsDisplay();
}
function updateShopPointsDisplay() {
    const el = document.getElementById('shopPointsValue');
    if (el) el.textContent = getUserPointsShop();
}

function renderShopThemes() {
    const grid = document.getElementById('shopThemesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    SHOP_THEMES.forEach(theme => {
        const owned = isShopOwned('themes', theme.id) || theme.price === 0;
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = `
            <div class="shop-item-thumb"><i class="fas fa-paint-brush" style="font-size:2.2rem;color:var(--accent-color);"></i></div>
            <div class="shop-item-title">${theme.title}</div>
            <div class="shop-item-desc">${theme.desc}</div>
            ${theme.price > 0 ? `<div class="shop-item-price"><i class="fas fa-star"></i> ${theme.price}</div>` : ''}
            ${owned ? `<div class="shop-item-owned">Adquirido</div>` : ''}
            <button class="shop-item-btn" ${theme.price > 0 && !owned && getUserPointsShop() < theme.price ? 'disabled' : ''}>${owned ? 'Aplicar' : 'Comprar'}</button>
        `;
        card.querySelector('.shop-item-btn').onclick = function() {
            if (owned) {
                theme.apply();
                setCookie('theme', theme.id); // Guardar tema aplicado en cookie
                showAlert('Tema aplicado', '¡El tema se ha aplicado correctamente!');
            } else if (getUserPointsShop() >= theme.price) {
                setUserPointsShop(getUserPointsShop() - theme.price);
                addShopOwned('themes', theme.id);
                theme.apply();
                setCookie('theme', theme.id);
                showAlert('¡Tema comprado!', 'Ahora puedes aplicarlo cuando quieras.');
                renderShopThemes();
                updateShopPointsDisplay();
            }
        };
        grid.appendChild(card);
    });
}

function setUserProfileBadge(badgeId) {
    localStorage.setItem('profileBadge', badgeId);
    renderProfileBadges();
    renderHeaderProfileBadge();
}
function getUserProfileBadge() {
    return localStorage.getItem('profileBadge') || null;
}

// --- MODIFICAR renderShopBadges PARA AGREGAR BOTÓN DE APLICAR ---
function renderShopBadges() {
    const grid = document.getElementById('shopBadgesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    SHOP_BADGES.forEach(badge => {
        const owned = isShopOwned('badges', badge.id);
        const isProfile = getUserProfileBadge() === badge.id;
        let badgeIconHtml;
        if (
            badge.icon &&
            (
                badge.icon.endsWith('.png') ||
                badge.icon.endsWith('.jpg') ||
                badge.icon.endsWith('.jpeg') ||
                badge.icon.endsWith('.gif') ||
                badge.icon.endsWith('.ico') ||
                badge.icon.startsWith('imgjuegos/')
            )
        ) {
            badgeIconHtml = `<img src="${badge.icon}" alt="${badge.title}" style="width:2.2rem;height:2.2rem;object-fit:contain;display:block;margin:0 auto;">`;
        } else {
            badgeIconHtml = `<i class="fas ${badge.icon}" style="color:gold;"></i>`;
        }
        grid.innerHTML += `
            <div class="shop-item-card">
                <div class="shop-item-badge">${badgeIconHtml}</div>
                <div class="shop-item-title">${badge.title}</div>
                <div class="shop-item-desc">${badge.desc}</div>
                <div class="shop-item-price"><i class="fas fa-star"></i> ${badge.price}</div>
                ${owned ? `<div class="shop-item-owned">Adquirido</div>` : ''}
                <button class="shop-item-btn" ${owned ? 'disabled' : ''}>${owned ? 'Adquirido' : 'Comprar'}</button>
                ${owned ? `<button class="shop-item-btn" style="margin-top:8px;background:var(--accent-color);color:#fff;" ${isProfile ? 'disabled' : ''} data-badge-id="${badge.id}">${isProfile ? 'Insignia de perfil actual' : 'Aplicar como insignia de perfil'}</button>` : ''}
            </div>
        `;
    });
    // Reasignar eventos de compra y aplicar
    Array.from(grid.querySelectorAll('.shop-item-card')).forEach((card, i) => {
        const badge = SHOP_BADGES[i];
        const owned = isShopOwned('badges', badge.id);
        if (!owned) {
            card.querySelector('.shop-item-btn').onclick = function() {
                if (getUserPointsShop() >= badge.price) {
                    setUserPointsShop(getUserPointsShop() - badge.price);
                    addShopOwned('badges', badge.id);
                    showAlert('¡Insignia comprada!', 'Ahora puedes lucir tu insignia en tu perfil.');
                    renderShopBadges();
                    updateShopPointsDisplay();
                }
            };
        } else {
            // Botón de aplicar insignia de perfil
            const applyBtn = card.querySelector('button[data-badge-id]');
            if (applyBtn && !applyBtn.disabled) {
                applyBtn.onclick = function() {
                    setUserProfileBadge(badge.id);
                    renderShopBadges(); // Para actualizar el estado de los botones
                };
            }
        }
    });
}

function renderShopGames() {
    const grid = document.getElementById('shopGamesGrid');
    if (!grid) return;
    grid.innerHTML = '';
    // Mostrar todos los juegos comprados en el apartado "Juegos"
    const ownedGames = (getShopData().games || []);
    // Mostrar juegos comprados primero
    ownedGames.forEach(gameId => {
        const game = SHOP_GAMES.find(g => g.id === gameId);
        if (!game) return;
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = `
            <img src="${game.thumbnail}" class="shop-item-thumb" alt="${game.title}">
            <div class="shop-item-title">${game.title}</div>
            <div class="shop-item-desc">${game.desc}</div>
            <div class="shop-item-price"><i class="fas fa-star"></i> ${game.price}</div>
            <div class="shop-item-owned">Adquirido. Tu juego estara visible en el apartado de Juegos hasta el final.</div>
            <button class="shop-item-btn">Jugar</button>
        `;
        // Cambia para abrir en el iframe
        card.querySelector('.shop-item-btn').onclick = function() {
            openShopGameInIframe(game);
        };
        grid.appendChild(card);
    });
    // Mostrar juegos no comprados
    SHOP_GAMES.forEach(game => {
        if (ownedGames.includes(game.id)) return;
        const owned = false;
        const card = document.createElement('div');
        card.className = 'shop-item-card';
        card.innerHTML = `
            <img src="${game.thumbnail}" class="shop-item-thumb" alt="${game.title}">
            <div class="shop-item-title">${game.title}</div>
            <div class="shop-item-desc">${game.desc}</div>
            <div class="shop-item-price"><i class="fas fa-star"></i> ${game.price}</div>
            <button class="shop-item-btn" ${getUserPointsShop() < game.price ? 'disabled' : ''}>Comprar</button>
        `;
        card.querySelector('.shop-item-btn').onclick = function() {
            if (getUserPointsShop() >= game.price) {
                setUserPointsShop(getUserPointsShop() - game.price);
                addShopOwned('games', game.id);
                showAlert('¡Juego exclusivo comprado!', 'Ahora puedes jugarlo cuando quieras.');
                renderShopGames();
                updateShopPointsDisplay();
            }
        };
        grid.appendChild(card);
    });
}



(function(){
    document.addEventListener('DOMContentLoaded', function() {
        // Actualizar puntos en la tienda
        updateShopPointsDisplay();
        // Tabs
        const tabs = document.querySelectorAll('.shop-tab');
        const tabContents = {
            themes: document.getElementById('shopThemes'),
            badges: document.getElementById('shopBadges'),
            games: document.getElementById('shopGames')
        };
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                Object.keys(tabContents).forEach(k => tabContents[k].style.display = 'none');
                tabContents[tab.dataset.tab].style.display = '';
            });
        });
        // Renderizar contenido
        renderShopThemes();
        renderShopBadges();
        renderShopGames();
    });
})();

function setUserProfileBadge(badgeId) {
    localStorage.setItem('profileBadge', badgeId);
    renderProfileBadges();
    renderHeaderProfileBadge();
}

// --- MOSTRAR INSIGNIA EN EL PERFIL ---
function renderProfileBadges() {
    let container = document.getElementById('profileBadges');
    if (!container) return;
    const badgeId = getUserProfileBadge();
    container.innerHTML = `<h3 class="profile-section-title">Insignia de Perfil</h3>`;
    if (!badgeId) {
        container.innerHTML += `<div style="opacity:0.7;">No has seleccionado una insignia de perfil.<br>¡Cómprala y aplícala desde la tienda!</div>`;
    } else {
        const badge = SHOP_BADGES.find(b => b.id === badgeId);
        if (!badge) return;
        let badgeIconHtml;
        if (
            badge.icon &&
            (
                badge.icon.endsWith('.png') ||
                badge.icon.endsWith('.jpg') ||
                badge.icon.endsWith('.jpeg') ||
                badge.icon.endsWith('.gif') ||
                badge.icon.endsWith('.ico') ||
                badge.icon.startsWith('imgjuegos/')
            )
        ) {
            badgeIconHtml = `<img src="${badge.icon}" alt="${badge.title}" style="width:2.2rem;height:2.2rem;object-fit:contain;vertical-align:middle;">`;
        } else {
            badgeIconHtml = `<i class="fas ${badge.icon}" style="color:gold;"></i>`;
        }
        container.innerHTML += `<div style="font-size:2.2rem;display:flex;align-items:center;gap:0.7em;">${badgeIconHtml}<span style="font-size:1.1rem;">${badge.title}</span></div>`;
    }
}

// --- MOSTRAR INSIGNIA EN EL HEADER ---
function renderHeaderProfileBadge() {
    const badgeId = getUserProfileBadge();
    const headerUserName = document.getElementById('headerUserName');
    if (!headerUserName) return;
    // Quitar insignia previa
    let badgeSpan = headerUserName.nextElementSibling;
    if (badgeSpan && badgeSpan.classList && badgeSpan.classList.contains('profile-badge-header')) {
        badgeSpan.remove();
    }
    if (badgeId) {
        const badge = SHOP_BADGES.find(b => b.id === badgeId);
        if (!badge) return;
        let badgeIconHtml;
        if (
            badge.icon &&
            (
                badge.icon.endsWith('.png') ||
                badge.icon.endsWith('.jpg') ||
                badge.icon.endsWith('.jpeg') ||
                badge.icon.endsWith('.gif') ||
                badge.icon.endsWith('.ico') ||
                badge.icon.startsWith('imgjuegos/')
            )
        ) {
            badgeIconHtml = `<img src="${badge.icon}" alt="${badge.title}" style="width:1.5em;height:1.5em;object-fit:contain;vertical-align:middle;">`;
        } else {
            badgeIconHtml = `<i class="fas ${badge.icon}" style="color:gold;font-size:1.3em;vertical-align:middle;"></i>`;
        }
        const span = document.createElement('span');
        span.className = 'profile-badge-header';
        span.style.marginLeft = '0.4em';
        span.innerHTML = badgeIconHtml;
        headerUserName.after(span);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    renderProfileBadges();
    renderHeaderProfileBadge();
});

function renderHeaderProfileBadge() {
    const badgeId = getUserProfileBadge();
    const headerUserName = document.getElementById('headerUserName');
    if (!headerUserName) return;
    // Quitar insignia previa
    let badgeSpan = headerUserName.nextElementSibling;
    if (badgeSpan && badgeSpan.classList && badgeSpan.classList.contains('profile-badge-header')) {
        badgeSpan.remove();
    }
    if (badgeId) {
        const badge = SHOP_BADGES.find(b => b.id === badgeId);
        if (!badge) return;
        let badgeIconHtml;
        if (
            badge.icon &&
            (
                badge.icon.endsWith('.png') ||
                badge.icon.endsWith('.jpg') ||
                badge.icon.endsWith('.jpeg') ||
                badge.icon.endsWith('.gif') ||
                badge.icon.endsWith('.ico') ||
                badge.icon.startsWith('imgjuegos/')
            )
        ) {
            badgeIconHtml = `<img src="${badge.icon}" alt="${badge.title}" style="width:1.5em;height:1.5em;object-fit:contain;vertical-align:middle;">`;
        } else {
            badgeIconHtml = `<i class="fas ${badge.icon}" style="color:gold;font-size:1.3em;vertical-align:middle;"></i>`;
        }
        const span = document.createElement('span');
        span.className = 'profile-badge-header';
        span.style.marginLeft = '0.4em';
        span.innerHTML = badgeIconHtml;
        headerUserName.after(span);
    }
}

// --- INICIALIZAR AL CARGAR ---
document.addEventListener('DOMContentLoaded', function() {
    renderProfileBadges();
    renderHeaderProfileBadge();
});

// --- INTEGRACIÓN CON EL SISTEMA DE PUNTOS ---
(function(){
    // Actualizar puntos en la tienda cuando cambian
    const origSetUserPoints = window.setUserPoints;
    window.setUserPoints = function(points) {
        origSetUserPoints(points);
        setCookie('userPoints', points);
        updateShopPointsDisplay();
    };
    document.addEventListener('DOMContentLoaded', updateShopPointsDisplay);
})();

// --- INTEGRACIÓN CON EL SIDEBAR ---
(function(){
    // Cambiar de sección a la tienda
    document.addEventListener('DOMContentLoaded', function() {
        const shopSidebar = document.querySelector('.sidebar-item[data-section="shop"]');
        if (shopSidebar) {
            shopSidebar.addEventListener('click', function() {
                changeSection('shop');
            });
        }
    });
})();

// --- APLICAR TEMA GUARDADO EN COOKIE AL INICIAR ---
(function(){
    document.addEventListener('DOMContentLoaded', function() {
        const themeId = getCookie('theme') || localStorage.getItem('theme');
        if (themeId) {
            const theme = SHOP_THEMES.find(t => t.id === themeId);
            if (theme && typeof theme.apply === 'function') {
                theme.apply();
            }
        }
    });
})();

// --- INTEGRACIÓN DE JUEGOS COMPRADOS EN LA TIENDA AL APARTADO DE JUEGOS ---
// 1. Devuelve los juegos comprados en la tienda (por id)
function getShopOwnedGames() {
    const data = (function() {
        let d = null;
        try { d = JSON.parse(localStorage.getItem('shopData') || '{}'); } catch(e){}
        if (!d || typeof d !== 'object') d = {};
        return d;
    })();
    return Array.isArray(data.games) ? data.games : [];
}

// 2. Devuelve los datos de los juegos exclusivos comprados (de SHOP_GAMES)
function getOwnedShopGamesData() {
    const ownedIds = getShopOwnedGames();
    return SHOP_GAMES.filter(g => ownedIds.includes(g.id));
}

// 3. Devuelve los juegos de la tienda comprados como objetos compatibles con el array "games"
function getGamesFromShopForGrid() {
    return getOwnedShopGamesData().map(g => ({
        id: g.id,
        title: g.title,
        artist: "Juego exclusivo de tienda",
        thumbnail: g.thumbnail,
        url: g.url,
        categories: ["all", "shop"],
        isShopGame: true
    }));
}

// 4. Modifica filterGamesByCategory para incluir los juegos comprados de la tienda
const _originalFilterGamesByCategory = window.filterGamesByCategory;
window.filterGamesByCategory = function(category) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';

    // Juegos normales
    let filteredGames = games;
    if (category !== 'all') {
        if (category === 'favorites') {
            const favoriteGames = folders.find(folder => folder.title === "Favoritos").games;
            filteredGames = games.filter(game => favoriteGames.includes(game.id));
        } else {
            filteredGames = games.filter(game => game.categories.includes(category));
        }
    }

    // Añadir juegos comprados de la tienda (solo si no están ya en la lista)
    let shopGames = getGamesFromShopForGrid();
    // Si la categoría es distinta de "all" y no es "shop", filtra por categoría
    if (category !== 'all' && category !== 'shop') {
        shopGames = shopGames.filter(game => game.categories.includes(category));
    }
    // Evita duplicados por id
    const allGames = [...filteredGames];
    shopGames.forEach(shopGame => {
        if (!allGames.some(g => g.id === shopGame.id)) {
            allGames.push(shopGame);
        }
    });

    allGames.forEach((game, index) => {
        const gameCard = document.createElement('div');
        gameCard.className = 'game-card' + (game.isShopGame ? ' golden-border' : '');
        gameCard.style.animationDelay = `${index * 0.1}s`;

        gameCard.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="game-thumbnail">
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <p class="game-artist">${game.artist}</p>
            </div>
            <div class="play-button">
                <i class="fas fa-play"></i>
            </div>
        `;

        gameCard.addEventListener('click', () => {
            openGame(game);
        });

        gamesGrid.appendChild(gameCard);
    });
};

// 5. Si compras un juego en la tienda, recarga la sección de juegos para que aparezca
function openShopGameInIframe(game) {
    // Abre el juego en el iframe principal y suma puntos
    window.openGame({
        id: game.id,
        title: game.title,
        artist: "Juego exclusivo de tienda",
        thumbnail: game.thumbnail,
        url: game.url,
        categories: ["all", "shop"],
        isShopGame: true
    });
}

// 6. Cuando compras un juego, actualiza la sección de juegos
const _originalAddShopOwned = window.addShopOwned;
window.addShopOwned = function(type, id) {
    _originalAddShopOwned(type, id);
    if (type === 'games') {
        setTimeout(() => {
            // Si estás en la sección de juegos, recarga la grid
            const gamesSection = document.getElementById('gamesSection');
            if (gamesSection && gamesSection.classList.contains('active')) {
                const activeCat = document.querySelector('.categories .category.active');
                const cat = activeCat ? activeCat.dataset.category : 'all';
                window.filterGamesByCategory(cat || 'all');
            }
        }, 200);
    }
};

// 7. Al cambiar de sección a juegos, recarga la grid para mostrar los juegos comprados
(function() {
    const origChangeSection = window.changeSection;
    window.changeSection = function(sectionId) {
        origChangeSection(sectionId);
        if (sectionId === 'games') {
            // Recarga la grid con la categoría activa
            const activeCat = document.querySelector('.categories .category.active');
            const cat = activeCat ? activeCat.dataset.category : 'all';
            window.filterGamesByCategory(cat || 'all');
        }
    };
})();

// 8. Al cargar la app, asegúrate de que la grid de juegos muestre los juegos comprados
document.addEventListener('DOMContentLoaded', function() {
    // Si la sección de juegos está activa, recarga la grid
    const gamesSection = document.getElementById('gamesSection');
    if (gamesSection && gamesSection.classList.contains('active')) {
        const activeCat = document.querySelector('.categories .category.active');
        const cat = activeCat ? activeCat.dataset.category : 'all';
        window.filterGamesByCategory(cat || 'all');
    }
});
function playCoinSound() {
        const custom = localStorage.getItem('customCoinSound');
        let audio;
        if (custom) {
                audio = new Audio(custom);
                audio.volume = 0.5;
        } else {
                const coinSound = document.getElementById('coinSound');
                audio = coinSound.cloneNode(true);
                audio.volume = 0.5;
        }
        audio.play().catch(()=>{});
}

// Función para mostrar notificación de monedas ganadas
function showCoinNotification(amount) {
        // Notificación visual (toast)
        let toast = document.createElement('div');
        toast.style.position = 'fixed';
        toast.style.bottom = '40px';
        toast.style.right = '40px';
        toast.style.background = 'linear-gradient(90deg, gold, orange)';
        toast.style.color = '#222';
        toast.style.fontWeight = 'bold';
        toast.style.fontSize = '1.2em';
        toast.style.padding = '1em 2em';
        toast.style.borderRadius = '16px';
        toast.style.boxShadow = '0 4px 24px #0008';
        toast.style.zIndex = 99999;
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '0.7em';
        toast.innerHTML = `<i class="fas fa-star" style="color:gold;font-size:1.5em;"></i> ¡Ganaste ${amount} stars!`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.remove(); }, 3500);

        // Notificación del navegador (si está permitido)
        if (window.Notification && Notification.permission === "granted") {
                new Notification("¡Ganaste estrellas!", {
                        body: `¡Ganaste ${amount} stars!`,
                        icon: "https://cdn-icons-png.flaticon.com/512/616/616489.png"
                });
        }
}

// Solicitar permiso de notificaciones al cargar la página
if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission();
}

// --- INTEGRACIÓN CON SISTEMA DE MONEDAS ---
// Sobrescribe addUserPoints para reproducir sonido y mostrar notificación
(function() {
        const _originalAddUserPoints = window.addUserPoints;
        window.addUserPoints = function(amount) {
                _originalAddUserPoints(amount);
                if (amount > 0) {
                        playCoinSound();
                        showCoinNotification(amount);
                }
        };
})();

document.addEventListener('DOMContentLoaded', function() {
    if (typeof renderProfileBadges === 'function') {
        renderProfileBadges();
    }
});

if (typeof renderProfileBadges === 'function') {
    renderProfileBadges();
}

// Función para crear estrellas en la pantalla de carga
function createLoadingStars() {
    const container = document.getElementById('loadingStars');
    if (!container) return;
    
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        const size = Math.random() * 3 + 1;
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        const opacity = Math.random() * 0.5 + 0.3;
        
        star.className = 'star';
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${posX}%`;
        star.style.top = `${posY}%`;
        star.style.setProperty('--duration', `${duration}s`);
        star.style.setProperty('--opacity', opacity);
        
        container.appendChild(star);
    }
}

// Función para ocultar la pantalla de carga
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Inicializar pantalla de carga al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    createLoadingStars();
    
    // Ocultar después de 3 segundos (puedes cambiar este tiempo)
    setTimeout(hideLoadingScreen, 3000);
});

let currentRandomGame = null;

function openRandomGameModal() {
  const gameCards = document.querySelectorAll('.game-card');
  if (!gameCards.length) {
    alert('No hay juegos disponibles.');
    return;
  }

  const randomIndex = Math.floor(Math.random() * gameCards.length);
  const selectedCard = gameCards[randomIndex];
  currentRandomGame = selectedCard;

  const title = selectedCard.querySelector('.game-title')?.textContent || 'Juego aleatorio';
  const image = selectedCard.querySelector('img')?.src || '';

  document.getElementById('randomGameTitle').textContent = title;
  document.getElementById('randomGameImage').src = image;

  document.getElementById('randomGameOverlay').classList.add('show');
}

function closeRandomGameModal() {
  document.getElementById('randomGameOverlay').classList.remove('show');
  currentRandomGame = null;
}

function playRandomGame() {
  if (!currentRandomGame) return;
  currentRandomGame.click();
  closeRandomGameModal();
}



window.openUserProfileModal = async function(userId) {
    const modal = document.getElementById('userProfileModal');
    const content = document.getElementById('userProfileModalContent');
    content.innerHTML = '<div style="text-align:center;padding:2em 0;">Cargando perfil...</div>';
    modal.style.display = 'flex';

    // Trae los datos del usuario desde la API
    try {
        const res = await fetch(`${API}/usuarios/${userId}`);
        const user = await res.json();
        content.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:1em;">
                <div style="margin-bottom:0.7em;">
                    ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-color);background:#222;">` : `<i class="fas fa-user" style="font-size:5em;"></i>`}
                </div>
                <div style="font-size:1.5em;font-weight:800;">${user.nombre || user.id}</div>
                <div style="opacity:0.7;font-size:1.1em;">@${user.id}</div>
                ${user.edad ? `<div style="margin-top:0.2em;"><i class="fas fa-birthday-cake"></i> ${user.edad} años</div>` : ''}
                ${user.genero ? `<div style="margin-top:0.2em;"><i class="fas fa-${user.genero === 'male' ? 'mars' : 'venus'}"></i> ${user.genero === 'male' ? 'Masculino' : 'Femenino'}</div>` : ''}
                ${user.apellido ? `<div style="margin-top:0.2em;opacity:0.8;"><i class="fas fa-user-tag"></i> ${user.apellido}</div>` : ''}
                ${user.bio ? `<div style="margin-top:0.7em;opacity:0.9;background:rgba(65,105,225,0.08);border-radius:8px;padding:0.7em 1em;">${user.bio}</div>` : ''}
                <button class="background-button primary" onclick="closeUserProfileModal()" style="margin-top:1.5em;"><i class="fas fa-times"></i> Cerrar</button>
            </div>
        `;
    } catch (e) {
        content.innerHTML = `<div style="color:#ff3366;text-align:center;">Error al cargar el perfil.</div>
        <button class="background-button primary" onclick="closeUserProfileModal()" style="margin-top:1.5em;"><i class="fas fa-times"></i> Cerrar</button>`;
    }
};

window.closeUserProfileModal = function() {
    document.getElementById('userProfileModal').style.display = 'none';
};

window.closeUserProfileModal = function() {
    document.getElementById('userProfileModal').style.display = 'none';
};

function renderGamesGrid(gamesToShow) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';
    gamesToShow.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="game-thumbnail">
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-artist">${game.artist}</div>
                <button class="play-button" onclick="openGame(games.find(g => g.id === ${JSON.stringify(game.id)}))"><i class="fas fa-play"></i></button>
            </div>
        `;
        card.onclick = () => openGame(game);
        gamesGrid.appendChild(card);
    });
}

let currentGamePopup = null;

// --- RECOMPENSA POR TIEMPO EN LA PANTALLA DE JUEGO ---
let rewardTimeout = null;
let rewardGiven = false;

window.openGame = function(game) {
    // Detener música y video de fondo
    if (typeof stopBackgroundMusic === "function") stopBackgroundMusic();
    if (typeof pauseYoutubeBackground === "function") pauseYoutubeBackground();

    // Abrir el juego en una ventana emergente
    window.open(game.url, '_blank', 'width=1024,height=700,noopener');

    // Mostrar overlay negro con mensaje personalizado
    const overlay = document.getElementById('gameRunningOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        const title = document.getElementById('gameRunningTitle');
        if (title) title.textContent = game.title || "Juego en ejecución";
    }

    // Iniciar recompensa por tiempo
    rewardGiven = false;
    if (rewardTimeout) clearTimeout(rewardTimeout);
    rewardTimeout = setTimeout(() => {
        // Si el overlay sigue visible, da la recompensa
        if (overlay && overlay.style.display === 'flex' && !rewardGiven) {
            addUserPoints(10);
            showAlert('¡Felicidades!', 'Has ganado 10 estrellas por jugar 5 segundos.');
            rewardGiven = true;
        }
    }, 5000);
};

window.closeGame = function() {
    // Reanudar música y video de fondo
    if (typeof playBackgroundMusic === "function") playBackgroundMusic();
    if (typeof playYoutubeBackground === "function") playYoutubeBackground();

    // Ocultar overlay negro
    const overlay = document.getElementById('gameRunningOverlay');
    if (overlay) overlay.style.display = 'none';

    // Cancelar recompensa si no se cumplió el tiempo
    if (rewardTimeout) clearTimeout(rewardTimeout);
    rewardTimeout = null;
    rewardGiven = false;
};

// Cierra el overlay y reanuda música
window.closeGame = function() {
    // Reanudar música y video de fondo
    if (typeof playBackgroundMusic === "function") playBackgroundMusic();
    if (typeof playYoutubeBackground === "function") playYoutubeBackground();

    // Ocultar overlay negro
    const overlay = document.getElementById('gameRunningOverlay');
    if (overlay) overlay.style.display = 'none';
};

// Botón para cerrar overlay manualmente
document.getElementById('closeGameOverlayBtn').onclick = window.closeGame;

function renderGamesGrid(gamesToShow) {
    const gamesGrid = document.getElementById('gamesGrid');
    gamesGrid.innerHTML = '';
    gamesToShow.forEach(game => {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <img src="${game.thumbnail}" alt="${game.title}" class="game-thumbnail">
            <div class="game-info">
                <div class="game-title">${game.title}</div>
                <div class="game-artist">${game.artist}</div>
                <button class="play-button" onclick="openGame(games.find(g => g.id === ${JSON.stringify(game.id)}))"><i class="fas fa-play"></i></button>
            </div>
        `;
        card.onclick = () => openGame(game);
        gamesGrid.appendChild(card);
    });
}

// ...existing code...
function createModernStars(containerId, count) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + 'vw';
        star.style.top = Math.random() * 100 + 'vh';
        star.style.width = star.style.height = (Math.random() * 2 + 1) + 'px';
        star.style.opacity = Math.random() * 0.6 + 0.3;
        star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
        container.appendChild(star);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    createModernStars('loadingStars', 80);
});

// --- COMUNIDAD: Mostrar todos los usuarios y sistema de amigos ---
async function fetchAllUsers() {
    try {
        const res = await fetch(`${API}/usuarios`);
        if (!res.ok) throw new Error('Error al obtener usuarios');
        return await res.json();
    } catch (e) {
        return [];
    }
}

function renderCommunity(users) {
    const grid = document.getElementById('communityGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const myId = getCurrentUserId();
    users.forEach(user => {
        if (user.id === myId) return;
        const card = document.createElement('div');
        card.className = 'community-card';
        card.innerHTML = `
            <div class="community-avatar" style="margin-bottom:0.7em;">
                ${user.avatar ? `<img src="${user.avatar}" alt="Avatar" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid var(--accent-color);background:#222;">` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="user-name" style="font-weight:700;font-size:1.2em;">${user.nombre || user.id}</div>
            <div class="user-id" style="opacity:0.7;">@${user.id}</div>
            ${user.edad ? `<div class="user-age" style="margin-top:0.2em;"><i class="fas fa-birthday-cake"></i> ${user.edad} años</div>` : ''}
            ${user.genero ? `<div class="user-gender" style="margin-top:0.2em;"><i class="fas fa-${user.genero === 'male' ? 'mars' : 'venus'}"></i> ${user.genero === 'male' ? 'Masculino' : 'Femenino'}</div>` : ''}
            ${user.bio ? `<div class="community-bio" style="margin-top:0.5em;opacity:0.85;">${user.bio}</div>` : ''}
            <button class="friend-btn add" data-userid="${user.id}" data-username="${user.nombre || ''}"><i class="fas fa-user-plus"></i> Agregar amigo</button>
        `;
        // Al hacer click en la tarjeta, abre el modal de perfil público
        card.onclick = (e) => {
            if (e.target.classList.contains('friend-btn')) return; // No abrir modal si es el botón
            openUserProfileModal(user.id);
        };
        grid.appendChild(card);
    });

    // Botón de agregar amigo
    grid.querySelectorAll('.friend-btn.add').forEach(btn => {
        btn.onclick = function(e) {
            e.stopPropagation();
            const paraId = btn.getAttribute('data-userid');
            const paraName = btn.getAttribute('data-username');
            openFriendRequestModal(paraId, paraName);
        };
    });
}

// Mostrar comunidad al entrar en la sección
document.addEventListener('DOMContentLoaded', () => {
    const communityBtn = document.querySelector('.sidebar-item[data-section="community"]');
    if (communityBtn) {
        communityBtn.addEventListener('click', async () => {
            const users = await fetchAllUsers();
            renderCommunity(users);
        });
    }
});

// Enviar solicitud de amistad con mensaje
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

async function showFriendsPanel() {
    const panel = document.getElementById('friendsPanel');
    panel.innerHTML = `
        <h2><i class="fas fa-user-friends"></i> Amigos</h2>
        <h3 style="margin-top:1em;font-size:1.1em;color:var(--accent-color);">Solicitudes recibidas</h3>
        <ul class="friend-list" id="friendRequestsList"></ul>
        <h3 style="margin-top:1em;font-size:1.1em;color:var(--accent-color);">Tu lista de amigos</h3>
        <ul class="friend-list" id="friendList"></ul>
        <button onclick="document.getElementById('friendsPanel').style.display='none'" class="background-button" style="margin-top:1em;">Cerrar</button>
    `;
    panel.style.display = 'block';

    // Cargar solicitudes y amigos
    await cargarSolicitudesAmistad();
    await cargarAmigos();

    // Enviar solicitud
    document.getElementById('sendFriendRequestBtn').onclick = async () => {
        const paraId = document.getElementById('friendCodeInput').value.trim();
        const mensaje = document.getElementById('friendMsgInput').value.trim();
        if (!paraId) return alert('Ingresa un ID de usuario');
        try {
            await enviarSolicitudAmistad(paraId, mensaje);
            alert('Solicitud enviada');
            document.getElementById('friendCodeInput').value = '';
            document.getElementById('friendMsgInput').value = '';
        } catch (e) {
            alert(e.message);
        }
    };
}

async function checkPendingFriendRequests() {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (!user.id) return;
    const res = await fetch(`${API}/amigos/solicitudes/${user.id}`);
    const solicitudes = await res.json();
    const btn = document.getElementById('friendsBtn');
    if (solicitudes.length > 0) {
        btn.classList.add('has-pending');
        btn.title = `Tienes ${solicitudes.length} solicitud(es) pendiente(s)`;
    } else {
        btn.classList.remove('has-pending');
        btn.title = "Amigos";
    }
}


// Llama esto al iniciar y cada cierto tiempo
setInterval(checkPendingFriendRequests, 15000);
document.addEventListener('DOMContentLoaded', checkPendingFriendRequests);

// Mostrar modal para mensaje de solicitud de amistad
function openFriendRequestModal(paraId, paraName) {
    const modal = document.getElementById('friendRequestModal');
    document.getElementById('friendRequestUser').textContent = `Para: @${paraId}${paraName ? ' (' + paraName + ')' : ''}`;
    document.getElementById('friendRequestMsg').value = '';
    modal.style.display = 'flex';
    // Guardar el ID temporalmente
    modal.dataset.paraId = paraId;
}

// Cerrar modal
function closeFriendRequestModal() {
    document.getElementById('friendRequestModal').style.display = 'none';
}

// Enviar solicitud desde el modal
document.getElementById('sendFriendRequestModalBtn').onclick = async function() {
    const modal = document.getElementById('friendRequestModal');
    const paraId = modal.dataset.paraId;
    const mensaje = document.getElementById('friendRequestMsg').value.trim();
    try {
        await enviarSolicitudAmistad(paraId, mensaje);
        alert('Solicitud enviada');
    } catch (e) {
        alert(e.message || 'Error al enviar solicitud');
    }
    closeFriendRequestModal();
};

// Cancelar
document.getElementById('cancelFriendRequestModalBtn').onclick = closeFriendRequestModal;

// Modifica renderCommunity para usar el modal
function renderCommunity(users) {
    const grid = document.getElementById('communityGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const myId = getCurrentUserId();
    users.forEach(user => {
        if (user.id === myId) return;
        const card = document.createElement('div');
        card.className = 'community-card';
        card.innerHTML = `
            <div class="community-avatar">
                ${user.avatar ? `<img src="${user.avatar}" alt="Avatar">` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="user-name">${user.nombre || user.id}</div>
            <div class="user-id">@${user.id}</div>
            <div class="community-bio">${user.bio ? user.bio : ''}</div>
            <button class="friend-btn add" data-userid="${user.id}" data-username="${user.nombre || ''}"><i class="fas fa-user-plus"></i> Agregar amigo</button>
        `;
        grid.appendChild(card);
    });

    // Botón de agregar amigo
    grid.querySelectorAll('.friend-btn.add').forEach(btn => {
        btn.onclick = function() {
            const paraId = btn.getAttribute('data-userid');
            const paraName = btn.getAttribute('data-username');
            openFriendRequestModal(paraId, paraName);
        };
    });
}

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

function renderSolicitudesAmistad(solicitudes) {
    const lista = document.getElementById('friendRequestsList');
    if (!lista) return;
    lista.innerHTML = '';
    if (!solicitudes.length) {
        lista.innerHTML = '<li style="opacity:0.7;">No tienes solicitudes pendientes.</li>';
        return;
    }
    solicitudes.forEach(sol => {
        const li = document.createElement('li');
        li.className = 'friend-request-item';
        li.innerHTML = `
            <span class="friend-avatar"><i class="fas fa-user"></i></span>
            <div>
                <div class="friend-name">@${sol.de}</div>
                ${sol.mensaje ? `<div class="friend-msg"><i class="fas fa-comment-dots"></i> ${sol.mensaje}</div>` : ''}
            </div>
            <div class="friend-actions">
                <button class="friend-btn accept" onclick="responderSolicitudAmistad('${sol.id}', true)">Aceptar</button>
                <button class="friend-btn reject" onclick="responderSolicitudAmistad('${sol.id}', false)">Rechazar</button>
            </div>
        `;
        lista.appendChild(li);
    });
}

function requireRole(roles) {
  return (req, res, next) => {
    const userRol = req.user.rol;
    if (!roles.includes(userRol)) {
      return res.status(403).json({ error: "No tienes permisos suficientes" });
    }
    next();
  };
}

function isOwner() {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  return user.rol === 'owner';
}
function isAdminSenior() {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  return user.rol === 'owner' || user.rol === 'admin_senior';
}
function isAdmin() {
  const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
  return ['owner', 'admin_senior', 'admin'].includes(user.rol);
}

document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('saveProfileButton');
    if (saveBtn) {
        saveBtn.onclick = guardarPerfilUsuario;
    }
});

function renderHeaderUser(user) {
    const el = document.getElementById('headerUserName');
    if (!el) return;
    if (!user) {
        el.innerHTML = '';
        return;
    }
    let clase = '';
    if (user.rol === 'owner') clase = 'super-premium';
    else if (user.rol === 'admin') clase = 'purple-premium';

    // Solo muestra la corona si es owner o admin
    const crown = (user.rol === 'owner' || user.rol === 'admin') ? `<i class="fas fa-crown"></i> ` : '';
    const puntos = typeof user.estrellas === 'number' ? user.estrellas : 0;
    el.innerHTML = `<span class="user-name ${clase}">${crown}${user.nombre} <button class="background-button primary" style="margin-left:10px;pointer-events:none;"><i class="fas fa-star"></i> ${puntos}pts</button></span>`;
}

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('astralUser') || '{}');
    if (user && user.nombre) renderHeaderUser(user);
});

// --- Custom Firmware ASPCF AVANZADO ---
(function() {
    const installBtn = document.getElementById('installFirmwareBtn');
    const fileInput = document.getElementById('firmwareFileInput');
    const status = document.getElementById('firmwareStatus');

    if (installBtn && fileInput) {
        installBtn.onclick = () => fileInput.click();

        fileInput.onchange = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.name.endsWith('.aspcf')) {
                status.textContent = "Archivo inválido. Debe ser .aspcf";
                status.style.color = "#ff3366";
                return;
            }
            try {
                const text = await file.text();
                const config = JSON.parse(text);

                // --- Colores ---
                if (config.sidebarColor) localStorage.setItem('sidebarColor', config.sidebarColor);
                if (config.headerColor) localStorage.setItem('headerColor', config.headerColor);
                if (config.accentColor) localStorage.setItem('accentColor', config.accentColor);
                if (config.textColor) localStorage.setItem('textColor', config.textColor);
                if (config.backgroundColor) localStorage.setItem('backgroundColor', config.backgroundColor);

                // --- Fondo personalizado ---
                if (config.customBackground) localStorage.setItem('customBackground', config.customBackground);

                // --- Fuente ---
                if (config.profileFont) localStorage.setItem('profileFont', config.profileFont);

                // --- Tamaño de fuente ---
                if (config.fontSize) localStorage.setItem('fontSize', config.fontSize);

                // --- Nombre custom (solo local) ---
                if (config.customName) {
                    let user = JSON.parse(localStorage.getItem('astralUser') || '{}');
                    user.nombre = config.customName;
                    localStorage.setItem('astralUser', JSON.stringify(user));
                }

                // --- Posición de sidebar ---
                if (config.sidebarPosition) localStorage.setItem('sidebarPosition', config.sidebarPosition);

                // --- Música personalizada ---
                if (config.customMusic) localStorage.setItem('customMusic', config.customMusic);

                // --- Insignias ---
                if (Array.isArray(config.badges)) {
                    localStorage.setItem('profileBadges', JSON.stringify(config.badges));
                }

                // --- Tema ---
                if (config.theme) localStorage.setItem('theme', config.theme);

                // --- Idioma ---
                if (config.language) localStorage.setItem('language', config.language);

                // --- Reduce Motion ---
                if (typeof config.reduceMotion === "boolean") localStorage.setItem('reduceMotion', config.reduceMotion ? "true" : "false");

                // --- Cursor personalizado ---
                if (config.customCursor) localStorage.setItem('customCursor', config.customCursor);

                status.textContent = "Firmware instalado correctamente. Recargando...";
                status.style.color = "#4caf50";
                setTimeout(() => location.reload(), 1200);
            } catch (err) {
                status.textContent = "Error al instalar el firmware.";
                status.style.color = "#ff3366";
            }
        };
    }
})();

// --- CURSOR PERSONALIZADO AVANZADO ---
(function() {
    const input = document.getElementById('customCursorUrl');
    const btn = document.getElementById('applyCustomCursorBtn');
    const info = document.getElementById('customCursorInfo');
    const fileInput = document.getElementById('customCursorFile');
    const chooseBtn = document.getElementById('chooseCustomCursorFileBtn');

    // Cargar valor guardado
    const saved = localStorage.getItem('customCursor');
    if (saved) input.value = saved;

    btn && (btn.onclick = function() {
        const url = input.value.trim();
        if (!url) {
            info.textContent = "Pon una URL válida de cursor (.cur o .png)";
            info.style.color = "#ff3366";
            return;
        }
        localStorage.setItem('customCursor', url);
        info.textContent = "Cursor personalizado aplicado. Recargando...";
        info.style.color = "#4caf50";
        setTimeout(() => location.reload(), 1000);
    });

    chooseBtn && (chooseBtn.onclick = () => fileInput.click());

    fileInput && (fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            localStorage.setItem('customCursor', ev.target.result);
            input.value = ev.target.result;
            info.textContent = "Cursor personalizado subido y aplicado. Recargando...";
            info.style.color = "#4caf50";
            setTimeout(() => location.reload(), 1000);
        };
        reader.readAsDataURL(file);
    });

    // Aplicar cursor al cargar la página
    const cursor = localStorage.getItem('customCursor');
    if (cursor) {
        document.documentElement.style.setProperty('--custom-cursor', `url('${cursor}'), auto`);
    }
})();

// --- TÍTULO PERSONALIZADO ---
(function() {
    const input = document.getElementById('customPageTitle');
    const btn = document.getElementById('applyCustomPageTitleBtn');
    if (input && btn) {
        const saved = localStorage.getItem('customPageTitle');
        if (saved) input.value = saved;
        btn.onclick = function() {
            localStorage.setItem('customPageTitle', input.value.trim());
            document.title = input.value.trim() || "AstralProton";
        };
    }
    // Aplicar al cargar
    const saved = localStorage.getItem('customPageTitle');
    if (saved) document.title = saved;
})();

// --- FAVICON PERSONALIZADO ---
(function() {
    const input = document.getElementById('customFaviconUrl');
    const btn = document.getElementById('applyCustomFaviconBtn');
    if (input && btn) {
        const saved = localStorage.getItem('customFaviconUrl');
        if (saved) input.value = saved;
        btn.onclick = function() {
            localStorage.setItem('customFaviconUrl', input.value.trim());
            setFavicon(input.value.trim());
        };
    }
    // Aplicar al cargar
    const saved = localStorage.getItem('customFaviconUrl');
    if (saved) setFavicon(saved);

    function setFavicon(url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;
    }
})();

// --- SISTEMA DE RECOMPENSAS POR CÓDIGO ---
(function() {
    // Lista de códigos válidos y sus recompensas (puedes agregar más)
    const REWARD_CODES = {
        "ASTRALDISCORD2146": { type: "points", amount: 100, msg: "¡Has recibido 100 estrellas!" },
        "ESTRELLA": { type: "badge", badge: "badge_star", msg: "¡Insignia especial desbloqueada!" },
        "FIRMWAREPRO": { type: "theme", theme: "gold", msg: "¡Tema dorado desbloqueado!" }
        // Agrega más códigos aquí
    };

    // Códigos ya canjeados (por usuario)
    function getClaimedCodes() {
        return JSON.parse(localStorage.getItem('claimedRewardCodes') || '[]');
    }
    function setClaimedCodes(arr) {
        localStorage.setItem('claimedRewardCodes', JSON.stringify(arr));
    }

    // Lógica de canje
    document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('rewardCodeForm');
        const input = document.getElementById('rewardCodeInput');
        const status = document.getElementById('rewardCodeStatus');
        if (!form || !input || !status) return;

        form.onsubmit = function(e) {
            e.preventDefault();
            const code = input.value.trim().toUpperCase();
            if (!code) {
                status.textContent = "Ingresa un código.";
                status.style.color = "#ff3366";
                return;
            }
            const claimed = getClaimedCodes();
            if (claimed.includes(code)) {
                status.textContent = "¡Ya has canjeado este código!";
                status.style.color = "#ff3366";
                return;
            }
            const reward = REWARD_CODES[code];
            if (!reward) {
                status.textContent = "Código inválido.";
                status.style.color = "#ff3366";
                return;
            }
            // Aplica la recompensa
            if (reward.type === "points") {
                addUserPoints(reward.amount);
            } else if (reward.type === "badge") {
                let badges = JSON.parse(localStorage.getItem('profileBadges') || '[]');
                if (!badges.includes(reward.badge)) badges.push(reward.badge);
                localStorage.setItem('profileBadges', JSON.stringify(badges));
            } else if (reward.type === "theme") {
                localStorage.setItem('theme', reward.theme);
            }
            claimed.push(code);
            setClaimedCodes(claimed);
            status.textContent = reward.msg + " (¡Recarga la página si no ves el cambio!)";
            status.style.color = "#4caf50";
            input.value = "";
        };
    });
})();

// --- SISTEMA DE ANUNCIOS FLOTANTE ---
(function() {
    // Lista de anuncios (puedes editar aquí)
    const ANNOUNCEMENTS = [
        {
            id: "2",
            title: "COOKIE CLICKER ELIMINADO...",
            content: "Lamentablemente, por cuestiones legales, hemos tenido que eliminar Cookie Clicker de nuestra plataforma. ¡Gracias a todos los que lo disfrutaron!",
            date: "29/09/2025"
        },
        {
            id: "1",
            title: "Actualizacion 9.29.25 ha llegado!",
            content: "Personalizacion, juegos, nuevas ideas, optimizacion, custom firmware, codigos, TODO VIENE AQUI, Y MAS!",
            date: "29/09/2025"
        }
    ];

    // Utilidad para saber cuáles ya vio el usuario
    function getSeenAnnouncements() {
        return JSON.parse(localStorage.getItem('seenAnnouncements') || '[]');
    }
    function setSeenAnnouncements(arr) {
        localStorage.setItem('seenAnnouncements', JSON.stringify(arr));
    }

    // Mostrar el dot rojo si hay anuncios nuevos
    function updateAnnouncementsAlert() {
        const seen = getSeenAnnouncements();
        const unseen = ANNOUNCEMENTS.some(a => !seen.includes(a.id));
        document.getElementById('announcementsAlertDot').style.display = unseen ? 'block' : 'none';
    }

    // Mostrar el modal de anuncios
    function openAnnouncementsModal() {
        const modal = document.getElementById('announcementsModal');
        const content = document.getElementById('announcementsContent');
        const seen = getSeenAnnouncements();

        content.innerHTML = ANNOUNCEMENTS.map(a => `
            <div style="margin-bottom:1.5em;padding:1em 1.2em;background:rgba(65,105,225,0.08);border-radius:10px;${seen.includes(a.id) ? 'opacity:0.7;' : ''}">
                <div style="font-size:1.2em;font-weight:700;color:var(--accent-color);margin-bottom:0.3em;">${a.title}</div>
                <div style="margin-bottom:0.5em;">${a.content}</div>
                <div style="font-size:0.95em;opacity:0.7;">${a.date}</div>
            </div>
        `).join('');

        modal.style.display = 'flex';

        // Marcar todos como vistos
        setSeenAnnouncements(ANNOUNCEMENTS.map(a => a.id));
        updateAnnouncementsAlert();
    }

    window.closeAnnouncementsModal = function() {
        document.getElementById('announcementsModal').style.display = 'none';
    };

    // Botón flotante
    document.addEventListener('DOMContentLoaded', function() {
        const btn = document.getElementById('announcementsBtn');
        if (btn) btn.onclick = openAnnouncementsModal;
        updateAnnouncementsAlert();
    });
})();

// --- Estrellas animadas en pantalla de bloqueo ---
(function() {
    const container = document.querySelector('.lock-stars');
    if (!container) return;
    function createLockStars(count) {
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.style.position = 'absolute';
            star.style.left = (Math.random() * 100) + 'vw';
            star.style.top = (Math.random() * 100) + 'vh';
            const size = Math.random() * 2.2 + 0.7;
            star.style.width = size + 'px';
            star.style.height = size + 'px';
            star.style.background = '#fff';
            star.style.borderRadius = '50%';
            star.style.opacity = (Math.random() * 0.5 + 0.5).toFixed(2);
            star.style.boxShadow = `0 0 8px #ffd700cc`;
            star.style.animation = `lockStarTwinkle ${2 + Math.random() * 2}s infinite alternate`;
            container.appendChild(star);
        }
    }
    createLockStars(70);
})();
const styleLockStars = document.createElement('style');
styleLockStars.textContent = `
@keyframes lockStarTwinkle {
    0% { opacity: 0.4; }
    100% { opacity: 1; }
}`;
document.head.appendChild(styleLockStars);

(function() {
    const input = document.getElementById('customFaviconUrl');
    const btn = document.getElementById('applyCustomFaviconBtn');
    function setFavicon(url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = url;
    }
    if (input && btn) {
        const saved = localStorage.getItem('customFaviconUrl');
        if (saved) input.value = saved;
        btn.onclick = function() {
            localStorage.setItem('customFaviconUrl', input.value.trim());
            setFavicon(input.value.trim());
        };
    }
    // Aplicar al cargar
    const saved = localStorage.getItem('customFaviconUrl');
    if (saved) setFavicon(saved);
})();

(function() {
    const select = document.getElementById('sidebarPosition');
    function applySidebarPosition(pos) {
        document.body.classList.remove('sidebar-left', 'sidebar-right', 'sidebar-bottom', 'sidebar-top');
        if (pos === 'right') document.body.classList.add('sidebar-right');
        else if (pos === 'bottom') document.body.classList.add('sidebar-bottom');
        else if (pos === 'top') document.body.classList.add('sidebar-top');
        else document.body.classList.add('sidebar-left'); // default
    }
    // Al cambiar el select
    if (select) {
        select.addEventListener('change', function() {
            localStorage.setItem('sidebarPosition', select.value);
            applySidebarPosition(select.value);
        });
    }
    // Al cargar la página
    document.addEventListener('DOMContentLoaded', function() {
        const saved = localStorage.getItem('sidebarPosition') || 'left';
        if (select) select.value = saved;
        applySidebarPosition(saved);
    });
})();
// Mostrar el panel al hacer click en el botón
document.getElementById('friendsBtn').onclick = showFriendsPanel;
initApp();