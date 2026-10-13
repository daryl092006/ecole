import { useState } from 'react';
import FinancialSituationPanel from './FinancialSituationPanel';
import FinanceContractForm from './FinanceContractForm';
import { CreditCard, Award, DollarSign } from 'lucide-react';
import type { Payment, PaymentCancellation, PaymentMethod, PermissionSchema, Receipt, Student, RoleName } from '@/types';
import { fmtMoney } from '@/hooks/useAppState';

interface FinanceModuleProps {
  activeRole: RoleName;
  createContract: (studentId: string, amount: number, dates: string[]) => void;
  perms: PermissionSchema;
  currentSubTab: string;
  students: Student[];
  paymentStudent: string;
  setPaymentStudent: (v: string) => void;
  paymentAmount: string;
  setPaymentAmount: (v: string) => void;
  recordPayment: () => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (value: PaymentMethod) => void;
  payments: Payment[];
  receipts: Receipt[];
  paymentCancellations: PaymentCancellation[];
  cancelPayment: (paymentId: string, reason: string) => void;
}

export default function FinanceModule({
  activeRole, createContract, perms,
  currentSubTab,
  students,
  paymentStudent,
  setPaymentStudent,
  paymentAmount,
  setPaymentAmount,
  recordPayment,
  paymentMethod, setPaymentMethod, payments, receipts, paymentCancellations, cancelPayment,
}: FinanceModuleProps) {
  const [paymentFeedback, setPaymentFeedback] = useState('');
  const savePayment = () => { try { recordPayment(); setPaymentFeedback('Paiement enregistré.'); } catch (error) { setPaymentFeedback(error instanceof Error ? error.message : 'Paiement impossible.'); } };
  const totalExpected = students.reduce((s, st) => s + st.financials.expected, 0);
  const totalPaid = students.reduce((s, st) => s + st.financials.paid, 0);
  const totalRemaining = students.reduce((s, st) => s + st.financials.remaining, 0);

  return (
    <div>
      {/* ── SUBTAB: fin_kpis (Indicateurs Financiers) ── */}
      {currentSubTab === 'fin_kpis' && (
        <div>
          <div className="module-header">
            <h1>Dashboard Financier</h1>
            <p>Vue consolidée des encaissements, créances et bourses d'excellence ESCEN.</p>
          </div>

          <div className="metrics-grid">
            {[
              { icon: <DollarSign />, label: 'Total Frais Attendus', value: fmtMoney(totalExpected), color: '#3b82f6', bg: 'var(--accent-light)' },
              { icon: <CreditCard />, label: 'Encaissés Réels', value: fmtMoney(totalPaid), color: '#10b981', bg: 'var(--success-light)' },
              { icon: <Award />, label: 'Reste à recouvrer', value: fmtMoney(totalRemaining), color: '#f59e0b', bg: 'var(--warning-light)' },
            ].map((m, i) => (
              <div key={i} className="metric-card">
                <div className="metric-icon-wrap" style={{ color: m.color, background: m.bg }}>{m.icon}</div>
                <div>
                  <div className="metric-value" style={{ color: m.color, fontSize: '1.25rem' }}>{m.value}</div>
                  <div className="metric-label">{m.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card card-full">
            <div className="card-header"><h2>Répartition par étudiant</h2></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Étudiant</th><th>Frais Scolarité</th><th>Montant Payé</th><th>Reste à Payer</th><th>Bourse</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.matricule}>
                      <td>
                        <div className="cell-main">{s.firstname} {s.lastname}</div>
                        <div className="cell-sub">{s.matricule} · {s.niveau}</div>
                      </td>
                      <td>{fmtMoney(s.financials.expected)}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmtMoney(s.financials.paid)}</td>
                      <td style={{ color: s.financials.remaining > 0 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                        {fmtMoney(s.financials.remaining)}
                      </td>
                      <td>
                        {s.bourse.active ? (
                          <span className="pill pill-purple">{s.bourse.percent}% - {s.bourse.type}</span>
                        ) : (
                          <span className="text-muted">Aucune</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBTAB: fin_payments (Échéanciers & Versements) ── */}
      {currentSubTab === 'fin_payments' && (
        <div>
          {perms.canEditFinance && <FinanceContractForm students={students} onCreate={createContract} />}
          {paymentFeedback && <p role="status">{paymentFeedback}</p>}
          <div className="module-header">
            <h1>Gestion des paiements &amp; Échéanciers</h1>
            <p>Enregistrement des versements d'étudiants et lettrage sur les échéances.</p>
          </div>

          <div className="content-grid">
            {/* Formulaire de versement */}
            <div className="card">
              <div className="card-header"><h2>Enregistrer un encaissement</h2></div>
              {perms.canEditFinance ? (
                <div>
                  <div className="form-group mb-2">
                    <label className="form-label">Étudiant concerné</label>
                    <select
                      className="select-input"
                      value={paymentStudent}
                      onChange={e => setPaymentStudent(e.target.value)}
                    >
                      <option value="">Sélectionner un Étudiant</option>
                      {students.map(s => (
                        <option key={s.matricule} value={s.matricule}>
                          {s.firstname} {s.lastname} ({s.matricule})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group mb-2"><label className="form-label">Mode de paiement</label><select className="select-input" value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)}><option value="VIREMENT">Virement</option><option value="ESPECES">Espèces</option><option value="CARTE">Carte</option><option value="MOBILE_MONEY">Mobile money</option><option value="CHEQUE">Chèque</option></select></div>
                  <div className="form-group mb-2">
                    <label className="form-label">Montant du versement (FCFA)</label>
                    <input
                      className="input"
                      type="number"
                      placeholder="ex: 500000"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={savePayment}>
                    Valider le versement
                  </button>
                </div>
              ) : <div className="text-muted">Consultation uniquement.</div>}
            </div>

            {/* Échéanciers par étudiant */}
            <div className="card">
              <div className="card-header"><h2>Échéanciers détaillés</h2></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {students.map(s => (
                  <div key={s.matricule} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>{s.firstname} {s.lastname}</strong>
                      <code style={{ fontSize: '0.8rem' }}>{s.matricule}</code>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {s.financials.installments.map((inst, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                          <span className="text-muted">Échéance {i + 1} ({inst.dueDate}) :</span>
                          <span>
                            {fmtMoney(inst.amount)} &middot;{' '}
                            <span
                              className={`pill ${
                                inst.status === 'Payée'
                                  ? 'pill-success'
                                  : inst.status === 'Partiellement payée'
                                  ? 'pill-warning'
                                  : 'pill-default'
                              }`}
                            >
                              {inst.status}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="card card-full mt-2"><div className="card-header"><h2>Transactions et reçus</h2></div><div className="table-wrap"><table className="data-table"><thead><tr><th>Référence</th><th>Étudiant</th><th>Montant</th><th>Statut</th><th>Reçu / Action</th></tr></thead><tbody>{payments.map(payment => { const receipt = receipts.find(item => item.paymentId === payment.id); const cancellation = paymentCancellations.find(item => item.paymentId === payment.id); return <tr key={payment.id}><td><code>{payment.reference}</code><div className="cell-sub">{payment.paymentMethod}</div></td><td>{payment.studentId}</td><td>{fmtMoney(payment.amount)}</td><td><span className={`pill ${payment.status === 'ENREGISTRE' ? 'pill-success' : 'pill-warning'}`}>{payment.status}</span>{cancellation && <div className="cell-sub">{cancellation.reason}</div>}</td><td>{receipt?.reference ?? '—'} {payment.status === 'ENREGISTRE' && perms.permissions.includes('payment.cancel') && <button className="btn btn-sm btn-outline" onClick={() => { const reason = prompt("Motif d'annulation"); if (reason) cancelPayment(payment.id, reason); }}>Annuler</button>}</td></tr>; })}</tbody></table></div></div>
        </div>
      )}

      {/* ── SUBTAB: fin_reports (Rapports Financiers) ── */}
      {currentSubTab === 'fin_reports' && (
        <div>
          <div className="module-header">
            <h1>Rapports financiers</h1>
            <p>Rapports d'encaissement et de recouvrement destinés aux rôles financiers autorisés et à la Direction Générale.</p>
          </div>
          <FinancialSituationPanel students={students} role={activeRole} />
        </div>
      )}
    </div>
  );
}
