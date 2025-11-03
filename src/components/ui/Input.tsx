'use client'

import React, { forwardRef } from 'react'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...rest }, ref) => {
    return <input ref={ref} className={classNames('input-base', className)} {...rest} />
  }
)

Input.displayName = 'Input'

export default Input


