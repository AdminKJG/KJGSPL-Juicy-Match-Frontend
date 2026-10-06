import { request } from "./api";

export const desiresService = {
  // 10.1 Get Desires Questionnaire & Answers
  getDesires: async () => {
    return await request("/desires", { auth: true });
  },

  // 10.1 Save Desires Answers
  saveDesires: async (revision, answers) => {
    return await request("/desires", {
      method: "POST",
      body: { revision, answers },
      auth: true,
    });
  },

  // 10.2 Speech Status
  getSpeechStatus: async () => {
    return await request("/speech", { auth: true });
  },

  // 10.2 Voice Transcription (ASR Speech-to-Text)
  transcribeAudio: async (audioBase64, language = "en", consent = true) => {
    return await request("/desires/transcribe", {
      method: "POST",
      body: { audio: audioBase64, language, consent },
      auth: true,
    });
  },
};
