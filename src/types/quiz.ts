// Quiz Types

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  imageUrl?: string;
  blankedImageUrl?: string;
  normalImageUrl?: string;
  coverImageUrl?: string;
  textAnswer?: string; // For text input answers in picture rounds
  alternativeAnswers?: string[]; // Alternative acceptable answers for text input questions
  isTextInput?: boolean; // Flag to indicate if this question requires text input
  roundId: string;
}

export interface Round {
  id: string;
  title: string;
  description: string;
  order: number;
  type: RoundType;
}

export enum RoundType {
  GENERAL = 'general',
  PICTURE = 'picture',
  MUSIC = 'music',
  TRIVIA = 'trivia',
  CHRISTMAS = 'christmas'
}

export interface QuizResult {
  id: string;
  playerName: string;
  score: number;
  timestamp: Date;
  roundScores?: { [roundId: string]: number };
}
