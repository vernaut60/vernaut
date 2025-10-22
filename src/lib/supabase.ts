/**
 * DEPRECATED: Use @/lib/supabase/client or @/lib/supabase/server instead
 * 
 * This file is kept for backwards compatibility with existing code.
 * 
 * Migration guide:
 * - Client components: import { createClient } from '@/lib/supabase/client'
 * - Server components: import { createClient } from '@/lib/supabase/server'
 * - Middleware: import { createClient } from '@/lib/supabase/middleware'
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client'

// Export for backwards compatibility
export const supabase = createBrowserClient()
