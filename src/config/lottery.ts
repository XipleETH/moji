// ===================================
// 🎯 CONFIGURACIÓN DE HORA DE SORTEO
// ===================================
// CAMBIA AQUÍ LA HORA DEL SORTEO FÁCILMENTE:

// Hora del sorteo diario (debe coincidir con functions/index.js)
export const LOTTERY_HOUR = 20; // 8:00 PM (formato 24 horas: 0-23)
export const LOTTERY_MINUTE = 0; // Minutos (0-59)

// Ejemplos de horas comunes:
// 12 = 12:00 PM (mediodía)
// 18 = 6:00 PM
// 20 = 8:00 PM  
// 21 = 9:00 PM
// 0  = 12:00 AM (medianoche)

// Zona horaria (debe coincidir con functions/index.js)
export const TIMEZONE = "America/Mexico_City";

// ===================================
// FIN DE CONFIGURACIÓN
// ===================================

// Función para calcular el próximo sorteo
export const getNextLotteryTime = (now: Date = new Date()): Date => {
  const nextLottery = new Date(now);
  
  // Si ya pasó la hora de hoy, programar para mañana
  if (now.getHours() > LOTTERY_HOUR || 
      (now.getHours() === LOTTERY_HOUR && now.getMinutes() >= LOTTERY_MINUTE)) {
    nextLottery.setDate(now.getDate() + 1);
  }
  
  // Establecer la hora exacta del sorteo
  nextLottery.setHours(LOTTERY_HOUR);
  nextLottery.setMinutes(LOTTERY_MINUTE);
  nextLottery.setSeconds(0);
  nextLottery.setMilliseconds(0);
  
  return nextLottery;
};

// Función para obtener la hora del sorteo en formato legible
export const getLotteryTimeString = (): string => {
  const hour12 = LOTTERY_HOUR === 0 ? 12 : 
                 LOTTERY_HOUR > 12 ? LOTTERY_HOUR - 12 : LOTTERY_HOUR;
  const ampm = LOTTERY_HOUR >= 12 ? 'PM' : 'AM';
  const minutes = LOTTERY_MINUTE.toString().padStart(2, '0');
  
  return `${hour12}:${minutes} ${ampm}`;
}; 