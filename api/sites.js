import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── GET Handlers ────────────────────────────────────────────────────────────

async function handleList(req, res) {
  const { status } = req.query;

  let query = supabase
    .from('sites')
    .select('*')
    .order('name', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Sites list error:', error);
    return res.status(500).json({ error: 'Failed to fetch sites', details: error.message });
  }

  res.status(200).json(data || []);
}

async function handleGet(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing required query parameter: id' });
  }

  // Fetch site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (siteError) {
    console.error('Site fetch error:', siteError);
    if (siteError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Site not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch site', details: siteError.message });
  }

  // Count photos for this site
  const { count: photoCount, error: photosError } = await supabase
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', id);

  if (photosError) {
    console.error('Photos count error:', photosError);
  }

  // Count vehicles for this site
  const { count: vehicleCount, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', id);

  if (vehiclesError) {
    console.error('Vehicles count error:', vehiclesError);
  }

  res.status(200).json({
    ...site,
    photo_count: photoCount || 0,
    vehicle_count: vehicleCount || 0,
  });
}

// ─── POST Handler ────────────────────────────────────────────────────────────

async function handleCreate(req, res) {
  const body = req.body || {};

  if (!body.name || typeof body.name !== 'string') {
    return res.status(400).json({ error: 'Missing required field: name' });
  }

  const insertData = {
    name: body.name.trim(),
    status: 'active',
  };

  if (body.address) insertData.address = body.address.trim();
  if (body.city) insertData.city = body.city.trim();
  if (body.state) insertData.state = body.state.trim();
  if (body.code) insertData.code = body.code.trim().toUpperCase();
  if (body.notes) insertData.notes = body.notes.trim();

  const { data: site, error } = await supabase
    .from('sites')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Site create error:', error);
    return res.status(500).json({ error: 'Failed to create site', details: error.message });
  }

  res.status(201).json(site);
}

// ─── PATCH Handler ───────────────────────────────────────────────────────────

async function handleUpdate(req, res) {
  const { id, ...fields } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }

  const ALLOWED_FIELDS = ['name', 'address', 'city', 'state', 'code', 'notes', 'status'];

  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in fields) {
      if (key === 'code' && typeof fields[key] === 'string') {
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

  const { data: site, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Site update error:', error);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Site not found' });
    }
    return res.status(500).json({ error: 'Failed to update site', details: error.message });
  }

  res.status(200).json(site);
}

// ─── DELETE Handler ──────────────────────────────────────────────────────────

async function handleDelete(req, res) {
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id (provide as query param or in JSON body)' });
  }

  // Fetch site to confirm existence
  const { data: site, error: fetchError } = await supabase
    .from('sites')
    .select('id, name')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Site fetch error:', fetchError);
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Site not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch site', details: fetchError.message });
  }

  // Delete the site record
  const { error: deleteError } = await supabase
    .from('sites')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('Site delete error:', deleteError);
    return res.status(500).json({ error: 'Failed to delete site', details: deleteError.message });
  }

  res.status(200).json({
    message: `Site "${site.name}" deleted successfully`,
    id,
  });
}

// ─── Site Photos ────────────────────────────────────────────────────────────

async function handleSitePhotos(req, res) {
  const { site_id } = req.query;
  if (!site_id) return res.status(400).json({ error: 'Missing site_id' });

  const { data, error } = await supabase
    .from('photos')
    .select('*')
    .eq('site_id', site_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Generate signed URLs for each photo
  const photos = (data || []).map(p => {
    if (p.storage_path) {
      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(p.storage_path);
      return { ...p, url: urlData?.publicUrl || null };
    }
    return { ...p, url: null };
  });

  res.status(200).json(photos);
}

// ─── Site Documents ─────────────────────────────────────────────────────────

async function handleSiteDocuments(req, res) {
  const { site_id } = req.query;
  if (!site_id) return res.status(400).json({ error: 'Missing site_id' });

  const { data, error } = await supabase
    .from('site_documents')
    .select('*')
    .eq('site_id', site_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data || []);
}

async function handleUploadDocument(req, res) {
  const { site_id, name, category, notes, file_data, file_name, file_size, file_type } = req.body || {};
  if (!site_id || !name || !file_data || !file_name) {
    return res.status(400).json({ error: 'Missing required fields: site_id, name, file_data, file_name' });
  }

  // Upload to storage
  const base64 = file_data.includes(',') ? file_data.split(',')[1] : file_data;
  const buffer = Buffer.from(base64, 'base64');
  const storagePath = `sites/${site_id}/docs/${Date.now()}-${file_name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const { data: upData, error: upErr } = await supabase.storage
    .from('captures')
    .upload(storagePath, buffer, { contentType: file_type || 'application/octet-stream' });

  if (upErr) return res.status(500).json({ error: 'Upload failed', details: upErr.message });

  const { data: urlData } = supabase.storage.from('captures').getPublicUrl(upData.path);

  const { data: doc, error: dbErr } = await supabase.from('site_documents').insert({
    site_id,
    name: name.trim(),
    category: category || 'general',
    file_name,
    file_url: urlData.publicUrl,
    file_size: file_size || buffer.length,
    file_type: file_type || null,
    notes: notes || null,
  }).select().single();

  if (dbErr) return res.status(500).json({ error: dbErr.message });
  res.status(201).json(doc);
}

async function handleDeleteDocument(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const { data: doc } = await supabase.from('site_documents').select('file_url').eq('id', id).single();
  if (doc?.file_url) {
    const parts = doc.file_url.split('/captures/');
    if (parts[1]) await supabase.storage.from('captures').remove([decodeURIComponent(parts[1])]);
  }

  await supabase.from('site_documents').delete().eq('id', id);
  res.status(200).json({ message: 'Deleted' });
}

// ─── Site Notes / Message Log ───────────────────────────────────────────────

async function handleSiteNotes(req, res) {
  const { site_id } = req.query;
  if (!site_id) return res.status(400).json({ error: 'Missing site_id' });
  const { data, error } = await supabase.from('site_notes').select('*').eq('site_id', site_id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data || []);
}

async function handleCreateNote(req, res) {
  const { site_id, content, author } = req.body || {};
  if (!site_id || !content?.trim()) return res.status(400).json({ error: 'Missing site_id or content' });
  const { data, error } = await supabase.from('site_notes').insert({ site_id, content: content.trim(), author: author?.trim() || 'Staff' }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
}

async function handleDeleteNote(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  await supabase.from('site_notes').delete().eq('id', id);
  res.status(200).json({ message: 'Deleted' });
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
        case 'photos':
          return await handleSitePhotos(req, res);
        case 'documents':
          return await handleSiteDocuments(req, res);
        case 'notes':
          return await handleSiteNotes(req, res);
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }
    }

    if (req.method === 'POST') {
      if (action === 'upload-document') return await handleUploadDocument(req, res);
      if (action === 'create-note') return await handleCreateNote(req, res);
      return await handleCreate(req, res);
    }

    if (req.method === 'PATCH') {
      return await handleUpdate(req, res);
    }

    if (req.method === 'DELETE') {
      if (action === 'delete-document') return await handleDeleteDocument(req, res);
      if (action === 'delete-note') return await handleDeleteNote(req, res);
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Sites handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
