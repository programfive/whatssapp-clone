import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // The `/auth/callback` route is required for the server-side auth flow to work
    // properly. The Docker image for Supabase Auth and the Next.js Supabase
    // library depend on this route to exchange the auth code for a session.
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;
    const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

    if (code) {
        const supabase = await createClient();
        await supabase.auth.exchangeCodeForSession(code);
    }

    if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(`${origin}/`);
}
