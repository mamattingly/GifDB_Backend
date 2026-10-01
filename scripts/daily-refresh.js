const baseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");
const token = process.env.DAILY_REFRESH_TOKEN;

if (!baseUrl) throw new Error("Set API_BASE_URL to the public URL of your Render web service.");
if (!token) throw new Error("Set DAILY_REFRESH_TOKEN to the same secret used by the web service.");

const response = await fetch(`${baseUrl}/api/admin/daily-refresh`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` }
});
const text = await response.text();
if (!response.ok) throw new Error(`Daily refresh failed (${response.status}): ${text}`);
console.log(`Daily GIF refresh complete: ${text}`);
