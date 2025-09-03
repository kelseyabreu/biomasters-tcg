import React, { useState, useEffect } from 'react';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonProgressBar,
  IonAlert
} from '@ionic/react';
import { 
  checkmark, 
  arrowForward, 
  arrowBack, 
  school, 
  play, 
  trophy,
  leaf,
  water,
  flash
} from 'ionicons/icons';
import { motion, AnimatePresence } from 'framer-motion';
import './TutorialSystem.css';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  instruction: string;
  targetElement?: string;
  highlightArea?: { x: number; y: number; width: number; height: number };
  action?: 'click' | 'drag' | 'observe' | 'input';
  expectedResult?: string;
  hints?: string[];
  completed: boolean;
}

interface TutorialLesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  steps: TutorialStep[];
  unlocked: boolean;
  completed: boolean;
  score?: number;
}

interface TutorialSystemProps {
  isOpen: boolean;
  onClose: () => void;
  onStartLesson: (lessonId: string) => void;
  currentLesson?: TutorialLesson;
  currentStepIndex?: number;
  onStepComplete: (stepId: string) => void;
  onLessonComplete: (lessonId: string, score: number) => void;
}

export const TutorialSystem: React.FC<TutorialSystemProps> = ({
  isOpen,
  onClose,
  onStartLesson,
  currentLesson,
  currentStepIndex = 0,
  onStepComplete,
  onLessonComplete
}) => {
  const [tutorialLessons, setTutorialLessons] = useState<TutorialLesson[]>([]);
  const [showStepModal, setShowStepModal] = useState(false);
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [showCompletionAlert, setShowCompletionAlert] = useState(false);

  // Initialize tutorial lessons
  useEffect(() => {
    const lessons: TutorialLesson[] = [
      {
        id: 'phylo_basics',
        title: 'Phylo Basics',
        description: 'Learn the fundamentals of ecosystem building',
        icon: leaf,
        difficulty: 'beginner',
        estimatedTime: 10,
        unlocked: true,
        completed: false,
        steps: [
          {
            id: 'welcome',
            title: 'Welcome to Phylo!',
            description: 'Phylo is a game about building realistic ecosystems using real species cards.',
            instruction: 'Click "Next" to continue',
            action: 'click',
            completed: false
          },
          {
            id: 'card_basics',
            title: 'Understanding Species Cards',
            description: 'Each card represents a real species with specific habitat and diet requirements.',
            instruction: 'Look at the card information: Foodchain Level, Scale, and Point Value',
            action: 'observe',
            hints: [
              'Foodchain Level shows where the species fits in the food web',
              'Scale indicates the relative size of the species',
              'Point Value shows how many points you earn for placing this card'
            ],
            completed: false
          },
          {
            id: 'placement_rules',
            title: 'Card Placement Rules',
            description: 'Cards must be placed adjacent to compatible species.',
            instruction: 'Try placing a card next to another card with matching terrain and climate',
            action: 'drag',
            expectedResult: 'Card successfully placed with valid connections',
            hints: [
              'Cards must share at least one terrain type',
              'Cards must share at least one climate type',
              'Food chain relationships must make biological sense'
            ],
            completed: false
          },
          {
            id: 'food_chains',
            title: 'Building Food Chains',
            description: 'Create realistic predator-prey relationships.',
            instruction: 'Place a herbivore next to a producer, then a carnivore next to the herbivore',
            action: 'drag',
            expectedResult: 'Complete food chain: Producer → Herbivore → Carnivore',
            hints: [
              'Producers (plants) are Foodchain Level 1',
              'Herbivores eat producers (Level 2)',
              'Carnivores eat herbivores (Level 3+)'
            ],
            completed: false
          },
          {
            id: 'scoring',
            title: 'Understanding Scoring',
            description: 'Learn how points are calculated in Phylo.',
            instruction: 'Observe your score increase as you build your ecosystem',
            action: 'observe',
            hints: [
              'Longer food chains give exponential bonus points',
              'Biodiversity bonuses for different terrains and climates',
              'Endangered species provide conservation bonuses'
            ],
            completed: false
          }
        ]
      },
      {
        id: 'advanced_strategy',
        title: 'Advanced Strategy',
        description: 'Master ecosystem optimization and scientific challenges',
        icon: trophy,
        difficulty: 'intermediate',
        estimatedTime: 15,
        unlocked: false,
        completed: false,
        steps: [
          {
            id: 'ecosystem_stability',
            title: 'Ecosystem Stability',
            description: 'Learn how to build stable, resilient ecosystems.',
            instruction: 'Build an ecosystem with multiple food web pathways',
            action: 'drag',
            completed: false
          },
          {
            id: 'scientific_challenges',
            title: 'Scientific Challenges',
            description: 'Challenge opponents on biological accuracy.',
            instruction: 'Challenge an incorrect species placement',
            action: 'click',
            completed: false
          },
          {
            id: 'event_responses',
            title: 'Environmental Events',
            description: 'Learn to respond to environmental challenges.',
            instruction: 'Successfully respond to a climate change event',
            action: 'click',
            completed: false
          }
        ]
      },
      {
        id: 'conservation_master',
        title: 'Conservation Master',
        description: 'Focus on endangered species and conservation strategies',
        icon: water,
        difficulty: 'advanced',
        estimatedTime: 20,
        unlocked: false,
        completed: false,
        steps: [
          {
            id: 'endangered_species',
            title: 'Endangered Species Strategy',
            description: 'Learn to successfully place and protect endangered species.',
            instruction: 'Build a stable ecosystem featuring 3+ endangered species',
            action: 'drag',
            completed: false
          },
          {
            id: 'conservation_victory',
            title: 'Conservation Victory',
            description: 'Achieve victory through conservation success.',
            instruction: 'Maintain 5+ endangered species for 3 consecutive turns',
            action: 'observe',
            completed: false
          }
        ]
      }
    ];

    setTutorialLessons(lessons);
  }, []);

  const handleLessonSelect = (lesson: TutorialLesson) => {
    if (!lesson.unlocked) {
      return;
    }
    onStartLesson(lesson.id);
    setShowStepModal(true);
  };

  const handleStepComplete = () => {
    if (!currentLesson || currentStepIndex >= currentLesson.steps.length) {
      return;
    }

    const currentStep = currentLesson.steps[currentStepIndex];
    onStepComplete(currentStep.id);

    // Check if lesson is complete
    if (currentStepIndex === currentLesson.steps.length - 1) {
      const score = calculateLessonScore(currentLesson);
      onLessonComplete(currentLesson.id, score);
      setShowCompletionAlert(true);
      setShowStepModal(false);
    }
  };

  const calculateLessonScore = (lesson: TutorialLesson): number => {
    const completedSteps = lesson.steps.filter(step => step.completed).length;
    const totalSteps = lesson.steps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'medium';
    }
  };

  const currentStep = currentLesson?.steps[currentStepIndex];
  const progress = currentLesson ? (currentStepIndex / currentLesson.steps.length) * 100 : 0;

  return (
    <>
      {/* Tutorial Lesson Selection Modal */}
      <IonModal isOpen={isOpen && !showStepModal} onDidDismiss={onClose}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Phylo Tutorial</IonTitle>
            <IonButton fill="clear" slot="end" onClick={onClose}>
              Close
            </IonButton>
          </IonToolbar>
        </IonHeader>
        
        <IonContent className="tutorial-content">
          <div className="tutorial-header">
            <IonIcon icon={school} size="large" color="primary" />
            <h2>Learn to Master Phylo</h2>
            <p>Interactive lessons to help you become an ecosystem building expert!</p>
          </div>

          <IonList>
            {tutorialLessons.map((lesson) => (
              <IonItem
                key={lesson.id}
                button={lesson.unlocked}
                onClick={() => handleLessonSelect(lesson)}
                disabled={!lesson.unlocked}
              >
                <IonIcon 
                  icon={lesson.icon} 
                  slot="start" 
                  color={lesson.unlocked ? 'primary' : 'medium'}
                />
                <IonLabel>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.description}</p>
                  <div className="lesson-meta">
                    <IonChip color={getDifficultyColor(lesson.difficulty)}>
                      <IonLabel>{lesson.difficulty.toUpperCase()}</IonLabel>
                    </IonChip>
                    <IonChip color="medium">
                      <IonLabel>{lesson.estimatedTime} min</IonLabel>
                    </IonChip>
                    {lesson.completed && (
                      <IonChip color="success">
                        <IonIcon icon={checkmark} />
                        <IonLabel>Completed</IonLabel>
                      </IonChip>
                    )}
                  </div>
                </IonLabel>
                {lesson.unlocked && (
                  <IonButton fill="clear" slot="end">
                    <IonIcon icon={play} />
                  </IonButton>
                )}
              </IonItem>
            ))}
          </IonList>
        </IonContent>
      </IonModal>

      {/* Tutorial Step Modal */}
      <IonModal isOpen={showStepModal} onDidDismiss={() => setShowStepModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>{currentLesson?.title}</IonTitle>
            <IonButton fill="clear" slot="end" onClick={() => setShowStepModal(false)}>
              Close
            </IonButton>
          </IonToolbar>
        </IonHeader>
        
        <IonContent className="tutorial-step-content">
          {currentLesson && (
            <>
              <div className="step-progress">
                <IonProgressBar value={progress / 100} color="primary" />
                <p>Step {currentStepIndex + 1} of {currentLesson.steps.length}</p>
              </div>

              {currentStep && (
                <motion.div
                  key={currentStep.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="tutorial-step"
                >
                  <IonCard>
                    <IonCardContent>
                      <h2>{currentStep.title}</h2>
                      <p>{currentStep.description}</p>
                      
                      <div className="instruction-box">
                        <h4>Your Task:</h4>
                        <p>{currentStep.instruction}</p>
                      </div>

                      {currentStep.hints && currentStep.hints.length > 0 && (
                        <div className="hints-section">
                          <h4>Hints:</h4>
                          <AnimatePresence>
                            <motion.div
                              key={currentHintIndex}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <p className="hint">💡 {currentStep.hints[currentHintIndex]}</p>
                            </motion.div>
                          </AnimatePresence>
                          
                          {currentStep.hints.length > 1 && (
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => setCurrentHintIndex((prev) => (prev + 1) % currentStep.hints!.length)}
                            >
                              Next Hint
                            </IonButton>
                          )}
                        </div>
                      )}

                      <div className="step-actions">
                        {currentStepIndex > 0 && (
                          <IonButton
                            fill="outline"
                            onClick={() => {/* Previous step logic */}}
                          >
                            <IonIcon icon={arrowBack} slot="start" />
                            Previous
                          </IonButton>
                        )}
                        
                        <IonButton
                          color="primary"
                          onClick={handleStepComplete}
                        >
                          {currentStepIndex === currentLesson.steps.length - 1 ? 'Complete Lesson' : 'Next Step'}
                          <IonIcon icon={arrowForward} slot="end" />
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </motion.div>
              )}
            </>
          )}
        </IonContent>
      </IonModal>

      {/* Lesson Completion Alert */}
      <IonAlert
        isOpen={showCompletionAlert}
        onDidDismiss={() => setShowCompletionAlert(false)}
        header="Lesson Complete!"
        message={`Congratulations! You've completed "${currentLesson?.title}". You earned ${currentLesson ? calculateLessonScore(currentLesson) : 0} points!`}
        buttons={[
          {
            text: 'Continue Learning',
            handler: () => {
              setShowCompletionAlert(false);
              setShowStepModal(false);
            }
          }
        ]}
      />
    </>
  );
};
