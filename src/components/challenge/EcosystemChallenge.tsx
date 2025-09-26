/**
 * Ecosystem Challenge Mode
 * 10-level progressive challenge using biological data from cards.json
 * Players complete challenges to unlock Stage10Award pack
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './EcosystemChallenge.css';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
  IonProgressBar,
  IonBadge,
  IonItem,
  IonLabel,
  IonList,
  IonButtons,
  IonBackButton,
  IonAlert,
  IonToast,
  IonText
} from '@ionic/react';
import {
  trophy,
  checkmark,
  lockClosed,
  flash,
  leaf,
  water,
  eye,
  speedometer,
  scale,
  time,
  star,
  arrowBack,
  timer
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useHybridGameStore } from '../../state/hybridGameStore';
import { offlineSecurityService } from '../../services/offlineSecurityService';
import OrganismRenderer from '../OrganismRenderer';
import { Card as CardType } from '../../types';
import { motion } from 'framer-motion';

interface ChallengeLevel {
  id: number;
  name: string;
  description: string;
  icon: string;
  challengeType: 'speed_comparison' | 'mass_ranking' | 'trophic_chain' | 'habitat_matching' | 'conservation_quiz' | 'ecosystem_balance' | 'predator_prey' | 'lifecycle_order' | 'adaptation_match' | 'final_boss';
  completed: boolean;
  unlocked: boolean;
  reward: string;
  easyCompleted: boolean;
  mediumCompleted: boolean;
  hardCompleted: boolean;
}

interface DifficultyLevel {
  name: 'Easy' | 'Medium' | 'Hard';
  timeLimit: number; // 0 = no timer, seconds otherwise
  completed: boolean;
}

interface ChallengeQuestion {
  question: string;
  options: AnswerOption[];
  correctAnswer: number;
  explanation: string;
  cardIds: number[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

interface AnswerOption {
  text: string;
  card: CardType;
}

export const EcosystemChallenge: React.FC = () => {
  const history = useHistory();
  const { offlineCollection, saveOfflineCollection, allSpeciesCards } = useHybridGameStore();

  // Load challenge progress from localStorage
  const [challengeProgress, setChallengeProgress] = useState<ChallengeLevel[]>(() => {
    const saved = localStorage.getItem('ecosystemChallengeProgress');
    if (saved) {
      return JSON.parse(saved);
    }

    // Initialize default levels
    return [
      { id: 1, name: 'Speed Demons', description: 'Compare animal speeds', icon: speedometer, challengeType: 'speed_comparison', completed: false, unlocked: true, reward: '10 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 2, name: 'Size Matters', description: 'Rank animals by mass', icon: scale, challengeType: 'mass_ranking', completed: false, unlocked: false, reward: '15 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 3, name: 'Food Web Builder', description: 'Build a trophic chain', icon: leaf, challengeType: 'trophic_chain', completed: false, unlocked: false, reward: '20 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 4, name: 'Habitat Heroes', description: 'Match species to habitats', icon: water, challengeType: 'habitat_matching', completed: false, unlocked: false, reward: '25 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 5, name: 'Conservation Crisis', description: 'Learn conservation status', icon: star, challengeType: 'conservation_quiz', completed: false, unlocked: false, reward: '30 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 6, name: 'Ecosystem Balance', description: 'Balance an ecosystem', icon: leaf, challengeType: 'ecosystem_balance', completed: false, unlocked: false, reward: '35 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 7, name: 'Predator & Prey', description: 'Understand predation', icon: eye, challengeType: 'predator_prey', completed: false, unlocked: false, reward: '40 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 8, name: 'Life Cycles', description: 'Order life stages', icon: time, challengeType: 'lifecycle_order', completed: false, unlocked: false, reward: '45 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 9, name: 'Adaptation Masters', description: 'Match adaptations', icon: flash, challengeType: 'adaptation_match', completed: false, unlocked: false, reward: '50 Eco Credits', easyCompleted: false, mediumCompleted: false, hardCompleted: false },
      { id: 10, name: 'Ecosystem Architect', description: 'Final challenge', icon: trophy, challengeType: 'final_boss', completed: false, unlocked: false, reward: 'Stage10Award Pack', easyCompleted: false, mediumCompleted: false, hardCompleted: false }
    ];
  });

  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [currentDifficulty, setCurrentDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ChallengeQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);
  const [showRewardToast, setShowRewardToast] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ecosystemChallengeProgress', JSON.stringify(challengeProgress));
  }, [challengeProgress]);

  const startTimer = useCallback((seconds: number) => {
    if (seconds > 0) {
      setTimeLeft(seconds);
      setTimerActive(true);
    }
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Shared function to process answer submission
  const processAnswerSubmission = useCallback(async (answerIndex: number | null) => {
    if (!currentQuestion || !currentDifficulty) return;

    // Stop timer
    stopTimer();

    const correct = answerIndex !== null && answerIndex === currentQuestion.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct && currentLevel) {
      // Update progress for specific difficulty
      const updatedProgress = challengeProgress.map(level => {
        if (level.id === currentLevel) {
          const newLevel = { ...level };

          // Mark specific difficulty as completed
          if (currentDifficulty === 'Easy') newLevel.easyCompleted = true;
          else if (currentDifficulty === 'Medium') newLevel.mediumCompleted = true;
          else if (currentDifficulty === 'Hard') newLevel.hardCompleted = true;

          // Mark level as completed if all difficulties are done
          if (newLevel.easyCompleted && newLevel.mediumCompleted && newLevel.hardCompleted) {
            newLevel.completed = true;

            // Unlock next level
            const nextLevelIndex = challengeProgress.findIndex(l => l.id === currentLevel + 1);
            if (nextLevelIndex !== -1) {
              challengeProgress[nextLevelIndex].unlocked = true;
            }
          }

          return newLevel;
        }
        return level;
      });

      setChallengeProgress(updatedProgress);

      // Award credits based on difficulty
      const baseCredits = currentLevel * 5; // Base credits per level
      const difficultyMultiplier = currentDifficulty === 'Easy' ? 1 : currentDifficulty === 'Medium' ? 1.5 : 2;
      const credits = Math.floor(baseCredits * difficultyMultiplier);

      // Special handling for Stage 10 completion
      if (currentLevel === 10 && updatedProgress.find(l => l.id === 10)?.completed) {
        setShowCompletionAlert(true);

        // Add Stage10Award pack to user's collection
        if (offlineCollection) {
          try {
            // Create a proper offline action using the security service
            const newAction = await offlineSecurityService.createAction('pack_opened', {
              pack_type: 'stage10award'
            });

            saveOfflineCollection({
              ...offlineCollection,
              action_queue: [...offlineCollection.action_queue, newAction],
              eco_credits: offlineCollection.eco_credits + 100 // Bonus credits for completion
            });
          } catch (error) {
            console.error('Failed to create Stage10Award pack action:', error);
            // Still show success message even if action creation fails
          }
        }
      } else {
        setRewardMessage(`${currentDifficulty} completed! +${credits} Eco Credits`);
        setShowRewardToast(true);
      }

      // Award credits
      if (credits > 0 && offlineCollection) {
        saveOfflineCollection({
          ...offlineCollection,
          eco_credits: offlineCollection.eco_credits + credits
        });
      }
    }
  }, [currentQuestion, currentDifficulty, stopTimer, currentLevel, challengeProgress, offlineCollection, saveOfflineCollection]);

  // Memoized timer handlers
  const handleTimeUp = useCallback(() => {
    setTimerActive(false);

    // If an answer is selected, submit it; otherwise, submit with no selection
    const answerToSubmit = selectedAnswer !== null ? selectedAnswer : -1;
    if (answerToSubmit === -1) {
      setSelectedAnswer(-1); // Ensure UI shows no selection
    }

    processAnswerSubmission(answerToSubmit === -1 ? null : answerToSubmit);
  }, [selectedAnswer, processAnswerSubmission]);

  // Timer effect - only start/stop timer, don't depend on timeLeft
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! Auto-submit with no answer
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, handleTimeUp]);

  // Stop timer when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft === 0 && timerActive) {
      stopTimer();
    }
  }, [timeLeft, timerActive, stopTimer]);

  // Memoized available cards
  const availableCards = useMemo(() => {
    return allSpeciesCards.filter(card => card.cardId <= 56);
  }, [allSpeciesCards]);

  // Generate challenge question based on level type and difficulty
  const generateQuestion = useCallback((level: ChallengeLevel, difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    switch (level.challengeType) {
      case 'speed_comparison':
        return generateSpeedQuestion(availableCards, difficulty);
      case 'mass_ranking':
        return generateMassQuestion(availableCards, difficulty);
      case 'trophic_chain':
        return generateTrophicQuestion(availableCards, difficulty);
      case 'habitat_matching':
        return generateHabitatQuestion(availableCards, difficulty);
      case 'conservation_quiz':
        return generateConservationQuestion(availableCards, difficulty);
      case 'ecosystem_balance':
        return generateEcosystemBalanceQuestion(availableCards, difficulty);
      case 'predator_prey':
        return generatePredatorPreyQuestion(availableCards, difficulty);
      case 'lifecycle_order':
        return generateLifecycleQuestion(availableCards, difficulty);
      case 'adaptation_match':
        return generateAdaptationQuestion(availableCards, difficulty);
      case 'final_boss':
        return generateFinalBossQuestion(availableCards, difficulty);
      default:
        return generateSpeedQuestion(availableCards, difficulty);
    }
  }, [availableCards]);

  const generateSpeedQuestion = useCallback((cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    // Filter cards with meaningful speed data
    const speedCards = cards.filter(card =>
      (card.run_speed_m_per_hr || 0) > 0 || (card.swim_speed_m_per_hr || 0) > 0 || (card.fly_speed_m_per_hr || 0) > 0
    );

    // Adjust number of options based on difficulty
    const numOptions = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
    const selectedCards = speedCards.sort(() => Math.random() - 0.5).slice(0, numOptions);

    const fastestCard = selectedCards.reduce((fastest, card) => {
      const cardMaxSpeed = Math.max(card.run_speed_m_per_hr || 0, card.swim_speed_m_per_hr || 0, card.fly_speed_m_per_hr || 0);
      const fastestMaxSpeed = Math.max(fastest.run_speed_m_per_hr || 0, fastest.swim_speed_m_per_hr || 0, fastest.fly_speed_m_per_hr || 0);
      return cardMaxSpeed > fastestMaxSpeed ? card : fastest;
    });

    const options: AnswerOption[] = selectedCards.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = selectedCards.findIndex(card => card.cardId === fastestCard.cardId);
    const maxSpeed = Math.max(fastestCard.run_speed_m_per_hr || 0, fastestCard.swim_speed_m_per_hr || 0, fastestCard.fly_speed_m_per_hr || 0);

    return {
      question: 'Which of these animals is the fastest?',
      options,
      correctAnswer: correctIndex,
      explanation: `${fastestCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} is the fastest with a maximum speed of ${maxSpeed} m/hr.`,
      cardIds: selectedCards.map(card => card.cardId),
      difficulty
    };
  }, []);

  const generateMassQuestion = useCallback((cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const massCards = cards.filter(card => (card.mass_kg || 0) > 0);
    const numOptions = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
    const selectedCards = massCards.sort(() => Math.random() - 0.5).slice(0, numOptions);
    const heaviestCard = selectedCards.reduce((heaviest, card) => (card.mass_kg || 0) > (heaviest.mass_kg || 0) ? card : heaviest);

    const options: AnswerOption[] = selectedCards.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = selectedCards.findIndex(card => card.cardId === heaviestCard.cardId);

    return {
      question: 'Which of these animals is the heaviest?',
      options,
      correctAnswer: correctIndex,
      explanation: `${heaviestCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} is the heaviest at ${heaviestCard.mass_kg} kg.`,
      cardIds: selectedCards.map(card => card.cardId),
      difficulty
    };
  }, []);

  const generateTrophicQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const producerCards = cards.filter(card => card.trophicLevel === 1);
    const consumerCards = cards.filter(card => card.trophicLevel === 2);

    if (producerCards.length === 0 || consumerCards.length === 0) {
      return generateSpeedQuestion(cards, difficulty); // Fallback
    }

    const producer = producerCards[Math.floor(Math.random() * producerCards.length)];
    const consumer = consumerCards[Math.floor(Math.random() * consumerCards.length)];

    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = cards.filter(card =>
      card.trophicLevel !== 2 && card.cardId !== consumer.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [consumer, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === consumer.cardId);

    return {
      question: `What would most likely eat ${producer.nameId.replace('CARD_', '').replace(/_/g, ' ')}?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${consumer.nameId.replace('CARD_', '').replace(/_/g, ' ')} is a primary consumer (trophic level 2) that feeds on producers like ${producer.nameId.replace('CARD_', '').replace(/_/g, ' ')}.`,
      cardIds: [producer.cardId, ...allOptions.map(card => card.cardId)],
      difficulty
    };
  };

  const generateHabitatQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const aquaticCards = cards.filter(card => card.domain === 2 || card.domain === 3); // Freshwater or Marine
    const terrestrialCards = cards.filter(card => card.domain === 1); // Terrestrial

    const isAquaticQuestion = Math.random() > 0.5;
    const targetCards = isAquaticQuestion ? aquaticCards : terrestrialCards;
    const wrongCards = isAquaticQuestion ? terrestrialCards : aquaticCards;

    if (targetCards.length === 0 || wrongCards.length === 0) {
      return generateSpeedQuestion(cards, difficulty); // Fallback
    }

    const correctCard = targetCards[Math.floor(Math.random() * targetCards.length)];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = wrongCards.sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [correctCard, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === correctCard.cardId);
    const habitat = isAquaticQuestion ? 'aquatic' : 'terrestrial';

    return {
      question: `Which of these species is primarily ${habitat}?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${correctCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} lives in ${habitat} environments.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const generateConservationQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const endangeredCards = cards.filter(card => card.conservationStatus <= 5); // Vulnerable or worse
    const safeCards = cards.filter(card => card.conservationStatus >= 6); // Near Threatened or better

    if (endangeredCards.length === 0) {
      return generateSpeedQuestion(cards, difficulty); // Fallback
    }

    const endangeredCard = endangeredCards[Math.floor(Math.random() * endangeredCards.length)];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = safeCards.sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [endangeredCard, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === endangeredCard.cardId);

    return {
      question: 'Which of these species needs the most conservation attention?',
      options,
      correctAnswer: correctIndex,
      explanation: `${endangeredCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} has a conservation status that requires protection efforts.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  // Add the missing question generation functions
  const generateEcosystemBalanceQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const producers = cards.filter(card => card.trophicLevel === 1);
    const consumers = cards.filter(card => (card.trophicLevel || 0) >= 2);

    if (producers.length === 0 || consumers.length === 0) {
      return generateSpeedQuestion(cards, difficulty);
    }

    const producer = producers[Math.floor(Math.random() * producers.length)];
    const correctConsumer = consumers.find(card => card.trophicLevel === 2) || consumers[0];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = cards.filter(card =>
      card.trophicLevel !== 2 && card.cardId !== correctConsumer.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [correctConsumer, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === correctConsumer.cardId);

    return {
      question: `To balance an ecosystem with ${producer.nameId.replace('CARD_', '').replace(/_/g, ' ')}, which primary consumer would be most appropriate?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${correctConsumer.nameId.replace('CARD_', '').replace(/_/g, ' ')} is a primary consumer that helps balance the ecosystem by controlling producer populations.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const generatePredatorPreyQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const carnivores = cards.filter(card => card.trophicRole === 'Carnivore');
    const herbivores = cards.filter(card => card.trophicRole === 'Herbivore');

    if (carnivores.length === 0 || herbivores.length === 0) {
      return generateSpeedQuestion(cards, difficulty);
    }

    const predator = carnivores[Math.floor(Math.random() * carnivores.length)];
    const correctPrey = herbivores[Math.floor(Math.random() * herbivores.length)];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = cards.filter(card =>
      card.trophicRole !== 'Herbivore' && card.cardId !== correctPrey.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [correctPrey, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === correctPrey.cardId);

    return {
      question: `What would ${predator.nameId.replace('CARD_', '').replace(/_/g, ' ')} most likely hunt as prey?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${correctPrey.nameId.replace('CARD_', '').replace(/_/g, ' ')} is a herbivore that would be natural prey for the carnivore ${predator.nameId.replace('CARD_', '').replace(/_/g, ' ')}.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const generateLifecycleQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    // Focus on animals with different life stages
    const animalsWithStages = cards.filter(card =>
      card.trophicRole === 'Herbivore' || card.trophicRole === 'Carnivore'
    );

    if (animalsWithStages.length === 0) {
      return generateSpeedQuestion(cards, difficulty);
    }

    const targetAnimal = animalsWithStages[Math.floor(Math.random() * animalsWithStages.length)];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = cards.filter(card =>
      card.cardId !== targetAnimal.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [targetAnimal, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === targetAnimal.cardId);

    return {
      question: `Which animal typically has the most complex life cycle stages?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${targetAnimal.nameId.replace('CARD_', '').replace(/_/g, ' ')} has distinct life cycle stages that are important for its development.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const generateAdaptationQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    const aquaticCards = cards.filter(card => card.domain === 2 || card.domain === 3);
    const terrestrialCards = cards.filter(card => card.domain === 1);

    const useAquatic = Math.random() > 0.5;
    const targetCards = useAquatic ? aquaticCards : terrestrialCards;

    if (targetCards.length === 0) {
      return generateSpeedQuestion(cards, difficulty);
    }

    const correctCard = targetCards[Math.floor(Math.random() * targetCards.length)];
    const numWrongOptions = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
    const wrongOptions = cards.filter(card =>
      card.cardId !== correctCard.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [correctCard, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === correctCard.cardId);
    const environment = useAquatic ? 'aquatic' : 'terrestrial';

    return {
      question: `Which animal is best adapted for ${environment} environments?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${correctCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} has specific adaptations that make it well-suited for ${environment} life.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const generateFinalBossQuestion = (cards: CardType[], difficulty: 'Easy' | 'Medium' | 'Hard'): ChallengeQuestion => {
    // Combine multiple concepts for the final challenge
    const fastCards = cards.filter(card =>
      (card.run_speed_m_per_hr || 0) > 50 || (card.swim_speed_m_per_hr || 0) > 50 || (card.fly_speed_m_per_hr || 0) > 50
    );

    if (fastCards.length === 0) {
      return generateSpeedQuestion(cards, difficulty);
    }

    const correctCard = fastCards[Math.floor(Math.random() * fastCards.length)];
    const numWrongOptions = difficulty === 'Easy' ? 3 : difficulty === 'Medium' ? 4 : 5;
    const wrongOptions = cards.filter(card =>
      card.cardId !== correctCard.cardId
    ).sort(() => Math.random() - 0.5).slice(0, numWrongOptions);

    const allOptions = [correctCard, ...wrongOptions].sort(() => Math.random() - 0.5);
    const options: AnswerOption[] = allOptions.map(card => ({
      text: card.nameId.replace('CARD_', '').replace(/_/g, ' '),
      card: card
    }));

    const correctIndex = allOptions.findIndex(card => card.cardId === correctCard.cardId);

    return {
      question: `FINAL CHALLENGE: Which animal combines speed, ecological importance, and unique adaptations most effectively?`,
      options,
      correctAnswer: correctIndex,
      explanation: `${correctCard.nameId.replace('CARD_', '').replace(/_/g, ' ')} represents an excellent example of evolutionary success with its combination of speed, ecological role, and specialized adaptations.`,
      cardIds: allOptions.map(card => card.cardId),
      difficulty
    };
  };

  const startChallenge = useCallback((levelId: number, difficulty: 'Easy' | 'Medium' | 'Hard') => {
    const level = challengeProgress.find(l => l.id === levelId);
    if (!level || !level.unlocked) return;

    setCurrentLevel(levelId);
    setCurrentDifficulty(difficulty);
    const question = generateQuestion(level, difficulty);
    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setShowResult(false);

    // Start timer based on difficulty
    const timeLimit = difficulty === 'Easy' ? 0 : difficulty === 'Medium' ? 10 : 5;
    if (timeLimit > 0) {
      startTimer(timeLimit);
    }
  }, [challengeProgress, generateQuestion, startTimer]);

  const submitAnswer = useCallback(async () => {
    if (selectedAnswer === null) return;
    await processAnswerSubmission(selectedAnswer);
  }, [selectedAnswer, processAnswerSubmission]);

  const getDifficultyColor = useCallback((difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Hard': return 'danger';
      case 'Expert': return 'dark';
      default: return 'medium';
    }
  }, []);

  const completedLevels = useMemo(() => challengeProgress.filter(l => l.completed).length, [challengeProgress]);
  const progress = useMemo(() => completedLevels / challengeProgress.length, [completedLevels, challengeProgress.length]);

  const nextQuestion = useCallback(() => {
    setCurrentLevel(null);
    setCurrentDifficulty(null);
    setCurrentQuestion(null);
    setSelectedAnswer(null);
    setShowResult(false);
    stopTimer();
  }, [stopTimer]);

  // Timer display for question area
  const renderQuestionTimer = () => {
    if (!timerActive || timeLeft <= 0) return null;

    return (
      <IonBadge
        color={timeLeft <= 3 ? 'danger' : 'warning'}
        className={timeLeft <= 3 ? 'timer-badge danger' : 'timer-badge'}
        style={{
          fontSize: '16px',
          padding: '6px 10px',
          marginLeft: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          animation: timeLeft <= 3 ? 'pulse 0.5s infinite' : 'none'
        }}
      >
        <IonIcon icon={timer} style={{ marginRight: '4px', fontSize: '14px' }} />
        <span style={{ fontWeight: 'bold' }}>{timeLeft}s</span>
      </IonBadge>
    );
  };

  if (currentLevel && currentQuestion && currentDifficulty) {
    // Question View
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start">
              <IonButton onClick={nextQuestion}>
                <IonIcon icon={arrowBack} />
              </IonButton>
            </IonButtons>
            <IonTitle>Level {currentLevel} - {currentDifficulty}</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{currentQuestion.question}</IonCardTitle>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                <IonBadge color="primary">{currentDifficulty}</IonBadge>
                {currentDifficulty !== 'Easy' && renderQuestionTimer()}
              </div>
            </IonCardHeader>
            <IonCardContent>
              {/* Visual Answer Options with Organism Rendering */}
              <IonGrid>
                {currentQuestion.options.map((option, index) => (
                  <IonRow key={index}>
                    <IonCol size="12">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <IonCard
                          button
                          onClick={() => !showResult && setSelectedAnswer(index)}
                          className={`answer-option-card ${
                            showResult
                              ? index === currentQuestion.correctAnswer
                                ? 'correct'
                                : index === selectedAnswer && !isCorrect
                                ? 'incorrect'
                                : 'neutral'
                              : selectedAnswer === index
                              ? 'selected'
                              : 'unselected'
                          }`}
                          color={
                            showResult
                              ? index === currentQuestion.correctAnswer
                                ? 'success'
                                : index === selectedAnswer && !isCorrect
                                ? 'danger'
                                : undefined
                              : selectedAnswer === index
                              ? 'primary'
                              : undefined
                          }
                        >
                          <IonCardContent style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              {/* Organism Visual */}
                              <div style={{ minWidth: '80px', height: '80px' }}>
                                <OrganismRenderer
                                  card={option.card}
                                  size={80}
                                  showControls={false}
                                  className="answer-organism"
                                />
                              </div>

                              {/* Answer Text */}
                              <div style={{ flex: 1 }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>
                                  {option.text}
                                </h3>
                                <IonText color="medium" style={{ fontSize: '14px' }}>
                                  {option.card.scientificNameId || 'Scientific name'}
                                </IonText>
                              </div>

                              {/* Result Icon */}
                              {showResult && index === currentQuestion.correctAnswer && (
                                <IonIcon icon={checkmark} color="success" size="large" />
                              )}
                            </div>
                          </IonCardContent>
                        </IonCard>
                      </motion.div>
                    </IonCol>
                  </IonRow>
                ))}
              </IonGrid>

              {showResult && (
                <div style={{ marginTop: '16px' }}>
                  <IonCard color={isCorrect ? 'success' : 'warning'}>
                    <IonCardContent>
                      <h4 style={{ margin: '0 0 8px 0' }}>
                        {isCorrect ? '✅ Correct!' : '❌ Incorrect'}
                      </h4>
                      <p style={{ margin: 0 }}><strong>Explanation:</strong> {currentQuestion.explanation}</p>
                    </IonCardContent>
                  </IonCard>
                  <IonButton
                    expand="block"
                    onClick={nextQuestion}
                    color={isCorrect ? 'success' : 'primary'}
                    style={{ marginTop: '16px' }}
                  >
                    {isCorrect ? 'Continue' : 'Try Again'}
                  </IonButton>
                </div>
              )}

              {!showResult && selectedAnswer !== null && (
                <IonButton
                  expand="block"
                  onClick={submitAnswer}
                  style={{ marginTop: '16px' }}
                  disabled={timerActive && timeLeft === 0}
                >
                  Submit Answer
                </IonButton>
              )}
            </IonCardContent>
          </IonCard>
        </IonContent>
      </IonPage>
    );
  }

  // Level Selection View
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Ecosystem Challenge</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {/* Progress Overview */}
        <IonCard className="challenge-progress-card">
          <IonCardHeader>
            <IonCardTitle>
              Progress: {completedLevels}/10 Levels
              <IonBadge color="primary" style={{ marginLeft: '8px' }}>
                {Math.round(progress * 100)}%
              </IonBadge>
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonProgressBar value={progress} className="challenge-progress-bar" />
            <p style={{ marginTop: '8px', fontSize: '14px', color: 'var(--ion-color-medium)' }}>
              Complete all 10 levels to earn the exclusive Stage10Award Pack!
            </p>
            {completedLevels === 10 && (
              <div className="challenge-final-reward">
                <h3>🎉 Challenge Complete!</h3>
                <p>You've mastered all ecosystem challenges!</p>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Level Grid with Difficulty Options */}
        <IonGrid>
          {challengeProgress.map((level) => (
            <IonRow key={level.id}>
              <IonCol size="12">
                <IonCard className={`challenge-level-card ${level.completed ? 'completed' : ''} ${!level.unlocked ? 'locked' : ''}`}>
                  <IonCardHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <IonIcon
                        icon={level.completed ? checkmark : level.unlocked ? level.icon : lockClosed}
                        className={`challenge-level-icon ${level.completed ? 'completed' : level.unlocked ? 'unlocked' : 'locked'}`}
                      />
                      <div style={{ flex: 1 }}>
                        <IonCardTitle style={{ fontSize: '18px' }}>
                          Level {level.id}: {level.name}
                        </IonCardTitle>
                        <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                          {level.description}
                        </div>
                      </div>
                    </div>
                  </IonCardHeader>

                  {/* Difficulty Selection */}
                  {level.unlocked && (
                    <IonCardContent>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Easy Difficulty */}
                        <IonButton
                          fill={level.easyCompleted ? 'solid' : 'outline'}
                          color={level.easyCompleted ? 'success' : 'primary'}
                          size="small"
                          onClick={() => startChallenge(level.id, 'Easy')}
                          style={{ flex: '1', minWidth: '100px' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div>Easy</div>
                            <div style={{ fontSize: '10px' }}>No Timer</div>
                            {level.easyCompleted && <IonIcon icon={checkmark} style={{ marginLeft: '4px' }} />}
                          </div>
                        </IonButton>

                        {/* Medium Difficulty */}
                        <IonButton
                          fill={level.mediumCompleted ? 'solid' : 'outline'}
                          color={level.mediumCompleted ? 'success' : 'warning'}
                          size="small"
                          onClick={() => startChallenge(level.id, 'Medium')}
                          style={{ flex: '1', minWidth: '100px' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div>Medium</div>
                            <div style={{ fontSize: '10px' }}>10s Timer</div>
                            {level.mediumCompleted && <IonIcon icon={checkmark} style={{ marginLeft: '4px' }} />}
                          </div>
                        </IonButton>

                        {/* Hard Difficulty */}
                        <IonButton
                          fill={level.hardCompleted ? 'solid' : 'outline'}
                          color={level.hardCompleted ? 'success' : 'danger'}
                          size="small"
                          onClick={() => startChallenge(level.id, 'Hard')}
                          style={{ flex: '1', minWidth: '100px' }}
                        >
                          <div style={{ textAlign: 'center' }}>
                            <div>Hard</div>
                            <div style={{ fontSize: '10px' }}>5s Timer</div>
                            {level.hardCompleted && <IonIcon icon={checkmark} style={{ marginLeft: '4px' }} />}
                          </div>
                        </IonButton>
                      </div>

                      {/* Progress Indicator */}
                      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--ion-color-medium)' }}>
                        Progress: {[level.easyCompleted, level.mediumCompleted, level.hardCompleted].filter(Boolean).length}/3 difficulties completed
                        {level.completed && (
                          <IonBadge color="success" style={{ marginLeft: '8px' }}>
                            Level Complete!
                          </IonBadge>
                        )}
                      </div>
                    </IonCardContent>
                  )}

                  {!level.unlocked && (
                    <IonCardContent>
                      <div style={{ textAlign: 'center', color: 'var(--ion-color-medium)' }}>
                        <IonIcon icon={lockClosed} size="large" />
                        <div style={{ marginTop: '8px' }}>Complete previous level to unlock</div>
                      </div>
                    </IonCardContent>
                  )}
                </IonCard>
              </IonCol>
            </IonRow>
          ))}
        </IonGrid>

        {/* Completion Alert */}
        <IonAlert
          isOpen={showCompletionAlert}
          onDidDismiss={() => setShowCompletionAlert(false)}
          header="🎉 Challenge Complete!"
          message="Congratulations! You've mastered all ecosystem challenges and earned the Stage10Award Pack!"
          buttons={['Awesome!']}
        />

        {/* Reward Toast */}
        <IonToast
          isOpen={showRewardToast}
          onDidDismiss={() => setShowRewardToast(false)}
          message={rewardMessage}
          duration={3000}
          position="top"
          color="success"
        />
      </IonContent>
    </IonPage>
  );
};

export default EcosystemChallenge;
