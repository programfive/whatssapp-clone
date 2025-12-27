export const CheckSmall = (props: React.ComponentPropsWithoutRef<"svg">) => {
    return (
        <svg
            width="13"
            height="10"
            viewBox="0 0 12 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <path
                d="M1 5L4.5 8.5L11 1.5"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};
