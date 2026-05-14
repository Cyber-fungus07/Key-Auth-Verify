import { TypingWord } from '../modals/typing.model.js';
import { User } from '../modals/auth.modal.js';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

async function callEnroll(username, samples) {
  const response = await fetch(`${FASTAPI_URL}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: username, samples }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || `Enroll failed: ${response.status}`);
  }
  return await response.json();
}

async function callVerify(username, keystrokes) {
  const response = await fetch(`${FASTAPI_URL}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: username, keystrokes }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || `Verify failed: ${response.status}`);
  }
  return await response.json();
}

export async function submitTypingData(req, res) {
  try {
    const { logs, isEnrollment } = req.body;
    const userId   = req.user.id;
    const username = req.user.username;

    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ message: 'Invalid logs data' });
    }

    // Save raw keystrokes to MongoDB
    for (const log of logs) {
      const { word, data } = log;
      if (!word || !data || !Array.isArray(data)) continue;
      const valid = data
        .map(k => ({ word, key: k.key, keydown: k.keydown, keyup: k.keyup, holdTime: k.holdTime }))
        .filter(k => k.key && k.keydown != null);
      if (valid.length > 0) {
        await TypingWord.create({ user: userId, data: valid });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let mlResult = null;

    // if (isEnrollment) {
    //   // Each log is one full attempt — wrap in array for FastAPI's list[list[WordRecord]]
    //   const samples = logs.map(log => [log]);
    //   try {
    //     mlResult = await callEnroll(username, samples);
    //   }
    //
    if (isEnrollment) {
      // Wrap each flat log into its own array → becomes list[list[WordRecord]] for FastAPI
      const samples = logs.map(log => [log]);
      try {
        mlResult = await callEnroll(username, samples);
      } catch (err) {
        console.error('Enroll failed:', err.message);
        return res.status(422).json({ message: `Enrollment failed: ${err.message}` });
      }
      await User.findByIdAndUpdate(userId, { isEnrolled: true, typingRounds: 5 });

    } else {
      if (!user.isEnrolled) {
        return res.status(404).json({
          message: 'No biometric profile found. Please complete registration first.',
        });
      }
      try {
        mlResult = await callVerify(username, logs);
      } catch (err) {
        console.error('Verify failed:', err.message);
        mlResult = { verified: false, confidence: 0, predicted_user: '', message: err.message };
      }
      await User.findByIdAndUpdate(userId, { $inc: { typingRounds: 1 } });
    }

    // return res.status(201).json({
    //   message:        mlResult?.message        || 'Typing data submitted',
    //   savedWords:     logs.length,
    //   verified:       isEnrollment
    //                     ? (mlResult?.enrolled  || false)
    //                     : (mlResult?.verified  || false),
    //   confidence:     mlResult?.confidence     || 0,
    //   predicted_user: mlResult?.predicted_user || '',
    // });
    return res.status(201).json({
      message:        mlResult?.message        || 'Typing data submitted',
      savedWords:     logs.length,
      // Use 'enrolled' for enrollment, 'verified' for login:
      verified:       isEnrollment
                        ? (mlResult?.enrolled  || false)
                        : (mlResult?.verified  || false),
      confidence:     mlResult?.confidence     || 0,
      predicted_user: mlResult?.predicted_user || '',
  });

  } catch (err) {
    console.error('Error in submitTypingData:', err);
    return res.status(500).json({ error: `Server Error: ${err.message}` });
  }
}