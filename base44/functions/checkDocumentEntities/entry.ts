// @ts-ignore
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
};

Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    
    // Check if entities exist by trying to list them
    // We expect DocumentFolder and Document to be available
    
    let folderStatus = "OK";
    let documentStatus = "OK";
    let folders = [];
    
    try {
        folders = await base44.asServiceRole.entities.DocumentFolder.list();
    } catch (e) {
        folderStatus = `ERROR: ${e.message}`;
    }

    try {
        await base44.asServiceRole.entities.Document.list(undefined, 1);
    } catch (e) {
        documentStatus = `ERROR: ${e.message}`;
    }

    return Response.json({
      folder_entity_status: folderStatus,
      document_entity_status: documentStatus,
      folder_count: folders.length,
      sample_folders: folders.slice(0, 3)
    });

  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});