import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportMessage {
  name?: string;
  email: string;
  subject: string;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: SupportMessage = await req.json();

    // Validation
    if (!email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Email, subject et message sont requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Sauvegarder le message dans la base de données
    const { data, error: dbError } = await supabase
      .from("support_messages")
      .insert([
        {
          name: name || "Anonyme",
          email,
          subject,
          message,
          status: "nouveau",
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Erreur DB:", dbError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'enregistrement du message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Envoyer un email de notification aux admins
    try {
      const emailBody = {
        to: ["contact@centrinote.fr", "reda_sahraoui@outlook.fr"],
        subject: `🆘 Nouveau message de support: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #3b82f6; margin-bottom: 20px;">📩 Nouveau message de support</h2>

            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
              <p style="margin: 5px 0;"><strong>De :</strong> ${name || "Anonyme"}</p>
              <p style="margin: 5px 0;"><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
              <p style="margin: 5px 0;"><strong>Sujet :</strong> ${subject}</p>
              <p style="margin: 5px 0;"><strong>Date :</strong> ${new Date().toLocaleString("fr-FR")}</p>
            </div>

            <div style="background-color: #ffffff; padding: 15px; border-left: 4px solid #3b82f6; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #1f2937;">Message :</h3>
              <p style="white-space: pre-wrap; line-height: 1.6;">${message}</p>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <a href="https://centrinote.fr/admin/support"
                 style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📊 Voir dans le dashboard admin
              </a>
            </div>

            <p style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              Message ID: ${data.id}
            </p>
          </div>
        `,
      };

      const { error: emailError } = await supabase.functions.invoke("send-user-emails", {
        body: emailBody,
      });

      if (emailError) {
        console.error("Erreur email:", emailError);
        // On continue même si l'email échoue, le message est déjà enregistré
      }
    } catch (emailErr) {
      console.error("Exception email:", emailErr);
      // On continue même si l'email échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Message envoyé avec succès",
        id: data.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Erreur générale:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
