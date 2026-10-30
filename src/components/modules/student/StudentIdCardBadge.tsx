'use client';

import { useMemo } from 'react';
import { printDocument, escapeHtml as h } from '@/utils/printDocument';
import { CreditCard, Printer, CheckCircle } from 'lucide-react';

interface StudentIdCardProps {
  firstname: string;
  lastname: string;
  matricule: string;
  filiere: string;
  niveau: string;
  groupe?: string;
  academicYear: string;
}

export default function StudentIdCardBadge({
  firstname,
  lastname,
  matricule,
  filiere,
  niveau,
  groupe,
  academicYear,
}: StudentIdCardProps) {
  const fullName = `${firstname} ${lastname}`.trim();

  const printableMarkup = useMemo(() => {
    return `<div class="id-card">
      <div style="border-bottom: 2px solid #152536; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.05em; color: #152536;">Carte d'étudiant</h1>
        <p style="margin: 4px 0 0; font-size: 12px; color: #536170;">Année académique : ${h(academicYear || '2026-2027')}</p>
      </div>
      <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 16px;">
        <div style="width: 70px; height: 85px; border: 1px dashed #c4ced8; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #64748b; background: #f8fafc;">
          PHOTO
        </div>
        <div>
          <div style="font-size: 16px; font-weight: bold; color: #0f172a;">${h(fullName)}</div>
          <div style="font-size: 13px; font-weight: 600; color: #2563eb; margin-top: 2px;">Matricule : ${h(matricule)}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">${h(filiere || 'Filière non renseignée')}</div>
          <div style="font-size: 11px; color: #64748b;">${h([niveau, groupe].filter(Boolean).join(' · '))}</div>
        </div>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px; color: #64748b; text-align: center;">
        Étudiant officiellement inscrit · ESCEN University
      </div>
    </div>`;
  }, [fullName, matricule, filiere, niveau, groupe, academicYear]);

  function handlePrint() {
    printDocument(`Carte-Etudiant-${matricule}`, printableMarkup);
  }

  return (
    <section className="card card-full" style={{ marginBottom: '1.25rem' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={20} color="#2563eb" />
          <h2 style={{ margin: 0 }}>Ma carte d'étudiant officielle</h2>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={handlePrint}
        >
          <Printer size={15} />
          Imprimer mon badge
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          padding: '1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#2563eb',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            fontWeight: 700,
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
          }}
        >
          {firstname.charAt(0).toUpperCase()}{lastname.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: '1 1 240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>{fullName}</span>
            <span className="pill pill-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} />
              Inscrit {academicYear || '2026-2027'}
            </span>
          </div>

          <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span className="cell-sub">Matricule : </span>
              <strong style={{ color: '#2563eb' }}>{matricule}</strong>
            </div>
            <div>
              <span className="cell-sub">Filière : </span>
              <strong>{filiere || 'Non renseignée'}</strong>
            </div>
            <div>
              <span className="cell-sub">Niveau : </span>
              <strong>{[niveau, groupe].filter(Boolean).join(' · ')}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

