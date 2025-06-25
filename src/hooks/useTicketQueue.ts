import { useState, useCallback, useRef, useEffect } from 'react';

interface TicketRequest {
  id: string;
  numbers: string[];
  timestamp: number;
}

interface QueueStatus {
  isProcessing: boolean;
  queueLength: number;
  currentTicket: TicketRequest | null;
  totalProcessed: number;
  errors: number;
}

export function useTicketQueue(
  processTicket: (numbers: string[]) => Promise<any>
) {
  const [status, setStatus] = useState<QueueStatus>({
    isProcessing: false,
    queueLength: 0,
    currentTicket: null,
    totalProcessed: 0,
    errors: 0
  });

  const queue = useRef<TicketRequest[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queue.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    
    while (queue.current.length > 0) {
      const ticket = queue.current.shift()!;
      
      setStatus(prev => ({
        ...prev,
        isProcessing: true,
        currentTicket: ticket,
        queueLength: queue.current.length
      }));

      try {
        console.log(`[TicketQueue] 🎫 Procesando ticket: ${ticket.id}`);
        await processTicket(ticket.numbers);
        
        setStatus(prev => ({
          ...prev,
          totalProcessed: prev.totalProcessed + 1
        }));
        
        console.log(`[TicketQueue] ✅ Ticket ${ticket.id} procesado exitosamente`);
        
        // Pequeña pausa entre tickets para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`[TicketQueue] ❌ Error procesando ticket ${ticket.id}:`, error);
        
        setStatus(prev => ({
          ...prev,
          errors: prev.errors + 1
        }));
      }
    }

    isProcessingRef.current = false;
    setStatus(prev => ({
      ...prev,
      isProcessing: false,
      currentTicket: null,
      queueLength: 0
    }));

    console.log('[TicketQueue] 🏁 Cola procesada completamente');
  }, [processTicket]);

  const addToQueue = useCallback((numbers: string[]) => {
    const ticketRequest: TicketRequest = {
      id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      numbers,
      timestamp: Date.now()
    };

    queue.current.push(ticketRequest);
    
    setStatus(prev => ({
      ...prev,
      queueLength: queue.current.length
    }));

    console.log(`[TicketQueue] ➕ Ticket agregado a cola: ${ticketRequest.id} (${queue.current.length} en cola)`);

    // Iniciar procesamiento si no está en progreso
    if (!isProcessingRef.current) {
      processQueue();
    }

    return ticketRequest.id;
  }, [processQueue]);

  const clearQueue = useCallback(() => {
    queue.current = [];
    isProcessingRef.current = false;
    
    setStatus({
      isProcessing: false,
      queueLength: 0,
      currentTicket: null,
      totalProcessed: 0,
      errors: 0
    });
    
    console.log('[TicketQueue] 🧹 Cola limpiada');
  }, []);

  // Effect para debug
  useEffect(() => {
    console.log('[TicketQueue] Estado actualizado:', status);
  }, [status]);

  return {
    addToQueue,
    clearQueue,
    status
  };
} 