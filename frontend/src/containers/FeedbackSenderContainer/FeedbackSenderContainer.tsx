import { usePropertyFeedback } from '@hooks/usePropertyFeedback';
import { FeedbackSender, FeedbackSenderProps } from '@components/FeedbackSender/FeedbackSender';
import { useCallback, useEffect } from 'react';
import type { FeedbackData } from '../../types';
import { getComponentText } from '@utils/contentMapper';
import styles from './FeedbackSenderContainer.module.scss';

interface FeedbackSenderContainerProps extends Omit<FeedbackSenderProps, 'onSubmit'> {
  /**
   * Optional callback when feedback is successfully sent
   */
  onSuccess?: () => void;
  
  /**
   * Optional callback when feedback fails to send
   */
  onError?: (error: Error) => void;
}

export const FeedbackSenderContainer = ({
  onSuccess,
  onError,
  ...feedbackSenderProps
}: FeedbackSenderContainerProps) => {
  const { isLoading, error, isSuccess, sendFeedback } = usePropertyFeedback();

  // Handle success callback
  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  // Handle error callback
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handleSubmit = useCallback(async (data: { 
    helpful: boolean; 
    feedback?: string; 
    parcelId?: string 
  }) => {
    if (!data.parcelId) {
      console.warn('[FeedbackSenderContainer] No parcelId provided, skipping feedback submission');
      return;
    }

    const feedbackData: FeedbackData = {
      type: 'property',
      parcelId: data.parcelId,
      hasPositiveSentiment: data.helpful,
      feedbackMessage: data.feedback,
    };

    try {
      await sendFeedback(feedbackData);
    } catch (err) {
      // Error is already handled by the hook and passed to onError via useEffect
      console.error('[FeedbackSenderContainer] Error in handleSubmit:', err);
    }
  }, [sendFeedback]);

  if (isLoading) {
    return (
      <div className={styles.spinner} aria-label="Sending feedback..." />
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.successMessage}>
        Thank you for your feedback! We're actively reviewing it to improve the user experience.
      </div>
    );
  }

  const feedbackContent = getComponentText('FeedbackSender') as Required<FeedbackSenderProps['texts']>;

  return (
    <FeedbackSender
      {...feedbackSenderProps}
      texts={feedbackContent}
      onSubmit={handleSubmit}
    />
  );
}; 