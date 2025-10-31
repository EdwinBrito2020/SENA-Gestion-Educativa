// src/lib/types.ts

/**
 * @fileoverview Definición de tipos de datos para el microservicio de generación de PDFs
 * @description Este archivo centraliza todas las interfaces TypeScript utilizadas en el microservicio.
 * Asegura type-safety y sirve como documentación de la estructura de datos.
 * @author SENA - Equipo de desarrollo
 * @version 1.0.0
 * @license MIT
 */

// ! ============================================================================
// ! 1. DATOS TRAÍDOS DESDE LA API/BASE DE DATOS (SIMULADOS INICIALMENTE)
// ! ============================================================================

/**
 * Interface para datos del aprendiz provenientes de la API/DB
 * @interface AprendizDataFromAPI
 * @description Estos datos se simularán inicialmente hasta conectar con la base de datos real
 * @todo Implementar conexión real con la base de datos
 */
export interface AprendizDataFromAPI {
  nombre_aprendiz: string;                // Nombre completo del aprendiz
  tipo_documento_aprendiz: 'TI' | 'CC' | 'CE' | 'Otro';  // Tipo de documento de identidad
  cual_tipo_id_aprendiz: string;          // Si tipo es "Otro", especificar cuál
  numero_documento_aprendiz: string;      // Número del documento de identidad
  programa_formacion: string;             // Nombre del programa de formación
  numero_ficha: string;                   // Número de la ficha del programa
  centro_formacion: string;               // Nombre del centro de formación SENA
  ciudad: string;                         // Ciudad del centro de formación
  regional: string;                       // Regional SENA a la que pertenece
}

// ============================================================================
// 2. DATOS CAPTURADOS DEL USUARIO VÍA POST
// ============================================================================

/**
 * Interface para datos enviados por el usuario desde el frontend
 * Estos datos llegan en el body del POST request
 */
export interface UserDataPayload {
  firma_aprendiz: string;                 // Firma del aprendiz en formato Base64
  firma_tutor: string;                    // Firma del tutor en formato Base64
  tipo_documento_tutor: string;           // "CC", "CE", "TI", etc.
  numero_documento_tutor: string;         // "123456789"
  nombre_tutor: string;                   // Nombre completo del tutor legal
  cc_tutor: string;                       // Número de CC del tutor (si aplica)
  ce_tutor: string;                       // Número de CE del tutor (si aplica)
  documento_tutor: string;                // Número del documento del tutor
  municipio_documento_tutor: string;      // Municipio donde se expidió el documento del tutor
  correo_electronico_tutor: string;       // Email de contacto del tutor
  direccion_contacto_tutor: string;       // Dirección física del tutor
}

// ============================================================================
// 3. DATOS CALCULADOS AUTOMÁTICAMENTE POR LA API
// ============================================================================

/**
 * Interface para datos que se calculan automáticamente en el servidor
 * Estos se generan al momento de procesar la solicitud
 */
export interface CalculatedData {
  dia: string;                            // Día actual (formato: DD)
  mes: string;                            // Mes actual (formato: nombre completo en español)
  año: string;                            // Año actual (formato: YYYY)
  fecha: string;                          // Fecha completa formateada (ej: "26 de octubre de 2025")
}

// ============================================================================
// 4. ESTRUCTURA COMBINADA COMPLETA
// ============================================================================

/**
 * Interface que combina todos los datos necesarios para generar los PDFs
 * Esta es la estructura final que se pasa a las funciones de generación de documentos
 */
export interface FullDocumentData extends 
  AprendizDataFromAPI, 
  UserDataPayload, 
  CalculatedData {}

// ============================================================================
// 5. TIPOS PARA RESPUESTAS Y RESULTADOS
// ============================================================================

/**
 * Interface para el resultado de la generación de documentos
 * Incluye los buffers de los PDFs generados y los nombres de archivo
 */
export interface GeneratedDocuments {
  actaCompromiso: {
    buffer: Uint8Array;                   // Buffer del PDF del Acta de Compromiso
    filename: string;                     // Nombre del archivo para descarga/almacenamiento
  };
  tratamientoDatos?: {                    // Opcional: solo si el aprendiz es menor de edad
    buffer: Uint8Array;                   // Buffer del PDF de Tratamiento de Datos
    filename: string;                     // Nombre del archivo para descarga/almacenamiento
  };
}

/**
 * Interface para errores personalizados del microservicio
 */
export interface ServiceError {
  code: string;                           // Código de error (ej: 'INVALID_DATA', 'PDF_GENERATION_FAILED')
  message: string;                        // Mensaje descriptivo del error
  details?: any;                          // Detalles adicionales del error (opcional)
}