// script-iframe.js
// Maneja abrir juegos en un iframe fullscreen y la barra lateral derecha
(function(){
  const overlay = document.getElementById('game-iframe-overlay');
  const iframe = document.getElementById('game-iframe');
  const toggleArrow = document.getElementById('iframe-toggle-arrow');
  const sidebar = document.getElementById('iframe-sidebar');
  const sidebarClose = document.getElementById('iframe-close-sidebar');
  const sidebarExitBtn = document.getElementById('sidebar-exit-btn');
  const helpEl = document.getElementById('iframe-help');
  const helpCheckbox = document.getElementById('help-hide-checkbox');
  const helpDismissBtn = document.getElementById('help-dismiss');
  let previouslyPlaying = [];

  function pauseAllAudio(){
    document.querySelectorAll('audio').forEach(a=>{try{a.pause()}catch(e){}});
  }

  window.openGameInIframe = function(url){
    if(!url) return;
    // allow relative paths: resolve relative to current location
    try{ url = new URL(url, location.href).href }catch(e){}
    iframe.src = url;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // remember which audio elements were playing so we can resume them later
    try{
      previouslyPlaying = Array.from(document.querySelectorAll('audio')).filter(a=>!a.paused).map(a=>a.id).filter(Boolean);
    }catch(e){ previouslyPlaying = []; }
    pauseAllAudio();
    // default: sidebar closed
    sidebar.classList.remove('open');
    toggleArrow.classList.remove('open');
    // show help dialog unless user opted out
    try{
      const hideKey = 'astralx_hide_game_help';
      const hide = localStorage.getItem(hideKey) === '1';
      if(helpEl && !hide){
        helpEl.style.display = 'block';
        if(toggleArrow){ toggleArrow.classList.add('attention'); setTimeout(()=>{ toggleArrow.classList.remove('attention'); }, 4200); }
      }
    }catch(e){}
  }

  window.closeGameIframe = function(){
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    // stop iframe
    try{ iframe.src = 'about:blank'; }catch(e){}
    sidebar.classList.remove('open');
    toggleArrow.classList.remove('open');
    // resume previously playing audio
    try{
      if(Array.isArray(previouslyPlaying) && previouslyPlaying.length){
        previouslyPlaying.forEach(id=>{
          try{ const a = document.getElementById(id); if(a && a.pause !== undefined){ a.play().catch(()=>{}); } }catch(e){}
        });
      } else {
        // fallback: try to play title-music or bg-music if present
        try{ const t = document.getElementById('title-music'); if(t) t.play().catch(()=>{}); }catch(e){}
        try{ const b = document.getElementById('bg-music'); if(b) b.play().catch(()=>{}); }catch(e){}
      }
    }catch(e){}
    previouslyPlaying = [];
    if(helpEl) helpEl.style.display = 'none';
  }

  function toggleIframeSidebar(){
    const open = sidebar.classList.toggle('open');
    toggleArrow.classList.toggle('open', open);
    sidebar.setAttribute('aria-hidden', open? 'false' : 'true');
  }

  // Event listeners
  sidebarExitBtn && sidebarExitBtn.addEventListener('click', ()=>{ window.closeGameIframe(); });
  toggleArrow && toggleArrow.addEventListener('click', (e)=>{ e.stopPropagation(); toggleIframeSidebar(); });
  sidebarClose && sidebarClose.addEventListener('click', ()=>{ sidebar.classList.remove('open'); toggleArrow.classList.remove('open'); sidebar.setAttribute('aria-hidden','true'); });

  // Fullscreen controls: attempt to put the actual iframe in fullscreen
  // Note: when an element (the iframe) is fullscreen, only that element and its
  // descendants are visible in fullscreen. That means controls outside the iframe
  // (like the arrow or sidebar) will NOT be visible while the iframe is fullscreen.
  // If you need the arrow/sidebar visible while the game is fullscreen, we must
  // fullscreen the overlay/wrapper instead (previous behavior). Here we try iframe
  // fullscreen first, with a fallback to overlay fullscreen.
  const fsEnterBtn = document.getElementById('sidebar-fullscreen-btn');
  const fsExitBtn = document.getElementById('sidebar-exit-fullscreen-btn');

  async function enterIframeFullscreen(){
    // Determine preference (some users may want overlay-first to keep UI visible)
    const pref = (window.__ASTRAL_SETTINGS && window.__ASTRAL_SETTINGS.iframeFs) ? window.__ASTRAL_SETTINGS.iframeFs : 'iframe';
    // If overlay preferred, try overlay first
    if(pref === 'overlay'){
      try{
        const el = overlay || document.documentElement;
        if(el.requestFullscreen) await el.requestFullscreen();
        else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if(el.mozRequestFullScreen) await el.mozRequestFullScreen();
        else if(el.msRequestFullscreen) await el.msRequestFullscreen();
        return 'overlay';
      }catch(e){ console.warn('overlay fullscreen failed, will try iframe fullscreen', e); }
    }
    // Default: try to fullscreen the iframe itself first (preferred for true fullscreen of the game).
    try{
      if(iframe && iframe.requestFullscreen){
        await iframe.requestFullscreen();
        return 'iframe';
      } else if(iframe && iframe.webkitRequestFullscreen){
        await iframe.webkitRequestFullscreen();
        return 'iframe';
      }
    }catch(e){
      console.warn('iframe.requestFullscreen failed, will fallback to overlay fullscreen', e);
    }
    // fallback: fullscreen the overlay so controls stay visible
    try{
      const el = overlay || document.documentElement;
      if(el.requestFullscreen) await el.requestFullscreen();
      else if(el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if(el.mozRequestFullScreen) await el.mozRequestFullScreen();
      else if(el.msRequestFullscreen) await el.msRequestFullscreen();
      return 'overlay';
    }catch(e){ console.error('enterOverlayFullscreen failed', e); }
    return null;
  }

  async function exitAnyFullscreen(){
    try{
      if(document.exitFullscreen) await document.exitFullscreen();
      else if(document.webkitExitFullscreen) await document.webkitExitFullscreen();
      else if(document.mozCancelFullScreen) await document.mozCancelFullScreen();
      else if(document.msExitFullscreen) await document.msExitFullscreen();
    }catch(e){ console.error('exitFullscreen failed', e); }
  }

  // Wire buttons if present
  if(fsEnterBtn) fsEnterBtn.addEventListener('click', (e)=>{ e.stopPropagation(); enterIframeFullscreen(); });
  if(fsExitBtn) fsExitBtn.addEventListener('click', (e)=>{ e.stopPropagation(); exitAnyFullscreen(); });

  // Keep sidebar button states in sync with fullscreen changes
  document.addEventListener('fullscreenchange', ()=>{
    const elFs = document.fullscreenElement;
    try{
      const isIframeFs = elFs === iframe;
      const isOverlayFs = elFs === overlay;
      const isAnyFs = !!elFs;
      if(isAnyFs){
        if(fsExitBtn) fsExitBtn.style.display = 'inline-block';
        if(fsEnterBtn) fsEnterBtn.style.display = 'none';
      } else {
        if(fsExitBtn) fsExitBtn.style.display = 'none';
        if(fsEnterBtn) fsEnterBtn.style.display = 'inline-block';
      }
      // Informational: if iframe is fullscreen, controls outside iframe won't be visible
      if(isIframeFs){
        console.info('Iframe is fullscreen. Sidebar/arrow outside iframe will not be visible while in this state.');
      }
    }catch(e){console.error(e)}
  });

  // Note: don't allow ESC to close — exit only via menu

  // Click delegation for games grid: intercept links or elements with data-game-url inside #games-grid
  document.addEventListener('click', (e)=>{
    const withinGames = e.target.closest('#games-grid');
    if(!withinGames) return;
    const el = e.target.closest('[data-game-url], a');
    if(!el) return;
    // find url: prefer dataset
    let url = el.dataset && el.dataset.gameUrl ? el.dataset.gameUrl : el.getAttribute('href');
    if(!url) return;
    // ignore anchors and fragment links
    if(url.startsWith('#') || url.startsWith('mailto:') || url.startsWith('javascript:')) return;
    e.preventDefault();
    window.openGameInIframe(url);
  });

  // Help dialog listeners
  if(helpDismissBtn){
    helpDismissBtn.addEventListener('click', ()=>{
      try{
        const hideKey = 'astralx_hide_game_help';
        if(helpCheckbox && helpCheckbox.checked){ localStorage.setItem(hideKey, '1'); }
      }catch(e){}
      if(helpEl) helpEl.style.display = 'none';
      if(toggleArrow) toggleArrow.classList.remove('attention');
    });
  }
})();
