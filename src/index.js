export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (request.method === "POST" && url.pathname.includes("/api/zikr/submit")) {
      try {
        const fd = await request.formData();
        const dahira = fd.get("dahira") || "Inconnu";
        const date = fd.get("date") || new Date().toISOString().split('T')[0];
        const time = fd.get("time") || "00:00"; // Valeur par défaut si rien n'est reçu
        const loc = fd.get("location") || "Non spécifié";
        const file = fd.get("poster");

        let urlImg = "";
        if (file && file.size > 0) {
          const key = Date.now() + "_" + file.name;
          await env.IMAGES_BUCKET.put(key, file.stream());
          urlImg = "https://pub-ton-id-r2.r2.dev/" + key;
        }

        // Insertion forcée avec les valeurs récupérées
        await env.DB.prepare("INSERT INTO zikrs (dahira_name, zikr_date, zikr_time, location, poster_url) VALUES (?, ?, ?, ?, ?)")
          .bind(dahira, date, time, loc, urlImg).run();
        
        return new Response(JSON.stringify({success: true}), { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({error: err.message}), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
      }
    }

    if (request.method === "GET" && url.pathname.includes("/api/zikr/events")) {
      const { results } = await env.DB.prepare("SELECT * FROM zikrs").all();
      return new Response(JSON.stringify(results), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    return new Response("Not Found", { status: 404 });
  }
};
