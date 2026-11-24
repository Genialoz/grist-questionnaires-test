/* SIGMA MVP RC/EC 2.5.0 TEST — logique de préparation interne CR, aucune émission externe */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.SigmaCRPartagesCore=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TABLES=Object.freeze({cr:'SIGMA_V2_COMPTES_RENDUS_TEST',preps:'SIGMA_V2_CR_PARTAGES_TEST',events:'SIGMA_V2_CR_PARTAGES_REVOCATIONS_TEST'});
function rows(d){if(Array.isArray(d))return d;if(!d||!Array.isArray(d.id))throw Error('Réponse Grist invalide');return d.id.map((id,i)=>Object.fromEntries([['id',id],...Object.entries(d).filter(([k,v])=>k!=='id'&&Array.isArray(v)).map(([k,v])=>[k,v[i]])]));}
const validId=x=>Number.isSafeInteger(Number(x))&&Number(x)>0;
function cleanEmail(v){const s=String(v||'').trim().toLowerCase();if(s.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error('Adresse invalide');return s;}
function expiration(v,now=new Date()){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))throw Error('Date obligatoire');const d=new Date(v+'T00:00:00Z');if(!Number.isFinite(d.valueOf())||d.toISOString().slice(0,10)!==v)throw Error('Date invalide');if(v<=now.toISOString().slice(0,10))throw Error('Date d’expiration future requise');return Math.floor(d.valueOf()/1000);}
function isRevoked(p,events){return (events||[]).some(e=>Number(e.Preparation)===Number(p.id));}
function state(p,events,now=new Date()){if(isRevoked(p,events))return 'Révoqué';const n=Number(p.Date_Expiration);if(!Number.isFinite(n)||n<=0||n*1000+86400000<=now.getTime())return 'Expiré';return 'Préparé — aucun lien externe';}
function prepare({crId,recipient,date},crs,preps,events,now=new Date()){
if(!validId(crId))throw Error('Compte rendu invalide');const cr=(crs||[]).find(c=>Number(c.id)===Number(crId));if(!cr)throw Error('Compte rendu inaccessible');if(cr.Etat!=='Brouillon'||cr.EC_Habilite_ACL!==true)throw Error('Compte rendu sans habilitation valide ou non disponible');
const dest=cleanEmail(recipient);const ts=expiration(date,now);if((preps||[]).some(p=>Number(p.Compte_Rendu)===Number(crId)&&String(p.Destinataire_Email||'').toLowerCase()===dest&&state(p,events,now)==='Préparé — aucun lien externe'))throw Error('Préparation active déjà présente pour cette version et ce destinataire');
return {Compte_Rendu:Number(crId),Destinataire_Email:dest,Date_Expiration:ts,Action:'Preparation'};}
function revoke(id,preps,events){if(!validId(id))throw Error('Préparation invalide');const p=(preps||[]).find(p=>Number(p.id)===Number(id));if(!p)throw Error('Préparation non accessible');if(isRevoked(p,events))throw Error('Déjà révoqué');if(p.EC_Habilite_ACL!==true)throw Error('Habilitation non valide');return {Preparation:Number(id),Action:'Revocation'};}
return {TABLES,rows,cleanEmail,expiration,state,prepare,revoke};});
