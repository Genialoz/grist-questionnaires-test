// Gristionnaire TEST V4.4.5 — Grist generates the LinkKey URL server-side.
// Page 61 is the verified TEST portal page; never reuse this configuration in PROD.
export const PORTAIL_PAGE_TEST = 61;
export const PORTAIL_LINK_COLUMN = 'Lien_portail';
export const PORTAIL_LINK_FORMULA = 'SELF_HYPERLINK(page=61, LinkKey_Portail=$Jeton_portail) + "&style=singlePage" if $Jeton_portail and $Suivi_public_JSON and $Actif else ""';

export function verifierLienPortailGrist(value, jeton, page = PORTAIL_PAGE_TEST) {
  const texte = String(value ?? '').trim();
  if (!texte) throw new Error('Aucun lien publié : préparez un jeton, puis publiez le suivi.');
  let url;
  try { url = new URL(texte); } catch { throw new Error('Le lien renvoyé par la formule Grist est invalide.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'grist.numerique.gouv.fr' || !url.pathname.startsWith('/o/docs/hPbcNzv8BmMc/')) {
    throw new Error('Le lien de Grist ne correspond pas à une adresse de document sécurisée.');
  }
  if (!url.pathname.endsWith(`/p/${page}`)) throw new Error(`Le lien ne cible pas la page ${page} du portail TEST.`);
  if (url.searchParams.get('Portail_') !== jeton || !/^ESP_[0-9a-f]{64}$/.test(String(jeton))) {
    throw new Error('La clé de lien Grist ne correspond pas au jeton de cet espace.');
  }
  if (url.searchParams.get('style') !== 'singlePage') throw new Error('Le lien ne comporte pas le mode singlePage.');
  if (url.searchParams.getAll('Portail_').length !== 1) throw new Error('Plusieurs clés Portail_ sont présentes.');
  return url.href;
}
