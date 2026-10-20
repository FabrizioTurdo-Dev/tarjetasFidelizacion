import type { Metadata } from "next";

export const metadata: Metadata = { manifest: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/manifest-admin.webmanifest` };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
