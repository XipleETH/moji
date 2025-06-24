// Debug utilities for console
export const setupGlobalDebug = () => {
  if (typeof window === 'undefined') return;

  // Función para monitorear el estado del componente BlockchainTicketGenerator
  (window as any).debugBlockchainTicket = () => {
    console.log('🚀 === BLOCKCHAIN TICKET DEBUG ===');
    
    // Verificar si el debug está disponible
    if ((window as any).blockchainTicketDebug) {
      console.log('📋 Recent logs:');
      const logs = (window as any).blockchainTicketDebug.getLogs();
      logs.slice(-10).forEach((log: string) => console.log(`  ${log}`));
      
      console.log('\n🔧 Available debug commands:');
      console.log('  blockchainTicketDebug.getLogs() - Get all logs');
      console.log('  blockchainTicketDebug.clearLogs() - Clear logs');
      console.log('  blockchainTicketDebug.enableVerbose() - Enable verbose logging');
      console.log('  blockchainTicketDebug.disableVerbose() - Disable verbose logging');
    } else {
      console.log('❌ Debug not available - component not mounted');
    }
    
    console.log('\n🌐 Current page state:');
    console.log('  URL:', window.location.href);
    console.log('  User Agent:', navigator.userAgent);
    console.log('  Local Storage keys:', Object.keys(localStorage));
    
    // Verificar errores JavaScript
    const errors = (window as any).__jsErrors || [];
    if (errors.length > 0) {
      console.log('\n💥 JavaScript errors detected:');
      errors.slice(-5).forEach((error: any) => console.error('  ', error));
    }
    
    console.log('\n📊 Memory usage:');
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      console.log('  Used:', Math.round(memory.usedJSHeapSize / 1024 / 1024), 'MB');
      console.log('  Total:', Math.round(memory.totalJSHeapSize / 1024 / 1024), 'MB');
      console.log('  Limit:', Math.round(memory.jsHeapSizeLimit / 1024 / 1024), 'MB');
    }
    
    console.log('=====================================');
  };

  // Función para monitorear transacciones en blockchain
  (window as any).debugTransaction = (txHash?: string) => {
    if (!txHash) {
      console.log('Usage: debugTransaction("0x...")');
      return;
    }
    
    console.log(`🔍 Transaction Debug: ${txHash}`);
    console.log(`📋 Etherscan link: https://sepolia.basescan.org/tx/${txHash}`);
    
    // Verificar si la transacción está en localStorage
    const keys = Object.keys(localStorage);
    const txKeys = keys.filter(key => key.includes(txHash) || localStorage.getItem(key)?.includes(txHash));
    
    if (txKeys.length > 0) {
      console.log('💾 Found in localStorage:');
      txKeys.forEach(key => {
        console.log(`  ${key}:`, localStorage.getItem(key));
      });
    }
  };

  // Función para limpiar todo el estado
  (window as any).resetAllState = () => {
    console.log('🧹 Resetting all application state...');
    
    // Limpiar localStorage
    const keysToKeep = ['theme', 'language']; // Mantener algunas preferencias
    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        console.log(`  Removed: ${key}`);
      }
    });
    
    // Limpiar sessionStorage
    sessionStorage.clear();
    
    // Limpiar logs de debug
    if ((window as any).blockchainTicketDebug) {
      (window as any).blockchainTicketDebug.clearLogs();
    }
    
    console.log('✅ State reset complete. Reload the page to start fresh.');
  };

  // Función para exportar logs
  (window as any).exportLogs = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    let content = `=== BLOCKCHAIN TICKET DEBUG EXPORT ===\n`;
    content += `Timestamp: ${new Date().toISOString()}\n`;
    content += `URL: ${window.location.href}\n`;
    content += `User Agent: ${navigator.userAgent}\n\n`;
    
    if ((window as any).blockchainTicketDebug) {
      content += `=== COMPONENT LOGS ===\n`;
      const logs = (window as any).blockchainTicketDebug.getLogs();
      logs.forEach((log: string) => {
        content += `${log}\n`;
      });
    }
    
    content += `\n=== LOCAL STORAGE ===\n`;
    Object.keys(localStorage).forEach(key => {
      content += `${key}: ${localStorage.getItem(key)}\n`;
    });
    
    // Crear y descargar archivo
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-ticket-debug-${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('📁 Debug logs exported to file');
  };

  // Capturar errores JavaScript globales
  (window as any).__jsErrors = (window as any).__jsErrors || [];
  
  window.addEventListener('error', (event) => {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    };
    
    (window as any).__jsErrors.push(error);
    console.error('💥 JavaScript Error Captured:', error);
    
    // Mantener solo los últimos 10 errores
    if ((window as any).__jsErrors.length > 10) {
      (window as any).__jsErrors.splice(0, (window as any).__jsErrors.length - 10);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = {
      reason: event.reason?.toString() || 'Unknown',
      timestamp: new Date().toISOString(),
      type: 'unhandledrejection'
    };
    
    (window as any).__jsErrors.push(error);
    console.error('💥 Unhandled Promise Rejection:', error);
  });

  console.log('🚀 Global debug functions loaded!');
  console.log('Available commands:');
  console.log('  debugBlockchainTicket() - Show component debug info');
  console.log('  debugTransaction("0x...") - Debug specific transaction');
  console.log('  resetAllState() - Reset all application state');
  console.log('  exportLogs() - Export debug logs to file');
}; 