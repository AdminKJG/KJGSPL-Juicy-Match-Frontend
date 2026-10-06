export const initialConfig = {
  minimumAge: 21,
  dailyCap: 10,
  demo: false,
  features: {
    voice: true,
    audioCalls: true,
    videoCalls: true,
    events: true,
    maps: true,
  },
  plans: [],
  masters: {},
};

export const demoActors = [];

export const initialMe = {
  id: "",
  email: "",
  createdAt: new Date().toISOString(),
  status: "pending",
  profile: {
    pseudonym: "",
    age: 21,
    gender: "woman",
    acceptedGenders: ["man", "woman"],
    minAge: 21,
    maxAge: 60,
    preferredAge: [21, 45],
    bio: "",
    interests: [],
    zone: "central",
    acceptedZones: ["central"],
    intent: "meaningful-connection",
    acceptedIntents: ["meaningful-connection"],
    discoverable: true,
    incognito: false,
    liveUntil: null,
    channels: {
      text: true,
      voice: true,
      video: true,
    },
    avatarUrl: "",
    photos: [],
  },
};

export const initialDiscoverProfiles = [];
export const initialConnections = [];
export const initialMessages = {};
export const initialDesires = {
  revision: 1,
  questions: [],
  answers: {
    note: "",
    spark: [],
    pace: [],
    setting: [],
    travel: [],
  },
};
export const initialPolicies = [];
export const initialCities = [];
export const initialPassportPlans = [];
export const initialEvents = [];
export const initialCatalog = { items: [] };
export const initialNotifications = [];
