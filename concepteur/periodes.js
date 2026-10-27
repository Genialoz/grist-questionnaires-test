// Gestion des périodes — V1 TEST. Aucun effet sur les réponses ni sur les campagnes.
const TABLE = 'PERIODES_QUESTIONNAIRE';
const COLS = ['Periode_Code','Questionnaire_Code','Libelle','Date_debut','Date_fin','Date_ouverture','Date_cloture','Statut'];
const MODE_COLUMN = 'Mode_permanent';
const ARCHIVE_COLUMN = 'Modification_archives_autorisee';
const $ = (s,root=document) => root.querySelector(s);
const e = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const code = x => Array.isArray(x)?x[1]:x;
const iso = x => /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(`${x}T12:00:00Z`)) && new Date(`${x}T12:00:00Z`).toISOString().slice(0,10)===x;
function shiftYear(date){const [y,m,d]=date.split('-').map(Number);const yy=y+1;const max=new Date(Date.UTC(yy,m,0)).getUTCDate();return `${yy}-${String(m).padStart(2,'0')}-${String(Math.min(d,max)).padStart(2,'0')}`;}
function rows(raw){const ids=raw?.id||[];return ids.map((id,i)=>({id,...Object.fromEntries(Object.entries(raw).filter(([k])=>k!=='id').map(([k,a])=>[k,a[i]]))}));}
export function initPeriodManager(getQuestionnaire){
 const dialog=$('#periods-dialog'),content=$('#periods-content'),open=$('#manage-periods');if(!dialog||!content||!open)return;
 let current=[]; let archiveColumnPresent=false; let ready=false; let modeEnabled=false; let currentQuestionnaireId=null;
 const note=(message,error=false)=>{const el=$('#periods-note');if(el){el.textContent=message;el.style.color=error?'#b91c1c':'#166534';}};
 async function fetchPeriods(){try{const raw=await grist.docApi.fetchTable(TABLE);const missing=COLS.filter(x=>!(x in raw));if(missing.length)throw new Error(`Colonnes manquantes : ${missing.join(', ')}`);archiveColumnPresent=ARCHIVE_COLUMN in raw;ready=true;return rows(raw);}catch(err){ready=false;if(/Colonnes manquantes/.test(String(err)))throw err;return null;}}
 async function loadMode(q){
  const raw=await grist.docApi.fetchTable('QUESTIONNAIRES');
  if(!(MODE_COLUMN in raw))throw new Error(`Créez d'abord la colonne Booléen QUESTIONNAIRES.${MODE_COLUMN} dans Gristionnaire TEST (sans formule).`);
  const item=rows(raw).find(r=>String(code(r.Questionnaire_Code))===String(q)||String(r.id)===String(q));
  if(!item)throw new Error('Questionnaire introuvable dans QUESTIONNAIRES.');
  currentQuestionnaireId=item.id;
  modeEnabled=item[MODE_COLUMN]===true||item[MODE_COLUMN]===1;
 }
 async function usageCount(codes){
  const raw=await grist.docApi.fetchTable('ELEMENTS_REPONSE');
  if(!('Periode_Code' in raw))throw new Error('La colonne ELEMENTS_REPONSE.Periode_Code est introuvable : vérification impossible.');
  const set=new Set(codes.map(String));
  return (raw.Periode_Code||[]).filter(v=>set.has(String(code(v)||''))).length;
 }
 async function changeMode(enabled,q){
  if(!currentQuestionnaireId)throw new Error('Questionnaire non identifié.');
  if(!enabled){
    const own=current.filter(p=>String(code(p.Questionnaire_Code))===String(q));
    const used=await usageCount(own.map(p=>p.Periode_Code));
    if(used && !confirm(`Passer au mode classique ?\n\n${used} fiche(s) ou sous-fiche(s) restent rattachées à leurs périodes. Elles seront toutes visibles ; celles des périodes clôturées resteront en lecture seule.\n\nLa validation globale sera indisponible tant que cette réponse contient des fiches périodisées, afin de protéger les archives.`))return false;
  }
  await grist.docApi.applyUserActions([['UpdateRecord','QUESTIONNAIRES',currentQuestionnaireId,{[MODE_COLUMN]:enabled}]]);
  await loadMode(q);
  return true;
 }
 function editor(row={}){return `<form id="periods-form" class="periods-editor"><input type="hidden" name="rowId" value="${e(row.id||'')}"><div class="periods-grid"><label>Libellé de la période<input name="Libelle" required maxlength="120" value="${e(row.Libelle||'')}" placeholder="Ex. 2026-2027"></label><label>Début de la période<input type="date" name="Date_debut" required value="${e(row.Date_debut||'')}"></label><label>Fin de la période<input type="date" name="Date_fin" required value="${e(row.Date_fin||'')}"></label><label>Date à partir de laquelle les répondants peuvent saisir des fiches<input type="date" name="Date_ouverture" value="${e(row.Date_ouverture||'')}"><small class="field-help" style="font-weight:400">Facultatif : si aucune date n’est indiquée, ce champ ne limite pas le début de la saisie.</small></label><label>Date limite de saisie et de modification des fiches<input type="date" name="Date_cloture" value="${e(row.Date_cloture||'')}"><small class="field-help" style="font-weight:400">Facultatif : date jusqu’à laquelle il sera possible d’ajouter ou corriger des fiches.</small></label><label>État administratif<select name="Statut">${['Prévue','Ouverte','Clôturée'].map(x=>`<option value="${x}" ${row.Statut===x?'selected':''}>${x}</option>`).join('')}</select></label></div><label style="display:flex;gap:.5rem;align-items:center;margin:1rem 0"><input type="checkbox" name="${ARCHIVE_COLUMN}" value="1" ${row[ARCHIVE_COLUMN]===true||row[ARCHIVE_COLUMN]===1?'checked':''} ${archiveColumnPresent?'':'disabled'}> Autoriser la modification des fiches archivées de cette période</label><p class="field-help">Cette autorisation s'applique aux fiches et sous-fiches existantes, en mode classique ou permanent. Elle ne permet ni de créer, ni de dupliquer, ni de supprimer des fiches archivées. ${archiveColumnPresent?'':'Ajoutez d’abord la colonne Booléen '+ARCHIVE_COLUMN+' dans PERIODES_QUESTIONNAIRE (sans formule).'}</p><p class="field-help">L'état et les dates de la période déterminent l'accès aux fiches dans le Questionnaire permanent.</p><div class="form-actions"><button type="submit" class="btn btn-primary">${row.id?'Enregistrer la période':'Créer la période'}</button><button type="button" class="secondary-btn" id="periods-cancel-edit">Annuler</button></div></form>`;}
 function list(q){const selected=current.filter(x=>String(code(x.Questionnaire_Code))===String(q));return selected.length?selected.sort((a,b)=>String(a.Date_debut).localeCompare(String(b.Date_debut))).map(p=>`<div class="period-row"><div><strong>${e(p.Libelle)}</strong><div class="hint">${e(p.Date_debut)} → ${e(p.Date_fin)} · ${e(p.Statut||'Prévue')}${p[ARCHIVE_COLUMN]?' · Archives modifiables':''}${p.Date_ouverture?' · Ouverture : '+e(p.Date_ouverture):''}${p.Date_cloture?' · Fin des modifications : '+e(p.Date_cloture):''}</div></div><div class="period-actions"><button type="button" class="secondary-btn" data-period-delete="${p.id}">Supprimer</button><button type="button" class="secondary-btn" data-period-edit="${p.id}">Modifier</button><button type="button" class="secondary-btn" data-period-next="${p.id}">Période suivante</button></div></div>`).join(''):'<p class="hint">Aucune période créée pour ce questionnaire.</p>';}
 function display(q){content.innerHTML=`<div class="editor-section"><h3>Mode de fonctionnement</h3><label for="period-mode-select">Type de questionnaire</label><select id="period-mode-select"><option value="classic" ${!modeEnabled?"selected":""}>Questionnaire classique</option><option value="permanent" ${modeEnabled?"selected":""}>Questionnaire permanent avec périodes</option></select><p class="field-help">En mode classique, toutes les fiches réapparaissent. Les archives clôturées restent en lecture seule ; les périodes et leurs rattachements sont conservés. La validation globale est protégée si des fiches périodisées existent.</p></div><p class="field-help">Configuration des périodes de « ${e(q)} ». Les périodes et le mode sont configurés par questionnaire. Aucun lien de campagne n’est modifié.</p>${archiveColumnPresent?'':'<p class="field-help" style="color:#b91c1c">Pour autoriser les modifications des archives, créez dans PERIODES_QUESTIONNAIRE la colonne Booléen Modification_archives_autorisee (sans formule). Les archives restent protégées tant que cette colonne est absente.</p>'}<div id="periods-note" role="status" aria-live="polite"></div><div class="editor-section"><h3>Périodes configurées</h3><div id="periods-list">${list(q)}</div><button type="button" class="secondary-btn" id="periods-new">+ Nouvelle période</button></div><div id="periods-editor-host"></div>`;
 const modeSelect=$('#period-mode-select');
 modeSelect.onchange=async()=>{
  const enabled=modeSelect.value==='permanent';modeSelect.disabled=true;
  try{const changed=await changeMode(enabled,q);if(!changed){modeSelect.value=modeEnabled?'permanent':'classic';return;}display(q);note(enabled?'Mode permanent activé.':'Mode classique activé.');}
  catch(err){modeSelect.value=modeEnabled?'permanent':'classic';note(err?.message||String(err),true);}
  finally{modeSelect.disabled=false;}
 };
 $('#periods-new').onclick=()=>showEditor({Statut:'Prévue'});
 content.querySelectorAll('[data-period-delete]').forEach(b=>b.onclick=async()=>{
  const p=current.find(item=>String(item.id)===b.dataset.periodDelete);if(!p)return;
  b.disabled=true;
  try{
   const used=await usageCount([p.Periode_Code]);
   if(used)throw new Error(`Suppression refusée : ${used} fiche(s) ou sous-fiche(s) utilisent « ${p.Libelle} ».`);
   if(!confirm(`Supprimer la période « ${p.Libelle} » ? Cette opération est irréversible.`))return;
   // Relire immédiatement avant suppression pour éviter d'agir sur un état périmé.
   const refreshed=await fetchPeriods();
   const still=refreshed.find(x=>String(x.id)===String(p.id)&&String(x.Periode_Code)===String(p.Periode_Code));
   if(!still)throw new Error('La période a été modifiée ou supprimée : actualisez.');
   if(await usageCount([p.Periode_Code]))throw new Error('Une fiche utilise désormais cette période : suppression annulée.');
   await grist.docApi.applyUserActions([['RemoveRecord',TABLE,p.id]]);
   current=await fetchPeriods();display(q);note('Période inutilisée supprimée.');
  }catch(err){note(err?.message||String(err),true);}finally{b.disabled=false;}
 });content.querySelectorAll('[data-period-edit]').forEach(b=>b.onclick=()=>showEditor(current.find(p=>String(p.id)===b.dataset.periodEdit)||{}));content.querySelectorAll('[data-period-next]').forEach(b=>b.onclick=()=>{const p=current.find(x=>String(x.id)===b.dataset.periodNext);if(!p)return;const start=shiftYear(p.Date_debut),end=shiftYear(p.Date_fin);showEditor({Libelle:String(p.Libelle||'').replace(/\d{4}/g,y=>String(Number(y)+1)),Date_debut:start,Date_fin:end,Statut:'Prévue'});});}
 function showEditor(row){const host=$('#periods-editor-host');host.innerHTML=editor(row);$('#periods-cancel-edit').onclick=()=>host.replaceChildren();$('#periods-form').onsubmit=async ev=>{ev.preventDefault();const form=ev.currentTarget,fd=new FormData(form),q=getQuestionnaire(),id=Number(fd.get('rowId')||0);const values=Object.fromEntries(COLS.filter(x=>x!=='Periode_Code'&&x!=='Questionnaire_Code').map(x=>[x,String(fd.get(x)||'').trim()]));if(archiveColumnPresent)values[ARCHIVE_COLUMN]=fd.has(ARCHIVE_COLUMN);if(!q){note('Sélectionnez un questionnaire.',true);return;}if(!iso(values.Date_debut)||!iso(values.Date_fin)||values.Date_debut>values.Date_fin){note('Vérifiez les dates de début et de fin.',true);return;}for(const k of ['Date_ouverture','Date_cloture'])if(values[k]&&!iso(values[k])){note(`Date invalide : ${k}`,true);return;}if(values.Date_ouverture&&values.Date_cloture&&values.Date_ouverture>values.Date_cloture){note('La date de fin des modifications précède la date d’ouverture.',true);return;}if(current.some(x=>String(code(x.Questionnaire_Code))===String(q)&&x.id!==id&&String(x.Libelle).toLocaleLowerCase()===values.Libelle.toLocaleLowerCase())){note('Une période porte déjà ce nom pour ce questionnaire.',true);return;}const action=id?['UpdateRecord',TABLE,id,values]:['AddRecord',TABLE,null,{...values,Periode_Code:`PER_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,Questionnaire_Code:q}];const btn=form.querySelector('[type="submit"]');btn.disabled=true;try{await grist.docApi.applyUserActions([action]);current=await fetchPeriods();display(q);note('Période enregistrée. Aucun questionnaire répondant n’a été modifié.');}catch(err){note(`Enregistrement impossible : ${err?.message||err}`,true);btn.disabled=false;}};}
 async function show(){const q=getQuestionnaire();if(!q){alert('Sélectionnez d’abord un questionnaire.');return;}dialog.showModal();content.textContent='Chargement des périodes…';try{const found=await fetchPeriods();if(found){current=found;await loadMode(q);display(q);return;}content.innerHTML=`<div class="editor-section"><h3>Initialisation TEST</h3><p>La table <code>${TABLE}</code> est absente. La création de cette table n’efface ni réponses ni campagnes.</p><p class="field-help">La table contiendra : ${COLS.join(', ')} (champs Texte).</p><button type="button" class="btn btn-primary" id="periods-init">Créer la table de périodes dans ce document TEST</button><p id="periods-note" role="status"></p></div>`;$('#periods-init').onclick=async ev=>{if(!confirm('Créer PERIODES_QUESTIONNAIRE dans ce document Grist ? Réservé à Gristionnaire TEST.'))return;ev.currentTarget.disabled=true;try{await grist.docApi.applyUserActions([['AddTable',TABLE,COLS.map(id=>({id,type:'Text'}))]]);current=(await fetchPeriods())||[];if(!ready)throw Error('Table non accessible après création.');display(q);note('Table de périodes initialisée.');}catch(err){note(`Initialisation impossible : ${err?.message||err}`,true);ev.currentTarget.disabled=false;}};}catch(err){content.textContent=`Impossible de lire les périodes : ${err.message||err}`;}}
 open.onclick=show;$('#close-periods').onclick=()=>dialog.close();
}
