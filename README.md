# SENA-Gestion-Educativa

Pequeño proyecto Next.js + TypeScript para generación de PDF con pdf-lib y Supabase (desktop).

Requisitos
- Node.js 18+ (recomendado) y npm
- Git
- Supabase Desktop (si usas la integración local)

Clonar y configurar (Windows PowerShell)

1. Clonar el repositorio

```powershell
git clone https://github.com/EdwinBrito2020/SENA-Gestion-Educativa.git
cd SENA-Gestion-Educativa
```

2. Instalar dependencias

```powershell
npm install
```

3. Variables de entorno

Este proyecto espera variables de entorno para conectar a Supabase (si vas a usar almacenamiento). Crea un archivo `.env.local` en la raíz con las variables necesarias. Ejemplo mínimo:

```text
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=pk.xxxxxx
SUPABASE_SERVICE_ROLE_KEY=sk.xxxxxx
# Opcional: RUTA donde guardar archivos temporales
PDF_OUTPUT_DIR=./tmp
```

4. Ejecutar en modo desarrollo

```powershell
npm run dev
# Abre http://localhost:3000
```

5. Construir para producción

```powershell
npm run build; npm start
```

Notas y recomendaciones
- El repositorio incluye `.gitattributes` para normalizar finales de línea (LF). Si trabajas en Windows, evita cambiar la configuración global de Git que convierta automáticamente LF ↔ CRLF.
- `.gitignore` ya excluye `node_modules/`, `.env*`, `.next/` y otros artefactos.
- Si vas a colaborar desde otra máquina utiliza un Personal Access Token (PAT) o configura SSH para evitar problemas de autenticación.

Cómo contribuir rápido
- Crear una rama a partir de `main` antes de cambios grandes:

```powershell
git checkout -b feat/mi-cambio
```

- Hacer commits pequeños y descriptivos, luego:

```powershell
git push origin feat/mi-cambio
# Abrir un Pull Request en GitHub
```

Soporte
- Si necesitas ayuda para configurar Supabase Desktop o el flujo de autenticación con GitHub, dime y preparo instrucciones paso a paso.
