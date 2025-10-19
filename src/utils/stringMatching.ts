/**
 * Utility functions for improved string matching in quiz answers
 */

/**
 * Checks if a user's text answer matches the correct answer using flexible matching
 * This handles cases like:
 * - Partial matches (e.g., "Christmas Vacation" matches "National Lampoon's Christmas Vacation")
 * - Case insensitivity
 * - Ignores punctuation differences
 * - Ignores extra spaces
 * 
 * @param userAnswer The user's submitted answer
 * @param correctAnswer The correct answer to check against
 * @param options Optional configuration options
 * @returns boolean indicating if the answer should be considered correct
 */
export const isTextAnswerCorrect = (
  userAnswer: string,
  correctAnswer: string | undefined,
  options: {
    allowPartialMatch?: boolean;
    minMatchPercentage?: number;
    acceptableAlternatives?: string[];
  } = {}
): boolean => {
  if (!correctAnswer || !userAnswer) return false;
  
  // Default options
  const {
    allowPartialMatch = true,
    minMatchPercentage = 70,
    acceptableAlternatives = []
  } = options;

  // Normalize strings: lowercase, remove extra spaces, remove punctuation
  const normalize = (str: string): string => 
    str.toLowerCase()
       .replace(/[^\w\s]/g, '') // Remove punctuation
       .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
       .trim();                 // Remove leading/trailing spaces
  
  const normalizedUserAnswer = normalize(userAnswer);
  const normalizedCorrectAnswer = normalize(correctAnswer);
  
  // Direct match after normalization
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return true;
  }
  
  // Check against acceptable alternatives
  if (acceptableAlternatives.length > 0) {
    const normalizedAlternatives = acceptableAlternatives.map(alt => normalize(alt));
    if (normalizedAlternatives.includes(normalizedUserAnswer)) {
      return true;
    }
  }
  
  // Check if correct answer contains user answer or vice versa
  if (allowPartialMatch) {
    // If user answer is a significant part of the correct answer
    if (normalizedCorrectAnswer.includes(normalizedUserAnswer) && 
        normalizedUserAnswer.length >= (normalizedCorrectAnswer.length * (minMatchPercentage / 100))) {
      return true;
    }
    
    // If correct answer is part of user answer
    if (normalizedUserAnswer.includes(normalizedCorrectAnswer) && 
        normalizedCorrectAnswer.length >= (normalizedUserAnswer.length * (minMatchPercentage / 100))) {
      return true;
    }
  }
  
  return false;
};
