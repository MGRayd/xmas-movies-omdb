import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import QuestionImage from '../components/QuestionImage';
import RoundResults from '../components/RoundResults';
import { Question, Round, RoundType } from '../types/quiz';
import HoverImage from '../components/HoverImage';
import { isTextAnswerCorrect } from '../utils/stringMatching';

// Using Question interface from types/quiz.ts

const QuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{[questionId: string]: number | null}>({});
  const [textAnswers, setTextAnswers] = useState<{[questionId: string]: string}>({});
  const [score, setScore] = useState(0);
  const [roundScores, setRoundScores] = useState<{[roundId: string]: number}>({});
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [roundCompleted, setRoundCompleted] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showRoundResults, setShowRoundResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{ [questionId: string]: string | number | null }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rounds and questions from Firestore
  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        // First fetch rounds
        const roundsQuery = query(collection(db, 'rounds'), orderBy('order', 'asc'));
        const roundsSnapshot = await getDocs(roundsQuery);
        
        const fetchedRounds: Round[] = [];
        roundsSnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Round, 'id'>;
          fetchedRounds.push({
            id: doc.id,
            ...data
          } as Round);
        });
        
        // Then fetch questions
        const questionsQuery = query(collection(db, 'questions'));
        const questionsSnapshot = await getDocs(questionsQuery);
        
        const fetchedQuestions: Question[] = [];
        questionsSnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Question, 'id'>;
          fetchedQuestions.push({
            id: doc.id,
            ...data,
            roundId: data.roundId || ''
          } as Question);
        });
        
        // Initialize round scores
        const initialRoundScores: {[roundId: string]: number} = {};
        fetchedRounds.forEach(round => {
          initialRoundScores[round.id] = 0;
        });
        
        setRounds(fetchedRounds);
        setQuestions(fetchedQuestions);
        setRoundScores(initialRoundScores);
        
        // Set up first round questions
        if (fetchedRounds.length > 0) {
          const firstRoundQuestions = fetchedQuestions.filter(
            q => q.roundId === fetchedRounds[0].id
          );
          setRoundQuestions(firstRoundQuestions);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching quiz data:', err);
        setError('Failed to load quiz data. Please try again later.');
        setLoading(false);
      }
    };

    fetchQuizData();
  }, []);

  // No timer for questions

  const startQuiz = () => {
    setQuizStarted(true);
  };

  const handleOptionSelect = (questionId: string, optionIndex: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleTextAnswerChange = (questionId: string, value: string) => {
    setTextAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmitRound = () => {
    // Calculate score for the round
    let roundScore = 0;
    const newUserAnswers: {[questionId: string]: string | number | null} = {};
    
    // Process each question in the round
    roundQuestions.forEach(question => {
      if (question.isTextInput) {
        const answer = textAnswers[question.id] || '';
        newUserAnswers[question.id] = answer;
        
        // Check if text answer is correct (including alternative answers)
        if (isTextAnswerCorrect(answer, question.textAnswer, {
          acceptableAlternatives: question.alternativeAnswers || []
        })) {
          roundScore++;
        }
      } else {
        const selectedOption = selectedOptions[question.id];
        newUserAnswers[question.id] = selectedOption;
        
        // Check if selected option is correct
        if (selectedOption !== undefined && selectedOption === question.correctAnswer) {
          roundScore++;
        }
      }
    });
    
    // Update total score
    setScore(prevScore => prevScore + roundScore);
    
    // Update round score
    const currentRound = rounds[currentRoundIndex];
    setRoundScores(prev => ({
      ...prev,
      [currentRound.id]: roundScore
    }));
    
    // Save user answers
    setUserAnswers(prev => ({
      ...prev,
      ...newUserAnswers
    }));
    
    // Show round results
    setRoundCompleted(true);
    setShowRoundResults(true);
  };

  const handleNextRound = () => {
    // Reset round results view
    setShowRoundResults(false);
    
    // Check if there are more rounds
    if (currentRoundIndex < rounds.length - 1) {
      // Move to next round
      const nextRoundIndex = currentRoundIndex + 1;
      const nextRound = rounds[nextRoundIndex];
      const nextRoundQuestions = questions.filter(q => q.roundId === nextRound.id);
      
      setCurrentRoundIndex(nextRoundIndex);
      setRoundQuestions(nextRoundQuestions);
      setSelectedOptions({});
      setTextAnswers({});
      setRoundCompleted(false);
      setShowAnswers(false);
    } else {
      // Quiz is finished
      setQuizFinished(true);
      setShowNameInput(true);
    }
  };

  const handleSubmitScore = async () => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'scores'), {
        playerName: playerName.trim(),
        score,
        roundScores,
        timestamp: serverTimestamp()
      });
      
      // Redirect to home page after submission
      navigate('/');
    } catch (err) {
      console.error('Error submitting score:', err);
      setError('Failed to submit your score. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-xmas-gold"></div>
        <p className="mt-4 text-xl">Loading Christmas Quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-error bg-opacity-20 p-6 rounded-lg">
          <h2 className="text-2xl font-christmas text-error mb-4">Oh no! Something went wrong</h2>
          <p className="mb-4">{error}</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="bg-warning bg-opacity-20 p-6 rounded-lg">
          <h2 className="text-2xl font-christmas text-warning mb-4">No Questions Available</h2>
          <p className="mb-4">There are no quiz questions available right now. Please check back later!</p>
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/')}
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-christmas text-4xl md:text-5xl text-xmas-line mb-6">Christmas Quiz</h1>
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
          <h2 className="text-2xl font-christmas text-xmas-gold mb-4">Ready to Test Your Christmas Knowledge?</h2>
          <p className="mb-6">Answer the questions correctly to earn points. Take your time and enjoy the quiz!</p>
          <button 
            className="btn btn-primary btn-lg font-christmas text-xl"
            onClick={startQuiz}
          >
            <i className="fas fa-play-circle mr-2"></i> Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (quizFinished && showNameInput) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="font-christmas text-4xl md:text-5xl text-xmas-line mb-6">Quiz Complete!</h1>
        <div className="bg-xmas-card p-6 rounded-lg shadow-lg max-w-md mx-auto">
          <div className="text-6xl text-xmas-gold mb-4">
            <i className="fas fa-star"></i>
          </div>
          <h2 className="text-3xl font-christmas text-xmas-gold mb-2">Your Score</h2>
          <p className="text-4xl font-bold mb-6">{score} points</p>
          
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-xmas-snow">Enter your name to save your score:</span>
            </label>
            <input 
              type="text" 
              className="input input-bordered w-full" 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Your Name"
              disabled={submitting}
            />
          </div>
          
          <button 
            className="btn btn-primary w-full"
            onClick={handleSubmitScore}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="loading loading-spinner loading-sm mr-2"></span>
                Submitting...
              </>
            ) : (
              'Submit Score'
            )}
          </button>
        </div>
      </div>
    );
  }

  const currentRound = rounds[currentRoundIndex];

  // Show round results if we've completed all questions in the round
  if (showRoundResults) {
    return (
      <RoundResults
        round={currentRound}
        questions={roundQuestions}
        userAnswers={userAnswers}
        roundScore={roundScores[currentRound.id] || 0}
        onContinue={handleNextRound}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <span className="text-sm">Round</span>
          <h2 className="text-xl font-bold">{currentRound?.title || 'Quiz'}</h2>
        </div>
        <div className="text-center">
          <span className="text-sm">Score</span>
          <h2 className="text-xl font-bold">{score}</h2>
        </div>
        <div className="text-right">
          <span className="text-sm">Questions</span>
          <h2 className="text-xl font-bold">{roundQuestions.length}</h2>
        </div>
      </div>

      <div className="space-y-8 mb-8">
        {roundQuestions.map((question, questionIndex) => (
          <div key={question.id} className="bg-xmas-card rounded-lg shadow-lg p-6">
            <h3 className="text-2xl font-christmas mb-4">
              Question {questionIndex + 1}: {question.text}
            </h3>
            
            {currentRound?.type === RoundType.PICTURE && question.blankedImageUrl && (
              <div className="mb-4 flex justify-center">
                <HoverImage 
                  src={question.blankedImageUrl} 
                  alt="Question Image"
                  thumbnailHeight="max-h-64"
                  maxWidth="800px"
                  maxHeight="800px"
                  className="object-contain rounded-lg"
                />
              </div>
            )}
            
            {question.isTextInput ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Your Answer:</span>
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="input input-bordered flex-1" 
                    value={textAnswers[question.id] || ''}
                    onChange={(e) => handleTextAnswerChange(question.id, e.target.value)}
                    placeholder="Type your answer here"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    className={`btn btn-outline w-full justify-start text-left px-4 py-3 ${
                      selectedOptions[question.id] === index ? 'btn-primary' : ''
                    }`}
                    onClick={() => handleOptionSelect(question.id, index)}
                  >
                    <span className="mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button 
          className="btn btn-primary btn-lg"
          onClick={handleSubmitRound}
        >
          Submit Answers & Show Results
        </button>
      </div>
    </div>
  );
};

export default QuizPage;
