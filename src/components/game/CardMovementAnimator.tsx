import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { MovementAnimation } from '../../game-logic/cardMovement';
import './CardMovementAnimator.css';

interface CardMovementAnimatorProps {
  animation: MovementAnimation | null;
  onAnimationComplete: () => void;
  gridSize: number; // Size of each grid cell in pixels
  children: React.ReactNode; // The card component to animate
}

export const CardMovementAnimator: React.FC<CardMovementAnimatorProps> = ({
  animation,
  onAnimationComplete,
  gridSize,
  children
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentKeyframe, setCurrentKeyframe] = useState(0);
  const [trailPositions, setTrailPositions] = useState<Array<{x: number, y: number, opacity: number}>>([]);
  const animationRef = useRef<number | null>(null);

  // Spring physics for smooth movement
  const springConfig = { damping: 20, stiffness: 300, mass: 1 };
  const x = useSpring(0, springConfig);
  const y = useSpring(0, springConfig);

  // Transform for rotation and scale effects
  const rotate = useTransform(x, [-100, 100], [-5, 5]);
  const scale = useTransform([x, y], ([latestX, latestY]) => {
    const xVal = typeof latestX === 'number' ? latestX : 0;
    const yVal = typeof latestY === 'number' ? latestY : 0;
    const distance = Math.sqrt(xVal * xVal + yVal * yVal);
    return 1 + Math.min(distance / 1000, 0.1);
  });

  useEffect(() => {
    if (animation) {
      setIsAnimating(true);
      startAnimation(animation);
    }
  }, [animation]);

  const startAnimation = (anim: MovementAnimation) => {
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / anim.duration, 1);

      if (progress >= 1) {
        setIsAnimating(false);
        onAnimationComplete();
        return;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (!animation || !isAnimating) {
    return <>{children}</>;
  }

  const fromPixels = {
    x: animation.fromPosition.x * gridSize,
    y: animation.fromPosition.y * gridSize
  };

  const toPixels = {
    x: animation.toPosition.x * gridSize,
    y: animation.toPosition.y * gridSize
  };

  // Create motion variants based on animation type
  const getAnimationVariants = () => {
    const baseVariants = {
      initial: {
        x: fromPixels.x,
        y: fromPixels.y,
        scale: 1,
        opacity: 1
      },
      animate: {
        x: toPixels.x,
        y: toPixels.y,
        scale: 1,
        opacity: 1
      }
    };

    switch (animation.animationType) {
      case 'fly':
        return {
          ...baseVariants,
          animate: {
            ...baseVariants.animate,
            y: [
              fromPixels.y,
              fromPixels.y - 30, // Rise up
              toPixels.y - 30,   // Stay elevated
              toPixels.y         // Land
            ],
            scale: [1, 1.1, 1.1, 1],
            transition: {
              duration: animation.duration / 1000,
              ease: [0.4, 0, 0.2, 1] as any,
              times: [0, 0.3, 0.7, 1]
            }
          }
        };

      case 'burrow':
        return {
          ...baseVariants,
          animate: {
            ...baseVariants.animate,
            scale: [1, 0.1, 0.1, 1],
            opacity: [1, 0, 0, 1],
            transition: {
              duration: animation.duration / 1000,
              ease: [0.4, 0, 0.2, 1] as any,
              times: [0, 0.2, 0.8, 1]
            }
          }
        };

      case 'swim':
        return {
          ...baseVariants,
          animate: {
            ...baseVariants.animate,
            x: [
              fromPixels.x,
              fromPixels.x + (toPixels.x - fromPixels.x) * 0.3,
              fromPixels.x + (toPixels.x - fromPixels.x) * 0.7,
              toPixels.x
            ],
            y: [
              fromPixels.y,
              fromPixels.y + 10, // Slight wave motion
              fromPixels.y - 10,
              toPixels.y
            ],
            transition: {
              duration: animation.duration / 1000,
              ease: [0.4, 0, 0.2, 1] as any,
              times: [0, 0.3, 0.7, 1]
            }
          }
        };

      default: // walk
        return {
          ...baseVariants,
          animate: {
            ...baseVariants.animate,
            transition: {
              duration: animation.duration / 1000,
              ease: [0.4, 0, 0.2, 1] as any
            }
          }
        };
    }
  };

  const variants = getAnimationVariants();

  return (
    <AnimatePresence>
      <motion.div
        className={`card-movement-animator ${animation.animationType}`}
        variants={variants}
        initial="initial"
        animate="animate"
        onAnimationComplete={onAnimationComplete}
        style={{
          position: 'absolute',
          zIndex: 1000,
          pointerEvents: 'none'
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

// Hook for managing multiple movement animations
export const useMovementAnimations = () => {
  const [activeAnimations, setActiveAnimations] = useState<Map<string, MovementAnimation>>(new Map());

  const startAnimation = (animation: MovementAnimation) => {
    setActiveAnimations(prev => new Map(prev.set(animation.cardId, animation)));
  };

  const completeAnimation = (cardId: string) => {
    setActiveAnimations(prev => {
      const newMap = new Map(prev);
      newMap.delete(cardId);
      return newMap;
    });
  };

  const isAnimating = (cardId: string) => {
    return activeAnimations.has(cardId);
  };

  const getAnimation = (cardId: string) => {
    return activeAnimations.get(cardId) || null;
  };

  return {
    activeAnimations,
    startAnimation,
    completeAnimation,
    isAnimating,
    getAnimation
  };
};