const express=require('express')
const cors=require('cors')
const { randomUUID }=require('node:crypto')
const api=require('./routes/api')
const errors=require('./middleware/errors')
const app=express()
app.disable('x-powered-by');app.use(cors({origin:process.env.CLIENT_ORIGIN||'http://localhost:5173'}));app.use(express.json({limit:'1mb'}));app.use((req,res,next)=>{req.id=`req_${randomUUID()}`;res.setHeader('X-Request-Id',req.id);next()});app.get('/health',(req,res)=>res.json({status:'ok',service:'stockroom-api'}));app.use('/api/v1',api);app.use((req,res)=>res.status(404).json({status:404,code:'NOT_FOUND',detail:'Route not found.',requestId:req.id}));app.use(errors)
module.exports=app
