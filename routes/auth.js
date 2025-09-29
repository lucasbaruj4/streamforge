import express from 'express'
import { supabase, supabaseAdmin } from '../lib/supabase.js'

const router = express.Router()

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Register user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) {
      // Generic error message to prevent user enumeration attacks
      return res.status(400).json({ error: 'Registration failed' })
    }

    // Return user data and session
    res.json({
      user: data.user,
      session: data.session,
      message: 'Registration successful'
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Login existing user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      // Same generic error for wrong email OR password (security best practice)
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Return user and session with JWT token
    res.json({
      user: data.user,
      session: data.session,
      message: 'Login successful'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Logout user
router.post('/logout', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1]

    if (token) {
      // Sign out the user session
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Logout error:', error)
      }
    }

    res.json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get current user from token
router.get('/user', async (req, res) => {
  try {
    // Get token from Authorization header
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' })
    }

    // Use the refresh token to get new session
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    })

    if (error) {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    res.json({
      session: data.session,
      user: data.user
    })
  } catch (error) {
    console.error('Refresh token error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router