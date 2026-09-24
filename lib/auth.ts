"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";

export async function login(password: string) {
  const expected = process.env.PACKWELL_PASSWORD;
  if (!expected) {
    return { ok: false as const, error: "The shared password is not set on the server yet." };
  }
  if (password !== expected) {
    return { ok: false as const, error: "That password is not right." };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
