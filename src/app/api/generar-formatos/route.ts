// src/app/api/generar-formatos/route.ts

/**
 * API ROUTE PARA GENERACIÓN DE DOCUMENTOS PDF
 * 
 * Endpoint: POST /api/generar-formatos
 * 
 * Este microservicio genera ambos PDFs y los retorna para descarga directa.
 * El almacenamiento en Supabase está desactivado temporalmente.
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

// ============================================================================
// temporal borar luego
// ============================================================================

async function diagnosticarCamposPDF(pdfBuffer: Uint8Array, nombre: string) {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log(`=== CAMPOS DISPONIBLES EN ${nombre} ===`);
    fields.forEach(field => {
      console.log(`- ${field.getName()}: ${field.constructor.name}`);
    });
    console.log(`=== TOTAL: ${fields.length} campos ===`);
    
    return fields.map(f => f.getName());
  } catch (error) {
    console.error(`Error en diagnóstico de ${nombre}:`, error);
    return [];
  }
}

// ============================================================================
// borrar lo anterior  
// ============================================================================


export const runtime = 'nodejs';

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
      'tipo_documento_tutor',
      'numero_documento_tutor',
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
    
    const aprendizDataSimulado: AprendizDataFromAPI = {
      nombre_aprendiz: 'Juan Felipe Pérez García',
      tipo_documento_aprendiz: 'TI',
      cual_tipo_id_aprendiz: '',
      numero_documento_aprendiz: '3223456780',
      programa_formacion: 'Tecnología en Análisis y Desarrollo de Software',
      numero_ficha: '7725999',
      centro_formacion: 'Centro de Comercio y Servicios',
      ciudad: 'Popayán',
      regional: 'Cauca',
    };

    console.log('[API] Datos simulados cargados:', {
      aprendiz: aprendizDataSimulado.nombre_aprendiz,
      documento: aprendizDataSimulado.numero_documento_aprendiz,
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
      new Uint8Array(actaPdfBuffer),
      new Uint8Array(tratamientoPdfBuffer)
    );

    console.log('[API] Documentos generados exitosamente:', {
      acta: generatedDocs.actaCompromiso.filename,
      tratamiento: generatedDocs.tratamientoDatos?.filename || 'NO GENERADO',
    });

    // ========================================================================
    // PASO 7: RETORNAR AMBOS PDFs PARA DESCARGA DIRECTA
    // ========================================================================
    
    console.log('[API] Preparando respuesta con ambos PDFs...');

    const responseData = {
      success: true,
      message: 'Documentos generados exitosamente',
      documentos: {
        acta_compromiso: {
          filename: generatedDocs.actaCompromiso.filename,
          pdf_base64: Buffer.from(generatedDocs.actaCompromiso.buffer).toString('base64'),
          size: generatedDocs.actaCompromiso.buffer.length,
        },
        tratamiento_datos: {
          filename: generatedDocs.tratamientoDatos?.filename,
          pdf_base64: generatedDocs.tratamientoDatos ? 
            Buffer.from(generatedDocs.tratamientoDatos.buffer).toString('base64') : null,
          size: generatedDocs.tratamientoDatos?.buffer.length,
        }
      },
      metadata: {
        aprendiz: fullData.nombre_aprendiz,
        tutor: fullData.nombre_tutor,
        fecha_generacion: new Date().toISOString(),
        nota: 'Almacenamiento en Supabase desactivado temporalmente'
      }
    };

    console.log('[API] Enviando respuesta con PDFs en base64');

    return NextResponse.json(responseData, { status: 200 });

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
// FUNCIONES AUXILIARES
// ============================================================================

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
// HANDLER GET PARA INFORMACIÓN
// ============================================================================

  export async function GET() {
    // Datos del aprendiz simulados (los mismos que en POST)
    const aprendizDataSimulado = {
      nombre_aprendiz: 'Juan Felipe Pérez García',
      tipo_documento_aprendiz: 'TI', // ← CAMBIA ESTO A 'TI' para probar menor de edad
      cual_tipo_id_aprendiz: '',
      numero_documento_aprendiz: '3223456780',
      programa_formacion: 'Tecnología en Análisis y Desarrollo de Software',
      numero_ficha: '7725999',
      centro_formacion: 'Centro  de Servicios y Gestión Empresarial',
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
      // ✅ AGREGAR DATOS DEL APRENDIZ
      aprendiz: aprendizDataSimulado
    });
  }