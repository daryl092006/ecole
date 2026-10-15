import type {RelationalSnapshot, DatabaseRow, PersistentChange} from '@/types/persistence';
export interface YearPreparationCheck {key:string;label:string;ready:boolean;href:string;detail?:string;}

export interface ReconductConfigSummary {
  previousYear: { id: string; name: string };
  offeringsCount: number;
  groupsCount: number;
  feesCount: number;
  tuitionCount: number;
  registrationCount: number;
  paymentChannelsCount: number;
  totalCount: number;
  offerings: string[];
  groups: string[];
  fees: string[];
  tuitionFees: string[];
  registrationFees: string[];
  paymentChannels: string[];
  rawOfferings?: DatabaseRow[];
  rawGroups?: DatabaseRow[];
  rawFees?: DatabaseRow[];
  rawChannels?: DatabaseRow[];
}

export function suggestNextAcademicYear(years: DatabaseRow[]): {
  code: string;
  name: string;
  starts_on: string;
  ends_on: string;
  previousYear: DatabaseRow | null;
} {
  const activeYears = (years || []).filter(y => !y.archived_at);
  if (!activeYears.length) {
    const y = new Date().getFullYear();
    return {
      code: `${y}-${y + 1}`,
      name: `${y}-${y + 1}`,
      starts_on: `${y}-09-01`,
      ends_on: `${y + 1}-06-30`,
      previousYear: null,
    };
  }

  const sorted = [...activeYears].sort((a, b) => String(b.starts_on || '').localeCompare(String(a.starts_on || '')));
  const latest = sorted[0];

  const match = String(latest.name || '').match(/^(\d{4})-(\d{4})$/);
  let nextStartYear: number;
  let nextEndYear: number;
  if (match) {
    nextStartYear = Number(match[2]);
    nextEndYear = nextStartYear + 1;
  } else {
    nextStartYear = new Date().getFullYear();
    nextEndYear = nextStartYear + 1;
  }

  const shiftDate = (dateStr: string): string => {
    const dMatch = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dMatch) {
      const year = Number(dMatch[1]) + 1;
      const month = dMatch[2];
      const day = dMatch[3];
      if (month === '02' && day === '29') return `${year}-02-28`;
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const starts_on = shiftDate(String(latest.starts_on || '')) || `${nextStartYear}-09-01`;
  const ends_on = shiftDate(String(latest.ends_on || '')) || `${nextEndYear}-06-30`;

  return {
    code: `${nextStartYear}-${nextEndYear}`,
    name: `${nextStartYear}-${nextEndYear}`,
    starts_on,
    ends_on,
    previousYear: latest,
  };
}

export function getPreviousYearConfigSummary(snapshot: RelationalSnapshot, previousYearId: string): ReconductConfigSummary | null {
  const rows = (table: string) => snapshot.tables[table] || [];
  const prevYear = rows('academic_years').find(y => y.id === previousYearId && !y.archived_at);
  if (!prevYear) return null;

  const annual = (table: string) => rows(table).filter(row => row.academic_year_id === previousYearId && !row.archived_at);
  const prevOfferings = annual('academic_offerings');
  const prevGroups = annual('groups');
  const prevGroupOfferings = annual('group_offerings');
  const prevFees = annual('annual_fee_schedules');
  const prevChannels = annual('annual_payment_channels');

  const curricula = new Map(rows('curricula').map(c => [c.id, c]));
  const programs = new Map(rows('programs').map(p => [p.id, p]));
  const levels = new Map(rows('levels').map(l => [l.id, l]));

  const offerings = prevOfferings.map(o => {
    const curr = curricula.get(String(o.curriculum_id));
    const prog = curr ? programs.get(String(curr.program_id)) : null;
    const lvl = levels.get(String(o.level_id));
    const parts = [prog?.name || 'Formation', lvl?.name, o.delivery_mode].filter(Boolean);
    return parts.join(' · ');
  });

  const groups = prevGroups.map(g => {
    const lvl = levels.get(String(g.level_id));
    const linkedOfferings = prevGroupOfferings.filter(link => link.group_id === g.id);
    const linkedNames = linkedOfferings.map(link => {
      const off = prevOfferings.find(o => o.id === link.offering_id);
      const curr = off ? curricula.get(String(off.curriculum_id)) : null;
      const prog = curr ? programs.get(String(curr.program_id)) : null;
      return prog?.name || 'Filière';
    }).filter(Boolean);
    const uniqueLinked = [...new Set(linkedNames)];
    return `${g.name}${lvl ? ` (${lvl.name})` : ''}${uniqueLinked.length ? ` : ${uniqueLinked.join(', ')}` : ''}`;
  });

  const tuitionFees: string[] = [];
  const registrationFees: string[] = [];
  const fees = prevFees.map(f => {
    const prog = f.program_id ? programs.get(String(f.program_id)) : null;
    const lvl = f.level_id ? levels.get(String(f.level_id)) : null;
    const scope = [prog?.name, lvl?.name, f.delivery_mode].filter(Boolean).join(' · ');
    const desc = `${f.category === 'INSCRIPTION' ? 'Frais d’inscription' : 'Frais de scolarité'} : ${Number(f.amount).toLocaleString('fr-FR')} FCFA${scope ? ` (${scope})` : ' (Général)'}`;
    if (f.category === 'INSCRIPTION') {
      registrationFees.push(desc);
    } else {
      tuitionFees.push(desc);
    }
    return desc;
  });

  const paymentChannels = prevChannels.map(c => `${c.name} (${c.method})`);

  const rawOfferings = prevOfferings.map(o => {
    const curr = curricula.get(String(o.curriculum_id));
    const prog = curr ? programs.get(String(curr.program_id)) : null;
    const lvl = levels.get(String(o.level_id));
    return {
      ...o,
      _programName: prog?.name || 'Formation',
      _curriculumName: prog?.name || curr?.name || 'Maquette',
      _levelName: lvl?.name || 'Niveau',
    };
  });

  const rawGroups = prevGroups.map(g => {
    const lvl = levels.get(String(g.level_id));
    const linkedOfferings = prevGroupOfferings.filter(link => link.group_id === g.id);
    const linkedNames = linkedOfferings.map(link => {
      const off = prevOfferings.find(o => o.id === link.offering_id);
      const curr = off ? curricula.get(String(off.curriculum_id)) : null;
      const prog = curr ? programs.get(String(curr.program_id)) : null;
      return prog?.name || 'Filière';
    }).filter(Boolean);
    const uniqueLinked = [...new Set(linkedNames)];
    return {
      ...g,
      _levelName: lvl?.name || 'Niveau',
      _associatedOfferings: uniqueLinked.join(' ; '),
    };
  });

  const rawFees = prevFees.map(f => {
    const prog = f.program_id ? programs.get(String(f.program_id)) : null;
    const lvl = f.level_id ? levels.get(String(f.level_id)) : null;
    return {
      ...f,
      _programName: prog?.name || '',
      _levelName: lvl?.name || '',
    };
  });

  const rawChannels = prevChannels.map(c => ({
    ...c,
  }));

  return {
    previousYear: { id: prevYear.id, name: String(prevYear.name) },
    offeringsCount: prevOfferings.length,
    groupsCount: prevGroups.length,
    feesCount: prevFees.length,
    tuitionCount: prevFees.filter(f => f.category === 'SCOLARITE').length,
    registrationCount: prevFees.filter(f => f.category === 'INSCRIPTION').length,
    paymentChannelsCount: prevChannels.length,
    totalCount: prevOfferings.length + prevGroups.length + prevFees.length + prevChannels.length,
    offerings,
    groups,
    fees,
    tuitionFees,
    registrationFees,
    paymentChannels,
    rawOfferings,
    rawGroups,
    rawFees,
    rawChannels,
  };
}

export function getStepPreFilledItems(step: string, summary: ReconductConfigSummary | null | undefined): string[] {
  if (!summary) return [];
  switch (step) {
    case 'offerings': return summary.offerings || [];
    case 'groups': return summary.groups || [];
    case 'tuition': return summary.tuitionFees || [];
    case 'registration': return summary.registrationFees || [];
    case 'payments': return summary.paymentChannels || [];
    default: return [];
  }
}

export function collectionToStep(collection: string, category?: string): 'offerings' | 'groups' | 'tuition' | 'registration' | 'payments' | null {
  if (collection === 'academic_offerings') return 'offerings';
  if (collection === 'groups') return 'groups';
  if (collection === 'annual_payment_channels') return 'payments';
  if (collection === 'annual_fee_schedules') {
    if (category === 'INSCRIPTION') return 'registration';
    return 'tuition';
  }
  return null;
}

export function buildReconductChanges(
  snapshot: RelationalSnapshot,
  previousYearId: string,
  targetYearId: string,
  reason: string,
  step?: 'offerings' | 'groups' | 'tuition' | 'registration' | 'payments'
): PersistentChange[] {
  const rows = (table: string) => snapshot.tables[table] || [];
  const changes: PersistentChange[] = [];

  const existingTargetOfferings = rows('academic_offerings').filter(row => row.academic_year_id === targetYearId && !row.archived_at);
  const existingTargetGroups = rows('groups').filter(row => row.academic_year_id === targetYearId && !row.archived_at);
  const existingTargetGroupOfferings = rows('group_offerings').filter(row => row.academic_year_id === targetYearId && !row.archived_at);
  const existingTargetFees = rows('annual_fee_schedules').filter(row => row.academic_year_id === targetYearId && !row.archived_at);
  const existingTargetChannels = rows('annual_payment_channels').filter(row => row.academic_year_id === targetYearId && !row.archived_at);

  const prevOfferings = rows('academic_offerings').filter(row => row.academic_year_id === previousYearId && !row.archived_at);
  const prevGroups = rows('groups').filter(row => row.academic_year_id === previousYearId && !row.archived_at);
  const prevGroupOfferings = rows('group_offerings').filter(row => row.academic_year_id === previousYearId && !row.archived_at);
  const prevFees = rows('annual_fee_schedules').filter(row => row.academic_year_id === previousYearId && !row.archived_at);
  const prevChannels = rows('annual_payment_channels').filter(row => row.academic_year_id === previousYearId && !row.archived_at);

  const offeringIdMap = new Map<string, string>();
  for (const offering of prevOfferings) {
    const existing = existingTargetOfferings.find(row =>
      row.curriculum_id === offering.curriculum_id &&
      row.level_id === offering.level_id &&
      (row.delivery_mode || '') === (offering.delivery_mode || '')
    );
    if (existing) {
      offeringIdMap.set(offering.id, existing.id);
    } else {
      const newId = crypto.randomUUID();
      offeringIdMap.set(offering.id, newId);
      if (!step || step === 'offerings') {
        changes.push({
          table: 'academic_offerings',
          operation: 'insert',
          record: {
            id: newId,
            academic_year_id: targetYearId,
            curriculum_id: offering.curriculum_id,
            level_id: offering.level_id,
            delivery_mode: offering.delivery_mode || null,
            reason,
          },
        });
      }
    }
  }

  const groupIdMap = new Map<string, string>();
  for (const group of prevGroups) {
    const existing = existingTargetGroups.find(row =>
      row.name === group.name &&
      row.level_id === group.level_id
    );
    if (existing) {
      groupIdMap.set(group.id, existing.id);
    } else {
      const newId = crypto.randomUUID();
      groupIdMap.set(group.id, newId);
      if (!step || step === 'groups') {
        changes.push({
          table: 'groups',
          operation: 'insert',
          record: {
            id: newId,
            academic_year_id: targetYearId,
            name: group.name,
            level_id: group.level_id,
            reason,
          },
        });
      }
    }
  }

  if (!step || step === 'groups') {
    for (const link of prevGroupOfferings) {
      const prevGroupId = String(link.group_id || '');
      const prevOfferingId = String(link.offering_id || '');
      const newGroupId = groupIdMap.get(prevGroupId);
      const newOfferingId = offeringIdMap.get(prevOfferingId);
      if (newGroupId && newOfferingId) {
        const existing = existingTargetGroupOfferings.find(row =>
          row.group_id === newGroupId &&
          row.offering_id === newOfferingId
        );
        if (!existing) {
          changes.push({
            table: 'group_offerings',
            operation: 'insert',
            record: {
              id: crypto.randomUUID(),
              academic_year_id: targetYearId,
              group_id: newGroupId,
              offering_id: newOfferingId,
              level_id: link.level_id,
              reason,
            },
          });
        }
      }
    }
  }

  for (const fee of prevFees) {
    if (step === 'tuition' && fee.category !== 'SCOLARITE') continue;
    if (step === 'registration' && fee.category !== 'INSCRIPTION') continue;
    if (step && step !== 'tuition' && step !== 'registration') continue;

    const existing = existingTargetFees.find(row =>
      row.category === fee.category &&
      (row.program_id || null) === (fee.program_id || null) &&
      (row.level_id || null) === (fee.level_id || null) &&
      (row.delivery_mode || null) === (fee.delivery_mode || null)
    );
    if (!existing) {
      changes.push({
        table: 'annual_fee_schedules',
        operation: 'insert',
        record: {
          id: crypto.randomUUID(),
          academic_year_id: targetYearId,
          category: fee.category,
          program_id: fee.program_id || null,
          level_id: fee.level_id || null,
          delivery_mode: fee.delivery_mode || null,
          amount: fee.amount,
          reason,
        },
      });
    }
  }

  if (!step || step === 'payments') {
    for (const channel of prevChannels) {
      const existing = existingTargetChannels.find(row =>
        row.method === channel.method &&
        row.name === channel.name
      );
      if (!existing) {
        changes.push({
          table: 'annual_payment_channels',
          operation: 'insert',
          record: {
            id: crypto.randomUUID(),
            academic_year_id: targetYearId,
            name: channel.name,
            method: channel.method,
            reason,
          },
        });
      }
    }
  }

  return changes;
}

export function yearPreparation(snapshot:RelationalSnapshot,yearId:string):YearPreparationCheck[]{
  const rows=(table:string)=>snapshot.tables[table] || [];
  const annual=(table:string)=>rows(table).filter(row=>row.academic_year_id===yearId && !row.archived_at);
  const offerings=annual('academic_offerings');
  const groups=annual('groups');const fees=annual('annual_fee_schedules');
  const covered=(category:string)=>offerings.length>0 && offerings.every(offering=>{
    const curriculum=rows('curricula').find(row=>row.id===offering.curriculum_id);
    return fees.some(fee=>fee.category===category && (!fee.program_id || fee.program_id===curriculum?.program_id) && (!fee.level_id || fee.level_id===offering.level_id) && (!fee.delivery_mode || fee.delivery_mode===offering.delivery_mode));
  });
  return [
    {key:'offerings',label:'Filières et niveaux proposés cette année',ready:offerings.length>0,detail:offerings.length ? `${offerings.length} formation(s) proposée(s).` : 'Ajoutez au moins une formation pour cette année ; réutilisez les filières et niveaux existants.',href:'/academique/referentiel?collection=academic_offerings'},
    {key:'groups',label:'Groupes reliés aux formations annuelles',detail:'Chaque formation proposée doit disposer d’un groupe rattaché pour cette année.',ready:offerings.length>0 && offerings.every(offering=>rows('group_offerings').some(link=>link.offering_id===offering.id && groups.some(group=>group.id===link.group_id))),href:'/academique/referentiel?collection=group_offerings'},
    {key:'tuition',label:'Frais de scolarité pour chaque formation',detail:'Un tarif commun suffit s’il s’applique à toutes les formations ; sinon, précisez filière et niveau.',ready:covered('SCOLARITE'),href:'/finance/contrats'},
    {key:'registration',label:'Frais d’inscription pour chaque formation',detail:'Un tarif commun ou des tarifs par filière et niveau doivent couvrir les formations proposées.',ready:covered('INSCRIPTION'),href:'/finance/contrats'},
    {key:'payments',label:'Modes et caisses de paiement',detail:'Renseignez uniquement les moyens de paiement qui seront effectivement utilisés cette année.',ready:annual('annual_payment_channels').length>0,href:'/finance/contrats?collection=annual_payment_channels'},
  ];
}
export function assertYearPrepared(snapshot:RelationalSnapshot,yearId:string){
  const missing=yearPreparation(snapshot,yearId).filter(check=>!check.ready);
  if(missing.length)throw new Error(`Année non prête : ${missing.map(check=>check.label).join(' ; ')}.`);
}
