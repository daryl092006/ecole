export async function prepareTestYear({ db, insert, yearId, curriculum, level }) {
  let offering = (await db.query('select * from escen.academic_offerings where academic_year_id=$1 and curriculum_id=$2', [yearId, curriculum.id])).rows[0];
  if (!offering) offering = await insert('academic_offerings', { academic_year_id: yearId, curriculum_id: curriculum.id, level_id: level.id });
  const group = await insert('groups', { academic_year_id: yearId, level_id: level.id, name: 'Groupe de preparation' });
  await insert('group_offerings', { group_id: group.id, offering_id: offering.id, academic_year_id: yearId, level_id: level.id });
  for (const category of ['SCOLARITE', 'INSCRIPTION']) await insert('annual_fee_schedules', { academic_year_id: yearId, category, amount: 100, reason: 'Preparation explicite de recette' });
  await insert('annual_payment_channels', { academic_year_id: yearId, name: 'Caisse de recette', method: 'ESPECES', reason: 'Preparation explicite de recette' });
  return offering;
}
