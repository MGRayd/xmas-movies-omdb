import React from 'react';
import { Question, Round } from '../types/quiz';
import QuestionResult from './QuestionResult';

interface RoundResultsProps {
  round: Round;
  questions: Question[];
  userAnswers: { [questionId: string]: string | number | null };
  roundScore: number;
  onContinue: () => void;
  isLastRound?: boolean;
}

const RoundResults: React.FC<RoundResultsProps> = ({
  round,
  questions,
  userAnswers,
  roundScore,
  onContinue,
  isLastRound = false
}) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="bg-xmas-card rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h2 className="text-2xl font-christmas text-xmas-gold">
            {round.title} - Round Results
          </h2>
          <div className="mt-3 md:mt-0">
            <span className="text-sm">Round Score</span>
            <div className="text-3xl font-bold text-xmas-gold">{roundScore} / {questions.length}</div>
          </div>
        </div>

        <div className="space-y-6">
          {questions.map((question) => (
            <QuestionResult
              key={question.id}
              question={question}
              userAnswer={userAnswers[question.id]}
              roundType={round.type}
            />
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            className="btn btn-primary"
            onClick={onContinue}
          >
            {isLastRound ? 'Finish Quiz' : 'Continue to Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundResults;
