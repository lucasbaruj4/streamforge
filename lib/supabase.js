import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client with anon key (respects RLS policies)
// This client is used for operations that should respect user permissions
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Create Supabase admin client with service key (bypasses RLS)
// This client is used for admin operations like creating records on behalf of users
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test the connection
export async function testConnection() {
  try {
    // Simple query to test the connection
    const { data, error } = await supabase
      .from('videos')
      .select('count')
      .limit(1)

    if (error && error.code !== '42P01') { // 42P01 = table doesn't exist yet
      throw error
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message)
    return false
  }
}

// Helper function to get user from JWT token
export async function getUserFromToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error) throw error
    return user
  } catch (error) {
    console.error('Failed to get user from token:', error.message)
    return null
  }
}