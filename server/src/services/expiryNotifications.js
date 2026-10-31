const { pool, id }=require('./repository')
async function refreshExpiryNotifications(){
  const [rows]=await pool.query('SELECT b.id,b.workspace_id,b.batch_number,DATE_FORMAT(b.expires_at,"%Y-%m-%d") expires_at,p.name product_name,m.user_id recipient_user_id FROM expiry_batches b JOIN products p ON p.id=b.product_id JOIN workspace_memberships m ON m.workspace_id=b.workspace_id AND m.status="ACTIVE" WHERE b.quantity_available>0 AND b.expires_at<=DATE_ADD(UTC_DATE(),INTERVAL 30 DAY)')
  const todayDate=new Date().toISOString().slice(0,10)
  for(const row of rows){const expiryDate=new Date(`${row.expires_at}T00:00:00.000Z`);const expired=row.expires_at<todayDate;const kind=expired?'EXPIRED_BATCH':'EXPIRING_BATCH';const days=Math.ceil((expiryDate.getTime()-Date.parse(`${todayDate}T00:00:00.000Z`))/86400000);await pool.query('INSERT IGNORE INTO notifications(id,workspace_id,recipient_user_id,type,title,message,entity_type,entity_id,dedupe_key) VALUES(?,?,?,?,?,?,?,?,?)',[id(),row.workspace_id,row.recipient_user_id,kind,expired?'Expired stock':'Batch expiring',expired?`${row.product_name} · ${row.batch_number} has expired.`:`${row.product_name} · ${row.batch_number} expires in ${days} days.`,'EXPIRY_BATCH',row.id,`${row.id}:${kind}`])}
}
module.exports={refreshExpiryNotifications}
