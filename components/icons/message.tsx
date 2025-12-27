import { SVGProps } from "react"
export const Message = (props: SVGProps<SVGSVGElement>) => (
  <svg width={24} height={24} fill="none" {...props}>
    <title>{"chat-refreshed"}</title>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M3 9 .94 5.53C.54 4.863 1.013 4 1.79 4h17.543A2.667 2.667 0 0 1 22 6.667v10.666A2.667 2.667 0 0 1 19.334 20H5.667A2.667 2.667 0 0 1 3 17.333V9Zm2-.554L3.533 6h15.8c.369 0 .667.298.667.667v10.666a.667.667 0 0 1-.666.667H5.667A.667.667 0 0 1 5 17.333V8.446Z"
      clipRule="evenodd"
    />
    <path
      fill="currentColor"
      d="M7 10a1 1 0 0 1 1-1h9a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1ZM7 14a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1Z"
    />
  </svg>
)
