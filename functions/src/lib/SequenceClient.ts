import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Get the next sequence number for abatement applications for a given year.
 * Sequence numbers start at 10001 each year and increment atomically.
 *
 * @param year The fiscal year for the abatement application.
 * @return The next sequence number for the year.
 */
export const getNextAbatementSequenceNumber = async (year: number): Promise<number> => {
  const sequenceDocRef = db.collection("abatement_sequences").doc(year.toString());

  try {
    // Use a transaction to atomically increment the counter
    const sequenceNumber = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(sequenceDocRef);

      let currentCounter: number;

      if (!doc.exists) {
        // First sequence number for this year - initialize at 10001
        currentCounter = 10001;
        transaction.set(sequenceDocRef, {
          counter: currentCounter + 1,
          year: year,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        // Increment existing counter
        const data = doc.data();
        currentCounter = data?.counter || 10001;
        transaction.update(sequenceDocRef, {
          counter: currentCounter + 1,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return currentCounter;
    });

    console.log(`[SequenceClient] Generated sequence number ${sequenceNumber} for year ${year}`);
    return sequenceNumber;
  } catch (error) {
    console.error(`[SequenceClient] Error generating sequence number for year ${year}:`, error);
    throw new Error(`Failed to generate sequence number: ${error}`);
  }
};

/**
 * Get the current counter value for a given year without incrementing.
 * Useful for debugging or admin purposes.
 *
 * @param year The fiscal year to check.
 * @return The current counter value, or null if not initialized.
 */
export const getCurrentCounter = async (year: number): Promise<number | null> => {
  const sequenceDocRef = db.collection("abatement_sequences").doc(year.toString());

  try {
    const doc = await sequenceDocRef.get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return data?.counter || null;
  } catch (error) {
    console.error(`[SequenceClient] Error getting current counter for year ${year}:`, error);
    throw new Error(`Failed to get current counter: ${error}`);
  }
};

