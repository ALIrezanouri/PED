import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const vazirmatn = Vazirmatn({
  variable: "--font-sans",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "تحلیل کشش قیمتی تقاضا | Price Elasticity Analytics",
  description:
    "پلتفرم سازمانی تحلیل کشش قیمتی تقاضا برای هر محصول و هر گروه محصول",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`${vazirmatn.variable} dark h-full antialiased`}
    >
      <body className="bg-background text-foreground min-h-full">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="top-center" richColors />
        <Script
          src="https://cdn.plot.ly/plotly-2.27.0.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
