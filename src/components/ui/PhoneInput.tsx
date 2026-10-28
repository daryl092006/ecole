'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { PHONE_COUNTRIES, composePhoneNumber, isPhoneNumber, phoneCountryKey, phoneSelection, splitPhoneNumber } from '@/services/phoneNumberService';

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const countryFlag = (region: string) => /^[A-Z]{2}$/.test(region)
  ? String.fromCodePoint(...Array.from(region, character => character.charCodeAt(0) + 127397))
  : '';

export default function PhoneInput({ label = 'Téléphone', value, onChange, required = false, disabled = false }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [choice, setChoice] = useState({ key: phoneSelection(value), value, edited: false });
  const key = choice.value === value ? choice.key : phoneSelection(value);
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
      <select className="select-input" aria-label={`Indicatif — ${label}`} disabled={disabled} value={key} onChange={event => {
        const nextKey = event.target.value;
        const selected = PHONE_COUNTRIES.find(item => phoneCountryKey(item) === nextKey);
        emit(selected ? composePhoneNumber(selected, number) : number, nextKey);
      }}>
        <option value="">Sans indicatif précisé</option>
        {sharedCode && <option value={key}>Indicatif +{sharedCode} · pays non précisé</option>}
        {PHONE_COUNTRIES.map(item => <option key={phoneCountryKey(item)} value={phoneCountryKey(item)}>{countryFlag(item.region)} {item.name} (+{item.callingCode})</option>)}
      </select>
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
