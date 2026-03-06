/* ── @mention sistemi ── */
(function () {
  'use strict';

  /* ── State ── */
  let _mentionRoom = null;   // şu an açık oda
  let _mentionMembers = [];  // oda üyeleri
  let _mentionBox = null;    // dropdown el
  let _selIdx = -1;          // seçili index
  let _activeInp = null;     // aktif input

  /* ── Kullanıcı adını localStorage'dan oku ── */
  function getCurrentUser() {
    const srv = localStorage.getItem('sohbet_last_server');
    if (!srv) return null;
    return localStorage.getItem('sohbet_user_' + srv);
  }

  /* ── Online durumu DOM'dan oku ── */
  function getOnlineUsers() {
    const online = new Set();
    // Masaüstü panel
    document.querySelectorAll('.dsk-row[data-u]').forEach(el => {
      const dot = el.querySelector('[style*="green"], .online-dot, .status-dot');
      if (dot) online.add(el.dataset.u);
    });
    // Mobil panel - online dot'u olan satırlar
    document.querySelectorAll('[data-u]').forEach(el => {
      if (el.querySelector('.online-dot, [style*="#2ecc71"], [style*="green"]')) {
        online.add(el.dataset.u);
      }
    });
    return online;
  }

  /* ── Firebase'den oda üyelerini çek ── */
  function fetchMembers(roomId) {
    if (!roomId || typeof dbRef === 'undefined') return;
    try {
      dbRef('rooms/' + roomId).once('value').then(snap => {
        const room = snap.val();
        if (!room) return;
        if (room.members && Array.isArray(room.members)) {
          _mentionMembers = room.members;
        } else if (room.type === 'channel' || room.type === 'kanal') {
          // Kanal: tüm kullanıcıları çek
          dbRef('users').once('value').then(us => {
            _mentionMembers = us.val() ? Object.keys(us.val()) : [];
          });
        } else {
          _mentionMembers = [];
        }
      }).catch(() => {});
    } catch (e) {}
  }

  /* ── Oda açılınca üyeleri güncelle ── */
  function onRoomOpen(roomId) {
    _mentionRoom = roomId;
    _mentionMembers = [];
    fetchMembers(roomId);
  }

  /* ── openRoom ve deskOpenRoom'u wrap et ── */
  function hookRoomOpeners() {
    // openRoom (mobil)
    const origOpen = window.openRoom;
    if (typeof origOpen === 'function') {
      window.openRoom = function (...args) {
        const result = origOpen.apply(this, args);
        onRoomOpen(args[0]);
        return result;
      };
    }
    // deskOpenRoom (masaüstü)
    const origDesk = window.deskOpenRoom;
    if (typeof origDesk === 'function') {
      window.deskOpenRoom = function (...args) {
        const result = origDesk.apply(this, args);
        onRoomOpen(args[0]);
        return result;
      };
    }
  }

  /* ── Dropdown oluştur ── */
  function createBox() {
    if (document.getElementById('mentionBox')) return;
    const box = document.createElement('div');
    box.id = 'mentionBox';
    box.style.cssText = `
      position: fixed;
      background: var(--surface2, #2a2a3a);
      border: 1px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 99999;
      min-width: 200px;
      max-width: 280px;
      max-height: 260px;
      overflow-y: auto;
      display: none;
      padding: 6px 0;
    `;
    document.body.appendChild(box);
    _mentionBox = box;

    // Dışarı tıklayınca kapat
    document.addEventListener('mousedown', e => {
      if (_mentionBox && !_mentionBox.contains(e.target)) hideBox();
    });
  }

  function hideBox() {
    if (_mentionBox) _mentionBox.style.display = 'none';
    _selIdx = -1;
  }

  /* ── Dropdown'u pozisyonla ── */
  function positionBox(inp) {
    if (!_mentionBox) return;
    const rect = inp.getBoundingClientRect();
    const boxH = Math.min(260, _mentionBox.scrollHeight || 200);
    let top = rect.top - boxH - 8;
    if (top < 8) top = rect.bottom + 8;
    let left = rect.left;
    if (left + 280 > window.innerWidth) left = window.innerWidth - 288;
    _mentionBox.style.top = top + 'px';
    _mentionBox.style.left = left + 'px';
  }

  /* ── Seçenekleri filtrele ve göster ── */
  function showSuggestions(inp, query) {
    if (!_mentionBox) return;
    const cu = getCurrentUser() || '';
    const online = getOnlineUsers();
    const q = query.toLowerCase();

    // Özel seçenekler
    const specials = [
      { key: 'here', label: '@here', desc: 'Çevrimiçi olanları etiketle', color: '#2ecc71', special: true },
      { key: 'all', label: '@all', desc: 'Herkesi etiketle', color: '#e74c3c', special: true },
    ].filter(s => s.key.includes(q) || q === '');

    // Üye listesi — mevcut user hariç
    const others = _mentionMembers
      .filter(u => u !== cu && u.toLowerCase().includes(q))
      .sort((a, b) => {
        const ao = online.has(a) ? 0 : 1;
        const bo = online.has(b) ? 0 : 1;
        return ao - bo || a.localeCompare(b);
      });

    const items = [...specials, ...others.map(u => ({
      key: u,
      label: '@' + u,
      desc: online.has(u) ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı',
      color: null,
      special: false
    }))];

    if (!items.length) { hideBox(); return; }

    _mentionBox.innerHTML = items.map((item, i) => `
      <div class="mention-item" data-idx="${i}" data-val="${item.label}"
        style="display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;
               border-radius:6px;margin:1px 4px;transition:background .15s;
               ${i === _selIdx ? 'background:var(--primary,#6c63ff30);' : ''}">
        <span style="font-weight:700;color:${item.color || 'var(--text-hi,#fff)'};font-size:.9rem;">${item.label}</span>
        <span style="font-size:.75rem;color:var(--muted,#888);margin-left:auto;">${item.desc || ''}</span>
      </div>
    `).join('');

    // Hover efekti
    _mentionBox.querySelectorAll('.mention-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        _selIdx = +el.dataset.idx;
        highlightItem();
      });
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        insertMention(inp, el.dataset.val);
      });
    });

    _mentionBox.style.display = 'block';
    positionBox(inp);
    highlightItem();
  }

  function highlightItem() {
    if (!_mentionBox) return;
    _mentionBox.querySelectorAll('.mention-item').forEach((el, i) => {
      el.style.background = i === _selIdx ? 'var(--primary,rgba(108,99,255,0.2))' : '';
    });
  }

  /* ── Mention ekle ── */
  function insertMention(inp, mention) {
    const val = inp.value;
    const pos = inp.selectionStart;
    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf('@');
    const after = val.slice(pos);
    inp.value = before.slice(0, atIdx) + mention + ' ' + after;
    const newPos = atIdx + mention.length + 1;
    inp.setSelectionRange(newPos, newPos);
    inp.focus();
    hideBox();
    inp.dispatchEvent(new Event('input'));
  }

  /* ── Input handler ── */
  function handleInput(e) {
    const inp = e.target;
    _activeInp = inp;
    const val = inp.value;
    const pos = inp.selectionStart;
    const before = val.slice(0, pos);
    const atIdx = before.lastIndexOf('@');

    if (atIdx === -1) { hideBox(); return; }

    // @ den sonra boşluk var mı?
    const afterAt = before.slice(atIdx + 1);
    if (afterAt.includes(' ')) { hideBox(); return; }

    // @ öncesinde boşluk veya başlangıç olmalı
    if (atIdx > 0 && !/\s/.test(before[atIdx - 1])) { hideBox(); return; }

    showSuggestions(inp, afterAt);
  }

  /* ── Klavye navigasyonu ── */
  function handleKeydown(e) {
    if (!_mentionBox || _mentionBox.style.display === 'none') return;
    const items = _mentionBox.querySelectorAll('.mention-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _selIdx = Math.min(_selIdx + 1, items.length - 1);
      highlightItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _selIdx = Math.max(_selIdx - 1, 0);
      highlightItem();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (_selIdx >= 0 && items[_selIdx]) {
        e.preventDefault();
        insertMention(e.target, items[_selIdx].dataset.val);
      }
    } else if (e.key === 'Escape') {
      hideBox();
    }
  }

  /* ── Mesaj renderında mention'ları renklendir ── */
  function styleMentions(el) {
    if (!el) return;
    const cu = getCurrentUser();
    el.querySelectorAll('.ob, .mb-text').forEach(msg => {
      if (msg.dataset.mentionStyled) return;
      msg.dataset.mentionStyled = '1';
      msg.innerHTML = msg.innerHTML.replace(
        /(@(?:here|all|everyone|[A-Za-zÇçĞğİıÖöŞşÜü0-9_-]+))/g,
        (m) => {
          const tag = m.slice(1).toLowerCase();
          if (tag === 'here' || tag === 'all' || tag === 'everyone') {
            return `<span style="background:rgba(46,204,113,.18);color:#2ecc71;border-radius:4px;padding:1px 5px;font-weight:700;">${m}</span>`;
          }
          if (cu && tag === cu.toLowerCase()) {
            return `<span style="background:rgba(255,214,0,.15);color:#ffd600;border-radius:4px;padding:1px 5px;font-weight:700;">${m}</span>`;
          }
          return `<span style="background:rgba(108,99,255,.15);color:var(--primary,#a78bfa);border-radius:4px;padding:1px 5px;font-weight:700;">${m}</span>`;
        }
      );
    });
  }

  /* ── Input'lara listener ekle ── */
  function attachListeners() {
    const ids = ['msgInp', 'deskInp'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el._mentionAttached) return;
      el._mentionAttached = true;
      el.addEventListener('input', handleInput);
      el.addEventListener('keydown', handleKeydown);
    });
  }

  /* ── MutationObserver: mesaj render olunca mention'ları renklendir ── */
  function observeMsgs() {
    const targets = ['chatMsgs', 'deskMsgs'];
    targets.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el._mentionObserved) return;
      el._mentionObserved = true;
      styleMentions(el);
      new MutationObserver(() => styleMentions(el)).observe(el, { childList: true, subtree: true });
    });
  }

  /* ── @ butonuna tıklanınca ── */
  function onAtBtnClick() {
    const inp = document.getElementById('deskInp') || document.getElementById('msgInp');
    if (!inp) return;
    const val = inp.value;
    const pos = inp.selectionStart;
    inp.value = val.slice(0, pos) + '@' + val.slice(pos);
    inp.setSelectionRange(pos + 1, pos + 1);
    inp.focus();
    inp.dispatchEvent(new Event('input'));
  }

  /* ── Başlatıcı ── */
  function init() {
    createBox();
    hookRoomOpeners();
    attachListeners();
    observeMsgs();

    // @ butonu varsa bağla
    const atBtn = document.getElementById('atMentionBtn');
    if (atBtn && !atBtn._mentionAttached) {
      atBtn._mentionAttached = true;
      atBtn.addEventListener('click', onAtBtnClick);
    }

    // Polling: dinamik eklenen inputları yakala, mention'ları renklendir
    setInterval(() => {
      attachListeners();
      observeMsgs();
    }, 1500);
  }

  /* ── Sayfa hazır olunca başlat ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  window.__mention = { fetchMembers, onRoomOpen };
})();
