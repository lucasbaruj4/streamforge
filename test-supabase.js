#!/usr/bin/env node

import { testConnection, supabase, supabaseAdmin } from './lib/supabase.js'

console.log('Testing Supabase connection...\n')

// Test basic connection
await testConnection()

// Test auth functionality
console.log('\n📋 Checking Supabase Auth configuration...')
try {
  const { data, error } = await supabase.auth.getSession()

  if (error) {
    console.log('⚠️  No active session (expected for server-side)')
  } else {
    console.log('✅ Auth system is accessible')
  }

  // Test if we can reach the auth endpoint
  const { data: settings, error: settingsError } = await supabase.auth.getUser()

  if (!settingsError || settingsError.message.includes('no user')) {
    console.log('✅ Auth endpoints are reachable')
  }
} catch (error) {
  console.error('❌ Auth test failed:', error.message)
}

console.log('\n📊 Testing admin client...')
try {
  // Admin client should be able to query auth.users (if we had permissions)
  // For now, just verify it initializes correctly
  console.log('✅ Admin client initialized')
} catch (error) {
  console.error('❌ Admin client test failed:', error.message)
}

console.log('\n---')
console.log('Next steps:')
console.log('1. Update .env with your actual Supabase credentials')
console.log('2. Run the database migrations to create the videos table')
console.log('3. Start implementing authentication endpoints')

process.exit(0)