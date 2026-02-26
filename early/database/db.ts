const BASE_URL = 'http://localhost:8080';

export type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  highScore: number;
};

export const db = {
  getAllSync: () => [],
  runSync: () => {},
};

export async function getUserByEmail(email: string): Promise<User | null> {
  const res = await fetch(`${BASE_URL}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  const users: User[] = await res.json();
  return users.find((u) => u.email === email) ?? null;
}

export async function getAllUsers(): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/users`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${id}`, {
    method: 'DELETE',
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, role, highScore: score }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to update user');
  }
}

export const initDatabase = async () => {};

