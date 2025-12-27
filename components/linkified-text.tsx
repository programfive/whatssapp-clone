import { Fragment } from 'react'

import { cn } from '@/lib/utils'

const URL_REGEX = /((https?:\/\/|www\.)[^\s]+)/gi
const isUrl = (value: string) => /^(https?:\/\/|www\.)/i.test(value)

type LinkifiedTextProps = {
  text?: string | null
  className?: string
  linkClassName?: string
  preserveLineBreaks?: boolean
  tone?: 'incoming' | 'outgoing'
}

const linkToneClasses: Record<NonNullable<LinkifiedTextProps['tone']>, string> = {
  incoming: 'text-whatsapp-text-green hover:text-whatsapp-forest',
  outgoing: 'text-white hover:text-white',
}

export function LinkifiedText({
  text,
  className,
  linkClassName,
  preserveLineBreaks = true,
  tone = 'incoming',
}: LinkifiedTextProps) {
  if (!text) return null

  const lines = text.split(/\n/)

  return (
    <span className={cn(className)}>
      {lines.map((line, lineIndex) => (
        <Fragment key={`line-${lineIndex}`}>
          {line.split(URL_REGEX).map((part, partIndex) => {
            if (!part) return null
            if (isUrl(part)) {
              const href = part.startsWith('http') ? part : `https://${part}`
              return (
                <a
                  key={`part-${lineIndex}-${partIndex}`}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    'font-semibold underline decoration-from-font underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-whatsapp-forest',
                    linkToneClasses[tone],
                    linkClassName,
                  )}
                >
                  {part}
                </a>
              )
            }
            return (
              <Fragment key={`text-${lineIndex}-${partIndex}`}>{part}</Fragment>
            )
          })}
          {lineIndex < lines.length - 1
            ? preserveLineBreaks
              ? <br key={`br-${lineIndex}`} />
              : ' '
            : null}
        </Fragment>
      ))}
    </span>
  )
}
