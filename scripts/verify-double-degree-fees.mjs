import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

export async function verifyDoubleDegreeFees(db, check, {program, cycle, level, year}) {
  await check('Double diplomation : grilles L1/L2/L3, inscription et tarifs classiques distincts', async()=>{
    await db.exec('begin');
    try {
      await db.query("update escen.programs set code='IA-GL', double_degree_eligible=true where id=$1",[program.id]);
      for(const [code,position] of [['L2',2],['L3',3]]) {
        await db.query('insert into escen.levels(cycle_id,code,name,position) values($1,$2,$2,$3)',[cycle.id,code,position]);
      }
      const sql=await readFile(new URL('../supabase/migrations/202611030083_double_degree_fee_schedules.sql',import.meta.url),'utf8');
      const seed=sql.slice(sql.indexOf('do $$'),sql.indexOf('$$;',sql.indexOf('do $$'))+3);
      await db.exec(seed);
      const fees=(await db.query(`select l.code,f.category,f.amount,f.double_degree from escen.annual_fee_schedules f
        join escen.levels l on l.id=f.level_id where f.academic_year_id=$1 and f.program_id=$2 order by l.code,f.category`,[year.id,program.id])).rows;
      assert.equal(fees.length,6);
      assert.deepEqual(fees.filter(row=>row.category==='SCOLARITE').map(row=>Number(row.amount)),[850000,975000,1100000]);
      assert.ok(fees.every(row=>row.double_degree===true));
      assert.ok(fees.filter(row=>row.category==='INSCRIPTION').every(row=>Number(row.amount)===50000));
      const values=[year.id,program.id,level.id];
      await db.query(`insert into escen.annual_fee_schedules(academic_year_id,program_id,level_id,category,delivery_mode,amount,reason)
        values($1,$2,$3,'SCOLARITE','Présentiel',550000,'Tarif classique conservé')`,values);
      await db.exec('savepoint duplicate_fee');
      await assert.rejects(db.query(`insert into escen.annual_fee_schedules(academic_year_id,program_id,level_id,category,delivery_mode,double_degree,amount,reason)
        values($1,$2,$3,'SCOLARITE','Présentiel',true,850000,'Doublon refusé')`,values),/unique/i);
      await db.exec('rollback to savepoint duplicate_fee');
      assert.equal(Number((await db.query('select amount from escen.annual_fee_schedules where academic_year_id=$1 and program_id=$2 and level_id=$3 and not double_degree',values)).rows[0].amount),550000);
    } finally {await db.exec('rollback');}
  });
}
