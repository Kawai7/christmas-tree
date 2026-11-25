import { getStore } from "@edgeone/pages-blob";

const STORE = getStore({ name: "christmas-tree-photos", consistency: "strong" });
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function onRequest({ request }) {
  if (request.method === "GET") {
    try {
      const { blobs } = await STORE.list({ prefix: "photos/", consistency: "strong" });
      const photos = blobs
        .filter(item => item.key && !item.key.endsWith("/"))
        .map(item => {
          const file = item.key.split("/").pop();
          const match = file.match(/^\d+-[a-f0-9-]+-(.*)\.[^.]+$/i);
          let name = "圣诞回忆";
          if (match?.[1]) {
            try { name = decodeURIComponent(match[1]); } catch {}
          }
          return { key: item.key, name, url: `./api/photo?key=${encodeURIComponent(item.key)}` };
        });
      return json({ photos });
    } catch (error) {
      console.error("Blob list failed", error);
      return json({ error: "无法读取云端相册" }, 500);
    }
  }

  if (request.method === "POST") {
    try {
      const body = await request.json();
      const contentType = String(body.contentType || "").toLowerCase();
      const originalName = String(body.name || "photo").slice(0, 120);
      if (!ALLOWED.has(contentType)) return json({ error: "仅支持 JPG、PNG、WEBP、GIF、AVIF 图片" }, 415);
      const ext = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" })[contentType];
      const caption = originalName.replace(/\.[^.]+$/, "").replace(/[\\/\0-\x1f]/g, "").trim().slice(0, 48) || "圣诞回忆";
      const safeCaption = encodeURIComponent(caption).slice(0, 120);
      const key = `photos/${Date.now()}-${crypto.randomUUID()}-${safeCaption}.${ext}`;
      const ticket = await STORE.createUploadUrl(key, { expireSeconds: 600, contentType });
      return json(ticket);
    } catch (error) {
      console.error("Upload URL creation failed", error);
      return json({ error: "无法创建上传任务" }, 500);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
