import test from 'node:test';
import assert from 'node:assert/strict';
import {genererJetonPortail,etatAccesPortail,jetonValide} from '../concepteur/portail-acces.mjs';

test('un jeton a 256 bits, un format contrôlé et ne ressemble pas à un jeton de campagne',()=>{
 const crypto={getRandomValues(b){for(let i=0;i<b.length;i++)b[i]=i;return b;}};
 const token=genererJetonPortail(crypto);
 assert.equal(jetonValide(token),true);
 assert.equal(token.length,68);
 assert.notEqual(token.slice(0,4),'ACC_');
});
test('échec fermé en absence de source aléatoire sûre',()=>{
 assert.throws(()=>genererJetonPortail(null),/indisponible/);
});
test('état des accès externes toujours désactivé à cette étape',()=>{
 assert.equal(etatAccesPortail({}), 'Non préparé');
 assert.match(etatAccesPortail({Jeton_portail:'ESP_x'}),/désactivé/);
});
test('format strict des jetons',()=>{
 assert.equal(jetonValide('ESP_'+'a'.repeat(64)),true);
 assert.equal(jetonValide('ACC_'+'a'.repeat(64)),false);
 assert.equal(jetonValide('ESP_'+'z'.repeat(64)),false);
});
