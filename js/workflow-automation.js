/* ═══════════════════════════════════════════════════════════════
   WORKFLOW BUILDER · OTOMASYON · WEBHOOK · ZAMANLAMA
   workflow-automation.js — Slack + Mattermost + ClickUp
═══════════════════════════════════════════════════════════════ */

const WF_TRIGGERS = [
  {id:'message_sent',label:'📨 Mesaj gönderildiğinde',icon:'📨'},
  {id:'user_joined',label:'👤 Kullanıcı katıldığında',icon:'👤'},
  {id:'reaction_added',label:'😀 Reaksiyon eklendiğinde',icon:'😀'},
  {id:'mention',label:'@ Bahsedildiğinde',icon:'@'},
  {id:'keyword',label:'🔑 Anahtar kelime algılandığında',icon:'🔑'},
  {id:'schedule',label:'⏰ Zamanlı tetikleyici',icon:'⏰'},
  {id:'form_submitted',label:'📋 Form gönderildiğinde',icon:'📋'},
  {id:'task_created',label:'✅ Görev oluşturulduğunda',icon:'✅'},
  {id:'task_completed',label:'🏁 Görev tamamlandığında',icon:'🏁'},
  {id:'approval_responded',label:'🤝 Onay yanıtlandığında',icon:'🤝'},
];
const WF_ACTIONS = [
  {id:'send_message',label:'💬 Mesaj gönder',icon:'💬',fields:['channel','message']},
  {id:'send_dm',label:'📩 DM gönder',icon:'📩',fields:['user','message']},
  {id:'create_task',label:'📋 Görev oluştur',icon:'📋',fields:['title','assignee']},
  {id:'notify_user',label:'🔔 Bildirim gönder',icon:'🔔',fields:['user','message']},
  {id:'call_webhook',label:'🌐 Webhook çağır',icon:'🌐',fields:['url']},
  {id:'set_status',label:'🟢 Durum ayarla',icon:'🟢',fields:['emoji','text']},
  {id:'add_reaction',label:'😀 Reaksiyon ekle',icon:'😀',fields:['emoji']},
  {id:'wait',label:'⏳ Bekle',icon:'⏳',fields:['minutes']},
  {id:'create_channel',label:'＃ Kanal oluştur',icon:'＃',fields:['name']},
  {id:'send_form',label:'📋 Form paylaş',icon:'📋',fields:['formId','channel']},
];

let _wfCurrent = {name:'Yeni Workflow',trigger:{},steps:[],enabled:true};
let _workflows = {};

function wfR(p){return dbRef('workflows/'+(_currentServer||'main')+(p?'/'+p:''));}

/* ── WORKFLOW BUILDER ── */
function openWorkflowBuilder(editId) {
  if(editId&&_workflows[editId]) _wfCurrent = JSON.parse(JSON.stringify(_workflows[editId]));
  else _wfCurrent = {name:'Yeni Workflow',trigger:{},steps:[],enabled:true};
  let m = document.getElementById('wfBuilderModal');
  if(!m){m=document.createElement('div');m.id='wfBuilderModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.style.display='flex'; _renderWFB(m);
}
function _renderWFB(m) {
  m.innerHTML = `<div class="bb-modal" style="width:740px;max-height:90vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header">
      <input value="${_wfCurrent.name}" onchange="_wfCurrent.name=this.value" style="background:none;border:none;font-size:1rem;font-weight:700;color:var(--text-hi);flex:1;">
      <div style="display:flex;gap:8px;">
        <button onclick="saveWorkflow()" style="padding:6px 16px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">💾 Kaydet</button>
        <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
      </div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;">
      <!-- Tetikleyici -->
      <div style="background:var(--surface);border-radius:12px;padding:16px;border-left:4px solid #3498db;">
        <div style="font-size:.78rem;color:#3498db;font-weight:700;margin-bottom:10px;">⚡ TETİKLEYİCİ</div>
        ${_wfCurrent.trigger.id
          ? `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg);border-radius:8px;">
              <span style="font-size:1.2rem;">${WF_TRIGGERS.find(t=>t.id===_wfCurrent.trigger.id)?.icon}</span>
              <span style="font-weight:600;color:var(--text-hi);">${WF_TRIGGERS.find(t=>t.id===_wfCurrent.trigger.id)?.label}</span>
              <button onclick="_wfCurrent.trigger={};const m=document.getElementById('wfBuilderModal');_renderWFB(m)" style="margin-left:auto;background:none;border:none;color:var(--muted);cursor:pointer;">✕</button>
            </div>`
          : `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">
              ${WF_TRIGGERS.map(t=>`<button onclick="_wfCurrent.trigger={id:'${t.id}'};const m=document.getElementById('wfBuilderModal');_renderWFB(m)" style="padding:9px 12px;background:var(--bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;color:var(--text-hi);font-size:.8rem;transition:border-color .15s;" onmouseover="this.style.borderColor='#3498db'" onmouseout="this.style.borderColor='var(--border)'">${t.icon} ${t.label}</button>`).join('')}
            </div>`}
      </div>
      <!-- Adımlar -->
      ${_wfCurrent.steps.map((step,i)=>`
        <div style="background:var(--surface);border-radius:12px;padding:14px;border-left:4px solid var(--accent);position:relative;">
          <div style="font-size:.78rem;color:var(--accent);font-weight:700;margin-bottom:10px;">ADIM ${i+1}: ${WF_ACTIONS.find(a=>a.id===step.id)?.label||'Eylem'}</div>
          ${(WF_ACTIONS.find(a=>a.id===step.id)?.fields||[]).map(f=>`<div style="margin-bottom:8px;"><label style="font-size:.75rem;color:var(--muted);font-weight:600;">${f.toUpperCase()}</label><input value="${step.config?.[f]||''}" oninput="_wfCurrent.steps[${i}].config=_wfCurrent.steps[${i}].config||{};_wfCurrent.steps[${i}].config['${f}']=this.value" placeholder="${f}..." style="display:block;width:100%;margin-top:3px;padding:7px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);font-size:.83rem;"></div>`).join('')}
          <button onclick="_wfCurrent.steps.splice(${i},1);const m=document.getElementById('wfBuilderModal');_renderWFB(m)" style="position:absolute;top:12px;right:12px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;">✕</button>
        </div>`).join('')}
      <!-- Eylem Ekle -->
      <div style="background:var(--surface);border-radius:12px;padding:14px;border:2px dashed var(--border);">
        <div style="font-size:.78rem;color:var(--muted);font-weight:700;margin-bottom:10px;">＋ EYLEM EKLE</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">
          ${WF_ACTIONS.map(a=>`<button onclick="_wfCurrent.steps.push({id:'${a.id}',config:{}});const m=document.getElementById('wfBuilderModal');_renderWFB(m)" style="padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:left;color:var(--text-hi);font-size:.78rem;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">${a.icon} ${a.label}</button>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}
async function saveWorkflow() {
  if(!_wfCurrent.trigger.id) return showToast('Tetikleyici seçin');
  if(!_wfCurrent.steps.length) return showToast('En az bir eylem ekleyin');
  const id = _wfCurrent.id || 'wf_'+Date.now();
  _wfCurrent.id = id; _wfCurrent.by = _cu; _wfCurrent.upd = Date.now();
  await wfR(id).set(_wfCurrent); _workflows[id] = _wfCurrent;
  document.getElementById('wfBuilderModal').style.display='none';
  showToast('⚡ Workflow kaydedildi!');
}
async function openWorkflowsManager() {
  const snap = await wfR().once('value'); _workflows = snap.val()||{};
  let m = document.getElementById('wfManagerModal');
  if(!m){m=document.createElement('div');m.id='wfManagerModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML = `<div class="bb-modal" style="width:640px;max-height:84vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>⚡ Workflow'lar</span>
      <div style="display:flex;gap:8px;">
        <button onclick="openWorkflowBuilder()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">＋ Yeni</button>
        <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
      </div>
    </div>
    <div style="flex:1;overflow-y:auto;padding:16px;">
      ${Object.values(_workflows).length
        ? Object.values(_workflows).map(wf=>`<div style="background:var(--surface);border-radius:12px;padding:14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
            <div style="width:36px;height:36px;border-radius:10px;background:${wf.enabled?'rgba(52,152,219,.15)':'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:1.2rem;">${WF_TRIGGERS.find(t=>t.id===wf.trigger?.id)?.icon||'⚡'}</div>
            <div style="flex:1;"><div style="font-weight:700;color:var(--text-hi);">${wf.name}</div><div style="font-size:.75rem;color:var(--muted);">${WF_TRIGGERS.find(t=>t.id===wf.trigger?.id)?.label||'?'} → ${wf.steps?.length||0} eylem</div></div>
            <div onclick="toggleWorkflow('${wf.id}')" style="width:36px;height:20px;background:${wf.enabled?'var(--accent)':'var(--border)'};border-radius:10px;position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;"><div style="position:absolute;top:2px;${wf.enabled?'right:2px':'left:2px'};width:16px;height:16px;background:#fff;border-radius:50%;transition:all .2s;"></div></div>
            <button onclick="openWorkflowBuilder('${wf.id}')" style="padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.78rem;">Düzenle</button>
            <button onclick="deleteWorkflow('${wf.id}')" style="padding:5px 10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:8px;cursor:pointer;font-size:.78rem;">Sil</button>
          </div>`).join('')
        : `<div style="text-align:center;padding:60px;color:var(--muted);"><div style="font-size:3rem;margin-bottom:12px;">⚡</div><div style="font-weight:700;">Henüz workflow yok</div><div style="font-size:.85rem;margin-top:6px;">＋ Yeni ile oluşturun</div></div>`}
    </div>
  </div>`;
  m.style.display='flex';
}
async function toggleWorkflow(id) { const r=wfR(id+'/enabled'); const s=await r.once('value'); await r.set(!s.val()); openWorkflowsManager(); }
async function deleteWorkflow(id) { await wfR(id).remove(); delete _workflows[id]; openWorkflowsManager(); }

/* ── OTOMASYON KURALLARI ── */
function openAutomationsModal() {
  dbRef('automations/'+(_currentServer||'main')).once('value', snap=>{
    const autos = snap.val()||{};
    let m=document.getElementById('automationsModal');
    if(!m){m=document.createElement('div');m.id='automationsModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
    m.innerHTML=`<div class="bb-modal" style="width:580px;max-height:84vh;display:flex;flex-direction:column;">
      <div class="bb-modal-header"><span>🤖 Otomasyon Kuralları</span>
        <div style="display:flex;gap:8px;">
          <button onclick="openCreateAutoModal()" style="padding:6px 14px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;">＋ Kural</button>
          <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px;">
        ${Object.entries(autos).map(([id,a])=>`<div style="background:var(--surface);border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.2rem;">🤖</span>
          <div style="flex:1;"><div style="font-weight:700;color:var(--text-hi);font-size:.88rem;">${a.trigger}</div><div style="font-size:.75rem;color:var(--muted);">→ ${a.action} ${a.param?'('+a.param+')':''}</div></div>
          <div onclick="toggleAuto('${id}')" style="width:36px;height:20px;background:${a.enabled!==false?'var(--accent)':'var(--border)'};border-radius:10px;position:relative;cursor:pointer;flex-shrink:0;"><div style="position:absolute;top:2px;${a.enabled!==false?'right:2px':'left:2px'};width:16px;height:16px;background:#fff;border-radius:50%;"></div></div>
          <button onclick="deleteAuto('${id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:1rem;">🗑️</button>
        </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--muted);">Otomasyon kuralı yok</div>'}
      </div>
    </div>`;
    m.style.display='flex';
  });
}
function openCreateAutoModal(){
  let m=document.getElementById('createAutoModal');
  if(!m){m=document.createElement('div');m.id='createAutoModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:460px;">
    <div class="bb-modal-header"><span>🤖 Yeni Otomasyon</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">EĞER</label>
        <select id="autoTrig" style="display:block;width:100%;margin-top:4px;padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          ${['Görev durumu değiştiğinde','Görev atandığında','Kanala mesaj geldiğinde','Bahsedildiğinde','Form gönderildiğinde'].map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">O ZAMAN</label>
        <select id="autoAct" style="display:block;width:100%;margin-top:4px;padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
          ${['Bildirim gönder','Mesaj gönder','Görevi ata','Durumu değiştir','Etiket ekle'].map(a=>`<option>${a}</option>`).join('')}
        </select>
      </div>
      <div><label style="font-size:.78rem;color:var(--muted);font-weight:600;">PARAMETRE</label>
        <input id="autoParam" placeholder="Mesaj, değer..." style="display:block;width:100%;margin-top:4px;padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      </div>
      <button onclick="createAuto()" style="padding:10px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">🤖 Oluştur</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function createAuto(){
  await dbRef('automations/'+(_currentServer||'main')+'/auto_'+Date.now()).set({ trigger:document.getElementById('autoTrig').value, action:document.getElementById('autoAct').value, param:document.getElementById('autoParam').value, enabled:true, by:_cu, at:Date.now() });
  document.getElementById('createAutoModal').style.display='none'; openAutomationsModal(); showToast('🤖 Otomasyon oluşturuldu!');
}
async function toggleAuto(id){const r=dbRef('automations/'+(_currentServer||'main')+'/'+id+'/enabled');const s=await r.once('value');await r.set(!s.val());openAutomationsModal();}
async function deleteAuto(id){await dbRef('automations/'+(_currentServer||'main')+'/'+id).remove();openAutomationsModal();}

/* ── WEBHOOK YÖNETİMİ ── */
function openWebhooksModal(){
  dbRef('webhooks/'+(_currentServer||'main')).once('value',snap=>{
    const whs=snap.val()||{};
    let m=document.getElementById('webhooksModal');
    if(!m){m=document.createElement('div');m.id='webhooksModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
    m.innerHTML=`<div class="bb-modal" style="width:680px;max-height:84vh;display:flex;flex-direction:column;">
      <div class="bb-modal-header"><span>🌐 Webhook Yönetimi</span>
        <div style="display:flex;gap:8px;">
          <button onclick="createIncomingWebhook()" style="padding:6px 12px;background:var(--accent);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:.82rem;">＋ Gelen</button>
          <button onclick="openOutgoingWHModal()" style="padding:6px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.82rem;">＋ Giden</button>
          <button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:16px;">
        <div style="font-size:.8rem;color:var(--muted);font-weight:700;margin-bottom:8px;">GELEN WEBHOOK'LAR</div>
        ${Object.entries(whs).filter(([,w])=>w.type==='incoming').map(([id,w])=>`<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;">
          <div style="font-weight:700;color:var(--text-hi);margin-bottom:4px;">${w.name}</div>
          <div style="display:flex;align-items:center;gap:8px;">
            <code style="flex:1;padding:6px 10px;background:var(--bg);border-radius:6px;font-size:.72rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${w.url}</code>
            <button onclick="navigator.clipboard.writeText('${w.url}').then(()=>showToast('URL kopyalandı!'))" style="padding:5px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:.75rem;color:var(--text-hi);white-space:nowrap;">📋 Kopyala</button>
            <button onclick="deleteWebhook('${id}')" style="padding:5px 10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:6px;cursor:pointer;font-size:.75rem;">Sil</button>
          </div>
        </div>`).join('')||'<div style="color:var(--muted);font-size:.82rem;padding:8px 0;">Gelen webhook yok</div>'}
        <div style="font-size:.8rem;color:var(--muted);font-weight:700;margin:16px 0 8px;">GİDEN WEBHOOK'LAR</div>
        ${Object.entries(whs).filter(([,w])=>w.type==='outgoing').map(([id,w])=>`<div style="background:var(--surface);border-radius:10px;padding:12px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;">
          <div><div style="font-weight:700;color:var(--text-hi);">${w.name}</div><div style="font-size:.75rem;color:var(--muted);">${w.trigger} → ${(w.url||'').slice(0,50)}...</div></div>
          <button onclick="deleteWebhook('${id}')" style="padding:5px 10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:8px;cursor:pointer;font-size:.75rem;">Sil</button>
        </div>`).join('')||'<div style="color:var(--muted);font-size:.82rem;padding:8px 0;">Giden webhook yok</div>'}
      </div>
    </div>`;
    m.style.display='flex';
  });
}
async function createIncomingWebhook(){
  const name=prompt('Webhook adı:'); if(!name) return;
  const id='wh_'+Date.now(); const token=btoa(id).replace(/[^a-z0-9]/gi,'').slice(0,24);
  const url=window.location.origin+'/webhook/'+token;
  await dbRef('webhooks/'+(_currentServer||'main')+'/'+id).set({name,url,token,type:'incoming',by:_cu,at:Date.now()});
  openWebhooksModal(); showToast('🌐 Webhook oluşturuldu!');
}
function openOutgoingWHModal(){
  let m=document.getElementById('outgoingWHModal');
  if(!m){m=document.createElement('div');m.id='outgoingWHModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:460px;">
    <div class="bb-modal-header"><span>🌐 Giden Webhook</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:10px;">
      <input id="owName" placeholder="Webhook adı..." style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <input id="owUrl" placeholder="Hedef URL (https://...)..." style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <select id="owTrig" style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
        <option value="message">Mesaj gönderildiğinde</option>
        <option value="reaction">Reaksiyon eklendiğinde</option>
        <option value="member_join">Üye katıldığında</option>
        <option value="task_created">Görev oluşturulduğunda</option>
      </select>
      <button onclick="saveOutgoingWH()" style="padding:10px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">Kaydet</button>
    </div>
  </div>`;
  m.style.display='flex';
}
async function saveOutgoingWH(){
  await dbRef('webhooks/'+(_currentServer||'main')+'/wh_'+Date.now()).set({name:document.getElementById('owName').value,url:document.getElementById('owUrl').value,trigger:document.getElementById('owTrig').value,type:'outgoing',by:_cu,at:Date.now()});
  document.getElementById('outgoingWHModal').style.display='none'; openWebhooksModal(); showToast('🌐 Giden webhook oluşturuldu!');
}
async function deleteWebhook(id){await dbRef('webhooks/'+(_currentServer||'main')+'/'+id).remove();openWebhooksModal();}

/* ── MESAJ ZAMANLAMA ── */
function openScheduleMsg(roomId){
  let m=document.getElementById('schedMsgModal');
  if(!m){m=document.createElement('div');m.id='schedMsgModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:460px;">
    <div class="bb-modal-header"><span>⏰ Mesaj Zamanla</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <textarea id="schedText" rows="4" placeholder="Mesajınızı yazın..." style="padding:10px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);resize:vertical;font-size:.9rem;"></textarea>
      <input type="datetime-local" id="schedTime" style="padding:9px 12px;background:var(--input);border:1px solid var(--border);border-radius:8px;color:var(--text-hi);">
      <div style="display:flex;gap:6px;">
        ${[[30,'30 dk'],[60,'1 saat'],[1440,'Yarın']].map(([m,l])=>`<button onclick="quickSched(${m})" style="flex:1;padding:7px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;color:var(--text-hi);font-size:.78rem;">⏰ ${l}</button>`).join('')}
      </div>
      <button onclick="scheduleMsg('${roomId}')" style="padding:12px;background:var(--accent);color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:700;">⏰ Zamanla</button>
    </div>
  </div>`;
  m.style.display='flex';
}
function quickSched(min){const d=new Date(Date.now()+min*60000);document.getElementById('schedTime').value=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
async function scheduleMsg(roomId){
  const text=document.getElementById('schedText').value.trim(); const time=document.getElementById('schedTime').value;
  if(!text||!time) return showToast('Mesaj ve zaman gerekli');
  const ts=new Date(time).getTime(); if(ts<=Date.now()) return showToast('Gelecek bir zaman seçin');
  const id='sched_'+Date.now();
  await dbRef('scheduledMsgs/'+(_currentServer||'main')+'/'+id).set({roomId,text,sendAt:ts,by:_cu,name:_cName||_cu,status:'pending'});
  document.getElementById('schedMsgModal').style.display='none';
  showToast(`⏰ ${new Date(ts).toLocaleString('tr')} için zamanlandı`);
  setTimeout(async()=>{ await dbRef('msgs/'+roomId).push({user:_cu,name:_cName||_cu,text,ts:Date.now(),scheduled:true}); await dbRef('scheduledMsgs/'+(_currentServer||'main')+'/'+id+'/status').set('sent'); }, ts-Date.now());
}

/* ── TASLAKLAR (Drafts) ── */
async function saveDraft(roomId, text){
  if(!text.trim()) return;
  await dbRef('drafts/'+(_currentServer||'main')+'/'+_cu+'/'+roomId).set({text,at:Date.now()});
  showToast('💾 Taslak kaydedildi');
}
async function loadDraft(roomId){
  const snap=await dbRef('drafts/'+(_currentServer||'main')+'/'+_cu+'/'+roomId).once('value');
  return snap.val()?.text||'';
}
async function openDrafts(){
  const snap=await dbRef('drafts/'+(_currentServer||'main')+'/'+_cu).once('value'); const drafts=snap.val()||{};
  let m=document.getElementById('draftsModal');
  if(!m){m=document.createElement('div');m.id='draftsModal';m.className='bb-modal-overlay';document.body.appendChild(m);}
  m.innerHTML=`<div class="bb-modal" style="width:540px;max-height:84vh;display:flex;flex-direction:column;">
    <div class="bb-modal-header"><span>💾 Taslaklar</span><button class="bb-modal-close" onclick="this.closest('.bb-modal-overlay').style.display='none'">✕</button></div>
    <div style="padding:16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px;">
      ${Object.entries(drafts).map(([rid,d])=>`<div style="background:var(--surface);border-radius:10px;padding:12px;">
        <div style="font-size:.75rem;color:var(--muted);margin-bottom:6px;">Oda: ${rid} · ${new Date(d.at).toLocaleString('tr')}</div>
        <div style="font-size:.85rem;color:var(--text-hi);margin-bottom:8px;">${d.text.slice(0,150)}${d.text.length>150?'...':''}</div>
        <div style="display:flex;gap:6px;">
          <button onclick="useDraft('${rid}','${d.text.replace(/'/g,"\\'")}')" style="padding:5px 10px;background:var(--accent);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.78rem;">Kullan</button>
          <button onclick="dbRef('drafts/'+(_currentServer||'main')+'/'+_cu+'/${rid}').remove().then(openDrafts)" style="padding:5px 10px;background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:#e74c3c;border-radius:6px;cursor:pointer;font-size:.78rem;">Sil</button>
        </div>
      </div>`).join('')||'<div style="text-align:center;padding:40px;color:var(--muted);">Taslak yok</div>'}
    </div>
  </div>`;
  m.style.display='flex';
}
function useDraft(roomId, text){ /* inject into message input */ const inp=document.getElementById('deskMsgInput')||document.getElementById('msgInput'); if(inp){inp.value=text;inp.focus();}document.getElementById('draftsModal').style.display='none'; }

window.openWorkflowBuilder = openWorkflowBuilder;
window.saveWorkflow = saveWorkflow;
window.openWorkflowsManager = openWorkflowsManager;
window.toggleWorkflow = toggleWorkflow;
window.deleteWorkflow = deleteWorkflow;
window.openAutomationsModal = openAutomationsModal;
window.openCreateAutoModal = openCreateAutoModal;
window.createAuto = createAuto;
window.toggleAuto = toggleAuto;
window.deleteAuto = deleteAuto;
window.openWebhooksModal = openWebhooksModal;
window.createIncomingWebhook = createIncomingWebhook;
window.openOutgoingWHModal = openOutgoingWHModal;
window.saveOutgoingWH = saveOutgoingWH;
window.deleteWebhook = deleteWebhook;
window.openScheduleMsg = openScheduleMsg;
window.quickSched = quickSched;
window.scheduleMsg = scheduleMsg;
window.saveDraft = saveDraft;
window.loadDraft = loadDraft;
window.openDrafts = openDrafts;
window.useDraft = useDraft;
