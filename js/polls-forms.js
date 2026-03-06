/* ═══════════════════════════════════════════════════════════════
   ANKETLER · FORMLAR · QUIZ · ONAYLAR — polls-forms.js
   Discord + Slack + Teams + Google Chat
═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════
   1. ANKETLER (Polls)
══════════════════════════ */
function openPollCreator(roomId) {
  let m = document.getElementById('pollCreatorModal');
  if (!m) { m = document.createElement('div'); m.id = 'pollCreatorModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:520px;">
    <div class="bb-modal-header"><span>📊 Anket Oluştur</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <input id="pollQ" placeholder="Anket sorusu..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.95rem;">
      <div>
        <div style="font-size:.78rem;color:var(--muted);font-weight:600;margin-bottom:6px;">SEÇENEKLER</div>
        <div id="pollOptsList" style="display:flex;flex-direction:column;gap:6px;">
          <input placeholder="Seçenek 1" class="poll-opt" style="padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          <input placeholder="Seçenek 2" class="poll-opt" style="padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        </div>
        <button onclick="addPollOpt()" style="margin-top:6px;padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.8rem;">＋ Seçenek Ekle</button>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.83rem;color:var(--text-hi);"><input type="checkbox" id="pollMulti" style="accent-color:var(--accent)"> Çoklu seçim</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.83rem;color:var(--text-hi);"><input type="checkbox" id="pollAnon" style="accent-color:var(--accent)"> Anonim</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.83rem;color:var(--text-hi);"><input type="checkbox" id="pollQuiz" onchange="document.getElementById('quizArea').style.display=this.checked?'block':'none'" style="accent-color:var(--accent)"> 🧠 Quiz modu</label>
      </div>
      <div id="quizArea" style="display:none;">
        <label style="font-size:.78rem;color:var(--muted);font-weight:600;">DOĞRU CEVAP (0=ilk seçenek)</label>
        <input id="pollCorrect" type="number" min="0" value="0" style="display:block;width:100%;margin-top:4px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      </div>
      <div>
        <label style="font-size:.78rem;color:var(--muted);font-weight:600;">BİTİŞ TARİHİ (opsiyonel)</label>
        <input type="datetime-local" id="pollExpiry" style="display:block;width:100%;margin-top:4px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      </div>
      <button onclick="createPoll('${roomId}')" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:.9rem;">📊 Anketi Gönder</button>
    </div>
  </div>`;
  m.style.display = 'flex';
}
function addPollOpt() {
  const l = document.getElementById('pollOptsList'); if (l.children.length >= 10) return showToast('Max 10 seçenek');
  const i = document.createElement('input');
  i.placeholder = 'Seçenek ' + (l.children.length + 1);
  i.className = 'poll-opt';
  i.style.cssText = 'padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);';
  l.appendChild(i);
}
async function createPoll(roomId) {
  const q = document.getElementById('pollQ').value.trim();
  const opts = [...document.querySelectorAll('.poll-opt')].map(i=>i.value.trim()).filter(Boolean);
  if (!q || opts.length < 2) return showToast('Soru ve en az 2 seçenek gerekli');
  const poll = { q, opts, votes:{}, multi:document.getElementById('pollMulti').checked, anon:document.getElementById('pollAnon').checked, quiz:document.getElementById('pollQuiz').checked, correct:parseInt(document.getElementById('pollCorrect').value)||0, expiry:document.getElementById('pollExpiry').value?new Date(document.getElementById('pollExpiry').value).getTime():null, by:_cu, at:Date.now() };
  await dbRef('msgs/' + roomId).push({ user:_cu, name:_cName||_cu, poll, ts:Date.now() });
  document.getElementById('pollCreatorModal').style.display = 'none';
  showToast('📊 Anket gönderildi!');
}
async function votePoll(roomId, msgKey, optIdx) {
  const ref = dbRef('msgs/' + roomId + '/' + msgKey + '/poll/votes/' + _cu);
  const snap = await ref.once('value'); const cur = snap.val();
  const pSnap = await dbRef('msgs/' + roomId + '/' + msgKey + '/poll').once('value'); const poll = pSnap.val();
  if (poll.multi) { const vs = (cur && Array.isArray(cur)) ? cur : []; const i = vs.indexOf(optIdx); if (i>=0) vs.splice(i,1); else vs.push(optIdx); await ref.set(vs.length?vs:null); }
  else { await ref.set(cur===optIdx?null:optIdx); }
}
function renderPollMsg(poll, roomId, msgKey) {
  const total = Object.keys(poll.votes||{}).length;
  const uv = poll.votes && poll.votes[_cu];
  const expired = poll.expiry && Date.now() > poll.expiry;
  const counts = poll.opts.map((_,i) => Object.values(poll.votes||{}).filter(v=>Array.isArray(v)?v.includes(i):v===i).length);
  return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px;margin:4px 0;max-width:420px;">
    <div style="font-weight:700;color:var(--text-hi);margin-bottom:4px;">${poll.q}</div>
    <div style="font-size:.72rem;color:var(--muted);margin-bottom:10px;">${poll.anon?'🔒 Anonim · ':''}${poll.multi?'Çoklu · ':''}${poll.quiz?'🧠 Quiz · ':''}${expired?'⏰ Sona erdi':'Açık anket'}</div>
    ${poll.opts.map((opt,i) => {
      const cnt = counts[i]; const pct = total ? Math.round(cnt/total*100) : 0;
      const voted = Array.isArray(uv) ? uv.includes(i) : uv===i;
      const correct = poll.quiz && poll.correct===i;
      return `<div onclick="${expired?'':`votePoll('${roomId}','${msgKey}',${i})`}" style="margin-bottom:7px;cursor:${expired?'default':'pointer'};">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:.83rem;color:var(--text-hi);font-weight:${voted?700:400};">${voted?'✅':'⬜'} ${opt}${correct&&expired?' <span style="color:#2ecc71;font-size:.72rem;">(Doğru)</span>':''}</span>
          <span style="font-size:.75rem;color:var(--muted);">${cnt} (${pct}%)</span>
        </div>
        <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${voted?'var(--accent)':correct&&expired?'#2ecc71':'var(--muted)'};border-radius:3px;transition:width .4s;"></div></div>
      </div>`;
    }).join('')}
    <div style="font-size:.72rem;color:var(--muted);margin-top:8px;">${total} oy kullanıldı</div>
  </div>`;
}

/* ══════════════════════════
   2. FORMLAR
══════════════════════════ */
let _fFields = [];
function openFormBuilder() {
  _fFields = [];
  let m = document.getElementById('formBuilderModal');
  if (!m) { m = document.createElement('div'); m.id = 'formBuilderModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:660px;max-height:88vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>📋 Form Oluşturucu</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px;">
      <input id="fTitle" placeholder="Form başlığı..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:1rem;font-weight:700;">
      <textarea id="fDesc" placeholder="Açıklama..." rows="2" style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;"></textarea>
      <div id="fFieldsList" style="display:flex;flex-direction:column;gap:8px;"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${['Kısa Metin','Uzun Metin','Çoktan Seçmeli','Onay Kutusu','Tarih','Sayı','E-posta','Derecelendirme','Bölüm Başlığı'].map(t =>
          `<button onclick="addFF('${t}')" style="padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.78rem;">＋ ${t}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button onclick="saveFormAndShare()" style="flex:1;padding:11px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">💾 Kaydet & Paylaş</button>
      </div>
    </div>
  </div>`;
  m.style.display = 'flex';
}
function addFF(type) {
  _fFields.push({ id:'ff_'+Date.now(), type, label:'', required:false, options:type==='Çoktan Seçmeli'?['Seçenek 1','Seçenek 2']:[] });
  _renderFF();
}
function _renderFF() {
  const el = document.getElementById('fFieldsList'); if (!el) return;
  el.innerHTML = _fFields.map((f,idx) => `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="font-size:.72rem;background:var(--accent)22;color:var(--accent);padding:2px 8px;border-radius:20px;font-weight:700;">${f.type}</span>
        <input value="${f.label}" oninput="_fFields[${idx}].label=this.value" placeholder="Alan etiketi..." style="flex:1;padding:6px 10px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.83rem;">
        <label style="display:flex;align-items:center;gap:4px;font-size:.78rem;color:var(--muted);cursor:pointer;white-space:nowrap;"><input type="checkbox" ${f.required?'checked':''} onchange="_fFields[${idx}].required=this.checked" style="accent-color:var(--accent)"> Zorunlu</label>
        <button onclick="_fFields.splice(${idx},1);_renderFF()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;">✕</button>
      </div>
      ${f.type==='Çoktan Seçmeli'?`<div style="display:flex;flex-direction:column;gap:4px;">${f.options.map((o,oi)=>`<div style="display:flex;gap:6px;"><input value="${o}" oninput="_fFields[${idx}].options[${oi}]=this.value" style="flex:1;padding:5px 10px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.82rem;"><button onclick="_fFields[${idx}].options.splice(${oi},1);_renderFF()" style="background:none;border:none;color:var(--muted);cursor:pointer;">✕</button></div>`).join('')}<button onclick="_fFields[${idx}].options.push('Seçenek ${f.options.length+1}');_renderFF()" style="padding:4px 8px;background:var(--input);border:1px dashed var(--border);border-radius:6px;cursor:pointer;color:var(--muted);font-size:.78rem;">＋ Seçenek</button></div>`:''}
      ${f.type==='Derecelendirme'?`<div style="font-size:.78rem;color:var(--muted);">⭐⭐⭐⭐⭐ (1-5 yıldız)</div>`:''}
    </div>`).join('');
}
async function saveFormAndShare() {
  const title = document.getElementById('fTitle').value.trim();
  if (!title) return showToast('Form başlığı gerekli');
  const fId = 'form_' + Date.now();
  await dbRef('forms/' + (_currentServer||'main') + '/' + fId).set({ title, desc:document.getElementById('fDesc').value, fields:[..._fFields], by:_cu, at:Date.now(), responses:{} });
  const roomId = window._deskRoom || window._cRoom;
  if (roomId) await dbRef('msgs/' + roomId).push({ user:_cu, name:_cName||_cu, formCard:{ id:fId, title }, ts:Date.now() });
  document.getElementById('formBuilderModal').style.display = 'none';
  _fFields = [];
  showToast('📋 Form paylaşıldı!');
}
async function openFormFill(fId) {
  const snap = await dbRef('forms/' + (_currentServer||'main') + '/' + fId).once('value');
  const f = snap.val(); if (!f) return showToast('Form bulunamadı');
  let m = document.getElementById('formFillModal');
  if (!m) { m = document.createElement('div'); m.id = 'formFillModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:540px;max-height:88vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>📋 ${f.title}</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:12px;">
      ${f.desc?`<p style="color:var(--muted);font-size:.85rem;margin:0;">${f.desc}</p>`:''}
      ${(f.fields||[]).map(ff => `<div>
        <label style="font-size:.83rem;font-weight:700;color:var(--text-hi);display:block;margin-bottom:5px;">${ff.label||ff.type}${ff.required?` <span style="color:#e74c3c">*</span>`:''}</label>
        ${ff.type==='Uzun Metin'?`<textarea data-fid="${ff.id}" rows="3" style="width:100%;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;"></textarea>`
        :ff.type==='Çoktan Seçmeli'?`<div>${ff.options.map(o=>`<label style="display:flex;align-items:center;gap:8px;margin:4px 0;cursor:pointer;"><input type="radio" name="ff_${ff.id}" value="${o}" style="accent-color:var(--accent);"><span style="font-size:.83rem;color:var(--text-hi);">${o}</span></label>`).join('')}</div>`
        :ff.type==='Onay Kutusu'?`<label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" data-fid="${ff.id}" style="accent-color:var(--accent);width:18px;height:18px;"><span style="font-size:.83rem;color:var(--text-hi);">Evet</span></label>`
        :ff.type==='Tarih'?`<input type="date" data-fid="${ff.id}" style="padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">`
        :ff.type==='Derecelendirme'?`<div data-fid="${ff.id}" data-val="0" style="display:flex;gap:8px;font-size:1.8rem;">${[1,2,3,4,5].map(n=>`<span onclick="this.parentNode.dataset.val=${n};[...this.parentNode.children].forEach((s,i)=>s.style.opacity=i<${n}?'1':'.3')" style="cursor:pointer;transition:opacity .15s;">⭐</span>`).join('')}</div>`
        :ff.type==='Bölüm Başlığı'?`<hr style="border-color:var(--border);">`
        :`<input type="${ff.type==='E-posta'?'email':ff.type==='Sayı'?'number':'text'}" data-fid="${ff.id}" style="width:100%;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">`}
      </div>`).join('')}
      <button onclick="submitForm('${fId}')" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">📨 Gönder</button>
    </div>
  </div>`;
  m.style.display = 'flex';
}
async function submitForm(fId) {
  const snap = await dbRef('forms/' + (_currentServer||'main') + '/' + fId).once('value');
  const f = snap.val();
  const answers = {};
  (f.fields||[]).forEach(ff => {
    const el = document.querySelector(`[data-fid="${ff.id}"]`);
    if (el) answers[ff.id] = el.type==='checkbox' ? el.checked : (el.dataset.val||el.value);
    const r = document.querySelector(`input[name="ff_${ff.id}"]:checked`);
    if (r) answers[ff.id] = r.value;
  });
  await dbRef('forms/' + (_currentServer||'main') + '/' + fId + '/responses/' + _cu).set({ uid:_cu, name:_cName||_cu, answers, at:Date.now() });
  document.getElementById('formFillModal').style.display = 'none';
  showToast('✅ Yanıtınız gönderildi! Teşekkürler 🎉');
}
async function openFormResults(fId) {
  const snap = await dbRef('forms/' + (_currentServer||'main') + '/' + fId).once('value');
  const f = snap.val(); const resps = Object.values(f.responses||{});
  let m = document.getElementById('formResultsModal');
  if (!m) { m = document.createElement('div'); m.id = 'formResultsModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:580px;max-height:88vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>📊 ${f.title} — ${resps.length} Yanıt</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;overflow-y:auto;flex:1;">
      ${(f.fields||[]).filter(ff=>ff.type!=='Bölüm Başlığı').map(ff => {
        const answers = resps.map(r=>r.answers[ff.id]).filter(a=>a!==undefined&&a!=='');
        return `<div style="margin-bottom:20px;padding:14px;background:var(--surface);border-radius:10px;">
          <div style="font-weight:700;color:var(--text-hi);margin-bottom:10px;">${ff.label||ff.type}</div>
          ${ff.type==='Çoktan Seçmeli'
            ? ff.options.map(o=>{const cnt=answers.filter(a=>a===o).length;const pct=resps.length?Math.round(cnt/resps.length*100):0;return`<div style="margin-bottom:6px;"><div style="display:flex;justify-content:space-between;font-size:.82rem;color:var(--text-hi);margin-bottom:3px;"><span>${o}</span><span>${cnt} (${pct}%)</span></div><div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:var(--accent);border-radius:4px;"></div></div></div>`;}).join('')
            : `<div>${answers.slice(0,15).map(a=>`<div style="padding:5px 10px;background:var(--bg);border-radius:6px;margin-bottom:3px;font-size:.82rem;color:var(--text-hi);">${a}</div>`).join('')}${answers.length>15?`<div style="color:var(--muted);font-size:.78rem;">+${answers.length-15} yanıt daha...</div>`:''}</div>`}
        </div>`;
      }).join('')}
    </div>
  </div>`;
  m.style.display = 'flex';
}

/* ══════════════════════════
   3. ONAY SİSTEMİ (Teams)
══════════════════════════ */
function openApprovalCreator(roomId) {
  let m = document.getElementById('approvalModal');
  if (!m) { m = document.createElement('div'); m.id = 'approvalModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = `<div class="bb-modal" style="width:480px;">
    <div class="bb-modal-header"><span>✅ Onay İsteği</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <input id="apprTitle" placeholder="Başlık..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <textarea id="apprDesc" rows="3" placeholder="Detaylar..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;"></textarea>
      <input id="apprApprovers" placeholder="Onaycılar (virgülle ayır)..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <select id="apprType" style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <option value="everyone">Herkes onaylamalı</option>
        <option value="anyone">Biri onaylaması yeterli</option>
      </select>
      <button onclick="sendApproval('${roomId}')" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">✅ İstek Gönder</button>
    </div>
  </div>`;
  m.style.display = 'flex';
}
async function sendApproval(roomId) {
  const title = document.getElementById('apprTitle').value.trim();
  if (!title) return showToast('Başlık gerekli');
  const id = 'appr_' + Date.now();
  await dbRef('approvals/' + (_currentServer||'main') + '/' + id).set({ title, desc:document.getElementById('apprDesc').value, approvers:document.getElementById('apprApprovers').value.split(',').map(s=>s.trim()).filter(Boolean), type:document.getElementById('apprType').value, responses:{}, status:'pending', by:_cu, at:Date.now() });
  await dbRef('msgs/' + roomId).push({ user:_cu, name:_cName||_cu, approvalCard:{ id, title }, ts:Date.now() });
  document.getElementById('approvalModal').style.display = 'none';
  showToast('✅ Onay isteği gönderildi!');
}
async function respondApproval(id, resp) {
  await dbRef('approvals/' + (_currentServer||'main') + '/' + id + '/responses/' + _cu).set({ resp, name:_cName||_cu, at:Date.now() });
  showToast(resp==='approved' ? '✅ Onaylandı' : '❌ Reddedildi');
}
function renderApprovalCard(card) {
  return `<div style="background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:12px;padding:14px;margin:4px 0;max-width:420px;">
    <div style="font-weight:700;color:var(--text-hi);margin-bottom:8px;">✅ Onay İsteği: ${card.title}</div>
    <div style="display:flex;gap:8px;">
      <button onclick="respondApproval('${card.id}','approved')" style="flex:1;padding:8px;background:rgba(46,204,113,.15);border:1px solid rgba(46,204,113,.3);color:#2ecc71;border-radius:8px;cursor:pointer;font-weight:600;">✅ Onayla</button>
      <button onclick="respondApproval('${card.id}','rejected')" style="flex:1;padding:8px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:8px;cursor:pointer;font-weight:600;">❌ Reddet</button>
    </div>
  </div>`;
}

window.openPollCreator = openPollCreator;
window.addPollOpt = addPollOpt;
window.createPoll = createPoll;
window.votePoll = votePoll;
window.renderPollMsg = renderPollMsg;
window.openFormBuilder = openFormBuilder;
window.addFF = addFF;
window.saveFormAndShare = saveFormAndShare;
window.openFormFill = openFormFill;
window.submitForm = submitForm;
window.openFormResults = openFormResults;
window.openApprovalCreator = openApprovalCreator;
window.sendApproval = sendApproval;
window.respondApproval = respondApproval;
window.renderApprovalCard = renderApprovalCard;
