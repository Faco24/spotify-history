// ─── Data Processor ────────────────────────────────────────────────────────
// Parses, merges, deduplicates, and pre-computes all aggregations from
// Spotify Extended Streaming History JSON files.
// All heavy lifting happens once at load time; components just read results.

const MIN_MS = 30_000; // ignore plays under 30s

// Legacy static map removed — genre labels are now fetched from the Anthropic API
// via computeGenreData() which is called after processData() with the API response.
const _PLACEHOLDER = {
  // ── Argentine / Chilean / Latin Rock ──────────────────────────────────────
  'Los Enanitos Verdes': 'Argentine Rock',
  'Los Rodriguez': 'Argentine Rock',
  'Soda Stereo': 'Argentine Rock',
  'Gustavo Cerati': 'Argentine Rock',
  'Fito Páez': 'Argentine Rock',
  'Andrés Calamaro': 'Argentine Rock',
  'Charly García': 'Argentine Rock',
  'Divididos': 'Argentine Rock',
  'Patricio Rey y sus Redonditos de Ricota': 'Argentine Rock',
  'Los Redondos': 'Argentine Rock',
  'Attaque 77': 'Argentine Punk',
  'Babasónicos': 'Argentine Rock',
  'Pedro Aznar': 'Argentine Rock',
  'Spinetta': 'Argentine Rock',
  'Luis Alberto Spinetta': 'Argentine Rock',
  'Serú Girán': 'Argentine Rock',
  'Virus': 'Argentine Rock',
  'Los Abuelos de la Nada': 'Argentine Rock',
  'Los Ratones Paranoicos': 'Argentine Rock',
  'Bersuit Vergarabat': 'Argentine Rock',
  'Catupecu Machu': 'Argentine Rock',
  'Massacre': 'Argentine Rock',
  'Alex Anwandter': 'Chilean Indie',
  'De Saloon': 'Chilean Rock',
  'Astro': 'Chilean Indie',
  'Los Tres': 'Chilean Rock',
  'La Ley': 'Chilean Rock',
  'Lucybell': 'Chilean Rock',
  'Joe Vasconcellos': 'Chilean Rock',
  'Javiera Mena': 'Chilean Synthpop',
  'Gepe': 'Chilean Folk',
  'Mon Laferte': 'Latin Pop',
  'Julieta Venegas': 'Latin Pop',
  'Natalia Lafourcade': 'Latin Folk',
  'Luis Miguel': 'Latin Pop',
  'Shakira': 'Latin Pop',
  'Enrique Iglesias': 'Latin Pop',
  'Alejandro Sanz': 'Latin Pop',
  'Marc Anthony': 'Salsa',
  'Ricky Martin': 'Latin Pop',
  'Pablo Alborán': 'Latin Pop',
  'Eros Ramazzotti': 'Italian Pop',
  'Roxette': 'Pop Rock',
  'ABBA': 'Pop',
  'Calle 13': 'Latin Alternative',
  'Residente': 'Latin Alternative',
  'Bad Bunny': 'Reggaeton',
  'J Balvin': 'Reggaeton',
  'Daddy Yankee': 'Reggaeton',
  'Ozuna': 'Reggaeton',
  'Maluma': 'Reggaeton',
  'Rauw Alejandro': 'Reggaeton',
  'CA7RIEL': 'Argentine Trap',
  'CA7RIEL & Paco Amoroso': 'Argentine Trap',
  'Paco Amoroso': 'Argentine Trap',
  'Wos': 'Argentine Rap',
  'Dillom': 'Argentine Rap',
  'Trueno': 'Argentine Rap',
  'Nicki Nicole': 'Argentine Trap',
  'Paulo Londra': 'Argentine Trap',
  'Sean Paul': 'Dancehall',
  'Cuco': 'Indie Pop',
  // ── Grunge / Alternative Metal ─────────────────────────────────────────────
  'Pearl Jam': 'Grunge',
  'Nirvana': 'Grunge',
  'Soundgarden': 'Grunge',
  'Alice in Chains': 'Grunge',
  'Stone Temple Pilots': 'Grunge',
  'Mudhoney': 'Grunge',
  'Eddie Vedder': 'Grunge',
  'Screaming Trees': 'Grunge',
  'Deftones': 'Alternative Metal',
  'Tool': 'Progressive Metal',
  'A Perfect Circle': 'Alternative Metal',
  'Puscifer': 'Alternative Rock',
  'Team Sleep': 'Post-Rock',
  'Rage Against the Machine': 'Rap Metal',
  'Audioslave': 'Alternative Rock',
  'Chris Cornell': 'Grunge',
  'System of a Down': 'Alternative Metal',
  'Korn': 'Nu-Metal',
  'Linkin Park': 'Nu-Metal',
  'Incubus': 'Alternative Rock',
  'Queens of the Stone Age': 'Stoner Rock',
  'The Mars Volta': 'Progressive Rock',
  'At the Drive-In': 'Post-Hardcore',
  'Thrice': 'Post-Hardcore',
  'Brand New': 'Post-Hardcore',
  'Thursday': 'Post-Hardcore',
  // ── Post-Punk / New Wave / Britpop ─────────────────────────────────────────
  'The Police': 'New Wave',
  'Talking Heads': 'New Wave',
  'Elvis Costello': 'New Wave',
  'Television': 'Post-Punk',
  'Gang of Four': 'Post-Punk',
  'Wire': 'Post-Punk',
  'Joy Division': 'Post-Punk',
  'New Order': 'Post-Punk',
  'The Cure': 'Post-Punk',
  'Bauhaus': 'Post-Punk',
  'Siouxsie and the Banshees': 'Post-Punk',
  'Echo & the Bunnymen': 'Post-Punk',
  'The Smiths': 'Post-Punk',
  'Morrissey': 'Post-Punk',
  'Depeche Mode': 'Synth-Pop',
  'Kraftwerk': 'Synth-Pop',
  'Gary Numan': 'Synth-Pop',
  'Oasis': 'Britpop',
  'Blur': 'Britpop',
  'Pulp': 'Britpop',
  'Suede': 'Britpop',
  'Elastica': 'Britpop',
  'The Verve': 'Britpop',
  'Supergrass': 'Britpop',
  'Damon Albarn': 'Britpop',
  'Gorillaz': 'Indie Pop',
  'The Strokes': 'Post-Punk Revival',
  'Arctic Monkeys': 'Post-Punk Revival',
  'Interpol': 'Post-Punk Revival',
  'Franz Ferdinand': 'Post-Punk Revival',
  'Editors': 'Post-Punk Revival',
  'Bloc Party': 'Post-Punk Revival',
  'The Libertines': 'Post-Punk Revival',
  'The White Stripes': 'Garage Rock',
  'Jack White': 'Garage Rock',
  'The Black Keys': 'Blues Rock',
  'Cage the Elephant': 'Indie Rock',
  'Foals': 'Math Rock',
  'Vampire Weekend': 'Indie Pop',
  // ── Indie Rock / Indie Pop ─────────────────────────────────────────────────
  'Radiohead': 'Art Rock',
  'Thom Yorke': 'Art Rock',
  'Atoms for Peace': 'Art Rock',
  'Tame Impala': 'Psychedelic Pop',
  'Mac DeMarco': 'Indie Pop',
  'MGMT': 'Indie Pop',
  'Weezer': 'Indie Rock',
  'Pavement': 'Indie Rock',
  'Built to Spill': 'Indie Rock',
  'Modest Mouse': 'Indie Rock',
  'Death Cab for Cutie': 'Indie Rock',
  'The National': 'Indie Rock',
  'Wilco': 'Indie Rock',
  'Spoon': 'Indie Rock',
  'The War on Drugs': 'Indie Rock',
  'Arcade Fire': 'Indie Rock',
  'LCD Soundsystem': 'Dance-Punk',
  'Counting Crows': 'Indie Rock',
  'R.E.M.': 'Alternative Rock',
  'Pixies': 'Alternative Rock',
  'Dinosaur Jr.': 'Alternative Rock',
  'Sebadoh': 'Indie Rock',
  'Guided by Voices': 'Indie Rock',
  'Mitski': 'Indie Rock',
  'Soccer Mommy': 'Indie Rock',
  'Snail Mail': 'Indie Rock',
  'Japanese Breakfast': 'Indie Pop',
  'Lorde': 'Indie Pop',
  'Billie Eilish': 'Indie Pop',
  'Clairo': 'Bedroom Pop',
  'Beabadoobee': 'Bedroom Pop',
  'Girl in Red': 'Bedroom Pop',
  'Phoebe Bridgers': 'Indie Folk',
  'Julien Baker': 'Indie Folk',
  'Lucy Dacus': 'Indie Folk',
  'boygenius': 'Indie Folk',
  'Beth Ditto': 'Indie Rock',
  'Ilsey': 'Indie Pop',
  'BRÍET': 'Indie Pop',
  'Rhye': 'Dream Pop',
  // ── Shoegaze / Dream Pop ───────────────────────────────────────────────────
  'My Bloody Valentine': 'Shoegaze',
  'Slowdive': 'Shoegaze',
  'Ride': 'Shoegaze',
  'Loveless': 'Shoegaze',
  'Mazzy Star': 'Dream Pop',
  'Beach House': 'Dream Pop',
  'Cigarettes After Sex': 'Dream Pop',
  'Cocteau Twins': 'Dream Pop',
  // ── Indie Folk / Americana ─────────────────────────────────────────────────
  'Zach Bryan': 'Americana',
  'Tyler Childers': 'Americana',
  'Sturgill Simpson': 'Americana',
  'Jason Isbell': 'Americana',
  'John Prine': 'Folk',
  'Townes Van Zandt': 'Folk',
  'Gillian Welch': 'Americana',
  'Hozier': 'Folk Pop',
  'Mt. Joy': 'Indie Folk',
  'Mumford & Sons': 'Folk Pop',
  'The Lumineers': 'Folk Pop',
  'Of Monsters and Men': 'Indie Folk',
  'Iron & Wine': 'Indie Folk',
  'Sufjan Stevens': 'Indie Folk',
  'Fleet Foxes': 'Indie Folk',
  'Bon Iver': 'Indie Folk',
  'Big Thief': 'Indie Folk',
  'Adrianne Lenker': 'Indie Folk',
  'Angel Olsen': 'Indie Folk',
  'Sharon Van Etten': 'Indie Folk',
  'Kevin Morby': 'Indie Folk',
  'Kurt Vile': 'Indie Rock',
  'Phosphorescent': 'Indie Folk',
  'Bright Eyes': 'Indie Folk',
  'Elliott Smith': 'Indie Folk',
  'Nick Drake': 'Folk',
  'Mount Eerie': 'Indie Folk',
  'Phil Elverum': 'Indie Folk',
  'Mari Froes': 'Indie Folk',
  'Bob Dylan': 'Folk Rock',
  'Neil Young': 'Folk Rock',
  'Joni Mitchell': 'Folk',
  'Leonard Cohen': 'Folk',
  'Simon & Garfunkel': 'Folk',
  'Cat Stevens': 'Folk',
  // ── Post-Rock / Ambient / Neoclassical ────────────────────────────────────
  'Mogwai': 'Post-Rock',
  'Godspeed You! Black Emperor': 'Post-Rock',
  'Sigur Rós': 'Post-Rock',
  'Explosions in the Sky': 'Post-Rock',
  'Russian Circles': 'Post-Rock',
  'Tortoise': 'Post-Rock',
  'Slint': 'Math Rock',
  'Max Richter': 'Neoclassical',
  'Ólafur Arnalds': 'Neoclassical',
  'Nils Frahm': 'Neoclassical',
  'Jóhann Jóhannsson': 'Neoclassical',
  'Brian Eno': 'Ambient',
  'Stars of the Lid': 'Ambient',
  'William Basinski': 'Ambient',
  // ── Electronic / IDM / Downtempo ──────────────────────────────────────────
  'Boards of Canada': 'IDM',
  'Aphex Twin': 'IDM',
  'Four Tet': 'IDM',
  'Caribou': 'Psychedelic Electronic',
  'Bonobo': 'Downtempo',
  'Tycho': 'Chillwave',
  'Thievery Corporation': 'Downtempo',
  'Air': 'French Electronic',
  'DJ Shadow': 'Trip-Hop',
  'Massive Attack': 'Trip-Hop',
  'Portishead': 'Trip-Hop',
  'Tricky': 'Trip-Hop',
  'Burial': 'UK Garage',
  'James Blake': 'Post-Dubstep',
  'The xx': 'Indie Electronic',
  'Jamie xx': 'UK Garage',
  'Disclosure': 'UK Garage',
  'SBTRKT': 'UK Bass',
  'Bicep': 'House',
  'DJ Koze': 'Deep House',
  'Phonique': 'Deep House',
  'Ricardo Villalobos': 'Minimal Techno',
  'Âme': 'Deep House',
  'Dixon': 'Deep House',
  'Kompakt': 'Minimal Techno',
  'Daft Punk': 'French House',
  'Justice': 'French House',
  'Chemical Brothers': 'Big Beat',
  'Fatboy Slim': 'Big Beat',
  'Prodigy': 'Big Beat',
  'The Prodigy': 'Big Beat',
  'Underworld': 'Techno',
  'Orbital': 'Techno',
  'Calvin Harris': 'EDM',
  'Avicii': 'EDM',
  'Deadmau5': 'EDM',
  'Skrillex': 'Dubstep',
  'Diplo': 'EDM',
  // ── Nu-Disco / Funk ────────────────────────────────────────────────────────
  'Jungle': 'Nu-Disco',
  'Parcels': 'Nu-Disco',
  'Franc Moody': 'Nu-Disco',
  'Chromeo': 'Nu-Disco',
  'Dua Lipa': 'Pop',
  'Mark Ronson': 'Nu-Disco',
  'Bruno Mars': 'Funk Pop',
  'Anderson .Paak': 'Neo Soul',
  'Silk Sonic': 'Funk Pop',
  // ── Soul / R&B / Neo Soul ──────────────────────────────────────────────────
  'Aretha Franklin': 'Soul',
  'Otis Redding': 'Soul',
  'Marvin Gaye': 'Soul',
  'Stevie Wonder': 'Soul',
  'James Brown': 'Funk',
  'Prince': 'Funk',
  "D'Angelo": 'Neo Soul',
  'Erykah Badu': 'Neo Soul',
  'Lauryn Hill': 'Neo Soul',
  'Maxwell': 'Neo Soul',
  'Frank Ocean': 'R&B',
  'The Weeknd': 'R&B',
  'SZA': 'R&B',
  'Solange': 'R&B',
  'Amy Winehouse': 'Soul',
  'Leon Bridges': 'Neo Soul',
  'Lianne La Havas': 'Neo Soul',
  'Tom Misch': 'Neo Soul',
  'Michael Kiwanuka': 'Neo Soul',
  // ── Brazilian ─────────────────────────────────────────────────────────────
  'Seu Jorge': 'Brazilian Soul',
  'Fabiano do Nascimento': 'MPB',
  'Caetano Veloso': 'MPB',
  'Gilberto Gil': 'MPB',
  'Milton Nascimento': 'MPB',
  'João Gilberto': 'Bossa Nova',
  'Astrud Gilberto': 'Bossa Nova',
  'Stan Getz': 'Jazz',
  'Ivan Lins': 'MPB',
  // ── Jazz ──────────────────────────────────────────────────────────────────
  'Miles Davis': 'Jazz',
  'John Coltrane': 'Jazz',
  'Bill Evans': 'Jazz',
  'Thelonious Monk': 'Jazz',
  'Charlie Parker': 'Jazz',
  'Charles Mingus': 'Jazz',
  'Dave Brubeck': 'Jazz',
  'Chet Baker': 'Jazz',
  'Kind of Blue': 'Jazz',
  // ── Hip-Hop ───────────────────────────────────────────────────────────────
  'Kendrick Lamar': 'Hip-Hop',
  'J. Cole': 'Hip-Hop',
  'Drake': 'Hip-Hop',
  'Kanye West': 'Hip-Hop',
  'Jay-Z': 'Hip-Hop',
  'Nas': 'Hip-Hop',
  'Wu-Tang Clan': 'Hip-Hop',
  'Outkast': 'Hip-Hop',
  'A Tribe Called Quest': 'Jazz Rap',
  'De La Soul': 'Jazz Rap',
  'MF DOOM': 'Underground Rap',
  'Madlib': 'Underground Rap',
  'Earl Sweatshirt': 'Underground Rap',
  'Danny Brown': 'Underground Rap',
  'Tyler, the Creator': 'Hip-Hop',
  'Childish Gambino': 'Hip-Hop',
  'Frank Ocean': 'R&B',
  // ── Classic Rock ──────────────────────────────────────────────────────────
  'Elvis Presley': 'Rock & Roll',
  'The Beatles': 'Classic Rock',
  'The Rolling Stones': 'Classic Rock',
  'Led Zeppelin': 'Hard Rock',
  'David Bowie': 'Art Rock',
  'Queen': 'Classic Rock',
  'Fleetwood Mac': 'Classic Rock',
  'Bruce Springsteen': 'Heartland Rock',
  'Tom Petty': 'Heartland Rock',
  'Tom Petty and the Heartbreakers': 'Heartland Rock',
  'Elton John': 'Classic Rock',
  'Billy Joel': 'Classic Rock',
  'Eagles': 'Classic Rock',
  'Simon & Garfunkel': 'Folk',
  'Crosby, Stills, Nash & Young': 'Folk Rock',
  'The Doors': 'Psychedelic Rock',
  'Jimi Hendrix': 'Psychedelic Rock',
  'The Who': 'Classic Rock',
  'Pink Floyd': 'Psychedelic Rock',
  'Black Sabbath': 'Heavy Metal',
  'Deep Purple': 'Hard Rock',
  'Aerosmith': 'Hard Rock',
  'Guns N\' Roses': 'Hard Rock',
  'Metallica': 'Heavy Metal',
  'Red Hot Chili Peppers': 'Alternative Rock',
  'RHCP': 'Alternative Rock',
  // ── Pop ───────────────────────────────────────────────────────────────────
  'Taylor Swift': 'Pop',
  'Adele': 'Pop',
  'Ed Sheeran': 'Pop',
  'Harry Styles': 'Pop',
  'Olivia Rodrigo': 'Pop',
  'Charli XCX': 'Hyperpop',
  'Grimes': 'Art Pop',
};
// _PLACEHOLDER unused — kept as documentation reference only


// ── Helpers ─────────────────────────────────────────────────────────────────

function parseTS(ts) {
  if (!ts || typeof ts !== 'string') return null;
  const s = ts.trim();
  // Normalize: space-separator → T, but never double-add Z if already present.
  // Handles: "2022-04-15 14:30:00", "2022-04-15T14:30:00Z", "2022-04-15T14:30:00"
  const withT = s.replace(' ', 'T');
  const iso = withT.endsWith('Z') ? withT : withT + 'Z';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function msToHours(ms) {
  return ms / 3_600_000;
}

function msToMinutes(ms) {
  return ms / 60_000;
}

function workweeks(ms) {
  return ms / (40 * 3_600_000);
}

function topN(map, n = 10, valueKey = 'ms') {
  return [...map.entries()]
    .sort((a, b) => b[1][valueKey] - a[1][valueKey])
    .slice(0, n)
    .map(([key, val]) => ({ name: key, ...val }));
}

// ── Old-format remapper ───────────────────────────────────────────────────────
// Spotify's legacy format uses endTime/msPlayed/artistName/trackName.
// Remap to the Extended Streaming History schema so mixed drops work.
function normalizeEntry(e) {
  if (!e.ts && e.endTime) {
    // endTime is like "2018-04-23 16:10" or "2018-04-23T16:10Z"
    let ts = e.endTime;
    if (ts.includes('T')) ts = ts.replace('T', ' ').replace('Z', '');
    if (ts.length === 16) ts += ':00'; // pad missing seconds
    return {
      ts,
      ms_played: typeof e.msPlayed === 'number' ? e.msPlayed : 0,
      master_metadata_track_name: e.trackName ?? null,
      master_metadata_album_artist_name: e.artistName ?? null,
      master_metadata_album_album_name: null,
      spotify_track_uri: null,
      episode_name: null,
      episode_show_name: null,
      spotify_episode_uri: null,
      platform: e.platform ?? null,
      conn_country: null,
      offline: null,
      shuffle: null,
      skipped: null,
      incognito_mode: null,
      reason_start: null,
      reason_end: null,
      offline_timestamp: null,
      ip_addr_decrypted: null,
      user_agent_decrypted: null,
      username: e.username ?? null,
    };
  }
  return e;
}

// ── Main processor ───────────────────────────────────────────────────────────

export function processData(rawEntries) {
  // 1. Normalize old-format entries, coerce ms_played, filter invalids
  const normalized = rawEntries
    .map(normalizeEntry)
    .map(e => ({ ...e, ms_played: Number(e.ms_played) || 0 }))
    .filter(e => {
      if (!e.ts || typeof e.ts !== 'string') return false;
      if (!isFinite(e.ms_played) || e.ms_played < 0) return false;
      if (!parseTS(e.ts)) return false;
      return true;
    });

  // 2. Deduplicate by ts+track URI combo
  const seen = new Set();
  const entries = [];
  for (const e of normalized) {
    const key = `${e.ts}|${e.spotify_track_uri || e.spotify_episode_uri || e.master_metadata_track_name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(e);
  }

  // 3. Split music vs podcasts; apply 30s filter
  const music = [];
  const podcasts = [];
  for (const e of entries) {
    if (e.ms_played < MIN_MS) continue;
    if (e.master_metadata_track_name != null) {
      music.push(e);
    } else if (e.episode_name != null) {
      podcasts.push(e);
    }
  }

  const allFiltered = [...music, ...podcasts]
    .filter(e => !!parseTS(e.ts))
    .sort((a, b) => parseTS(a.ts) - parseTS(b.ts));

  // ── Global stats ─────────────────────────────────────────────────────────
  const totalMsMusic = music.reduce((s, e) => s + e.ms_played, 0);
  const totalMsPodcast = podcasts.reduce((s, e) => s + e.ms_played, 0);
  const totalMs = totalMsMusic + totalMsPodcast;

  const firstDate = allFiltered.length ? parseTS(allFiltered[0].ts) : null;
  const lastDate = allFiltered.length ? parseTS(allFiltered[allFiltered.length - 1].ts) : null;

  const uniqueArtists = new Set(music.map(e => e.master_metadata_album_artist_name).filter(Boolean));
  const uniqueTracks = new Set(music.map(e => e.spotify_track_uri).filter(Boolean));
  const uniqueAlbums = new Set(music.map(e => e.master_metadata_album_album_name).filter(Boolean));

  // ── All-time top artists / albums / tracks ────────────────────────────────
  const artistMap = new Map(); // name -> {ms, plays}
  const albumMap = new Map();
  const trackMap = new Map(); // uri -> {ms, plays, name, artist, album}

  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    const album = e.master_metadata_album_album_name;
    const track = e.master_metadata_track_name;
    const uri = e.spotify_track_uri;

    if (artist) {
      const a = artistMap.get(artist) || { ms: 0, plays: 0 };
      a.ms += e.ms_played; a.plays++;
      artistMap.set(artist, a);
    }
    if (album) {
      const key = `${artist} — ${album}`;
      const a = albumMap.get(key) || { ms: 0, plays: 0, artist, album };
      a.ms += e.ms_played; a.plays++;
      albumMap.set(key, a);
    }
    if (uri) {
      const t = trackMap.get(uri) || { ms: 0, plays: 0, name: track, artist, album };
      t.ms += e.ms_played; t.plays++;
      trackMap.set(uri, t);
    }
  }

  const topArtists = topN(artistMap, 10);
  const topAlbums = topN(albumMap, 10);
  const topTracks = topN(trackMap, 10);


  // ── Per-year stats ────────────────────────────────────────────────────────
  const yearMap = new Map(); // year -> {ms, plays, artistMap, trackMap}

  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    if (!yearMap.has(year)) {
      yearMap.set(year, { ms: 0, plays: 0, artistMap: new Map(), trackMap: new Map() });
    }
    const y = yearMap.get(year);
    y.ms += e.ms_played;
    y.plays++;

    const artist = e.master_metadata_album_artist_name;
    if (artist) {
      const a = y.artistMap.get(artist) || { ms: 0, plays: 0 };
      a.ms += e.ms_played; a.plays++;
      y.artistMap.set(artist, a);
    }

    const uri = e.spotify_track_uri;
    if (uri) {
      const t = y.trackMap.get(uri) || { ms: 0, plays: 0, name: e.master_metadata_track_name, artist };
      t.ms += e.ms_played; t.plays++;
      y.trackMap.set(uri, t);
    }
  }

  const years = [...yearMap.keys()].sort();

  const yearlyHours = years.map(y => ({
    year: y,
    hours: msToHours(yearMap.get(y).ms),
    plays: yearMap.get(y).plays,
  }));

  const yearlyTop1Artist = years.map(y => {
    const ym = yearMap.get(y);
    const [name, val] = [...ym.artistMap.entries()].sort((a, b) => b[1].ms - a[1].ms)[0] || [];
    return { year: y, artist: name, hours: val ? msToHours(val.ms) : 0 };
  });

  const yearlyTop1Track = years.map(y => {
    const ym = yearMap.get(y);
    const [, val] = [...ym.trackMap.entries()].sort((a, b) => b[1].ms - a[1].ms)[0] || [];
    return { year: y, track: val?.name, artist: val?.artist, plays: val?.plays || 0 };
  });

  // ── Loyalty score ─────────────────────────────────────────────────────────
  const artistYears = new Map(); // artist -> Set of years
  for (const [year, ym] of yearMap) {
    for (const [artist] of ym.artistMap) {
      if (!artistYears.has(artist)) artistYears.set(artist, new Set());
      artistYears.get(artist).add(year);
    }
  }

  const loyaltyScores = [...artistYears.entries()]
    .map(([artist, yrs]) => ({
      artist,
      yearsActive: yrs.size,
      totalMs: artistMap.get(artist)?.ms || 0,
      score: yrs.size * Math.log10(1 + msToHours(artistMap.get(artist)?.ms || 0)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // ── Listening streak ──────────────────────────────────────────────────────
  const playDays = new Set(allFiltered.map(e => e.ts.slice(0, 10)));
  const sortedDays = [...playDays].sort();

  let longestStreak = sortedDays.length > 0 ? 1 : 0;
  let currentStreak = 1;
  let streakStart = sortedDays[0] || null;
  let bestStreakStart = sortedDays[0] || null;
  let bestStreakEnd = sortedDays[0] || null;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr - prev) / 86_400_000;
    if (diff === 1) {
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        bestStreakStart = streakStart;
        bestStreakEnd = sortedDays[i];
      }
    } else {
      currentStreak = 1;
      streakStart = sortedDays[i];
    }
  }

  // ── Most listened single day ──────────────────────────────────────────────
  const dayMs = new Map();
  for (const e of allFiltered) {
    const d = e.ts.slice(0, 10);
    dayMs.set(d, (dayMs.get(d) || 0) + e.ms_played);
  }
  const [bestDay, bestDayMs] = [...dayMs.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];

  const bestDayTracks = bestDay
    ? allFiltered
        .filter(e => e.ts.startsWith(bestDay))
        .slice(0, 5)
        .map(e => e.master_metadata_track_name || e.episode_name || 'Unknown')
    : [];

  // ── Monthly time series ───────────────────────────────────────────────────
  const monthMap = new Map();
  for (const e of allFiltered) {
    const m = e.ts.slice(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + e.ms_played);
  }
  const monthlySeries = [...monthMap.entries()]
    .sort()
    .map(([month, ms]) => ({ month, hours: msToHours(ms) }));

  // ── Heatmap: day-of-week × hour-of-day ───────────────────────────────────
  const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    heatmap[d.getUTCDay()][d.getUTCHours()] += msToHours(e.ms_played);
  }

  // ── Platform breakdown over time ──────────────────────────────────────────
  const platformYearMap = new Map();
  for (const e of allFiltered) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    const platform = normalizePlatform(e.platform);
    if (!platformYearMap.has(year)) platformYearMap.set(year, new Map());
    const pm = platformYearMap.get(year);
    pm.set(platform, (pm.get(platform) || 0) + e.ms_played);
  }

  const allPlatforms = new Set();
  for (const [, pm] of platformYearMap) for (const p of pm.keys()) allPlatforms.add(p);

  const platformByYear = years.map(y => {
    const pm = platformYearMap.get(y) || new Map();
    const obj = { year: y };
    for (const p of allPlatforms) obj[p] = msToHours(pm.get(p) || 0);
    return obj;
  });

  // ── Offline ratio ─────────────────────────────────────────────────────────
  const offlineByYear = years.map(y => {
    const yearEntries = allFiltered.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const offlineMs = yearEntries.filter(e => e.offline).reduce((s, e) => s + e.ms_played, 0);
    const totalYearMs = yearEntries.reduce((s, e) => s + e.ms_played, 0);
    return {
      year: y,
      offline: totalYearMs ? (offlineMs / totalYearMs) * 100 : 0,
      online: totalYearMs ? ((totalYearMs - offlineMs) / totalYearMs) * 100 : 0,
    };
  });

  // ── Shuffle usage ─────────────────────────────────────────────────────────
  const shuffleByYear = years.map(y => {
    const yearEntries = music.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const shuffleCount = yearEntries.filter(e => e.shuffle === true).length;
    const total = yearEntries.length;
    return { year: y, shufflePct: total ? (shuffleCount / total) * 100 : 0 };
  });

  // ── Skip rate by artist ───────────────────────────────────────────────────
  // Use raw entries (before 30s filter) — most skips happen in the first few seconds
  const artistSkipMap = new Map();
  for (const e of entries) {
    if (!e.master_metadata_track_name) continue; // music only
    const artist = e.master_metadata_album_artist_name;
    if (!artist) continue;
    const s = artistSkipMap.get(artist) || { skipped: 0, total: 0 };
    s.total++;
    if (e.reason_end === 'fwdbtn') s.skipped++;
    artistSkipMap.set(artist, s);
  }
  const skipRates = [...artistSkipMap.entries()]
    .filter(([, v]) => v.total >= 20)
    .map(([artist, v]) => ({ artist, skipRate: (v.skipped / v.total) * 100, total: v.total }))
    .sort((a, b) => b.skipRate - a.skipRate);

  const mostSkipped = skipRates.slice(0, 10);
  const leastSkipped = [...skipRates].sort((a, b) => a.skipRate - b.skipRate).slice(0, 10);

  // ── Reason start / end breakdown ─────────────────────────────────────────
  const reasonStartMap = new Map();
  const reasonEndMap = new Map();
  for (const e of music) {
    if (e.reason_start) reasonStartMap.set(e.reason_start, (reasonStartMap.get(e.reason_start) || 0) + 1);
    if (e.reason_end) reasonEndMap.set(e.reason_end, (reasonEndMap.get(e.reason_end) || 0) + 1);
  }
  const total = music.length || 1;
  const reasonStartBreakdown = [...reasonStartMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: (count / total) * 100 }));
  const reasonEndBreakdown = [...reasonEndMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count, pct: (count / total) * 100 }));

  // ── Late night index ──────────────────────────────────────────────────────
  const lateNightByYear = years.map(y => {
    const yearMusic = music.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const lateNight = yearMusic.filter(e => {
      const d = parseTS(e.ts);
      if (!d) return false;
      const h = d.getUTCHours();
      return h >= 0 && h < 5;
    });
    return {
      year: y,
      pct: yearMusic.length ? (lateNight.length / yearMusic.length) * 100 : 0,
    };
  });

  // ── Weekend vs weekday ────────────────────────────────────────────────────
  let weekendMs = 0, weekdayMs = 0;
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) weekendMs += e.ms_played;
    else weekdayMs += e.ms_played;
  }

  // ── Seasonal patterns ─────────────────────────────────────────────────────
  const seasonMs = { Winter: 0, Spring: 0, Summer: 0, Fall: 0 };
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const month = d.getUTCMonth();
    const season = month <= 1 || month === 11 ? 'Winter'
      : month <= 4 ? 'Spring'
      : month <= 7 ? 'Summer'
      : 'Fall';
    seasonMs[season] += e.ms_played;
  }
  const seasonalData = Object.entries(seasonMs).map(([season, ms]) => ({
    season, hours: msToHours(ms),
  }));

  // ── Country analysis ──────────────────────────────────────────────────────
  const countryMap = new Map();
  for (const e of allFiltered) {
    const c = e.conn_country || 'Unknown';
    const obj = countryMap.get(c) || { ms: 0, plays: 0 };
    obj.ms += e.ms_played; obj.plays++;
    countryMap.set(c, obj);
  }
  const countryData = [...countryMap.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .map(([country, v]) => ({ country, hours: msToHours(v.ms), plays: v.plays }));

  // ── Incognito usage ───────────────────────────────────────────────────────
  const incognitoByYear = years.map(y => {
    const yearEntries = allFiltered.filter(e => {
      const d = parseTS(e.ts);
      return d && d.getUTCFullYear() === y;
    });
    const incogCount = yearEntries.filter(e => e.incognito_mode === true).length;
    return { year: y, incognito: yearEntries.length ? (incogCount / yearEntries.length) * 100 : 0 };
  });

  // ── Fun stats ─────────────────────────────────────────────────────────────

  // 3am artist (2–5am UTC)
  const lateNightArtistMap = new Map();
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const h = d.getUTCHours();
    if (h >= 2 && h < 5) {
      const a = e.master_metadata_album_artist_name;
      if (a) lateNightArtistMap.set(a, (lateNightArtistMap.get(a) || 0) + e.ms_played);
    }
  }
  const topLateNightArtist = [...lateNightArtistMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([artist, ms]) => ({ artist, hours: msToHours(ms) }));

  // Comfort food
  const trackYearSet = new Map();
  for (const e of music) {
    const uri = e.spotify_track_uri;
    if (!uri) continue;
    const d = parseTS(e.ts);
    if (!d) continue;
    if (!trackYearSet.has(uri)) trackYearSet.set(uri, new Set());
    trackYearSet.get(uri).add(d.getUTCFullYear());
  }
  const activeYearsCount = years.length;
  const comfortFood = [...trackYearSet.entries()]
    .filter(([, yrs]) => yrs.size >= Math.max(3, Math.floor(activeYearsCount * 0.6)))
    .map(([uri, yrs]) => {
      const t = trackMap.get(uri);
      return { uri, name: t?.name, artist: t?.artist, yearsPlayed: yrs.size, plays: t?.plays };
    })
    .filter(t => t.name)
    .sort((a, b) => b.yearsPlayed - a.yearsPlayed)
    .slice(0, 10);

  // Ghost tracks
  const ghostTracks = [...trackMap.entries()]
    .map(([uri, t]) => {
      const trackPlays = music.filter(e => e.spotify_track_uri === uri);
      const shufflePlays = trackPlays.filter(e => e.shuffle === true || e.reason_start === 'autoplay').length;
      const shuffleRatio = trackPlays.length ? shufflePlays / trackPlays.length : 0;
      return { uri, name: t.name, artist: t.artist, plays: t.plays, shuffleRatio };
    })
    .filter(t => t.plays >= 30 && t.shuffleRatio >= 0.7)
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 10);

  // Most patient / instant skip
  const trackAvgMs = new Map();
  for (const e of music) {
    const uri = e.spotify_track_uri;
    if (!uri) continue;
    const obj = trackAvgMs.get(uri) || { total: 0, count: 0, name: e.master_metadata_track_name, artist: e.master_metadata_album_artist_name };
    obj.total += e.ms_played; obj.count++;
    trackAvgMs.set(uri, obj);
  }
  const patientTracks = [...trackAvgMs.entries()]
    .filter(([, v]) => v.count >= 5)
    .map(([uri, v]) => ({ uri, name: v.name, artist: v.artist, avgMin: msToMinutes(v.total / v.count), plays: v.count }))
    .sort((a, b) => b.avgMin - a.avgMin)
    .slice(0, 10);

  const instantSkip = [...trackAvgMs.entries()]
    .filter(([, v]) => v.count >= 5)
    .map(([uri, v]) => ({ uri, name: v.name, artist: v.artist, avgSec: (v.total / v.count) / 1000, plays: v.count }))
    .sort((a, b) => a.avgSec - b.avgSec)
    .slice(0, 10);

  // Podcasts vs music ratio over time
  const podcastMusicByYear = years.map(y => {
    const musicMs = music.filter(e => { const d = parseTS(e.ts); return d && d.getUTCFullYear() === y; }).reduce((s, e) => s + e.ms_played, 0);
    const podMs = podcasts.filter(e => { const d = parseTS(e.ts); return d && d.getUTCFullYear() === y; }).reduce((s, e) => s + e.ms_played, 0);
    return { year: y, music: msToHours(musicMs), podcast: msToHours(podMs) };
  });

  // One-hit wonders
  const artistMonthMap = new Map();
  for (const e of music) {
    const a = e.master_metadata_album_artist_name;
    if (!a) continue;
    if (!artistMonthMap.has(a)) artistMonthMap.set(a, new Map());
    const m = e.ts.slice(0, 7);
    const mm = artistMonthMap.get(a);
    mm.set(m, (mm.get(m) || 0) + e.ms_played);
  }
  const oneHitWonders = [...artistMonthMap.entries()]
    .filter(([, months]) => months.size === 1)
    .map(([artist, months]) => {
      const [[month, ms]] = [...months.entries()];
      return { artist, month, hours: msToHours(ms) };
    })
    .filter(x => x.hours >= 1)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  // ── Sacred artist ────────────────────────────────────────────────────────────
  // Most-played artist that you almost never skip — compared to a popular artist you skip more
  const sacredArtist = (() => {
    const candidates = skipRates.filter(s => s.total >= 50);
    if (candidates.length < 2) return null;
    const bySkip = [...candidates].sort((a, b) => a.skipRate - b.skipRate);
    const sacred = bySkip[0];
    const top20byPlays = [...candidates].sort((a, b) => b.total - a.total).slice(0, 20);
    const contrast = [...top20byPlays].sort((a, b) => b.skipRate - a.skipRate)
      .find(x => x.artist !== sacred.artist);
    return { sacred, contrast: contrast || bySkip[bySkip.length - 1] };
  })();

  // ── Day-of-week personality ───────────────────────────────────────────────────
  // Late Fri/Sat night (20h-23h UTC) vs Sat/Sun morning (8h-12h UTC)
  const lateNightWeekMap = new Map();
  const weekendMornMap = new Map();
  for (const e of music) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const day = d.getUTCDay(); // 0=Sun,1=Mon,...,5=Fri,6=Sat
    const h = d.getUTCHours();
    const a = e.master_metadata_album_artist_name;
    if (!a) continue;
    if ((day === 5 || day === 6) && h >= 20) {
      lateNightWeekMap.set(a, (lateNightWeekMap.get(a) || 0) + e.ms_played);
    }
    if ((day === 0 || day === 6) && h >= 8 && h < 13) {
      weekendMornMap.set(a, (weekendMornMap.get(a) || 0) + e.ms_played);
    }
  }
  const lateNightWeekArtists = [...lateNightWeekMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, ms]) => ({ name, hours: msToHours(ms) }));
  const weekendMornArtists = [...weekendMornMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, ms]) => ({ name, hours: msToHours(ms) }));
  const dayPersonality = { lateNightWeekArtists, weekendMornArtists };

  // ── Longest listening session ─────────────────────────────────────────────────
  // A session ends when there's a >30 min gap between plays (using ts=end time)
  const longestSession = (() => {
    if (!allFiltered.length) return null;
    const GAP = 30 * 60 * 1000;
    let bestMs = 0, bestStartMs = 0, bestEndMs = 0, bestCount = 0;
    let curStartMs = 0, curEndMs = 0, curMs = 0, curCount = 0;

    for (let i = 0; i < allFiltered.length; i++) {
      const e = allFiltered[i];
      const endT = parseTS(e.ts);
      if (!endT) continue;
      const endMs = endT.getTime();
      const startMs = endMs - (e.ms_played || 0);

      if (i === 0 || startMs - curEndMs > GAP) {
        if (curMs > bestMs) { bestMs = curMs; bestStartMs = curStartMs; bestEndMs = curEndMs; bestCount = curCount; }
        curStartMs = startMs; curEndMs = endMs; curMs = e.ms_played || 0; curCount = 1;
      } else {
        curEndMs = Math.max(curEndMs, endMs);
        curMs += e.ms_played || 0;
        curCount++;
      }
    }
    if (curMs > bestMs) { bestMs = curMs; bestStartMs = curStartMs; bestEndMs = curEndMs; bestCount = curCount; }
    if (!bestMs) return null;

    const sessionEntries = allFiltered.filter(e => {
      const t = parseTS(e.ts);
      return t && t.getTime() >= bestStartMs && t.getTime() <= bestEndMs;
    });
    const sMap = new Map();
    for (const e of sessionEntries) {
      const a = e.master_metadata_album_artist_name || e.episode_show_name;
      if (a) sMap.set(a, (sMap.get(a) || 0) + e.ms_played);
    }
    const topArtists = [...sMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n);

    return {
      date: new Date(bestStartMs).toISOString().slice(0, 10),
      durationHours: bestMs / 3_600_000,
      trackCount: bestCount,
      topArtists,
    };
  })();

  // Rabbit holes
  const rabbitHoles = detectRabbitHoles(music);

  // Obsession phases
  const obsessionPhases = detectObsessionPhases(music);

  // ── Device breakdown ─────────────────────────────────────────────────────────
  // Step 1: total per device (all time)
  const deviceMap = new Map(); // device -> {plays, ms}
  for (const e of allFiltered) {
    const device = extractDevice(e.platform);
    const d = deviceMap.get(device) || { plays: 0, ms: 0 };
    d.plays++;
    d.ms += e.ms_played;
    deviceMap.set(device, d);
  }
  const deviceData = [...deviceMap.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, 20)
    .map(([device, v]) => ({ device, plays: v.plays, hours: msToHours(v.ms) }));

  // Step 2: per-year breakdown (same shape as platformByYear)
  const TOP_DEVICES = 8;
  const topDeviceNames = [...deviceMap.entries()]
    .sort((a, b) => b[1].ms - a[1].ms)
    .slice(0, TOP_DEVICES)
    .map(([name]) => name);

  const deviceYearMap = new Map(); // year -> Map<device, ms>
  for (const e of allFiltered) {
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    const device = extractDevice(e.platform);
    if (!deviceYearMap.has(year)) deviceYearMap.set(year, new Map());
    const ym = deviceYearMap.get(year);
    ym.set(device, (ym.get(device) || 0) + e.ms_played);
  }

  const deviceByYear = years.map(y => {
    const ym = deviceYearMap.get(y) || new Map();
    const obj = { year: y };
    let otherMs = 0;
    for (const [device, ms] of ym) {
      if (topDeviceNames.includes(device)) {
        obj[device] = msToHours(ms);
      } else {
        otherMs += ms;
      }
    }
    // Ensure every top device key exists (0 if no plays that year)
    for (const device of topDeviceNames) {
      if (obj[device] == null) obj[device] = 0;
    }
    if (otherMs > 0) obj['Other'] = msToHours(otherMs);
    return obj;
  });

  const hasOther = deviceByYear.some(y => (y['Other'] || 0) > 0);
  const allDeviceKeys = hasOther ? [...topDeviceNames, 'Other'] : [...topDeviceNames];

  // Top 5 artists per year for bump chart
  const top5ByYear = years.map(y => {
    const ym = yearMap.get(y);
    const top5 = [...ym.artistMap.entries()]
      .sort((a, b) => b[1].ms - a[1].ms)
      .slice(0, 5)
      .map(([artist, v], i) => ({ artist, rank: i + 1, ms: v.ms }));
    return { year: y, artists: top5 };
  });

  // ── Auto-generated narrative insights ────────────────────────────────────────
  const autoInsights = [];

  // Insight: kids music phase
  const KIDS_KEYWORDS = ['cocomelon', 'baby shark', 'super simple', 'cantajuego',
    'peppa', 'paw patrol', 'barney', 'nursery rhyme', 'luli pampin', 'luli pampín',
    'zenón', 'zenon', 'granja de zenon', 'mundo bita', 'little baby bum',
    'kidz bop', 'bluey', 'hi-5', 'sesame street', 'mickey mouse', 'minnie mouse'];
  const kidsPlaysByYear = new Map();
  const kidsArtistTotals = new Map();
  for (const e of music) {
    const combined = ((e.master_metadata_album_artist_name || '') + ' ' + (e.master_metadata_track_name || '')).toLowerCase();
    if (KIDS_KEYWORDS.some(k => combined.includes(k))) {
      const d = parseTS(e.ts);
      if (!d) continue;
      const y = d.getUTCFullYear();
      kidsPlaysByYear.set(y, (kidsPlaysByYear.get(y) || 0) + 1);
      const a = e.master_metadata_album_artist_name || '';
      if (a) kidsArtistTotals.set(a, (kidsArtistTotals.get(a) || 0) + 1);
    }
  }
  const totalKidsPlays = [...kidsPlaysByYear.values()].reduce((s, n) => s + n, 0);
  if (totalKidsPlays >= 30) {
    const activeKidsYears = [...kidsPlaysByYear.entries()].filter(([, n]) => n >= 15).map(([y]) => y).sort();
    const topKidsArtist = [...kidsArtistTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'kids music';
    const yearSpan = activeKidsYears.length > 1
      ? `${activeKidsYears[0]}–${activeKidsYears[activeKidsYears.length - 1]}`
      : (activeKidsYears[0] ? String(activeKidsYears[0]) : 'some point');
    autoInsights.push({
      headline: 'There were kids in your life.',
      body: `You played ${topKidsArtist} and similar artists ${totalKidsPlays.toLocaleString()} times${activeKidsYears.length ? `, concentrated in ${yearSpan}` : ''}. That's not a guilty pleasure — that's a child nearby. Whoever they were, they clearly had the aux cord.`,
    });
  }

  // Insight: former top artist — dominated the chart, then vanished
  const formerTop = (() => {
    if (yearlyTop1Artist.length < 5) return null;
    const lastYear = yearlyTop1Artist[yearlyTop1Artist.length - 1].year;
    const recentArtists = new Set(yearlyTop1Artist.filter(y => y.year >= lastYear - 2).map(y => y.artist).filter(Boolean));
    const artistTopYears = new Map();
    for (const { artist, year } of yearlyTop1Artist) {
      if (!artist) continue;
      if (!artistTopYears.has(artist)) artistTopYears.set(artist, []);
      artistTopYears.get(artist).push(year);
    }
    const candidate = [...artistTopYears.entries()]
      .filter(([a, ys]) => !recentArtists.has(a) && ys.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)[0];
    if (!candidate) return null;
    const [artist, ys] = candidate;
    return { artist, count: ys.length, lastSeen: Math.max(...ys), gap: lastYear - Math.max(...ys) };
  })();
  if (formerTop && formerTop.gap >= 2) {
    autoInsights.push({
      headline: `Your breakup with ${formerTop.artist} is fully documented.`,
      body: `They were your #1 artist ${formerTop.count} different years. The last time they topped your chart was ${formerTop.lastSeen} — ${formerTop.gap} years ago. No explanation in the data. They know what they did.`,
    });
  }

  // Insight: deepest obsession month
  if (obsessionPhases?.length > 0) {
    const top = obsessionPhases[0];
    const [obsYear, obsMon] = top.month.split('-');
    const monthName = new Date(Number(obsYear), Number(obsMon) - 1).toLocaleString('en', { month: 'long' });
    autoInsights.push({
      headline: `Something happened in ${monthName} ${obsYear}.`,
      body: `You listened to ${top.artist} for ${top.hours.toFixed(0)} hours that month — ${top.ratio.toFixed(0)}× your usual rate. That's not enjoying music. That's processing something. We hope you're okay.`,
    });
  }

  // Insight: longest session
  if (longestSession) {
    const sessionArtists = longestSession.topArtists?.length ? longestSession.topArtists.join(', ') : 'your favorites';
    autoInsights.push({
      headline: `Your longest session: ${longestSession.durationHours.toFixed(1)} hours straight.`,
      body: `On ${longestSession.date} you played ${longestSession.trackCount} tracks in a row, mostly ${sessionArtists}. At some point that stops being "listening to music" and becomes a personality trait.`,
    });
  }

  // Insight: most nocturnal year
  const sortedByNight = lateNightByYear ? [...lateNightByYear].filter(y => y.pct > 0).sort((a, b) => b.pct - a.pct) : [];
  if (sortedByNight.length >= 2 && sortedByNight[0].pct >= 3) {
    const peak = sortedByNight[0];
    const low = sortedByNight[sortedByNight.length - 1];
    autoInsights.push({
      headline: `${peak.year} was a late year for you.`,
      body: `${peak.pct.toFixed(0)}% of your listening that year happened between midnight and 5am${low.year !== peak.year ? ` — compared to ${low.pct.toFixed(0)}% in ${low.year}` : ''}. Spotify doesn't ask questions. But your sleep schedule did.`,
    });
  }

  return {
    // Meta
    totalEntries: entries.length,
    musicEntries: music.length,
    podcastEntries: podcasts.length,
    totalMs,
    totalMsMusic,
    totalMsPodcast,
    totalHours: msToHours(totalMs),
    workweeksCount: workweeks(totalMs),
    firstDate,
    lastDate,
    uniqueArtistsCount: uniqueArtists.size,
    uniqueTracksCount: uniqueTracks.size,
    uniqueAlbumsCount: uniqueAlbums.size,
    years,

    // All-time tops
    topArtists,
    topAlbums,
    topTracks,

    // Per-year
    yearlyHours,
    yearlyTop1Artist,
    yearlyTop1Track,

    // Loyalty
    loyaltyScores,

    // Streak
    longestStreak,
    bestStreakStart,
    bestStreakEnd,
    bestDay,
    bestDayHours: msToHours(bestDayMs),
    bestDayTracks,

    // Time series
    monthlySeries,

    // Heatmap
    heatmap,

    // Platform
    platformByYear,
    allPlatforms: [...allPlatforms],
    deviceData,
    deviceByYear,
    allDeviceKeys,

    // Behavioral
    offlineByYear,
    shuffleByYear,
    skipRates,
    mostSkipped,
    leastSkipped,
    reasonStartBreakdown,
    reasonEndBreakdown,
    lateNightByYear,
    weekendHours: msToHours(weekendMs),
    weekdayHours: msToHours(weekdayMs),
    seasonalData,
    countryData,
    incognitoByYear,

    // Fun stats
    topLateNightArtist,
    comfortFood,
    sacredArtist,
    patientTracks,
    dayPersonality,
    podcastMusicByYear,
    longestSession,
    autoInsights,
    rabbitHoles,
    obsessionPhases,

    // For search
    artistMap,
    trackMap,
    raw: { music, podcasts },
    top5ByYear,
  };
}

// ── Session detection helpers ────────────────────────────────────────────────

function detectRabbitHoles(music) {
  const sorted = [...music]
    .filter(e => !!parseTS(e.ts))
    .sort((a, b) => parseTS(a.ts) - parseTS(b.ts));
  const holes = [];
  let i = 0;
  while (i < sorted.length) {
    const artist = sorted[i].master_metadata_album_artist_name;
    let j = i;
    while (j < sorted.length && sorted[j].master_metadata_album_artist_name === artist) {
      if (j > i) {
        const gap = parseTS(sorted[j].ts) - parseTS(sorted[j - 1].ts);
        if (gap > 30 * 60_000) break;
      }
      j++;
    }
    const length = j - i;
    if (length >= 10) {
      holes.push({
        artist,
        count: length,
        startDate: sorted[i].ts.slice(0, 10),
        hours: msToHours(sorted.slice(i, j).reduce((s, e) => s + e.ms_played, 0)),
      });
    }
    i = j > i ? j : i + 1;
  }
  return holes.sort((a, b) => b.count - a.count).slice(0, 10);
}

function detectObsessionPhases(music) {
  const artistMonthPlays = new Map();
  const artistTotalMonths = new Map();

  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    if (!artist) continue;
    const key = `${artist}|${e.ts.slice(0, 7)}`;
    artistMonthPlays.set(key, (artistMonthPlays.get(key) || 0) + e.ms_played);
    if (!artistTotalMonths.has(artist)) artistTotalMonths.set(artist, new Set());
    artistTotalMonths.get(artist).add(e.ts.slice(0, 7));
  }

  const phases = [];
  for (const [key, ms] of artistMonthPlays) {
    const [artist, month] = key.split('|');
    const totalMonths = artistTotalMonths.get(artist)?.size || 1;
    const totalMs = [...artistMonthPlays.entries()]
      .filter(([k]) => k.startsWith(artist + '|'))
      .reduce((s, [, v]) => s + v, 0);
    const avgMonthlyMs = totalMs / totalMonths;
    if (ms >= avgMonthlyMs * 3 && msToHours(ms) >= 5) {
      phases.push({ artist, month, hours: msToHours(ms), ratio: ms / avgMonthlyMs });
    }
  }
  return phases.sort((a, b) => b.ratio - a.ratio).slice(0, 15);
}

// ── Platform normalizer ──────────────────────────────────────────────────────
function normalizePlatform(p) {
  if (!p) return 'Unknown';
  const l = p.toLowerCase();
  if (l.includes('android')) return 'Android';
  if (l.includes('ios') || l.includes('iphone') || l.includes('ipad')) return 'iOS';
  if (l.includes('windows')) return 'Windows';
  if (l.includes('mac') || l.includes('osx') || l.includes('os x')) return 'Mac';
  if (l.includes('web') || l.includes('browser')) return 'Web';
  if (l.includes('chromecast') || l.includes('cast')) return 'Chromecast';
  if (l.includes('linux')) return 'Linux';
  if (l.includes('smart') || l.includes('tv')) return 'Smart TV';
  return 'Other';
}

// ── Device name extractor ─────────────────────────────────────────────────────
// Spotify platform strings look like:
//   "Android OS 12 (API 31) [phone; Samsung SM-G991B]"  → "Samsung SM-G991B"
//   "Android OS 8.1 [tablet; Lenovo TB-X505F]"          → "Lenovo TB-X505F"
//   "iOS 16.6.0"                                         → "Other iPhone"
//   "iOS 15.6 [phone; Apple iPhone12,1]"                 → "iPhone 12"
//   "macOS 13.6.4"                                       → "Mac"
//   "Windows 10 (10.0.22621)"                            → "Windows PC"
//   "Google Chromecast 3rd generation"                   → "Chromecast"
//   "Partner Spotify [TV; LG Electronics webOS TV]"      → "LG Electronics Webos TV"
function cleanBrandName(brand) {
  const b = brand.trim().toUpperCase();
  if (b === 'LGE') return 'LG';
  if (b === 'HMD GLOBAL') return 'Nokia';
  if (b === 'MOTOROLA') return 'Motorola';
  if (b === 'ONEPLUS') return 'OnePlus';
  if (b === 'XIAOMI') return 'Xiaomi';
  if (b === 'OPPO') return 'OPPO';
  if (b === 'VIVO') return 'vivo';
  if (b === 'REALME') return 'Realme';
  if (b === 'GOOGLE') return 'Google Pixel';
  return titleCase(brand.trim());
}

function extractDevice(p) {
  if (!p) return 'Unknown';

  // Primary: extract from square brackets → "[phone; Device Model]"
  const bracketMatch = p.match(/\[(?:phone|tablet|tv|speaker|computer|game[ -]?console|wearable)[;\s]+([^\]]+)\]/i);
  if (bracketMatch) {
    let model = titleCase(bracketMatch[1].trim());
    // Strip leading "Apple " prefix — we'll decode iPhone model codes instead
    model = model.replace(/^Apple\s+/i, '');
    // Decode Apple internal model codes (iPhone7,2 → iPhone 6, etc.)
    const decoded = decodeAppleModel(model);
    if (decoded) return decoded;
    return model;
  }

  // iOS parentheses format: "iOS 16.6 (iPhone12,3)"
  const iosParenMatch = p.match(/ios[\s\d.]+\(([^)]+)\)/i);
  if (iosParenMatch) {
    const decoded = decodeAppleModel(iosParenMatch[1].trim());
    if (decoded) return decoded;
    return titleCase(iosParenMatch[1].trim());
  }

  // Chromecast variants
  if (/chromecast ultra/i.test(p)) return 'Chromecast Ultra';
  if (/chromecast|google cast|cast sdk/i.test(p)) return 'Chromecast';

  // Smart TV
  if (/\btv\b|webos|tizen|smart.?tv/i.test(p)) return 'Smart TV';

  // Web player
  if (/web.?player|web_player|browser/i.test(p)) return 'Web Player';

  // iPad before iPhone/iOS
  if (/ipad/i.test(p)) return 'Other iPad';
  if (/ios/i.test(p)) return 'Other iPhone';

  // macOS / OS X
  if (/macos|os x|\bosx\b|mac/i.test(p)) return 'Mac';

  // Windows
  if (/windows/i.test(p)) return 'Windows PC';

  // Android: check for (BRAND, MODEL) paren format before falling back
  if (/android/i.test(p)) {
    const androidParenMatch = p.match(/\(([A-Za-z][^,)]+),\s*[^)]+\)/);
    if (androidParenMatch) return cleanBrandName(androidParenMatch[1].trim());
    return 'Other Android';
  }

  // Linux
  if (/linux/i.test(p)) return 'Linux';

  return 'Unknown';
}

// Map Apple internal model identifiers to friendly names
function decodeAppleModel(code) {
  const map = {
    // iPhones
    'iPhone1,1': 'iPhone 2G', 'iPhone1,2': 'iPhone 3G',
    'iPhone2,1': 'iPhone 3GS',
    'iPhone3,1': 'iPhone 4', 'iPhone3,2': 'iPhone 4', 'iPhone3,3': 'iPhone 4',
    'iPhone4,1': 'iPhone 4S',
    'iPhone5,1': 'iPhone 5', 'iPhone5,2': 'iPhone 5',
    'iPhone5,3': 'iPhone 5C', 'iPhone5,4': 'iPhone 5C',
    'iPhone6,1': 'iPhone 5S', 'iPhone6,2': 'iPhone 5S',
    'iPhone7,1': 'iPhone 6 Plus', 'iPhone7,2': 'iPhone 6',
    'iPhone8,1': 'iPhone 6S', 'iPhone8,2': 'iPhone 6S Plus', 'iPhone8,4': 'iPhone SE',
    'iPhone9,1': 'iPhone 7', 'iPhone9,2': 'iPhone 7 Plus',
    'iPhone9,3': 'iPhone 7', 'iPhone9,4': 'iPhone 7 Plus',
    'iPhone10,1': 'iPhone 8', 'iPhone10,2': 'iPhone 8 Plus',
    'iPhone10,3': 'iPhone X', 'iPhone10,4': 'iPhone 8',
    'iPhone10,5': 'iPhone 8 Plus', 'iPhone10,6': 'iPhone X',
    'iPhone11,2': 'iPhone XS', 'iPhone11,4': 'iPhone XS Max',
    'iPhone11,6': 'iPhone XS Max', 'iPhone11,8': 'iPhone XR',
    'iPhone12,1': 'iPhone 11', 'iPhone12,3': 'iPhone 11 Pro',
    'iPhone12,5': 'iPhone 11 Pro Max', 'iPhone12,8': 'iPhone SE (2nd gen)',
    'iPhone13,1': 'iPhone 12 Mini', 'iPhone13,2': 'iPhone 12',
    'iPhone13,3': 'iPhone 12 Pro', 'iPhone13,4': 'iPhone 12 Pro Max',
    'iPhone14,4': 'iPhone 13 Mini', 'iPhone14,5': 'iPhone 13',
    'iPhone14,2': 'iPhone 13 Pro', 'iPhone14,3': 'iPhone 13 Pro Max',
    'iPhone14,6': 'iPhone SE (3rd gen)',
    'iPhone15,2': 'iPhone 14 Pro', 'iPhone15,3': 'iPhone 14 Pro Max',
    'iPhone15,4': 'iPhone 14', 'iPhone15,5': 'iPhone 14 Plus',
    'iPhone16,1': 'iPhone 15', 'iPhone16,2': 'iPhone 15 Plus',
    'iPhone16,3': 'iPhone 15 Pro', 'iPhone16,4': 'iPhone 15 Pro Max',
    'iPhone17,1': 'iPhone 16 Pro', 'iPhone17,2': 'iPhone 16 Pro Max',
    'iPhone17,3': 'iPhone 16', 'iPhone17,4': 'iPhone 16 Plus',
    // iPads (common ones)
    'iPad1,1': 'iPad (1st gen)',
    'iPad2,1': 'iPad 2', 'iPad2,2': 'iPad 2',
    'iPad3,1': 'iPad (3rd gen)', 'iPad4,1': 'iPad Air',
    'iPad5,3': 'iPad Air 2', 'iPad6,11': 'iPad (5th gen)',
    'iPad7,5': 'iPad (6th gen)', 'iPad7,11': 'iPad (7th gen)',
    'iPad11,6': 'iPad (8th gen)', 'iPad12,1': 'iPad (9th gen)',
    'iPad13,18': 'iPad (10th gen)',
    'iPad4,7': 'iPad Mini 3', 'iPad5,1': 'iPad Mini 4',
    'iPad11,1': 'iPad Mini (5th gen)', 'iPad14,1': 'iPad Mini (6th gen)',
    'iPad6,3': 'iPad Pro 9.7"', 'iPad7,3': 'iPad Pro 10.5"',
    'iPad8,1': 'iPad Pro 11"', 'iPad13,4': 'iPad Pro 11" (3rd gen)',
    'iPad8,9': 'iPad Pro 12.9" (4th gen)', 'iPad13,8': 'iPad Pro 12.9" (5th gen)',
  };
  return map[code] || null;
}

function titleCase(str) {
  return str
    .split(' ')
    .map(w => w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w)
    .join(' ');
}

// ── computeGenreData ─────────────────────────────────────────────────────────
// Called after processData() once the Anthropic API returns a genre map.
// genreMap: { [artistName]: genreString } — covers top 50 artists only.
// All other artists default to "Other".
export function computeGenreData(data, genreMap) {
  const { artistMap, raw, years } = data;
  const music = raw.music;

  // Build full artist→genre lookup (top 50 tagged, rest "Other")
  const artistToGenre = {};
  for (const [artist] of artistMap) {
    artistToGenre[artist] = genreMap[artist] || 'Other';
  }

  // Aggregate hours per genre across ALL artists
  const genreHoursMap = new Map();
  for (const [artist, { ms }] of artistMap) {
    const genre = artistToGenre[artist];
    genreHoursMap.set(genre, (genreHoursMap.get(genre) || 0) + ms);
  }
  const totalGenreMs = [...genreHoursMap.values()].reduce((s, v) => s + v, 0);
  const genreBreakdown = [...genreHoursMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre, ms]) => ({ genre, hours: ms / 3_600_000, pct: (ms / totalGenreMs) * 100 }));

  // Top-8 genres for stacked area chart; everything else → "Mixed"
  const TOP_CHART_GENRES = 8;
  const chartGenreSet = new Set(genreBreakdown.slice(0, TOP_CHART_GENRES).map(g => g.genre));
  const allChartGenres = [...chartGenreSet, 'Mixed'];

  // Per-year breakdown
  const genreYearMap = new Map();
  for (const e of music) {
    const artist = e.master_metadata_album_artist_name;
    if (!artist) continue;
    const d = parseTS(e.ts);
    if (!d) continue;
    const year = d.getUTCFullYear();
    const rawGenre = artistToGenre[artist] || 'Other';
    const genre = chartGenreSet.has(rawGenre) ? rawGenre : 'Mixed';
    if (!genreYearMap.has(year)) genreYearMap.set(year, new Map());
    const ym = genreYearMap.get(year);
    ym.set(genre, (ym.get(genre) || 0) + e.ms_played);
  }

  const genreByYear = years.map(y => {
    const ym = genreYearMap.get(y) || new Map();
    const obj = { year: y };
    for (const g of allChartGenres) obj[g] = (ym.get(g) || 0) / 3_600_000;
    return obj;
  });

  const topGenreByYear = years.map(y => {
    const ym = genreYearMap.get(y);
    if (!ym?.size) return { year: y, genre: '—' };
    const [topGenre] = [...ym.entries()].sort((a, b) => b[1] - a[1])[0];
    return { year: y, genre: topGenre };
  });

  return { genreBreakdown, genreByYear, topGenreByYear, allChartGenres };
}

