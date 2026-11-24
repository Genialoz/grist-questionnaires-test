// Accès exclusivement à ESPACES_STRUCTURES, filtré par ACL sur user.LinkKey.Portail.
// Aucune lecture de CAMPAGNES, REPONSES, ESPACES_MEMBRES ou liens de saisie.
import {lirePublicationSuivi} from '../concepteur/portail-publication.mjs';
const message=document.querySelector('#message'),contenu=document.querySelector('#contenu');
function text(parent,tag,content,className=''){const node=document.createElement(tag);node.textContent=String(content);if(className)node.className=className;parent.appendChild(node);return node;}
function fail(){message.textContent="Espace introuvable ou accès non autorisé. Vérifiez votre lien, ou demandez un nouvel accès au responsable de l'enquête.";message.classList.add('erreur');contenu.hidden=true;}
async function init(){
  // Grist ne transmet pas obligatoirement les paramètres de l'URL de son document
  // à l'iframe. Les ACL du serveur sont l'autorité : elles doivent renvoyer
  // EXACTEMENT une ligne publiée. En cas de zéro ou plusieurs lignes : refus fermé.
  const optionalIframeToken=new URLSearchParams(window.location.search).get('Portail_')||'';
  if(optionalIframeToken && !/^ESP_[0-9a-f]{64}$/.test(optionalIframeToken)){fail();return;}
  if(!window.grist?.docApi?.fetchSelectedTable){fail();return;}
  try{
    grist.ready({requiredAccess:'read table'});
    // Ne lire que la table associée au widget : autorisation minimale « Lire la table ».
    // fetchTable('ESPACES_STRUCTURES') exigerait un accès complet, à proscrire ici.
    const table=await grist.docApi.fetchSelectedTable();
    // Le filtrage local n'est qu'une seconde sécurité. Les ACL DOIVENT limiter les enregistrements renvoyés.
    const ids=table.id||[];const allowed=ids.map((id,i)=>({id,token:String(table.Jeton_portail?.[i]||''),active:table.Actif?.[i],data:table.Suivi_public_JSON?.[i]}))
      .filter(x=>/^ESP_[0-9a-f]{64}$/.test(x.token) && (!optionalIframeToken || x.token===optionalIframeToken) && x.active!==false && x.active!==0 && x.data);
    if(ids.length!==1 || allowed.length!==1){fail();return;}
    const data=lirePublicationSuivi(allowed[0].data);
    document.querySelector('h1').textContent=data.nom;
    document.querySelector('#campagne').textContent=data.campagne;
    const cards=document.querySelector('#indicateurs');cards.replaceChildren();
    for(const [label,value] of [['Structures',data.totaux.total],['Pas commencé',data.totaux.nonCommence],['En cours',data.totaux.enCours],['Complété',data.totaux.complete]]){
      const card=text(cards,'div','','indicateur');text(card,'strong',value);text(card,'span',label);
    }
    const tbody=document.querySelector('#lignes');tbody.replaceChildren();
    for(const row of data.structures){const tr=text(tbody,'tr','');text(tr,'td',row.structure);text(tr,'td',({'not-started':'Pas commencé','in-progress':'En cours','completed':'Complété'})[row.etat]);text(tr,'td',row.reponses);}
    document.querySelector('#actualisation').textContent=`Suivi actualisé le ${new Date(data.datePublication).toLocaleString('fr-FR')}. Actualisation manuelle depuis le Concepteur.`;
    message.textContent='Accès autorisé — suivi publié';contenu.hidden=false;
  }catch{fail();}
}
init();
