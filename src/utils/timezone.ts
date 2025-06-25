// Constantes para timezone de São Paulo
export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';
export const COLOMBIA_TIMEZONE = 'America/Bogota';

// Función para detectar el timezone del usuario
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('[getUserTimezone] Error detecting timezone:', error);
    return 'UTC';
  }
};

// Función para obtener la fecha actual en timezone de São Paulo
export const getCurrentDateSaoPaulo = (): Date => {
  const now = new Date();
  
  // Crear un objeto Date en el timezone de São Paulo
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1; // Month is 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
};

// Función para obtener la fecha actual en timezone de Colombia
export const getCurrentDateColombia = (): Date => {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
};

// Función para obtener la medianoche del siguiente día en São Paulo
export const getNextMidnightSaoPaulo = (): Date => {
  const now = new Date();
  
  // Calcular la próxima medianoche en São Paulo usando la biblioteca de fechas nativa
  const saoPauloTime = new Date(now.toLocaleString("en-US", {timeZone: SAO_PAULO_TIMEZONE}));
  const nextMidnight = new Date(saoPauloTime);
  
  // Si es después de las 23:59, ir al día siguiente
  if (nextMidnight.getHours() === 23 && nextMidnight.getMinutes() >= 59) {
    nextMidnight.setDate(nextMidnight.getDate() + 1);
  } else if (nextMidnight.getHours() < 23) {
    // Si no es el final del día, ir al día siguiente
    nextMidnight.setDate(nextMidnight.getDate() + 1);
  }
  
  nextMidnight.setHours(0, 0, 0, 0);
  
  // Convertir de vuelta a UTC
  const timezoneOffset = getSaoPauloOffset();
  const nextMidnightUTC = new Date(nextMidnight.getTime() - (timezoneOffset * 60 * 60 * 1000));
  
  return nextMidnightUTC;
};

// Función para obtener el offset de São Paulo en horas (considerando DST)
export const getSaoPauloOffset = (): number => {
  const now = new Date();
  
  // Obtener el offset actual de São Paulo
  const saoPauloTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const utcTime = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const saoPauloHour = parseInt(saoPauloTime.find(p => p.type === 'hour')?.value || '0');
  const utcHour = parseInt(utcTime.find(p => p.type === 'hour')?.value || '0');
  
  let offset = saoPauloHour - utcHour;
  
  // Ajustar por cambio de día
  if (offset > 12) offset -= 24;
  if (offset < -12) offset += 24;
  
  return offset;
};

// Función para obtener el día del juego en formato São Paulo
export const getCurrentGameDaySaoPaulo = (): string => {
  const saoPauloDate = getCurrentDateSaoPaulo();
  const year = saoPauloDate.getFullYear();
  const month = String(saoPauloDate.getMonth() + 1).padStart(2, '0');
  const day = String(saoPauloDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// Función para calcular el tiempo restante hasta la medianoche de São Paulo (CORREGIDA)
export const getTimeUntilNextDrawSaoPaulo = (): number => {
  try {
    const now = new Date();
    
    // Obtener medianoche São Paulo de manera más precisa
    const nextMidnightSP = new Date(now.toLocaleString("en-US", {timeZone: SAO_PAULO_TIMEZONE}));
    
    // Ajustar a la próxima medianoche
    nextMidnightSP.setDate(nextMidnightSP.getDate() + 1);
    nextMidnightSP.setHours(0, 0, 0, 0);
    
    // Convertir la hora de São Paulo a UTC para la comparación
    // São Paulo normalmente está en UTC-3, pero puede variar con horario de verano
    const saoPauloOffsetMs = (nextMidnightSP.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
    const nextMidnightUTC = new Date(nextMidnightSP.getTime() - saoPauloOffsetMs);
    
    // Agregar el offset de São Paulo manualmente (esto es más confiable)
    const manualOffset = getSaoPauloOffset();
    const correctedMidnight = new Date(nextMidnightSP.getTime() - (manualOffset * 60 * 60 * 1000));
    
    const secondsUntil = Math.floor((correctedMidnight.getTime() - now.getTime()) / 1000);
    
    // Validar que el resultado esté en rango razonable (0-25 horas para considerar DST)
    if (secondsUntil < 0 || secondsUntil > 25 * 60 * 60) {
      console.warn('[getTimeUntilNextDrawSaoPaulo] Resultado fuera de rango:', secondsUntil, 'usando fallback mejorado');
      
      // Fallback mejorado: usar la API nativa de timezone
      const saoPauloNow = new Date(now.toLocaleString("en-US", {timeZone: SAO_PAULO_TIMEZONE}));
      const tomorrow = new Date(saoPauloNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Convertir de vuelta considerando la diferencia de timezone
      const offsetDiff = (saoPauloNow.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
      const tomorrowUTC = new Date(tomorrow.getTime() - offsetDiff);
      
      return Math.max(0, Math.floor((tomorrowUTC.getTime() - now.getTime()) / 1000));
    }
    
    return Math.max(0, secondsUntil);
    
  } catch (error) {
    console.error('[getTimeUntilNextDrawSaoPaulo] Error:', error);
    
    // Fallback simple pero robusto
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
  }
};

// Función para validar que no estamos en una ventana de reset problemática
export const isInProblematicResetWindow = (): boolean => {
  try {
    const userTimezone = getUserTimezone();
    const now = new Date();
    
    // Si el usuario está en Colombia o timezone similar (UTC-5)
    if (userTimezone.includes('Bogota') || userTimezone.includes('America/Colombia')) {
      const colombiaTime = getCurrentDateColombia();
      const hour = colombiaTime.getHours();
      
      // Evitar resets entre 15:00 y 17:00 Colombia (problematic window)
      if (hour >= 15 && hour < 17) {
        console.warn('[isInProblematicResetWindow] En ventana problemática para Colombia:', hour + ':00');
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('[isInProblematicResetWindow] Error:', error);
    return false;
  }
};

// Función para formatear tiempo en timezone de São Paulo
export const formatTimeSaoPaulo = (date: Date): string => {
  return new Intl.DateTimeFormat('es-BR', {
    timeZone: SAO_PAULO_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  }).format(date);
};

// Función para formatear tiempo en timezone de Colombia
export const formatTimeColombia = (date: Date): string => {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  }).format(date);
};

// Función de debug para mostrar información de timezone
export const debugTimezone = () => {
  const now = new Date();
  const saoPauloNow = getCurrentDateSaoPaulo();
  const colombiaNow = getCurrentDateColombia();
  const nextMidnight = getNextMidnightSaoPaulo();
  const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
  const offset = getSaoPauloOffset();
  const userTz = getUserTimezone();
  
  console.log('🕐 Timezone Debug Info:');
  console.log('User timezone:', userTz);
  console.log('Local time:', now.toLocaleString());
  console.log('São Paulo time:', formatTimeSaoPaulo(now));
  console.log('Colombia time:', formatTimeColombia(now));
  console.log('São Paulo offset:', offset, 'hours');
  console.log('Game day (SP):', getCurrentGameDaySaoPaulo());
  console.log('Next midnight (UTC):', nextMidnight.toISOString());
  console.log('Next midnight (SP):', formatTimeSaoPaulo(nextMidnight));
  console.log('Time until draw:', Math.floor(timeUntilDraw / 3600), 'h', Math.floor((timeUntilDraw % 3600) / 60), 'm', timeUntilDraw % 60, 's');
  console.log('In problematic window:', isInProblematicResetWindow());
  
  return {
    userTimezone: userTz,
    localTime: now,
    saoPauloTime: saoPauloNow,
    colombiaTime: colombiaNow,
    nextMidnight,
    timeUntilDraw,
    offset,
    gameDay: getCurrentGameDaySaoPaulo(),
    inProblematicWindow: isInProblematicResetWindow()
  };
};

// Función adicional para comparar con Firebase
export const compareWithFirebase = async () => {
  try {
    const { subscribeToCurrentGameState } = await import('../firebase/game');
    
    return new Promise((resolve) => {
      const unsubscribe = subscribeToCurrentGameState((winningNumbers, firebaseTimeRemaining) => {
        const saoPauloTimeRemaining = getTimeUntilNextDrawSaoPaulo();
        const difference = Math.abs(firebaseTimeRemaining - saoPauloTimeRemaining);
        
        const comparison = {
          firebase: {
            timeRemaining: firebaseTimeRemaining,
            formatted: `${Math.floor(firebaseTimeRemaining / 3600)}h ${Math.floor((firebaseTimeRemaining % 3600) / 60)}m ${firebaseTimeRemaining % 60}s`
          },
          saoPaulo: {
            timeRemaining: saoPauloTimeRemaining,
            formatted: `${Math.floor(saoPauloTimeRemaining / 3600)}h ${Math.floor((saoPauloTimeRemaining % 3600) / 60)}m ${saoPauloTimeRemaining % 60}s`
          },
          difference: {
            seconds: difference,
            formatted: `${Math.floor(difference / 60)}m ${difference % 60}s`,
            synchronized: difference < 10
          }
        };
        
        console.log('🔄 Firebase vs São Paulo Sync:');
        console.table(comparison);
        
        unsubscribe();
        resolve(comparison);
      });
    });
  } catch (error) {
    console.error('Error comparing with Firebase:', error);
    return null;
  }
};

// Hacer disponibles las funciones globalmente en desarrollo
if (import.meta.env.DEV) {
  (window as any).debugTimezone = debugTimezone;
  (window as any).compareWithFirebase = compareWithFirebase;
  (window as any).getSaoPauloTime = () => ({
    current: formatTimeSaoPaulo(new Date()),
    gameDay: getCurrentGameDaySaoPaulo(),
    timeUntilDraw: getTimeUntilNextDrawSaoPaulo(),
    nextMidnight: formatTimeSaoPaulo(getNextMidnightSaoPaulo())
  });
} 