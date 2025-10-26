// src/lib/pdf-utils.ts

/**
 * UTILIDADES PARA GENERACIÓN Y MANIPULACIÓN DE PDFs
 * 
 * Este archivo contiene toda la lógica para llenar los formularios PDF
 * utilizando la librería pdf-lib. Maneja tanto el Acta de Compromiso
 * como el Tratamiento de Datos (condicional para menores de edad).
 */

import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { FullDocumentData, GeneratedDocuments } from './types';

// ============================================================================
// 1. FUNCIÓN PRINCIPAL DE GENERACIÓN DE DOCUMENTOS
// ============================================================================

/**
 * Genera los documentos PDF llenando los campos con los datos proporcionados
 * 
 * @param data - Datos completos del aprendiz, tutor y fechas
 * @param actaPdfBuffer - Buffer del PDF base del Acta de Compromiso
 * @param tratamientoPdfBuffer - Buffer del PDF base del Tratamiento de Datos
 * @returns Promise con los PDFs generados y sus nombres de archivo
 * 
 * FLUJO GENERAL:
 * 1. Generar el Acta de Compromiso (obligatorio)
 * 2. Verificar si el aprendiz es menor de edad (TI)
 * 3. Si es menor, generar también el Tratamiento de Datos
 * 4. Retornar ambos documentos con sus nombres de archivo
 */
export async function generateDocuments(
  data: FullDocumentData,
  actaPdfBuffer: ArrayBuffer,
  tratamientoPdfBuffer: ArrayBuffer
): Promise<GeneratedDocuments> {
  
  console.log('[PDF Utils] Iniciando generación de documentos...');

  // PASO 1: Generar el Acta de Compromiso (siempre se genera)
  const actaResult = await fillActaCompromiso(data, actaPdfBuffer);

  // PASO 2: Verificar si es necesario generar el Tratamiento de Datos
  const esMenorDeEdad = data.tipo_documento_aprendiz === 'TI';
  console.log(`[PDF Utils] ¿Es menor de edad (TI)?: ${esMenorDeEdad}`);

  // PASO 3: Generar Tratamiento de Datos solo si es menor de edad
  let tratamientoResult: { buffer: Uint8Array; filename: string } | undefined;
  if (esMenorDeEdad) {
    tratamientoResult = await fillTratamientoDatos(data, tratamientoPdfBuffer);
  }

  // PASO 4: Construir y retornar el resultado
  const result: GeneratedDocuments = {
    actaCompromiso: actaResult,
    tratamientoDatos: tratamientoResult,
  };

  console.log('[PDF Utils] Generación completada exitosamente');
  return result;
}

// ============================================================================
// 2. LLENADO DEL ACTA DE COMPROMISO
// ============================================================================

/**
 * Llena el formulario del Acta de Compromiso con los datos del aprendiz
 * 
 * @param data - Datos completos del documento
 * @param pdfBuffer - Buffer del PDF base
 * @returns Promise con el buffer del PDF llenado y su nombre de archivo
 * 
 * SECCIONES DEL FORMULARIO:
 * - Datos personales del aprendiz
 * - Tipo de documento (casillas de verificación)
 * - Datos del programa de formación
 * - Firmas del aprendiz y tutor
 * - Fecha de firma
 */
async function fillActaCompromiso(
  data: FullDocumentData,
  pdfBuffer: ArrayBuffer
): Promise<{ buffer: Uint8Array; filename: string }> {
  
  console.log('[Acta Compromiso] Iniciando llenado del formulario...');

  // PASO 1: Cargar el PDF base
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();

  // PASO 2: Llenar campos de texto básicos del aprendiz
  setTextField(form, 'nombre_aprendiz=', data.nombre_aprendiz);
  setTextField(form, 'cual_tipo_id_aprendiz', data.cual_tipo_id_aprendiz);
  setTextField(form, 'numero_documento_aprendiz#0', data.numero_documento_aprendiz);
  setTextField(form, 'numero_documento_aprendiz#1', data.numero_documento_aprendiz);

  // PASO 3: Marcar el tipo de documento correspondiente (checkboxes)
  setCheckboxByDocumentType(form, data.tipo_documento_aprendiz);

  // PASO 4: Llenar datos del programa de formación
  setTextField(form, 'programa_formacion', data.programa_formacion);
  setTextField(form, 'numero_ficha', data.numero_ficha);
  setTextField(form, 'centro_formacion', data.centro_formacion);

  // PASO 5: Llenar datos del tutor
  setTextField(form, 'tipo_y_documento_tutor', data.tipo_y_documento_tutor);

  // PASO 6: Llenar la fecha
  setTextField(form, 'dia', data.dia);
  setTextField(form, 'mes', data.mes);
  setTextField(form, 'año', data.año);

  // PASO 7: Insertar las firmas (imágenes Base64)
  await insertSignatureImage(pdfDoc, form, 'firma_aprendiz', data.firma_aprendiz);
  await insertSignatureImage(pdfDoc, form, 'firma_tutor', data.firma_tutor);

  // PASO 8: Aplanar el formulario (hacer campos no editables)
  form.flatten();

  // PASO 9: Guardar el PDF modificado
  const pdfBytes = await pdfDoc.save();

  // PASO 10: Construir el nombre del archivo
  const filename = `${data.numero_documento_aprendiz}_acta_compromiso.pdf`;

  console.log(`[Acta Compromiso] Documento generado: ${filename}`);
  
  return { buffer: pdfBytes, filename };
}

// ============================================================================
// 3. LLENADO DEL TRATAMIENTO DE DATOS (SOLO MENORES DE EDAD)
// ============================================================================

/**
 * Llena el formulario de Tratamiento de Datos Personales
 * Este documento solo se genera cuando el aprendiz es menor de edad (TI)
 * 
 * @param data - Datos completos del documento
 * @param pdfBuffer - Buffer del PDF base
 * @returns Promise con el buffer del PDF llenado y su nombre de archivo
 * 
 * SECCIONES DEL FORMULARIO:
 * - Datos institucionales (fecha, ciudad, regional, centro)
 * - Datos del programa de formación
 * - Datos del tutor legal
 * - Datos del aprendiz menor de edad
 * - Firmas y datos de contacto
 */
async function fillTratamientoDatos(
  data: FullDocumentData,
  pdfBuffer: ArrayBuffer
): Promise<{ buffer: Uint8Array; filename: string }> {
  
  console.log('[Tratamiento Datos] Iniciando llenado del formulario...');

  // PASO 1: Cargar el PDF base
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();

  // PASO 2: Llenar datos institucionales y de ubicación
  setTextField(form, 'fecha', data.fecha);
  setTextField(form, 'cludad', data.ciudad); // Nota: el campo tiene typo en el PDF original
  setTextField(form, 'regional', data.regional);
  setTextField(form, 'centro_formacion', data.centro_formacion);

  // PASO 3: Llenar datos del programa de formación
  setTextField(form, 'programa_formacion', data.programa_formacion);
  setTextField(form, 'numero_ficha', data.numero_ficha);

  // PASO 4: Llenar datos del tutor legal
  setTextField(form, 'nombre_tutor', data.nombre_tutor);
  setTextField(form, 'cc_tutor', data.cc_tutor);
  setTextField(form, 'ce_tutor', data.ce_tutor);
  setTextField(form, 'documento_tutor', data.documento_tutor);
  setTextField(form, 'municipio_documento_tutor', data.municipio_documento_tutor);
  setTextField(form, 'tipo_y_documento_tutor', data.tipo_y_documento_tutor);
  setTextField(form, 'correo_electronico_tutor', data.correo_electronico_tutor);
  setTextField(form, 'direccion_contacto_tutor', data.direccion_contacto_tutor);

  // PASO 5: Llenar datos del aprendiz (menor de edad)
  setTextField(form, 'nombre_aprendiz#0', data.nombre_aprendiz);
  setTextField(form, 'nombre_aprendiz#1', data.nombre_aprendiz);
  setTextField(form, 'numero_documento_aprendiz#0', data.numero_documento_aprendiz);
  setTextField(form, 'numero_documento_aprendiz#1', data.numero_documento_aprendiz);

  // PASO 6: Insertar las firmas (imágenes Base64)
  await insertSignatureImage(pdfDoc, form, 'firma_aprendiz', data.firma_aprendiz);
  await insertSignatureImage(pdfDoc, form, 'firma_tutor', data.firma_tutor);

  // PASO 7: Aplanar el formulario
  form.flatten();

  // PASO 8: Guardar el PDF modificado
  const pdfBytes = await pdfDoc.save();

  // PASO 9: Construir el nombre del archivo
  const filename = `${data.numero_documento_aprendiz}_tratamiento_datos.pdf`;

  console.log(`[Tratamiento Datos] Documento generado: ${filename}`);
  
  return { buffer: pdfBytes, filename };
}

// ============================================================================
// 4. FUNCIONES AUXILIARES PARA MANIPULACIÓN DE CAMPOS
// ============================================================================

/**
 * Establece el valor de un campo de texto en el formulario PDF
 * Maneja errores silenciosamente si el campo no existe
 * 
 * @param form - Formulario del PDF
 * @param fieldName - Nombre del campo
 * @param value - Valor a establecer
 */
function setTextField(form: PDFForm, fieldName: string, value: string): void {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value || ''); // Usar string vacío si el valor es undefined/null
  } catch (error) {
    console.warn(`[PDF Utils] Campo no encontrado: ${fieldName}`);
  }
}

/**
 * Marca un checkbox en el formulario PDF
 * 
 * @param form - Formulario del PDF
 * @param fieldName - Nombre del checkbox
 */
function setCheckbox(form: PDFForm, fieldName: string): void {
  try {
    const checkbox = form.getCheckBox(fieldName);
    checkbox.check();
  } catch (error) {
    console.warn(`[PDF Utils] Checkbox no encontrado: ${fieldName}`);
  }
}

/**
 * Marca el checkbox correspondiente al tipo de documento del aprendiz
 * 
 * @param form - Formulario del PDF
 * @param tipoDocumento - Tipo de documento ('TI', 'CC', 'CE', 'Otro')
 * 
 * MAPEO DE TIPOS:
 * - 'TI' → tipo_tarjeta_aprendiz
 * - 'CC' → tipo_cedula_aprendiz
 * - 'CE' → tipo_CE_aprendiz
 * - 'Otro' → tipo_otro_aprendiz
 */
function setCheckboxByDocumentType(
  form: PDFForm,
  tipoDocumento: 'TI' | 'CC' | 'CE' | 'Otro'
): void {
  const checkboxMap = {
    'TI': 'tipo_tarjeta_aprendiz',
    'CC': 'tipo_cedula_aprendiz',
    'CE': 'tipo_CE_aprendiz',
    'Otro': 'tipo_otro_aprendiz',
  };

  const checkboxName = checkboxMap[tipoDocumento];
  setCheckbox(form, checkboxName);
  
  console.log(`[PDF Utils] Checkbox marcado: ${checkboxName} (Tipo: ${tipoDocumento})`);
}

/**
 * Inserta una imagen de firma (Base64) en el campo correspondiente del PDF
 * 
 * @param pdfDoc - Documento PDF
 * @param form - Formulario del PDF
 * @param fieldName - Nombre del campo de la firma
 * @param base64Image - Imagen en formato Base64
 * 
 * NOTA: Esta función maneja la conversión de Base64 a imagen PNG/JPG
 * y la inserta en el campo del formulario manteniendo las proporciones
 */
async function insertSignatureImage(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  base64Image: string
): Promise<void> {
  try {
    // PASO 1: Limpiar el prefijo de Base64 si existe
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
    
    // PASO 2: Convertir Base64 a bytes
    const imageBytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
    
    // PASO 3: Determinar el tipo de imagen y embedirla
    let image;
    if (base64Image.includes('data:image/png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    // PASO 4: Obtener el campo del formulario
    const field = form.getTextField(fieldName);
    const widgets = field.acroField.getWidgets();
    
    if (widgets.length === 0) {
      console.warn(`[PDF Utils] No se encontraron widgets para: ${fieldName}`);
      return;
    }

    // PASO 5: Obtener las dimensiones del campo
    const widget = widgets[0];
    const rect = widget.getRectangle();
    
    // PASO 6: Calcular dimensiones manteniendo proporción
    const fieldWidth = rect.width;
    const fieldHeight = rect.height;
    const imageAspectRatio = image.width / image.height;
    
    let drawWidth = fieldWidth;
    let drawHeight = fieldWidth / imageAspectRatio;
    
    if (drawHeight > fieldHeight) {
      drawHeight = fieldHeight;
      drawWidth = fieldHeight * imageAspectRatio;
    }

    // PASO 7: Obtener la página y dibujar la imagen
    const pageRef = widget.P();
    const pages = pdfDoc.getPages();
    const page = pages.find(p => p.ref === pageRef) || pages[0];
    
    page.drawImage(image, {
      x: rect.x + (fieldWidth - drawWidth) / 2,
      y: rect.y + (fieldHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    console.log(`[PDF Utils] Firma insertada correctamente: ${fieldName}`);
    
  } catch (error) {
    console.error(`[PDF Utils] Error al insertar firma ${fieldName}:`, error);
  }
}