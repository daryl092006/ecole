import assert from 'node:assert/strict';
import { PHONE_COUNTRIES, composePhoneNumber, isPhoneNumber, phoneCountryKey, phoneSelection, splitPhoneNumber } from './phoneNumberService';

const country = (region: string) => PHONE_COUNTRIES.find(item => item.region === region)!;
assert.ok(PHONE_COUNTRIES.length > 240);
assert.equal(new Set(PHONE_COUNTRIES.map(phoneCountryKey)).size, PHONE_COUNTRIES.length);
for (const [region, code] of [['TG', '228'], ['BJ', '229'], ['CI', '225'], ['GH', '233'], ['FR', '33'], ['US', '1'], ['IT', '39']]) {
  assert.equal(country(region).callingCode, code);
}
assert.equal(composePhoneNumber(country('FR'), '06 12 34 56 78'), '+33612345678');
assert.equal(composePhoneNumber(country('TG'), '90 00 00 00'), '+22890000000');
assert.equal(composePhoneNumber(country('BJ'), '01 90 00 00 00'), '+2290190000000');
assert.equal(composePhoneNumber(country('IT'), '06 12345678'), '+390612345678');
assert.equal(composePhoneNumber(country('TG'), '+33 6 12 34 56 78'), '+33612345678');
assert.equal(composePhoneNumber(country('TG'), '0033 6 12 34 56 78'), '+33612345678');
assert.equal(composePhoneNumber(country('TG'), ''), '');
assert.equal(composePhoneNumber(undefined, '90 00 00 00'), '90 00 00 00');
assert.deepEqual(splitPhoneNumber('+228 90 00 00 00'), { callingCode: '228', number: '90000000' });
assert.deepEqual(splitPhoneNumber('0033 6 12 34 56 78'), { callingCode: '33', number: '612345678' });
assert.deepEqual(splitPhoneNumber('90 00 00 00'), { callingCode: '', number: '90 00 00 00' });
assert.equal(phoneSelection('+14155552671'), 'code:1');
assert.equal(phoneSelection('+33612345678'), 'FR-33');
assert.equal(phoneSelection('90 00 00 00'), '');
for (const number of ['', '90000000', '+33 6 12 34 56 78', '+2290190000000', '+123456789012345']) assert.ok(isPhoneNumber(number));
for (const number of ['+1234567890123456', '+0123456', 'abc', '+33+612345678', '1']) assert.equal(isPhoneNumber(number), false);
console.log('Téléphones : indicatifs internationaux, préfixes, zéro italien et données locales préservés.');
