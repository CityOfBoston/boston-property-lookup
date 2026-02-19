import { Meta, StoryObj } from '@storybook/react';
import ComplexFeedbackSender from './ComplexFeedbackSender';

// Default text content for stories
const defaultTexts = {
  headerTitle: 'Help us improve the site',
  issueQuestion: 'What was the main issue you faced with the search?',
  issueOption1: "Couldn't find what I was looking for",
  issueOption2: 'Something went wrong (bug or error)',
  issueOption3: 'I have a suggestion to improve it',
  promptTitle: 'Share your feedback',
  promptOptional: '(Optional)',
  disclaimer: 'Do not include sensitive information such as account numbers or personal details.',
  submitButton: 'Submit feedback',
  cancelButton: 'Cancel',
  characterCount: '{count} characters allowed',
  characterRemaining: '{count} characters remaining',
  contactInfo: 'We use this feedback to improve our website. If you need assistance, please contact the',
  departmentLinkText: 'Assessing department',
  closeButtonAriaLabel: 'Close feedback modal',
};

const meta = {
  title: 'Components/ComplexFeedbackSender',
  component: ComplexFeedbackSender,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
          A complex feedback modal component that allows users to provide detailed feedback on the site.
          
          ## Features
          - Modal overlay with backdrop click to close
          - "Help us improve the site" header
          - Large text area for detailed feedback
          - Character counter (500 characters max, bumped up from initial 200 characters to match boston.gov zencity forms)
          - Close button with accessibility support
          - Analytics tracking integration
          - Error handling
          - Keyboard navigation (ESC to close)
          - Responsive design
        `,
      },
    },
  },
  args: {
    texts: defaultTexts, // Default texts for all stories
    isOpen: true,
    onClose: () => console.log('Modal closed'),
  },
} satisfies Meta<typeof ComplexFeedbackSender>;

export default meta;
type Story = StoryObj<typeof ComplexFeedbackSender>;

export const Default: Story = {
  args: {
    onSubmit: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      alert(`Complex feedback submitted:\nIssue Type: ${data.issueType || 'None selected'}\nFeedback: ${data.feedback}`);
    },
    assessingDeptUrl: '#',
  },
};

export const WithSubmitting: Story = {
  args: {
    onSubmit: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Complex feedback submitted:\nIssue Type: ${data.issueType || 'None selected'}\nFeedback: ${data.feedback}`);
    },
    assessingDeptUrl: '#',
    isSubmitting: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'This variant demonstrates the component in a submitting state with disabled submit button.',
      },
    },
  },
};

export const WithCustomAssessingLink: Story = {
  args: {
    onSubmit: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Complex feedback submitted:\nIssue Type: ${data.issueType || 'None selected'}\nFeedback: ${data.feedback}`);
    },
    assessingDeptUrl: 'https://www.boston.gov/departments/assessing',
  },
  parameters: {
    docs: {
      description: {
        story: 'This variant demonstrates the component with a custom link to the Assessing department.',
      },
    },
  },
};

export const WithError: Story = {
  args: {
    onSubmit: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('Failed to submit complex feedback');
    },
    assessingDeptUrl: '#',
  },
  parameters: {
    docs: {
      description: {
        story: 'This variant demonstrates error handling when feedback submission fails.',
      },
    },
  },
};

export const WithCustomTexts: Story = {
  args: {
    onSubmit: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Complex feedback submitted:\nIssue Type: ${data.issueType || 'None selected'}\nFeedback: ${data.feedback}`);
    },
    assessingDeptUrl: '#',
    texts: {
      ...defaultTexts,
      headerTitle: 'Share Your Experience',
      promptTitle: 'Tell us about your experience',
      submitButton: 'Send your thoughts',
      contactInfo: 'Need more help? Reach out to the',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'This variant demonstrates the component with customized text content.',
      },
    },
  },
};

export const LongFeedbackExample: Story = {
  args: {
    onSubmit: async (data) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Complex feedback submitted:\nIssue Type: ${data.issueType || 'None selected'}\nFeedback: ${data.feedback}`);
    },
    assessingDeptUrl: '#',
  },
  play: async ({ canvasElement }) => {
    // Pre-fill with some example text to show character counting
    const textarea = canvasElement.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const exampleText = 'This is an example feedback message that demonstrates how the character counter works. Users can provide feedback about their experience with the site.';
      textarea.value = exampleText;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'This variant shows the component with pre-filled text to demonstrate the character counter functionality.',
      },
    },
  },
};
