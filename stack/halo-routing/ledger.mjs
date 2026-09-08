// Append semantics over DSH's atomic KV facet. One write chain owns ordering.
export async function openLedger(storage, {backend='json',unitName='halo_routing',queueLimit=256}={}) {
 const unit=await storage.backend.get(backend).kv.open({name:unitName,version:1,tables:['records'],hasGlobal:false});
 const snapshot=await unit.loadAll();const records=new Map(Object.entries(snapshot.tables.records??{}));
 let sequence=Math.max(0,...[...records.values()].map(r=>r.sequence??0));let chain=Promise.resolve();let pending=0;let closed=false;
 const stats={written:0,duplicates:0,dropped:0,errors:0};
 return {
  stats,
  get(id){return records.get(id);},
  values(){return [...records.values()];},
  append(id,record){
   if(closed||pending>=queueLimit){stats.dropped++;return Promise.resolve(false);}
   pending++;
   const task=chain.then(async()=>{
    if(records.has(id)){stats.duplicates++;return false;}
    const row={...structuredClone(record),schemaVersion:1,sequence:sequence+1};
    await unit.putRecord('records',id,row);sequence++;records.set(id,row);stats.written++;return true;
   });
   chain=task.catch(()=>{stats.errors++;}).finally(()=>{pending--;});
   return task;
  },
  async flush(){await chain;},
  async close(){closed=true;await chain;await unit.close();},
 };
}
