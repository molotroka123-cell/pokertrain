// Vercel Edge Function — Leaderboard API
// In-memory store (persists during warm instance, resets on cold start)
// TODO: Replace with Vercel KV / Supabase / Firebase for production persistence

export const config = { runtime: 'edge' };

const LEADERBOARD: Map<string, any> = (globalThis as any).__leaderboard || new Map();
(globalThis as any).__leaderboard = LEADERBOARD;

const MAX_PLAYERS = 200;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // GET — fetch leaderboard
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'all';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

    let players = Array.from(LEADERBOARD.values());

    if (period === 'weekly') {
      const weekAgo = Date.now() - 7 * 86400000;
      players = players.filter((p: any) => p.lastActive > weekAgo);
    }

    players.sort((a: any, b: any) => b.gtoScore - a.gtoScore);
    players = players.slice(0, limit);

    return new Response(JSON.stringify({
      players,
      total: LEADERBOARD.size,
      updatedAt: Date.now(),
    }), { headers: CORS_HEADERS });
  }

  // POST — submit/update player stats
  if (req.method === 'POST') {
    try {
      const data = await req.json();
      const { playerId, name, gtoScore, hands, sessions, bestFinish, roi, vpip, pfr } = data;

      if (!playerId || !name) {
        return new Response(JSON.stringify({ error: 'playerId and name required' }), {
          status: 400, headers: CORS_HEADERS,
        });
      }

      const existing = LEADERBOARD.get(playerId) || {};
      const player = {
        playerId,
        name: name.slice(0, 20),
        gtoScore: Math.round(Math.min(100, Math.max(0, gtoScore || existing.gtoScore || 50))),
        hands: Math.max(hands || 0, existing.hands || 0),
        sessions: Math.max(sessions || 0, existing.sessions || 0),
        bestFinish: Math.min(bestFinish || 999, existing.bestFinish || 999),
        roi: Math.round((roi || existing.roi || 0) * 10) / 10,
        vpip: Math.round((vpip || existing.vpip || 25) * 10) / 10,
        pfr: Math.round((pfr || existing.pfr || 18) * 10) / 10,
        lastActive: Date.now(),
        joinedAt: existing.joinedAt || Date.now(),
      };

      LEADERBOARD.set(playerId, player);

      // Evict oldest if over limit
      if (LEADERBOARD.size > MAX_PLAYERS) {
        let oldest: any = null;
        for (const [k, v] of LEADERBOARD) {
          if (!oldest || (v as any).lastActive < oldest.lastActive) oldest = { key: k, ...(v as any) };
        }
        if (oldest) LEADERBOARD.delete(oldest.key);
      }

      // Calculate rank
      const sorted = Array.from(LEADERBOARD.values()).sort((a: any, b: any) => b.gtoScore - a.gtoScore);
      const rank = sorted.findIndex((p: any) => p.playerId === playerId) + 1;

      return new Response(JSON.stringify({
        ok: true,
        rank,
        total: LEADERBOARD.size,
        player,
      }), { headers: CORS_HEADERS });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400, headers: CORS_HEADERS,
      });
    }
  }

  return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
}
