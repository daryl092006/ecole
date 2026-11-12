'use client';

import { useId, useState, type ReactNode } from 'react';
import ResponsiveTable from './ResponsiveTable';

export interface ChartValue { label: string; value: number; }
export interface ChartSeries { label: string; values: ChartValue[]; }
interface Props {
  title: string;
  description: string;
  series: ChartSeries[];
  kind?: 'bars' | 'donut';
  format?: 'count' | 'currency';
  available?: boolean;
  children?: ReactNode;
}
const COLORS = ['#2563eb', '#0f766e', '#b45309', '#7c3aed', '#be185d', '#475569'];
const display = (value: number, currency: boolean) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: currency ? 0 : 2 })}${currency ? ' FCFA' : ''}`;

/** Values remain readable without hover, color perception or access to the drawing. */
export default function KpiChart({ title, description, series, kind = 'bars', format = 'count', available = true, children }: Props) {
  const id = useId();
  const [selected, setSelected] = useState(0);
  const [table, setTable] = useState(false);
  const current = series[selected] || series[0];
  const values = current?.values || [];
  const valid = values.every(item => Number.isFinite(item.value) && item.value >= 0);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const maximum = Math.max(0, ...values.map(item => item.value));
  const currency = format === 'currency';
  let offset = 0;

  return <section className="card kpi-chart" aria-labelledby={`${id}-title`}>
    <div className="card-header"><h2 id={`${id}-title`}>{title}</h2><button type="button" className="btn btn-sm btn-outline" aria-pressed={table} onClick={() => setTable(value => !value)}>{table ? 'Afficher le graphique' : 'Afficher les données'}</button></div>
    <p id={`${id}-description`} className="kpi-chart-description">{description}</p>
    {series.length > 1 && <div className="kpi-chart-options" role="group" aria-label={`Regrouper ${title.toLocaleLowerCase('fr')}`}>
      {series.map((item, index) => <button type="button" className={`btn btn-sm ${index === selected ? 'btn-primary' : 'btn-outline'}`} aria-pressed={index === selected} key={item.label} onClick={() => setSelected(index)}>{item.label}</button>)}
    </div>}
    {!available ? <p className="kpi-chart-empty" role="status">Données non disponibles pour cette sélection.</p> : !values.length ? <p className="kpi-chart-empty" role="status">Aucune donnée à représenter pour cette sélection.</p> : table ? <div className="table-wrap"><ResponsiveTable className="data-table" aria-label={`Données : ${title}`}><thead><tr><th>Catégorie</th><th>{currency ? 'Montant' : 'Nombre'}</th></tr></thead><tbody>{values.map(item => <tr key={item.label}><td>{item.label}</td><td>{display(item.value, currency)}</td></tr>)}</tbody></ResponsiveTable></div> : !valid ? <p className="kpi-chart-empty" role="status">Ces valeurs ne peuvent pas être représentées sur ce graphique. Consultez la vue des données.</p> : <>
      {kind === 'donut' ? <div className="kpi-chart-distribution" aria-describedby={`${id}-description`}>
        <div className="kpi-chart-ring">
          <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="14" />
            {total > 0 && values.map((item, index) => {
              const share = item.value / total * 100;
              const start = offset; offset += share;
              return <circle key={item.label} cx="60" cy="60" r="46" fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="14" pathLength="100" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 60 60)" />;
            })}
          </svg>
          <div className="kpi-chart-center"><strong>{currency ? `${total > 0 ? (values[0].value / total * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : 0} %` : display(total, false)}</strong><span>{currency ? values[0].label : 'Au total'}</span></div>
        </div>
        <dl className="kpi-chart-legend">{values.map((item, index) => <div key={item.label}><dt><span className="kpi-chart-dot" style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true" />{item.label}</dt><dd>{display(item.value, currency)}</dd></div>)}</dl>
      </div> : <ul className="kpi-chart-bars" aria-describedby={`${id}-description`}>{values.map((item, index) => <li key={item.label}><div className="kpi-chart-bar-label"><span>{item.label}</span><strong>{display(item.value, currency)}</strong></div><div className="kpi-chart-track" aria-hidden="true"><span style={{ width: `${maximum > 0 ? item.value / maximum * 100 : 0}%`, background: COLORS[index % COLORS.length] }} /></div></li>)}</ul>}
      {total === 0 && <p className="kpi-chart-empty">Toutes les valeurs sont à zéro pour cette sélection.</p>}
    </>}
    {children && <div className="kpi-chart-footer">{children}</div>}
  </section>;
}
