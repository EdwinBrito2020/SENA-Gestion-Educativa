/**
 * @fileoverview Utilidades para la generación y manipulación de PDFs
 * @description Funciones para generar documentos PDF a partir de plantillas y datos
 * @module pdf-utils
 * @requires pdf-lib
 * @requires ./types
 * @author SENA - Equipo de desarrollo
 * @version 1.1.0
 */

import { PDFDocument, PDFForm } from 'pdf-lib'; // ✅ Librería para manipulación de PDFs
import { FullDocumentData, GeneratedDocuments } from './types'; // ✅ Interfaces TypeScript

/**
 * Genera los documentos PDF a partir de los datos y plantillas proporcionados
 * @async
 * @function generateDocuments
 * @param {FullDocumentData} data - Datos completos para llenar los formularios
 * @param {Uint8Array} actaPdfBuffer - Buffer de la plantilla del Acta de Compromiso
 * @param {Uint8Array} tratamientoPdfBuffer - Buffer de la plantilla del Formato de Tratamiento de Datos
 * @returns {Promise<GeneratedDocuments>} Documentos generados con sus buffers y nombres
 * @throws {Error} Si hay problemas al generar los documentos
 */
export async function generateDocuments(
  data: FullDocumentData,
  actaPdfBuffer: Uint8Array,
  tratamientoPdfBuffer: Uint8Array
): Promise<GeneratedDocuments> {
  
  console.log('[PDF Utils] Iniciando generación de documentos...');
  console.log('[PDF Utils] Datos recibidos:', {
    tutor: data.nombre_tutor,
    tipo_doc_tutor: data.tipo_documento_tutor,
    num_doc_tutor: data.numero_documento_tutor,
    aprendiz: data.nombre_aprendiz,
    tipo_doc_aprendiz: data.tipo_documento_aprendiz
  });

  try {
    // PASO 1: Generar el Acta de Compromiso
    const actaResult = await fillActaCompromiso(data, actaPdfBuffer);

    // PASO 2: Verificar si es necesario generar el Tratamiento de Datos
    const esMenorDeEdad = data.tipo_documento_aprendiz === 'TI'; // ✅ LÓGICA CLAVE: TI = Menor de edad
    console.log(`[PDF Utils] ¿Es menor de edad (TI)?: ${esMenorDeEdad}`);

    // PASO 3: Generar Tratamiento de Datos solo si es menor de edad
    let tratamientoResult: { buffer: Uint8Array; filename: string } | undefined;
    if (esMenorDeEdad) {
      tratamientoResult = await fillTratamientoDatos(data, tratamientoPdfBuffer);
    }

    // PASO 4: Construir y retornar el resultado
    const result: GeneratedDocuments = {
      actaCompromiso: actaResult,
      tratamientoDatos: tratamientoResult, // ✅ Opcional: solo presente para menores
    };

    console.log('[PDF Utils] Generación completada exitosamente');
    return result;

  } catch (error) {
    console.error('[PDF Utils] Error en generateDocuments:', error);
    throw error; // ✅ Propagar error para manejo en capa superior
  }
}

// ============================================================================
// FUNCIONES DE FORMATEO
// ============================================================================

/**
 * Formatea un número de documento con separadores de miles
 * @param {string} documentNumber - Número de documento a formatear
 * @returns {string} Número formateado con separadores
 * @example "1234567" → "1.234.567"
 */
function formatDocumentNumber(documentNumber: string): string {
  if (!documentNumber) return ''; // ✅ Manejar valores vacíos
  const cleanNumber = documentNumber.replace(/[\.\s]/g, ''); // ✅ Limpiar puntos y espacios existentes
  return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // ✅ Agregar separadores cada 3 dígitos
}

/**
 * Construye el campo unificado de tipo y documento para APRENDIZ
 * @param {string} tipoDocumento - Tipo de documento (TI, CC, CE, Otro)
 * @param {string} numeroDocumento - Número del documento
 * @param {string} [cualTipo] - Especificación si tipo es "Otro"
 * @returns {string} Cadena formateada "Tipo No. número"
 * @example buildTipoYDocumentoAprendiz("CC", "1234567") → "CC No. 1.234.567"
 */
function buildTipoYDocumentoAprendiz(
  tipoDocumento: string, 
  numeroDocumento: string,
  cualTipo?: string
): string {
  const formattedNumber = formatDocumentNumber(numeroDocumento); // ✅ Formatear número
  
  if (tipoDocumento === 'Otro' && cualTipo) {
    return `${cualTipo} No. ${formattedNumber}`; // ✅ Caso especial: tipo personalizado
  }
  
  return `${tipoDocumento} No. ${formattedNumber}`; // ✅ Caso estándar
}

/**
 * Construye el campo unificado de tipo y documento para TUTOR
 * @param {string} tipoDocumento - Tipo de documento (CC, CE)
 * @param {string} numeroDocumento - Número del documento  
 * @returns {string} Cadena formateada "Tipo No. número"
 * @example buildTipoYDocumentoTutor("CC", "1234567") → "CC No. 1.234.567"
 */
function buildTipoYDocumentoTutor(
  tipoDocumento: string, 
  numeroDocumento: string
): string {
  const formattedNumber = formatDocumentNumber(numeroDocumento);
  return `${tipoDocumento} No. ${formattedNumber}`;
}

// ============================================================================
// FUNCIONES PRINCIPALES CORREGIDAS
// ============================================================================

/**
 * Llena el formulario del Acta de Compromiso con los datos proporcionados
 * @async
 * @param {FullDocumentData} data - Datos completos para llenar el formulario
 * @param {Uint8Array} pdfBuffer - Buffer de la plantilla PDF
 * @returns {Promise<{buffer: Uint8Array, filename: string}>} PDF generado y nombre de archivo
 */
async function fillActaCompromiso(
  data: FullDocumentData,
  pdfBuffer: Uint8Array
): Promise<{ buffer: Uint8Array; filename: string }> {
  
  console.log('[Acta Compromiso] Iniciando llenado del formulario...');
  console.log('[Acta Compromiso] Es menor de edad:', data.tipo_documento_aprendiz === 'TI');

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer); // ✅ Cargar plantilla PDF
    const form = pdfDoc.getForm(); // ✅ Obtener formulario editable

    const esMenorDeEdad = data.tipo_documento_aprendiz === 'TI'; // ✅ Determinar flujo

    // SOLO CAMPOS QUE EXISTEN EN ACTA:
    setTextField(form, 'nombre_aprendiz', data.nombre_aprendiz);
    
    // Campo unificado de tipo y documento del APRENDIZ
    const tipoYDocumentoAprendiz = buildTipoYDocumentoAprendiz(
      data.tipo_documento_aprendiz, 
      data.numero_documento_aprendiz,
      data.cual_tipo_id_aprendiz
    );
    
    const documentoAprendizFormateado = formatDocumentNumber(data.numero_documento_aprendiz);
    setTextField(form, 'numero_documento_aprendiz', documentoAprendizFormateado);

    // MARCAR CHECKBOXES DEL TIPO DE DOCUMENTO DEL APRENDIZ
    const tipoDocFields = ['tipo_tarjeta_aprendiz', 'tipo_cedula_aprendiz', 'tipo_CE_aprendiz', 'tipo_otro_aprendiz'];
    tipoDocFields.forEach(fieldName => {
      setTextField(form, fieldName, ''); // ✅ Limpiar todos los checkboxes primero
    });

    const checkboxMap: Record<string, string> = { // ✅ Mapeo tipo documento → campo checkbox
      'TI': 'tipo_tarjeta_aprendiz',
      'CC': 'tipo_cedula_aprendiz', 
      'CE': 'tipo_CE_aprendiz',
      'Otro': 'tipo_otro_aprendiz'
    };

    const fieldName = checkboxMap[data.tipo_documento_aprendiz];
    if (fieldName) {
      setTextField(form, fieldName, 'X'); // ✅ Marcar con "X" el checkbox correspondiente
    }

    // Campo "Cual" si es tipo "Otro"
    if (data.tipo_documento_aprendiz === 'Otro' && data.cual_tipo_id_aprendiz) {
      setTextField(form, 'cual_tipo_id_aprendiz', data.cual_tipo_id_aprendiz);
    }

    // Datos del programa
    setTextField(form, 'programa_formacion', data.programa_formacion);
    setTextField(form, 'numero_ficha', data.numero_ficha);
    setTextField(form, 'centro_formacion', data.centro_formacion);

    // ✅ CAMBIO PRINCIPAL: SOLO LLENAR CAMPOS DEL TUTOR SI ES MENOR DE EDAD
    if (esMenorDeEdad) {
      console.log('[Acta Compromiso] Llenando datos del tutor (menor de edad)');
      
      const tipoYDocumentoTutor = buildTipoYDocumentoTutor(
        data.tipo_documento_tutor,
        data.numero_documento_tutor
      );
      setTextField(form, 'tipo_y_documento_tutor', tipoYDocumentoTutor);
    } else {
      console.log('[Acta Compromiso] OMITIENDO datos del tutor (mayor de edad)');
      // Dejar el campo vacío para mayores de edad
      setTextField(form, 'tipo_y_documento_tutor', '');
    }

    // Fecha (siempre se llena)
    setTextField(form, 'dia', data.dia);
    setTextField(form, 'mes', data.mes);
    setTextField(form, 'año', data.año);

    // Firmas
    if (data.firma_aprendiz) {
      await insertSignatureImage(pdfDoc, form, 'firma_aprendiz', data.firma_aprendiz);
    }
    
    // ✅ SOLO INSERTAR FIRMA DEL TUTOR SI ES MENOR DE EDAD
    if (esMenorDeEdad && data.firma_tutor) {
      await insertSignatureImage(pdfDoc, form, 'firma_tutor', data.firma_tutor);
    } else {
      console.log('[Acta Compromiso] OMITIENDO firma del tutor (mayor de edad)');
    }

    form.flatten(); // ✅ Hacer el PDF de solo lectura (no editable)
    const pdfBytes = await pdfDoc.save(); // ✅ Serializar a bytes

    const filename = `acta_compromiso_${data.numero_documento_aprendiz}.pdf`; // ✅ Nombre único basado en documento
    console.log(`[Acta Compromiso] Documento generado: ${filename}`);
    
    return { buffer: pdfBytes, filename };

  } catch (error) {
    console.error('[Acta Compromiso] Error al generar documento:', error);
    throw new Error(`Error al generar Acta de Compromiso: ${error}`); // ✅ Error específico
  }
}

/**
 * Llena el formulario de Tratamiento de Datos (solo para menores de edad)
 * @async  
 * @param {FullDocumentData} data - Datos completos para llenar el formulario
 * @param {Uint8Array} pdfBuffer - Buffer de la plantilla PDF
 * @returns {Promise<{buffer: Uint8Array, filename: string}>} PDF generado y nombre de archivo
 */
async function fillTratamientoDatos(
  data: FullDocumentData,
  pdfBuffer: Uint8Array
): Promise<{ buffer: Uint8Array; filename: string }> {
  
  console.log('[Tratamiento Datos] Iniciando llenado del formulario...');

  try {
    // PASO 1: Cargar el PDF base
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer);
      console.log('[Tratamiento Datos] ✅ PDF base cargado exitosamente');
    } catch (error) {
      console.error('[Tratamiento Datos] ❌ ERROR al cargar PDF base:', error);
      throw new Error(`No se pudo cargar el PDF base: ${error}`);
    }

    const form = pdfDoc.getForm();

    // DEBUG: Listar campos disponibles
    const fields = form.getFields();
    console.log('[Tratamiento Datos] Campos disponibles:', fields.map(f => f.getName()));

    // PASO 2: Llenar datos institucionales
    setTextField(form, 'fecha', data.fecha);
    setTextField(form, 'ciudad', data.ciudad);
    setTextField(form, 'regional', data.regional);
    setTextField(form, 'centro_formacion', data.centro_formacion);

    // PASO 3: Llenar datos del programa de formación
    setTextField(form, 'programa_formacion', data.programa_formacion);
    setTextField(form, 'numero_ficha', data.numero_ficha);

    // PASO 4: Llenar datos del tutor legal - CORREGIDO
    setTextField(form, 'nombre_tutor', data.nombre_tutor);
    
    // Campo unificado de tipo y documento del TUTOR - CORREGIDO
    const tipoYDocumentoTutor = buildTipoYDocumentoTutor(
      data.tipo_documento_tutor,
      data.numero_documento_tutor
    );
    console.log('[Tratamiento Datos] Tipo y documento tutor:', tipoYDocumentoTutor);
    setTextField(form, 'tipo_y_documento_tutor', tipoYDocumentoTutor);
    
    // ✅ CORRECCIÓN 1: cc_tutor y ce_tutor son TEXTFIELDS, no CHECKBOXES
    console.log('[Tratamiento Datos] Marcando tipo de documento tutor:', data.tipo_documento_tutor);

    // En lugar de checkboxes, llenamos los textfields correspondientes
    if (data.tipo_documento_tutor === 'CC') {
      setTextField(form, 'cc_tutor', 'X'); // ← Marcar con "X"
      setTextField(form, 'ce_tutor', '');  // ← Limpiar el otro
    } else if (data.tipo_documento_tutor === 'CE') {
      setTextField(form, 'cc_tutor', '');  // ← Limpiar el otro
      setTextField(form, 'ce_tutor', 'X'); // ← Marcar con "X"
    }

    // Campos individuales del tutor
    const documentoTutorFormateado = formatDocumentNumber(data.numero_documento_tutor);
    setTextField(form, 'documento_tutor', documentoTutorFormateado);
    setTextField(form, 'municipio_documento_tutor', data.municipio_documento_tutor);
    setTextField(form, 'correo_electronico_tutor', data.correo_electronico_tutor);
    setTextField(form, 'direccion_contacto_tutor', data.direccion_contacto_tutor);

    // PASO 5: Llenar datos del aprendiz - CORREGIDO (tipo_y_documento_aprendiz)
    setTextField(form, 'nombre_aprendiz', data.nombre_aprendiz);
    
    // ✅ CORRECCIÓN: CAMPO tipo_y_documento_aprendiz QUE FALTABA
    const tipoYDocumentoAprendiz = buildTipoYDocumentoAprendiz(
      data.tipo_documento_aprendiz,
      data.numero_documento_aprendiz,
      data.cual_tipo_id_aprendiz
    );
    console.log('[Tratamiento Datos] Tipo y documento aprendiz:', tipoYDocumentoAprendiz);
    setTextField(form, 'tipo_y_documento_aprendiz', tipoYDocumentoAprendiz);
    
    const documentoAprendizFormateado = formatDocumentNumber(data.numero_documento_aprendiz);
    setTextField(form, 'numero_documento_aprendiz', documentoAprendizFormateado);

    // PASO 6: Insertar las firmas
    if (data.firma_aprendiz) {
      await insertSignatureImage(pdfDoc, form, 'firma_aprendiz', data.firma_aprendiz);
    }
    
    if (data.firma_tutor) {
      await insertSignatureImage(pdfDoc, form, 'firma_tutor', data.firma_tutor);
    }

    // PASO 7: Aplanar y guardar
    form.flatten();
    const pdfBytes = await pdfDoc.save();

    const filename = `tratamiento_datos_${data.numero_documento_aprendiz}.pdf`;
    console.log(`[Tratamiento Datos] Documento generado: ${filename}`);
    
    return { buffer: pdfBytes, filename };

  } catch (error) {
    console.error('[Tratamiento Datos] Error al generar documento:', error);
    throw new Error(`Error al generar Tratamiento de Datos: ${error}`);
  }
}

// ============================================================================
// FUNCIONES AUXILIARES MEJORADAS
// ============================================================================

/**
 * Establece el valor de un campo de texto en el formulario PDF
 * @param {PDFForm} form - Formulario PDF
 * @param {string} fieldName - Nombre del campo
 * @param {string} value - Valor a establecer
 */
function setTextField(form: PDFForm, fieldName: string, value: string): void {
  try {
    const field = form.getTextField(fieldName); // ✅ Obtener campo por nombre
    if (field) {
      field.setText(value || ''); // ✅ Establecer texto (valor vacío si es null/undefined)
      console.log(`[PDF Utils] Campo llenado: ${fieldName} = "${value}"`);
    } else {
      console.warn(`[PDF Utils] Campo no encontrado: ${fieldName}`); // ✅ Warning para campos faltantes
    }
  } catch (error) {
    console.warn(`[PDF Utils] Error con campo ${fieldName}:`, error); // ✅ Error no crítico
  }
}

/**
 * Marca un checkbox en el formulario PDF
 * @param {PDFForm} form - Formulario PDF  
 * @param {string} fieldName - Nombre del campo checkbox
 * @returns {boolean} True si se pudo marcar, False si no se encontró el campo
 */
function setCheckbox(form: PDFForm, fieldName: string): boolean {
  try {
    const checkbox = form.getCheckBox(fieldName);
    if (checkbox) {
      checkbox.check(); // ← ESTO MARCA CON "X" EL CHECKBOX
      console.log(`[PDF Utils] ✅ Checkbox marcado: ${fieldName}`);
      return true;
    } else {
      console.warn(`[PDF Utils] Checkbox no encontrado: ${fieldName}`);
      return false;
    }
  } catch (error) {
    console.warn(`[PDF Utils] Error con checkbox ${fieldName}:`, error);
    return false;
  }
}

/**
 * Inserta una imagen de firma en el campo especificado del PDF
 * @async
 * @param {PDFDocument} pdfDoc - Documento PDF
 * @param {PDFForm} form - Formulario PDF
 * @param {string} fieldName - Nombre del campo de firma
 * @param {string} base64Image - Imagen de firma en base64
 */
async function insertSignatureImage(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  base64Image: string
): Promise<void> {
  try {
    if (!base64Image) {
      console.warn(`[PDF Utils] Firma vacía para: ${fieldName}`);
      return; // ✅ Salir si no hay firma
    }

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''); // ✅ Limpiar prefijo data URL
    const imageBytes = Buffer.from(cleanBase64, 'base64'); // ✅ Convertir base64 a Buffer
    
    let image;
    if (base64Image.includes('data:image/png')) {
      image = await pdfDoc.embedPng(imageBytes); // ✅ Embebed imagen PNG
    } else {
      image = await pdfDoc.embedJpg(imageBytes); // ✅ Embebed imagen JPG
    }

    const field = form.getTextField(fieldName);
    if (!field) {
      console.warn(`[PDF Utils] Campo de firma no encontrado: ${fieldName}`);
      return;
    }

    const widgets = field.acroField.getWidgets(); // ✅ Obtener widgets del campo
    
    if (widgets.length === 0) {
      console.warn(`[PDF Utils] No se encontraron widgets para: ${fieldName}`);
      return;
    }

    const widget = widgets[0]; // ✅ Tomar el primer widget
    const rect = widget.getRectangle(); // ✅ Obtener posición y tamaño del campo
    
    const fieldWidth = rect.width;
    const fieldHeight = rect.height;
    const imageAspectRatio = image.width / image.height; // ✅ Calcular relación de aspecto
    
    let drawWidth = fieldWidth;
    let drawHeight = fieldWidth / imageAspectRatio;
    
    if (drawHeight > fieldHeight) { // ✅ Ajustar si excede la altura
      drawHeight = fieldHeight;
      drawWidth = fieldHeight * imageAspectRatio;
    }

    const pageRef = widget.P(); // ✅ Obtener referencia a la página
    const pages = pdfDoc.getPages();
    const page = pages.find(p => p.ref === pageRef) || pages[0]; // ✅ Encontrar página o usar primera
    
    page.drawImage(image, { // ✅ Dibujar imagen en el PDF
      x: rect.x + (fieldWidth - drawWidth) / 2, // ✅ Centrar horizontalmente
      y: rect.y + (fieldHeight - drawHeight) / 2, // ✅ Centrar verticalmente
      width: drawWidth,
      height: drawHeight,
    });

    console.log(`[PDF Utils] Firma insertada correctamente: ${fieldName}`);
    
  } catch (error) {
    console.error(`[PDF Utils] Error al insertar firma ${fieldName}:`, error);
  }
}