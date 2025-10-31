/**
 * @fileoverview API Route para generación de documentos PDF - SENA
 * @description Microservicio especializado en la generación de documentos legales requeridos 
 * para el proceso de matrícula de aprendices SENA. Genera Acta de Compromiso para todos 
 * los aprendices y Formato de Tratamiento de Datos exclusivo para menores de edad.
 * 
 * @module api/generar-formatos
 * @requires next/server
 * @requires fs/promises
 * @requires path
 * @requires @/lib/types
 * @requires @/lib/pdf-utils
 * @version 2.0.0
 * 
 * @endpoint POST /api/generar-formatos - Genera documentos PDF
 * @endpoint GET /api/generar-formatos - Información del servicio
 * 
 * @business_logic
 * - Determina automáticamente si el aprendiz es menor de edad (TI) o mayor (CC/CE)
 * - Para menores: genera Acta de Compromiso + Formato Tratamiento de Datos
 * - Para mayores: genera solo Acta de Compromiso
 * - Valida firmas digitales y datos requeridos según normativa SENA
 * 
 * ! IMPORTANTE: El almacenamiento en Supabase está desactivado temporalmente
 * TODO: Implementar almacenamiento en Supabase cuando se defina la estrategia de persistencia
 * SECURITY: Actualmente confía en que la App Principal ya validó la autenticación
 */

import { NextRequest, NextResponse } from 'next/server'; // ✅ Next.js server utilities
import { readFile } from 'fs/promises'; // ✅ File system operations (Node.js)
import { join } from 'path'; // ✅ Path manipulation
import { 
  AprendizDataFromAPI, 
  UserDataPayload, 
  FullDocumentData, 
  CalculatedData 
} from '@/lib/types'; // ✅ TypeScript interfaces
import { generateDocuments } from '@/lib/pdf-utils'; // ✅ PDF generation engine

// ============================================================================
// ⚠️  SECCIÓN TEMPORAL - DIAGNÓSTICO DE CAMPOS PDF 
// ============================================================================
// 🎯 PROPÓSITO: Herramienta de desarrollo para inspeccionar campos disponibles
// en los PDFs base. Útil durante el desarrollo para mapear campos del formulario.
// 📌 NOTA: Esta sección debe eliminarse en producción

/**
 * @function diagnosticarCamposPDF
 * @description Herramienta de desarrollo que lista todos los campos editables 
 * en los PDFs base. Ayuda a validar que los nombres de campos coincidan entre
 * el código y las plantillas PDF.
 * @param {Uint8Array} pdfBuffer - Buffer del PDF a diagnosticar
 * @param {string} nombre - Nombre identificador del PDF para logging
 * @returns {Promise<string[]>} Lista de nombres de campos encontrados
 * @development_only
 */
async function diagnosticarCamposPDF(pdfBuffer: Uint8Array, nombre: string) {
  try {
    const { PDFDocument } = await import('pdf-lib'); // ✅ Dynamic import para reducir bundle size
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields(); // ✅ Obtener todos los campos del formulario PDF
    
    console.log(`=== CAMPOS DISPONIBLES EN ${nombre} ===`);
    fields.forEach(field => {
      console.log(`- ${field.getName()}: ${field.constructor.name}`); // ✅ Log nombre y tipo de campo
    });
    console.log(`=== TOTAL: ${fields.length} campos ===`);
    
    return fields.map(f => f.getName()); // ✅ Retornar array de nombres
  } catch (error) {
    console.error(`Error en diagnóstico de ${nombre}:`, error);
    return []; // ✅ Retornar array vacío en caso de error
  }
}

// ============================================================================
// 🗑️  FIN SECCIÓN TEMPORAL - ELIMINAR EN PRODUCCIÓN
// ============================================================================

// Configuración de runtime para Next.js - Requerido para operaciones de filesystem
export const runtime = 'nodejs'; // ✅ Especifica que este endpoint corre en Node.js runtime

// ============================================================================
// 🎯 ENDPOINT PRINCIPAL - GENERACIÓN DE DOCUMENTOS
// ============================================================================

/**
 * @function POST
 * @description Endpoint principal que genera los documentos PDF para matrícula SENA.
 * Procesa los datos del usuario, combina con información del aprendiz y genera
 * los PDFs correspondientes según el tipo de documento (mayor/menor de edad).
 * 
 * @business_process
 * 1. Validar datos de entrada del usuario
 * 2. Obtener datos del aprendiz (actualmente simulados)
 * 3. Calcular fecha actual en formato español
 * 4. Cargar plantillas PDF base
 * 5. Generar documentos llenados
 * 6. Retornar PDFs en base64 para descarga
 * 
 * @param {NextRequest} request - Solicitud HTTP con los datos del usuario
 * @returns {Promise<NextResponse>} Respuesta con documentos PDF en base64
 * @throws {400} Bad Request - Datos de entrada inválidos o campos requeridos faltantes
 * @throws {500} Internal Server Error - Error en generación de documentos
 * 
 * @example
 * // Request para menor de edad
 * POST /api/generar-formatos
 * Body: {
 *   "firma_aprendiz": "data:image/png;base64,...",
 *   "firma_tutor": "data:image/png;base64,...",
 *   "nombre_tutor": "María González",
 *   "tipo_documento_tutor": "CC",
 *   ... // todos los campos del tutor requeridos
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] 📥 Solicitud recibida en /api/generar-formatos');

    // ========================================================================
    // 🎯 PASO 1: VALIDACIÓN DE DATOS DE ENTRADA
    // ========================================================================
    // 📌 BUSINESS: Garantizar integridad de datos antes de procesar
    // 📌 SECURITY: Validación básica de campos requeridos
    
    let userPayload: UserDataPayload;
    
    try {
      userPayload = await request.json(); // ✅ Parsear JSON del body
      console.log('[API] ✅ Datos del usuario parseados correctamente');
    } catch (error) {
      console.error('[API] ❌ Error al parsear JSON:', error);
      return NextResponse.json(
        { error: 'Datos inválidos en el request body' },
        { status: 400 } // ✅ Bad Request
      );
    }

    // 🔐 VALIDACIÓN DE CAMPOS OBLIGATORIOS
    // 📌 BUSINESS: La firma del aprendiz es siempre requerida
    // 📌 BUSINESS: Campos del tutor son condicionales (solo menores de edad)
    const requiredUserFields: (keyof UserDataPayload)[] = [
      'firma_aprendiz', // ✅ Siempre requerido - representa aceptación del acta
      // 'firma_tutor',           // ❌ Condicional - solo para menores
      // 'tipo_documento_tutor',  // ❌ Condicional - solo para menores  
      // 'numero_documento_tutor', // ❌ Condicional - solo para menores
      // 'nombre_tutor',          // ❌ Condicional - solo para menores
    ];

    for (const field of requiredUserFields) {
      if (!userPayload[field]) {
        console.error(`[API] ❌ Campo obligatorio faltante: ${field}`);
        return NextResponse.json(
          { error: `Campo obligatorio faltante: ${field}` },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // 🎯 PASO 2: DATOS DEL APRENDIZ (ACTUALMENTE SIMULADOS)
    // ========================================================================
    // 📌 BUSINESS: En producción, estos datos vendrán de la base de datos SENA
    // 📌 BUSINESS: El tipo de documento (TI/CC/CE) determina si es menor de edad
    
    const aprendizDataSimulado: AprendizDataFromAPI = {
      nombre_aprendiz: 'Juan Felipe Pérez García',
      tipo_documento_aprendiz: 'TI', // 🎯 CLAVE: 'TI' = Tarjeta de Identidad = Menor de edad
      cual_tipo_id_aprendiz: '',
      numero_documento_aprendiz: '3456780',
      programa_formacion: 'Tecnología en Análisis y Desarrollo de Software',
      numero_ficha: '7725999',
      centro_formacion: 'Centro de Comercio y Servicios',
      ciudad: 'Popayán',
      regional: 'Cauca',
    };

    console.log('[API] 📋 Datos simulados cargados:', {
      aprendiz: aprendizDataSimulado.nombre_aprendiz,
      documento: aprendizDataSimulado.numero_documento_aprendiz,
      tipo_documento: aprendizDataSimulado.tipo_documento_aprendiz,
      es_menor: aprendizDataSimulado.tipo_documento_aprendiz === 'TI' ? 'SÍ' : 'NO'
    });

    // ========================================================================
    // 🎯 PASO 3: CÁLCULO DE FECHA ACTUAL EN FORMATO ESPAÑOL
    // ========================================================================
    // 📌 BUSINESS: Los documentos legales requieren fecha en formato español
    // 📌 COMPLIANCE: Formato "26 de octubre de 2025" para validez legal
    
    const calculatedData = calculateCurrentDate();
    console.log('[API] 📅 Fecha calculada:', calculatedData.fecha);

    // ========================================================================
    // 🎯 PASO 4: COMBINACIÓN DE TODOS LOS DATOS
    // ========================================================================
    // 📌 ARCHITECTURE: Unificación de datos de múltiples fuentes
    // 📌 BUSINESS: Estructura completa para generación de documentos
    
    const fullData: FullDocumentData = {
      ...aprendizDataSimulado,  // Datos del aprendiz (SENA)
      ...userPayload,           // Datos del usuario (formulario)
      ...calculatedData,        // Datos calculados (fecha)
    };

    console.log('[API] ✅ Datos completos combinados exitosamente');

    // ========================================================================
    // 🎯 PASO 5: CARGA DE PLANTILLAS PDF BASE
    // ========================================================================
    // 📌 BUSINESS: Carga las plantillas oficiales SENA desde el filesystem
    // 📌 COMPLIANCE: Usa formatos oficiales aprobados por el SENA
    
    const publicPath = join(process.cwd(), 'public'); // ✅ Ruta absoluta a /public
    
    const actaPdfPath = join(publicPath, 'formato_acta_compromiso.pdf');
    const tratamientoPdfPath = join(publicPath, 'formato_tratamiento_datos.pdf');

    console.log('[API] 📁 Cargando PDFs base desde:', publicPath);

    let actaPdfBuffer: Buffer;
    let tratamientoPdfBuffer: Buffer;

    try {
      actaPdfBuffer = await readFile(actaPdfPath); // ✅ Leer archivo del filesystem
      tratamientoPdfBuffer = await readFile(tratamientoPdfPath);
      console.log('[API] ✅ PDFs base cargados correctamente');
    } catch (error) {
      console.error('[API] ❌ Error al cargar PDFs base:', error);
      return NextResponse.json(
        { error: 'Error al cargar los PDFs base. Verifica que existan en /public' },
        { status: 500 } // ✅ Internal Server Error
      );
    }

    // ========================================================================
    // 🎯 PASO 6: GENERACIÓN DE DOCUMENTOS PDF
    // ========================================================================
    // 📌 BUSINESS: Lógica central que llena los PDFs con los datos combinados
    // 📌 BUSINESS: Decide automáticamente qué documentos generar
    
    console.log('[API] 🚀 Iniciando generación de documentos...');

    const generatedDocs = await generateDocuments(
      fullData,
      new Uint8Array(actaPdfBuffer), // ✅ Convertir Buffer a Uint8Array
      new Uint8Array(tratamientoPdfBuffer)
    );

    console.log('[API] ✅ Documentos generados exitosamente:', {
      acta: generatedDocs.actaCompromiso.filename,
      tratamiento: generatedDocs.tratamientoDatos?.filename || 'NO GENERADO',
      motivo: fullData.tipo_documento_aprendiz === 'TI' ? 
        'Menor de edad - Ambos documentos' : 'Mayor de edad - Solo acta'
    });

    // ========================================================================
    // 🎯 PASO 7: PREPARACIÓN DE RESPUESTA CON PDFs
    // ========================================================================
    // 📌 BUSINESS: Convierte PDFs a base64 para descarga directa en el frontend
    // 📌 UX: Permite descarga inmediata sin almacenamiento temporal
    
    console.log('[API] 📤 Preparando respuesta con ambos PDFs...');

    const responseData = {
      success: true,
      message: 'Documentos generados exitosamente',
      documentos: {
        acta_compromiso: {
          filename: generatedDocs.actaCompromiso.filename,
          pdf_base64: Buffer.from(generatedDocs.actaCompromiso.buffer).toString('base64'), // ✅ Convertir a base64
          size: generatedDocs.actaCompromiso.buffer.length,
        },
        tratamiento_datos: {
          filename: generatedDocs.tratamientoDatos?.filename,
          pdf_base64: generatedDocs.tratamientoDatos ? 
            Buffer.from(generatedDocs.tratamientoDatos.buffer).toString('base64') : null, // ✅ Null si no se generó
          size: generatedDocs.tratamientoDatos?.buffer.length,
        }
      },
      metadata: {
        aprendiz: fullData.nombre_aprendiz,
        tutor: fullData.nombre_tutor,
        fecha_generacion: new Date().toISOString(),
        nota: 'Almacenamiento en Supabase desactivado temporalmente' // ✅ Información de estado
      }
    };

    console.log('[API] ✅ Enviando respuesta con PDFs en base64');

    return NextResponse.json(responseData, { status: 200 }); // ✅ Success response

  } catch (error) {
    // ========================================================================
    // 🚨 MANEJO GLOBAL DE ERRORES
    // ========================================================================
    // 📌 RELIABILITY: Captura cualquier error no manejado en el proceso
    // 📌 DEBUG: En desarrollo incluye detalles del error, en producción solo mensaje genérico
    
    console.error('[API] 🚨 Error inesperado en el proceso:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al generar documentos',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined, // ✅ Solo detalles en dev
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// 🛠️  FUNCIONES AUXILIARES
// ============================================================================

/**
 * @function calculateCurrentDate
 * @description Calcula la fecha actual en formato español completo para documentos legales.
 * Los documentos del SENA requieren fecha en formato "26 de octubre de 2025" para validez.
 * 
 * @business_rules
 * - Formato: "DD de MES de AAAA"
 * - Meses en español minúscula
 * - Día sin ceros a la izquierda (pero este implementation usa con cero)
 * - Año completo de 4 dígitos
 * 
 * @returns {CalculatedData} Objeto con componentes individuales y fecha formateada
 * @example
 * // Retorna: 
 * // {
 * //   dia: "26",
 * //   mes: "octubre", 
 * //   año: "2025",
 * //   fecha: "26 de octubre de 2025"
 * // }
 */
function calculateCurrentDate(): CalculatedData {
  const ahora = new Date(); // ✅ Fecha actual
  
  const mesesEs = [ // ✅ Array de meses en español
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dia = ahora.getDate().toString().padStart(2, '0'); // ✅ Día con 2 dígitos
  const mes = mesesEs[ahora.getMonth()]; // ✅ Mes en español
  const año = ahora.getFullYear().toString(); // ✅ Año de 4 dígitos
  const fecha = `${dia} de ${mes} de ${año}`; // ✅ Formato completo

  return { dia, mes, año, fecha };
}

// ============================================================================
// ℹ️  ENDPOINT GET - INFORMACIÓN DEL SERVICIO
// ============================================================================

/**
 * @function GET  
 * @description Endpoint informativo que describe el servicio y proporciona
 * datos de prueba para desarrollo. No genera documentos, solo metadata.
 * 
 * @business_purpose
 * - Documentación automática del servicio
 * - Datos de prueba para desarrollo frontend
 * - Verificación de salud del endpoint
 * 
 * @returns {Promise<NextResponse>} Información del servicio y datos de ejemplo
 */
export async function GET() {
  // 📌 BUSINESS: Datos de prueba representativos - mismo formato que en POST
  // 📌 DEVELOPMENT: Permite probar el frontend sin enviar datos reales
  const aprendizDataSimulado = {
    nombre_aprendiz: 'Juan Felipe Pérez García',
    tipo_documento_aprendiz: 'TI', // 🎯 CAMBIAR ENTRE 'TI' y 'CC' PARA PROBAR DIFERENTES FLUJOS
    cual_tipo_id_aprendiz: '',
    numero_documento_aprendiz: '3456780',
    programa_formacion: 'Tecnología en Análisis y Desarrollo de Software',
    numero_ficha: '1725999',
    centro_formacion: 'Centro de Servicios y Gestión Empresarial',
    ciudad: 'Popayán',
    regional: 'Cauca',
  };

  return NextResponse.json({
    endpoint: '/api/generar-formatos',
    method: 'POST',
    description: 'Generar documentos PDF del SENA (descarga directa)',
    status: 'Almacenamiento en Supabase desactivado temporalmente',
    generates: [
      'Acta de Compromiso',
      'Formato de Tratamiento de Datos'
    ],
    note: 'Los PDFs se retornan en base64 para descarga directa',
    // ✅ BUSINESS: Incluye datos de aprendiz para pruebas frontend
    aprendiz: aprendizDataSimulado
  });
}