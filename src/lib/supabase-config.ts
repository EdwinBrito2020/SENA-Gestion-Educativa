// src/lib/supabase-config.ts

/**
 * CONFIGURACIÓN Y UTILIDADES PARA SUPABASE STORAGE
 * 
 * Este archivo maneja la conexión con Supabase y proporciona funciones
 * para almacenar los PDFs generados en Supabase Storage.
 * 
 * NOTA: Actualmente preparado con placeholders para implementación futura.
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================================
// 1. CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================================================

/**
 * Carga las credenciales de Supabase desde las variables de entorno
 * Estas variables deben estar definidas en .env.local
 * 
 * Variables requeridas:
 * - NEXT_PUBLIC_SUPABASE_URL: URL del proyecto Supabase
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Clave anónima de Supabase
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ============================================================================
// 2. INICIALIZACIÓN DEL CLIENTE DE SUPABASE
// ============================================================================

/**
 * Cliente de Supabase para operaciones de storage
 * Se crea una única instancia que se reutiliza en toda la aplicación
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// 3. CONFIGURACIÓN DEL BUCKET DE STORAGE
// ============================================================================

/**
 * Nombre del bucket de Supabase Storage donde se almacenarán los PDFs
 * Debe existir previamente en tu proyecto de Supabase
 */
const PDF_BUCKET_NAME = process.env.SUPABASE_PDF_BUCKET || 'pdf-documentos';

/**
 * Estructura de carpetas dentro del bucket
 * Los PDFs se organizarán en subcarpetas por tipo de documento
 */
const STORAGE_PATHS = {
  actaCompromiso: 'actas-compromiso',
  tratamientoDatos: 'tratamiento-datos',
} as const;

// ============================================================================
// 4. FUNCIÓN PARA SUBIR ARCHIVOS A SUPABASE STORAGE
// ============================================================================

/**
 * Sube un archivo PDF a Supabase Storage
 * 
 * @param fileBuffer - Buffer del archivo PDF a subir
 * @param filename - Nombre del archivo (debe incluir extensión .pdf)
 * @param documentType - Tipo de documento ('actaCompromiso' | 'tratamientoDatos')
 * @returns Promise con la URL pública del archivo subido o null si falla
 * 
 * PASO 1: Construir la ruta completa del archivo
 * PASO 2: Intentar subir el archivo al bucket
 * PASO 3: Obtener la URL pública del archivo subido
 * PASO 4: Manejar errores y retornar el resultado
 */
export async function uploadPDFToSupabase(
  fileBuffer: Uint8Array,
  filename: string,
  documentType: keyof typeof STORAGE_PATHS
): Promise<string | null> {
  try {
    // PASO 1: Construir la ruta del archivo dentro del bucket
    const folderPath = STORAGE_PATHS[documentType];
    const filePath = `${folderPath}/${filename}`;

    console.log(`[Supabase] Iniciando carga de archivo: ${filePath}`);

    // PASO 2: Subir el archivo al bucket de Supabase Storage
    const { data, error } = await supabase.storage
      .from(PDF_BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600', // Cache de 1 hora
        upsert: false, // No sobrescribir si ya existe
      });

    // PASO 3: Verificar si hubo errores en la carga
    if (error) {
      console.error('[Supabase] Error al subir archivo:', error);
      return null;
    }

    // PASO 4: Obtener la URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(PDF_BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log(`[Supabase] Archivo subido exitosamente: ${publicUrlData.publicUrl}`);
    
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('[Supabase] Error inesperado:', error);
    return null;
  }
}

// ============================================================================
// 5. FUNCIÓN PARA ALMACENAR AMBOS DOCUMENTOS GENERADOS
// ============================================================================

/**
 * Almacena los documentos generados en Supabase Storage
 * 
 * @param actaBuffer - Buffer del PDF del Acta de Compromiso
 * @param actaFilename - Nombre del archivo del Acta
 * @param tratamientoBuffer - Buffer del PDF de Tratamiento de Datos (opcional)
 * @param tratamientoFilename - Nombre del archivo de Tratamiento (opcional)
 * @returns Promise con las URLs de los archivos subidos
 * 
 * NOTA: Esta función es llamada desde la API Route después de generar los PDFs
 */
export async function storeGeneratedDocuments(
  actaBuffer: Uint8Array,
  actaFilename: string,
  tratamientoBuffer?: Uint8Array,
  tratamientoFilename?: string
): Promise<{ actaUrl: string | null; tratamientoUrl: string | null }> {
  
  console.log('[Supabase] Iniciando almacenamiento de documentos generados...');

  // PASO 1: Subir el Acta de Compromiso (obligatorio)
  const actaUrl = await uploadPDFToSupabase(
    actaBuffer,
    actaFilename,
    'actaCompromiso'
  );

  // PASO 2: Subir el Tratamiento de Datos (solo si es menor de edad)
  let tratamientoUrl: string | null = null;
  if (tratamientoBuffer && tratamientoFilename) {
    tratamientoUrl = await uploadPDFToSupabase(
      tratamientoBuffer,
      tratamientoFilename,
      'tratamientoDatos'
    );
  }

  console.log('[Supabase] Almacenamiento completado:', {
    acta: actaUrl ? 'OK' : 'FALLÓ',
    tratamiento: tratamientoBuffer ? (tratamientoUrl ? 'OK' : 'FALLÓ') : 'NO REQUERIDO'
  });

  return { actaUrl, tratamientoUrl };
}

// ============================================================================
// 6. VERIFICACIÓN DE CONFIGURACIÓN
// ============================================================================

/**
 * Verifica que las variables de entorno estén configuradas correctamente
 * Útil para debugging durante el desarrollo
 */
export function checkSupabaseConfig(): boolean {
  const isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
  
  if (!isConfigured) {
    console.warn('[Supabase] Advertencia: Credenciales no configuradas en .env.local');
  }
  
  return isConfigured;
}