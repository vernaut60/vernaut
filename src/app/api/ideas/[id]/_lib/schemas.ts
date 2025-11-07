import { z } from 'zod'

// Response validation schema (flexible to support conditional fields)
export const getIdeaResponseSchema = z.object({
  success: z.boolean(),
  idea: z.object({
    id: z.string(),
    status: z.string(),
    idea_text: z.string(),
    // Wizard fields (optional - only when requested or wizard active)
    questions: z.array(z.unknown()).nullable().optional(),
    wizard_answers: z.record(z.unknown()).optional(),
    current_step: z.number().optional(),
    total_questions: z.number().nullable().optional(),
    questions_generated_at: z.string().nullable().optional(),
    wizard_completed_at: z.string().nullable().optional(),
    // Stage 1 fields (optional - only when requested or complete)
    score: z.number().nullable().optional(),
    risk_score: z.number().nullable().optional(),
    risk_analysis: z.record(z.unknown()).nullable().optional(),
    ai_insights: z.record(z.unknown()).nullable().optional(),
    problem: z.string().nullable().optional(),
    audience: z.string().nullable().optional(),
    solution: z.string().nullable().optional(),
    monetization: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    // Competitors (optional - only when requested)
    competitors: z.array(z.unknown()).optional(),
    // Timestamps
    created_at: z.string(),
    updated_at: z.string().nullable().optional(),
    // Error fields
    error_message: z.string().nullable().optional(),
    error_occurred_at: z.string().nullable().optional()
  })
})

// PATCH request validation schema
export const patchIdeaSchema = z.object({
  wizard_answers: z.record(z.unknown()).optional(),
  current_step: z.number().min(0).optional(),
  status: z.enum(['generating_questions']).optional() // Only allow draft -> generating_questions transition
})

// PATCH response validation schema
export const patchIdeaResponseSchema = z.object({
  success: z.boolean(),
  updated_at: z.string()
})

