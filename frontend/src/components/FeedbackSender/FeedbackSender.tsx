import React, { useState } from 'react';
import { IconButton } from '../IconButton';
import { FeedbackTextArea } from '../FeedbackTextArea';
import { useGoogleAnalytics } from '@hooks/useGoogleAnalytics';
import { usePerformanceTracking } from '@src/services/analytics';
import styles from './FeedbackSender.module.scss';

export interface FeedbackSenderProps {
  /**
   * Optional handler for the feedback submission
   */
  onSubmit?: (data: { helpful: boolean; feedback?: string; parcelId?: string }) => void;
  
  /**
   * Optional callback URL for the "Assessing department" link
   */
  assessingDeptUrl?: string;

  /**
   * Optional parcelId for context
   */
  parcelId?: string;

  /**
   * Text content
   */
  texts: {
    question: string;
    yesLabel: string;
    noLabel: string;
    promptTitle: string;
    promptOptional: string;
    disclaimer: string;
    submitButton: string;
    characterCount: string;
    characterRemaining: string;
    contactInfo: string;
    departmentLinkText: string;
  };
}

/**
 * FeedbackSender component allows users to provide feedback on the page content
 */
export const FeedbackSender: React.FC<FeedbackSenderProps> = ({
  onSubmit,
  assessingDeptUrl = '#',
  parcelId,
  texts
}) => {
  const [feedbackOption, setFeedbackOption] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const MAX_CHARACTERS = 500;
  const analytics = useGoogleAnalytics();
  const performance = usePerformanceTracking('FeedbackSender');

  const handleOptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFeedbackOption(event.target.value);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    if (newText.length <= MAX_CHARACTERS) {
      setFeedbackText(newText);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (onSubmit && feedbackOption) {
      const startTime = window.performance.now();
      try {
        await onSubmit({
          helpful: feedbackOption === 'yes',
          feedback: feedbackText || undefined,
          parcelId,
        });

        // Track successful feedback submission with parcel ID context
        analytics.trackButtonClick({
          button_id: 'feedback_submit',
          button_text: texts.submitButton,
          context: parcelId ? `property_details_${parcelId}` : 'general'
        });

        performance.trackOperation('feedback_submit', 'success', window.performance.now() - startTime);
      } catch (error) {
        // Track feedback submission error
        analytics.trackError({
          error_type: 'feedback_submission',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          component: 'FeedbackSender'
        });

        performance.trackOperation('feedback_submit', 'error', window.performance.now() - startTime, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    }
    
    // Reset form
    setFeedbackOption(null);
    setFeedbackText('');
  };

  return (
    <form className={styles.feedbackForm} onSubmit={handleSubmit}>
      <div className={styles.feedbackContainer}>
        <p className={styles.feedbackQuestion} id="feedback-question">{texts.question}</p>
        
        <div className={styles.radioGroup} role="radiogroup" aria-labelledby="feedback-question">
          <div className="usa-radio">
            <input
              className="usa-radio__input usa-radio__input--tile"
              id="feedback-yes"
              type="radio"
              name="page-helpful"
              value="yes"
              checked={feedbackOption === 'yes'}
              onChange={handleOptionChange}
            />
            <label className="usa-radio__label" htmlFor="feedback-yes">
              {texts.yesLabel}
            </label>
          </div>
          
          <div className="usa-radio">
            <input
              className="usa-radio__input usa-radio__input--tile"
              id="feedback-no"
              type="radio"
              name="page-helpful"
              value="no"
              checked={feedbackOption === 'no'}
              onChange={handleOptionChange}
            />
            <label className="usa-radio__label" htmlFor="feedback-no">
              {texts.noLabel}
            </label>
          </div>
        </div>
      </div>
      
      {feedbackOption && (
        <FeedbackTextArea
          value={feedbackText}
          onChange={handleTextChange}
          maxCharacters={MAX_CHARACTERS}
          texts={texts}
          assessingDeptUrl={assessingDeptUrl}
          rows={6}
          className={styles.feedbackContainer}
          submitButton={
            <IconButton 
              text={texts.submitButton}
              variant="primary"
              type="submit"
            />
          }
        />
      )}
    </form>
  );
};

export default FeedbackSender; 