import type { Metadata } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ["500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-zen-maru",
  display: "swap",
});

export const metadata: Metadata = {
  title: "音トレピアノ",
  description: "楽譜に合わせてピアノを練習しよう",
};

const criticalCss = `
:root {
  --ink: #2A2A40;
  --ink-soft: #4A4A65;
  --muted: #8A8AA0;
  --lavender-50: #F4F1FB;
  --lavender-100: #EAE3F8;
  --lavender-200: #D8CCF1;
  --lavender-500: #8B7DD8;
  --lavender-700: #6A57C2;
  --pink: #FF7AB6;
  --coral: #F56B6B;
  --orange: #F59533;
  --yellow: #F2C535;
  --green: #5DC785;
  --blue: #4D9FE0;
  --card-bg: #FFFFFF;
  --card-shadow: 0 2px 4px rgba(80,70,130,.04), 0 12px 32px rgba(80,70,130,.07);
  --card-shadow-hover: 0 4px 8px rgba(80,70,130,.06), 0 20px 44px rgba(80,70,130,.12);
  --r-card: 22px;
  --r-pill: 999px;
  --r-icon: 16px;
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  color: var(--ink);
  font-family: "Zen Maru Gothic","M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif;
  -webkit-font-smoothing: antialiased;
}
button { font-family: inherit; }
.stage {
  position: relative;
  min-height: 100vh;
  background-color: #fff;
  background-image: url("/images/bg-top.png"), url("/images/bg-bottom.png");
  background-repeat: no-repeat, no-repeat;
  background-position: top center, bottom center;
  background-size: 100% auto, 100% auto;
  overflow-x: hidden;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeUp .35s ease both; }
@keyframes pop {
  from { opacity: 0; transform: scale(.9) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes gentle-rise {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-4px); }
}
@keyframes modal-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.bpm-slider {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 10px; border-radius: 999px;
  background: linear-gradient(90deg, var(--lavender-500) 0, var(--lavender-500) var(--fill,50%), #E8E2F4 var(--fill,50%), #E8E2F4 100%);
  outline: none; cursor: pointer;
}
.bpm-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--lavender-500); border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(106,87,194,.4); cursor: pointer;
}
.bpm-slider::-moz-range-thumb {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--lavender-500); border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(106,87,194,.4); cursor: pointer;
}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={zenMaruGothic.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
