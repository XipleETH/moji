import React, { useState } from 'react';
import { History } from 'lucide-react';
import { ContractGameHistoryModal } from './ContractGameHistoryModal';

export const GameHistoryButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed top-4 left-4 bg-purple-600 hover:bg-purple-700 
                   text-white rounded-full p-3 shadow-lg transition-all 
                   hover:scale-105 z-30"
        aria-label="Game History"
      >
        <History size={24} />
      </button>

      {isModalOpen && <ContractGameHistoryModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}