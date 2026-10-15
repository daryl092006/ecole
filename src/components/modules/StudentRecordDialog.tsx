'use client';
import DetailDrawer from '@/components/ui/DetailDrawer';
import StudentRecordPanel from './StudentRecordPanel';
export default function StudentRecordDialog({matricule,onClose}: {matricule: string; onClose: ()=>void}) {
  return <DetailDrawer title={`Dossier étudiant · ${matricule}`} onClose={onClose}><StudentRecordPanel studentId={matricule} embedded /></DetailDrawer>;
}
