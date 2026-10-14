export type SubjectPurpose='CONTROLE_CONTINU'|'EXAMEN'|'RATTRAPAGE';
export interface SubjectOption {label:string;correct:boolean;}
export interface SubjectQuestion {prompt:string;kind:'TEXTE'|'QCM_SIMPLE'|'QCM_MULTIPLE';points:number;options:SubjectOption[];correction:string;}
export interface SubjectPart {title:string;instructions:string;questions:SubjectQuestion[];}
export interface SubjectInput {title:string;instructions:string;durationMinutes:number;purpose:SubjectPurpose;sourceEvaluationRowId:string|null;parts:SubjectPart[];}
export interface PreparedSubject extends SubjectInput {id:string;libraryId:string;version:number;archived:boolean;}
export interface SubjectDirectory {revision:number;subjects:PreparedSubject[];}
