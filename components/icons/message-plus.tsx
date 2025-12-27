import * as React from "react"

export type MessagePlusProps = React.SVGProps<SVGSVGElement>

export function MessagePlus(props: MessagePlusProps) {
  return (
    <svg viewBox="0 0 24 24" height={24} width={24} fill="none" {...props}>
      <path
        d="M9.533 12.991h1.976v1.976c0 .433.254.85.667.982a.994.994 0 001.315-.94v-2.018h1.976c.433 0 .851-.255.982-.668a.994.994 0 00-.94-1.314H13.49V9.033c0-.433-.255-.85-.668-.982a.995.995 0 00-1.314.94v2.018H9.49a.994.994 0 00-.94 1.314c.13.413.548.668.982.668z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M.944 5.526L3 8.848v8.485A2.667 2.667 0 005.667 20h13.666A2.667 2.667 0 0022 17.333V6.667A2.667 2.667 0 0019.333 4H1.795a1 1 0 00-.85 1.526zM5 8.28v9.053c0 .369.298.667.667.667h13.666a.667.667 0 00.667-.667V6.667A.667.667 0 0019.333 6H3.59L5 8.28z"
        fill="currentColor"
      />
    </svg>
  )
}

