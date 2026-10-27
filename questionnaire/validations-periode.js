// V3.4 TEST : statut propre à une réponse et à une période.
const text=v=>String(v??"");
const rows=raw=>(raw?.id??[]).map((id,i)=>Object.fromEntries([["id",id],...Object.entries(raw).filter(([k])=>k!=="id").map(([k,v])=>[k,v[i]])]));
const norm=v=>text(v).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export async function readPeriodValidations(api){
 const raw=await api.fetchTable("VALIDATIONS_PERIODE");
 for(const field of ["Validation_Code","Reponse_Code","Periode_Code","Statut","Date_validation","Date_reouverture"])
   if(!Object.prototype.hasOwnProperty.call(raw,field))throw Error(`Colonne manquante : VALIDATIONS_PERIODE.${field}`);
 return rows(raw);
}
export function periodValidationRow(rows,responseCode,periodCode){
 if(!responseCode||!periodCode)return null;
 const matches=(rows??[]).filter(r=>text(r.Reponse_Code)===text(responseCode)&&text(r.Periode_Code)===text(periodCode));
 // Ne pas arbitrer silencieusement les doublons.
 if(matches.length>1)throw Error("Plusieurs validations existent pour cette réponse et cette période. Vérifiez VALIDATIONS_PERIODE.");
 return matches[0]||null;
}
export function periodValidationStatus(rows,responseCode,periodCode){return text(periodValidationRow(rows,responseCode,periodCode)?.Statut);}
export function canValidatePeriod(config,selected){
 return Boolean(config?.enabled && selected && !selected.startsWith("__") && config.periods?.some(p=>text(p.Periode_Code)===text(selected)&&norm(p.Statut)==="ouverte"));
}
