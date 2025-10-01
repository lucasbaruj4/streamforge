import { connection } from './queue.js'

// Track anonymous uploads by IP address using Redis
// This prevents abuse while allowing first-time users to try the platform

const ANON_UPLOAD_LIMIT = 1
const EXPIRY_HOURS = 24

/**
 * Check if an IP address has exceeded anonymous upload limit
 * @param {string} ip - Client IP address
 * @returns {Promise<{allowed: boolean, count: number, limit: number}>}
 */
export async function checkAnonUploadLimit(ip) {
  const key = `anon_uploads:${ip}`

  // Get current count for this IP
  const currentCount = await connection.get(key)
  const count = currentCount ? parseInt(currentCount) : 0

  return {
    allowed: count < ANON_UPLOAD_LIMIT,
    count: count,
    limit: ANON_UPLOAD_LIMIT
  }
}

/**
 * Increment the anonymous upload counter for an IP
 * @param {string} ip - Client IP address
 * @returns {Promise<number>} New count
 */
export async function incrementAnonUpload(ip) {
  const key = `anon_uploads:${ip}`

  // Increment counter
  const newCount = await connection.incr(key)

  // Set expiration on first upload (only if this is the first increment)
  if (newCount === 1) {
    await connection.expire(key, EXPIRY_HOURS * 3600) // Convert hours to seconds
  }

  return newCount
}

/**
 * Get client IP address from request (handles proxies/load balancers)
 * @param {Request} req - Express request object
 * @returns {string} Client IP address
 */
export function getClientIP(req) {
  // Check for X-Forwarded-For header (behind proxy/nginx)
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    // X-Forwarded-For can be comma-separated, take first one
    return forwarded.split(',')[0].trim()
  }

  // Check for X-Real-IP header (alternative proxy header)
  const realIP = req.headers['x-real-ip']
  if (realIP) {
    return realIP
  }

  // Fallback to direct connection IP
  return req.ip || req.connection.remoteAddress || 'unknown'
}