import test from "node:test";
import assert from "node:assert/strict";
import {resumeEspace} from "../concepteur/portail-suivi.mjs";
const entries=[{member:{Espace_Id:1,Peut_modifier:false},campaign:{id:10}},{member:{Espace_Id:1,Peut_modifier:true},campaign:{id:11}}];
const matches=(r,c)=>r.campaign===c.id;
const state=r=>r.status;
test("suivi filtré par lien, pas par ordre d'enregistrement",()=>{
 const data=resumeEspace(entries,[{campaign:10,status:"in-progress"},{campaign:11,status:"completed"},{campaign:99,status:"completed"}],matches,state);
 assert.equal(data.total,2);assert.equal(data.inProgress,1);assert.equal(data.completed,1);assert.equal(data.items[0].count,1);
});
test("absence de réponse vaut pas commencé",()=>{const x=resumeEspace(entries,[],matches,state);assert.equal(x.notStarted,2)});
test("plusieurs brouillons ne multiplient pas les structures",()=>{const x=resumeEspace(entries,[{campaign:10,status:"in-progress"},{campaign:10,status:"in-progress"}],matches,state);assert.equal(x.inProgress,1);assert.equal(x.items[0].count,2)});
test("rattachement absent ou ambigu bloqué",()=>{assert.throws(()=>resumeEspace([{member:{},campaign:null}],[],matches,state));assert.throws(()=>resumeEspace([entries[0],entries[0]],[],matches,state))});
