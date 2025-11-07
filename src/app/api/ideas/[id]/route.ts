import { NextRequest } from 'next/server'
import { getIdea } from './_lib/getIdea'
import { updateIdea } from './_lib/updateIdea'
import { deleteIdea } from './_lib/deleteIdea'

/**
 * GET /api/ideas/[id]
 * 
 * Fetches a single idea with conditional data based on status and query parameters.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return getIdea(request, params)
}

/**
 * PATCH /api/ideas/[id]
 * 
 * Auto-saves wizard answers and current step.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateIdea(request, params)
}

/**
 * DELETE /api/ideas/[id]
 * 
 * Deletes an idea. Only the owner can delete their own idea.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return deleteIdea(request, params)
}
