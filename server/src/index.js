require('dotenv').config()
if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32) throw new Error('Set JWT_SECRET to a value at least 32 characters long.')
const app=require('./app');const port=Number(process.env.PORT)||3000
const {refreshExpiryNotifications}=require('./services/expiryNotifications')
app.listen(port,()=>{console.log(`Stockroom API listening on http://localhost:${port}`);refreshExpiryNotifications().catch(error=>console.error('Expiry notification refresh failed:',error.message));setInterval(()=>refreshExpiryNotifications().catch(error=>console.error('Expiry notification refresh failed:',error.message)),60*60*1000).unref()})
