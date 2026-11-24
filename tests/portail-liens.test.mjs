import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PORTAIL_LINK_COLUMN,PORTAIL_LINK_FORMULA,PORTAIL_PAGE_TEST,verifierLienPortailGrist} from '../concepteur/portail-liens.mjs';
const token='ESP_'+'a'.repeat(64);
const base='https://grist.numerique.gouv.fr/o/docs/hPbcNzv8BmMc/Gristionnaire-TEST/p/61';
const link=`${base}?Portail_=${token}&style=singlePage`;
test('formule officielle Grist et singlePage, pas de jeton de réponse',()=>{
 assert.equal(PORTAIL_LINK_COLUMN,'Lien_portail');
 assert.equal(PORTAIL_PAGE_TEST,61);
 assert.match(PORTAIL_LINK_FORMULA,/SELF_HYPERLINK\(page=61, LinkKey_Portail=\$Jeton_portail\)/);
 assert.match(PORTAIL_LINK_FORMULA,/&style=singlePage/);
 assert.match(PORTAIL_LINK_FORMULA,/\$Suivi_public_JSON/);
});
test('un lien de portail généré par Grist est accepté',()=>assert.equal(verifierLienPortailGrist(link,token),link));
test('rejet sans singlePage',()=>assert.throws(()=>verifierLienPortailGrist(`${base}?Portail_=${token}`,token),/singlePage/));
test('rejet si jeton différent',()=>assert.throws(()=>verifierLienPortailGrist(link,'ESP_'+'b'.repeat(64)),/clé/));
test('rejet en cas de clé dupliquée',()=>assert.throws(()=>verifierLienPortailGrist(link+`&Portail_=${token}`,token),/Plusieurs/));
test('rejet si une autre page ou un autre document',()=>{
 assert.throws(()=>verifierLienPortailGrist(link.replace('/p/61','/p/62'),token),/page 61/);
 assert.throws(()=>verifierLienPortailGrist(link.replace('hPbcNzv8BmMc','autreDoc'),token),/sécurisée/);
});
test('rejet URL vide, autre domaine et http',()=>{
 assert.throws(()=>verifierLienPortailGrist('',token),/Aucun lien/);
 assert.throws(()=>verifierLienPortailGrist(link.replace('https:', 'http:'),token),/sécurisée/);
 assert.throws(()=>verifierLienPortailGrist(link.replace('grist.numerique.gouv.fr','malveillant.example'),token),/sécurisée/);
});
test('Concepteur appelle la formule Grist et copie sans recomposer le lien',()=>{
 const code=readFileSync(new URL('../concepteur/app.js',import.meta.url),'utf8');
 assert.match(code,/isFormula:true,formula:PORTAIL_LINK_FORMULA/);
 assert.match(code,/return verifierLienPortailGrist\(row\[PORTAIL_LINK_COLUMN\],row.Jeton_portail\)/);
 assert.match(code,/await copySpaceLink\(space\)/);
 assert.match(code,/data-space-copy-link/);
 assert.match(code,/data-distribution-copy-space/);
});
