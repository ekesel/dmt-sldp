import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./auth/AuthContext";
import SessionMonitorProvider from "./SessionMonitorProvider";
import { TenantProvider } from "./context/TenantContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DMT-SLDP | Admin Portal",
  description: "Platform Administration and Tenant Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <SessionMonitorProvider>
            <TenantProvider autoLoad={false}>
                {children}
            </TenantProvider>
          </SessionMonitorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}