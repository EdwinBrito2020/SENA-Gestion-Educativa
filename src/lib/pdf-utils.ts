// src/lib/pdf-utils.ts - VERSIÓN COMPLETA CORREGIDA
import { PDFDocument, PDFForm } from 'pdf-lib';
import { FullDocumentData, GeneratedDocuments } from './types';

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

  } catch (error) {
    console.error('[PDF Utils] Error en generateDocuments:', error);
    throw error;
  }
}

// ============================================================================
// FUNCIONES DE FORMATEO
// ============================================================================

/**
 * Formatea un número de documento con separadores de miles
 */
function formatDocumentNumber(documentNumber: string): string {
  if (!documentNumber) return '';
  const cleanNumber = documentNumber.replace(/[\.\s]/g, '');
  return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Construye el campo unificado de tipo y documento para APRENDIZ
 */
function buildTipoYDocumentoAprendiz(
  tipoDocumento: string, 
  numeroDocumento: string,
  cualTipo?: string
): string {
  const formattedNumber = formatDocumentNumber(numeroDocumento);
  
  if (tipoDocumento === 'Otro' && cualTipo) {
    return `${cualTipo} No. ${formattedNumber}`;
  }
  
  return `${tipoDocumento} No. ${formattedNumber}`;
}

/**
 * Construye el campo unificado de tipo y documento para TUTOR
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

async function fillActaCompromiso(
  data: FullDocumentData,
  pdfBuffer: Uint8Array
): Promise<{ buffer: Uint8Array; filename: string }> {
  
  console.log('[Acta Compromiso] Iniciando llenado del formulario...');

  try {
    // PASO 1: Cargar el PDF base
    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBuffer);
      console.log('[Acta Compromiso] ✅ PDF base cargado exitosamente');
    } catch (error) {
      console.error('[Acta Compromiso] ❌ ERROR al cargar PDF base:', error);
      throw new Error(`No se pudo cargar el PDF base: ${error}`);
    }

    const form = pdfDoc.getForm();

    // DEBUG: Listar campos disponibles
    const fields = form.getFields();
    console.log('[Acta Compromiso] Campos disponibles:', fields.map(f => f.getName()));

    // PASO 2: Llenar campos de texto básicos del aprendiz
    setTextField(form, 'nombre_aprendiz', data.nombre_aprendiz);
    
    // Campo unificado de tipo y documento del APRENDIZ
    const tipoYDocumentoAprendiz = buildTipoYDocumentoAprendiz(
      data.tipo_documento_aprendiz, 
      data.numero_documento_aprendiz,
      data.cual_tipo_id_aprendiz
    );
    console.log('[Acta Compromiso] Tipo y documento aprendiz:', tipoYDocumentoAprendiz);
    setTextField(form, 'tipo_y_documento_aprendiz', tipoYDocumentoAprendiz);
    
    // Número de documento formateado
    const documentoAprendizFormateado = formatDocumentNumber(data.numero_documento_aprendiz);
    setTextField(form, 'numero_documento_aprendiz', documentoAprendizFormateado);

    // PASO 3: MARCAR CHECKBOXES DEL TIPO DE DOCUMENTO DEL APRENDIZ - CORREGIDO
    console.log('[Acta Compromiso] Marcando tipo de documento aprendiz:', data.tipo_documento_aprendiz);

    // ✅ CORRECCIÓN: LIMPIAR TODOS LOS CAMPOS PRIMERO (PONER VACÍO)
    const tipoDocFields = ['tipo_tarjeta_aprendiz', 'tipo_cedula_aprendiz', 'tipo_CE_aprendiz', 'tipo_otro_aprendiz'];
    tipoDocFields.forEach(fieldName => {
      setTextField(form, fieldName, '');
    });

    // ✅ CORRECCIÓN: MARCAR CON "X" EL CAMPO CORRESPONDIENTE USANDO setTextField
    const checkboxMap: Record<string, string> = {
      'TI': 'tipo_tarjeta_aprendiz',
      'CC': 'tipo_cedula_aprendiz', 
      'CE': 'tipo_CE_aprendiz',
      'Otro': 'tipo_otro_aprendiz'
    };

    const fieldName = checkboxMap[data.tipo_documento_aprendiz];
    if (fieldName) {
      setTextField(form, fieldName, 'X'); // ← ESCRIBIR "X" EN EL TEXTFIELD
      console.log(`[Acta Compromiso] ✅ Campo marcado con X: ${fieldName}`);
    }

    // PASO 4: Llenar campo "Cual" si es tipo "Otro" - CORREGIDO
    if (data.tipo_documento_aprendiz === 'Otro' && data.cual_tipo_id_aprendiz) {
      console.log('[Acta Compromiso] Llenando campo "cual_tipo_id_aprendiz":', data.cual_tipo_id_aprendiz);
      setTextField(form, 'cual_tipo_id_aprendiz', data.cual_tipo_id_aprendiz);
    } else {
      // Limpiar el campo si no es tipo "Otro"
      setTextField(form, 'cual_tipo_id_aprendiz', '');
    }

    // PASO 5: Llenar datos del programa de formación
    setTextField(form, 'programa_formacion', data.programa_formacion);
    setTextField(form, 'numero_ficha', data.numero_ficha);
    setTextField(form, 'centro_formacion', data.centro_formacion);

    // PASO 6: Llenar datos del tutor
    const tipoYDocumentoTutor = buildTipoYDocumentoTutor(
      data.tipo_documento_tutor,
      data.numero_documento_tutor
    );
    console.log('[Acta Compromiso] Tipo y documento tutor:', tipoYDocumentoTutor);
    setTextField(form, 'tipo_y_documento_tutor', tipoYDocumentoTutor);

    // Campos individuales del tutor
    const documentoTutorFormateado = formatDocumentNumber(data.numero_documento_tutor);
    setTextField(form, 'documento_tutor', documentoTutorFormateado);
    setTextField(form, 'municipio_documento_tutor', data.municipio_documento_tutor);
    setTextField(form, 'correo_electronico_tutor', data.correo_electronico_tutor);
    setTextField(form, 'direccion_contacto_tutor', data.direccion_contacto_tutor);

    // PASO 7: Llenar la fecha
    setTextField(form, 'dia', data.dia);
    setTextField(form, 'mes', data.mes);
    setTextField(form, 'año', data.año);

    // PASO 8: Insertar las firmas
    if (data.firma_aprendiz) {
      await insertSignatureImage(pdfDoc, form, 'firma_aprendiz', data.firma_aprendiz);
    }
    
    if (data.firma_tutor) {
      await insertSignatureImage(pdfDoc, form, 'firma_tutor', data.firma_tutor);
    }

    console.log('[Acta Compromiso] Campos llenados, guardando PDF...');

    // PASO 9: Aplanar el formulario y guardar
    form.flatten();
    const pdfBytes = await pdfDoc.save();

    const filename = `acta_compromiso_${data.numero_documento_aprendiz}.pdf`;
    console.log(`[Acta Compromiso] Documento generado: ${filename}`);
    
    return { buffer: pdfBytes, filename };

  } catch (error) {
    console.error('[Acta Compromiso] Error al generar documento:', error);
    throw new Error(`Error al generar Acta de Compromiso: ${error}`);
  }
}

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

function setTextField(form: PDFForm, fieldName: string, value: string): void {
  try {
    const field = form.getTextField(fieldName);
    if (field) {
      field.setText(value || '');
      console.log(`[PDF Utils] Campo llenado: ${fieldName} = "${value}"`);
    } else {
      console.warn(`[PDF Utils] Campo no encontrado: ${fieldName}`);
    }
  } catch (error) {
    console.warn(`[PDF Utils] Error con campo ${fieldName}:`, error);
  }
}

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

async function insertSignatureImage(
  pdfDoc: PDFDocument,
  form: PDFForm,
  fieldName: string,
  base64Image: string
): Promise<void> {
  try {
    if (!base64Image) {
      console.warn(`[PDF Utils] Firma vacía para: ${fieldName}`);
      return;
    }

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
    const imageBytes = Buffer.from(cleanBase64, 'base64');
    
    let image;
    if (base64Image.includes('data:image/png')) {
      image = await pdfDoc.embedPng(imageBytes);
    } else {
      image = await pdfDoc.embedJpg(imageBytes);
    }

    const field = form.getTextField(fieldName);
    if (!field) {
      console.warn(`[PDF Utils] Campo de firma no encontrado: ${fieldName}`);
      return;
    }

    const widgets = field.acroField.getWidgets();
    
    if (widgets.length === 0) {
      console.warn(`[PDF Utils] No se encontraron widgets para: ${fieldName}`);
      return;
    }

    const widget = widgets[0];
    const rect = widget.getRectangle();
    
    const fieldWidth = rect.width;
    const fieldHeight = rect.height;
    const imageAspectRatio = image.width / image.height;
    
    let drawWidth = fieldWidth;
    let drawHeight = fieldWidth / imageAspectRatio;
    
    if (drawHeight > fieldHeight) {
      drawHeight = fieldHeight;
      drawWidth = fieldHeight * imageAspectRatio;
    }

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