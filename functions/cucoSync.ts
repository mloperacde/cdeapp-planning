// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: { get: (key: string) => string | undefined };
};

Deno.serve(async (req) => {
  try {
    const client = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    
    // Minimal "Hello World" to verify deployment
    if (body.debug_mode) {
       return new Response(JSON.stringify({ 
          success: true, 
          message: "Function cucoSync is deployed and reachable (Minimal Version).",
          has_key: !!Deno.env.get("CUCO360_API_KEY")
        }), { headers: { "Content-Type": "application/json" } });
    }

    // Full logic will be restored once we confirm deployment works
    return new Response(JSON.stringify({ 
        success: false, 
        message: "Debug mode required for minimal version check." 
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
