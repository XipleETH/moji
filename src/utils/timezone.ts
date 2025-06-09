// Constantes para timezone de São Paulo
export const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo';

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

// Función para obtener la medianoche del siguiente día en São Paulo
export const getNextMidnightSaoPaulo = (): Date => {
  const now = new Date();
  
  // Crear fecha en timezone de São Paulo
  const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = saoPauloFormatter.formatToParts(now);
  const currentSaoPauloYear = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const currentSaoPauloMonth = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const currentSaoPauloDay = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const currentSaoPauloHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const currentSaoPauloMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const currentSaoPauloSecond = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  // Crear medianoche del día siguiente en São Paulo
  let targetDay = currentSaoPauloDay + 1;
  let targetMonth = currentSaoPauloMonth;
  let targetYear = currentSaoPauloYear;
  
  // Si ya pasó medianoche (o estamos muy cerca), calcular la próxima medianoche
  if (currentSaoPauloHour === 0 && currentSaoPauloMinute === 0 && currentSaoPauloSecond < 5) {
    // Si estamos en los primeros 5 segundos de medianoche, la próxima medianoche es mañana
    targetDay = currentSaoPauloDay + 1;
  }
  
  // Manejar cambio de mes/año
  const tempDate = new Date(targetYear, targetMonth, targetDay);
  if (tempDate.getMonth() !== targetMonth) {
    targetMonth++;
    targetDay = 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
  }
  
  // Crear la fecha objetivo en São Paulo (medianoche)
  const nextMidnightSP = new Date(targetYear, targetMonth, targetDay, 0, 0, 0, 0);
  
  // Convertir a UTC usando el offset de São Paulo
  const saoPauloOffset = getSaoPauloOffset();
  const nextMidnightUTC = new Date(nextMidnightSP.getTime() - (saoPauloOffset * 60 * 60 * 1000));
  
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

// Función para calcular el tiempo restante hasta la medianoche de São Paulo
export const getTimeUntilNextDrawSaoPaulo = (): number => {
  const now = new Date();
  const nextMidnight = getNextMidnightSaoPaulo();
  
  const timeDiff = nextMidnight.getTime() - now.getTime();
  const secondsUntil = Math.floor(timeDiff / 1000);
  
  // Si el resultado es negativo o muy grande (más de 25 horas), recalcular
  if (secondsUntil < 0 || secondsUntil > 25 * 60 * 60) {
    console.warn('[getTimeUntilNextDrawSaoPaulo] Tiempo calculado fuera de rango:', secondsUntil, 'segundos. Recalculando...');
    
    // Recalcular forzando el día siguiente
    const saoPauloNow = getCurrentDateSaoPaulo();
    const tomorrowMidnight = new Date(saoPauloNow);
    tomorrowMidnight.setDate(saoPauloNow.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);
    
    const saoPauloOffset = getSaoPauloOffset();
    const utcMidnight = new Date(tomorrowMidnight.getTime() - (saoPauloOffset * 60 * 60 * 1000));
    
    const correctedDiff = utcMidnight.getTime() - now.getTime();
    const correctedSeconds = Math.max(0, Math.floor(correctedDiff / 1000));
    
    console.log('[getTimeUntilNextDrawSaoPaulo] Tiempo corregido:', correctedSeconds, 'segundos');
    return correctedSeconds;
  }
  
  return Math.max(0, secondsUntil);
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

// Función de debug para mostrar información de timezone
export const debugTimezone = () => {
  const now = new Date();
  const saoPauloNow = getCurrentDateSaoPaulo();
  const nextMidnight = getNextMidnightSaoPaulo();
  const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
  const offset = getSaoPauloOffset();
  
  console.log('🕐 Timezone Debug Info:');
  console.log('Local time:', now.toLocaleString());
  console.log('São Paulo time:', formatTimeSaoPaulo(now));
  console.log('São Paulo offset:', offset, 'hours');
  console.log('Game day (SP):', getCurrentGameDaySaoPaulo());
  console.log('Next midnight (UTC):', nextMidnight.toISOString());
  console.log('Next midnight (SP):', formatTimeSaoPaulo(nextMidnight));
  console.log('Time until draw:', Math.floor(timeUntilDraw / 3600), 'h', Math.floor((timeUntilDraw % 3600) / 60), 'm', timeUntilDraw % 60, 's');
  
  return {
    localTime: now,
    saoPauloTime: saoPauloNow,
    nextMidnight,
    timeUntilDraw,
    offset,
    gameDay: getCurrentGameDaySaoPaulo()
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