export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Récupérer uniquement les programmes de Zikrs validés
    if (request.method === "GET" && url.pathname === "/api/zikrs") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM zikrs WHERE status = 'valide' ORDER BY zikr_date ASC"
      ).all();
      return new Response(JSON.stringify(results), {
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // 2. Soumettre une nouvelle affiche de Dahira
    if (request.method === "POST" && url.pathname === "/api/zikr/submit") {
      try {
        const formData = await request.formData();
        const dahira = formData.get("dahira");
        const date = formData.get("date");
        const time = formData.get("time");
        const location = formData.get("location");
        const maps = formData.get("maps");
        const file = formData.get("poster");

        let posterUrl = "";
        
        if (file && file.size > 0) {
          // Sécurité taille (1 Mo)
          const MAX_SIZE = 10 * 1024 * 1024; 
          if (file.size > MAX_SIZE) {
            return new Response(JSON.stringify({ error: "L'image dépasse 10 Mo." }), {
              status: 400,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }

          // Sécurité format
          const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
          if (!allowedTypes.includes(file.type)) {
            return new Response(JSON.stringify({ error: "Format d'image non supporté." }), {
              status: 400,
              headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
            });
          }

          const fileKey = `${Date.now()}-${file.name}`;
          
          // ENVOI VERS LE NOUVEAU BUCKET DÉDIÉ AUX IMAGES
          await env.IMAGES_BUCKET.put(fileKey, file.stream(), {
            httpMetadata: { contentType: file.type }
          });
          
          // Note : Pense à remplacer 'ton-id-r2' par l'ID de ton sous-domaine public R2 dans Cloudflare
          posterUrl = `https://pub-ton-id-r2.r2.dev/${fileKey}`; 
        }

        // Insertion en BDD
        await env.DB.prepare(
          "INSERT INTO zikrs (dahira_name, zikr_date, zikr_time, location, maps_link, poster_url) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(dahira, date, time, location, maps, posterUrl).run();

        return new Response(JSON.stringify({ success: true, message: "Envoyé avec succès !" }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Non trouvé", { status: 404 });
  }
};
