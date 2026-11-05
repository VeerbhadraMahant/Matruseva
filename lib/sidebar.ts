// Plain (non-"use client") module so both the server layout and the client
// AppShell can import the same string. A server component importing a constant
// from a "use client" file receives a client reference, not the value.
export const SIDEBAR_COOKIE = "ms_sidebar";
