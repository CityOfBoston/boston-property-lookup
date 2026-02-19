import React, { useState } from 'react';
import { IconButton } from '../IconButton';
import { FeedbackTextArea } from '../FeedbackTextArea';
import { useGoogleAnalytics } from '@hooks/useGoogleAnalytics';
import { usePerformanceTracking } from '@src/services/analytics';
import styles from './ComplexFeedbackSender.module.scss';

export interface ComplexFeedbackSenderProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  
  /**
   * Handler for closing the modal
   */
  onClose: () => void;
  
  /**
   * Handler for the feedback submission
   */
  onSubmit: (data: { feedback: string; issueType?: string }) => Promise<void>;
  
  /**
   * Optional callback URL for the "Assessing department" link
   */
  assessingDeptUrl?: string;

  /**
   * Text content
   */
  texts: {
    headerTitle: string;
    issueQuestion: string;
    issueOption1: string;
    issueOption2: string;
    issueOption3: string;
    promptTitle: string;
    promptOptional: string;
    disclaimer: string;
    submitButton: string;
    cancelButton: string;
    characterCount: string;
    characterRemaining: string;
    contactInfo: string;
    departmentLinkText: string;
    closeButtonAriaLabel: string;
  };
  
  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;
}

/**
 * ComplexFeedbackSender component allows users to provide detailed feedback in a modal format
 */
export const ComplexFeedbackSender: React.FC<ComplexFeedbackSenderProps> = ({
  isOpen,
  onClose,
  onSubmit,
  assessingDeptUrl = '#',
  texts,
  isSubmitting = false
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [issueType, setIssueType] = useState<string>('');
  const MAX_CHARACTERS = 500;
  const analytics = useGoogleAnalytics();
  const performance = usePerformanceTracking('ComplexFeedbackSender');

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    if (newText.length <= MAX_CHARACTERS) {
      setFeedbackText(newText);
    }
  };

  const handleIssueTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIssueType(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (onSubmit && issueType) {
      const startTime = window.performance.now();
      try {
        await onSubmit({
          feedback: feedbackText,
          issueType,
        });

        // Track successful feedback submission
        analytics.trackButtonClick({
          button_id: 'complex_feedback_submit',
          button_text: texts.submitButton,
          context: 'general'
        });

        performance.trackOperation('complex_feedback_submit', 'success', window.performance.now() - startTime);
        
        // Clear form after successful submission (modal close handled by container)
        setIssueType('');
        setFeedbackText('');
      } catch (error) {
        // Track feedback submission error
        analytics.trackError({
          error_type: 'complex_feedback_submission',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          component: 'ComplexFeedbackSender'
        });

        performance.trackOperation('complex_feedback_submit', 'error', window.performance.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    }
  };

  const handleClose = () => {
    // Clear form when modal is closed
    setIssueType('');
    setFeedbackText('');
    onClose();
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={styles.modalBackdrop} 
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="complex-feedback-header"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div id="complex-feedback-header" className={styles.headerTitle}>
            {texts.headerTitle}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={texts.closeButtonAriaLabel}
          >
            ×
          </button>
        </div>

        <form className={styles.feedbackForm} onSubmit={handleSubmit}>
          <div className={styles.feedbackContainer}>
            <fieldset className="usa-fieldset">
              <legend className="usa-legend">
                {texts.issueQuestion} <span className={styles.required}>*</span>
              </legend>
              <div className="usa-radio">
                <input
                  className="usa-radio__input usa-radio__input--tile"
                  id="issue-not-found"
                  type="radio"
                  name="issue-type"
                  value="not-found"
                  checked={issueType === 'not-found'}
                  onChange={handleIssueTypeChange}
                />
                <label className="usa-radio__label" htmlFor="issue-not-found">
                  {texts.issueOption1}
                </label>
              </div>
              <div className="usa-radio">
                <input
                  className="usa-radio__input usa-radio__input--tile"
                  id="issue-bug"
                  type="radio"
                  name="issue-type"
                  value="bug"
                  checked={issueType === 'bug'}
                  onChange={handleIssueTypeChange}
                />
                <label className="usa-radio__label" htmlFor="issue-bug">
                  {texts.issueOption2}
                </label>
              </div>
              <div className="usa-radio">
                <input
                  className="usa-radio__input usa-radio__input--tile"
                  id="issue-suggestion"
                  type="radio"
                  name="issue-type"
                  value="suggestion"
                  checked={issueType === 'suggestion'}
                  onChange={handleIssueTypeChange}
                />
                <label className="usa-radio__label" htmlFor="issue-suggestion">
                  {texts.issueOption3}
                </label>
              </div>
            </fieldset>

            <FeedbackTextArea
              value={feedbackText}
              onChange={handleTextChange}
              maxCharacters={MAX_CHARACTERS}
              texts={texts}
              assessingDeptUrl={assessingDeptUrl}
              rows={6}
              submitButton={
                <div className={styles.buttonGroup}>
                  <IconButton 
                    text={texts.cancelButton}
                    variant="outline"
                    type="button"
                    onClick={handleClose}
                  />
                  <IconButton 
                    text={texts.submitButton}
                    variant="primary"
                    type="submit"
                    disabled={!issueType || isSubmitting}
                  />
                </div>
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplexFeedbackSender;
