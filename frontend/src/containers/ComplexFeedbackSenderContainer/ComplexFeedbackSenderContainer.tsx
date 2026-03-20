import React, { useState, useCallback } from 'react';
import { ComplexFeedbackSender } from '@components/ComplexFeedbackSender';
import { usePropertyFeedback } from '@hooks/usePropertyFeedback';
import { useModal } from '@hooks/useModal';
import { getComponentText } from '@utils/contentMapper';
import type { GeneralFeedbackData } from '@types/index';
import styles from './ComplexFeedbackSenderContainer.module.scss';

export interface ComplexFeedbackSenderContainerProps {
  /**
   * Optional search query to include with feedback (determines if from search results vs welcome page)
   */
  searchQuery?: string;
  
  /**
   * Optional callback URL for the "Assessing department" link
   */
  assessingDeptUrl?: string;
  
  /**
   * Optional callback for successful submission
   */
  onSuccess?: () => void;
  
  /**
   * Optional callback for submission errors
   */
  onError?: (error: Error) => void;
  
  /**
   * Optional custom link text (defaults to content from CMS)
   */
  linkText?: string;
  
  /**
   * Visual variant of the link (default: 'light' for light blue, 'default' for standard blue)
   */
  variant?: 'light' | 'default';
}

/**
 * Container component that manages ComplexFeedbackSender modal state and backend integration
 */
export const ComplexFeedbackSenderContainer: React.FC<ComplexFeedbackSenderContainerProps> = ({
  searchQuery,
  assessingDeptUrl = '#',
  onSuccess,
  onError,
  linkText,
  variant = 'light'
}) => {
  const { sendFeedback } = usePropertyFeedback();
  const { isOpen, open, close } = useModal();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get text content from content management system
  const texts = getComponentText('ComplexFeedbackSender');
  const defaultLinkText = linkText || 'Having trouble? Give us your feedback';

  const handleSubmit = useCallback(async (data: { feedback: string; issueType?: string }) => {
    if (!data.issueType) {
      const error = new Error('Please select an issue type');
      onError?.(error);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const feedbackData: GeneralFeedbackData = {
        type: 'general',
        issueType: data.issueType as 'not-found' | 'bug' | 'suggestion',
        feedbackMessage: data.feedback.trim() || undefined,
        searchQuery: searchQuery?.trim() || undefined,
      };

      await sendFeedback(feedbackData);
      
      // Call success callback if provided
      onSuccess?.();
      
      // Keep modal open to show success message (user closes via "Close form" button)
    } catch (error) {
      console.error('[ComplexFeedbackSenderContainer] Error submitting feedback:', error);
      const errorObj = error instanceof Error ? error : new Error('Failed to submit feedback');
      onError?.(errorObj);
      throw errorObj; // Re-throw to let ComplexFeedbackSender handle UI state
    } finally {
      setIsSubmitting(false);
    }
  }, [sendFeedback, searchQuery, onSuccess, onError, close]);

  return (
    <>
      {/* Feedback trigger link */}
      <button
        type="button"
        className={`${styles.feedbackTrigger} ${variant === 'default' ? styles.default : styles.light}`}
        onClick={open}
        aria-label="Open feedback modal"
      >
        <img 
          src="/cob-uswds/img/usa-icons/comment.svg" 
          alt="Comment icon" 
          className={styles.commentIcon}
        />
        {defaultLinkText}
      </button>

      {/* Feedback modal */}
      {isOpen && (
        <ComplexFeedbackSender
          isOpen={isOpen}
          onClose={close}
          onSubmit={handleSubmit}
          assessingDeptUrl={assessingDeptUrl}
          texts={texts}
          isSubmitting={isSubmitting}
        />
      )}
    </>
  );
};

export default ComplexFeedbackSenderContainer;
