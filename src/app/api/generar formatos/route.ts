// src/app/api/generar-formatos/route.ts

/**
 * API ROUTE PARA GENERACIÓN DE DOCUMENTOS PDF
 * 
 * Endpoint: POST /api/generar-formatos
 * 
 * Este microservicio recibe datos del usuario, los combina con datos simulados
 * de la API/DB, genera los PDFs correspondientes, y los retorna para descarga.
 * También incluye lógica para almacenamiento futuro en Supabase Storage.
 * 
 * FLUJO COMPLETO:
 * 1. Recibir y validar datos del POST
 * 2. Simular datos de la API/DB
 * 3. Calcular datos automáticos (fecha)
 * 4. Cargar PDFs base desde /public
 * 5. Generar documentos llenados
 * 6. Almacenar en Supabase (preparado)
 * 7. Retornar PDF al usuario para descarga
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { 
  AprendizDataFromAPI, 
  UserDataPayload, 
  FullDocumentData, 
  CalculatedData 
} from '@/lib/types';
import { generateDocuments } from '@/lib/pdf-utils';
import { storeGeneratedDocuments } from '@/lib/supabase-config';

// ============================================================================
// 1. CONFIGURACIÓN DE LA API ROUTE
// ============================================================================

/**
 * Configuración del runtime de Next.js
 * 'nodejs' permite el uso de fs para leer archivos del sistema
 */
export const runtime = 'nodejs';

// ============================================================================
// 2. HANDLER PRINCIPAL DEL ENDPOINT POST
// ============================================================================

/**
 * Maneja las peticiones POST al endpoint /api/generar-formatos
 * 
 * @param request - Request de Next.js con los datos del usuario
 * @returns Response con el PDF generado o mensaje de error
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Solicitud recibida en /api/generar-formatos');

    // ========================================================================
    // PASO 1: PARSEAR Y VALIDAR LOS DATOS RECIBIDOS DEL USUARIO
    // ========================================================================
    
    let userPayload: UserDataPayload;
    
    try {
      userPayload = await request.json();
      console.log('[API] Datos del usuario parseados correctamente');
    } catch (error) {
      console.error('[API] Error al parsear JSON:', error);
      return NextResponse.json(
        { error: 'Datos inválidos en el request body' },
        { status: 400 }
      );
    }

    // Validar campos obligatorios del usuario
    const requiredUserFields: (keyof UserDataPayload)[] = [
      'firma_aprendiz',
      'firma_tutor',
      'tipo_y_documento_tutor',
      'nombre_tutor',
    ];

    for (const field of requiredUserFields) {
      if (!userPayload[field]) {
        console.error(`[API] Campo obligatorio faltante: ${field}`);
        return NextResponse.json(
          { error: `Campo obligatorio faltante: ${field}` },
          { status: 400 }
        );
      }
    }

    // ========================================================================
    // PASO 2: SIMULAR DATOS DE LA API/BASE DE DATOS
    // ========================================================================
    
    /**
     * NOTA IMPORTANTE: Estos datos están simulados para desarrollo.
     * En producción, estos datos se obtendrían de:
     * - Una consulta a la base de datos
     * - Una llamada a otra API interna
     * - El sistema de gestión del SENA
     * 
     * Para implementar en producción, reemplazar con:
     * const aprendizData = await fetchAprendizDataFromDB(aprendizId);
     */
    const aprendizDataSimulado: AprendizDataFromAPI = {
      nombre_aprendiz: 'Juan Pérez García',
      tipo_documento_aprendiz: 'TI', // Cambiar a 'CC', 'CE', 'Otro' para probar diferentes flujos
      cual_tipo_id_aprendiz: '', // Solo si tipo es 'Otro'
      numero_documento_aprendiz: '1234567890',
      programa_formacion: 'Tecnología en Análisis y Desarrollo de Software',
      numero_ficha: '2845123',
      centro_formacion: 'Centro de Servicios y Gestión Empresarial',
      ciudad: 'Popayán',
      regional: 'Cauca',
    };

    console.log('[API] Datos simulados cargados:', {
      aprendiz: aprendizDataSimulado.nombre_aprendiz,
      documento: aprendizDataSimulado.numero_documento_aprendiz,
      tipo: aprendizDataSimulado.tipo_documento_aprendiz,
    });

    // ========================================================================
    // PASO 3: CALCULAR DATOS AUTOMÁTICOS (FECHA ACTUAL)
    // ========================================================================
    
    const calculatedData = calculateCurrentDate();
    console.log('[API] Fecha calculada:', calculatedData.fecha);

    // ========================================================================
    // PASO 4: COMBINAR TODOS LOS DATOS EN UNA ESTRUCTURA COMPLETA
    // ========================================================================
    
    const fullData: FullDocumentData = {
      ...aprendizDataSimulado,
      ...userPayload,
      ...calculatedData,
    };

    console.log('[API] Datos completos combinados exitosamente');

    // ========================================================================
    // PASO 5: CARGAR LOS PDFs BASE DESDE LA CARPETA /public
    // ========================================================================
    
    const publicPath = join(process.cwd(), 'public');
    
    const actaPdfPath = join(publicPath, 'formato_acta_compromiso.pdf');
    const tratamientoPdfPath = join(publicPath, 'formato_tratamiento_datos.pdf');

    console.log('[API] Cargando PDFs base desde:', publicPath);

    let actaPdfBuffer: Buffer;
    let tratamientoPdfBuffer: Buffer;

    try {
      actaPdfBuffer = await readFile(actaPdfPath);
      tratamientoPdfBuffer = await readFile(tratamientoPdfPath);
      console.log('[API] PDFs base cargados correctamente');
    } catch (error) {
      console.error('[API] Error al cargar PDFs base:', error);
      return NextResponse.json(
        { error: 'Error al cargar los PDFs base. Verifica que existan en /public' },
        { status: 500 }
      );
    }

    // ========================================================================
    // PASO 6: GENERAR LOS DOCUMENTOS PDF LLENADOS
    // ========================================================================
    
    console.log('[API] Iniciando generación de documentos...');
    
    const generatedDocs = await generateDocuments(
      fullData,
      actaPdfBuffer.buffer,
      tratamientoPdfBuffer.buffer
    );

    console.log('[API] Documentos generados exitosamente:', {
      acta: generatedDocs.actaCompromiso.filename,
      tratamiento: generatedDocs.tratamientoDatos?.filename || 'NO GENERADO',
    });

    // ========================================================================
    // PASO 7: ALMACENAR EN SUPABASE STORAGE (PREPARADO PARA IMPLEMENTACIÓN)
    // ========================================================================
    
    /**
     * NOTA: Esta sección está preparada para almacenar los PDFs en Supabase.
     * Para activarla en producción:
     * 1. Configurar las variables de entorno en .env.local
     * 2. Crear el bucket en Supabase Storage
     * 3. Descomentar el código de almacenamiento
     * 
     * El código está listo para usar, solo necesita configuración.
     */
    
    console.log('[API] Preparando almacenamiento en Supabase...');
    
    // Descomentar para activar almacenamiento en Supabase:
    /*
    const storageResult = await storeGeneratedDocuments(
      generatedDocs.actaCompromiso.buffer,
      generatedDocs.actaCompromiso.filename,
      generatedDocs.tratamientoDatos?.buffer,
      generatedDocs.tratamientoDatos?.filename
    );

    console.log('[API] Resultado del almacenamiento:', storageResult);
    */

    // Placeholder para desarrollo (remover en producción)
    console.log('[API] Almacenamiento en Supabase: PENDIENTE DE CONFIGURACIÓN');
    console.log('[API] Archivos a almacenar:', {
      acta: generatedDocs.actaCompromiso.filename,
      tratamiento: generatedDocs.tratamientoDatos?.filename || 'N/A',
    });

    // ========================================================================
    // PASO 8: RETORNAR EL PDF AL USUARIO PARA DESCARGA
    // ========================================================================
    
    /**
     * Retornamos el Acta de Compromiso como respuesta principal
     * El usuario lo descargará automáticamente en su navegador
     * 
     * Headers importantes:
     * - Content-Type: application/pdf (indica que es un PDF)
     * - Content-Disposition: attachment (fuerza la descarga)
     * - filename: nombre del archivo con formato [documento]_[tipo].pdf
     */
    
    const response = new NextResponse(generatedDocs.actaCompromiso.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${generatedDocs.actaCompromiso.filename}"`,
        'Content-Length': generatedDocs.actaCompromiso.buffer.length.toString(),
      },
    });

    console.log('[API] Respuesta enviada exitosamente:', {
      filename: generatedDocs.actaCompromiso.filename,
      size: `${(generatedDocs.actaCompromiso.buffer.length / 1024).toFixed(2)} KB`,
    });

    return response;

  } catch (error) {
    // ========================================================================
    // MANEJO GLOBAL DE ERRORES
    // ========================================================================
    
    console.error('[API] Error inesperado en el proceso:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor al generar documentos',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// 3. FUNCIONES AUXILIARES
// ============================================================================

/**
 * Calcula la fecha actual en diferentes formatos
 * 
 * @returns Objeto con día, mes, año y fecha completa formateada
 * 
 * FORMATOS:
 * - dia: "26"
 * - mes: "octubre"
 * - año: "2025"
 * - fecha: "26 de octubre de 2025"
 */
function calculateCurrentDate(): CalculatedData {
  const ahora = new Date();
  
  const mesesEs = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  const dia = ahora.getDate().toString().padStart(2, '0');
  const mes = mesesEs[ahora.getMonth()];
  const año = ahora.getFullYear().toString();
  const fecha = `${dia} de ${mes} de ${año}`;

  return { dia, mes, año, fecha };
}

// ============================================================================
// 4. HANDLER PARA OTROS MÉTODOS HTTP (OPCIONAL)
// ============================================================================

/**
 * Maneja peticiones GET (para testing o información del endpoint)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/generar-formatos',
    method: 'POST',
    description: 'Microservicio para generar documentos PDF del SENA',
    version: '1.0.0',
    status: 'operational',
    requiredFields: [
      'firma_aprendiz (Base64)',
      'firma_tutor (Base64)',
      'tipo_y_documento_tutor',
      'nombre_tutor',
      'cc_tutor',
      'ce_tutor',
      'documento_tutor',
      'municipio_documento_tutor',
      'correo_electronico_tutor',
      'direccion_contacto_tutor',
    ],
    response: 'PDF file (application/pdf)',
    docs: 'https://tu-documentacion.com/api/generar-formatos',
  });
}