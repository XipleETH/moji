import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getContractAddresses } from '../contracts/addresses';

export const useSafeContractAddresses = () => {
  const { chainId } = useAccount();
  
  const contracts = useMemo(() => {
    try {
      console.log('useSafeContractAddresses - chainId:', chainId);
      
      if (!chainId) {
        console.log('useSafeContractAddresses - No chainId, returning null');
        return null;
      }
      
      const addresses = getContractAddresses(chainId);
      console.log('useSafeContractAddresses - Retrieved addresses:', addresses);
      
      return addresses;
    } catch (error) {
      console.error('useSafeContractAddresses - Error getting contract addresses:', error);
      return null;
    }
  }, [chainId]);
  
  const isEnabled = !!contracts?.LottoMojiCore && !!chainId && chainId === 84532;
  
  console.log('useSafeContractAddresses - isEnabled:', isEnabled, 'chainId:', chainId);
  
  return {
    contracts,
    isEnabled,
    isBaseSepoliaSupported: chainId === 84532,
    chainId
  };
}; 