import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/shared/SessionProvider";

export const metadata: Metadata = {
  title: "Shipeh Leaderboard",
  description: "Internal performance leaderboard for Shipeh account managers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(()=>{try{var t=localStorage.getItem('ui-theme-mode');if(t==='light'){document.documentElement.classList.add('theme-light')}}catch(e){}})();",
          }}
        />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
