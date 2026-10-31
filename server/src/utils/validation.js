const { HttpError } = require('./errors')
const validate = schema => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (result.success) { req.input = result.data; return next() }
  return next(new HttpError(422, 'VALIDATION_ERROR', 'Review the highlighted fields.', result.error.issues.map(issue => ({ field: issue.path.join('.'), code: issue.code, message: issue.message }))))
}
module.exports = { validate }
