'use client';
import DetailDrawer from '@/components/ui/DetailDrawer';
import StudentRecordPanel from './StudentRecordPanel';
export default function StudentRecordDialog({matricule,onClose,initialSection}: {matricule: string; onClose: ()=>void; initialSection?: 'identity' | 'finance' | 'parcours'}) {
  return <DetailDrawer title={`Dossier étudiant · ${matricule}`} onClose={onClose}><StudentRecordPanel studentId={matricule} initialSection={initialSection} embedded /></DetailDrawer>;
}
