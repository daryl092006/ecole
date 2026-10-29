'use client';

import FlagSelect from './FlagSelect';
import { useEffect, useId, useRef, useState } from 'react';
import { PHONE_COUNTRIES, composePhoneNumber, isPhoneNumber, phoneCountryKey, phoneSelection, splitPhoneNumber } from '@/services/phoneNumberService';

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  defaultCountry?: string;
}

export default function PhoneInput({ label = 'Téléphone', value, onChange, required = false, disabled = false, defaultCountry = '' }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const resolveKey = (raw: string) => phoneSelection(raw) || (!raw.trim() ? defaultCountry : '');
  const [choice, setChoice] = useState({ key: resolveKey(value), value, edited: false });
  const key = choice.value === value ? choice.key : resolveKey(value);
  const edited = choice.value === value && choice.edited;
  const country = PHONE_COUNTRIES.find(item => phoneCountryKey(item) === key);
  const sharedCode = key.startsWith('code:') ? key.slice(5) : '';
  const parsed = splitPhoneNumber(value);
  const number = (country || sharedCode) && parsed.callingCode ? parsed.number : value;

  useEffect(() => {
    input.current?.setCustomValidity(edited && !isPhoneNumber(value) ? 'Saisissez un numéro de téléphone valide (15 chiffres maximum avec l’indicatif).' : '');
  }, [value, edited]);

  function emit(nextValue: string, nextKey: string) {
    setChoice({ key: nextKey, value: nextValue, edited: true });
    onChange(nextValue);
  }

  return <div className="form-group phone-field">
    <label htmlFor={id}>{label}</label>
    <div className="phone-input-row">
      <FlagSelect label={`Indicatif — ${label}`} disabled={disabled} value={key} onChange={nextKey => {
        const selected = PHONE_COUNTRIES.find(item => phoneCountryKey(item) === nextKey);
        emit(selected ? composePhoneNumber(selected, number) : number, nextKey);
      }} options={[
        { value: '', label: 'Sans indicatif précisé' },
        ...(sharedCode ? [{ value: key, label: `Indicatif +${sharedCode} · pays non précisé` }] : []),
        ...PHONE_COUNTRIES.map(item => ({ value: phoneCountryKey(item), label: `${item.name} (+${item.callingCode})`, code: item.region })),
      ]} />
      <input ref={input} id={id} className="input" type="tel" inputMode="tel" autoComplete={key ? 'tel-national' : 'tel'} maxLength={80} required={required} disabled={disabled} value={number} onChange={event => {
        const text = event.target.value;
        const complete = /^(?:\+|00)/.test(text.trim());
        const selected = country || (sharedCode ? { region: '', name: '', callingCode: sharedCode } : undefined);
        const next = composePhoneNumber(selected, text);
        const nextCode = splitPhoneNumber(next).callingCode;
        emit(next, complete && nextCode !== selected?.callingCode ? phoneSelection(next) : key);
      }} />
    </div>
  </div>;
}
