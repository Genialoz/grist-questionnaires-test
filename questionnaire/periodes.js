// V2.1 TEST : rattachement non destructif des nouvelles fiches aux périodes.
// Les périodes doivent être ouvertes pour autoriser les nouvelles fiches.
const text = v => String(v??"");
const escapeHtml = v => text(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rows = raw => (raw?.id??[]).map((id,i)=>Object.fromEntries([["id",id],...Object.entries(raw).filter(([k])=>k!=="id").map(([k,values])=>[k,values[i]])]));
const code = v => Array.isArray(v)?String(v[1]??""):text(v);
const norm = v => text(v).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export async function readPeriodConfiguration(api,definition){
  const questionnaireRef=code(definition?.version?.Questionnaire_Code);
  if(!questionnaireRef)return null;
  try {
    // Questionnaire_Code is a Grist Ref in VERSIONS_QUESTIONNAIRES (numeric row id),
    // while PERIODES_QUESTIONNAIRE.Questionnaire_Code stores the business code.
    const [periodTable,elementTable,questionnaireTable]=await Promise.all([
      api.fetchTable("PERIODES_QUESTIONNAIRE"),
      api.fetchTable("ELEMENTS_REPONSE"),
      api.fetchTable("QUESTIONNAIRES")
    ]);
    if(!Object.prototype.hasOwnProperty.call(elementTable,"Periode_Code"))return {enabled:false,reason:"La colonne Texte ELEMENTS_REPONSE.Periode_Code est nécessaire pour activer le rattachement."};
    const questionnaire=rows(questionnaireTable).find(q=>text(q.id)===questionnaireRef||code(q.Questionnaire_Code)===questionnaireRef);
    if(!questionnaire)return {enabled:false,reason:"Le questionnaire associé à cette version est introuvable dans QUESTIONNAIRES."};
    const businessCode=code(questionnaire.Questionnaire_Code);
    const periods=rows(periodTable).filter(p=>code(p.Questionnaire_Code)===businessCode || code(p.Questionnaire_Code)===text(questionnaire.id))
      .sort((a,b)=>text(a.Date_debut).localeCompare(text(b.Date_debut)));
    if(!periods.length)return null;
    const selectable=periods.filter(p=>norm(p.Statut)==="ouverte");
    const today=new Date().toISOString().slice(0,10);
    const defaultPeriod=selectable.find(p=>text(p.Date_debut)<=today&&text(p.Date_fin)>=today)?.Periode_Code ?? selectable.at(-1)?.Periode_Code ?? "";
    return {enabled:true,periods,selectable,defaultPeriod:text(defaultPeriod)};
  }catch(err){
    console.warn("Périodes : lecture indisponible",err);
    return {enabled:false,reason:`Impossible de charger les périodes : ${err?.message??err}`};
  }
}
export function periodLabel(config,codeValue){
  if(!codeValue)return "Sans période (historique)";
  return text(config?.periods?.find(p=>text(p.Periode_Code)===text(codeValue))?.Libelle||codeValue);
}
export function periodSelectionHtml(config,selected){
 if(!config)return "";
 if(!config.enabled)return `<section class="fiche-period-selector"><p class="help">${escapeHtml(config.reason||"Configuration des périodes indisponible.")}</p></section>`;
 const opts=config.periods.map(p=>`<option value="${escapeHtml(p.Periode_Code)}"${text(p.Periode_Code)===text(selected)?" selected":""}>${escapeHtml(p.Libelle)}${norm(p.Statut)==="cloturee"?" — archive":norm(p.Statut)==="prevue"?" — à venir":""}</option>`).join("");
 return `<section class="fiche-period-selector"><label for="respondent-period">Période à consulter / renseigner</label><select id="respondent-period" data-period-select ${config.periods.length?"":"disabled"}><option value="">${config.periods.length?"Choisir une période":"Aucune période disponible"}</option>${opts}<option value="__historique__"${selected==="__historique__"?" selected":""}>Sans période (historique)</option></select><p class="help">Les périodes clôturées sont consultables en lecture seule. Les anciennes fiches restent dans « Sans période ».</p></section>`;
}
export function periodForNewFiche(config,selected,parentElementId,elements=[]){
 if(!config?.enabled)return "";
 if(parentElementId){const parent=elements.find(el=>String(el.id)===String(parentElementId));if(!parent)throw Error("Fiche parente introuvable pour le rattachement à la période.");return text(parent.Periode_Code||"");}
 const p=config.selectable.find(p=>text(p.Periode_Code)===text(selected));
 if(!p)throw Error("Sélectionnez une période ouverte avant d'ajouter une nouvelle fiche.");
 return text(p.Periode_Code);
}

// La protection est basée sur la période réelle de la fiche, jamais sur la seule sélection à l’écran.
export function periodEditable(config, periodCode) {
 if (!config?.enabled) return true;
 if (!periodCode) return false; // historique : ne pas modifier sans migration explicite
 const p=config.periods.find(x=>text(x.Periode_Code)===text(periodCode));
 if (!p || norm(p.Statut)!=="ouverte") return false;
 const today=new Date().toISOString().slice(0,10);
 const date=v=>{if(typeof v==="number"&&Number.isFinite(v))return new Date(v*1000).toISOString().slice(0,10);return text(v).slice(0,10)};
 const open=date(p.Date_ouverture),close=date(p.Date_cloture);
 return (!open || today>=open)&&(!close || today<=close);
}
export function periodMatches(config, selected, fiche){
 if(!config?.enabled)return true;
 const codeValue=text(fiche?.periodeCode);
 return selected==="__historique__"?!codeValue:codeValue===text(selected);
}
