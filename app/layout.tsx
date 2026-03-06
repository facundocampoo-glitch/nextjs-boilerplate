import "./globals.css";
import EnsureUserId from "./EnsureUserId";

export const metadata = {
  title: "Mirada MIA",
  description: "Honestidad brutal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <EnsureUserId />
        {children}
      </body>
    </html>
  );
}