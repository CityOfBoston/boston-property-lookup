/**
 * @file The FirebaseConfig file is used to manage the Firebase configuration, callable functions,
 * Firebase Authentication, Firebase App Check, Firebase Emulator, and initialize the Firebase app.
 */
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { PropertyDetailsData, PropertySearchResults, MasterParcelOverviewResults,
  FeedbackData, StandardResponse, PdfGenerationRequest, PdfGenerationResponse } from '../types';

// Firebase configuration.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase app.
const app = initializeApp(firebaseConfig);

// Initialize Firebase Functions.
const functions = getFunctions(app);

/**
 * Helper function to create and execute callable functions with consistent error handling
 * @param functionName - The name of the callable function
 * @param data - The data to send to the function
 * @returns The data from the successful response
 */
async function callFunction<TInput, TOutput>(
  functionName: string, 
  data: TInput,
  timeoutMs = 300000
): Promise<TOutput> {
  const callable = httpsCallable<TInput, StandardResponse<TOutput>>(
    functions,
    functionName,
    { timeout: timeoutMs }
  );
  
  const result = await callable(data);
  
  if (result.data.status === 'success') {
    if (result.data.data === undefined) {
      throw new Error('No data returned from function');
    }
    return result.data.data;
  }
  
  throw new Error(result.data.message);
}

// Backend callable functions
export const storePropertyFeedback = async (feedback: FeedbackData): Promise<null> => {
  return callFunction<FeedbackData, null>('storePropertyFeedback', feedback);
};

export const fetchPropertyDetailsByParcelId = async (parcelId: string, date?: string): Promise<PropertyDetailsData> => {
  return callFunction<{ parcelId: string; date?: string }, PropertyDetailsData>('fetchPropertyDetailsByParcelId', { parcelId, date });
};

export const fetchPropertySummariesByParcelIds = async (parcelIds: string[]): Promise<PropertySearchResults> => {
  return callFunction<{ parcelIds: string[] }, PropertySearchResults>('fetchPropertySummariesByParcelIds', { parcelIds });
};

export const fetchMasterParcelOverviewByParcelId = async (parcelId: string): Promise<MasterParcelOverviewResults> => {
  return callFunction<{ parcelId: string }, MasterParcelOverviewResults>('fetchMasterParcelOverviewByParcelId', { parcelId });
};

export const getCurrentParcelIdAddressPairings = async (): Promise<{ compressedData: string; fileName: string }> => {
  return callFunction<{}, { compressedData: string; fileName: string }>('getCurrentParcelIdAddressPairings', {});
};

export const generatePdf = async (request: PdfGenerationRequest): Promise<PdfGenerationResponse> => {
  console.log('[firebaseConfig] Calling generatePdf with request:', request);
  const result = await callFunction<PdfGenerationRequest, PdfGenerationResponse>('generatePdf', request);
  console.log('[firebaseConfig] generatePdf response:', result);
  return result;
};
