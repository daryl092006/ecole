<template>
  <form class="brochure-request-form" :aria-busy="submitting" @submit.prevent="submit">
    <p>Indiquez vos coordonnées pour accéder à la brochure. ESCEN les conserve pour assurer le suivi de votre demande.</p>
    <fieldset :disabled="submitting">
      <label>Nom complet<input v-model="fullName" name="full_name" autocomplete="name" required minlength="2" maxlength="160" /></label>
      <label>Adresse email<input v-model="email" name="email" type="email" autocomplete="email" required maxlength="254" /></label>
      <label>Téléphone<input v-model="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required minlength="6" maxlength="30" pattern="\+?[0-9\(\) .\-]+" /></label>
    </fieldset>
    <p v-if="error" ref="feedback" role="alert" tabindex="-1">{{ error }}</p>
    <button type="submit" :disabled="submitting">{{ submitting ? 'Enregistrement…' : 'Accéder à la brochure' }}</button>
    <a href="/confidentialite" target="_blank" rel="noopener">Consulter la politique de confidentialité</a>
  </form>
</template>
<script setup>
import config from '../../config'
const emit = defineEmits(['saved'])
const fullName = ref('')
const email = ref('')
const phone = ref('')
const submitting = ref(false)
const error = ref('')
const feedback = ref(null)
let requestId
let previousPayload = ''
let controller
let disposed = false

async function submit() {
  if (submitting.value) return
  const data = { full_name: fullName.value.trim(), email: email.value.trim().toLowerCase(), phone: phone.value.trim() }
  const digits = data.phone.replace(/\D/g, '')
  if (data.full_name.length < 2 || !/^\+?[0-9() .-]+$/.test(data.phone) || digits.length < 6 || digits.length > 15) {
    error.value = 'Vérifiez votre nom et votre numéro de téléphone.'
    await nextTick(); feedback.value?.focus()
    return
  }
  const payload = JSON.stringify(data)
  if (payload !== previousPayload || !requestId) { requestId = crypto.randomUUID(); previousPayload = payload }
  submitting.value = true; error.value = ''
  controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`${config.app_dev_url}/public/brochure-requests`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, ...data }), signal: controller.signal,
    })
    const result = await response.json()
    if (!response.ok || result.received !== true) throw new Error(response.status === 429
      ? 'Trop de demandes. Patientez avant de réessayer.' : 'Votre demande n’a pas pu être enregistrée. Réessayez.')
    if (!disposed) emit('saved')
  } catch (cause) {
    if (!disposed) {
      error.value = cause.name === 'AbortError' || cause instanceof TypeError
        ? 'La connexion est momentanément indisponible. Vos champs sont conservés ; réessayez.'
        : cause.message || 'Enregistrement impossible. Réessayez.'
      await nextTick(); feedback.value?.focus()
    }
  } finally { clearTimeout(timeout); if (!disposed) submitting.value = false }
}
onBeforeUnmount(() => { disposed = true; controller?.abort() })
</script>
