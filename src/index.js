export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (request.method === "POST" && url.pathname.includes("/api/zikr/submit")) {
      try {
        const formData = await request.formData();
        const dahira = formData.get("dahira") || "Inconnu";
        const date = formData.get("date") || "";
        const time = formData.get("time") || "00:00"; // Valeur par défaut pour éviter l'erreur
        const location = formData.get("location") || "";
        const file = formData.get("poster");

        let posterUrl = "";
        if (file && file.size > 0) {
          const fileKey = `${Date.now()}-${file.name}`;
          await env.IMAGES_BUCKET.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type } });
          posterUrl = `https://pub-ton-id-r2.r2.dev/${fileKey}`; 
        }

        await env.DB.prepare("INSERT INTO zikrs (dahira_name, zikr_date, zikr_time, location, poster_url) VALUES (?, ?, ?, ?, ?)")
          .bind(dahira, date, time, location, posterUrl).run();
        
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (request.method === "GET" && url.pathname.includes("/api/zikr/events")) {
      const { results } = await env.DB.prepare("SELECT * FROM zikrs").all();
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ error: "Non trouvé" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
};
