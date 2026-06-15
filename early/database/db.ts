export const BASE_URL = 'http://localhost:8080';

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  highScore: number;
};

export type ApiTrack = {
  id: number;
  name: string;
  position: number;
  url: string;
};

export type ApiSong = {
  id: number;
  title: string;
  artist: string;
  tracks: ApiTrack[];
};

export type LeaderboardEntry = {
  name: string;
  highScore: number;
};

// ---------------------------------------------------------------------------
// Session : le token est gardé en mémoire (+ localStorage sur le web) et
// envoyé en header Authorization. L'identité ne transite jamais par l'URL,
// c'est le backend qui déduit l'utilisateur du token.
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'wts_session_token';
let authToken: string | null = null;

try {
  authToken = globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
} catch {
  // localStorage indisponible (natif) : session en mémoire seulement
}

function setToken(token: string | null) {
  authToken = token;
  try {
    if (token === null) globalThis.localStorage?.removeItem(TOKEN_KEY);
    else globalThis.localStorage?.setItem(TOKEN_KEY, token);
  } catch {}
}

export function isLoggedIn(): boolean {
  return authToken !== null;
}

function authHeaders(): Record<string, string> {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Invalid email or password');
  const data: { token: string; user: User } = await res.json();
  setToken(data.token);
  return data.user;
}

export async function logout(): Promise<void> {
  const token = authToken;
  setToken(null);
  if (!token) return;
  try {
    await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Le token local est déjà effacé, l'invalidation serveur est best-effort
  }
}

// Renvoie l'utilisateur connecté, ou null (invité / token expiré).
export async function getMe(): Promise<User | null> {
  if (!authToken) return null;
  const res = await fetch(`${BASE_URL}/me`, { headers: authHeaders() });
  if (res.status === 401) {
    setToken(null);
    return null;
  }
  if (!res.ok) throw new Error('Failed to fetch current user');
  return res.json();
}

// ---------------------------------------------------------------------------
// Utilisateurs (routes admin, sauf l'inscription)
// ---------------------------------------------------------------------------

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete user');
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: string = 'user'
): Promise<number> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ email, password, name, role }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to create user');
  }
  const data = await res.json();
  return data.id as number;
}

export async function updateUser(
  id: number,
  name: string,
  email: string,
  role: string,
  score: number
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, email, role, highScore: score }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to update user');
  }
}

// ---------------------------------------------------------------------------
// Chansons
// ---------------------------------------------------------------------------

export async function getSongs(): Promise<ApiSong[]> {
  const res = await fetch(`${BASE_URL}/songs`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  const songs: ApiSong[] = await res.json();
  // Les URLs des pistes renvoyées par l'API sont relatives au backend
  return songs.map((s) => ({
    ...s,
    tracks: s.tracks.map((t) => ({ ...t, url: `${BASE_URL}${t.url}` })),
  }));
}

export async function uploadSong(params: {
  title: string;
  artist: string;
  file: { uri: string; name: string; mimeType?: string } | File;
  start?: number;
  duration?: number;
}): Promise<number> {
  const form = new FormData();
  form.append('title', params.title);
  form.append('artist', params.artist);
  if (params.start !== undefined) form.append('start', String(params.start));
  if (params.duration !== undefined) form.append('duration', String(params.duration));

  if (params.file instanceof File) {
    form.append('file', params.file);
  } else {
    // React Native attend { uri, name, type }
    form.append('file', {
      uri: params.file.uri,
      name: params.file.name,
      type: params.file.mimeType ?? 'audio/mpeg',
    } as any);
  }

  const res = await fetch(`${BASE_URL}/songs`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to upload song');
  }
  const data = await res.json();
  return data.id as number;
}

export async function deleteSong(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/songs/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete song');
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

// Le backend identifie le joueur via le token de session.
export async function updateHighScore(score: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/highscore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ score }),
  });
  if (!res.ok) throw new Error('Failed to update high score');
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(`${BASE_URL}/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return (await res.json()) ?? [];
}

export const initDatabase = async () => {};
