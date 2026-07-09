// Kareya paylaşılan sözleşmeler (Brief JSON / Site JSON / ChangeOps).
// Portal, renderer/component-kit ve agent worker'ları buradan tek kaynak
// olarak tüketir. Gerçek şemalar (zod validasyon) sonraki ticket'larda gelir.

export const SCHEMAS_VERSION = "0.0.0";

/** Görüşme odası canlı brief paneli taslağı (KAR-15 stub). */
export type BriefDraft = {
  businessName?: string;
  sector?: string;
  hasLogo?: boolean;
  referenceSite?: string;
};
