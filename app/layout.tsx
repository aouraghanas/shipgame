import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/shared/SessionProvider";
import { I18nProvider } from "@/components/shared/I18nProvider";

export const metadata: Metadata = {
  title: "Shipeh Leaderboard",
  description: "Internal performance leaderboard for Shipeh account managers",
};

/** Runs before React hydrates so dir/lang and theme are correct on first paint. */
const earlyBoot = `(()=>{try{
  var t=localStorage.getItem('ui-theme-mode');
  if(t==='light'){document.documentElement.classList.add('theme-light');}
  var l=localStorage.getItem('ui-locale');
  if(l==='ar'){
    document.documentElement.lang='ar';
    document.documentElement.dir='rtl';
  } else {
    document.documentElement.lang='en';
    document.documentElement.dir='ltr';
  }
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: earlyBoot }} />
        <SessionProvider>
          <I18nProvider>{children}</I18nProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
