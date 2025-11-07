import Anthropic from '@anthropic-ai/sdk'

/**
 * Validates if an idea is too vague or not a business idea
 * Uses the same logic as the demo validation
 * 
 * @param ideaText - The idea text to validate
 * @returns Object with valid flag and optional error message
 */
export async function validateIdeaIsNotVague(
  ideaText: string
): Promise<{ valid: boolean; error?: string }> {
  const trimmedIdea = ideaText.trim()

  // Step 1: Basic word count check (fast, no AI call)
  const wordCount = trimmedIdea.split(/\s+/).filter(word => word.length > 0).length
  if (wordCount < 2) {
    return {
      valid: false,
      error: 'Please describe your idea in a bit more detail (a few words is enough).'
    }
  }

  // Step 2: AI-based classification (Claude determines if vague)
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })

    const validationPrompt = `
You are a strict validator that classifies if a text is a potential business idea.
Output ONLY one of these labels:

- "valid_idea" → clearly describes a product, service, app, or startup concept.
- "vague" → too short, unclear, or not descriptive enough.
- "non_business" → personal statement, random phrase, insult, or unrelated to business.

Text: "${trimmedIdea}"
`

    const validationResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 5,
      temperature: 0,
      messages: [{ role: 'user', content: validationPrompt }]
    })

    const verdict = validationResponse.content[0]?.type === 'text' 
      ? validationResponse.content[0].text?.trim().toLowerCase() 
      : ''

    if (verdict === 'vague') {
      return {
        valid: false,
        error: '⚠️ Your idea seems too vague. Try describing what it does or who it helps.'
      }
    }

    if (verdict === 'non_business') {
      return {
        valid: false,
        error: '💡 This doesn\'t look like a business idea. Try describing a product or service concept.'
      }
    }

    // verdict === 'valid_idea' or any other response (default to valid)
    return { valid: true }
  } catch (error) {
    // If AI validation fails, log but don't block (graceful degradation)
    console.error('[IDEA_VALIDATION] AI validation failed:', error)
    // Allow the idea through if validation fails (better UX than blocking)
    return { valid: true }
  }
}

