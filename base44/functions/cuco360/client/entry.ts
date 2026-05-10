export const CUCO_BASE_URL = Deno.env.get("CUCO_API_URL") || "https://api.cuco360.com/api/ExtApi";
export const CLIENT_CODE = "380";

export function getAuthHeaders() {
  const apiKey = Deno.env.get("CUCO360_API_KEY");
  
  if (!apiKey) {
    throw new Error("CUCO360_API_KEY environment variable is not set");
  }

  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "APIKey": `Bearer ${apiKey}`,
    "cod_cliente": CLIENT_CODE
  };
}

export async function fetchCuco(endpoint, options = {}) {
  const url = `${CUCO_BASE_URL}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...options.headers };
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CUCO360 API Error (${response.status}): ${text}`);
  }

  const json = await response.json();
  
  if (json.response && json.response !== "ok" && json.response !== "OK") {
    throw new Error(`CUCO360 API returned error: ${JSON.stringify(json)}`);
  }
  
  return json.data || json;
}