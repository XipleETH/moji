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
  const datePart = parts.find(part => part.type === 'year')?.value + '-' +
                   parts.find(part => part.type === 'month')?.value + '-' +
                   parts.find(part => part.type === 'day')?.value;
  const timePart = parts.find(part => part.type === 'hour')?.value + ':' +
                   parts.find(part => part.type === 'minute')?.value + ':' +
                   parts.find(part => part.type === 'second')?.value;
  
  return new Date(`${datePart}T${timePart}`);
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
  const datePart = parts.find(part => part.type === 'year')?.value + '-' +
                   parts.find(part => part.type === 'month')?.value + '-' +
                   parts.find(part => part.type === 'day')?.value;
  const timePart = parts.find(part => part.type === 'hour')?.value + ':' +
                   parts.find(part => part.type === 'minute')?.value + ':' +
                   parts.find(part => part.type === 'second')?.value;
  
  return new Date(`${datePart}T${timePart}`);
};

// Función para obtener el día del juego actual en São Paulo
export const getCurrentGameDaySaoPaulo = (): string => {
  const saoPauloDate = getCurrentDateSaoPaulo();
  return saoPauloDate.toISOString().split('T')[0]; // YYYY-MM-DD
};

// Función para formatear tiempo en São Paulo
export const formatTimeSaoPaulo = (date: Date): string => {
  return new Intl.DateTimeFormat('es-CO', {
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

// Función para formatear tiempo en Colombia
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

// Función para calcular tiempo hasta medianoche de São Paulo
export const getTimeUntilNextDrawSaoPaulo = (): number => {
  const now = new Date();
  const saoPauloNow = getCurrentDateSaoPaulo();
  
  // Calcular medianoche del próximo día en São Paulo
  const nextMidnight = new Date(saoPauloNow);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  // Ajustar para timezone offset
  const saoPauloOffset = saoPauloNow.getTimezoneOffset() - now.getTimezoneOffset();
  const adjustedNextMidnight = new Date(nextMidnight.getTime() + (saoPauloOffset * 60 * 1000));
  
  return Math.max(0, adjustedNextMidnight.getTime() - now.getTime());
};

// Función de debug para timezone
export const debugTimezone = () => {
  const now = new Date();
  const saoPauloTime = getCurrentDateSaoPaulo();
  const colombiaTime = getCurrentDateColombia();
  
  console.log('🕐 Timezone Debug Info:');
  console.log('User timezone:', getUserTimezone());
  console.log('Local time:', now.toLocaleString());
  console.log('São Paulo time:', formatTimeSaoPaulo(now));
  console.log('Colombia time:', formatTimeColombia(now));
  console.log('São Paulo offset:', saoPauloTime.getTimezoneOffset() / -60, 'hours');
  console.log('Game day (SP):', getCurrentGameDaySaoPaulo());
  
  const nextMidnight = new Date(saoPauloTime);
  nextMidnight.setDate(nextMidnight.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  console.log('Next midnight (UTC):', nextMidnight.toISOString());
  console.log('Next midnight (SP):', formatTimeSaoPaulo(nextMidnight));
  
  const timeUntilDraw = getTimeUntilNextDrawSaoPaulo();
  const hours = Math.floor(timeUntilDraw / (1000 * 60 * 60));
  const minutes = Math.floor((timeUntilDraw % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeUntilDraw % (1000 * 60)) / 1000);
  console.log('Time until draw:', `${hours} h ${minutes} m ${seconds} s`);
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
    nextMidnight: formatTimeSaoPaulo(new Date(getCurrentDateSaoPaulo().getTime() + getTimeUntilNextDrawSaoPaulo()))
  });
} 