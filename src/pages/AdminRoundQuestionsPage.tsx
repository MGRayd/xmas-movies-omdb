import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';
import HoverImage from '../components/HoverImage';
import { Question, Round, RoundType } from '../types/quiz';

const AdminRoundQuestionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { roundId } = useParams<{ roundId: string }>();
  const { isAdmin, loading: adminCheckLoading } = useIsAdmin();
  
  const [round, setRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Form state
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number>(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [blankedImageFile, setBlankedImageFile] = useState<File | null>(null);
  const [normalImageFile, setNormalImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [blankedImagePreview, setBlankedImagePreview] = useState<string | null>(null);
  const [normalImagePreview, setNormalImagePreview] = useState<string | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isTextInput, setIsTextInput] = useState<boolean>(false);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [alternativeAnswers, setAlternativeAnswers] = useState<string[]>(['']);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!adminCheckLoading && !isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, adminCheckLoading, navigate]);

  // Fetch round and its questions
  useEffect(() => {
    const fetchRoundData = async () => {
      if (!isAdmin || !roundId) return;
      
      try {
        // Fetch round
        const roundDoc = await getDoc(doc(db, 'rounds', roundId));
        if (!roundDoc.exists()) {
          setError('Round not found');
          setLoading(false);
          return;
        }
        
        const roundData = roundDoc.data() as Omit<Round, 'id'>;
        setRound({
          id: roundDoc.id,
          ...roundData
        } as Round);
        
        // Fetch questions for this round
        const questionsQuery = query(
          collection(db, 'questions'),
          where('roundId', '==', roundId)
        );
        
        const querySnapshot = await getDocs(questionsQuery);
        const fetchedQuestions: Question[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Question, 'id'>;
          fetchedQuestions.push({
            id: doc.id,
            ...data
          } as Question);
        });
        
        setQuestions(fetchedQuestions);
      } catch (err) {
        console.error('Error fetching round data:', err);
        setError('Failed to load round data');
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && roundId) {
      fetchRoundData();
    }
  }, [isAdmin, roundId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'main' | 'blanked' | 'normal' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Set the appropriate file and preview based on image type
    switch (imageType) {
      case 'main':
        setImageFile(file);
        // Create preview
        const mainReader = new FileReader();
        mainReader.onloadend = () => {
          setImagePreview(mainReader.result as string);
        };
        mainReader.readAsDataURL(file);
        break;
      case 'blanked':
        setBlankedImageFile(file);
        // Create preview
        const blankedReader = new FileReader();
        blankedReader.onloadend = () => {
          setBlankedImagePreview(blankedReader.result as string);
        };
        blankedReader.readAsDataURL(file);
        break;
      case 'normal':
        setNormalImageFile(file);
        // Create preview
        const normalReader = new FileReader();
        normalReader.onloadend = () => {
          setNormalImagePreview(normalReader.result as string);
        };
        normalReader.readAsDataURL(file);
        break;
      case 'cover':
        setCoverImageFile(file);
        // Create preview
        const coverReader = new FileReader();
        coverReader.onloadend = () => {
          setCoverImagePreview(coverReader.result as string);
        };
        coverReader.readAsDataURL(file);
        break;
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer(0);
    setImageFile(null);
    setBlankedImageFile(null);
    setNormalImageFile(null);
    setCoverImageFile(null);
    setImagePreview(null);
    setBlankedImagePreview(null);
    setNormalImagePreview(null);
    setCoverImagePreview(null);
    setIsTextInput(false);
    setTextAnswer('');
    setAlternativeAnswers(['']);
    setEditingQuestion(null);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundId) return;
    
    setSubmitting(true);
    
    try {
      // Upload all images if provided
      let imageUrl = '';
      let blankedImageUrl = '';
      let normalImageUrl = '';
      let coverImageUrl = '';
      
      // Upload main image if provided
      if (imageFile) {
        const storageRef = ref(storage, `question-images/${Date.now()}-${imageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            imageType: 'main'
          }
        };
        await uploadBytes(storageRef, imageFile, metadata);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Upload blanked image if provided
      if (blankedImageFile) {
        const storageRef = ref(storage, `question-images/blanked-${Date.now()}-${blankedImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            imageType: 'blanked'
          }
        };
        await uploadBytes(storageRef, blankedImageFile, metadata);
        blankedImageUrl = await getDownloadURL(storageRef);
      }

      // Upload normal image if provided
      if (normalImageFile) {
        const storageRef = ref(storage, `question-images/normal-${Date.now()}-${normalImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            imageType: 'normal'
          }
        };
        await uploadBytes(storageRef, normalImageFile, metadata);
        normalImageUrl = await getDownloadURL(storageRef);
      }

      // Upload cover image if provided
      if (coverImageFile) {
        const storageRef = ref(storage, `question-images/cover-${Date.now()}-${coverImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            imageType: 'cover'
          }
        };
        await uploadBytes(storageRef, coverImageFile, metadata);
        coverImageUrl = await getDownloadURL(storageRef);
      }
      
      // Create question document
      await addDoc(collection(db, 'questions'), {
        text: questionText,
        options,
        correctAnswer,
        roundId,
        ...(imageUrl && { imageUrl }),
        ...(blankedImageUrl && { blankedImageUrl }),
        ...(normalImageUrl && { normalImageUrl }),
        ...(coverImageUrl && { coverImageUrl }),
        ...(isTextInput && { isTextInput }),
        ...(isTextInput && textAnswer && { textAnswer }),
        ...(isTextInput && { alternativeAnswers: alternativeAnswers.filter(a => a.trim() !== '') }),
      });
      
      // Refresh questions
      const questionsQuery = query(
        collection(db, 'questions'),
        where('roundId', '==', roundId)
      );
      
      const querySnapshot = await getDocs(questionsQuery);
      const updatedQuestions: Question[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Question, 'id'>;
        updatedQuestions.push({
          id: doc.id,
          ...data
        } as Question);
      });
      
      setQuestions(updatedQuestions);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error adding question:', err);
      setError('Failed to add question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionText(question.text);
    setOptions([...question.options]);
    setCorrectAnswer(question.correctAnswer);
    setImagePreview(question.imageUrl || null);
    setBlankedImagePreview(question.blankedImageUrl || null);
    setNormalImagePreview(question.normalImageUrl || null);
    setCoverImagePreview(question.coverImageUrl || null);
    setIsTextInput(question.isTextInput || false);
    setTextAnswer(question.textAnswer || '');
    setAlternativeAnswers(question.alternativeAnswers || ['']);
    setShowAddModal(true);
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !roundId) return;
    
    setSubmitting(true);
    
    try {
      let imageUrl = editingQuestion.imageUrl || '';
      let blankedImageUrl = editingQuestion.blankedImageUrl || '';
      let normalImageUrl = editingQuestion.normalImageUrl || '';
      let coverImageUrl = editingQuestion.coverImageUrl || '';
      
      // Upload new main image if provided
      if (imageFile) {
        // Delete old image if exists
        if (editingQuestion.imageUrl) {
          try {
            const oldImageRef = ref(storage, editingQuestion.imageUrl);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.error('Error deleting old main image:', err);
          }
        }
        
        const storageRef = ref(storage, `question-images/${Date.now()}-${imageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            action: 'update',
            imageType: 'main'
          }
        };
        await uploadBytes(storageRef, imageFile, metadata);
        imageUrl = await getDownloadURL(storageRef);
      }

      // Upload new blanked image if provided
      if (blankedImageFile) {
        // Delete old image if exists
        if (editingQuestion.blankedImageUrl) {
          try {
            const oldImageRef = ref(storage, editingQuestion.blankedImageUrl);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.error('Error deleting old blanked image:', err);
          }
        }
        
        const storageRef = ref(storage, `question-images/blanked-${Date.now()}-${blankedImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            action: 'update',
            imageType: 'blanked'
          }
        };
        await uploadBytes(storageRef, blankedImageFile, metadata);
        blankedImageUrl = await getDownloadURL(storageRef);
      }

      // Upload new normal image if provided
      if (normalImageFile) {
        // Delete old image if exists
        if (editingQuestion.normalImageUrl) {
          try {
            const oldImageRef = ref(storage, editingQuestion.normalImageUrl);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.error('Error deleting old normal image:', err);
          }
        }
        
        const storageRef = ref(storage, `question-images/normal-${Date.now()}-${normalImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            action: 'update',
            imageType: 'normal'
          }
        };
        await uploadBytes(storageRef, normalImageFile, metadata);
        normalImageUrl = await getDownloadURL(storageRef);
      }

      // Upload new cover image if provided
      if (coverImageFile) {
        // Delete old image if exists
        if (editingQuestion.coverImageUrl) {
          try {
            const oldImageRef = ref(storage, editingQuestion.coverImageUrl);
            await deleteObject(oldImageRef);
          } catch (err) {
            console.error('Error deleting old cover image:', err);
          }
        }
        
        const storageRef = ref(storage, `question-images/cover-${Date.now()}-${coverImageFile.name}`);
        const metadata = {
          customMetadata: {
            uploadedBy: 'admin',
            uploadedAt: new Date().toISOString(),
            action: 'update',
            imageType: 'cover'
          }
        };
        await uploadBytes(storageRef, coverImageFile, metadata);
        coverImageUrl = await getDownloadURL(storageRef);
      }
      
      // Update question document
      const questionRef = doc(db, 'questions', editingQuestion.id);
      await updateDoc(questionRef, {
        text: questionText,
        options,
        correctAnswer,
        roundId,
        ...(imageUrl && { imageUrl }),
        ...(blankedImageUrl && { blankedImageUrl }),
        ...(normalImageUrl && { normalImageUrl }),
        ...(coverImageUrl && { coverImageUrl }),
        isTextInput,
        ...(isTextInput && { textAnswer }),
        ...(isTextInput && { alternativeAnswers: alternativeAnswers.filter(a => a.trim() !== '') }),
      });
      
      // Refresh questions
      const questionsQuery = query(
        collection(db, 'questions'),
        where('roundId', '==', roundId)
      );
      
      const querySnapshot = await getDocs(questionsQuery);
      const updatedQuestions: Question[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Question, 'id'>;
        updatedQuestions.push({
          id: doc.id,
          ...data
        } as Question);
      });
      
      setQuestions(updatedQuestions);
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating question:', err);
      setError('Failed to update question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string, imageUrl?: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    
    try {
      // Delete image if exists
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        } catch (err) {
          console.error('Error deleting image:', err);
        }
      }
      
      // Delete question document
      await deleteDoc(doc(db, 'questions', questionId));
      
      // Update state
      setQuestions(questions.filter(q => q.id !== questionId));
    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question');
    }
  };

  if (adminCheckLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-xmas-gold"></div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-error bg-opacity-10 p-6 rounded-lg">
          <h2 className="text-2xl font-christmas text-error mb-4">Round Not Found</h2>
          <p className="mb-4">The round you're looking for doesn't exist or has been deleted.</p>
          <Link to="/admin/rounds" className="btn btn-primary">
            Back to Rounds
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-christmas text-3xl md:text-4xl text-xmas-line">{round.title}</h1>
          <p className="text-xmas-mute">{round.description}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/rounds" className="btn btn-outline">
            <i className="fas fa-arrow-left mr-2"></i> Back to Rounds
          </Link>
          <button 
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <i className="fas fa-plus mr-2"></i> Add Question
          </button>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      
      {questions.length === 0 ? (
        <div className="bg-xmas-card p-8 rounded-lg text-center">
          <h3 className="text-xl mb-4">No questions in this round yet</h3>
          <p className="mb-4">Start by adding your first question!</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <i className="fas fa-plus mr-2"></i> Add Question
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Question</th>
                <th>Options</th>
                <th>Correct Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td className="max-w-xs">
                    <div className="font-medium">{question.text}</div>
                    {question.imageUrl && (
                      <div className="mt-2">
                        <img 
                          src={question.imageUrl} 
                          alt="Question" 
                          className="h-12 w-auto object-cover rounded"
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    <ol className="list-alpha pl-4">
                      {question.options.map((option, index) => (
                        <li key={index} className={index === question.correctAnswer ? 'font-bold text-success' : ''}>
                          {option}
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td>
                    {String.fromCharCode(65 + question.correctAnswer)}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-error btn-outline"
                        onClick={() => handleDeleteQuestion(question.id, question.imageUrl)}
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Add/Edit Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-xmas-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-christmas">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h2>
                <button 
                  className="btn btn-sm btn-circle"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Question Text</span>
                  </label>
                  <textarea 
                    className="textarea textarea-bordered h-24" 
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter your question here"
                    required
                  />
                </div>

                {/* Text Input Option for Picture Rounds */}
                {round?.type === RoundType.PICTURE && (
                  <div className="form-control mb-4">
                    <label className="label cursor-pointer">
                      <span className="label-text">Use text input instead of multiple choice</span>
                      <input 
                        type="checkbox" 
                        className="toggle toggle-primary" 
                        checked={isTextInput}
                        onChange={(e) => setIsTextInput(e.target.checked)}
                      />
                    </label>
                  </div>
                )}
                
                {isTextInput && round?.type === RoundType.PICTURE ? (
                  <>
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Correct Text Answer</span>
                      </label>
                      <input 
                        type="text" 
                        className="input input-bordered w-full" 
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Enter the correct answer"
                        required={isTextInput}
                      />
                    </div>
                    
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Alternative Acceptable Answers</span>
                        <button 
                          type="button"
                          className="btn btn-xs btn-outline"
                          onClick={() => setAlternativeAnswers([...alternativeAnswers, ''])}
                        >
                          <i className="fas fa-plus mr-1"></i> Add
                        </button>
                      </label>
                      <div className="space-y-2">
                        {alternativeAnswers.map((alt, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input 
                              type="text" 
                              className="input input-bordered flex-1" 
                              value={alt}
                              onChange={(e) => {
                                const newAlts = [...alternativeAnswers];
                                newAlts[index] = e.target.value;
                                setAlternativeAnswers(newAlts);
                              }}
                              placeholder={`Alternative answer ${index + 1}`}
                            />
                            {alternativeAnswers.length > 1 && (
                              <button 
                                type="button"
                                className="btn btn-sm btn-outline btn-error"
                                onClick={() => {
                                  const newAlts = alternativeAnswers.filter((_, i) => i !== index);
                                  setAlternativeAnswers(newAlts);
                                }}
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-xmas-mute mt-2">
                        Add alternative answers that should be accepted (e.g., "Christmas Vacation" for "National Lampoon's Christmas Vacation")
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="label">
                        <span className="label-text">Options</span>
                      </label>
                      {options.map((option, index) => (
                        <div key={index} className="flex items-center mb-2">
                          <div className="w-8 h-8 flex items-center justify-center bg-xmas-card border border-base-300 rounded-full mr-2">
                            {String.fromCharCode(65 + index)}
                          </div>
                          <input 
                            type="text" 
                            className="input input-bordered flex-1" 
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            required={!isTextInput}
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Correct Answer</span>
                      </label>
                      <select 
                        className="select select-bordered w-full" 
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(Number(e.target.value))}
                        required={!isTextInput}
                      >
                        {options.map((_, index) => (
                          <option key={index} value={index}>
                            {String.fromCharCode(65 + index)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                
                {/* Main Image */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text">Main Image (Optional)</span>
                  </label>
                  <input 
                    type="file" 
                    className="file-input file-input-bordered w-full" 
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'main')}
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img 
                        src={imagePreview} 
                        alt="Main Preview" 
                        className="h-32 object-contain rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Additional images for picture rounds */}
                {round?.type === RoundType.PICTURE && (
                  <>
                    {/* Blanked Image */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Blanked Image (Shown during question)</span>
                      </label>
                      <input 
                        type="file" 
                        className="file-input file-input-bordered w-full" 
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'blanked')}
                      />
                      {blankedImagePreview && (
                        <div className="mt-2">
                          <img 
                            src={blankedImagePreview} 
                            alt="Blanked Preview" 
                            className="h-32 object-contain rounded"
                          />
                        </div>
                      )}
                    </div>

                    {/* Normal Image */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Normal Image (Shown with answers)</span>
                      </label>
                      <input 
                        type="file" 
                        className="file-input file-input-bordered w-full" 
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'normal')}
                      />
                      {normalImagePreview && (
                        <div className="mt-2">
                          <img 
                            src={normalImagePreview} 
                            alt="Normal Preview" 
                            className="h-32 object-contain rounded"
                          />
                        </div>
                      )}
                    </div>

                    {/* Cover Image */}
                    <div className="form-control mb-4">
                      <label className="label">
                        <span className="label-text">Cover Image (Shown before next round)</span>
                      </label>
                      <input 
                        type="file" 
                        className="file-input file-input-bordered w-full" 
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, 'cover')}
                      />
                      {coverImagePreview && (
                        <div className="mt-2">
                          <img 
                            src={coverImagePreview} 
                            alt="Cover Preview" 
                            className="h-32 object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <div className="flex justify-end gap-2">
                  <button 
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="loading loading-spinner loading-sm mr-2"></span>
                        {editingQuestion ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingQuestion ? 'Update Question' : 'Add Question'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRoundQuestionsPage;
