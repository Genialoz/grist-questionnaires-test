// Accès exclusivement à ESPACES_STRUCTURES, filtré par ACL sur user.LinkKey.Portail.
// Aucune lecture de CAMPAGNES, REPONSES, ESPACES_MEMBRES ou liens de saisie.
import {lirePublicationSuivi} from '../concepteur/portail-publication.mjs';
import {ETATS, filtrerStructures, calculerPilotage} from './portail-pilotage.mjs';
import {genererExcelPortail,nomFichierExcel} from './portail-excel.mjs';
const message=document.querySelector('#message'),contenu=document.querySelector('#contenu');
function text(parent,tag,content,className=''){const node=document.createElement(tag);node.textContent=String(content);if(className)node.className=className;parent.appendChild(node);return node;}
function fail(code='ACCES_REFUSE'){
  const diagnostics={
    CLE_INVALIDE:'Le paramètre d’accès est mal formé.',
    API_ABSENTE:'API Grist indisponible dans le widget. Vérifier l’URL et le chargement du script Grist.',
    TABLE_ILLISIBLE:'La table associée au widget est inaccessible. Vérifier « Lire la table », la liaison avec ESPACES_STRUCTURES et les ACL.',
    AUCUNE_LIGNE:'Aucun espace accessible : contrôler les ACL de ESPACES_STRUCTURES, le paramètre Portail_ et l’accès invité au document.',
    PLUSIEURS_LIGNES:'Plusieurs espaces sont accessibles. Par sécurité, affichage refusé : vérifier le filtrage ACL par jeton.',
    COLONNES_ABSENTES:'Colonnes techniques manquantes dans la table liée au widget : Jeton_portail, Suivi_public_JSON ou Actif.',
    NON_PUBLIE:'Espace visible mais non publié ou inactif : contrôler Actif et Suivi_public_JSON.',
    PUBLICATION_INVALIDE:'Le JSON publié est absent ou illisible. Refaire « Publier le suivi (TEST) ». ',
    ACCES_REFUSE:'Espace introuvable ou accès non autorisé. Vérifiez votre lien.'
  };
  message.textContent=`${diagnostics[code]||diagnostics.ACCES_REFUSE} [TEST : ${code}]`;
  message.classList.add('erreur');contenu.hidden=true;
}
async function init(){
  // Grist ne transmet pas obligatoirement les paramètres de l'URL de son document
  // à l'iframe. Les ACL du serveur sont l'autorité : elles doivent renvoyer
  // EXACTEMENT une ligne publiée. En cas de zéro ou plusieurs lignes : refus fermé.
  const optionalIframeToken=new URLSearchParams(window.location.search).get('Portail_')||'';
  if(optionalIframeToken && !/^ESP_[0-9a-f]{64}$/.test(optionalIframeToken)){fail('CLE_INVALIDE');return;}
  if(!window.grist?.docApi?.fetchSelectedTable){fail('API_ABSENTE');return;}
  try{
    grist.ready({requiredAccess:'read table'});
    // Ne lire que la table associée au widget : autorisation minimale « Lire la table ».
    // fetchTable('ESPACES_STRUCTURES') exigerait un accès complet, à proscrire ici.
    let table;
    try { table=await grist.docApi.fetchSelectedTable(); } catch(e) { console.error('Portail TEST : table inaccessible',e);fail('TABLE_ILLISIBLE');return; }
    if(!table || !Array.isArray(table.id)) {fail('TABLE_ILLISIBLE');return;}
    if(!Array.isArray(table.Jeton_portail) || !Array.isArray(table.Suivi_public_JSON) || !Array.isArray(table.Actif)) {fail('COLONNES_ABSENTES');return;}
    // Le filtrage local n'est qu'une seconde sécurité. Les ACL DOIVENT limiter les enregistrements renvoyés.
    const ids=table.id||[];const allowed=ids.map((id,i)=>({id,token:String(table.Jeton_portail?.[i]||''),active:table.Actif?.[i],data:table.Suivi_public_JSON?.[i]}))
      .filter(x=>/^ESP_[0-9a-f]{64}$/.test(x.token) && (!optionalIframeToken || x.token===optionalIframeToken) && x.active!==false && x.active!==0 && x.data);
    if(ids.length!==1 || allowed.length!==1){
      if(ids.length===0)fail('AUCUNE_LIGNE');
      else if(ids.length>1)fail('PLUSIEURS_LIGNES');
      else fail('NON_PUBLIE');
      return;
    }
    let data;try {data=lirePublicationSuivi(allowed[0].data);}catch(e){console.error('Portail TEST : publication illisible',e);fail('PUBLICATION_INVALIDE');return;}
    document.querySelector('h1').textContent=data.nom;
    document.querySelector('#campagne').textContent=data.campagne;
    const pilotage=calculerPilotage(data);
    const cards=document.querySelector('#indicateurs');cards.replaceChildren();
    for(const [label,value] of [['Structures',pilotage.total],['Pas commencé',pilotage.nonCommence],['En cours',pilotage.enCours],['Complété',pilotage.complete],['Réponses',pilotage.reponses],['Terminées',`${pilotage.pctTerminees} %`]]){
      const card=text(cards,'div','','indicateur');text(card,'strong',value);text(card,'span',label);
    }
    document.querySelector('#pct-demarrage').textContent=`${pilotage.pctDemarrees} %`;
    document.querySelector('#barre-demarrage').style.width=`${pilotage.pctDemarrees}%`;
    const tbody=document.querySelector('#lignes');
    let lignesAffichees=[];
    function afficher(){
      try{lignesAffichees=filtrerStructures(data.structures,{recherche:document.querySelector('#recherche').value,etat:document.querySelector('#etat').value,ordre:document.querySelector('#tri').value});}
      catch(e){console.error('Portail : filtre invalide',e);return;}
      tbody.replaceChildren();
      for(const row of lignesAffichees){const tr=text(tbody,'tr','');text(tr,'td',row.structure);const etatCell=text(tr,'td',ETATS[row.etat]);etatCell.className=`etat ${row.etat}`;text(tr,'td',row.reponses);
        const cell=text(tr,'td','');
        if(row.lienQuestionnaire){const a=document.createElement('a');a.textContent='Ouvrir le questionnaire';a.href=row.lienQuestionnaire;a.target='_blank';a.rel='noopener noreferrer';cell.appendChild(a);}
        else{text(cell,'span','Accès non activé');}
      }
      document.querySelector('#compteur').textContent=`${lignesAffichees.length} structure(s) affichée(s) sur ${data.structures.length}`;
    }
    for(const id of ['recherche','etat','tri'])document.querySelector(`#${id}`).addEventListener(id==='recherche'?'input':'change',afficher);
    document.querySelector('#export-excel').addEventListener('click',()=>{
      try{
        const fichier=genererExcelPortail(data,lignesAffichees);
        const url=URL.createObjectURL(fichier),a=document.createElement('a');a.href=url;a.download=nomFichierExcel(data);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      }catch(e){console.error('Export Excel refusé',e);message.textContent='Impossible de générer le fichier Excel : '+e.message;}
    });
    afficher();
    document.querySelector('#actualisation').textContent=`Suivi actualisé le ${new Date(data.datePublication).toLocaleString('fr-FR')}. Actualisation manuelle depuis le Concepteur.`;
    message.textContent='Accès autorisé — suivi publié';contenu.hidden=false;
  }catch(e){console.error('Portail TEST : erreur inattendue',e);fail();}
}
init();
