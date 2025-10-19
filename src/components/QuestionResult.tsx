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
  const isCorrect = question.isTextInput 
    ? typeof userAnswer === 'string' && isTextAnswerCorrect(userAnswer, question.textAnswer, {
        acceptableAlternatives: question.alternativeAnswers || []
      })
    : typeof userAnswer === 'number' && userAnswer === question.correctAnswer;

  return (
    <div className="bg-xmas-card rounded-lg shadow-lg p-4 mb-4">
      <h3 className="text-xl font-christmas mb-2">{question.text}</h3>
      
      {/* Display cover image as main image and normal image for picture rounds */}
      {roundType === RoundType.PICTURE && (
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
          </div>
          
          {!isCorrect && (
            <div className="mt-2 sm:mt-0">
              <p className="text-sm">Correct answer:</p>
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
        <span className={`px-3 py-1 rounded-full text-sm ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {isCorrect ? 'Correct' : 'Incorrect'}
        </span>
      </div>
    </div>
  );
};

export default QuestionResult;
