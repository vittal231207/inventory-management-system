const { randomUUID } = require('node:crypto')
module.exports = (error, req, res, next) => {
  if (res.headersSent) return next(error)
  const mapped=error.code==='ER_DUP_ENTRY'?{status:409,code:'DUPLICATE_RESOURCE',message:'A record with one of these unique fields already exists.'}:['ER_NO_REFERENCED_ROW_2','ER_ROW_IS_REFERENCED_2'].includes(error.code)?{status:409,code:'RELATED_RESOURCE',message:'This change conflicts with a related workspace record.'}:null
  const status = mapped?.status||Number(error.status)||500
  const code=mapped?.code||error.code||'INTERNAL_ERROR',detail=mapped?.message||(status>=500?'An unexpected error occurred.':error.message)
  if(status>=500)console.error(JSON.stringify({level:'error',requestId:req.id,method:req.method,path:req.path,code,message:error.message,stack:error.stack}))
  const body = { type: 'about:blank', title: status >= 500 ? 'Internal server error' : code || 'Request failed', status, code, detail, requestId: req.id || `req_${randomUUID()}` }
  if (error.errors) body.errors = error.errors
  res.status(status).type('application/problem+json').json(body)
}
