import StudentRecordPanel from '@/components/modules/StudentRecordPanel';
export const metadata = { title: 'Dossier étudiant' };
export default async function StudentRecordPage({ params }: { params: Promise<{ matricule: string }> }) {
  const { matricule } = await params;
  return <StudentRecordPanel studentId={matricule} />;
}
