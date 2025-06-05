import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { formatEther, formatUnits } from 'viem';
import { getContractAddresses } from '../contracts/addresses';
import { PrizePoolInfo } from '../contracts/types';

// Import ABI
import LottoMojiPrizePoolABI from '../contracts/abis/LottoMojiPrizePool.json';

export const usePrizePools = () => {
  const { chainId } = useAccount();
  const contracts = chainId ? getContractAddresses(chainId) : null;

  // Get ETH prize pools
  const { data: ethPoolsData, refetch: refetchETHPools } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getETHPools',
    query: {
      enabled: !!contracts?.LottoMojiPrizePool
    }
  });

  // Get USDC prize pools
  const { data: usdcPoolsData, refetch: refetchUSDCPools } = useReadContract({
    address: contracts?.LottoMojiPrizePool as `0x${string}`,
    abi: LottoMojiPrizePoolABI.abi,
    functionName: 'getUSDCPools',
    query: {
      enabled: !!contracts?.LottoMojiPrizePool
    }
  });

  // Format prize pool data
  const formatPrizePools = (): PrizePoolInfo | null => {
    if (!ethPoolsData || !usdcPoolsData) return null;

    const [ethFirst, ethSecond, ethThird, ethFirstReserve, ethSecondReserve, ethThirdReserve] = ethPoolsData as bigint[];
    const [usdcFirst, usdcSecond, usdcThird, usdcFirstReserve, usdcSecondReserve, usdcThirdReserve] = usdcPoolsData as bigint[];

    return {
      ethPools: {
        firstPrize: ethFirst,
        secondPrize: ethSecond,
        thirdPrize: ethThird,
        firstReserve: ethFirstReserve,
        secondReserve: ethSecondReserve,
        thirdReserve: ethThirdReserve
      },
      usdcPools: {
        firstPrize: usdcFirst,
        secondPrize: usdcSecond,
        thirdPrize: usdcThird,
        firstReserve: usdcFirstReserve,
        secondReserve: usdcSecondReserve,
        thirdReserve: usdcThirdReserve
      }
    };
  };

  // Get formatted values for display
  const getFormattedPools = () => {
    const pools = formatPrizePools();
    if (!pools) return null;

    return {
      eth: {
        firstPrize: formatEther(pools.ethPools.firstPrize),
        secondPrize: formatEther(pools.ethPools.secondPrize),
        thirdPrize: formatEther(pools.ethPools.thirdPrize),
        total: formatEther(
          pools.ethPools.firstPrize + 
          pools.ethPools.secondPrize + 
          pools.ethPools.thirdPrize
        )
      },
      usdc: {
        firstPrize: formatUnits(pools.usdcPools.firstPrize, 6),
        secondPrize: formatUnits(pools.usdcPools.secondPrize, 6),
        thirdPrize: formatUnits(pools.usdcPools.thirdPrize, 6),
        total: formatUnits(
          pools.usdcPools.firstPrize + 
          pools.usdcPools.secondPrize + 
          pools.usdcPools.thirdPrize, 
          6
        )
      }
    };
  };

  return {
    prizePools: formatPrizePools(),
    formattedPools: getFormattedPools(),
    refetch: () => {
      refetchETHPools();
      refetchUSDCPools();
    },
    isLoading: !ethPoolsData || !usdcPoolsData
  };
}; 