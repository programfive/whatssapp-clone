import { cn } from "@/lib/utils";

export const LockSmall = ({ className, ...props }: React.ComponentPropsWithoutRef<"svg">) => {
    return (
        <svg
            viewBox="0 0 10 12"
            width="10"
            height="12"
            className={cn("", className)}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M5 0C2.2 0 0 2.2 0 5V12H10V5C10 2.2 7.8 0 5 0ZM8 5H2V4.9C2 3.3 3.3 2 4.9 2C6.6 2 7.9 3.3 8 4.9V5Z"
                fill="#3b4a54"
            />
        </svg>
    );
};
