// src/components/FormularioGeneradorPDF.tsx

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Función auxiliar para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

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

  // REEMPLAZAR la función validateStep1 actual con esta:
const validateStep1 = (): boolean => {
  console.log('[Validación Paso 1] Es menor de edad:', esMenorDeEdad);

  // Si es mayor de edad, solo validar que tenga firma
  if (!esMenorDeEdad) {
    console.log('[Validación] Aprendiz mayor de edad - Solo validar firma');
    return true;
  }

  // Si es menor de edad, en el Paso 1 solo validar que tenga firma del aprendiz
  // NO validar campos del tutor porque el usuario aún no los ha llenado
  if (!firmaAprendiz) {
    setError('Por favor guarde la firma del aprendiz antes de continuar');
    return false;
  }

  console.log('[Validación Paso 1] Firma del aprendiz OK');
  return true;
};

// AGREGAR esta nueva función para validar el Paso 2 (datos del tutor)
const validateStep2 = (): boolean => {
  console.log('[Validación Paso 2] Validando datos del tutor...');
  console.log('[Validación Paso 2] Datos del tutor:', formData);

  // Validar TODOS los campos requeridos del tutor
  const camposRequeridosBase = ['nombre_tutor', 'tipo_documento_tutor', 'numero_documento_tutor'];
  const camposRequeridosAdicionales = ['municipio_documento_tutor', 'correo_electronico_tutor', 'direccion_contacto_tutor'];
  const todosCamposRequeridos = [...camposRequeridosBase, ...camposRequeridosAdicionales];
  
  const isValid = todosCamposRequeridos.every(field => {
    const value = formData[field as keyof typeof formData];
    const isValidField = value && value.toString().trim().length > 0;
    console.log(`[Validación Paso 2] Campo ${field}: "${value}" -> ${isValidField}`);
    return isValidField;
  });

  // Validación específica de email
  if (formData.correo_electronico_tutor && !isValidEmail(formData.correo_electronico_tutor)) {
    setError('Por favor ingrese un correo electrónico válido');
    return false;
  }

  console.log('[Validación Paso 2] Resultado:', isValid);

  if (!isValid) {
    setError('Por favor complete todos los campos requeridos (*)');
    return false;
  }

  return true;
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

  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    // Validación para ir al Paso 2 (solo firma del aprendiz)
    if (step === 2 && !validateStep1()) {
      return; // El error ya se setea en validateStep1
    }
    
    // Validación para ir al Paso 3 (todos los campos del tutor + firma aprendiz)
    if (step === 3 && esMenorDeEdad) {
      if (!validateStep2()) {
        return; // Error en campos del tutor
      }
      if (!firmaAprendiz) {
        setError('Por favor guarde la firma del aprendiz antes de continuar');
        return;
      }
    }

    // Navegación normal
    setCurrentStep(step);
  } finally {
    setIsLoadingStep(false);
  }
}, [formData, firmaAprendiz, esMenorDeEdad]);

  // ============================================================================
  // 7. ENVÍO DEL FORMULARIO Y GENERACIÓN DEL PDF (OPTIMIZADO)
  // ============================================================================

  // Función para cuando se llama desde form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  // Función para cuando se llama desde botón
  const handleSubmitButton = async () => {
    await submitForm();
  };

  // Función común que contiene la lógica
  const submitForm = async () => {
    setError('');
    setIsLoading(true);

    // Validación de firmas según si es menor de edad
    if (esMenorDeEdad && (!firmaAprendiz || !firmaTutor)) {
      setError('Por favor, capture ambas firmas antes de continuar');
      setIsLoading(false);
      return;
    }

    if (!esMenorDeEdad && !firmaAprendiz) {
      setError('Por favor, capture la firma del aprendiz antes de continuar');
      setIsLoading(false);
      return;
    }

    try {
      // Preparar payload según si es menor de edad
      const payload = esMenorDeEdad ? {
        // Para menores de edad: enviar todos los datos del tutor
        nombre_tutor: formData.nombre_tutor.trim(),
        tipo_documento_tutor: formData.tipo_documento_tutor,
        numero_documento_tutor: formData.numero_documento_tutor.trim(),
        municipio_documento_tutor: formData.municipio_documento_tutor.trim(),
        correo_electronico_tutor: formData.correo_electronico_tutor.trim(),
        direccion_contacto_tutor: formData.direccion_contacto_tutor.trim(),
        firma_aprendiz: firmaAprendiz,
        firma_tutor: firmaTutor,
      } : {
        // Para mayores de edad: enviar datos básicos con firma_tutor vacío 
        nombre_tutor: '',
        tipo_documento_tutor: '',
        numero_documento_tutor: '',
        municipio_documento_tutor: '',
        correo_electronico_tutor: '',
        direccion_contacto_tutor: '',
        firma_aprendiz: firmaAprendiz,
        firma_tutor: '', // valor vacío para mayores de edad
      };

      console.log('Enviando payload:', payload);

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
            {esMenorDeEdad ? (
              // FLUJO PARA MENORES DE EDAD (3 pasos)
              [
                { id: 1, label: 'Acta Compromiso' },
                { id: 2, label: 'Datos Tutor' },
                { id: 3, label: 'Formato Datos' },
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
              ))
            ) : (
              // FLUJO PARA MAYORES DE EDAD (solo 2 pasos)
              [
                { id: 2, label: 'Firma Aprendiz' },
                { id: 4, label: 'Descargar PDF' },
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
                    <span className="font-bold block">
                      {step.id === 2 ? 'Paso 1' : 'Paso 2'}
                    </span>
                    <span className="text-xs sm:text-sm">{step.label}</span>
                  </div>
                </li>
              ))
            )}
          </ol>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
          
          {/* PASO 1: ACTA DE COMPROMISO - PARA TODOS */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Acta de Compromiso
              </h2>

              {/* TEXTO DEL ACTA DE COMPROMISO */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Acta de Compromiso</h3>
                <div className="text-sm text-gray-700 space-y-3">
                  <p>
                    Me comprometo con el Servicio Nacional de Aprendizaje - SENA, en mi calidad de Aprendiz, y como persona responsable de mis actos, a:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 ml-4">
                    <li>Cumplir y promover las disposiciones contempladas en el Reglamento del Aprendiz SENA, publicado en la página web del SENA y en el blog de cada centro de formación, del cual hago constar que he leído y entendido, por lo que acepto las responsabilidades, derechos y obligaciones establecidas; así como acatar las Normas y los Acuerdos de Convivencia Institucional de conformidad con el contexto geográfico y social del Centro de Formación.</li>
                    <li>Participar en todo el proceso de inducción para iniciar el programa de formación, de acuerdo con la programación del Centro de Formación.</li>
                    <li>Portar en todo momento el carné de identificación institucional en sitio visible.</li>
                    <li>Proyectar la imagen corporativa del SENA dentro y fuera de la Entidad asumiendo una actitud ética, con principios y valores sociales en cada una de mis actuaciones.</li>
                    <li>Respetar la orientación sexual, identidad de género, edad, etnia, culto, religión, ideología, procedencia y ocupación, de todos los integrantes de la comunidad educativa.</li>
                    <li>Al finalizar la formación dar cumplimiento oportuno a todos los trámites académicos y administrativos para lograr la certificación dentro del término que establece el reglamento.</li>
                    <li>Si soy seleccionado como beneficiario para recibir apoyo de sostenimiento, alimentación, transporte u otro, por parte de la entidad, me comprometo a realizar de forma adecuada todo los trámites administrativos y académicos correspondientes reglamentados por el SENA.</li>
                    <li>Registrar y mantener actualizados mis datos personales y de contacto en los aplicativos informáticos que el SENA determine y actuar como veedor del registro oportuno de las situaciones académicas y administrativas que se presenten. Cualquier dato registrado por el aprendiz que no corresponda con la información real, será sujeto a lo establecido en la ley de delitos informáticos y demás normatividad vigente sobre uso de plataformas públicas.</li>
                    <li>Con la firma del presente compromiso autorizo al SENA para que me notifique a través de mi correo electrónico registrado en el aplicativo Sofia plus, todos los actos académicos y administrativos, así como también los procedimientos y trámites en general que profiera, de acuerdo con las políticas de uso y confidencialidad.</li>
                  </ol>
                  <p className="font-medium mt-4">
                    Si está de acuerdo, proceda con su firma para generar el formato de acta de compromiso.
                  </p>
                </div>
              </div>

              {/* FORMULARIO DE FIRMA DEL APRENDIZ */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro a continuación para aceptar el acta de compromiso:
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
                onClick={() => esMenorDeEdad ? goToStep(2) : goToStep(4)}
                disabled={isLoadingStep || !firmaAprendiz}
                className="w-full bg-teal-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoadingStep ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Validando...
                  </>
                ) : (
                  esMenorDeEdad ? 'Continuar a Datos del Tutor →' : 'Continuar a Confirmación →'
                )}
              </button>
              </div>
            </div>
          )}

          {/* PASO 2: DATOS DEL TUTOR LEGAL - SOLO PARA MENORES DE EDAD */}
          {currentStep === 2 && esMenorDeEdad && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 2: Datos del Tutor Legal
              </h2>

              {/* FORMULARIO DE DATOS DEL TUTOR */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="col-span-2">
                  <Tooltip text="Nombre completo del tutor legal">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo del Tutor *
                    </label>
                  </Tooltip>
                  <input
                    type="text"
                    name="nombre_tutor"
                    defaultValue={formData.nombre_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                    placeholder="Ej: María Fernanda González"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documento de Identidad del Tutor *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
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
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        name="numero_documento_tutor"
                        defaultValue={formData.numero_documento_tutor}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                        placeholder="Número de Documento"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <input
                    type="text"
                    name="municipio_documento_tutor"
                    defaultValue={formData.municipio_documento_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                    placeholder="Municipio de Expedición"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="correo_electronico_tutor"
                    defaultValue={formData.correo_electronico_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                    placeholder="Correo Electrónico"
                  />
                </div>

                <div className="col-span-2">
                  <input
                    type="text"
                    name="direccion_contacto_tutor"
                    defaultValue={formData.direccion_contacto_tutor}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 text-sm sm:text-base"
                    placeholder="Dirección de Contacto"
                  />
                </div>
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
                  {isLoadingStep ? <LoadingSpinner size="sm" /> : '← Volver'}
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  disabled={isLoadingStep}
                  className="flex-1 bg-teal-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoadingStep ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Validando...
                    </>
                  ) : (
                    'Continuar a Formato de Datos →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: FORMATO TRATAMIENTO DE DATOS - SOLO PARA MENORES DE EDAD */}
          {currentStep === 3 && esMenorDeEdad && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
                Paso 3: Formato de Tratamiento de Datos
              </h2>

              {/* TEXTO DEL FORMATO TRATAMIENTO DE DATOS */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-6 max-h-96 overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">FORMATO "TRATAMIENTO DE DATOS MENOR DE EDAD"</h3>
                <div className="text-sm text-gray-700 space-y-3">
                  <p>
                    Yo <span className="font-semibold">{formData.nombre_tutor || '[Nombre del Tutor]'}</span>, 
                    identificado con {formData.tipo_documento_tutor === 'CC' ? 'Cédula de Ciudadanía' : 
                    formData.tipo_documento_tutor === 'CE' ? 'Cédula de Extranjería' : 
                    formData.tipo_documento_tutor || '[Tipo de Documento]'} 
                    No. <span className="font-semibold">{formData.numero_documento_tutor || '[Número de Documento]'}</span> 
                    de <span className="font-semibold">{formData.municipio_documento_tutor || '[Municipio]'}</span> 
                    declaro bajo la gravedad de juramento que soy el representante legal o tutor del titular de los datos personales del menor de edad, 
                    <span className="font-semibold"> [Nombre del Aprendiz]</span>, 
                    identificado con la tarjeta de identidad número <span className="font-semibold">[Número de Documento Aprendiz]</span>, 
                    y conforme a la ley 1581 de 2012 y demás Decretos reglamentarios:
                  </p>
                  
                  <p>
                    AUTORIZO de manera voluntaria, previa, explicita, informada e inequívoca al Servicio Nacional de Aprendizaje - SENA, 
                    para el manejo de los datos personales del menor de edad y del tratamiento de recolectar, transferir, transmitir, 
                    almacenar, depurar, usar, analizar, circular, actualizar, suprimir y cruzar información, directa o a través de terceros, 
                    con la finalidad de atender adecuadamente las actividades de ingreso y selección de los aspirantes a los diversos programas 
                    de formación que oferte el Centro de Formación, específicamente en los procesos de inscripción, selección, revisión de los 
                    requisitos exigidos por el programa de formación, asentamiento de matrícula y demás funciones y servicios propios del Centro 
                    de Formación que permiten el cumplimiento de las funciones misionales del Sena.
                  </p>

                  <p>
                    De conformidad con la Ley 1581 de 2012 y sus Decretos reglamentarios, declaro que he sido informado de lo siguiente: 
                    (i) Que el SENA, como responsable de los datos personales del menor de edad, ha publicado las políticas de tratamiento 
                    de datos personales en la dirección electrónica www.sena.edu.co, teléfono 3430111 y 018000 910270. (ii) Que los derechos 
                    que me asisten como representante legal o tutor del titular de los datos personales del menor de edad son los previstos 
                    en la constitución, la ley y demás normatividad vigente sobre uso de plataformas públicas, especialmente el derecho a conocer, 
                    actualizar, rectificar y suprimir la información personal del menor de edad; 
                    <span className="font-semibold"> [Nombre del Aprendiz]</span> así como el derecho a revocar el consentimiento otorgado 
                    para el tratamiento de sus datos personales. (iii) Es voluntario responder preguntas que eventualmente me sean hechas sobre 
                    datos sensibles o datos de menores de edad, y que estos últimos serán tratados respetando sus derechos fundamentales e intereses 
                    superiores, de acuerdo con la política de tratamiento y protección de datos personales de la entidad.
                  </p>

                  <p>
                    Lo anterior se podrá ejercer a través de los canales dispuestos por el SENA para la atención al público 
                    www.sena.edu.co/servicioalciudadano/PQRS.
                  </p>

                  <p className="font-medium mt-4">
                    Atentamente,
                  </p>
                  
                  <p className="font-medium">
                    Si está de acuerdo, proceda con su firma para generar el FORMATO "TRATAMIENTO DE DATOS MENOR DE EDAD".
                  </p>
                </div>
              </div>

              {/* FIRMA DEL TUTOR */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600 mb-3">
                  Firme en el recuadro a continuación para aceptar el formato de tratamiento de datos:
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
                  {isLoadingStep ? <LoadingSpinner size="sm" /> : '← Volver'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitButton}
                  disabled={isLoadingStep || !firmaTutor}
                  className="flex-1 bg-teal-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isLoadingStep ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Generando...
                    </>
                  ) : (
                    'Generar y Descargar PDF'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PASO 4: CONFIRMACIÓN Y DESCARGA - PARA TODOS */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-extrabold text-teal-700 mb-4 border-b pb-2">
              {esMenorDeEdad ? 'Paso 4: Confirmación y Descarga' : 'Paso 2: Confirmación y Descarga'}
            </h2>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-800">
                  ¡Listo para generar documentos!
                </h3>
              </div>

              <div className="text-sm text-gray-700 space-y-3">
                <p><strong>Resumen del proceso:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Acta de Compromiso firmada correctamente</li>
                  {esMenorDeEdad && (
                    <>
                      <li>Datos del tutor completados</li>
                      <li>Formato de Tratamiento de Datos firmado</li>
                    </>
                  )}
                  <li>Documentos listos para generación</li>
                </ul>
                
                <p className="mt-4 text-gray-600">
                  Al hacer clic en "Generar y Descargar PDF", se crearán {esMenorDeEdad ? 'ambos documentos' : 'el Acta de Compromiso'} 
                  y se descargarán automáticamente.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => goToStep(esMenorDeEdad ? 3 : 1)}
                disabled={isLoadingStep}
                className="flex-1 bg-gray-200 text-gray-700 py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoadingStep ? <LoadingSpinner size="sm" /> : '← Volver'}
              </button>
              <button
                type="button"
                onClick={handleSubmitButton}
                disabled={isLoading}
                className="flex-1 bg-teal-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-md disabled:bg-teal-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Generando...
                  </>
                ) : (
                  'Generar y Descargar PDF'
                )}
              </button>
            </div>
          </div>
        )}


        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-xs sm:text-sm">
          <p>© 2024 SENA - Sistema de Generación de Formatos. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
}