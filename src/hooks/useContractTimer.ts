import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractABI from '../utils/contract-abi-v3.json';
import { CONTRACT_ADDRESS } from '../utils/contractAddresses';

export function useContractTimer() {
  const [nextDrawTime, setNextDrawTime] = useState<Date | null>(null);
  const [drawHourUTC, setDrawHourUTC] = useState<number>(2); // Default to 2 UTC
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimerData = async () => {
      try {
        const provider = new ethers.JsonRpcProvider("https://api.avax-test.network/ext/bc/C/rpc");
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, provider);

        const [nextDrawTs, drawHour] = await Promise.all([
          contract.nextDrawTs(),
          contract.dailyDrawHourUTC()
        ]);

        setNextDrawTime(new Date(Number(nextDrawTs) * 1000));
        setDrawHourUTC(Number(drawHour));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching timer data:", err);
        setError("Failed to fetch timer data");
        setLoading(false);
      }
    };

    fetchTimerData();
    const interval = setInterval(fetchTimerData, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return { nextDrawTime, drawHourUTC, loading, error };
} 