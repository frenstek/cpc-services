import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── GET Handlers ────────────────────────────────────────────────────────────

async function handleList(req, res) {
  const { search, status, site_id } = req.query;

  let query = supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });

  if (site_id) {
    query = query.eq('site_id', site_id);
  }

  if (search) {
    query = query.ilike('rego', `%${search.trim()}%`);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Vehicles list error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
  }

  res.status(200).json(data || []);
}

async function handleGet(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing required query parameter: id' });
  }

  // Fetch vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .single();

  if (vehicleError) {
    console.error('Vehicle fetch error:', vehicleError);
    if (vehicleError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch vehicle', details: vehicleError.message });
  }

  // Fetch photos
  const { data: rawPhotos, error: photosError } = await supabase
    .from('photos')
    .select('*')
    .eq('vehicle_id', id);

  if (photosError) {
    console.error('Photos fetch error:', photosError);
    return res.status(500).json({ error: 'Failed to fetch photos', details: photosError.message });
  }

  // Generate public URLs for each photo
  const photos = (rawPhotos || []).map(photo => {
    if (photo.storage_path) {
      const { data: urlData } = supabase.storage
        .from('captures')
        .getPublicUrl(photo.storage_path);
      return { ...photo, public_url: urlData?.publicUrl || null };
    }
    return { ...photo, public_url: null };
  });

  // Fetch comments (table may not exist yet)
  let comments = [];
  try {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: true });
    if (!error) comments = data || [];
  } catch (e) {
    console.warn('Comments table not available:', e.message);
  }

  // Fetch signatures (table may not exist yet)
  let signatures = [];
  try {
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('vehicle_id', id)
      .order('created_at', { ascending: true });
    if (!error) signatures = data || [];
  } catch (e) {
    console.warn('Signatures table not available:', e.message);
  }

  res.status(200).json({
    ...vehicle,
    photos,
    comments,
    signatures,
  });
}

// ─── POST Handler ────────────────────────────────────────────────────────────

async function handleCreate(req, res) {
  const body = req.body || {};

  if (!body.rego || typeof body.rego !== 'string') {
    return res.status(400).json({ error: 'Missing required field: rego' });
  }

  const insertData = {
    rego: body.rego.trim().toUpperCase(),
    status: 'in_progress',
  };

  if (body.bay) insertData.bay = body.bay.trim();
  if (body.vehicle_type) insertData.vehicle_type = body.vehicle_type.trim();
  if (body.notes) insertData.notes = body.notes.trim();
  if (body.worker_name) insertData.worker_name = body.worker_name.trim();
  if (body.site_id) insertData.site_id = body.site_id;

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Vehicle create error:', error);
    return res.status(500).json({ error: 'Failed to create vehicle', details: error.message });
  }

  res.status(201).json(vehicle);
}

// ─── PATCH Handler ───────────────────────────────────────────────────────────

async function handleUpdate(req, res) {
  const { id, ...fields } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }

  const ALLOWED_FIELDS = ['rego', 'bay', 'vehicle_type', 'notes', 'worker_name', 'status', 'completed_at', 'site_id'];

  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) {
      if (key === 'rego' && typeof fields[key] === 'string') {
        updates[key] = fields[key].trim().toUpperCase();
      } else if (typeof fields[key] === 'string') {
        updates[key] = fields[key].trim();
      } else {
        updates[key] = fields[key];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update. Allowed: ' + ALLOWED_FIELDS.join(', ') });
  }

  // Auto-set completed_at when status changes to 'completed'
  if (updates.status === 'completed' && !updates.completed_at) {
    updates.completed_at = new Date().toISOString();
  }

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Vehicle update error:', error);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    return res.status(500).json({ error: 'Failed to update vehicle', details: error.message });
  }

  res.status(200).json(vehicle);
}

// ─── DELETE Handler ──────────────────────────────────────────────────────────

async function handleDelete(req, res) {
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id (provide as query param or in JSON body)' });
  }

  // Fetch vehicle to confirm existence
  const { data: vehicle, error: fetchError } = await supabase
    .from('vehicles')
    .select('id, rego')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Vehicle fetch error:', fetchError);
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch vehicle', details: fetchError.message });
  }

  // Fetch all photos for this vehicle to clean up storage
  const { data: photos } = await supabase
    .from('photos')
    .select('id, storage_path')
    .eq('vehicle_id', id);

  // Delete photo files from storage
  if (photos && photos.length > 0) {
    const storagePaths = photos.map((p) => p.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('captures')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage cleanup error:', storageError);
      }
    }

    // Delete photo records
    const { error: photosDeleteError } = await supabase
      .from('photos')
      .delete()
      .eq('vehicle_id', id);

    if (photosDeleteError) {
      console.error('Photos delete error:', photosDeleteError);
    }
  }

  // Delete comments
  const { error: commentsDeleteError } = await supabase
    .from('comments')
    .delete()
    .eq('vehicle_id', id);

  if (commentsDeleteError) {
    console.error('Comments delete error:', commentsDeleteError);
  }

  // Delete signatures
  const { error: signaturesDeleteError } = await supabase
    .from('signatures')
    .delete()
    .eq('vehicle_id', id);

  if (signaturesDeleteError) {
    console.error('Signatures delete error:', signaturesDeleteError);
  }

  // Delete share links
  const { error: sharesDeleteError } = await supabase
    .from('share_links')
    .delete()
    .eq('vehicle_id', id);

  if (sharesDeleteError) {
    console.error('Share links delete error:', sharesDeleteError);
  }

  // Delete the vehicle record
  const { error: deleteError } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Vehicle delete error:', deleteError);
    return res.status(500).json({ error: 'Failed to delete vehicle', details: deleteError.message });
  }

  res.status(200).json({
    message: `Vehicle "${vehicle.rego}" and ${photos?.length || 0} photos deleted successfully`,
    id,
  });
}

// ─── Main Router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const { action } = req.query;

    if (req.method === 'GET') {
      switch (action) {
        case 'list':
          return await handleList(req, res);
        case 'get':
          return await handleGet(req, res);
        default:
          return res.status(400).json({ error: 'Missing or invalid action query parameter. Valid GET actions: list, get' });
      }
    }

    if (req.method === 'POST') {
      return await handleCreate(req, res);
    }

    if (req.method === 'PATCH') {
      return await handleUpdate(req, res);
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Vehicles handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
