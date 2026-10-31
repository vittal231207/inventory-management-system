const jwt = require('jsonwebtoken')
const { pool } = require('../config/database')
const { HttpError } = require('../utils/errors')
const authenticate = (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return next(new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.'))
  try { req.auth = jwt.verify(token, process.env.JWT_SECRET); pool.query('SELECT s.id,m.status FROM user_sessions s JOIN workspace_memberships m ON m.user_id=s.user_id AND m.workspace_id=s.workspace_id JOIN users u ON u.id=s.user_id WHERE u.is_active=1 AND s.id=? AND s.user_id=? AND s.workspace_id=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP() AND m.status="ACTIVE"',[req.auth.sid,req.auth.sub,req.auth.workspaceId]).then(([rows])=>{if(!rows[0])return next(new HttpError(401,'SESSION_REVOKED','Session is no longer active.'));return pool.query('SELECT r.key FROM roles r JOIN membership_roles mr ON mr.role_id=r.id JOIN workspace_memberships m ON m.id=mr.membership_id WHERE m.user_id=? AND m.workspace_id=? AND m.status="ACTIVE"',[req.auth.sub,req.auth.workspaceId])}).then(result=>{if(!Array.isArray(result))return;req.auth.roles=result[0].map(r=>r.key);return next()}).catch(next); }
  catch { return next(new HttpError(401, 'UNAUTHENTICATED', 'The session is invalid or expired.')) }
}
const allow = (...roles) => (req, res, next) => roles.some(role => req.auth?.roles?.includes(role)) ? next() : next(new HttpError(403, 'FORBIDDEN', 'Your role cannot perform this action.'))
module.exports = { authenticate, allow }
