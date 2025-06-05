export interface Round {
  id: number;
  startTime: number;
  endTime: number;
  winningNumbers: number[];
  isActive: boolean;
  numbersDrawn: boolean;
  vrfRequestId: number;
  prizesDistributed: boolean;
}

export interface Ticket {
  id: number;
  emojis: number[];
  roundId: number;
  player: string;
  isUsed: boolean;
  isFreeTicket: boolean;
  mintTimestamp: number;
  paymentHash: string;
}

export interface GameState {
  currentRound: Round | null;
  nextDrawTime: Date | null;
  timeRemaining: number;
  tickets: Ticket[];
  isLoading: boolean;
}

export interface PrizePoolInfo {
  ethPools: {
    firstPrize: bigint;
    secondPrize: bigint;
    thirdPrize: bigint;
    firstReserve: bigint;
    secondReserve: bigint;
    thirdReserve: bigint;
  };
  usdcPools: {
    firstPrize: bigint;
    secondPrize: bigint;
    thirdPrize: bigint;
    firstReserve: bigint;
    secondReserve: bigint;
    thirdReserve: bigint;
  };
}

export type PaymentMethod = 'ETH' | 'USDC'; 