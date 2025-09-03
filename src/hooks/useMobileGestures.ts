import { useEffect, useRef, useState } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

interface GestureState {
  isDragging: boolean;
  startPosition: TouchPosition | null;
  currentPosition: TouchPosition | null;
  draggedElement: HTMLElement | null;
  isLongPress: boolean;
  isPinching: boolean;
  scale: number;
  rotation: number;
}

interface GestureCallbacks {
  onTouchStart?: (position: TouchPosition, element: HTMLElement) => void;
  onTouchMove?: (position: TouchPosition, deltaX: number, deltaY: number) => void;
  onTouchEnd?: (position: TouchPosition, element: HTMLElement | null) => void;
  onDragStart?: (position: TouchPosition, element: HTMLElement) => void;
  onDragMove?: (position: TouchPosition, deltaX: number, deltaY: number) => void;
  onDragEnd?: (position: TouchPosition, element: HTMLElement | null) => void;
  onLongPress?: (position: TouchPosition, element: HTMLElement) => void;
  onTap?: (position: TouchPosition, element: HTMLElement) => void;
  onDoubleTap?: (position: TouchPosition, element: HTMLElement) => void;
  onPinchStart?: (scale: number, center: TouchPosition) => void;
  onPinchMove?: (scale: number, center: TouchPosition) => void;
  onPinchEnd?: (scale: number, center: TouchPosition) => void;
}

export function useMobileGestures(
  elementRef: React.RefObject<HTMLElement>,
  callbacks: GestureCallbacks = {},
  options: {
    longPressDelay?: number;
    doubleTapDelay?: number;
    dragThreshold?: number;
    enablePinch?: boolean;
    enableRotation?: boolean;
  } = {}
) {
  const {
    longPressDelay = 500,
    doubleTapDelay = 300,
    dragThreshold = 10,
    enablePinch = false,
    enableRotation = false
  } = options;

  const [gestureState, setGestureState] = useState<GestureState>({
    isDragging: false,
    startPosition: null,
    currentPosition: null,
    draggedElement: null,
    isLongPress: false,
    isPinching: false,
    scale: 1,
    rotation: 0
  });

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const initialDistance = useRef<number>(0);
  const initialAngle = useRef<number>(0);

  // Helper functions
  const getTouchPosition = (touch: Touch): TouchPosition => ({
    x: touch.clientX,
    y: touch.clientY
  });

  const getDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getAngle = (touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  };

  const getCenter = (touch1: Touch, touch2: Touch): TouchPosition => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  });

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Touch event handlers
  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    const position = getTouchPosition(touch);
    const element = event.target as HTMLElement;
    
    touchStartTime.current = Date.now();
    
    setGestureState(prev => ({
      ...prev,
      startPosition: position,
      currentPosition: position,
      draggedElement: element,
      isLongPress: false
    }));

    // Handle multi-touch for pinch gestures
    if (enablePinch && event.touches.length === 2) {
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      initialDistance.current = getDistance(touch1, touch2);
      initialAngle.current = getAngle(touch1, touch2);
      
      setGestureState(prev => ({
        ...prev,
        isPinching: true,
        scale: 1
      }));

      const center = getCenter(touch1, touch2);
      callbacks.onPinchStart?.(1, center);
      
      return;
    }

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      setGestureState(prev => ({
        ...prev,
        isLongPress: true
      }));
      callbacks.onLongPress?.(position, element);
    }, longPressDelay);

    callbacks.onTouchStart?.(position, element);
  };

  const handleTouchMove = (event: TouchEvent) => {
    event.preventDefault(); // Prevent scrolling
    
    const touch = event.touches[0];
    const position = getTouchPosition(touch);

    setGestureState(prev => {
      if (!prev.startPosition) return prev;

      const deltaX = position.x - prev.startPosition.x;
      const deltaY = position.y - prev.startPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Handle pinch gestures
      if (enablePinch && event.touches.length === 2 && prev.isPinching) {
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        
        const currentDistance = getDistance(touch1, touch2);
        const scale = currentDistance / initialDistance.current;
        
        const center = getCenter(touch1, touch2);
        callbacks.onPinchMove?.(scale, center);
        
        return {
          ...prev,
          scale,
          currentPosition: position
        };
      }

      // Start dragging if threshold exceeded
      if (!prev.isDragging && distance > dragThreshold) {
        clearLongPressTimer();
        
        callbacks.onDragStart?.(prev.startPosition, prev.draggedElement!);
        
        return {
          ...prev,
          isDragging: true,
          currentPosition: position,
          isLongPress: false
        };
      }

      // Continue dragging
      if (prev.isDragging) {
        callbacks.onDragMove?.(position, deltaX, deltaY);
      } else {
        callbacks.onTouchMove?.(position, deltaX, deltaY);
      }

      return {
        ...prev,
        currentPosition: position
      };
    });
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    const position = getTouchPosition(touch);
    const touchDuration = Date.now() - touchStartTime.current;
    
    clearLongPressTimer();

    setGestureState(prev => {
      // Handle pinch end
      if (prev.isPinching) {
        callbacks.onPinchEnd?.(prev.scale, position);
        return {
          ...prev,
          isPinching: false,
          scale: 1
        };
      }

      // Handle drag end
      if (prev.isDragging) {
        callbacks.onDragEnd?.(position, prev.draggedElement);
        return {
          ...prev,
          isDragging: false,
          startPosition: null,
          currentPosition: null,
          draggedElement: null
        };
      }

      // Handle tap gestures
      if (!prev.isLongPress && touchDuration < 300) {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTime.current;
        
        if (timeSinceLastTap < doubleTapDelay) {
          // Double tap
          callbacks.onDoubleTap?.(position, prev.draggedElement!);
        } else {
          // Single tap
          callbacks.onTap?.(position, prev.draggedElement!);
        }
        
        lastTapTime.current = currentTime;
      }

      callbacks.onTouchEnd?.(position, prev.draggedElement);

      return {
        ...prev,
        isDragging: false,
        startPosition: null,
        currentPosition: null,
        draggedElement: null,
        isLongPress: false
      };
    });
  };

  // Set up event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Add touch event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Prevent context menu on long press
    element.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
      element.removeEventListener('contextmenu', (e) => e.preventDefault());
      
      clearLongPressTimer();
    };
  }, [elementRef, callbacks, longPressDelay, doubleTapDelay, dragThreshold]);

  return {
    gestureState,
    isTouch: 'ontouchstart' in window,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  };
}
