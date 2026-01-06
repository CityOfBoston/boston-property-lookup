import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {FeedbackData} from "../types";

export const db = admin.firestore();
export const feedbackDataRef = db.collection("feedback");

/**
 * Given feedback data, add it to the feedback collection in Firestore along
 * with a timestamp of the current date and time as the createdAt field.
 *
 * @param feedbackData The feedback data to add to the feedback collection.
 */
export const addFeedbackData = async (feedbackData: FeedbackData): Promise<void> => {
  const identifier = feedbackData.type === "property" ?
    `parcelId: ${feedbackData.parcelId}` :
    `issueType: ${feedbackData.issueType}`;

  console.log(`[FirestoreClient] Adding feedback data for ${identifier}`);

  try {
    const feedbackDoc = {
      ...feedbackData,
      createdAt: Timestamp.now(),
    };

    await feedbackDataRef.add(feedbackDoc);

    console.log(`[FirestoreClient] Successfully added feedback data for ${identifier}`);
  } catch (error) {
    console.error(`[FirestoreClient] Error adding feedback data for ${identifier}`, error);
    throw error;
  }
};

/**
 * Retrieve all feedback data from the feedback collection in Firestore.
 * Includes document IDs and converts timestamps to ISO strings.
 *
 * @return An array of feedback documents with all fields.
 */
export const getAllFeedbackData = async (): Promise<Array<Record<string, any>>> => {
  console.log("[FirestoreClient] Fetching all feedback data from Firestore");

  try {
    const snapshot = await feedbackDataRef.get();

    if (snapshot.empty) {
      console.log("[FirestoreClient] No feedback documents found");
      return [];
    }

    const feedbackData = snapshot.docs.map((doc) => {
      const data = doc.data();

      // Convert Firestore Timestamp to ISO string for easier CSV export
      if (data.createdAt && data.createdAt.toDate) {
        data.createdAt = data.createdAt.toDate().toISOString();
      }

      return {
        id: doc.id,
        ...data,
      };
    });

    console.log(`[FirestoreClient] Successfully fetched ${feedbackData.length} feedback documents`);
    return feedbackData;
  } catch (error) {
    console.error("[FirestoreClient] Error fetching feedback data", error);
    throw error;
  }
};
