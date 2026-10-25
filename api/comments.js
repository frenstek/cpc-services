import { supabase } from './_lib/supabase.js';
import { setCors, handleOptions } from './_lib/cors.js';

// ─── POST Handler (Create Comment) ─────────────────────────────────────────

async function handleCreate(req, res) {
  const body = req.body || {};

  if (!body.vehicleId) {
    return res.status(400).json({ error: 'Missing required field: vehicleId' });
  }
  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    return res.status(400).json({ error: 'Missing required field: content' });
  }

  const { data: comment, error: dbError } = await supabase
    .from('comments')
    .insert({
      vehicle_id: body.vehicleId,
      content: body.content.trim(),
      author: body.author?.trim() || 'Staff',
    })
    .select()
    .single();

  if (dbError) {
    console.error('Comment insert error:', dbError);
    return res.status(500).json({ error: 'Failed to create comment', details: dbError.message });
  }

  res.status(201).json(comment);
}

// ─── DELETE Handler ─────────────────────────────────────────────────────────

async function handleDelete(req, res) {
  const id = req.query?.id || req.body?.id;

  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }

  const { error: dbError } = await supabase
    .from('comments')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('Comment delete error:', dbError);
    return res.status(500).json({ error: 'Failed to delete comment', details: dbError.message });
  }

  res.status(200).json({ message: 'Comment deleted successfully', id });
}

// ─── Main Router ────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    if (req.method === 'POST') {
      return await handleCreate(req, res);
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Comments handler error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
