import React from 'react';
import HoverImage from './HoverImage';
import { Question, RoundType } from '../types/quiz';

interface QuestionImageProps {
  question: Question;
  roundType: RoundType;
  isRoundCompleted: boolean;
  showAnswers: boolean;
}

const QuestionImage: React.FC<QuestionImageProps> = ({
  question,
  roundType,
  isRoundCompleted,
  showAnswers
}) => {
  // If it's not a picture round or there are no images, don't render anything
  if (roundType !== RoundType.PICTURE || 
     (!question.imageUrl && !question.blankedImageUrl && !question.normalImageUrl && !question.coverImageUrl)) {
    return null;
  }

  // Determine which image to show based on the state
  let imageToShow = question.imageUrl || '';
  let altText = 'Question Image';

  if (roundType === RoundType.PICTURE) {
    if (!isRoundCompleted) {
      // During the question, show the blanked image if available
      imageToShow = question.blankedImageUrl || question.imageUrl || '';
      altText = 'Blanked Image';
    } else if (showAnswers) {
      // After round completion when showing answers, show the normal image
      imageToShow = question.normalImageUrl || question.imageUrl || '';
      altText = 'Normal Image';
    } else {
      // After answers, when moving to next round, show the cover image
      imageToShow = question.coverImageUrl || question.normalImageUrl || question.imageUrl || '';
      altText = 'Cover Image';
    }
  }

  if (!imageToShow) {
    return null;
  }

  return (
    <div className="mb-4 flex justify-center">
      <HoverImage 
        src={imageToShow} 
        alt={altText} 
        thumbnailHeight="max-h-64"
        maxWidth="800px"
        maxHeight="800px"
        className="object-contain rounded-lg"
      />
    </div>
  );
};

export default QuestionImage;
