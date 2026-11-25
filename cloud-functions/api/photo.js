import { getStore } from "@edgeone/pages-blob";

const STORE = getStore({ name: "christmas-tree-photos", consistency: "strong" });
const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif" };

export async function onRequest({ request }) {
  if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!/^photos\/[\w%.,()\-]+\.(jpg|jpeg|png|webp|gif|avif)$/i.test(key)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await STORE.get(key, { type: "arrayBuffer", consistency: "strong" });
    if (!data) return new Response("Not found", { status: 404 });
    const ext = key.split(".").pop().toLowerCase();
    return new Response(data, {
      headers: {
        "Content-Type": TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Blob image read failed", error);
    return new Response("Image unavailable", { status: 500 });
  }
}
