// src/pages/api/admin/[...route].js
import { handleAdminApi } from '../../../lib/admin-api-handler.js';

export const prerender = false;

export async function ALL(context) {
  return handleAdminApi(context);
}
