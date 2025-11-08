import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase credentials");
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/medications`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        apikey: supabaseServiceRoleKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Supabase API error: ${response.statusText}`);
    }

    const medications = await response.json();

    const now = new Date();
    const reminderWindow = 30 * 60 * 1000;

    const dueMedications = medications.filter((med: any) => {
      if (!med.next_dose_due_at || !med.is_active) return false;
      const dueTime = new Date(med.next_dose_due_at);
      const timeDiff = dueTime.getTime() - now.getTime();
      return timeDiff > 0 && timeDiff <= reminderWindow;
    });

    if (dueMedications.length > 0) {
      const updateIds = dueMedications.map((med: any) => med.id);

      for (const medId of updateIds) {
        await fetch(`${supabaseUrl}/rest/v1/dose_logs`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${supabaseServiceRoleKey}`,
            "Content-Type": "application/json",
            apikey: supabaseServiceRoleKey,
          },
          body: JSON.stringify({
            reminder_sent: true,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersProcessed: dueMedications.length,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
