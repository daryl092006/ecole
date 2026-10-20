import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PORTAL_ROUTES, MODULE_PATHS, studentPath } from '../../src/constants/portalRoutes';
import { authenticateFixture, snapshot } from './persistent-fixture';
import { CRUD_CATALOG } from '../../src/data/crudCatalog';

interface ScreenDef {
  key: string;
  name: string;
  href: string;
  isAuth?: boolean;
}

const SCREENS: ScreenDef[] = [
  // Auth screens
  { key: 'auth_connexion', name: 'Connexion', href: '/connexion', isAuth: true },
  { key: 'auth_mot_de_passe_oublie', name: 'Mot de passe oublié', href: '/mot-de-passe-oublie', isAuth: true },
  { key: 'auth_mot_de_passe_reinitialiser', name: 'Réinitialisation mot de passe', href: '/mot-de-passe-reinitialiser', isAuth: true },
  { key: 'auth_mot_de_passe_modifier', name: 'Changement obligatoire de mot de passe', href: '/mot-de-passe-modifier', isAuth: true },

  // Portal screens
  ...PORTAL_ROUTES.map(route => ({
    key: route.section,
    name: route.title,
    href: route.href,
  })),

  // Module landing screens
  { key: 'module_academique', name: 'Accueil Pédagogie', href: MODULE_PATHS.academique },
  { key: 'module_communication', name: 'Accueil Communication', href: MODULE_PATHS.marketing },
  { key: 'module_logistique', name: 'Accueil Logistique', href: MODULE_PATHS.logistique },
  { key: 'module_systeme', name: 'Accueil Système', href: MODULE_PATHS.systeme },

  // Student Record
  { key: 'stud_record_detail', name: 'Fiche & Dossier étudiant', href: studentPath('ESCEN-TEST-001') },
];

const WIDTHS = [360, 390, 768, 1024, 1440];

interface AuditIssue {
  type: 'overflow_page' | 'overflow_container' | 'clipped_text' | 'overlapping' | 'inaccessible_button' | 'table_scroll_in_breakpoint' | 'fixed_width_element';
  description: string;
  selector?: string;
}

interface ScreenResult {
  key: string;
  name: string;
  href: string;
  width: number;
  status: 'OK' | 'PROBLÈME';
  issues: AuditIssue[];
  screenshotPath: string;
}

function buildRichSnapshot() {
  const campus = structuredClone(snapshot);
  const yearId = '10000000-0000-4000-8000-000000000001';
  Object.assign(campus.tables, {
    academic_years: [{ id: yearId, name: '2026-2027', status: 'OUVERTE', starts_on: '2026-10-01', ends_on: '2027-06-30' }],
    programs: [{ id: 'PROG1', name: 'Ingénierie Informatique et Cybersécurité', code: 'INFO' }],
    levels: [{ id: 'L1', name: 'Licence 1ère année', code: 'L1' }],
    academic_offerings: [{ id: 'O1', academic_year_id: yearId, program_id: 'PROG1', level_id: 'L1' }],
    groups: [{ id: 'GROUP1', name: 'Groupe A - Tronc commun', academic_year_id: yearId, level_id: 'L1' }],
    group_offerings: [{ id: 'GO1', group_id: 'GROUP1', offering_id: 'O1' }],
    enrollments: [{ id: 'EN1', student_id: 'S1', offering_id: 'O1' }],
    enrollment_groups: [{ id: 'EG1', enrollment_id: 'EN1', group_id: 'GROUP1' }],
    teaching_assignments: [{ id: 'ASSIGN1', group_id: 'GROUP1', offering_id: 'O1', teacher_id: 'T1' }],
    subjects: [{ id: 'SUBJ1', name: 'Architecture logicielle et microservices', code: 'ARCH-101', academic_year_id: yearId }],
    evaluations: [
      { id: 'EV1', name: 'Contrôle continu 1 - Algorithmique et structures de données avancées', kind: 'DEVOIR', status: 'PUBLIEES', assignment_id: 'ASSIGN1', academic_year_id: yearId },
      { id: 'EV2', name: 'Examen de synthèse premier semestre', kind: 'EXAMEN', status: 'SAISIES', assignment_id: 'ASSIGN1', academic_year_id: yearId },
    ],
    evaluation_candidates: [
      { id: 'CA1', enrollment_id: 'EN1', evaluation_id: 'EV1' },
      { id: 'CA2', enrollment_id: 'EN1', evaluation_id: 'EV2' },
    ],
    grades: [
      { id: 'GR1', candidate_id: 'CA1', value: 16.5, absence_status: 'PRESENT' },
      { id: 'GR2', candidate_id: 'CA2', value: 14.0, absence_status: 'PRESENT' },
    ],
    financial_contracts: [{ id: 'CONTRACT1', enrollment_id: 'EN1', reference: 'CTR-2026-001', currency: 'FCFA' }],
    contract_versions: [{ id: 'VERSION1', contract_id: 'CONTRACT1', status: 'EN_COURS' }],
    contract_lines: [
      { id: 'LINE1', version_id: 'VERSION1', amount: 450000, description: 'Frais de scolarité annuelle' },
      { id: 'LINE2', version_id: 'VERSION1', amount: 50000, description: 'Frais généraux d’inscription' },
    ],
    installments: [
      { id: 'INST1', version_id: 'VERSION1', due_on: '2026-10-15', amount: 200000, paid_amount: 200000, status: 'PAID' },
      { id: 'INST2', version_id: 'VERSION1', due_on: '2027-01-15', amount: 150000, paid_amount: 0, status: 'PENDING' },
      { id: 'INST3', version_id: 'VERSION1', due_on: '2027-04-15', amount: 150000, paid_amount: 0, status: 'PENDING' },
    ],
    payments: [
      { id: 'PAY1', enrollment_id: 'EN1', amount: 200000, status: 'POSTED', reference: 'PAIEMENT-VIR-001', paid_on: '2026-10-10', method: 'VIREMENT', payer_name: 'Parent Élève' },
    ],
    receipts: [{ id: 'REC1', payment_id: 'PAY1', reference: 'REC-2026-0001', issued_at: '2026-10-10' }],
    communications: [
      { id: 'C1', title: 'Organisation et calendrier des délibérations de fin de semestre', content: 'Le planning des jurys et délibérations est en ligne.', academic_year_id: yearId, published_at: '2026-10-01' },
      { id: 'C2', title: 'Fermeture exceptionnelle du campus pour maintenance technique', content: 'Les cours se tiendront à distance ce vendredi.', academic_year_id: yearId, published_at: '2026-10-05' },
    ],
    communication_audiences: [
      { id: 'A1', communication_id: 'C1', all_accounts: true },
      { id: 'A2', communication_id: 'C2', all_accounts: true },
    ],
    sessions: [
      { id: 'SESS1', assignment_id: 'ASSIGN1', group_id: 'GROUP1', starts_at: '2026-10-19T08:00:00Z', ends_at: '2026-10-19T10:00:00Z', status: 'PLANIFIEE' },
      { id: 'SESS2', assignment_id: 'ASSIGN1', group_id: 'GROUP1', starts_at: '2026-10-20T10:00:00Z', ends_at: '2026-10-20T12:00:00Z', status: 'PLANIFIEE' },
    ],
    teachers: [{ id: 'T1', staff_id: 'STAFF1', specialty: 'Génie Logiciel', active: true }],
    staff: [{ id: 'STAFF1', person_id: 'P2', matricule: 'ENS-001' }],
    suppliers: [{ id: 'SUPP1', name: 'Fournitures Bureautique Pro Togo', tax_id: 'TG-1234567', email: 'contact@fournitures.test', phone: '+228 90 00 00 00', active: true }],
    purchases: [{ id: 'PURCH1', supplier_id: 'SUPP1', reference: 'ACH-2026-001', status: 'EN_ATTENTE', reason: 'Équipement du laboratoire réseaux' }],
    assets: [{ id: 'ASSET1', code: 'MAT-SRV-01', name: 'Serveur de virtualisation Dell PowerEdge', location: 'Salle Serveur 1', status: 'DISPONIBLE' }],
    support_tickets: [{ id: 'TICK1', reference: 'SUP-2026-001', title: 'Problème de connexion à la plateforme pédagogique', status: 'OUVERT', priority: 'HAUTE' }],
    support_messages: [{ id: 'MSG1', ticket_id: 'TICK1', body: 'L’étudiant ne parvient pas à réinitialiser son mot de passe.' }],
    complaints: [{ id: 'COMPL1', candidate_id: 'CA1', grade_id: 'GR1', status: 'NOUVELLE', reason: 'Contestation du barème de la question 3' }],
    complaint_events: [{ id: 'CE1', complaint_id: 'COMPL1', from_status: 'NOUVELLE', to_status: 'EN_ANALYSE', reason: 'Prise en charge par la direction académique' }],
  });
  return campus;
}

test.describe.serial('Audit Responsive Exhaustif (360px, 390px, 768px, 1024px, 1440px)', () => {
  test.setTimeout(900000); // 15 mins for all screens & widths

  for (const width of WIDTHS) {
    test(`Audit des ${SCREENS.length} écrans à ${width}px`, async ({ page }) => {
      const allResults: ScreenResult[] = [];
      mkdirSync(`.tmp/screenshots/${width}`, { recursive: true });
      mkdirSync(`tmp/screenshots/${width}`, { recursive: true });

      await page.setViewportSize({ width, height: 900 });

      // Setup common mock routes
      const richSnapshot = buildRichSnapshot();
      await page.route('**/api/campus', route => route.fulfill({ json: richSnapshot }));
      await page.route('**/api/website-management?kind=articles', route => route.fulfill({ json: [
        { id: 'ART1', title: 'Lancement de l’année académique 2026-2027', slug: 'lancement-annee-2026', status: 'PUBLIE', summary: 'Présentation des nouveaux parcours de formation.', published_at: '2026-10-01' }
      ] }));
      await page.route('**/api/website-management*', route => route.fulfill({ json: {
        applications: [
          { id: 'APP1', reference: 'CAND-2026-001', status: 'RECU', identity: { firstname: 'Koffi', lastname: 'Mensah', email: 'koffi@example.test', phone: '90000000' }, program: 'Informatique', level: 'Licence 1' }
        ],
        articles: [],
        intakes: [
          { id: 'INTAKE1', academic_year_id: '10000000-0000-4000-8000-000000000001', level_id: 'L1', program_id: 'PROG1', public_label: 'Licence 1 Informatique', is_open: true }
        ]
      } }));
      await page.route('**/api/website-brochures', route => route.fulfill({ json: [
        { id: 'BROCH1', title: 'Brochure Générale des Formations ESCEN', slug: 'brochure-generale-escen', file_name: 'brochure-escen-2026.pdf', file_size_bytes: 2450000, status: 'PUBLIEE', cycle: 'LICENCE' }
      ] }));
      await page.route('**/api/catalog/*', route => route.fulfill({ json: {
        revision: 1,
        tables: Object.fromEntries(CRUD_CATALOG.map(spec => [spec.key, []])),
        historyLinks: []
      } }));
      await page.route('**/api/staff', route => route.fulfill({ json: {
        revision: 1,
        records: [
          { personId: 'P2', staffId: 'STAFF1', firstname: 'Jean', lastname: 'Technique', email: 'it@example.test', phone: '+228 90 11 22 33', employeeNumber: 'EMP-001', contracts: [{ id: 'SC1', position: 'Administrateur Systèmes' }] }
        ]
      } }));
      await page.route('**/api/subjects', route => route.fulfill({ json: {
        revision: 1,
        subjects: [
          { id: 'SUBJ1', title: 'Architecture des systèmes d’information', nature: 'DEVOIR', duration_minutes: 120, parts: [{ id: 'P1', title: 'Partie 1 : Théorie', questions: [{ id: 'Q1', prompt: 'Définissez la haute disponibilité.', points: 5 }] }] }
        ]
      } }));
      await page.route('**/api/audit*', route => route.fulfill({ json: {
        mode: 'view',
        total: 2,
        offset: 0,
        limit: 50,
        records: [
          { id: 'AUD1', entity: 'evaluations', action: 'UPDATE', actor_name: 'Jean Technique', role_code: 'IT', occurred_at: '2026-10-15T10:30:00Z', reason: 'Validation de l’épreuve', values_before: { status: 'SAISIES' }, values_after: { status: 'VALIDEES' } },
          { id: 'AUD2', entity: 'payments', action: 'INSERT', actor_name: 'RAF ESCEN', role_code: 'RAF', occurred_at: '2026-10-14T14:15:00Z', reason: 'Encaissement virement', values_before: null, values_after: { amount: 200000, reference: 'PAIEMENT-VIR-001' } },
        ]
      } }));
      await page.route('**/api/students/*', route => route.fulfill({ json: {
        student: { personId: 'P1', matricule: 'ESCEN-TEST-001', firstname: 'Alice', lastname: 'Exemple', email: 'alice@example.test', phone: '90123456', nationality: 'Togolaise', sex: 'F', birthDate: '2000-01-01', birthPlace: 'Lomé' },
        activeOfferings: [{ id: 'O1', programName: 'Informatique', levelName: 'Licence 1', groupName: 'Groupe A' }],
        enrollments: [{ id: 'EN1', status: 'INSCRIT', offeringName: 'Licence 1 Informatique' }],
        contracts: [{ id: 'CONTRACT1', expectedAmount: 500000, paidAmount: 200000, remainingAmount: 300000, status: 'EN_COURS' }],
        payments: [{ id: 'PAY1', amount: 200000, paidOn: '2026-10-10', method: 'VIREMENT', reference: 'PAIEMENT-VIR-001', status: 'POSTED' }],
        grades: [{ id: 'GR1', subjectName: 'Architecture logicielle', value: 16.5, status: 'PUBLIEES' }]
      } }));
      await page.route('**/api/academic-years*', route => route.fulfill({ json: {
        currentYearId: '10000000-0000-4000-8000-000000000001',
        selectedYearId: '10000000-0000-4000-8000-000000000001',
        selection: 'current',
        years: [{ id: '10000000-0000-4000-8000-000000000001', name: '2026-2027', status: 'OUVERTE' }]
      } }));
      await page.route('**/api/year-preparation*', route => route.fulfill({ json: {
        academicYearId: '10000000-0000-4000-8000-000000000001',
        yearName: '2026-2027',
        status: 'OUVERTE',
        counts: { programs: 1, levels: 1, offerings: 1, groups: 1, feeSchedules: 1, channels: 1 },
        readiness: { isReady: true, missing: [] }
      } }));
      await page.route('**/api/reenrollments*', route => route.fulfill({ json: {
        candidates: []
      } }));

      // Authenticate as IT (can see everything)
      await authenticateFixture(page);

      for (const screen of SCREENS) {
        await page.goto(screen.href, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(150); // let animations / layout settle

        // Check for loading states to finish
        const loadingSpinner = page.locator('[role=status]').filter({ hasText: /^Chargement/ });
        if (await loadingSpinner.count() > 0) {
          await loadingSpinner.first().waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
        }

        // Run in-browser responsive diagnostic
        const diagnostic = await page.evaluate((vpWidth) => {
          const issues: { type: string; description: string; selector?: string }[] = [];
          const doc = document.documentElement;

          // 1. Page horizontal overflow
          const bodyOverflow = document.body.scrollWidth > vpWidth + 1;
          const docOverflow = doc.scrollWidth > vpWidth + 1 && (document.body.scrollWidth > vpWidth + 1 || window.scrollX > 0);
          if (bodyOverflow || docOverflow) {
            issues.push({
              type: 'overflow_page',
              description: `Débordement horizontal de la page : largeur totale ${Math.max(doc.scrollWidth, document.body.scrollWidth)}px pour un viewport de ${vpWidth}px`
            });
          }

          // 2. Specific container / main overflow
          const main = document.getElementById('main-content') || document.querySelector('main');
          if (main && main.scrollWidth > main.clientWidth + 2) {
            // Check if there is an intended scroll container inside main or main itself overflows
            const style = window.getComputedStyle(main);
            if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
              issues.push({
                type: 'overflow_container',
                description: `Conteneur principal #main-content déborde sans défilement interne : scrollWidth ${main.scrollWidth}px > clientWidth ${main.clientWidth}px`,
                selector: '#main-content'
              });
            }
          }

          // 3. Fixed width elements wider than viewport
          const wideElements = Array.from(document.querySelectorAll<HTMLElement>('*')).filter(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width <= vpWidth + 1) return false;
            // ignore root containers that stretch to doc
            if (el === document.body || el === document.documentElement || el.id === '__next' || el.classList.contains('app-wrapper')) return false;
            const cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            // Check if it's an intended horizontal scroll container or inside one
            if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
            if (el.closest('.table-wrap, .record-sections, .section-tabs, .schedule-calendar-scroll')) return false;
            return true;
          });

          for (const el of wideElements.slice(0, 3)) {
            const tag = el.tagName.toLowerCase();
            const cls = el.className ? `.${Array.from(el.classList).slice(0, 2).join('.')}` : '';
            const id = el.id ? `#${el.id}` : '';
            issues.push({
              type: 'fixed_width_element',
              description: `Élément plus large que le viewport (${Math.round(el.getBoundingClientRect().width)}px > ${vpWidth}px) : <${tag}${id}${cls}>`,
              selector: `${tag}${id}${cls}`
            });
          }

          // 4. Inaccessible / hidden buttons or links
          const interactive = Array.from(document.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([type=hidden]), select, textarea'));
          for (const el of interactive) {
            // Ignore buttons inside horizontal scroll containers (accessible via scroll/swipe)
            if (el.closest('.table-wrap, .record-sections, .section-tabs, .schedule-calendar-scroll')) continue;
            const rect = el.getBoundingClientRect();
            // Visible on screen?
            const cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
            // Pushed outside viewport?
            if (rect.width > 0 && rect.height > 0) {
              if (rect.right < 0 || rect.left > vpWidth + 10) {
                const label = el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('name') || el.tagName;
                issues.push({
                  type: 'inaccessible_button',
                  description: `Contrôle interactif poussé hors de l'écran visible (left=${Math.round(rect.left)}px, right=${Math.round(rect.right)}px) : "${label.slice(0, 40)}"`,
                  selector: el.tagName.toLowerCase()
                });
                break; // one is enough
              }
            }
          }

          // 5. Overlapping buttons / links (z-index or absolute layout glitches)
          const visibleButtons = interactive.filter(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 10 && rect.height > 10 && rect.top >= 0 && rect.bottom <= window.innerHeight + 500;
          });
          for (let i = 0; i < Math.min(visibleButtons.length, 25); i++) {
            for (let j = i + 1; j < Math.min(visibleButtons.length, 25); j++) {
              const a = visibleButtons[i].getBoundingClientRect();
              const b = visibleButtons[j].getBoundingClientRect();
              // Check if they are parent/child
              if (visibleButtons[i].contains(visibleButtons[j]) || visibleButtons[j].contains(visibleButtons[i])) continue;
              const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              const overlapArea = overlapX * overlapY;
              // If significant overlap (>50% of the smaller button)
              const minArea = Math.min(a.width * a.height, b.width * b.height);
              if (overlapArea > minArea * 0.5 && minArea > 100) {
                const labelA = visibleButtons[i].innerText?.trim() || visibleButtons[i].getAttribute('aria-label') || 'BtnA';
                const labelB = visibleButtons[j].innerText?.trim() || visibleButtons[j].getAttribute('aria-label') || 'BtnB';
                issues.push({
                  type: 'overlapping',
                  description: `Chevauchement d'éléments interactifs (${Math.round(overlapArea)}px²) entre "${labelA.slice(0, 30)}" et "${labelB.slice(0, 30)}"`,
                  selector: `${visibleButtons[i].tagName} + ${visibleButtons[j].tagName}`
                });
                break;
              }
            }
          }

          // 6. Table in breakpoint without card transformation (between 640px and 768px)
          if (vpWidth >= 640 && vpWidth <= 768) {
            const tables = Array.from(document.querySelectorAll<HTMLTableElement>('.mobile-record-table, .data-table'));
            for (const table of tables) {
              const rect = table.getBoundingClientRect();
              if (rect.width > vpWidth - 20) {
                issues.push({
                  type: 'table_scroll_in_breakpoint',
                  description: `Tableau à largeur importante (${Math.round(rect.width)}px) à ${vpWidth}px sans transformation en fiches (seuil actuel à 640px au lieu de 768px)`
                });
                break;
              }
            }
          }

          return issues;
        }, width);

        // Take screenshot
        const screenshotPath = `.tmp/screenshots/${width}/${screen.key}.png`;
        const pubScreenshotPath = `tmp/screenshots/${width}/${screen.key}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        // copy or save to tmp/screenshots as well
        try {
          const buf = await page.screenshot({ fullPage: true });
          writeFileSync(pubScreenshotPath, buf);
        } catch {}

        allResults.push({
          key: screen.key,
          name: screen.name,
          href: screen.href,
          width,
          status: diagnostic.length === 0 ? 'OK' : 'PROBLÈME',
          issues: diagnostic as AuditIssue[],
          screenshotPath,
        });
      }

      // Save report for this width
      writeFileSync(`.tmp/screenshots/audit-report-${width}.json`, JSON.stringify(allResults, null, 2));
      writeFileSync(`tmp/screenshots/audit-report-${width}.json`, JSON.stringify(allResults, null, 2));
    });
  }
});
