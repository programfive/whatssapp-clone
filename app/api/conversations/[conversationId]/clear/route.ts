import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> },
) {
  const params = await context.params;
  const conversationId = params.conversationId;

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = authData.user.id;

  const { data: convo, error: convoError } = await supabase
    .from("conversations")
    .select("id, created_by")
    .eq("id", conversationId)
    .maybeSingle();

  if (convoError) {
    return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
  }

  if (!convo) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (convo.created_by !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const clearedAt = new Date().toISOString();

  const { error: updateError } = await admin
    .from("conversations")
    .update({ cleared_at: clearedAt })
    .eq("id", conversationId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 });
  }

  const { error: deleteError } = await admin
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (deleteError) {
    return NextResponse.json({ error: "Failed to clear messages" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, clearedAt });
}
