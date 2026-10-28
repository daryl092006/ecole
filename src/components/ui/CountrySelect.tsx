'use client';

import { useId } from 'react';
import FlagSelect from './FlagSelect';
import nationalities from '@/data/nationalities.json';
import { PHONE_COUNTRIES } from '@/services/phoneNumberService';

interface Props {
  label?: string;
  kind?: 'nationality' | 'country';
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const countries = PHONE_COUNTRIES.filter(country => /^[A-Z]{2}$/.test(country.region))
  .filter((country, index, all) => all.findIndex(item => item.region === country.region) === index)
  .map(country => ({ value: country.name, label: country.name, code: country.region }));

export default function CountrySelect({ label = 'Nationalité', kind = 'nationality', value, onChange, required, disabled }: Props) {
  const id = useId();
  const options = kind === 'nationality' ? nationalities : countries;
  // Keep historical spellings intact until the user explicitly selects a new value.
  const known = options.some(option => option.value === value);
  return <div className="form-group"><label htmlFor={id}>{label}</label>
    <FlagSelect id={id} label={label} value={value} required={required} disabled={disabled} onChange={onChange} options={[
      { value: '', label: kind === 'nationality' ? 'Sélectionner une nationalité' : 'Sélectionner un pays' },
      ...(value && !known ? [{ value, label: value }] : []),
      ...options,
    ]} />
  </div>;
}
