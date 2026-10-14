// Cloudflare Worker: accepts a word list + family passcode, commits words.txt to GitHub.
// Secrets: GITHUB_TOKEN (fine-grained PAT, Contents: write on word-wizards), PASSCODE.
const REPO = "aiwizzard1/word-wizards";
const ORIGIN = "https://aiwizzard1.github.io";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    let body;
    try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    if (!body.passcode || body.passcode !== env.PASSCODE) return json({ error: "passcode" }, 401);
    if (!Array.isArray(body.words)) return json({ error: "words" }, 400);

    const words = [...new Set(body.words.map(w => String(w).trim().toLowerCase()))]
      .filter(w => /^[a-z][a-z' -]{0,39}$/.test(w))
      .slice(0, 200);
    const content = btoa(words.join("\n") + (words.length ? "\n" : ""));

    const api = `https://api.github.com/repos/${REPO}/contents/words.txt`;
    const h = {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "User-Agent": "word-wizards-worker",
      Accept: "application/vnd.github+json",
    };
    const cur = await fetch(api, { headers: h });
    const sha = cur.ok ? (await cur.json()).sha : undefined;
    const put = await fetch(api, {
      method: "PUT",
      headers: h,
      body: JSON.stringify({ message: "Update word list from app", content, sha, branch: "main" }),
    });
    if (!put.ok) return json({ error: "github", status: put.status }, 502);
    return json({ ok: true, count: words.length });
  },
};
