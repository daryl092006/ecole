export function adaptDiplomaForm(source) {
  const start = source.indexOf('<form v-else-if="etapeActive === 1"');
  const fields = source.indexOf('<div class="field-grid">', start);
  const end = source.indexOf('<div class="step-actions">', fields);
  if (start < 0 || fields < 0 || end < 0) throw new Error('Formulaire diplôme introuvable');
  source = source.slice(0, fields) + `<div class="field-grid">
    <div class="field field--full">
      <label class="field-label" for="diploma-type">Dernier diplôme obtenu <span class="req">*</span></label>
      <select id="diploma-type" v-model="formData.type_diplome_id" required class="field-input" @change="formData.numero_table = ''; formData.annee_bac = ''; formData.serie = ''; formData.mention_bac = ''; formData.annee_diplome = ''; formData.intitule_diplome = ''; formData.specialite_diplome = ''; formData.mention_diplome = ''; formData.etablissement_diplome = ''">
        <option value="">Sélectionner un diplôme</option>
        <option>BAC</option><option>BTS</option><option>DUT</option><option>Licence</option><option>Master</option><option>Doctorat</option><option>Autre</option>
        <option v-if="formData.type_diplome_id && !['BAC','BTS','DUT','Licence','Master','Doctorat','Autre'].includes(formData.type_diplome_id)" :value="formData.type_diplome_id">{{ formData.type_diplome_id }}</option>
      </select>
    </div>
    <template v-if="formData.type_diplome_id">
      <template v-if="formData.type_diplome_id === 'BAC'">
        <div class="field"><label class="field-label" for="bac-year">Année d’obtention du BAC (optionnel)</label><input id="bac-year" v-model="formData.annee_bac" type="number" min="1900" :max="today.getFullYear()" class="field-input"></div>
        <div class="field"><label class="field-label" for="bac-series">Série du BAC (optionnel)</label><input id="bac-series" v-model="formData.serie" maxlength="200" class="field-input"></div>
        <div class="field"><label class="field-label" for="bac-mention">Mention au BAC (optionnel)</label><input id="bac-mention" v-model="formData.mention_bac" maxlength="200" class="field-input"></div>
      </template>
      <template v-else>
        <div v-if="formData.type_diplome_id === 'Autre'" class="field"><label class="field-label" for="diploma-title">Intitulé du diplôme *</label><input id="diploma-title" v-model="formData.intitule_diplome" required maxlength="200" class="field-input"></div>
        <div class="field"><label class="field-label" for="diploma-year">Année d’obtention du diplôme (optionnel)</label><input id="diploma-year" v-model="formData.annee_diplome" type="number" min="1900" :max="today.getFullYear()" class="field-input"></div>
        <div class="field"><label class="field-label" for="diploma-specialty">Spécialité du diplôme (optionnel)</label><input id="diploma-specialty" v-model="formData.specialite_diplome" maxlength="200" class="field-input"></div>
        <div class="field"><label class="field-label" for="diploma-mention">Mention du diplôme (optionnel)</label><input id="diploma-mention" v-model="formData.mention_diplome" maxlength="200" class="field-input"></div>
      </template>
      <div class="field field--full"><label class="field-label" for="diploma-school">Établissement ayant délivré le diplôme (optionnel)</label><input id="diploma-school" v-model="formData.etablissement_diplome" maxlength="200" class="field-input"></div>
    </template>
  </div>
  ` + source.slice(end);
  if (!source.includes("annee_diplome: ''")) source = source.replace("numero_table: '', annee_bac:", "annee_diplome: '', intitule_diplome: '', specialite_diplome: '', mention_diplome: '', numero_table: '', annee_bac:");
  if (!source.includes('annee_diplome: formData.annee_diplome')) source = source.replace('etablissement_diplome: formData.etablissement_diplome,', 'etablissement_diplome: formData.etablissement_diplome,\n        annee_diplome: formData.annee_diplome, intitule_diplome: formData.intitule_diplome, specialite_diplome: formData.specialite_diplome, mention_diplome: formData.mention_diplome,');
  return source;
}
