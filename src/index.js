export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
    }

    if (request.method === "GET" && (url.pathname === "/api/zikrs" || url.pathname === "/api/zikr/events")) {
      const { results } = await env.DB.prepare("SELECT * FROM zikrs WHERE status = 'valide' ORDER BY zikr_date ASC").all();
      return new Response(JSON.stringify(results), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
    }

    if (request.method === "POST" && (url.pathname === "/api/zikr/submit" || url.pathname === "/api/zikr/submit/")) {
      try {
        const formData = await request.formData();
        const dahira = formData.get("dahira") || formData.get("title") || formData.get("nom_evenement");
        const date = formData.get("date") || formData.get("event_date");
        const time = formData.get("time") || "";
        const location = formData.get("location") || "";
        const maps = formData.get("maps") || "";
        const file = formData.get("poster") || formData.get("file");

        let posterUrl = "";
        if (file && file.size > 0) {
          const fileKey = `${Date.now()}-${file.name}`;
          await env.IMAGES_BUCKET.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type } });
          posterUrl = `https://pub-ton-id-r2.r2.dev/${fileKey}`; 
        }

        await env.DB.prepare("INSERT INTO zikrs (dahira_name, zikr_date, zikr_time, location, maps_link, poster_url) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(dahira, date, time, location, maps, posterUrl).run();

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
      }
    }
    return new Response(JSON.stringify({ error: "Non trouvé" }), { status: 404, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
  }
};
