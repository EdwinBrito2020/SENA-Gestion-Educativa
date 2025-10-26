// src/components/FormularioGeneradorPDF.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function FormularioGeneradorPDF() {
  // ============================================================================
  // 1. ESTADOS DEL FORMULARIO
  // ============================================================================
  
  const [formData, setFormData] = useState({
    nombre_tutor: '',
    cc_tutor: '',
    ce_tutor: '',
    documento_tutor: '', // Se mantiene por si se usa en la API
    tipo_y_documento_tutor: '',
    municipio_documento_tutor: '',
    correo_electronico_tutor: '',
    direccion_contacto_tutor: '',
  });

  const [firmaAprendiz, setFirmaAprendiz] = useState('');
  const [firmaTutor, setFirmaTutor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Referencias para los canvas de firma
  const canvasAprendizRef = useRef<HTMLCanvasElement>(null);
  const canvasTutorRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingAprendiz, setIsDrawingAprendiz] = useState(false);
  const [isDrawingTutor, setIsDrawingTutor] = useState(false);

  // ============================================================================
  // 2. MANEJO DE INPUTS DEL FORMULARIO
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ============================================================================
  // 3. INICIALIZACIÓN Y FUNCIONES PARA CAPTURA DE FIRMAS (CANVAS)
  // ============================================================================

  const setupCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Solo configurar los estilos de dibujo
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };
  
  // HOOK DE EFECTO: Inicializa el canvas cuando el paso cambia (Soluciona Canvas Invisible)
  useEffect(() => {
    const heightInPx = 192; // h-48 en Tailwind

    if (currentStep === 2 && canvasAprendizRef.current) {
      // Configurar las dimensiones internas del canvas basado en el CSS
      canvasAprendizRef.current.width = canvasAprendizRef.current.offsetWidth;
      canvasAprendizRef.current.height = heightInPx; 
      setupCanvas(canvasAprendizRef.current);
    }
    
    if (currentStep === 3 && canvasTutorRef.current) {
      // Configurar las dimensiones internas del canvas basado en el CSS
      canvasTutorRef.current.width = canvasTutorRef.current.offsetWidth;
      canvasTutorRef.current.height = heightInPx;
      setupCanvas(canvasTutorRef.current);
    }
  }, [currentStep]);
  

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    setIsDrawing: (val: boolean) => void
  ) => {
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Asegurar que el contexto está listo
    setupCanvas(canvas); 

    ctx.beginPath();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  // FUNCIÓN CORREGIDA
  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    isDrawing: boolean
  ) => {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prevenir el desplazamiento de la página en móvil
    e.preventDefault(); 
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };
  
  // FUNCIÓN CORREGIDA
  const stopDrawing = (setIsDrawing: (val: boolean) => void) => {
    setIsDrawing(false);
  };

  // FUNCIÓN CORREGIDA
  const clearCanvas = (canvas: HTMLCanvasElement | null, setFirma: (val: string) => void) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // La limpieza debe ser sobre el área de dibujo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirma('');
  };

  // FUNCIÓN CORREGIDA
  const saveSignature = (canvas: HTMLCanvasElement | null, setFirma: (val: string) => void) => {
    if (!canvas) return;
    const base64 = canvas.toDataURL('image/png');
    setFirma(base64);
  };

  // ============================================================================
  // 4. ENVÍO DEL FORMULARIO Y GENERACIÓN DEL PDF
  // ============================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!firmaAprendiz || !firmaTutor) {
      setError('Por favor, capture ambas firmas antes de continuar');
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        firma_aprendiz: firmaAprendiz,
        firma_tutor: firmaTutor,
      };

      const response = await fetch('/api/generar-formatos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar el documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'acta_compromiso.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('✅ Documento generado exitosamente');
      
      resetForm();

    } catch (err) {
      console.error('Error:', err);
      setError((err as Error).message || 'Error al generar el documento');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre_tutor: '',
      cc_tutor: '',
      ce_tutor: '',
      documento_tutor: '',
      tipo_y_documento_tutor: '',
      municipio_documento_tutor: '',
      correo_electronico_tutor: '',
      direccion_contacto_tutor: '',
    });
    setFirmaAprendiz('');
    setFirmaTutor('');
    clearCanvas(canvasAprendizRef.current, setFirmaAprendiz);
    clearCanvas(canvasTutorRef.current, setFirmaTutor);
    setCurrentStep(1);
  };

  // ============================================================================
  // 5. RENDERIZADO CON MEJORAS DE DISEÑO
  // ============================================================================

// ... (Las funciones handleSubmit, resetForm y todo lo anterior se mantienen igual) ...

  // ============================================================================
  // 5. RENDERIZADO DE PASOS DEL FORMULARIO (NUEVO DISEÑO SIMPLE)
  // ============================================================================

  return (
    // Fondo más simple
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header - Limpio y simple */}
        <header className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-teal-600">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-1">
            Generador de Documentos SENA
          </h1>
          <p className="text-base text-gray-600">
            Complete los pasos para generar y descargar los formatos de Acta de Compromiso.
          </p>
        </header>

        {/* Indicador de Pasos - Lista vertical simple */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Progreso</h3>
          <ol className="flex justify-between space-x-2">
            {[
              { id: 1, label: 'Tutor Legal' },
              { id: 2, label: 'Firma Aprendiz' },
              { id: 3, label: 'Firma Tutor' },
            ].map((step) => (
              <li key={step.id} className="flex-1 text-center">
                <div className={`
                  p-3 rounded-lg border-2 transition-colors duration-300
                  ${currentStep === step.id 
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md' 
                    : currentStep > step.id
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : 'bg-white border-gray-200 text-gray-500'
                  }
                `}>
                  <span className="font-bold block">Paso {step.id}</span>
                  <span className="text-sm">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          
          {/* PASO 1: DATOS DEL TUTOR */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 1: Datos del Tutor Legal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo del Tutor *</label>
                  <input
                    type="text"
                    name="nombre_tutor"
                    value={formData.nombre_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Ej: María Fernanda González"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo y N° de Documento *</label>
                  <input
                    type="text"
                    name="tipo_y_documento_tutor"
                    value={formData.tipo_y_documento_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Ej: CC 12345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Cédula de Ciudadanía</label>
                  <input
                    type="text"
                    name="cc_tutor"
                    value={formData.cc_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Solo si aplica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Cédula de Extranjería</label>
                  <input
                    type="text"
                    name="ce_tutor"
                    value={formData.ce_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Solo si aplica"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Documento Principal</label>
                  <input
                    type="text"
                    name="documento_tutor"
                    value={formData.documento_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Documento principal"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Municipio de Expedición</label>
                  <input
                    type="text"
                    name="municipio_documento_tutor"
                    value={formData.municipio_documento_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Ej: Popayán"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    name="correo_electronico_tutor"
                    value={formData.correo_electronico_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="ejemplo@correo.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Contacto</label>
                  <input
                    type="text"
                    name="direccion_contacto_tutor"
                    value={formData.direccion_contacto_tutor}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
                    placeholder="Ej: Calle 5 #12-34, Popayán"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full mt-6 bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md"
              >
                Continuar a Firma del Aprendiz →
              </button>
            </div>
          )}

          {/* PASO 2: FIRMA DEL APRENDIZ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 2: Firma del Aprendiz
              </h2>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro y presione "Guardar Firma" antes de avanzar.
                </p>
                <canvas
                  ref={canvasAprendizRef}
                  width={700}
                  height={200}
                  className="border border-gray-400 rounded bg-white w-full cursor-crosshair"
                  onMouseDown={(e) => canvasAprendizRef.current && startDrawing(e, canvasAprendizRef.current, setIsDrawingAprendiz)}
                  onMouseMove={(e) => canvasAprendizRef.current && draw(e, canvasAprendizRef.current, isDrawingAprendiz)}
                  onMouseUp={() => stopDrawing(setIsDrawingAprendiz)}
                  onMouseLeave={() => stopDrawing(setIsDrawingAprendiz)}
                  onTouchStart={(e) => canvasAprendizRef.current && startDrawing(e, canvasAprendizRef.current, setIsDrawingAprendiz)}
                  onTouchMove={(e) => canvasAprendizRef.current && draw(e, canvasAprendizRef.current, isDrawingAprendiz)}
                  onTouchEnd={() => stopDrawing(setIsDrawingAprendiz)}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => clearCanvas(canvasAprendizRef.current, setFirmaAprendiz)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSignature(canvasAprendizRef.current, setFirmaAprendiz)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Guardar Firma
                  </button>
                </div>
                {firmaAprendiz && (
                  <p className="text-green-600 text-sm mt-3 font-medium">
                    ✓ Firma guardada correctamente.
                  </p>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  ← Volver a Datos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!firmaAprendiz) {
                      alert('Por favor guarde la firma antes de continuar');
                      return;
                    }
                    setCurrentStep(3);
                  }}
                  className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md"
                >
                  Continuar a Firma del Tutor →
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: FIRMA DEL TUTOR */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 3: Firma del Tutor Legal
              </h2>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro y presione "Guardar Firma" antes de generar el PDF.
                </p>
                <canvas
                  ref={canvasTutorRef}
                  width={700}
                  height={200}
                  className="border border-gray-400 rounded bg-white w-full cursor-crosshair"
                  onMouseDown={(e) => canvasTutorRef.current && startDrawing(e, canvasTutorRef.current, setIsDrawingTutor)}
                  onMouseMove={(e) => canvasTutorRef.current && draw(e, canvasTutorRef.current, isDrawingTutor)}
                  onMouseUp={() => stopDrawing(setIsDrawingTutor)}
                  onMouseLeave={() => stopDrawing(setIsDrawingTutor)}
                  onTouchStart={(e) => canvasTutorRef.current && startDrawing(e, canvasTutorRef.current, setIsDrawingTutor)}
                  onTouchMove={(e) => canvasTutorRef.current && draw(e, canvasTutorRef.current, isDrawingTutor)}
                  onTouchEnd={() => stopDrawing(setIsDrawingTutor)}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => clearCanvas(canvasTutorRef.current, setFirmaTutor)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSignature(canvasTutorRef.current, setFirmaTutor)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    Guardar Firma
                  </button>
                </div>
                {firmaTutor && (
                  <p className="text-green-600 text-sm mt-3 font-medium">
                    ✓ Firma guardada correctamente.
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-6">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  ← Volver a Firma Aprendiz
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !firmaTutor}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Generar y Descargar PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}