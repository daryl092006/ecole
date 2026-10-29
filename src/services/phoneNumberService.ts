import entries from '@/data/phoneCallingCodes.json';

// Calling codes: Google libphonenumber, metadata commit 8593ab70fa4fadffc042b2714034f4c52bef7daf.
// https://github.com/google/libphonenumber/blob/8593ab70fa4fadffc042b2714034f4c52bef7daf/resources/PhoneNumberMetadata.xml
export interface PhoneCountry { region: string; name: string; callingCode: string; nationalPrefix?: string; }
export const PHONE_COUNTRIES: PhoneCountry[] = entries;
export const phoneCountryKey = (country: PhoneCountry) => `${country.region}-${country.callingCode}`;
const callingCodes = [...new Set(entries.map(country => country.callingCode))].sort((a, b) => b.length - a.length);

export function splitPhoneNumber(value: string): { callingCode: string; number: string } {
  const text = value.trim();
  if (!/^(?:\+|00)/.test(text)) return { callingCode: '', number: value };
  const digits = text.replace(/^(?:\+|00)/, '').replace(/[\s().-]/g, '');
  const code = callingCodes.find(item => digits.startsWith(item));
  return code ? { callingCode: code, number: digits.slice(code.length) } : { callingCode: '', number: value };
}

export function phoneSelection(value: string): string {
  const code = splitPhoneNumber(value).callingCode;
  if (!code) return '';
  const countries = PHONE_COUNTRIES.filter(country => country.callingCode === code);
  return countries.length === 1 ? phoneCountryKey(countries[0]) : `code:${code}`;
}

export function composePhoneNumber(country: PhoneCountry | undefined, number: string): string {
  const text = number.trim();
  if (!text) return '';
  // A pasted complete number selects its own code; never prefix it a second time.
  if (/^(?:\+|00)/.test(text)) return '+' + text.replace(/^(?:\+|00)/, '').replace(/[\s().-]/g, '');
  if (!country) return number;
  let digits = text.replace(/[\s().-]/g, '');
  if (country.nationalPrefix === '0' && digits.startsWith('0')) digits = digits.slice(1);
  return digits ? `+${country.callingCode}${digits}` : '';
}

/** Syntax only: this does not establish that a number exists or is reachable. */
export function isPhoneNumber(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  if (!/^(?:\+|00)?[0-9\s().-]+$/.test(text)) return false;
  const digits = text.replace(/^(?:\+|00)/, '').replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 15 && (!/^(?:\+|00)/.test(text) || /^[1-9]/.test(digits));
}

/** Numéro affichable : masque un indicatif nu (ex. "+228") ou un numéro composé uniquement de zéros. */
export function displayedPhoneNumber(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) return '';
  const { callingCode, number } = splitPhoneNumber(text);
  const subscriberDigits = (callingCode ? number : text).replace(/\D/g, '');
  if (!subscriberDigits || /^0+$/.test(subscriberDigits)) return '';
  return text;
}
