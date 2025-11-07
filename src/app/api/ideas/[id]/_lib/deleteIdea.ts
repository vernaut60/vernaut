import { NextRequest, NextResponse } from 'next/server'
import { createAuthenticatedClient } from './auth'
import { logError, logInfo } from './logger'

/**
 * DELETE /api/ideas/[id]
 * 
 * Deletes an idea. Only the owner can delete their own idea.
 * 
 * Returns:
 * - success: boolean
 * - message: string
 */
export async function deleteIdea(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    // Step 1: Extract idea ID from params
    const { id: ideaId } = await params
    
    if (!ideaId || typeof ideaId !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Invalid idea ID'
      }, { status: 400 })
    }

    // Step 2: Authenticate user
    const authHeader = request.headers.get('Authorization')
    const supabase = await createAuthenticatedClient(authHeader)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      logError('Authentication failed in DELETE', { error: authError?.message, ideaId })
      return NextResponse.json({
        success: false,
        message: 'Invalid or expired authentication token'
      }, { status: 401 })
    }

    const userId = user.id

    // Step 3: Verify ownership before deleting
    const { data: existingIdea, error: fetchError } = await supabase
      .from('ideas')
      .select('id, user_id')
      .eq('id', ideaId)
      .single()

    if (fetchError || !existingIdea) {
      logError('Idea not found in DELETE', { ideaId, error: fetchError?.message })
      return NextResponse.json({
        success: false,
        message: 'Idea not found'
      }, { status: 404 })
    }

    if (existingIdea.user_id !== userId) {
      logError('Unauthorized delete attempt', { ideaId, userId, ownerId: existingIdea.user_id })
      return NextResponse.json({
        success: false,
        message: 'You do not have permission to delete this idea'
      }, { status: 403 })
    }

    // Step 4: Delete the idea
    const { error: deleteError } = await supabase
      .from('ideas')
      .delete()
      .eq('id', ideaId)
      .eq('user_id', userId) // Extra safety check

    if (deleteError) {
      logError('Failed to delete idea', { ideaId, error: deleteError.message })
      return NextResponse.json({
        success: false,
        message: 'Failed to delete idea. Please try again.'
      }, { status: 500 })
    }

    logInfo('Idea deleted successfully', { ideaId, userId })
    
    return NextResponse.json({
      success: true,
      message: 'Idea deleted successfully'
    }, { status: 200 })

  } catch (error) {
    logError('Unexpected error in DELETE', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      ideaId: (await params).id
    })

    // Handle authentication errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid authorization header')) {
        return NextResponse.json({
          success: false,
          message: 'Missing or invalid authorization header'
        }, { status: 401 })
      }
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Failed to delete idea. Please try again.'
    }, { status: 500 })
  }
}

