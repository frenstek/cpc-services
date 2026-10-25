import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, site_id } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const query = q.trim();

  try {
    // Search vehicles by rego, bay, notes
    let vehicleQuery = supabase
      .from('vehicles')
      .select('id, rego, bay, vehicle_type, status, site_id, created_at')
      .or(`rego.ilike.%${query}%,bay.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (site_id) vehicleQuery = vehicleQuery.eq('site_id', site_id);

    // Search photos by step_label, notes
    let photoQuery = supabase
      .from('photos')
      .select('id, step, step_label, type, damage_flag, vehicle_id, site_id, storage_path, created_at')
      .or(`step_label.ilike.%${query}%,notes.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (site_id) photoQuery = photoQuery.eq('site_id', site_id);

    const [vehicleResult, photoResult] = await Promise.all([vehicleQuery, photoQuery]);

    // Generate public URLs for photos
    const photos = (photoResult.data || []).map(p => {
      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(p.storage_path);
      return { ...p, public_url: urlData?.publicUrl || null };
    });

    res.status(200).json({
      vehicles: vehicleResult.data || [],
      photos,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
}
