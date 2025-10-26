// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Generador de Formatos SENA',
  description: 'Aplicación para generar formatos PDF de actas y tratamiento de datos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* 
        - Aplica aquí utilidades base de Tailwind para toda la app.
        - 'antialiased' mejora el renderizado de fuentes.
        - 'min-h-dvh' asegura que el body ocupe la altura de la ventana.
      */}
      <body className="min-h-dvh bg-white text-gray-900 antialiased">
        {/* 
          Puedes envolver el contenido en un contenedor para un ancho máximo global.
          Si prefieres, mantenlo simple y deja {children} directamente.
        */}
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}