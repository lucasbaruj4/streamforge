import express from 'express'
import { supabase, supabaseAdmin } from '../lib/supabase.js'
import { requireAuth, optionalAuth } from '../middleware/auth.js'

const router = express.Router()

// Get all videos for the authenticated user
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch videos:', error)
      return res.status(500).json({ error: 'Failed to fetch videos' })
    }

    res.json({ videos })
  } catch (error) {
    console.error('Error fetching user videos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get public videos (for browsing)
router.get('/public', async (req, res) => {
  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_public', true)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch public videos:', error)
      return res.status(500).json({ error: 'Failed to fetch videos' })
    }

    res.json({ videos })
  } catch (error) {
    console.error('Error fetching public videos:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get specific video details
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params

    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    // Check access permissions
    const isOwner = req.user?.id === video.user_id
    const isPublic = video.is_public

    if (!isOwner && !isPublic) {
      return res.status(403).json({ error: 'Access denied' })
    }

    res.json({ video })
  } catch (error) {
    console.error('Error fetching video:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update video metadata (title, description, privacy)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, is_public } = req.body

    // Build update object with only provided fields
    const updates = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description
    if (is_public !== undefined) updates.is_public = is_public

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    // Update only if user owns the video (RLS will enforce this)
    const { data: video, error } = await supabase
      .from('videos')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single()

    if (error || !video) {
      return res.status(404).json({ error: 'Video not found or access denied' })
    }

    res.json({ video, message: 'Video updated successfully' })
  } catch (error) {
    console.error('Error updating video:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete video
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params

    // First get the video to access storage paths
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single()

    if (fetchError || !video) {
      return res.status(404).json({ error: 'Video not found or access denied' })
    }

    // Delete from database (RLS enforces user ownership)
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)

    if (deleteError) {
      console.error('Failed to delete video from database:', deleteError)
      return res.status(500).json({ error: 'Failed to delete video' })
    }

    // TODO: Delete files from MinIO storage (storage_paths)
    // This would require importing storage and deleting each file
    // For now, we'll leave files in MinIO to prevent data loss

    res.json({ message: 'Video deleted successfully' })
  } catch (error) {
    console.error('Error deleting video:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
