// ============================================================================
// Seed database for Cricket Analysis Pro
// ----------------------------------------------------------------------------
// This is the "masked" database the brief asks for: a handful of popular teams
// with curated squads (plus the Oman / Canada practice sides seen in the
// reference recordings and screenshots). On first launch db.js copies this into
// the user-data store; from then on the app reads/writes that JSON file.
// ============================================================================

let pAuto = 0;
function pid() {
  pAuto += 1;
  return `p${String(pAuto).padStart(3, "0")}`;
}

// player(name, short, role, bat, bowlStyle, bowlType, spec)
//   role: Batsman | Bowler | All Rounder | Wicket Keeper
//   bat:  RHB | LHB
//   bowlStyle: Right Arm | Left Arm | ""   (no bowling)
//   bowlType:  Fast | Spin | ""
function pl(name, short, role, bat, bowlStyle, bowlType, spec) {
  return {
    id: pid(),
    name,
    shortName: short,
    role,
    battingStyle: bat === "LHB" ? "Left Hand Bat" : "Right Hand Bat",
    battingStyleCode: bat,
    bowlingStyle: bowlStyle || "",
    bowlingType: bowlType || "",
    bowlingSpec: spec || "",
    dob: "",
  };
}

// The Match Type option list. Not demo data — every database needs it, so
// db.js back-fills it on open even for blank (unseeded) databases.
const MATCH_TYPES = ["Test", "ODI", "T20I", "100 Balls", "First Class", "List A", "T20D", "T10D", "Others"];

// ---- Teams + squads -------------------------------------------------------

const TEAM_DEFS = [
  {
    name: "India", code: "IND", type: "International",
    squad: [
      pl("Rohit Sharma", "R Sharma", "Batsman", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Shubman Gill", "S Gill", "Batsman", "RHB", "", "", ""),
      pl("Virat Kohli", "V Kohli", "Batsman", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Shreyas Iyer", "S Iyer", "Batsman", "RHB", "", "", ""),
      pl("KL Rahul", "KL Rahul", "Wicket Keeper", "RHB", "", "", ""),
      pl("Suryakumar Yadav", "SKY", "Batsman", "RHB", "", "", ""),
      pl("Hardik Pandya", "H Pandya", "All Rounder", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Ravindra Jadeja", "R Jadeja", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Axar Patel", "A Patel", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Kuldeep Yadav", "K Yadav", "Bowler", "LHB", "Left Arm", "Spin", "Chinaman"),
      pl("Jasprit Bumrah", "J Bumrah", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Mohammed Shami", "M Shami", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Mohammed Siraj", "M Siraj", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Rishabh Pant", "R Pant", "Wicket Keeper", "LHB", "", "", ""),
    ],
  },
  {
    name: "Australia", code: "AUS", type: "International",
    squad: [
      pl("David Warner", "D Warner", "Batsman", "LHB", "", "", ""),
      pl("Travis Head", "T Head", "Batsman", "LHB", "Right Arm", "Spin", "Off Spin"),
      pl("Mitchell Marsh", "M Marsh", "All Rounder", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Steve Smith", "S Smith", "Batsman", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Marnus Labuschagne", "M Labuschagne", "Batsman", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Glenn Maxwell", "G Maxwell", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Josh Inglis", "J Inglis", "Wicket Keeper", "RHB", "", "", ""),
      pl("Alex Carey", "A Carey", "Wicket Keeper", "LHB", "", "", ""),
      pl("Pat Cummins", "P Cummins", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Mitchell Starc", "M Starc", "Bowler", "LHB", "Left Arm", "Fast", "Fast"),
      pl("Josh Hazlewood", "J Hazlewood", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Adam Zampa", "A Zampa", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Cameron Green", "C Green", "All Rounder", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Marcus Stoinis", "M Stoinis", "All Rounder", "RHB", "Right Arm", "Fast", "Medium"),
    ],
  },
  {
    name: "England", code: "ENG", type: "International",
    squad: [
      pl("Jos Buttler", "J Buttler", "Wicket Keeper", "RHB", "", "", ""),
      pl("Phil Salt", "P Salt", "Wicket Keeper", "RHB", "", "", ""),
      pl("Joe Root", "J Root", "Batsman", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Harry Brook", "H Brook", "Batsman", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Ben Stokes", "B Stokes", "All Rounder", "LHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Liam Livingstone", "L Livingstone", "All Rounder", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Moeen Ali", "M Ali", "All Rounder", "LHB", "Right Arm", "Spin", "Off Spin"),
      pl("Sam Curran", "S Curran", "All Rounder", "LHB", "Left Arm", "Fast", "Fast Medium"),
      pl("Chris Woakes", "C Woakes", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Jofra Archer", "J Archer", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Mark Wood", "M Wood", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Adil Rashid", "A Rashid", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Reece Topley", "R Topley", "Bowler", "LHB", "Left Arm", "Fast", "Fast Medium"),
      pl("Jonny Bairstow", "J Bairstow", "Batsman", "RHB", "", "", ""),
    ],
  },
  {
    name: "Pakistan", code: "PAK", type: "International",
    squad: [
      pl("Babar Azam", "B Azam", "Batsman", "RHB", "", "", ""),
      pl("Abdullah Shafique", "A Shafique", "Batsman", "RHB", "", "", ""),
      pl("Fakhar Zaman", "F Zaman", "Batsman", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Mohammad Rizwan", "M Rizwan", "Wicket Keeper", "RHB", "", "", ""),
      pl("Saud Shakeel", "S Shakeel", "Batsman", "LHB", "", "", ""),
      pl("Agha Salman", "A Salman", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Iftikhar Ahmed", "I Ahmed", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Shadab Khan", "S Khan", "All Rounder", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Mohammad Nawaz", "M Nawaz", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Shaheen Afridi", "S Afridi", "Bowler", "LHB", "Left Arm", "Fast", "Fast"),
      pl("Naseem Shah", "N Shah", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Haris Rauf", "H Rauf", "Bowler", "RHB", "Right Arm", "Fast", "Fast"),
      pl("Usama Mir", "U Mir", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Imam-ul-Haq", "Imam", "Batsman", "LHB", "", "", ""),
    ],
  },
  {
    name: "Canada", code: "CANA", type: "International",
    squad: [
      pl("Saad Bin Zafar", "S Bin Zafar", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Ravinderpal Singh", "R Singh", "Batsman", "RHB", "", "", ""),
      pl("Kanwarpal Tathgur", "K Tathgur", "Batsman", "RHB", "", "", ""),
      pl("Nicholas Kirton", "N Kirton", "Wicket Keeper", "RHB", "", "", ""),
      pl("Navneet Dhaliwal", "N Dhaliwal", "Batsman", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Manjot Buttar", "M Buttar", "Batsman", "RHB", "", "", ""),
      pl("Kaleem Sana", "K Sana", "Bowler", "LHB", "Left Arm", "Fast", "Fast Medium"),
      pl("Harsh Thaker", "H Thaker", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Dilpreet Bajwa", "D Bajwa", "All Rounder", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Dillon Heyliger", "D Heyliger", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Ansh Patel", "A Patel", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Ajayveer Hundal", "A Hundal", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Yuvraj Samra", "Y Samra", "Batsman", "RHB", "", "", ""),
      pl("Shreyas Movva", "S Movva", "Wicket Keeper", "RHB", "", "", ""),
    ],
  },
  {
    name: "Oman", code: "OMN", type: "International",
    squad: [
      pl("Jatinder Singh", "J Singh", "Batsman", "RHB", "", "", ""),
      pl("Pratik Athavale", "P Athavale", "Wicket Keeper", "RHB", "", "", ""),
      pl("Aqib Ilyas", "A Ilyas", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Shoaib Khan", "S Khan", "Batsman", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Ashish Odedara", "A Odedara", "Batsman", "RHB", "", "", ""),
      pl("Mohammad Nadeem", "M Nadeem", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Nadeem Khan", "N Khan", "Bowler", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Hassnain Ali Shah", "H Ali Shah", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Jiten Ramanandi", "J Ramanandi", "Bowler", "LHB", "Left Arm", "Fast", "Fast Medium"),
      pl("Jay Odedra", "J Odedra", "Bowler", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Shah Faisal", "S Faisal", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Karan Sonavale", "K Sonavale", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Wasim Ali", "W Ali", "Batsman", "RHB", "", "", ""),
      pl("Sufyan Mehmood", "S Mehmood", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
    ],
  },
  {
    name: "Oman Red", code: "OMRED", type: "Domestic",
    squad: [
      pl("Khurram Nawaz", "K Nawaz", "Batsman", "RHB", "", "", ""),
      pl("Sandeep Goud", "S Goud", "Wicket Keeper", "RHB", "", "", ""),
      pl("Suraj Kumar", "S Kumar", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Faisal Shah", "F Shah", "Batsman", "RHB", "", "", ""),
      pl("Bilal Khan", "B Khan", "Bowler", "LHB", "Left Arm", "Fast", "Fast Medium"),
      pl("Mohammad Imran", "M Imran", "All Rounder", "RHB", "Right Arm", "Fast", "Medium"),
      pl("Rafiullah", "Rafiullah", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Naseem Khushi", "N Khushi", "Batsman", "RHB", "", "", ""),
      pl("Vinayak Shukla", "V Shukla", "Wicket Keeper", "RHB", "", "", ""),
      pl("Samay Shrivastava", "S Shrivastava", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Hammad Mirza", "H Mirza", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Shakeel Ahmed", "S Ahmed", "Batsman", "RHB", "", "", ""),
    ],
  },
  {
    name: "Oman White", code: "OMWHT", type: "Domestic",
    squad: [
      pl("Zeeshan Maqsood", "Z Maqsood", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Kashyap Prajapati", "K Prajapati", "Batsman", "RHB", "", "", ""),
      pl("Ayaan Khan", "A Khan", "All Rounder", "RHB", "Right Arm", "Spin", "Off Spin"),
      pl("Shafiq Jan", "S Jan", "Batsman", "RHB", "", "", ""),
      pl("Fayyaz Butt", "F Butt", "Wicket Keeper", "RHB", "", "", ""),
      pl("Mehran Khan", "M Khan", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Kaleemullah", "Kaleemullah", "Bowler", "RHB", "Right Arm", "Fast", "Fast Medium"),
      pl("Sufyan Mehmood", "S Mehmood W", "Bowler", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Yousuf Mohammad", "Y Mohammad", "Batsman", "RHB", "", "", ""),
      pl("Shoaib Khan", "S Khan W", "Batsman", "RHB", "Right Arm", "Spin", "Leg Spin"),
      pl("Aamir Kaleem", "A Kaleem", "All Rounder", "LHB", "Left Arm", "Spin", "Orthodox"),
      pl("Aarif Sheikh", "A Sheikh", "Batsman", "RHB", "Right Arm", "Spin", "Off Spin"),
    ],
  },
];

function buildSeed() {
  const teams = [];
  const players = [];
  TEAM_DEFS.forEach((t, i) => {
    const teamId = `t${String(i + 1).padStart(2, "0")}`;
    teams.push({ id: teamId, name: t.name, code: t.code, type: t.type });
    t.squad.forEach((p) => {
      players.push({ ...p, teamId, teamName: t.name });
    });
  });

  const byCode = (code) => teams.find((t) => t.code === code);

  const competitions = [
    {
      id: "c01",
      name: "OMAN ODI PRACTICE TOURNAMENT 2026",
      trophy: "OMAN ODI PRACTICE TOURNAMENT 2026",
      season: "2026",
      format: "League",
      matchType: "ODI",
      startDate: "02-Feb-2026",
      endDate: "20-Mar-2026",
      teamIds: [byCode("OMRED").id, byCode("OMWHT").id],
      officialIds: ["o01", "o02", "o06", "o07"],
    },
    {
      id: "c02",
      name: "ICC Cricket World Cup 2026",
      trophy: "ICC World Cup",
      season: "2026",
      format: "League",
      matchType: "ODI",
      startDate: "05-Oct-2026",
      endDate: "20-Nov-2026",
      teamIds: [byCode("IND").id, byCode("AUS").id, byCode("ENG").id, byCode("PAK").id],
      officialIds: ["o01", "o02", "o03", "o04", "o05", "o06", "o07", "o08", "o09"],
    },
    {
      id: "c03",
      name: "Canada Tour of Oman 2026",
      trophy: "Bilateral Series",
      season: "2026",
      format: "Series",
      matchType: "T20I",
      startDate: "12-Jan-2026",
      endDate: "28-Jan-2026",
      teamIds: [byCode("CANA").id, byCode("OMN").id],
      officialIds: ["o03", "o04", "o05", "o08"],
    },
  ];

  const officials = [
    { id: "o01", name: "Richard Illingworth", role: "Umpire", country: "England", category: "International" },
    { id: "o02", name: "Chris Gaffaney", role: "Umpire", country: "New Zealand", category: "International" },
    { id: "o03", name: "Adrian Holdstock", role: "Umpire", country: "South Africa", category: "International" },
    { id: "o04", name: "Alex Wharf", role: "Umpire", country: "England", category: "International" },
    { id: "o05", name: "Allahudien Paleker", role: "Umpire", country: "South Africa", category: "International" },
    { id: "o06", name: "Ahsan Raza", role: "Umpire", country: "Pakistan", category: "International" },
    { id: "o07", name: "Ranjan Madugalle", role: "Match Referee", country: "Sri Lanka", category: "International" },
    { id: "o08", name: "Andy Pycroft", role: "Match Referee", country: "Zimbabwe", category: "International" },
    { id: "o09", name: "Javagal Srinath", role: "Match Referee", country: "India", category: "International" },
  ];

  const grounds = [
    { id: "g01", name: "Al Amerat Cricket Ground", country: "Oman", state: "Muscat", city: "Al Amerat" },
    { id: "g02", name: "Oman Cricket Academy Ground", country: "Oman", state: "Muscat", city: "Al Amerat" },
    { id: "g03", name: "M A Chidambaram Stadium", country: "India", state: "Tamil Nadu", city: "Chennai" },
    { id: "g04", name: "Melbourne Cricket Ground", country: "Australia", state: "Victoria", city: "Melbourne" },
    { id: "g05", name: "Lord's Cricket Ground", country: "England", state: "London", city: "London" },
    { id: "g06", name: "Gaddafi Stadium", country: "Pakistan", state: "Punjab", city: "Lahore" },
  ];

  const matchTypes = MATCH_TYPES;

  // One pre-existing match so Match Details / Registration have a row to resume,
  // mirroring the screenshots (OMAN RED vs OMAN WHITE).
  const red = byCode("OMRED");
  const white = byCode("OMWHT");
  const redSquad = players.filter((p) => p.teamId === red.id);
  const whiteSquad = players.filter((p) => p.teamId === white.id);
  const seedMatch = {
    id: "m0001",
    competitionId: "c01",
    competitionName: "OMAN ODI PRACTICE TOURNAMENT 2026",
    matchName: "OMANREDVSOMANWHITE050326",
    matchType: "ODI",
    overs: 50,
    matchDate: "05-03-2026 14:00",
    groundId: "g01",
    venueName: "Al Amerat Cricket Ground",
    neutralVenue: false,
    dayNight: true,
    umpire1Id: "o01",
    umpire2Id: "o02",
    umpire3Id: "",
    refereeId: "o07",
    teamA: {
      id: red.id, name: red.name, code: red.code,
      squad: redSquad.map((p) => p.id),
      playingXI: redSquad.slice(0, 11).map((p) => p.id),
      captainId: redSquad[0].id,
      keeperId: (redSquad.find((p) => p.role === "Wicket Keeper") || redSquad[1]).id,
    },
    teamB: {
      id: white.id, name: white.name, code: white.code,
      squad: whiteSquad.map((p) => p.id),
      playingXI: whiteSquad.slice(0, 11).map((p) => p.id),
      captainId: whiteSquad[0].id,
      keeperId: (whiteSquad.find((p) => p.role === "Wicket Keeper") || whiteSquad[1]).id,
    },
    status: "RESUME",
    state: null,
    createdAt: "2026-03-05T14:00:00.000Z",
  };

  return {
    version: 1,
    teams,
    players,
    competitions,
    officials,
    grounds,
    matchTypes,
    matches: [seedMatch],
  };
}

// ---- Master option lists (Bowl Spec / Shot Type / Fielding Factor) --------
// These drive the coding screen's Fast/Spin + Aggressive/Defensive grids and the
// wagon-wheel right-click fielding menu. Order here is the default display order
// (editable + reorderable from the Masters menu). The first 15 of each bowl/shot
// group fill the default grid page; the rest appear on the expand-arrow page.
const MASTER_LISTS = {
  "Ball Type": {
    Fast: ["Inswinger", "OutSwinger", "Straight Ball", "Angled In", "Angled Across",
      "Bouncer", "Nip Backer", "Nipped Away", "Slow Bouncer", "Full Toss", "Slower Ball",
      "Yorker", "Off Cutter", "Leg Cutter", "Cross Seam", "Reverse Swing",
      "Reverse Swinging Yorker", "InSwinging Yorker", "Slow Yorker", "Knuckle Ball",
      "Split Finger", "Back Hand Slower Ball", "Wide Yorker"],
    Spin: ["Off Spin", "Doosra", "Faster One", "Leg Spin", "Googly", "Flipper",
      "Orthodox", "Chinaman", "Arm Ball", "Straighter One", "Full Toss", "No turn",
      "Wrong One", "Top Spin", "Carrom Ball", "Drifter", "Under Spin", "Slider",
      "Yorker", "Back Spin", "W Yorker"],
  },
  "Shot Type": {
    Aggressive: ["Cover Drive", "Square Drive", "Straight Drive", "Off Drive", "On Drive",
      "Flick", "Cut", "Pull", "Slash", "Sweep Shot", "Slog Sweep", "Slog Shot",
      "Lofted Off", "Lofted On", "Lofted Over Cover", "Hook", "Inside Out",
      "Lofted Straight", "Chip Shot", "Upper Cut", "Punch", "Scoop", "Paddle Sweep",
      "Reverse Sweep", "Switch Hit", "Reverse Scoop", "Pick Up", "Helicopter Shot",
      "Shot Arm Pull", "Slap", "Lap Shot", "Ramp", "Reverse Lap", "Lofted Square"],
    Defensive: ["Forward Defence", "Backfoot Defence", "Glide", "Left Alone", "Push",
      "No Shot", "Late Cut", "Ducked", "Leg Glance", "Soft Hand Defence", "Steer", "Worked"],
  },
  "Fielding Factor": {
    "": ["Airborne Stop", "Airborne Catch", "Bad Throw", "Caught", "Catch Dropped",
      "Chase and Stop", "Chase and Miss", "Direct Hit", "Dive and Stop", "Dive and Miss",
      "Catch Taken", "Fumble", "Good Throw", "Missfield", "One Hand Pick and Throw",
      "Pick and Throw", "Run Out Made", "Run Out Missed", "Relay Throw", "Slide and Stop",
      "Slide and Miss", "Stumping", "Stumping Made", "Stumping Missed", "Slow to the Ball",
      "Thrown at Stumps", "Well Kept", "Well Fielded", "BACK UP", "GREAT EFFORT"],
  },
};

// Flatten to seed rows: { category, grp, name, ord } (ord per category+group).
function buildMasters() {
  const out = [];
  Object.entries(MASTER_LISTS).forEach(([category, groups]) => {
    Object.entries(groups).forEach(([grp, names]) => {
      names.forEach((name, ord) => out.push({ category, grp, name, ord }));
    });
  });
  return out;
}

module.exports = { buildSeed, buildMasters, MATCH_TYPES };
