import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';
import crypto from 'crypto';

// ─── POST Handler (Create Share Link) ────────────────────────────────────────

async function handleCreate(req, res) {
  const body = req.body || {};

  if (!body.vehicleId) {
    return res.status(400).json({ error: 'Missing required field: vehicleId' });
  }

  // Verify vehicle exists
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, rego')
    .eq('id', body.vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Generate a unique share token
  const token = crypto.randomBytes(32).toString('hex');

  // Default expiry: 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { data: shareLink, error } = await supabase
    .from('share_links')
    .insert({
      vehicle_id: body.vehicleId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Share link create error:', error);
    return res.status(500).json({ error: 'Failed to create share link', details: error.message });
  }

  res.status(201).json({
    ...shareLink,
    token,
  });
}

// ─── GET Handler (Public View by Token) ──────────────────────────────────────

async function handleGetByToken(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing required query parameter: token' });
  }

  // Fetch share link
  const { data: shareLink, error: linkError } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .single();

  if (linkError || !shareLink) {
    return res.status(404).json({ error: 'Share link not found or invalid' });
  }

  // Check if expired
  if (shareLink.expires_at) {
    const expiresAt = new Date(shareLink.expires_at);
    if (expiresAt < new Date()) {
      return res.status(410).json({ error: 'This share link has expired' });
    }
  }

  // Fetch vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', shareLink.vehicle_id)
    .single();

  if (vehicleError || !vehicle) {
    return res.status(404).json({ error: 'Vehicle not found' });
  }

  // Fetch photos
  const { data: rawPhotos } = await supabase
    .from('photos')
    .select('*')
    .eq('vehicle_id', vehicle.id);

  // Generate public URLs
  const photos = (rawPhotos || []).map(photo => {
    if (photo.storage_path) {
      const { data: urlData } = supabase.storage.from('captures').getPublicUrl(photo.storage_path);
      return { ...photo, public_url: urlData?.publicUrl || null };
    }
    return { ...photo, public_url: null };
  });

  // Update view count
  await supabase
    .from('share_links')
    .update({
      view_count: (shareLink.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq('id', shareLink.id);

  res.status(200).json({
    vehicle: { ...vehicle, photos },
    share: {
      created_at: shareLink.created_at,
      expires_at: shareLink.expires_at,
    },
  });
}

// ─── Main Router ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      return await handleCreate(req, res);
    }

    if (req.method === 'GET') {
      return await handleGetByToken(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Share handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
