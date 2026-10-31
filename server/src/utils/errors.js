class HttpError extends Error {
  constructor(status, code, detail, errors) { super(detail); this.status = status; this.code = code; this.errors = errors }
}
module.exports = { HttpError }
