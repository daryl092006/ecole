import { errorResponse } from '@/server/auth';
import { writeCatalog } from '@/server/catalogCrud';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ collection: string; id: string }> };
export async function PATCH(request: Request, { params }: Context) { try { const {collection,id}=await params; return await writeCatalog(request,collection,id); } catch(error) { return errorResponse(error); } }
export const DELETE = PATCH;
