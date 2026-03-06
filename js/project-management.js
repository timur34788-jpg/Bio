/* ═══════════════════════════════════════════════════════════════
   PROJE YÖNETİMİ — ClickUp benzeri (7 görünüm)
   project-management.js
═══════════════════════════════════════════════════════════════ */
let _pmView = 'board', _pmTasks = {}, _pmCF = {}, _pmFilters = {}, _pmTimer = null;
const pmR = p => dbRef('pm/' + (_currentServer||'main') + (p?'/'+p:''));

const PM_STATUSES = [
  {id:'todo',label:'📋 Yapılacak',color:'#607d8b'},
  {id:'inprogress',label:'🔄 Devam Ediyor',color:'#3498db'},
  {id:'review',label:'👀 İncelemede',color:'#9b59b6'},
  {id:'done',label:'✅ Tamamlandı',color:'#2ecc71'},
];
const PM_PRIORITIES = {critical:['🔴','Kritik'],high:['🟠','Yüksek'],normal:['🟡','Normal'],low:['🟢','Düşük']};

async function pmCreateTask(d) {
  const id = 'task_' + Date.now();
  const t = { id, title:d.title, desc:d.desc||'', status:d.status||'todo', priority:d.priority||'normal', assignees:d.assignees||[], tags:d.tags||[], due:d.due||null, start:d.start||null, est:0, logged:0, subtasks:{}, comments:{}, by:_cu, at:Date.now(), upd:Date.now() };
  await pmR('tasks/'+id).set(t); _pmTasks[id] = t; return id;
}
async function pmLoadTasks() { return new Promise(r => pmR('tasks').once('value', s => { _pmTasks = s.val()||{}; r(_pmTasks); })); }
async function pmUpdateTask(id, u) { u.upd = Date.now(); await pmR('tasks/'+id).update(u); if (_pmTasks[id]) Object.assign(_pmTasks[id], u); }
async function pmDeleteTask(id) { await pmR('tasks/'+id).remove(); delete _pmTasks[id]; }
async function pmAddSubtask(pid, title) { await pmR('tasks/'+pid+'/subtasks/st_'+Date.now()).set({ title, done:false }); }
async function pmToggleSub(pid, sid) { const r = pmR('tasks/'+pid+'/subtasks/'+sid+'/done'); const s = await r.once('value'); await r.set(!s.val()); }

/* Timer */
function pmStartTimer(id) {
  if (_pmTimer) pmStopTimer();
  _pmTimer = { id, t0:Date.now() };
  const btn = document.getElementById('pmTimerBtn_' + id);
  if (btn) { btn.textContent = '⏹️ Durdur'; btn.style.color = '#e74c3c'; }
  showToast('⏱️ Zamanlayıcı başladı');
}
async function pmStopTimer() {
  if (!_pmTimer) return;
  const elapsed = Math.floor((Date.now() - _pmTimer.t0) / 60000);
  const id = _pmTimer.id; _pmTimer = null;
  const logged = (_pmTasks[id]?.logged||0) + elapsed;
  await pmUpdateTask(id, { logged });
  showToast(`⏱️ ${elapsed} dakika kaydedildi`);
}

/* ── ANA PANEL ── */
function openProjectManager() {
  let m = document.getElementById('pmModal');
  if (!m) { m = document.createElement('div'); m.id = 'pmModal'; m.className = 'bb-modal-overlay'; document.body.appendChild(m); }
  m.style.display = 'flex';
  pmLoadTasks().then(() => _renderPM(m));
}

function _renderPM(m) {
  const views = [{id:'board',icon:'🗂️',label:'Kanban'},{id:'list',icon:'☰',label:'Liste'},{id:'calendar',icon:'📅',label:'Takvim'},{id:'gantt',icon:'📊',label:'Gantt'},{id:'timeline',icon:'📈',label:'Zaman Çizelgesi'},{id:'table',icon:'⊞',label:'Tablo'},{id:'workload',icon:'👤',label:'İş Yükü'}];
  m.innerHTML = `<div class="bb-modal" style="width:96vw;max-width:1280px;height:92vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header" style="flex-shrink:0;">
      <span>📋 Proje Yönetimi</span>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
        ${views.map(v=>`<button onclick="pmSwitchView('${v.id}')" style="padding:5px 9px;background:${_pmView===v.id?'var(--accent)':'var(--surface)'};color:${_pmView===v.id?'#fff':'var(--text-hi)'};border:1px solid ${_pmView===v.id?'var(--accent)':'var(--border)'};border-radius:6px;cursor:pointer;font-size:.75rem;font-weight:600;">${v.icon} ${v.label}</button>`).join('')}
        <button onclick="pmOpenCreate()" style="padding:5px 12px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.8rem;">＋ Görev</button>
        <button onclick="pmOpenSprints()" style="padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:.75rem;color:var(--text-hi);">🏃 Sprint</button>
        <button onclick="pmOpenGoals()" style="padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:.75rem;color:var(--text-hi);">🎯 Hedefler</button>
        <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
      </div>
    </div>
    <div style="padding:8px 16px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;">
      <input placeholder="🔍 Ara..." oninput="_pmFilters.q=this.value;pmRenderContent()" style="padding:6px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.82rem;width:180px;">
      <select onchange="_pmFilters.priority=this.value;pmRenderContent()" style="padding:6px 10px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.78rem;">
        <option value="">Tüm öncelikler</option>${Object.entries(PM_PRIORITIES).map(([v,e])=>`<option value="${v}">${e[0]} ${e[1]}</option>`).join('')}
      </select>
      <select onchange="_pmFilters.status=this.value;pmRenderContent()" style="padding:6px 10px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.78rem;">
        <option value="">Tüm durumlar</option>${PM_STATUSES.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}
      </select>
      <label style="display:flex;align-items:center;gap:4px;font-size:.78rem;color:var(--text-hi);cursor:pointer;"><input type="checkbox" onchange="_pmFilters.mine=this.checked;pmRenderContent()" style="accent-color:var(--accent)"> Benimkiler</label>
    </div>
    <div id="pmContent" style="flex:1;overflow:auto;padding:16px;"></div>
  </div>`;
  pmRenderContent();
}

function pmSwitchView(v) { _pmView = v; const m = document.getElementById('pmModal'); if (m) _renderPM(m); }

function pmGetFiltered() {
  return Object.values(_pmTasks).filter(t => {
    if (_pmFilters.q && !t.title.toLowerCase().includes(_pmFilters.q.toLowerCase())) return false;
    if (_pmFilters.priority && t.priority !== _pmFilters.priority) return false;
    if (_pmFilters.status && t.status !== _pmFilters.status) return false;
    if (_pmFilters.mine && !t.assignees?.includes(_cu)) return false;
    return true;
  });
}

function pmRenderContent() {
  const el = document.getElementById('pmContent'); if (!el) return;
  const tasks = pmGetFiltered();
  if (_pmView==='board') el.innerHTML = _pmBoard(tasks);
  else if (_pmView==='list') el.innerHTML = _pmList(tasks);
  else if (_pmView==='calendar') el.innerHTML = _pmCalendar(tasks);
  else if (_pmView==='gantt') el.innerHTML = _pmGantt(tasks);
  else if (_pmView==='table') el.innerHTML = _pmTable(tasks);
  else if (_pmView==='workload') el.innerHTML = _pmWorkload(tasks);
  else if (_pmView==='timeline') el.innerHTML = _pmTimeline(tasks);
}

function _pmTaskCard(t) {
  const st = PM_STATUSES.find(s=>s.id===t.status);
  const pr = PM_PRIORITIES[t.priority]||['🟡','Normal'];
  const overdue = t.due && Date.now() > t.due && t.status!=='done';
  const subCount = Object.keys(t.subtasks||{}).length;
  const subDone = Object.values(t.subtasks||{}).filter(s=>s.done).length;
  return `<div draggable="true" ondragstart="pmDragStart(event,'${t.id}')" onclick="pmOpenDetail('${t.id}')" style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px;">
      <span style="font-size:.85rem;font-weight:600;color:var(--text-hi);line-height:1.3;">${pr[0]} ${t.title}</span>
      <button onclick="event.stopPropagation();pmStartTimer('${t.id}')" title="Zamanlayıcı" style="background:none;border:none;cursor:pointer;font-size:.85rem;flex-shrink:0;color:var(--muted);">⏱️</button>
    </div>
    ${t.desc?`<div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;overflow:hidden;max-height:32px;">${t.desc.slice(0,80)}${t.desc.length>80?'...':''}</div>`:''}
    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
      ${t.due?`<span style="font-size:.72rem;padding:2px 6px;border-radius:4px;background:${overdue?'rgba(231,76,60,.15)':'rgba(52,152,219,.1)'};color:${overdue?'#e74c3c':'#3498db'};">📅 ${new Date(t.due).toLocaleDateString('tr')}</span>`:''}
      ${(t.tags||[]).map(tag=>`<span style="font-size:.7rem;padding:2px 6px;background:var(--surface);border-radius:4px;color:var(--muted);">#${tag}</span>`).join('')}
      ${t.logged?`<span style="font-size:.72rem;color:var(--muted);">⏱ ${t.logged}dk</span>`:''}
      ${subCount?`<span style="font-size:.72rem;color:var(--muted);">☑ ${subDone}/${subCount}</span>`:''}
    </div>
    ${(t.assignees||[]).length?`<div style="display:flex;gap:3px;margin-top:6px;">${t.assignees.slice(0,5).map(a=>`<div title="${a}" style="width:22px;height:22px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:700;color:#fff;">${(a||'?').slice(0,2).toUpperCase()}</div>`).join('')}</div>`:``}
  </div>`;
}

function _pmBoard(tasks) {
  return `<div style="display:flex;gap:12px;height:100%;overflow-x:auto;padding-bottom:8px;">
    ${PM_STATUSES.map(s => {
      const st = tasks.filter(t=>t.status===s.id);
      return `<div style="min-width:280px;background:var(--surface);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;flex-shrink:0;" ondragover="event.preventDefault()" ondrop="pmDrop(event,'${s.id}')">
        <div style="display:flex;align-items:center;justify-content:space-between;font-weight:700;color:${s.color};">
          <span>${s.label}</span>
          <span style="background:var(--border);padding:1px 8px;border-radius:10px;font-size:.75rem;color:var(--muted);">${st.length}</span>
        </div>
        ${st.map(t=>_pmTaskCard(t)).join('')}
        <button onclick="pmOpenCreate('${s.id}')" style="padding:8px;background:var(--bg);border:1px dashed var(--border);border-radius:8px;cursor:pointer;color:var(--muted);font-size:.8rem;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='var(--bg)'">＋ Görev Ekle</button>
      </div>`;
    }).join('')}
  </div>`;
}

function _pmList(tasks) {
  return `<table style="width:100%;border-collapse:collapse;">
    <thead><tr style="border-bottom:2px solid var(--border);">
      ${['','Görev','Atanan','Durum','Öncelik','Bitiş','Süre',''].map(h=>`<th style="padding:8px 12px;text-align:left;font-size:.78rem;color:var(--muted);font-weight:700;">${h}</th>`).join('')}
    </tr></thead>
    <tbody>
      ${tasks.length ? tasks.map(t => {
        const s = PM_STATUSES.find(s=>s.id===t.status);
        const pr = PM_PRIORITIES[t.priority]||['🟡'];
        return `<tr style="border-bottom:1px solid var(--border);cursor:pointer;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''" onclick="pmOpenDetail('${t.id}')">
          <td style="padding:8px 12px;"><input type="checkbox" ${t.status==='done'?'checked':''} onclick="event.stopPropagation();pmUpdateTask('${t.id}',{status:this.checked?'done':'todo'}).then(pmRenderContent)" style="accent-color:var(--accent);width:16px;height:16px;cursor:pointer;"></td>
          <td style="padding:8px 12px;font-weight:600;color:var(--text-hi);font-size:.85rem;">${t.title}</td>
          <td style="padding:8px 12px;font-size:.78rem;color:var(--muted);">${(t.assignees||[]).join(', ')||'—'}</td>
          <td style="padding:8px 12px;"><span style="font-size:.72rem;padding:3px 8px;border-radius:20px;background:${s?.color}22;color:${s?.color};">${s?.label||t.status}</span></td>
          <td style="padding:8px 12px;">${pr[0]}</td>
          <td style="padding:8px 12px;font-size:.78rem;color:${t.due&&Date.now()>t.due?'#e74c3c':'var(--muted)'};">${t.due?new Date(t.due).toLocaleDateString('tr'):'—'}</td>
          <td style="padding:8px 12px;font-size:.78rem;color:var(--muted);">${t.logged?t.logged+'dk':'—'}</td>
          <td style="padding:8px 12px;" onclick="event.stopPropagation()"><button onclick="pmDeleteTask('${t.id}').then(pmRenderContent)" style="background:none;border:none;cursor:pointer;font-size:.85rem;color:var(--muted);">🗑️</button></td>
        </tr>`;
      }).join('') : `<tr><td colspan="8" style="padding:50px;text-align:center;color:var(--muted);">Görev yok. ＋ Görev butonu ile ekleyin.</td></tr>`}
    </tbody>
  </table>`;
}

function _pmCalendar(tasks) {
  const now = new Date(); const y = now.getFullYear(); const mo = now.getMonth();
  const fd = (new Date(y,mo,1).getDay()||7)-1;
  const dim = new Date(y,mo+1,0).getDate();
  const mn = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const byD = {};
  tasks.forEach(t=>{ if(t.due){ const d=new Date(t.due); if(d.getMonth()===mo){const k=d.getDate();if(!byD[k])byD[k]=[];byD[k].push(t);} } });
  let cells = '';
  for(let i=0;i<fd;i++) cells+=`<td style="background:var(--surface);opacity:.3;min-height:80px;"></td>`;
  for(let d=1;d<=dim;d++){
    const today=d===now.getDate(); const dt=byD[d]||[];
    cells+=`<td style="border:1px solid var(--border);padding:6px;vertical-align:top;min-height:80px;background:${today?'rgba(74,143,64,.08)':'var(--bg)'};border-radius:4px;">
      <div style="font-size:.75rem;font-weight:${today?800:600};color:${today?'var(--accent)':'var(--muted)'};">${d}</div>
      ${dt.slice(0,3).map(t=>`<div onclick="pmOpenDetail('${t.id}')" style="font-size:.65rem;background:${PM_STATUSES.find(s=>s.id===t.status)?.color}22;color:${PM_STATUSES.find(s=>s.id===t.status)?.color};padding:2px 4px;border-radius:3px;margin-top:2px;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${PM_PRIORITIES[t.priority]?.[0]} ${t.title}</div>`).join('')}
      ${dt.length>3?`<div style="font-size:.6rem;color:var(--muted);margin-top:2px;">+${dt.length-3} daha</div>`:''}
    </td>`;
    if((fd+d)%7===0&&d<dim) cells+=`</tr><tr>`;
  }
  return `<div><div style="text-align:center;font-weight:800;font-size:1.1rem;color:var(--text-hi);margin-bottom:16px;">${mn[mo]} ${y}</div>
    <table style="width:100%;border-collapse:separate;border-spacing:3px;">
      <thead><tr>${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'].map(d=>`<th style="padding:8px;font-size:.78rem;color:var(--muted);font-weight:700;">${d}</th>`).join('')}</tr></thead>
      <tbody><tr>${cells}</tr></tbody>
    </table></div>`;
}

function _pmGantt(tasks) {
  const sorted = tasks.filter(t=>t.start||t.due).sort((a,b)=>(a.start||a.due)-(b.start||b.due));
  if(!sorted.length) return `<div style="text-align:center;color:var(--muted);padding:80px;">Başlangıç veya bitiş tarihi olan görev yok.</div>`;
  const min = Math.min(...sorted.map(t=>t.start||t.due));
  const max = Math.max(...sorted.map(t=>t.due||t.start)) + 86400000*7;
  const days = Math.ceil((max-min)/86400000); const dw = Math.max(20,Math.min(40,900/days));
  const today = Date.now();
  return `<div style="overflow-x:auto;"><div style="display:flex;min-width:${200+days*dw}px;">
    <div style="width:200px;flex-shrink:0;">
      <div style="height:32px;border-bottom:1px solid var(--border);"></div>
      ${sorted.map(t=>`<div onclick="pmOpenDetail('${t.id}')" style="height:40px;border-bottom:1px solid var(--border);padding:0 10px;display:flex;align-items:center;font-size:.78rem;color:var(--text-hi);cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${PM_PRIORITIES[t.priority]?.[0]} ${t.title}</div>`).join('')}
    </div>
    <div style="flex:1;">
      <div style="display:flex;height:32px;border-bottom:1px solid var(--border);">
        ${Array.from({length:Math.ceil(days/7)},(_,w)=>`<div style="width:${dw*7}px;flex-shrink:0;border-right:1px solid var(--border);font-size:.68rem;color:var(--muted);padding:0 4px;display:flex;align-items:center;">${new Date(min+w*7*86400000).toLocaleDateString('tr',{month:'short',day:'numeric'})}</div>`).join('')}
      </div>
      ${sorted.map(t=>{
        const s=t.start||t.due; const e=t.due||t.start;
        const left=Math.max(0,(s-min)/86400000)*dw; const width=Math.max(dw,((e-s)/86400000+1)*dw);
        const color=PM_STATUSES.find(st=>st.id===t.status)?.color||'#607d8b';
        const tl=((today-min)/86400000)*dw;
        return `<div style="height:40px;border-bottom:1px solid var(--border);position:relative;background:var(--bg);">
          <div onclick="pmOpenDetail('${t.id}')" style="position:absolute;top:8px;left:${left}px;width:${width}px;height:24px;background:${color};opacity:.85;border-radius:4px;cursor:pointer;display:flex;align-items:center;padding:0 8px;font-size:.7rem;color:#fff;font-weight:600;overflow:hidden;white-space:nowrap;">${t.title}</div>
          <div style="position:absolute;top:0;left:${tl}px;width:2px;height:100%;background:#e74c3c;opacity:.4;pointer-events:none;"></div>
        </div>`;
      }).join('')}
    </div>
  </div></div>`;
}

function _pmTable(tasks) {
  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;min-width:800px;">
    <thead><tr style="background:var(--surface);border-bottom:2px solid var(--border);">
      ${['Görev','Atanan','Durum','Öncelik','Başlangıç','Bitiş','Kaydedilen'].map(h=>`<th style="padding:10px 12px;text-align:left;font-size:.78rem;color:var(--muted);font-weight:700;">${h}</th>`).join('')}
    </tr></thead>
    <tbody>
      ${tasks.map(t=>{const s=PM_STATUSES.find(st=>st.id===t.status);const pr=PM_PRIORITIES[t.priority]||['🟡'];return`<tr onclick="pmOpenDetail('${t.id}')" style="border-bottom:1px solid var(--border);cursor:pointer;" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background=''">
        <td style="padding:10px 12px;font-weight:600;color:var(--text-hi);font-size:.85rem;">${pr[0]} ${t.title}</td>
        <td style="padding:10px 12px;font-size:.78rem;color:var(--muted);">${(t.assignees||[]).join(', ')||'—'}</td>
        <td style="padding:10px 12px;"><span style="font-size:.72rem;padding:3px 8px;border-radius:20px;background:${s?.color}22;color:${s?.color};">${s?.label||t.status}</span></td>
        <td style="padding:10px 12px;font-size:.85rem;">${pr[0]} ${pr[1]}</td>
        <td style="padding:10px 12px;font-size:.78rem;color:var(--muted);">${t.start?new Date(t.start).toLocaleDateString('tr'):'—'}</td>
        <td style="padding:10px 12px;font-size:.78rem;color:${t.due&&Date.now()>t.due?'#e74c3c':'var(--muted)'};">${t.due?new Date(t.due).toLocaleDateString('tr'):'—'}</td>
        <td style="padding:10px 12px;font-size:.78rem;color:var(--muted);">${t.logged?t.logged+'dk':'—'}</td>
      </tr>`;}).join('')}
    </tbody>
  </table></div>`;
}

function _pmWorkload(tasks) {
  const byUser = {};
  tasks.forEach(t=>(t.assignees||[]).forEach(u=>{ if(!byUser[u]) byUser[u]={todo:0,inprogress:0,review:0,done:0,total:0}; byUser[u][t.status]=(byUser[u][t.status]||0)+1; byUser[u].total++; }));
  if(!Object.keys(byUser).length) return `<div style="text-align:center;color:var(--muted);padding:80px;">Atanan görev yok.</div>`;
  return `<div style="display:flex;flex-direction:column;gap:12px;">${Object.entries(byUser).map(([uid,d])=>`
    <div style="background:var(--surface);border-radius:12px;padding:16px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:.9rem;">${uid.slice(0,2).toUpperCase()}</div>
        <div><div style="font-weight:700;color:var(--text-hi);">${uid}</div><div style="font-size:.75rem;color:var(--muted);">${d.total} görev</div></div>
        <div style="margin-left:auto;display:flex;gap:10px;font-size:.75rem;">
          <span style="color:#3498db;">🔄 ${d.inprogress}</span>
          <span style="color:#9b59b6;">👀 ${d.review}</span>
          <span style="color:#2ecc71;">✅ ${d.done}</span>
        </div>
      </div>
      <div style="background:var(--bg);border-radius:6px;height:12px;overflow:hidden;display:flex;">
        <div style="width:${d.todo/d.total*100}%;background:#607d8b;"></div>
        <div style="width:${d.inprogress/d.total*100}%;background:#3498db;"></div>
        <div style="width:${d.review/d.total*100}%;background:#9b59b6;"></div>
        <div style="width:${d.done/d.total*100}%;background:#2ecc71;"></div>
      </div>
    </div>`).join('')}</div>`;
}

function _pmTimeline(tasks) {
  const sorted = [...tasks].sort((a,b)=>(a.at||0)-(b.at||0));
  return `<div style="position:relative;padding-left:32px;">
    <div style="position:absolute;left:12px;top:0;bottom:0;width:2px;background:var(--border);"></div>
    ${sorted.map(t=>{const s=PM_STATUSES.find(st=>st.id===t.status);return`<div style="position:relative;margin-bottom:16px;">
      <div style="position:absolute;left:-26px;top:12px;width:12px;height:12px;border-radius:50%;background:${s?.color||'var(--accent)'};border:2px solid var(--bg);"></div>
      <div onclick="pmOpenDetail('${t.id}')" style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;cursor:pointer;transition:border-color .15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-weight:700;color:var(--text-hi);">${PM_PRIORITIES[t.priority]?.[0]} ${t.title}</span>
          <span style="font-size:.72rem;color:var(--muted);">${t.at?new Date(t.at).toLocaleDateString('tr'):''}</span>
        </div>
        ${t.desc?`<div style="font-size:.78rem;color:var(--muted);">${t.desc.slice(0,100)}</div>`:''}
        <div style="margin-top:6px;"><span style="font-size:.72rem;padding:2px 8px;border-radius:20px;background:${s?.color}22;color:${s?.color};">${s?.label}</span></div>
      </div>
    </div>`}).join('')}
  </div>`;
}

/* ── GÖREV DETAY ── */
async function pmOpenDetail(id) {
  if(!_pmTasks[id]){await pmLoadTasks();}
  const t = _pmTasks[id]; if(!t) return;
  let m = document.getElementById('pmDetailModal');
  if(!m){m=document.createElement('div');m.id='pmDetailModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  const subs = Object.entries(t.subtasks||{});
  const comments = Object.values(t.comments||{});
  m.innerHTML = `<div class="bb-modal" style="width:720px;max-height:92vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header">
      <select onchange="pmUpdateTask('${id}',{status:this.value})" style="padding:5px 10px;background:${PM_STATUSES.find(s=>s.id===t.status)?.color}22;border:1px solid ${PM_STATUSES.find(s=>s.id===t.status)?.color};border-radius:8px;color:${PM_STATUSES.find(s=>s.id===t.status)?.color};font-weight:700;font-size:.8rem;cursor:pointer;">
        ${PM_STATUSES.map(s=>`<option value="${s.id}" ${t.status===s.id?'selected':''}>${s.label}</option>`).join('')}
      </select>
      <input value="${t.title}" onchange="pmUpdateTask('${id}',{title:this.value})" style="flex:1;background:none;border:none;font-size:1rem;font-weight:700;color:var(--text-hi);margin:0 8px;">
      <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:20px;display:flex;gap:20px;">
      <div style="flex:1;display:flex;flex-direction:column;gap:14px;">
        <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">AÇIKLAMA</label>
          <textarea onchange="pmUpdateTask('${id}',{desc:this.value})" rows="4" style="width:100%;margin-top:4px;padding:10px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.85rem;resize:vertical;">${t.desc||''}</textarea>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <label style="font-size:.78rem;color:var(--muted);font-weight:600;">ALT GÖREVLER (${Object.values(t.subtasks||{}).filter(s=>s.done).length}/${subs.length})</label>
            <button onclick="pmPromptSub('${id}')" style="padding:3px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:.75rem;color:var(--text-hi);">＋</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${subs.map(([sid,s])=>`<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--surface);border-radius:6px;cursor:pointer;">
              <input type="checkbox" ${s.done?'checked':''} onchange="pmToggleSub('${id}','${sid}').then(()=>pmOpenDetail('${id}'))" style="accent-color:var(--accent);">
              <span style="font-size:.83rem;color:var(--text-hi);text-decoration:${s.done?'line-through':'none'};opacity:${s.done?.5:1};">${s.title}</span>
            </label>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size:.78rem;color:var(--muted);font-weight:600;">YORUMLAR</label>
          <div style="max-height:180px;overflow-y:auto;margin-top:4px;display:flex;flex-direction:column;gap:6px;">
            ${comments.map(c=>`<div style="padding:8px 12px;background:var(--surface);border-radius:8px;"><div style="font-size:.72rem;color:var(--muted);margin-bottom:2px;">${c.user} · ${new Date(c.at).toLocaleString('tr')}</div><div style="font-size:.83rem;color:var(--text-hi);">${c.text}</div></div>`).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;">
            <input id="pmCommentInput" placeholder="Yorum..." style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.83rem;">
            <button onclick="pmAddComment('${id}')" style="padding:8px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.82rem;">Gönder</button>
          </div>
        </div>
      </div>
      <div style="width:220px;flex-shrink:0;display:flex;flex-direction:column;gap:12px;">
        <div style="background:var(--surface);border-radius:10px;padding:12px;">
          <div style="font-size:.75rem;color:var(--muted);font-weight:600;margin-bottom:10px;">DETAYLAR</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div><label style="font-size:.72rem;color:var(--muted);">Öncelik</label>
              <select onchange="pmUpdateTask('${id}',{priority:this.value})" style="display:block;width:100%;margin-top:2px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.8rem;">
                ${Object.entries(PM_PRIORITIES).map(([v,e])=>`<option value="${v}" ${t.priority===v?'selected':''}>${e[0]} ${e[1]}</option>`).join('')}
              </select>
            </div>
            <div><label style="font-size:.72rem;color:var(--muted);">Atananlar</label>
              <input value="${(t.assignees||[]).join(', ')}" onchange="pmUpdateTask('${id}',{assignees:this.value.split(',').map(s=>s.trim()).filter(Boolean)})" style="display:block;width:100%;margin-top:2px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.8rem;">
            </div>
            <div><label style="font-size:.72rem;color:var(--muted);">Başlangıç</label>
              <input type="date" value="${t.start?new Date(t.start).toISOString().split('T')[0]:''}" onchange="pmUpdateTask('${id}',{start:this.value?new Date(this.value).getTime():null})" style="display:block;width:100%;margin-top:2px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.8rem;">
            </div>
            <div><label style="font-size:.72rem;color:var(--muted);">Bitiş Tarihi</label>
              <input type="date" value="${t.due?new Date(t.due).toISOString().split('T')[0]:''}" onchange="pmUpdateTask('${id}',{due:this.value?new Date(this.value).getTime():null})" style="display:block;width:100%;margin-top:2px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.8rem;">
            </div>
            <div><label style="font-size:.72rem;color:var(--muted);">Etiketler</label>
              <input value="${(t.tags||[]).join(', ')}" placeholder="tag1, tag2..." onchange="pmUpdateTask('${id}',{tags:this.value.split(',').map(s=>s.trim()).filter(Boolean)})" style="display:block;width:100%;margin-top:2px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.8rem;">
            </div>
          </div>
        </div>
        <div style="background:var(--surface);border-radius:10px;padding:12px;">
          <div style="font-size:.75rem;color:var(--muted);font-weight:600;margin-bottom:8px;">ZAN TAKİBİ</div>
          <div style="font-size:.82rem;color:var(--text-hi);">Kaydedilen: <strong>${t.logged||0} dk</strong></div>
          <button onclick="pmStartTimer('${id}')" style="width:100%;margin-top:8px;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.8rem;font-weight:600;" id="pmTimerBtn_${id}">⏱️ Zamanlayıcı Başlat</button>
          <button onclick="pmStopTimer()" style="width:100%;margin-top:4px;padding:8px;background:rgba(231,76,60,.1);border:1px solid #e74c3c55;color:#e74c3c;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;">⏹️ Durdur & Kaydet</button>
        </div>
      </div>
    </div>
  </div>`;
  m.style.display = 'flex';
}
async function pmAddComment(id) {
  const inp = document.getElementById('pmCommentInput'); const text = inp?.value.trim(); if(!text) return;
  await pmR('tasks/'+id+'/comments/c_'+Date.now()).set({ user:_cName||_cu, text, at:Date.now() });
  inp.value = ''; pmOpenDetail(id);
}
function pmPromptSub(id) { const t=prompt('Alt görev başlığı:'); if(t) pmAddSubtask(id,t).then(()=>pmOpenDetail(id)); }

/* ── GÖREV OLUŞTUR ── */
function pmOpenCreate(defaultStatus) {
  let m = document.getElementById('pmCreateModal');
  if(!m){m=document.createElement('div');m.id='pmCreateModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML = `<div class="bb-modal" style="width:500px;">
    <div class="bb-modal-header"><span>＋ Yeni Görev</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:10px;">
      <input id="pmcTitle" placeholder="Görev başlığı..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.95rem;font-weight:600;">
      <textarea id="pmcDesc" rows="3" placeholder="Açıklama..." style="padding:10px 14px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;font-size:.85rem;"></textarea>
      <div style="display:flex;gap:8px;">
        <select id="pmcStatus" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          ${PM_STATUSES.map(s=>`<option value="${s.id}" ${defaultStatus===s.id?'selected':''}>${s.label}</option>`).join('')}
        </select>
        <select id="pmcPriority" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          ${Object.entries(PM_PRIORITIES).map(([v,e])=>`<option value="${v}">${e[0]} ${e[1]}</option>`).join('')}
        </select>
      </div>
      <input id="pmcAssignees" placeholder="Atananlar (virgülle ayır)..." style="padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <div style="display:flex;gap:8px;">
        <input type="date" id="pmcStart" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <input type="date" id="pmcDue" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      </div>
      <button onclick="pmSubmitCreate()" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">＋ Oluştur</button>
    </div>
  </div>`;
  m.style.display = 'flex';
  setTimeout(()=>document.getElementById('pmcTitle')?.focus(),50);
}
async function pmSubmitCreate() {
  const title = document.getElementById('pmcTitle').value.trim(); if(!title) return showToast('Başlık gerekli');
  await pmCreateTask({ title, desc:document.getElementById('pmcDesc').value, status:document.getElementById('pmcStatus').value, priority:document.getElementById('pmcPriority').value, assignees:document.getElementById('pmcAssignees').value.split(',').map(s=>s.trim()).filter(Boolean), start:document.getElementById('pmcStart').value?new Date(document.getElementById('pmcStart').value).getTime():null, due:document.getElementById('pmcDue').value?new Date(document.getElementById('pmcDue').value).getTime():null });
  document.getElementById('pmCreateModal').style.display = 'none';
  pmRenderContent(); showToast('✅ Görev oluşturuldu!');
}

/* Drag & Drop */
let _pmDragId = null;
function pmDragStart(e, id) { _pmDragId = id; e.dataTransfer.effectAllowed = 'move'; }
async function pmDrop(e, status) { e.preventDefault(); if(!_pmDragId) return; await pmUpdateTask(_pmDragId,{status}); _pmDragId=null; pmRenderContent(); }

/* ── SPRINT ── */
async function pmOpenSprints() {
  const snap = await pmR('sprints').once('value'); const sprints = snap.val()||{};
  let m = document.getElementById('pmSprintModal');
  if(!m){m=document.createElement('div');m.id='pmSprintModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML = `<div class="bb-modal" style="width:540px;max-height:84vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>🏃 Sprint Yönetimi</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;overflow-y:auto;">
      <div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;color:var(--text-hi);margin-bottom:10px;">Yeni Sprint</div>
        <input id="spName" placeholder="Sprint adı..." style="display:block;width:100%;margin-bottom:8px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="date" id="spStart" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          <input type="date" id="spEnd" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        </div>
        <button onclick="pmCreateSprint()" style="width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Sprint Oluştur</button>
      </div>
      ${Object.entries(sprints).map(([id,s])=>`<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
        <div style="flex:1;">
          <div style="font-weight:700;color:var(--text-hi);">${s.name}</div>
          <div style="font-size:.75rem;color:var(--muted);">${new Date(s.start).toLocaleDateString('tr')} — ${new Date(s.end).toLocaleDateString('tr')}</div>
          <div style="font-size:.75rem;color:${s.status==='active'?'#2ecc71':'var(--muted)'};">${s.status==='active'?'🟢 Aktif':s.status==='completed'?'✅ Tamamlandı':'⚪ Planlandı'}</div>
        </div>
        ${s.status!=='active'&&s.status!=='completed'?`<button onclick="pmActivateSprint('${id}')" style="padding:5px 10px;background:rgba(46,204,113,.15);border:1px solid rgba(46,204,113,.4);color:#2ecc71;border-radius:8px;cursor:pointer;font-size:.78rem;">▶ Başlat</button>`:''}
        ${s.status==='active'?`<button onclick="pmCompleteSprint('${id}')" style="padding:5px 10px;background:rgba(52,152,219,.15);border:1px solid rgba(52,152,219,.4);color:#3498db;border-radius:8px;cursor:pointer;font-size:.78rem;">✓ Tamamla</button>`:''}
      </div>`).join('')}
    </div>
  </div>`;
  m.style.display = 'flex';
}
async function pmCreateSprint() {
  const name=document.getElementById('spName').value.trim(); if(!name) return showToast('Sprint adı gerekli');
  await pmR('sprints/sprint_'+Date.now()).set({ name, start:new Date(document.getElementById('spStart').value).getTime(), end:new Date(document.getElementById('spEnd').value).getTime(), status:'planned', by:_cu });
  pmOpenSprints(); showToast('🏃 Sprint oluşturuldu!');
}
async function pmActivateSprint(id) { await pmR('sprints/'+id+'/status').set('active'); pmOpenSprints(); showToast('🏃 Sprint başlatıldı!'); }
async function pmCompleteSprint(id) { await pmR('sprints/'+id+'/status').set('completed'); pmOpenSprints(); showToast('✅ Sprint tamamlandı!'); }

/* ── HEDEFLER / OKR ── */
async function pmOpenGoals() {
  const snap = await pmR('goals').once('value'); const goals = snap.val()||{};
  let m = document.getElementById('pmGoalsModal');
  if(!m){m=document.createElement('div');m.id='pmGoalsModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML = `<div class="bb-modal" style="width:580px;max-height:84vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>🎯 Hedefler & OKR</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;overflow-y:auto;">
      <div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="font-weight:700;color:var(--text-hi);margin-bottom:10px;">Yeni Hedef</div>
        <input id="goalTitle" placeholder="Hedef..." style="display:block;width:100%;margin-bottom:8px;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <select id="goalType" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
            <option value="number">Sayısal</option><option value="percent">Yüzde</option><option value="currency">Para</option><option value="boolean">Evet/Hayır</option>
          </select>
          <input id="goalTarget" type="number" placeholder="Hedef değer..." style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          <input type="date" id="goalDue" style="flex:1;padding:8px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        </div>
        <button onclick="pmCreateGoal()" style="width:100%;padding:8px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">🎯 Hedef Ekle</button>
      </div>
      ${Object.entries(goals).map(([id,g])=>{const pct=g.type==='boolean'?(g.cur?100:0):Math.min(100,Math.round((g.cur||0)/g.target*100));return`<div style="background:var(--surface);border-radius:10px;padding:14px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:700;color:var(--text-hi);">${g.title}</div>
          <span style="font-size:.75rem;padding:3px 8px;border-radius:20px;background:${pct>=100?'rgba(46,204,113,.2)':pct>50?'rgba(52,152,219,.2)':'rgba(231,76,60,.2)'};color:${pct>=100?'#2ecc71':pct>50?'#3498db':'#e74c3c'};">${pct}%</span>
        </div>
        <div style="background:var(--bg);border-radius:6px;height:10px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:${pct}%;background:${pct>=100?'#2ecc71':pct>50?'#3498db':'#e74c3c'};border-radius:6px;transition:width .4s;"></div></div>
        <div style="display:flex;align-items:center;gap:8px;"><input type="number" value="${g.cur||0}" onchange="pmUpdateGoal('${id}',parseFloat(this.value))" style="width:80px;padding:5px 8px;background:var(--input);border:1px solid var(--border);border-radius:6px;color:var(--text-hi);font-size:.82rem;"><span style="font-size:.78rem;color:var(--muted);">/ ${g.target}${g.type==='percent'?'%':g.type==='currency'?' ₺':''}</span>${g.due?`<span style="font-size:.72rem;color:var(--muted);margin-left:auto;">📅 ${new Date(g.due).toLocaleDateString('tr')}</span>`:''}</div>
      </div>`;}).join('')}
    </div>
  </div>`;
  m.style.display = 'flex';
}
async function pmCreateGoal() {
  const title=document.getElementById('goalTitle').value.trim(); if(!title) return showToast('Başlık gerekli');
  await pmR('goals/goal_'+Date.now()).set({ title, type:document.getElementById('goalType').value, target:parseFloat(document.getElementById('goalTarget').value)||100, cur:0, due:document.getElementById('goalDue').value?new Date(document.getElementById('goalDue').value).getTime():null, by:_cu });
  pmOpenGoals(); showToast('🎯 Hedef eklendi!');
}
async function pmUpdateGoal(id, cur) { await pmR('goals/'+id+'/cur').set(cur); }

window.openProjectManager = openProjectManager;
window.pmSwitchView = pmSwitchView;
window.pmRenderContent = pmRenderContent;
window.pmOpenCreate = pmOpenCreate;
window.pmSubmitCreate = pmSubmitCreate;
window.pmOpenDetail = pmOpenDetail;
window.pmAddComment = pmAddComment;
window.pmPromptSub = pmPromptSub;
window.pmToggleSub = pmToggleSub;
window.pmUpdateTask = pmUpdateTask;
window.pmDeleteTask = pmDeleteTask;
window.pmDragStart = pmDragStart;
window.pmDrop = pmDrop;
window.pmStartTimer = pmStartTimer;
window.pmStopTimer = pmStopTimer;
window.pmOpenSprints = pmOpenSprints;
window.pmCreateSprint = pmCreateSprint;
window.pmActivateSprint = pmActivateSprint;
window.pmCompleteSprint = pmCompleteSprint;
window.pmOpenGoals = pmOpenGoals;
window.pmCreateGoal = pmCreateGoal;
window.pmUpdateGoal = pmUpdateGoal;
