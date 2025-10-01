import { supabase } from '../lib/supabase.js'

// Middleware to verify JWT token and attach user to request
export async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header (format: "Bearer <token>")
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]

    // Verify token with Supabase and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Attach user to request object for use in route handlers
    req.user = user
    req.token = token

    next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

// Optional auth - doesn't block if no token, but attaches user if present
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const { data: { user } } = await supabase.auth.getUser(token)

      if (user) {
        req.user = user
        req.token = token
      }
    }

    next()
  } catch (error) {
    // Don't block on errors for optional auth
    next()
  }
}
