'use client'

import React, { forwardRef } from 'react'

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...rest }, ref) => {
    return <textarea ref={ref} className={classNames('input-base', className)} {...rest} />
  }
)

Textarea.displayName = 'Textarea'

export default Textarea


