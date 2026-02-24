// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

export const CUCO_BASE_URL = Deno.env.get("CUCO_API_URL") || "https://api.cuco360.com/api/ExtApi"; // Placeholder
export const CLIENT_CODE = "380";

// Auth configuration based on user instructions
export function getAuthHeaders() {
  // In production, this should come exclusively from Deno.env.get("CUCO360_API_KEY")
  // For development/preview, we fallback to the provided key if env var is missing.
  const apiKey = Deno.env.get("CUCO360_API_KEY") || "k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc";
  
  if (!apiKey) {
    throw new Error("CUCO360_API_KEY environment variable is not set");
  }

  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "APIKey": `Bearer ${apiKey}`, // Specific header requested by user
    "cod_cliente": CLIENT_CODE
  };
}

export async function fetchCuco(endpoint: string, options: RequestInit = {}) {
  const url = `${CUCO_BASE_URL}${endpoint}`;
  const headers = { ...getAuthHeaders(), ...options.headers };
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CUCO360 API Error (${response.status}): ${text}`);
  }

  const json = await response.json();
  
  // Handle Legacy format {"response": "ok/ERROR", "data": ...}
  if (json.response && json.response !== "ok" && json.response !== "OK") {
    throw new Error(`CUCO360 API returned error: ${JSON.stringify(json)}`);
  }
  
  return json.data || json;
}
