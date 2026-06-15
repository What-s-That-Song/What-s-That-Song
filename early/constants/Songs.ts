export interface InstrumentTrack {
  id: string;
  name: string; // e.g., "Drums", "Bass", "Vocals", "Melody"
  uri: any; // require('path/to/file') or remote URL
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  tracks: InstrumentTrack[];
}

// Les chansons sont désormais chargées depuis le backend Go (GET /songs),
// qui sépare automatiquement les instruments à l'upload. Voir hooks/useGame.ts.
