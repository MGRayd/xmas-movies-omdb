import React, { useState, useRef, useEffect } from 'react';

interface HoverImageProps {
  src: string;
  alt: string;
  className?: string;
  thumbnailHeight?: string;
  zoomFactor?: number;
  maxWidth?: string;
  maxHeight?: string;
}

const HoverImage: React.FC<HoverImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  thumbnailHeight = 'h-12',
  zoomFactor = 2,
  maxWidth = '600px',
  maxHeight = '600px'
}) => {
  const [showFullSize, setShowFullSize] = useState(false);
  const [position, setPosition] = useState<{ top: boolean, left: boolean | null }>({ top: true, left: null });
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Calculate position to ensure popup stays within viewport
  useEffect(() => {
    if (showFullSize && containerRef.current && popupRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const popupRect = popupRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check if popup would go off the right edge
      const wouldOverflowRight = containerRect.left + (popupRect.width / 2) > viewportWidth;
      const wouldOverflowLeft = containerRect.left - (popupRect.width / 2) < 0;
      
      // Check if popup would go off the top edge
      const wouldOverflowTop = containerRect.top - popupRect.height < 0;
      
      setPosition({
        top: !wouldOverflowTop, // If it would overflow top, place it below
        left: wouldOverflowRight ? true : wouldOverflowLeft ? false : null // Center if possible, otherwise adjust
      });
    }
  }, [showFullSize]);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <img 
        src={src} 
        alt={alt} 
        className={`${thumbnailHeight} w-auto object-cover rounded cursor-pointer ${className}`}
        onMouseEnter={() => setShowFullSize(true)}
        onMouseLeave={() => setShowFullSize(false)}
      />
      
      {showFullSize && (
        <div 
          ref={popupRef}
          className={`absolute z-50 shadow-xl rounded-lg overflow-hidden ${
            position.top ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            position.left === true ? 'right-0' : 
            position.left === false ? 'left-0' : 
            'left-1/2 transform -translate-x-1/2'
          }`}
        >
          <img 
            src={src} 
            alt={alt} 
            className="object-contain bg-black bg-opacity-80 p-2"
            style={{ 
              maxHeight: maxHeight,
              maxWidth: maxWidth,
              minHeight: '300px',
              minWidth: '300px',
              width: 'auto',
              height: 'auto'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default HoverImage;
