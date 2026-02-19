export interface InstrumentTrack {
  id: string;
  name: string; // e.g., "Drums", "Bass", "Vocals", "Guitar"
  uri: any; // require('path/to/file') or remote URL
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  tracks: InstrumentTrack[];
}

export const SONGS: Song[] = [
  {
    id: '1',
    title: 'Demo Song',
    artist: 'Demo Artist',
    tracks: [
      {
        id: 't1',
        name: 'Drums',
        // In a real app, these would be separate audio files
        // For demo purposes, we're using a placeholder. 
        // You should replace these with actual multi-track audio files.
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 
      },
      {
        id: 't2',
        name: 'Bass',
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      },
      {
        id: 't3',
        name: 'Guitar',
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      },
      {
        id: 't4',
        name: 'Vocals',
        uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      },
    ],
  },
];
