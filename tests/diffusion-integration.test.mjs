import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {verifierDiffusion} from '../concepteur/diffusion-regles.mjs';

// Régression : exécute la fonction réelle du Concepteur (et pas seulement sa syntaxe).
test('Diffusion des liens : récupération espaces et rattachements sans ReferenceError', () => {
  const code = fs.readFileSync(new URL('../concepteur/app.js', import.meta.url), 'utf8');
  const begin = code.indexOf('function distributionData(group,all){');
  const end = code.indexOf('\nasync function renderSpaceDistribution(', begin);
  assert.ok(begin >= 0 && end > begin, 'Fonction distributionData retrouvée');
  const ctx = {
    spaceCampaignRows: () => [{id:101}, {id:102}, {id:103}],
    spaceRowsFor: () => [{id:20}],
    spaceMemberRows: () => [{Espace_Id:20,Campagne_Lien_Id:101}],
    verifierDiffusion,
  };
  vm.createContext(ctx);
  vm.runInContext(`${code.slice(begin,end)}\nthis.executeDistribution = distributionData;`, ctx);
  const result = ctx.executeDistribution('GROUP_TEST', {});
  assert.equal(result.campaigns.length, 3);
  assert.equal(result.spaces.length, 1);
  assert.equal(result.indexed.get('101').id, 20);
  assert.equal(result.indexed.has('102'), false);
});
