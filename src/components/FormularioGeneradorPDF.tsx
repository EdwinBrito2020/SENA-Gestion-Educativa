// src/components/FormularioGeneradorPDF.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function FormularioGeneradorPDF() {
  // ============================================================================
  // 1. ESTADOS DEL FORMULARIO (SIMPLIFICADOS)
  // ============================================================================
  
  const [formData, setFormData] = useState({
    nombre_tutor: '',
    tipo_documento_tutor: '',
    numero_documento_tutor: '',
    municipio_documento_tutor: '',
    correo_electronico_tutor: '',
    direccion_contacto_tutor: '',
  });

  const [firmaAprendiz, setFirmaAprendiz] = useState('');
  const [firmaTutor, setFirmaTutor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStep, setIsLoadingStep] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [esMenorDeEdad, setEsMenorDeEdad] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Referencias para los canvas de firma
  const canvasAprendizRef = useRef<HTMLCanvasElement>(null);
  const canvasTutorRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingAprendiz, setIsDrawingAprendiz] = useState(false);
  const [isDrawingTutor, setIsDrawingTutor] = useState(false);

  // ============================================================================
  // 2. DETECCIÓN DE DISPOSITIVO MÓVIL
  // ============================================================================

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ============================================================================
  // 3. MANEJO DE INPUTS DEL FORMULARIO CON DEBOUNCE
  // ============================================================================

  // Debounce para inputs de texto
  const debounce = <T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const handleInputChange = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }, 300),
    []
  );

  // ============================================================================
  // 4. VALIDACIÓN DE FORMULARIO
  // ============================================================================

  const validateStep1 = (): boolean => {
    // Campos requeridos para todos
    const camposRequeridosBase = ['nombre_tutor', 'tipo_documento_tutor', 'numero_documento_tutor'];
    
    // Si es menor de edad, agregar campos adicionales requeridos
    const camposRequeridosAdicionales = esMenorDeEdad 
      ? ['municipio_documento_tutor', 'correo_electronico_tutor', 'direccion_contacto_tutor']
      : [];

    const todosCamposRequeridos = [...camposRequeridosBase, ...camposRequeridosAdicionales];
    
    const isValid = todosCamposRequeridos.every(field => 
      formData[field as keyof typeof formData]?.trim().length > 0
    );

    // Validación específica de email si está presente y es requerido
    if (formData.correo_electronico_tutor && !isValidEmail(formData.correo_electronico_tutor)) {
      setError('Por favor ingrese un correo electrónico válido');
      return false;
    }

    if (!isValid) {
      setError('Por favor complete todos los campos requeridos (*)');
      return false;
    }

    return true;
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ============================================================================
  // 5. INICIALIZACIÓN Y FUNCIONES PARA CAPTURA DE FIRMAS (MEJORADAS)
  // ============================================================================

  const setupCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // HOOK DE EFECTO MEJORADO: Inicializa el canvas con Resize Observer
  useEffect(() => {
    const updateCanvasSize = (canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 180 * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    };

    const canvasAprendiz = canvasAprendizRef.current;
    const canvasTutor = canvasTutorRef.current;

    if (currentStep === 2 && canvasAprendiz) {
      updateCanvasSize(canvasAprendiz);
      
      // Agregar observer para cambios de tamaño
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize(canvasAprendiz);
      });
      
      resizeObserver.observe(canvasAprendiz);
      return () => resizeObserver.disconnect();
    }
    
    if (currentStep === 3 && canvasTutor) {
      updateCanvasSize(canvasTutor);
      
      const resizeObserver = new ResizeObserver(() => {
        updateCanvasSize(canvasTutor);
      });
      
      resizeObserver.observe(canvasTutor);
      return () => resizeObserver.disconnect();
    }
  }, [currentStep, setupCanvas]);

  // ✅ OBTENER DATOS DEL APRENDIZ
  useEffect(() => {
    fetch('/api/generar-formatos')
      .then(res => res.json())
      .then(data => {
        const esMenor = data.aprendiz.tipo_documento_aprendiz === 'TI';
        setEsMenorDeEdad(esMenor);
        console.log('[Frontend] Tipo documento aprendiz:', data.aprendiz.tipo_documento_aprendiz, 'Es menor:', esMenor);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setEsMenorDeEdad(false); // Por defecto mayor de edad en caso de error
      });
  }, []);

  const startDrawing = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    setIsDrawing: (val: boolean) => void
  ) => {
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, []);

  const draw = useCallback((
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
    isDrawing: boolean
  ) => {
    if (!isDrawing) return;
    
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    // Suavizar el trazo
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }, []);

  const stopDrawing = useCallback((setIsDrawing: (val: boolean) => void) => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback((canvas: HTMLCanvasElement | null, setFirma: (val: string) => void) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setFirma('');
  }, []);

  const saveSignature = useCallback((canvas: HTMLCanvasElement | null, setFirma: (val: string) => void) => {
    if (!canvas) return;
    
    // Verificar que el canvas no esté vacío
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = imageData.data.every(channel => channel === 0);
    
    if (isEmpty) {
      setError('Por favor, realice una firma antes de guardar');
      return;
    }
    
    const base64 = canvas.toDataURL('image/png');
    setFirma(base64);
    setError('');
  }, []);

  // ============================================================================
  // 6. NAVEGACIÓN ENTRE PASOS CON LOADING STATES
  // ============================================================================

  const goToStep = useCallback(async (step: number) => {
    setIsLoadingStep(true);
    setError('');

    // Simular un pequeño delay para mejor UX
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (step === 2 && !validateStep1()) {
        setError('Por favor complete todos los campos requeridos (*)');
        return;
      }
      
      if (step === 3 && !firmaAprendiz) {
        setError('Por favor guarde la firma del aprendiz antes de continuar');
        return;
      }
      
      setCurrentStep(step);
    } finally {
      setIsLoadingStep(false);
    }
  }, [formData, firmaAprendiz]);

  // ============================================================================
  // 7. ENVÍO DEL FORMULARIO Y GENERACIÓN DEL PDF (OPTIMIZADO)
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
        nombre_tutor: formData.nombre_tutor.trim(),
        tipo_documento_tutor: formData.tipo_documento_tutor,
        numero_documento_tutor: formData.numero_documento_tutor.trim(),
        municipio_documento_tutor: formData.municipio_documento_tutor.trim(),
        correo_electronico_tutor: formData.correo_electronico_tutor.trim(),
        direccion_contacto_tutor: formData.direccion_contacto_tutor.trim(),
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
        throw new Error(errorData.error || 'Error al generar los documentos');
      }

      const result = await response.json();

      if (result.success) {
        // Función para descargar PDF desde base64
        const downloadPDF = (base64Data: string, filename: string) => {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        };

        // Descargar Acta de Compromiso
        if (result.documentos.acta_compromiso.pdf_base64) {
          downloadPDF(
            result.documentos.acta_compromiso.pdf_base64,
            result.documentos.acta_compromiso.filename
          );
        }

        // Descargar Formato de Tratamiento de Datos (con delay)
        if (result.documentos.tratamiento_datos.pdf_base64) {
          setTimeout(() => {
            downloadPDF(
              result.documentos.tratamiento_datos.pdf_base64,
              result.documentos.tratamiento_datos.filename
            );
          }, 500);
        }

        alert('✅ Documentos generados exitosamente. Se descargarán automáticamente.');
        
        resetForm();
      } else {
        throw new Error(result.message || 'Error al generar documentos');
      }

    } catch (err) {
      console.error('Error:', err);
      setError((err as Error).message || 'Error al generar los documentos');
    } finally {
      setIsLoading(false);
    }
  };

  // Resetea el formulario
  const resetForm = () => {
    setFormData({
      nombre_tutor: '',
      tipo_documento_tutor: '',
      numero_documento_tutor: '',
      municipio_documento_tutor: '',
      correo_electronico_tutor: '',
      direccion_contacto_tutor: '',
    });
    setFirmaAprendiz('');
    setFirmaTutor('');
    
    // Limpiar los canvas
    if (canvasAprendizRef.current) {
      const ctx = canvasAprendizRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasAprendizRef.current.width, canvasAprendizRef.current.height);
      }
    }
    
    if (canvasTutorRef.current) {
      const ctx = canvasTutorRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasTutorRef.current.width, canvasTutorRef.current.height);
      }
    }
    
    setCurrentStep(1);
    setError('');
  };

  // ============================================================================
  // 8. COMPONENTES DE UI REUTILIZABLES
  // ============================================================================

  const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );

  const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6'
    };

    return (
      <svg className={`animate-spin ${sizeClasses[size]} text-white`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    );
  };

  // ============================================================================
  // 9. RENDERIZADO DEL COMPONENTE (RESPONSIVE)
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-3 sm:py-12 sm:px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border-l-4 border-teal-600">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-1">
            Generador de formatos para matricula del SENA
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Complete los pasos para generar y descargar los formatos de Acta de Compromiso.
          </p>
          <div className={`mt-3 rounded-lg p-3 ${
            esMenorDeEdad === null 
              ? 'bg-gray-50 border border-gray-200 text-gray-600' 
              : esMenorDeEdad
                ? 'bg-blue-50 border border-blue-200 text-blue-700'
                : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <p className="text-sm font-medium">
              {esMenorDeEdad === null 
                ? '⏳ Verificando datos del aprendiz...'
                : esMenorDeEdad
                  ? '🔒 El aprendiz es menor de edad - Se requiere información completa del tutor legal'
                  : '✅ El aprendiz es mayor de edad - Solo se requiere información básica del responsable'
              }
            </p>
          </div>
        </header>

        {/* Indicador de Pasos */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Progreso</h3>
          <ol className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-0">
            {[
              { id: 1, label: esMenorDeEdad ? 'Tutor Legal' : 'Responsable' },
              { id: 2, label: 'Firma Aprendiz' },
              { id: 3, label: 'Firma Tutor' },
            ].map((step) => (
              <li key={step.id} className="flex-1 text-center">
                <div className={`
                  p-2 sm:p-3 rounded-lg border-2 transition-colors duration-300 text-sm sm:text-base
                  ${currentStep === step.id 
                    ? 'bg-teal-600 border-teal-600 text-white shadow-md' 
                    : currentStep > step.id
                      ? 'bg-teal-50 border-teal-200 text-teal-800'
                      : 'bg-white border-gray-200 text-gray-500'
                  }
                `}>
                  <span className="font-bold block">Paso {step.id}</span>
                  <span className="text-xs sm:text-sm">{step.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
          
          {/* PASO 1: DATOS DEL TUTOR/RESPONSABLE */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 1: Datos del {esMenorDeEdad ? 'Tutor Legal' : 'Responsable'}
              </h2>

              {/* Mensaje informativo */}
              <div className={`p-3 sm:p-4 rounded-lg border ${
                esMenorDeEdad 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-green-50 border-green-200 text-green-700'
              }`}>
                <p className="text-sm font-medium">
                  {esMenorDeEdad 
                    ? '🔒 El aprendiz es menor de edad, se requiere información completa del tutor legal.'
                    : '✅ El aprendiz es mayor de edad, solo se requiere información básica del responsable.'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {/* Campos que SIEMPRE se muestran */}
                <div className="col-span-2">
                  <Tooltip text="Nombre completo del tutor o responsable">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo del {esMenorDeEdad ? 'Tutor' : 'Responsable'} *
                    </label>
                  </Tooltip>
                  <input
                    type="text"
                    name="nombre_tutor"
                    defaultValue={formData.nombre_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                    placeholder={esMenorDeEdad ? "Ej: María Fernanda González" : "Ej: Carlos Andrés López"}
                    aria-describedby="nombre-tutor-help"
                  />
                  <p id="nombre-tutor-help" className="text-xs text-gray-500 mt-1">
                    Nombre completo según documento de identidad
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento de Identidad del {esMenorDeEdad ? 'Tutor' : 'Responsable'} *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Tooltip text="Seleccione el tipo de documento de identidad">
                        <label className="block text-xs text-gray-600 mb-1">
                          Tipo de Documento *
                        </label>
                      </Tooltip>
                      <select
                        name="tipo_documento_tutor"
                        defaultValue={formData.tipo_documento_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                      >
                        <option value="">Seleccionar tipo...</option>
                        <option value="CC">Cédula de Ciudadanía</option>
                        <option value="CE">Cédula de Extranjería</option>
                        <option value="Pasaporte">Pasaporte</option>
                      </select>
                    </div>
                    
                    <div>
                      <Tooltip text="Número completo del documento sin puntos ni espacios">
                        <label className="block text-xs text-gray-600 mb-1">
                          Número de Documento *
                        </label>
                      </Tooltip>
                      <input
                        type="text"
                        name="numero_documento_tutor"
                        defaultValue={formData.numero_documento_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                        placeholder="Ej: 1234567890"
                      />
                    </div>
                  </div>
                </div>

                {/* Campos que solo se muestran si es menor de edad */}
                {esMenorDeEdad && (
                  <>
                    <div>
                      <Tooltip text="Municipio donde fue expedido el documento">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Municipio de Expedición *
                        </label>
                      </Tooltip>
                      <input
                        type="text"
                        name="municipio_documento_tutor"
                        defaultValue={formData.municipio_documento_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                        placeholder="Ej: Popayán"
                      />
                    </div>

                    <div>
                      <Tooltip text="Correo electrónico para contacto y notificaciones">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Correo Electrónico *
                        </label>
                      </Tooltip>
                      <input
                        type="email"
                        name="correo_electronico_tutor"
                        defaultValue={formData.correo_electronico_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                        placeholder="ejemplo@correo.com"
                      />
                    </div>

                    <div className="col-span-2">
                      <Tooltip text="Dirección completa para notificaciones oficiales">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección de Contacto *
                        </label>
                      </Tooltip>
                      <input
                        type="text"
                        name="direccion_contacto_tutor"
                        defaultValue={formData.direccion_contacto_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                        placeholder="Ej: Calle 5 #12-34, Popayán"
                      />
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => goToStep(2)}
                disabled={isLoadingStep}
                className="w-full mt-4 sm:mt-6 bg-teal-600 text-white py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoadingStep ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Validando...
                  </>
                ) : (
                  'Continuar a Firma del Aprendiz →'
                )}
              </button>
            </div>
          )}

          {/* PASO 2: FIRMA DEL APRENDIZ */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 2: Firma del Aprendiz
              </h2>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro y presione "Guardar Firma" antes de avanzar.
                </p>
                <canvas
                  ref={canvasAprendizRef}
                  width={600}
                  height={180}
                  className="border border-gray-400 rounded bg-white w-full h-40 sm:h-48 cursor-crosshair touch-none"
                  onMouseDown={(e) => canvasAprendizRef.current && startDrawing(e, canvasAprendizRef.current, setIsDrawingAprendiz)}
                  onMouseMove={(e) => canvasAprendizRef.current && draw(e, canvasAprendizRef.current, isDrawingAprendiz)}
                  onMouseUp={() => stopDrawing(setIsDrawingAprendiz)}
                  onMouseLeave={() => stopDrawing(setIsDrawingAprendiz)}
                  onTouchStart={(e) => canvasAprendizRef.current && startDrawing(e, canvasAprendizRef.current, setIsDrawingAprendiz)}
                  onTouchMove={(e) => canvasAprendizRef.current && draw(e, canvasAprendizRef.current, isDrawingAprendiz)}
                  onTouchEnd={() => stopDrawing(setIsDrawingAprendiz)}
                  aria-label="Área para capturar la firma del aprendiz"
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => clearCanvas(canvasAprendizRef.current, setFirmaAprendiz)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSignature(canvasAprendizRef.current, setFirmaAprendiz)}
                    className="flex-1 bg-green-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
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

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  disabled={isLoadingStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoadingStep ? <LoadingSpinner size="sm" /> : '← Volver a Datos'}
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  disabled={isLoadingStep || !firmaAprendiz}
                  className="flex-1 bg-teal-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoadingStep ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Validando...
                    </>
                  ) : (
                    'Continuar a Firma del Tutor →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: FIRMA DEL TUTOR */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 3: Firma del Tutor Legal
              </h2>

              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro y presione "Guardar Firma" antes de generar el PDF.
                </p>
                <canvas
                  ref={canvasTutorRef}
                  width={600}
                  height={180}
                  className="border border-gray-400 rounded bg-white w-full h-40 sm:h-48 cursor-crosshair touch-none"
                  onMouseDown={(e) => canvasTutorRef.current && startDrawing(e, canvasTutorRef.current, setIsDrawingTutor)}
                  onMouseMove={(e) => canvasTutorRef.current && draw(e, canvasTutorRef.current, isDrawingTutor)}
                  onMouseUp={() => stopDrawing(setIsDrawingTutor)}
                  onMouseLeave={() => stopDrawing(setIsDrawingTutor)}
                  onTouchStart={(e) => canvasTutorRef.current && startDrawing(e, canvasTutorRef.current, setIsDrawingTutor)}
                  onTouchMove={(e) => canvasTutorRef.current && draw(e, canvasTutorRef.current, isDrawingTutor)}
                  onTouchEnd={() => stopDrawing(setIsDrawingTutor)}
                  aria-label="Área para capturar la firma del tutor legal"
                />
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => clearCanvas(canvasTutorRef.current, setFirmaTutor)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm sm:text-base"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => saveSignature(canvasTutorRef.current, setFirmaTutor)}
                    className="flex-1 bg-green-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm sm:text-base"
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
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  disabled={isLoadingStep}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoadingStep ? <LoadingSpinner size="sm" /> : '← Volver a Firma Aprendiz'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || !firmaTutor}
                  className="flex-1 bg-green-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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