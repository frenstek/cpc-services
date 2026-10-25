import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 4.5 * 1024 * 1024;
const VALID_ROLES = ['staff', 'driver', 'client'];

function stripBase64Prefix(base64String) {
  const match = base64String.match(/^data:image\/[^;]+;base64,/);
  if (match) {
    return base64String.slice(match[0].length);
  }
  return base64String;
}

// ─── POST Handler (Upload Signature) ────────────────────────────────────────

async function handleUpload(req, res) {
  const body = req.body || {};

  // Validate required fields
  if (!body.vehicleId) {
    return res.status(400).json({ error: 'Missing required field: vehicleId' });
  }
  if (!body.signerName || typeof body.signerName !== 'string') {
    return res.status(400).json({ error: 'Missing required field: signerName' });
  }
  if (!body.signerRole || !VALID_ROLES.includes(body.signerRole)) {
    return res.status(400).json({ error: `Missing or invalid field: signerRole (must be one of: ${VALID_ROLES.join(', ')})` });
  }
  if (!body.fileData || typeof body.fileData !== 'string') {
    return res.status(400).json({ error: 'Missing required field: fileData (base64 encoded image)' });
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

  // Build storage path: {vehicleId}/{signerRole}_{timestamp}.png
  const timestamp = Date.now();
  const storagePath = `${body.vehicleId}/${body.signerRole}_${timestamp}.png`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: false,
    });

  if (uploadError) {
    console.error('Signature storage upload error:', uploadError);
    return res.status(500).json({ error: 'Failed to upload signature to storage', details: uploadError.message });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('signatures')
    .getPublicUrl(storagePath);

  const publicUrl = urlData?.publicUrl || null;

  // Insert signature record
  const insertData = {
    vehicle_id: body.vehicleId,
    signer_name: body.signerName.trim(),
    signer_role: body.signerRole,
    storage_path: storagePath,
    created_at: new Date().toISOString(),
  };

  if (body.siteId) insertData.site_id = body.siteId;

  const { data: signature, error: dbError } = await supabase
    .from('signatures')
    .insert(insertData)
    .select()
    .single();

  if (dbError) {
    console.error('Signature DB insert error:', dbError);
    // Clean up uploaded file
    await supabase.storage.from('signatures').remove([storagePath]);
    return res.status(500).json({ error: 'Failed to save signature record', details: dbError.message });
  }

  res.status(201).json({
    ...signature,
    publicUrl,
  });
}

// ─── GET Handler (List Signatures) ──────────────────────────────────────────

async function handleList(req, res) {
  const { vehicle_id } = req.query;

  if (!vehicle_id) {
    return res.status(400).json({ error: 'Missing required query parameter: vehicle_id' });
  }

  const { data: signatures, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('vehicle_id', vehicle_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Signatures fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch signatures', details: error.message });
  }

  // Generate public URL for each signature
  const result = signatures.map((sig) => {
    const { data: urlData } = supabase.storage
      .from('signatures')
      .getPublicUrl(sig.storage_path);

    return {
      ...sig,
      publicUrl: urlData?.publicUrl || null,
    };
  });

  res.status(200).json(result);
}

// ─── DELETE Handler ─────────────────────────────────────────────────────────

async function handleDelete(req, res) {
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id (provide as query param or in JSON body)' });
  }

  // Fetch signature to get storage path
  const { data: signature, error: fetchError } = await supabase
    .from('signatures')
    .select('id, storage_path, signer_name')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Signature fetch error:', fetchError);
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({ error: 'Signature not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch signature', details: fetchError.message });
  }

  // Delete from storage
  if (signature.storage_path) {
    const { error: storageError } = await supabase.storage
      .from('signatures')
      .remove([signature.storage_path]);

    if (storageError) {
      console.error('Signature storage delete error:', storageError);
    }
  }

  // Delete DB record
  const { error: dbError } = await supabase
    .from('signatures')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Signature DB delete error:', dbError);
    return res.status(500).json({ error: 'Failed to delete signature record', details: dbError.message });
  }

  res.status(200).json({
    message: `Signature from "${signature.signer_name}" deleted successfully`,
    id: signature.id,
  });
}

// ─── Main Router ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      return await handleUpload(req, res);
    }

    if (req.method === 'GET') {
      const { action } = req.query;
      if (action === 'list') {
        return await handleList(req, res);
      }
      return res.status(400).json({ error: 'Missing or invalid action query parameter. Valid GET actions: list' });
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Signatures handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
