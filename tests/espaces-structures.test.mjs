import test from 'node:test';
import assert from 'node:assert/strict';
import {verifierRattachements} from '../concepteur/espaces-regles.mjs';
const campagne=[101,102,103];
test('rattachement de plusieurs structures de la même campagne',()=>{
 assert.equal(verifierRattachements({selection:['101','103'],liensCampagne:campagne,rattachements:[],espaceId:5}),true);
});
test('structure hors campagne refusée',()=>{
 assert.throws(()=>verifierRattachements({selection:['999'],liensCampagne:campagne,rattachements:[],espaceId:5}),/campagne/);
});
test('double rattachement dans deux espaces refusé',()=>{
 assert.throws(()=>verifierRattachements({selection:['101'],liensCampagne:campagne,rattachements:[{lienId:101,espaceId:6}],espaceId:5}),/déjà rattachée/);
});
test('mise à jour du rattachement existant autorisée',()=>{
 assert.equal(verifierRattachements({selection:['101'],liensCampagne:campagne,rattachements:[{lienId:101,espaceId:5}],espaceId:5}),true);
});
test('campagne sans rattachement et sélection vide',()=>{
 assert.equal(verifierRattachements({selection:[],liensCampagne:campagne,rattachements:[],espaceId:5}),true);
});
