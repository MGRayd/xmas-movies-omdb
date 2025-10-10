// Thread status options
export type ThreadStatus = 'open' | 'resolved' | 'abandoned';

// Thread timeline event
export interface ThreadTimelineEvent {
  id: string;
  date: string; // ISO format date
  content: string;
  sessionId?: string; // Optional reference to a session
}

// Thread data model
export interface Thread {
  id: string;
  title: string;
  slug?: string;
  description: string;
  status: ThreadStatus;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  published: boolean;
  
  // Timeline events
  events?: ThreadTimelineEvent[];
  
  // Relations
  linkedSessions?: string[];
  linkedNpcs?: string[];
  linkedLocations?: string[];
  linkedMonsters?: string[];
}

// Thread form state for editors
export interface ThreadFormState {
  title: string;
  slug: string;
  description: string;
  status: ThreadStatus;
  published: boolean;
  events: ThreadTimelineEvent[];
  linkedSessions: string[];
  linkedNpcs: string[];
  linkedLocations: string[];
  linkedMonsters: string[];
}
