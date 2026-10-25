import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 4.5 * 1024 * 1024;

function stripBase64Prefix(base64String) {
  const match = base64String.match(/^data:image\/[^;]+;base64,/);
  if (match) {
    return base64String.slice(match[0].length);
  }
  return base64String;
}

function getMimeType(fileName) {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  };
  return mimeMap[ext] || 'image/jpeg';
}

// ─── POST Handler (Upload) ───────────────────────────────────────────────────

async function handleUpload(req, res) {
  const body = req.body || {};

  // Validate required fields
  if (!body.vehicleId) {
    return res.status(400).json({ error: 'Missing required field: vehicleId' });
  }
  if (!body.type || !['before', 'after'].includes(body.type)) {
    return res.status(400).json({ error: 'Missing or invalid field: type (must be "before" or "after")' });
  }
  if (!body.step || typeof body.step !== 'string') {
    return res.status(400).json({ error: 'Missing required field: step' });
  }
  if (!body.fileData || typeof body.fileData !== 'string') {
    return res.status(400).json({ error: 'Missing required field: fileData (base64 encoded image)' });
  }
  if (!body.fileName || typeof body.fileName !== 'string') {
    return res.status(400).json({ error: 'Missing required field: fileName' });
  }

  // Decode base64
  let buffer;
  try {
    const cleanBase64 = stripBase64Prefix(body.fileData);
    buffer = Buffer.from(cleanBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'Invalid base64 fileData' });
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return res.status(413).json({
      error: `File too large. Maximum size is ${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(1)}MB. Received ${(buffer.length / (1024 * 1024)).toFixed(2)}MB.`,
    });
  }

  // Verify vehicle exists
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', body.vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Build storage path: {vehicleId}/{type}/{step}_{timestamp}.jpg
  const timestamp = Date.now();
  const storagePath = `${body.vehicleId}/${body.type}/${body.step}_${timestamp}.jpg`;
  const contentType = getMimeType(body.fileName);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('captures')
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return res.status(500).json({ error: 'Failed to upload photo to storage', details: uploadError.message });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('captures')
    .getPublicUrl(storagePath);

  const publicUrl = urlData?.publicUrl || null;

  // Insert photo record
  const insertData = {
    vehicle_id: body.vehicleId,
    type: body.type,
    step: body.step.trim(),
    step_label: body.stepLabel?.trim() || null,
    damage_flag: body.damageFlag || false,
    notes: body.notes?.trim() || null,
    storage_path: storagePath,
    file_size: buffer.length,
  };

  if (body.siteId) insertData.site_id = body.siteId;

  const { data: photo, error: dbError } = await supabase
    .from('photos')
    .insert(insertData)
    .select()
    .single();

  if (dbError) {
    console.error('Photo DB insert error:', dbError);
    // Clean up uploaded file
    await supabase.storage.from('captures').remove([storagePath]);
    return res.status(500).json({ error: 'Failed to save photo record', details: dbError.message });
  }

  res.status(201).json({
    ...photo,
    publicUrl,
  });
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

async function handleGet(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing required query parameter: id' });
  }

  const { data: photo, error } = await supabase
    .from('photos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Photo fetch error:', error);
    if (error.code === 'PGRST116') {
      return res.status(404).json({ error: 'Photo not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch photo', details: error.message });
  }

  // Generate a signed URL (valid for 1 hour)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('captures')
    .createSignedUrl(photo.storage_path, 3600);

  res.status(200).json({
    ...photo,
    signedUrl: signedError ? null : signedData?.signedUrl,
  });
}

// ─── DELETE Handler ──────────────────────────────────────────────────────────

async function handleDelete(req, res) {
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id (provide as query param or in JSON body)' });
  }

  // Fetch photo to get storage path
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('id, storage_path, step_label')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Photo fetch error:', fetchError);
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Photo not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch photo', details: fetchError.message });
  }

  // Delete from storage
  if (photo.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('captures')
      .remove([photo.storage_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
    }
  }

  // Delete DB record
  const { error: dbError } = await supabase
    .from('photos')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Photo DB delete error:', dbError);
    return res.status(500).json({ error: 'Failed to delete photo record', details: dbError.message });
  }

  res.status(200).json({
    message: `Photo "${photo.step_label || photo.id}" deleted successfully`,
    id: photo.id,
  });
}

// ─── Main Router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      return await handleUpload(req, res);
    }

    if (req.method === 'GET') {
      const { action } = req.query;
      if (action === 'get') {
        return await handleGet(req, res);
      }
      return res.status(400).json({ error: 'Missing or invalid action query parameter. Valid GET actions: get' });
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Photos handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
