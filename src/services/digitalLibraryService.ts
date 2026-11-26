import type { RoleName } from '@/types/permissions';

export interface YouScribeTeamConfig {
  teamIndex: number;
  teamEmail: string;
  activationCode: string;
  youScribePassword: string;
  m365Password: string;
}

/**
 * 19 comptes partagés YouScribe de l'ESCEN (issus de Bibliothèque - COMBINE.pdf).
 * Chaque compte partagé dispose de 5 places simultanées.
 * Note : On ignore les adresses Gmail personnelles du fichier d'origine ; l'attribution
 * se fait exclusivement via l'identité de l'étudiant régulièrement inscrit sur l'année
 * académique courante (2026-2027). Les places des anciens étudiants non réinscrits
 * sont automatiquement réattribuées aux autres étudiants régulièrement inscrits.
 */
export const YOUSCRIBE_TEAMS: readonly YouScribeTeamConfig[] = [
  { teamIndex: 0, teamEmail: 'biblioteam@escen.university', activationCode: 'P1X702I1-66708', youScribePassword: 'Nslt0dlbndee2026', m365Password: 'QF3@vZWKxcNmnyU' },
  { teamIndex: 1, teamEmail: 'biblioteam1@escen.university', activationCode: 'OJPSEZXU-66708', youScribePassword: 'Ooae1eaiusn2026', m365Password: '7P6Gsr5da@BzLwK' },
  { teamIndex: 2, teamEmail: 'biblioteam2@escen.university', activationCode: 'ZWPTQ0OL-66708', youScribePassword: 'Umla2dmbdce2026', m365Password: 'a5r58fZFWxe@Cef' },
  { teamIndex: 3, teamEmail: 'biblioteam3@escen.university', activationCode: 'OVQSCSS2-66708', youScribePassword: 'Ii3bkaRJLhcH', m365Password: 'QQ2Rt@q7ebbB@hb' },
  { teamIndex: 4, teamEmail: 'biblioteam4@escen.university', activationCode: '9NOB1B5H-66708', youScribePassword: 'aoj2j59dy4Vy', m365Password: 'U4@Nj66u3LV5X@M' },
  { teamIndex: 5, teamEmail: 'biblioteam5@escen.university', activationCode: 'O0YKYMEF-66708', youScribePassword: '6AWwnw5hQD3w', m365Password: 'qZQZ@Ein8xU7@Ep' },
  { teamIndex: 6, teamEmail: 'biblioteam6@escen.university', activationCode: '5URJZY8K-66708', youScribePassword: '4EWZNOwzQwt', m365Password: 'D@Gdr95hbt4jH7i' },
  { teamIndex: 7, teamEmail: 'biblioteam7@escen.university', activationCode: '1UZD1DBM-66708', youScribePassword: 'TMi4pNVPVYIz', m365Password: '9nv@JXWP@g443fq' },
  { teamIndex: 8, teamEmail: 'biblioteam8@escen.university', activationCode: 'O2VKOASO-66708', youScribePassword: 'hUwWI27EugW', m365Password: '3Cm@94ZDtmt6Td@' },
  { teamIndex: 9, teamEmail: 'biblioteam9@escen.university', activationCode: '6GGMB7BO-66708', youScribePassword: '3HcTDi6&Yw8m', m365Password: 'yqjpS@c8CwaYzz6' },
  { teamIndex: 10, teamEmail: 'biblioteam10@escen.university', activationCode: 'BXIRT699-66708', youScribePassword: '0nv1EC8fGx6g', m365Password: '4xxUP7DqC8hp@Kb' },
  { teamIndex: 11, teamEmail: 'biblioteam11@escen.university', activationCode: 'P5KJLLF7-66708', youScribePassword: 'tpkfvjcdzDID', m365Password: 'QR@J9Z5kGKQRDir' },
  { teamIndex: 12, teamEmail: 'biblioteam12@escen.university', activationCode: 'GV6SR183-66708', youScribePassword: 'xOQZuuKG3CBs', m365Password: 'bq4ex@2S2bQhDMW' },
  { teamIndex: 13, teamEmail: 'biblioteam13@escen.university', activationCode: '6AKMNOIJ-66708', youScribePassword: '7Zn0Jqt5dNt1', m365Password: 'BdSPRRd4m3UBv@Y' },
  { teamIndex: 14, teamEmail: 'biblioteam14@escen.university', activationCode: 'B30LGKF8-66708', youScribePassword: '5FByCJAH04DE', m365Password: 'ji8M4y@PXRVbBz8' },
  { teamIndex: 15, teamEmail: 'biblioteam15@escen.university', activationCode: 'IEX6QLB0-66708', youScribePassword: 'MDvAOvq4vCtB', m365Password: '@9DftLGk@EW9U66' },
  { teamIndex: 16, teamEmail: 'biblioteam16@escen.university', activationCode: '96OVIH61-66708', youScribePassword: 'ks9i)izL,,5S', m365Password: 'Bifpuj-3befxo-mymxid' },
  { teamIndex: 17, teamEmail: 'biblioteam17@escen.university', activationCode: 'EBRIQROV-66708', youScribePassword: '*MppIses$oSj', m365Password: 'GF9QmK@B9w2VhFP' },
  { teamIndex: 18, teamEmail: 'biblioteam18@escen.university', activationCode: 'UAJQ9JDJ-66708', youScribePassword: 'PZpRSXH;FRog', m365Password: 'n7AAyC@At3AAb34' },
] as const;

export const YOUSCRIBE_INITIAL_HOLDERS: ReadonlyArray<{ fullName: string; teamIndex: number; customYsPassword?: string }> = [
  { fullName: 'ADEPOHA Komlan Victor', teamIndex: 0 },
  { fullName: 'ADJIGNON Komi Del Pierro', teamIndex: 0 },
  { fullName: 'ADOBOE Comlan Julien', teamIndex: 0 },
  { fullName: 'AFANOU Yao Pierre Paul', teamIndex: 0 },
  { fullName: 'AFANOU Sylvia', teamIndex: 0 },

  { fullName: 'AGBEHADJI Koami Samuel', teamIndex: 1 },
  { fullName: 'AKAKPO Yawavi Ghislaine', teamIndex: 1 },
  { fullName: 'GBLAGUIDJI Akouavi', teamIndex: 1 },
  { fullName: 'KOUESSAN Akossiwa R.', teamIndex: 1 },
  { fullName: 'MIJIYAWA Taoufick', teamIndex: 1 },

  { fullName: "d'ALMEIDA Ayélé Marianne", teamIndex: 2 },
  { fullName: 'KOUDJRAKO Holali Yawa', teamIndex: 2 },
  { fullName: 'AMOULE Yawo Alphonse', teamIndex: 2 },
  { fullName: 'AMAVI Yves Daniel', teamIndex: 2 },
  { fullName: 'AMEDOME Y. Jérôme', teamIndex: 2 },

  { fullName: 'AZIATOUWO Koffi Amen', teamIndex: 3 },
  { fullName: 'MESSAN Akpedje Antoinette', teamIndex: 3 },
  { fullName: 'APATIO Beni de Dieu', teamIndex: 3 },
  { fullName: 'ATCHOU Valérie', teamIndex: 3 },
  { fullName: 'MESSAN Dédé Egnonam Aubine', teamIndex: 3 },

  { fullName: 'AZIMEVI Yawa Victoire', teamIndex: 4 },
  { fullName: 'EFFOSSO Allan', teamIndex: 4 },
  { fullName: "BATADJA Fêkand'N Shalom", teamIndex: 4 },
  { fullName: 'DJATO Bougonou', teamIndex: 4 },
  { fullName: 'DOUNYO Komlan Augustin', teamIndex: 4 },

  { fullName: 'KLOUVI Folly Ceoute Didace Caritas', teamIndex: 5 },
  { fullName: 'AKPAHLIN Silété Joachim Celfid', teamIndex: 5 },
  { fullName: 'SINFOIKI Bandao Christ Roi', teamIndex: 5 },
  { fullName: 'AZALEKO Amivi Clarisse', teamIndex: 5 },
  { fullName: "N'TSOUKPO Komla Daniel", teamIndex: 5 },

  { fullName: 'GABA Ayélé Daniella Gracia', teamIndex: 6 },
  { fullName: 'MAKAYA NDJIMBI Georges D A', teamIndex: 6 },
  { fullName: 'DAYI Adjo', teamIndex: 6 },
  { fullName: 'KENKOU Afi M. Delphine', teamIndex: 6 },
  { fullName: 'DJINSO Komi Emmanuel', teamIndex: 6 },

  { fullName: 'DJOBOKOU Kokou Camille', teamIndex: 7 },
  { fullName: 'DOGLA Koudjo Pacôme Elom', teamIndex: 7 },
  { fullName: 'LOGOSSOU Amégnona Gérard', teamIndex: 7 },
  { fullName: 'KLOUTSE Ayélé Bénédicte', teamIndex: 7 },
  { fullName: 'TOHENOU Kokou Espoir', teamIndex: 7 },

  { fullName: 'AMAVI Ameyo Félicia', teamIndex: 8 },
  { fullName: 'GABA Kossi Benoit', teamIndex: 8 },
  { fullName: 'AGBA Yao Gédéon', teamIndex: 8 },
  { fullName: 'ESSEH Abla Grâce', teamIndex: 8 },
  { fullName: 'JOHNSON Gracia Karryl Aba', teamIndex: 8 },

  { fullName: 'GUIHINI Fatimé', teamIndex: 9 },
  { fullName: 'HLOINVI Ayaovi Yekobed', teamIndex: 9 },
  { fullName: 'BEBEWOU Yawa', teamIndex: 9 },
  { fullName: 'ISSIFOU Soulemane', teamIndex: 9 },
  { fullName: 'HOUNKPE Komlanvi Jean de Dieu', teamIndex: 9 },

  { fullName: 'GABA Adama Jean-Pierre', teamIndex: 10 },
  { fullName: "N'FEIDE Pizikilé Payébinam", teamIndex: 10 },
  { fullName: 'KPOBIE Manawè Joceline', teamIndex: 10 },
  { fullName: 'KOTCHE Kodjo Tsèvi Marcelin', teamIndex: 10 },
  { fullName: 'SENA Kokoè Jacqueline', teamIndex: 10 },

  { fullName: "d'ALMEIDA Kokoe Diine", teamIndex: 11 },
  { fullName: 'KOUDAKPO Komi Rodrigue', teamIndex: 11 },
  { fullName: 'KOULOU Asséname Sylvie', teamIndex: 11 },
  { fullName: 'SOMA Abdou Latifou', teamIndex: 11 },
  { fullName: 'ASSOUMANI Moïse Séraphin', teamIndex: 11 },

  { fullName: 'AMEGANVI Yao Paul', teamIndex: 12 },
  { fullName: 'PILIZIWE Essoklina', teamIndex: 12 },
  { fullName: 'OUMAROU SOULEY Ramatou', teamIndex: 12 },
  { fullName: 'CADIRY Ramadan', teamIndex: 12 },
  { fullName: 'GARBA Ridwoine', teamIndex: 12 },

  { fullName: 'SAKPA Komi Alexandre', teamIndex: 13, customYsPassword: '7Zn0Jqt5dNt1' },
  { fullName: 'LOGOSSOU Ami', teamIndex: 13, customYsPassword: '7Zn0Jqt5dNt2' },
  { fullName: 'SOMBORN Cedric Mario', teamIndex: 13, customYsPassword: '7Zn0Jqt5dNt3' },
  { fullName: 'TETE TCHEYI Apéfa E. R.', teamIndex: 13, customYsPassword: '7Zn0Jqt5dNt4' },
  { fullName: 'HEGNON Komi Thierry', teamIndex: 13, customYsPassword: '7Zn0Jqt5dNt5' },

  { fullName: 'TONA Kossivi', teamIndex: 14 },
  { fullName: 'KESSOUGBO Amavi', teamIndex: 14 },
  { fullName: 'BOUDJOGA Wèwèma Thierry Benjamin', teamIndex: 14 },
  { fullName: 'YAMBA Bérénice', teamIndex: 14 },
  { fullName: 'HASSANE Ouzebatou Zeyna', teamIndex: 14 },

  { fullName: 'YEDENA Dikowoulma Pedro', teamIndex: 15 },
  { fullName: 'BEDZRA Akou Yvette', teamIndex: 15 },
  { fullName: 'GNALETASSI Ayawo Boris', teamIndex: 15 },
  { fullName: 'TAHIROU Moussa', teamIndex: 15 },
  { fullName: 'TONOU Kossiwa Léontine', teamIndex: 15 },

  { fullName: 'ABALO mawuegnon', teamIndex: 16 },
  { fullName: 'ADZRI Abla', teamIndex: 16 },
  { fullName: 'AKAKPO Sika Laure', teamIndex: 16 },
  { fullName: 'ADZODI Prudence', teamIndex: 16 },
  { fullName: 'ALLABI Jean Luc Ampere Segnon', teamIndex: 16 },

  { fullName: 'BANAYAL SARMADJI ACHILLE', teamIndex: 17 },
  { fullName: 'BROU Kadjo Ange Vinnie', teamIndex: 17 },
  { fullName: 'GOLI Wilfried', teamIndex: 17 },
  { fullName: 'kpabeba Koffivi Djiedjom', teamIndex: 17 },
  { fullName: 'NKUIDJEU TOUKAP FRANK PATRICK', teamIndex: 17 },

  { fullName: 'PIOU Ayighan', teamIndex: 18 },
  { fullName: 'TAMAKLOE Mawussi Marc', teamIndex: 18 },
  { fullName: 'KACOU OI YOUAN ANGE Wilfried', teamIndex: 18 },
  { fullName: 'INSA MAMOUDOU Mariama', teamIndex: 18 },
];

export interface StudentLibraryAllocation {
  studentId: string;
  matricule: string;
  studentName: string;
  groupName: string;
  enrollmentStatus: string;
  teamEmail: string;
  youScribePassword: string;
  m365Password: string;
  activationCode: string;
  allocationKind: 'TITULAIRE_INITIAL' | 'REATTRIBUE_2026_2027';
  replacedHolderName?: string;
}

export interface EnrolledStudentCandidate {
  studentId: string;
  matricule: string;
  firstname: string;
  lastname: string;
  groupName: string;
  enrollmentStatus: string;
}

const normalizeName = (value: string): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Calcule la répartition officielle des accès YouScribe pour l'année scolaire consultée :
 * 1. Seuls les étudiants régulièrement inscrits (INSCRIT ou REINSCRIT) sur l'année active reçoivent un accès.
 * 2. Les étudiants déjà titulaires d'un compte biblioteam dans le fichier initial et qui sont régulièrement
 *    inscrits cette année conservent exactement leur compte biblioteam et son mot de passe.
 * 3. Les places des personnes qui ne sont pas inscrites cette année scolaire sont automatiquement libérées
 *    et réattribuées aux autres étudiants régulièrement inscrits cette année (triés par matricule).
 */
export function computeLibraryAllocations(
  enrolledStudents: EnrolledStudentCandidate[]
): StudentLibraryAllocation[] {
  const activeStudents = [...enrolledStudents]
    .filter(s => s.lastname.toUpperCase() !== 'TEST')
    .sort((a, b) => a.lastname.localeCompare(b.lastname, 'fr') || a.firstname.localeCompare(b.firstname, 'fr'));

  const assignedStudentIds = new Set<string>();
  const allocations: StudentLibraryAllocation[] = [];
  const freeSlots: Array<{ team: YouScribeTeamConfig; ysPassword: string; formerHolder: string }> = [];

  for (const holder of YOUSCRIBE_INITIAL_HOLDERS) {
    const team = YOUSCRIBE_TEAMS[holder.teamIndex];
    if (!team) continue;
    const ysPassword = holder.customYsPassword || team.youScribePassword;
    const nHolder = normalizeName(holder.fullName);
    const holderTokens = nHolder.split(' ').filter(t => t.length > 1);

    let bestMatch: EnrolledStudentCandidate | null = null;
    let bestScore = 0;

    for (const st of activeStudents) {
      if (assignedStudentIds.has(st.studentId)) continue;
      const full1 = normalizeName(`${st.lastname} ${st.firstname}`);
      const full2 = normalizeName(`${st.firstname} ${st.lastname}`);
      if (full1 === nHolder || full2 === nHolder) {
        bestMatch = st;
        bestScore = 100;
        break;
      }
      const stTokens = full1.split(' ').filter(t => t.length > 1);
      const lastNorm = normalizeName(st.lastname);
      const lastParts = lastNorm.split(' ').filter(t => t.length > 1);
      const lastMatched = nHolder.includes(lastNorm) || lastParts.some(lt => holderTokens.includes(lt));
      if (!lastMatched) continue;

      const common = holderTokens.filter(
        t => stTokens.includes(t) || stTokens.some(stT => stT.startsWith(t) || t.startsWith(stT))
      ).length;
      const score = common / Math.max(holderTokens.length, stTokens.length);
      if (common >= 2 && score > bestScore) {
        bestScore = score;
        bestMatch = st;
      }
    }

    if (bestMatch) {
      assignedStudentIds.add(bestMatch.studentId);
      allocations.push({
        studentId: bestMatch.studentId,
        matricule: bestMatch.matricule,
        studentName: `${bestMatch.lastname} ${bestMatch.firstname}`.trim(),
        groupName: bestMatch.groupName,
        enrollmentStatus: bestMatch.enrollmentStatus,
        teamEmail: team.teamEmail,
        youScribePassword: ysPassword,
        m365Password: team.m365Password,
        activationCode: team.activationCode,
        allocationKind: 'TITULAIRE_INITIAL',
      });
    } else {
      freeSlots.push({
        team,
        ysPassword,
        formerHolder: holder.fullName,
      });
    }
  }

  // Étudiants régulièrement inscrits cette année qui n'avaient pas encore d'accès :
  // on leur attribue les places libérées par les personnes non inscrites cette année
  const remainingEnrolled = activeStudents.filter(st => !assignedStudentIds.has(st.studentId));

  remainingEnrolled.forEach((st, idx) => {
    const slot = idx < freeSlots.length
      ? freeSlots[idx]
      : {
          team: YOUSCRIBE_TEAMS[idx % YOUSCRIBE_TEAMS.length],
          ysPassword: YOUSCRIBE_TEAMS[idx % YOUSCRIBE_TEAMS.length].youScribePassword,
          formerHolder: 'Extension capacité',
        };

    assignedStudentIds.add(st.studentId);
    allocations.push({
      studentId: st.studentId,
      matricule: st.matricule,
      studentName: `${st.lastname} ${st.firstname}`.trim(),
      groupName: st.groupName,
      enrollmentStatus: st.enrollmentStatus,
      teamEmail: slot.team.teamEmail,
      youScribePassword: slot.ysPassword,
      m365Password: slot.team.m365Password,
      activationCode: slot.team.activationCode,
      allocationKind: 'REATTRIBUE_2026_2027',
      replacedHolderName: slot.formerHolder,
    });
  });

  return allocations.sort((a, b) => a.studentName.localeCompare(b.studentName, 'fr'));
}

export function isStaffLibraryViewer(role: RoleName): boolean {
  return !['Étudiant', 'Délégué'].includes(role);
}
