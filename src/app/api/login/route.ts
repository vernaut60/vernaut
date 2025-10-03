import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  action: z.literal('login')
})

const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  action: z.literal('signup')
})

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  action: z.literal('forgot-password')
})

const requestSchema = z.union([loginSchema, signupSchema, forgotPasswordSchema])

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate request
    const body = await request.json()
    const validatedData = requestSchema.parse(body)

    // Step 2: Handle different actions
    switch (validatedData.action) {
      case 'login':
        return await handleLogin(validatedData.email, validatedData.password)
      
      case 'signup':
        return await handleSignup(validatedData.email, validatedData.password)
      
      case 'forgot-password':
        return await handleForgotPassword(validatedData.email)
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in login API:', error)

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return NextResponse.json(
        {
          success: false,
          error: firstError.message || 'Please check your input and try again'
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: 'Something went wrong. Please try again.'
      },
      { status: 500 }
    )
  }
}

// Handle login
async function handleLogin(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Check for specific auth errors
      if (error.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          {
            success: false,
            error: 'UserID or password incorrect'
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Login failed. Please try again.'
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Login failed. Please try again.'
      },
      { status: 500 }
    )
  }
}

// Handle signup
async function handleSignup(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      // Check for specific signup errors
      if (error.message.includes('User already registered')) {
        return NextResponse.json(
          {
            success: false,
            error: 'An account with this email already exists. Try logging in instead.'
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Signup failed. Please try again.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully! Please check your email to verify your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
      }
    })

  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Signup failed. Please try again.'
      },
      { status: 500 }
    )
  }
}

// Handle forgot password
async function handleForgotPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
    })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send reset email. Please try again.'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent! Please check your inbox.'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to send reset email. Please try again.'
      },
      { status: 500 }
    )
  }
}
