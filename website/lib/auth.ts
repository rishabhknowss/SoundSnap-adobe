import jwt from "jsonwebtoken";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET!;

interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function createToken(user: { id: string; email: string; name: string | null }) {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name || "" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function getAuthUser(headers: Headers) {
  const token = getTokenFromHeaders(headers);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.userId } });
}

export function userResponse(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  credits: number;
  emailVerified: boolean;
  activationKey: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    credits: user.credits,
    emailVerified: user.emailVerified,
    activationKey: user.activationKey,
  };
}
