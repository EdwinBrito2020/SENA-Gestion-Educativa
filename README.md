# SENA-Gestion-Educativa
# Microservicio de Generación de PDFs - SENA

## 🎯 Propósito
Microservicio especializado en la generación automatizada de documentos PDF para el proceso de matrícula de aprendices SENA.

## 📋 Documentos Generados
- **Acta de Compromiso** (para todos los aprendices)
- **Formato de Tratamiento de Datos** (exclusivo para aprendices menores de edad)

## 🚀 Características Principales
- ✅ Generación de PDFs con campos prellenados
- ✅ Captura de firmas digitales
- ✅ Flujos diferenciados para mayores y menores de edad
- ✅ Validación completa de datos
- ✅ Interfaz responsive y amigable

## 🏗️ Arquitectura Técnica
- **Frontend**: Next.js 14 + React + TypeScript
- **Generación PDF**: pdf-lib
- **Estilos**: Tailwind CSS
- **Runtime**: Node.js

## 🔄 Flujos Soportados

### Para Aprendices Mayores de Edad
1. Lectura del Acta de Compromiso
2. Captura de firma del aprendiz
3. Descarga del PDF generado

### Para Aprendices Menores de Edad  
1. Lectura del Acta de Compromiso
2. Captura de firma del aprendiz
3. Registro de datos del tutor legal
4. Lectura del Formato de Tratamiento de Datos
5. Captura de firma del tutor
6. Descarga de ambos PDFs

🔧 Estructura de Desarrollo
Archivos Principales
src/components/FormularioGeneradorPDF.tsx - Componente principal del frontend

src/app/api/generar-formatos/route.ts - Endpoint de la API

src/lib/pdf-utils.ts - Lógica de generación de PDFs

src/lib/types.ts - Definiciones de TypeScript

Recursos
public/formato_acta_compromiso.pdf - Plantilla del acta

public/formato_tratamiento_datos.pdf - Plantilla de tratamiento

## 📁 Estructura del Proyecto

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

Autenticación con GitHub (PAT o SSH)

Para clonar y hacer push a GitHub desde otra máquina, tienes dos opciones seguras recomendadas: Personal Access Token (PAT) por HTTPS o claves SSH. A continuación tienes pasos cortos para ambas en Windows (PowerShell).

1) Usar un Personal Access Token (HTTPS)

- Crear el PAT en GitHub:
	1. Entra a https://github.com/settings/tokens
	2. Haz clic en "Generate new token" → elegir "Fine-grained" o clásico según tu preferencia.
	3. Otorga permisos para repos (repo) y/o workflow según necesites. Copia el token una vez creado.

- Clonar y usar el PAT (PowerShell):

```powershell
# Clonar con HTTPS (te pedirá usuario y contraseña). Como contraseña pega el PAT.
git clone https://github.com/EdwinBrito2020/SENA-Gestion-Educativa.git

# O, si prefieres no introducirlo cada vez, configura el helper de credenciales de Windows:
git config --global credential.helper manager
# Luego el primer push/clone te pedirá usuario y PAT y el Helper los guardará de forma segura.
```

Nota: para scripts automatizados evita poner el PAT en URLs en texto plano. Usa el helper de credenciales o variables de entorno en CI.

2) Usar claves SSH (recomendado para desarrolladores frecuentes)

- Generar una clave SSH en Windows (PowerShell):

```powershell
# Generar clave (acepta la ruta por defecto y opcionalmente una passphrase)
ssh-keygen -t ed25519 -C "tu-email@example.com"

# Copiar la clave pública al portapapeles (PowerShell)
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub | Set-Clipboard
```

- Añadir la clave pública a GitHub:
	1. En GitHub ve a Settings → SSH and GPG keys → New SSH key.
	2. Pega la clave pública (lo que copiaste) y guarda.

- Clonar usando SSH:

```powershell
git clone git@github.com:EdwinBrito2020/SENA-Gestion-Educativa.git
```

Ventajas y notas rápidas
- SSH evita introducir credenciales continuamente y es más cómodo una vez configurado.
- PAT + Credential Manager es sencillo y funciona bien si prefieres HTTPS.
- Si trabajas en varias máquinas, genera claves diferentes por máquina y etiqueta cada clave en GitHub.

Si quieres, puedo generar un pequeño checklist personalizado con comandos exactos para tu otra máquina y validar que el push/pull funciona desde allí.
