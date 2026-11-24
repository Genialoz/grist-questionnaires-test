import test from 'node:test';
import assert from 'node:assert/strict';
import {creerPublicationSuivi,lirePublicationSuivi} from '../concepteur/portail-publication.mjs';
const campagne={Valeur_personnalisation_Libelle:'A1',Jeton_acces:'JETON_A_NE_PAS_EXPORTER',id:18};
const summary={total:1,notStarted:0,inProgress:1,completed:0,items:[{campaign:campagne,member:{Peut_modifier:true,Campagne_Lien_Id:18},state:'in-progress',count:3}]};
test('publication ne contient que des totaux et libellés',()=>{
 const raw=creerPublicationSuivi(summary,'Service A','Enquête TEST');
 const data=lirePublicationSuivi(raw);
 assert.equal(data.structures[0].structure,'A1');
 assert.equal(data.structures[0].reponses,3);
 assert.equal(data.totaux.enCours,1);
 assert.equal(raw.includes('JETON_A_NE_PAS_EXPORTER'),false);
 assert.equal(raw.includes('Campagne_Lien_Id'),false);
 assert.equal(raw.includes('Peut_modifier'),false);
});
test('publication refuse un état invalide et une entrée sans rattachement',()=>{
 assert.throws(()=>creerPublicationSuivi({...summary,items:[{...summary.items[0],state:'inconnu'}]},'A','B'));
 assert.throws(()=>creerPublicationSuivi({...summary,items:[{...summary.items[0],campaign:null}]},'A','B'));
});
test('publication refuse les décomptes incohérents',()=>{
 assert.throws(()=>creerPublicationSuivi({...summary,total:2},'A','B'));
 assert.throws(()=>lirePublicationSuivi('{"version":1,"structures":[{"structure":"A1","etat":"x","reponses":2}]}'));
});
