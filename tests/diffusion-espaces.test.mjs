import test from 'node:test';
import assert from 'node:assert/strict';
import {verifierDiffusion} from '../concepteur/diffusion-regles.mjs';
const liens=[{id:11},{id:12},{id:13}];
const espaces=[{id:1}];
test('les liens sans espace restent diffusables directement',()=>{
 const data=verifierDiffusion({liens,espaces,membres:[{Espace_Id:1,Campagne_Lien_Id:11}]});
 assert.deepEqual(data.directs.map(x=>x.id),[12,13]);
 assert.equal(data.attribution.get('11'),'1');
});
test('refuse les doublons de rattachement même dans le même espace',()=>{
 assert.throws(()=>verifierDiffusion({liens,espaces,membres:[{Espace_Id:1,Campagne_Lien_Id:11},{Espace_Id:1,Campagne_Lien_Id:11}]}),/plusieurs fois/);
});
test('refuse un lien étranger à la campagne',()=>{
 assert.throws(()=>verifierDiffusion({liens,espaces,membres:[{Espace_Id:1,Campagne_Lien_Id:999}]}),/absent/);
});
test('refuse un espace supprimé',()=>{
 assert.throws(()=>verifierDiffusion({liens,espaces,membres:[{Espace_Id:9,Campagne_Lien_Id:11}]}),/inconnu/);
});
