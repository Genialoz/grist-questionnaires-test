/** V4.4.4 TEST : photographie minimale du suivi, sans données individuelles ni jetons répondants. */
export function creerPublicationSuivi(summary, nom, campagne) {
  if (!summary || !Array.isArray(summary.items)) throw new Error('Suivi non disponible. Publication annulée.');
  if (!Number.isSafeInteger(summary.total) || summary.total !== summary.items.length) {
    throw new Error('Suivi incohérent. Publication annulée.');
  }
  const items = summary.items.map(item => {
    const nomStructure = String(item.campaign?.Valeur_personnalisation_Libelle || item.campaign?.Valeur_personnalisation || '').trim();
    if (!nomStructure) throw new Error('Structure sans libellé. Publication annulée.');
    if (!['completed','in-progress','not-started'].includes(item.state)) throw new Error('Statut invalide.');
    if (!Number.isSafeInteger(item.count) || item.count < 0) throw new Error('Comptage invalide.');
    return {structure: nomStructure.slice(0, 200), etat:item.state, reponses:item.count};
  });
  return JSON.stringify({version:1,nom:String(nom||'').slice(0,120),campagne:String(campagne||'').slice(0,200),
    datePublication:new Date().toISOString(),structures:items,
    totaux:{total:summary.total,nonCommence:summary.notStarted,enCours:summary.inProgress,complete:summary.completed}});
}
export function lirePublicationSuivi(json) {
  const p=JSON.parse(json);
  if(p?.version!==1||!Array.isArray(p.structures)||p.structures.length>10000)throw new Error('Format de publication invalide.');
  for(const s of p.structures)if(typeof s.structure!=='string'||!['completed','in-progress','not-started'].includes(s.etat)||!Number.isSafeInteger(s.reponses)||s.reponses<0)throw new Error('Données publiées invalides.');
  return p;
}
