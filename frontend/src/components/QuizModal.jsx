import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API } from '../api/api';
import { useAlert } from '../context/AlertContext';

export const QuizModal = ({ question, isOpen, onClose, onAnswerSubmitted }) => {
  const { showAlert } = useAlert();
  const [selectedOption, setSelectedOption] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [totalDuration, setTotalDuration] = useState(60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !question) {
      if (timerRef.current) clearInterval(timerRef.current);
      setSelectedOption(null);
      setIsSubmitted(false);
      setResult(null);
      setSubmitting(false);
      return;
    }

    const duration = question.duration_seconds || 60;
    setTotalDuration(duration);
    setTimeRemaining(duration);
    setSelectedOption(null);
    setIsSubmitted(false);
    setResult(null);
    setSubmitting(false);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, question]);

  // Handle timeout
  useEffect(() => {
    if (timeRemaining === 0 && !isSubmitted && isOpen && question) {
      handleSubmit(selectedOption || 'A', true);
    }
  }, [timeRemaining, isSubmitted, isOpen, question, selectedOption]);

  if (!isOpen || !question) return null;

  const handleSubmit = async (optionToSubmit, isTimeout = false) => {
    if (isSubmitted || submitting) return;
    const choice = optionToSubmit || selectedOption;
    if (!choice && !isTimeout) {
      showAlert('Please select an answer option', 'danger');
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    const elapsedSeconds = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const timeTaken = Math.min(totalDuration, elapsedSeconds);

    try {
      const res = await API.submitAnswer(question.id, choice || 'A', timeTaken);
      setResult(res);
      setIsSubmitted(true);
      onAnswerSubmitted?.(res);
    } catch (err) {
      showAlert(err.message, 'danger');
      // If already answered or server error, show state anyway
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const formatClock = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, (timeRemaining / (totalDuration || 1)) * 100));

  const options = [
    { key: 'A', text: question.option_a },
    { key: 'B', text: question.option_b },
    { key: 'C', text: question.option_c },
    { key: 'D', text: question.option_d },
  ];

  return createPortal(
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          title="Close Quiz"
        >
          ✕
        </button>

        {/* Quiz Modal Header */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="status-pill" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#7e22ce', borderColor: '#4f46e5', fontWeight: 700 }}>
              {question.task_number || 'Task 1'}
            </span>
            <span className="timer-badge">
              {question.duration_seconds}s Limit
            </span>
            <span className="target-badge">
              {question.target_type === 'all' ? 'All Students' : `Group: ${question.group_name || 'Group Assessment'}`}
            </span>
          </div>
          {question.teacher_name && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Created by: <span style={{ color: '#7e22ce', fontWeight: 600 }}>{question.teacher_name}</span>
            </div>
          )}
          <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
            {question.question_text}
          </h2>
        </div>

        {/* Active Timer Widget */}
        {!isSubmitted && (
          <>
            <div className="quiz-timer-box">
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Time Remaining
                </span>
                <div
                  className="quiz-timer-text"
                  style={{ color: timeRemaining <= 10 ? '#ef4444' : '#0284c7' }}
                >
                  {formatClock(timeRemaining)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Auto-submits on timeout
                </span>
              </div>
            </div>
            <div className="timer-progress-track" style={{ marginTop: '-16px', marginBottom: '24px' }}>
              <div
                className="timer-progress-bar"
                style={{
                  width: `${progressPercent}%`,
                  background: timeRemaining <= 10 ? '#ef4444' : 'var(--accent-gradient)',
                  transition: 'width 1s linear'
                }}
              />
            </div>
          </>
        )}

        {/* Options List */}
        <div className="options-list">
          {options.map(({ key, text }) => {
            let optionClass = 'option-item';
            let optionStyle = {};

            if (isSubmitted) {
              const isUserChoice = selectedOption === key;
              const isCorrectAnswer = result?.correct_option === key;

              if (isCorrectAnswer) {
                // Correct answer is ALWAYS green
                optionClass += ' correct-option';
                optionStyle = {
                  background: 'var(--color-correct-bg)',
                  borderColor: 'var(--color-correct-border)',
                  boxShadow: 'var(--color-correct-glow)',
                  color: '#166534'
                };
              } else if (isUserChoice && !result?.is_correct) {
                // User's wrong choice is RED
                optionClass += ' wrong-option';
                optionStyle = {
                  background: 'var(--color-wrong-bg)',
                  borderColor: 'var(--color-wrong-border)',
                  boxShadow: 'var(--color-wrong-glow)',
                  color: '#991b1b'
                };
              }
            } else if (selectedOption === key) {
              optionClass += ' selected';
              optionStyle = {
                borderColor: 'var(--accent-primary)',
                background: 'rgba(99, 102, 241, 0.15)'
              };
            }

            return (
              <div
                key={key}
                className={optionClass}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  cursor: isSubmitted ? 'default' : 'pointer',
                  marginBottom: '10px',
                  transition: 'var(--transition)',
                  ...optionStyle
                }}
                onClick={() => {
                  if (!isSubmitted) setSelectedOption(key);
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)',
                    flexShrink: 0
                  }}
                >
                  {key}
                </div>
                <div style={{ flex: 1, fontSize: '0.95rem', color: 'inherit' }}>
                  {text}
                </div>
                {isSubmitted && result?.correct_option === key && (
                  <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                    Correct
                  </span>
                )}
                {isSubmitted && selectedOption === key && !result?.is_correct && (
                  <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.85rem' }}>
                    Your Pick
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit or Finish Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          {!isSubmitted ? (
            <button
              className="btn btn-primary"
              disabled={!selectedOption || submitting}
              onClick={() => handleSubmit(selectedOption)}
              style={{ padding: '12px 28px' }}
            >
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onClose}
              style={{ padding: '12px 28px' }}
            >
              Finish & Close
            </button>
          )}
        </div>

        {/* Immediate Feedback Reveal Box */}
        {isSubmitted && result && (
          <div
            className="quiz-result-reveal"
            style={{
              display: 'block',
              marginTop: '20px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: result.is_correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${result.is_correct ? '#10b981' : '#ef4444'}`,
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <div
              className="result-heading"
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: result.is_correct ? '#34d399' : '#f87171'
              }}
            >
              {result.is_correct ? 'Correct Answer!' : 'Incorrect!'}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginTop: '4px' }}>
              {result.is_correct
                ? `Well done! You chose Option ${result.selected_option} correctly.`
                : `You selected Option ${result.selected_option}. The correct answer is Option ${result.correct_option}.`}
            </div>

            {result.explanation && (
              <div
                style={{
                  marginTop: '14px',
                  background: '#f8fafc',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <strong style={{ color: '#0284c7', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                  Explanation:
                </strong>
                <p className="result-explanation-text" style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {result.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
