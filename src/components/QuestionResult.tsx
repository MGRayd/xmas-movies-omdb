import React from 'react';
import { Question, RoundType } from '../types/quiz';
import HoverImage from './HoverImage';
import { isTextAnswerCorrect } from '../utils/stringMatching';

interface QuestionResultProps {
  question: Question;
  userAnswer: string | number | null;
  roundType: RoundType;
}

const QuestionResult: React.FC<QuestionResultProps> = ({
  question,
  userAnswer,
  roundType
}) => {
  // Check if the answer is correct (exact match)
  const isExactMatch = question.isTextInput 
    ? typeof userAnswer === 'string' && userAnswer.toLowerCase().trim() === (question.textAnswer || '').toLowerCase().trim()
    : typeof userAnswer === 'number' && userAnswer === question.correctAnswer;
  
  // Check if the answer is correct via alternative answers or partial matching
  const isAlternativeMatch = question.isTextInput 
    ? typeof userAnswer === 'string' && !isExactMatch && isTextAnswerCorrect(userAnswer, question.textAnswer, {
        acceptableAlternatives: question.alternativeAnswers || []
      })
    : false;
    
  // The answer is considered correct if it's either an exact match or an alternative match
  const isCorrect = isExactMatch || isAlternativeMatch;

  return (
    <div className="bg-xmas-card rounded-lg shadow-lg p-4 mb-4">
      <h3 className="text-xl font-christmas mb-2">{question.text}</h3>
      
      {/* Display images based on round type */}
      {roundType === RoundType.PICTURE ? (
        <div className="flex flex-col items-center mb-6">
          {/* Cover Image (if available) - shown larger */}
          {question.coverImageUrl && (
            <div className="flex flex-col items-center mb-4">
              <p className="text-xl font-christmas mb-2">Movie Cover</p>
              <HoverImage 
                src={question.coverImageUrl} 
                alt="Cover Image"
                thumbnailHeight="max-h-72"
                maxWidth="600px"
                maxHeight="600px"
                className="object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
          
          {/* Normal Image */}
          {question.normalImageUrl && (
            <div className="flex flex-col items-center mt-4">
              <p className="text-sm mb-1">Scene from the movie</p>
              <HoverImage 
                src={question.normalImageUrl} 
                alt="Answer Image"
                thumbnailHeight="max-h-48"
                maxWidth="500px"
                maxHeight="500px"
                className="object-contain rounded-lg"
              />
            </div>
          )}
        </div>
      ) : (
        /* Display standard image for all other round types */
        question.imageUrl && (
          <div className="flex flex-col items-center mb-6">
            <HoverImage 
              src={question.imageUrl} 
              alt="Question Image"
              thumbnailHeight="max-h-48"
              maxWidth="500px"
              maxHeight="500px"
              className="object-contain rounded-lg"
            />
          </div>
        )
      )}
      
      {/* User's answer and correct answer */}
      <div className="mt-3">
        <div className="flex flex-col sm:flex-row justify-between">
          <div>
            <p className="text-sm">Your answer:</p>
            <p className={`font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {question.isTextInput 
                ? (userAnswer as string || 'No answer provided') 
                : (typeof userAnswer === 'number' 
                  ? question.options[userAnswer] 
                  : 'No answer provided')}
            </p>
            {isAlternativeMatch && (
              <p className="text-xs text-amber-500 italic mt-1">
                Alternative answer accepted
              </p>
            )}
          </div>
          
          {(!isCorrect || isAlternativeMatch) && (
            <div className="mt-2 sm:mt-0">
              <p className="text-sm">{isAlternativeMatch ? 'Primary answer:' : 'Correct answer:'}</p>
              <p className="font-bold text-green-500">
                {question.isTextInput 
                  ? question.textAnswer 
                  : question.options[question.correctAnswer]}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Status indicator */}
      <div className="mt-3 flex justify-end">
        {isCorrect ? (
          <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            Correct
          </span>
        ) : (
          <span className="px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
            Incorrect
          </span>
        )}
      </div>
    </div>
  );
};

export default QuestionResult;
