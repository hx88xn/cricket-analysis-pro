const screenDefs = {
  "config-menu": {
    title: "Configuration Menu",
    back: "home.html",
    body: `
      <section class="card-grid">
        <a class="menu-card" href="prototype.html?screen=db-config"><div><div class="icon">🗄️</div><div class="label">Database Configuration</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=app-config"><div><div class="icon">🗄️</div><div class="label">Application Configuration</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shortcut-config"><div><div class="icon">🗄️</div><div class="label">Shortcut Configuration</div><div class="line"></div></div></a>
      </section>
    `,
  },
  "app-config": {
    title: "Application Configuration",
    back: "prototype.html?screen=config-menu",
    body: `
      <section class="action-column">
        <div class="mode-panel">
          <div class="mode-title">Operation Mode</div>
          <div class="mode-opts"><span>Offline</span><span>Online 1</span><span>Online 2</span></div>
        </div>
        <div class="dark-btn">Import Reconciled Data</div>
        <div class="dark-btn">Import Master Data</div>
      </section>
      <section class="mini-brand">
        <div class="hero-mark">
          <div class="bat-icon"></div>
          <h2 class="cap-title"><strong>C</strong>ricket <span class="tag">a</span>nalysis <strong>P</strong>ro</h2>
          <div class="cap-version">Version 4.0</div>
        </div>
      </section>
    `,
  },
  "db-config": {
    title: "Database Configuration",
    back: "prototype.html?screen=config-menu",
    body: `
      <section class="action-column" style="padding-top: 150px;">
        <div class="dark-btn">Backup Database</div>
        <div class="dark-btn">Restore Database</div>
        <div class="dark-btn">Export</div>
      </section>
      <section class="mini-brand">
        <div class="hero-mark">
          <div class="bat-icon"></div>
          <h2 class="cap-title"><strong>C</strong>ricket <span class="tag">a</span>nalysis <strong>P</strong>ro</h2>
          <div class="cap-version">Version 4.0</div>
        </div>
      </section>
    `,
  },
  "shortcut-config": {
    title: "Shortcut Configuration",
    back: "prototype.html?screen=config-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1fr 1fr;">
          <div class="form-grid" style="grid-template-columns: 290px 1fr;">
            <label class="field-label">Start / End Over</label><input class="field-control" />
            <label class="field-label">Start / End Ball</label><input class="field-control" />
            <label class="field-label">Start / End Capture</label><input class="field-control" />
            <label class="field-label">Browse Video</label><input class="field-control" />
            <label class="field-label">Bowling Compute</label><input class="field-control" />
          </div>
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Appeals</label><input class="field-control" />
            <label class="field-label">Fielding Events</label><input class="field-control" />
            <label class="field-label">Match Events</label><input class="field-control" />
            <label class="field-label">Remarks</label><input class="field-control" />
            <label class="field-label">Wickets</label><input class="field-control" />
            <label class="field-label">Edit Mode</label><input class="field-control" />
          </div>
        </div>
        <div class="btn-row" style="margin-top: 28px;">
          <button class="btn-main btn-green">Save</button>
        </div>
      </section>
    `,
  },
  "masters-menu": {
    title: "Masters Menu",
    back: "home.html",
    body: `
      <section class="card-grid" style="grid-template-columns: 1fr repeat(5, 1fr);">
        <a class="menu-card" href="prototype.html?screen=user-creation" style="grid-row: 1 / span 2;"><div><div class="icon">👤</div><div class="label">User Creation</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=competition-master"><div><div class="icon">🏆</div><div class="label">Competition</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=team-master"><div><div class="icon">👥</div><div class="label">Team</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=player-master"><div><div class="icon">🧢</div><div class="label">Players</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=official-master"><div><div class="icon">☝️</div><div class="label">Officials</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=coach-master"><div><div class="icon">📣</div><div class="label">Coach</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=ground-master"><div><div class="icon">⭕</div><div class="label">Ground</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=shot-type"><div><div class="icon">🏏</div><div class="label">Shot Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=ball-type"><div><div class="icon">⚾</div><div class="label">Ball Type</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=bowl-spec"><div><div class="icon">🥎</div><div class="label">Bowl Spec</div><div class="line"></div></div></a>
        <a class="menu-card" href="prototype.html?screen=fielding-factors"><div><div class="icon">🕓</div><div class="label">Fielding Factors</div><div class="line"></div></div></a>
      </section>
    `,
  },
  "competition-master": {
    title: "Competition Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1.25fr 1fr;">
          <div>
            <div class="form-grid" style="grid-template-columns: 320px 1fr;">
              <label class="field-label">Competition Name *</label><input class="field-control" />
              <label class="field-label">Season *</label><input class="field-control" />
              <label class="field-label">Trophy *</label><input class="field-control" />
              <label class="field-label">Format *</label><select class="field-select"><option>Select Format</option></select>
              <label class="field-label">Video Location</label><input class="field-control" />
              <label class="field-label">Match Type *</label>
              <div class="checkbox-list">
                <div>Test</div><div>ODI</div><div>T20I</div><div>100 Balls</div><div>First Class</div><div>List A</div><div>T20D</div><div>T10D</div><div>Others</div>
              </div>
            </div>
          </div>
          <div class="option-split">
            <div class="list-box">
              <h4>List of Teams</h4>
              <ul><li>Afghanistan</li><li>Australia</li><li>Canada</li><li>India</li><li>India A</li><li>Ireland</li><li>Italy</li></ul>
            </div>
            <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">→</div><div class="swap-btn swap-red">←</div></div></div>
            <div class="list-box" style="grid-column: span 2;">
              <h4>Participating Teams</h4>
              <ul><li>Team Name</li></ul>
            </div>
          </div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button><button class="btn-main btn-blue">Team Squad</button></div>
        ${buildTable(["Competition Name", "Trophy", "Match Type", "Start Date", "End Date", "Fixture"], [["OMAN ODI PRACTICE TOURNAMENT 2026", "OMAN ODI PRACTICE TOURNAMENT 2026", "ODI", "02-Feb-2026", "20-Mar-2026", "Fixture"]])}
      </section>
    `,
  },
  "team-master": {
    title: "Team Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout">
          <div class="form-grid" style="grid-template-columns: 230px 1fr;">
            <label class="field-label">Team Name</label><input class="field-control" />
            <label class="field-label">Team Code</label><input class="field-control" />
            <label class="field-label">Team Type</label>
            <div class="checkbox-list"><div>International</div><div>Domestic</div><div>State</div><div>District</div><div>City</div><div>School</div><div>Club</div></div>
          </div>
          <div>
            <div class="panel-header">Team Logo</div>
            <div class="photo-box">📷</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Team Name", "Team Code", "Team Type"], [["AFGHANISTAN", "AFG", "International"], ["AUSTRALIA", "AUS", "International"], ["CANADA", "CANA", "International"], ["INDIA", "IND", "International"]])}
      </section>
    `,
  },
  "player-master": {
    title: "Player Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1.4fr 0.8fr;">
          <div class="form-grid" style="grid-template-columns: 250px 1fr;">
            <label class="field-label">Player Name</label><input class="field-control" />
            <label class="field-label">Short Name</label><input class="field-control" />
            <label class="field-label">Team Name</label><div class="checkbox-list"><div>Afghanistan</div><div>Australia</div><div>Canada</div><div>India</div><div>India A</div><div>Ireland</div></div>
            <label class="field-label">DOB</label><input class="field-control" placeholder="DD/MM/YYYY" />
            <label class="field-label">Player ID</label><input class="field-control" />
            <label class="field-label">Batting Style</label><div class="inline-checks"><span>RHB</span><span>LHB</span></div>
            <label class="field-label">Batting Order</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Bowling Style</label><div class="inline-checks"><span>Right Arm</span><span>Left Arm</span></div>
            <label class="field-label">Bowling Type</label><div class="inline-checks"><span>Fast</span><span>Spin</span></div>
            <label class="field-label">Bowling Specialization</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Player Role</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Nationality</label><select class="field-select"><option>Select</option></select>
          </div>
          <div>
            <div class="panel-header">Player Portrait</div>
            <div class="photo-box">📷</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button><button class="btn-main btn-yellow">Player Default</button></div>
        ${buildTable(["S.NO", "Player Name", "Batting Style", "Bowling Style", "Role"], [["1", "AAMIR KALEEM", "Left Hand Bat", "Left Arm", "All Rounder"], ["2", "AARIF SHEIKH", "Right Hand Bat", "Right Arm", "Batsman"], ["3", "AASIF SHEIKH", "Right Hand Bat", "", "Wicket Keeper"], ["4", "ABDOLL AH AHMADZAI", "Right Hand Bat", "Right Arm", "All Rounder"]])}
      </section>
    `,
  },
  "official-master": {
    title: "Officials Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout">
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Name</label><input class="field-control" />
            <label class="field-label">Role</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">State</label><input class="field-control" />
            <label class="field-label">Country</label><input class="field-control" />
            <label class="field-label">Officials Category</label><div class="checkbox-list"><div>International</div><div>Domestic</div><div>Elite</div><div>Plate</div></div>
          </div>
          <div>
            <div class="panel-header">Officials Portrait</div>
            <div class="photo-box">📷</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Officials Name", "Country", "Role"], [["ABHIJEET BENGERI", "", "Umpire"], ["ADRIAN HOLDSTOCK", "", "Umpire"], ["ALEX WHARF", "", "Umpire"], ["ALLAHUDIEN PALEKER", "", "Umpire"]])}
      </section>
    `,
  },
  "coach-master": {
    title: "Coach Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout">
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Coach Name</label><input class="field-control" />
            <label class="field-label">Team</label><div class="checkbox-list"><div>Afghanistan</div><div>Australia</div><div>Canada</div><div>India</div></div>
            <label class="field-label">Specialization</label><div class="checkbox-list"><div>Assistance</div><div>Batting</div><div>Bowling</div><div>Fielding</div></div>
          </div>
          <div>
            <div class="panel-header">Coach Portrait</div>
            <div class="photo-box">📷</div>
          </div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Coach Name", "Coach Specialization"], [["", ""], ["", ""], ["", ""], ["", ""]])}
      </section>
    `,
  },
  "ground-master": {
    title: "Ground Master",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1fr 0.8fr 0.9fr;">
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Ground Name</label><input class="field-control" />
            <label class="field-label">Country</label><input class="field-control" />
            <label class="field-label">State</label><input class="field-control" />
            <label class="field-label">City</label><input class="field-control" />
            <label class="field-label">Ground Profile</label><textarea class="field-textarea"></textarea>
          </div>
          <div><div class="panel-header">Ground Image</div><div class="photo-box">📷</div></div>
          <div><div class="panel-header">Ground Size In Meters</div><div class="ground-viz">🟢</div></div>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Ground Name", "Country", "State", "City"], [["BCCI Centre of Excellence Ground 1", "India", "Karnataka", "Bengaluru"], ["Colombo Cricket Club Ground", "Sri Lanka", "Colombo", "Colombo"], ["M A Chidambaram Stadium", "India", "Tamil Nadu", "Chennai"]])}
      </section>
    `,
  },
  "shot-type": {
    title: "Shot Type",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 980px;">
        <div class="form-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Shot Name</label><input class="field-control" />
          <label class="field-label">Shot Type</label><select class="field-select"><option>Select</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Shot Name", "Shot Type"], [["1", "Cover Drive", "Aggressive"], ["2", "Square Drive", "Aggressive"], ["3", "Straight Drive", "Aggressive"], ["4", "Off Drive", "Aggressive"], ["5", "On Drive", "Aggressive"]])}
        <div class="btn-row"><button class="btn-main btn-blue" style="min-width: 400px;">Save Order</button></div>
      </section>
    `,
  },
  "ball-type": {
    title: "Ball Type",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 980px;">
        <div class="form-grid" style="grid-template-columns: 180px 1fr;">
          <label class="field-label">Ball Type</label><input class="field-control" />
          <label class="field-label">Bowler Type</label><select class="field-select"><option>Select</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Ball Type", "Bowler Type"], [["1", "Inswinger", "Fast"], ["2", "Off Spin", "Spin"], ["3", "OutSwinger", "Fast"], ["4", "Doosra", "Spin"], ["5", "Faster One", "Spin"]])}
        <div class="btn-row"><button class="btn-main btn-blue" style="min-width: 400px;">Save Order</button></div>
      </section>
    `,
  },
  "bowl-spec": {
    title: "Bowler Specialization",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1060px;">
        <div class="form-grid" style="grid-template-columns: 260px 1fr;">
          <label class="field-label">Bowler Specialization</label><input class="field-control" />
          <label class="field-label">Bowling Type</label><select class="field-select"><option>Select</option></select>
          <label class="field-label">Bowling Style</label><select class="field-select"><option>Select</option></select>
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Bowler Specialization", "Bowling Style", "Bowling Type"], [["CHINAMAN", "Left Arm", "Spin"], ["FAST", "Both", "Fast"], ["LEG SPIN", "Right Arm", "Spin"], ["OFF SPIN", "Right Arm", "Spin"]])}
      </section>
    `,
  },
  "fielding-factors": {
    title: "Fielding Factors",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1040px;">
        <div class="form-grid" style="grid-template-columns: 210px 1fr;">
          <label class="field-label">Fielding Factor</label><input class="field-control" />
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Order No", "Fielding Factor"], [["1", "Airborne Stop"], ["2", "Airborne Catch"], ["3", "Bad Throw"], ["4", "Caught"], ["5", "Catch Dropped"], ["6", "Chase and Stop"]])}
        <div class="btn-row"><button class="btn-main btn-blue" style="min-width: 400px;">Save Order</button></div>
      </section>
    `,
  },
  "user-creation": {
    title: "User Creation",
    back: "prototype.html?screen=masters-menu",
    body: `
      <section class="form-screen" style="max-width: 1080px;">
        <div class="form-grid" style="grid-template-columns: 220px 1fr;">
          <label class="field-label">Display Name</label><input class="field-control" />
          <label class="field-label">User Role</label><select class="field-select"><option>Select</option></select>
          <label class="field-label">Machine ID</label><input class="field-control" />
          <label class="field-label">License Upto</label><input class="field-control" placeholder="DD/MM/YYYY" />
          <label class="field-label">Login ID</label><input class="field-control" />
          <label class="field-label">Password</label><input class="field-control" />
        </div>
        <div class="btn-row"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        ${buildTable(["Display Name", "User Role", "Machine id", "Login id"], [["", "", "", ""], ["", "", "", ""]])}
      </section>
    `,
  },
  "match-registration": {
    title: "Match Registration",
    back: "home.html",
    body: `
      <section class="form-screen">
        <div class="form-layout" style="grid-template-columns: 1fr 1fr 1fr;">
          <div class="form-grid" style="grid-template-columns: 220px 1fr;">
            <label class="field-label">Competition Name</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Match Name</label><input class="field-control" />
            <label class="field-label">Match Type</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Number of Overs</label><input class="field-control" />
            <label class="field-label">Match Date</label><input class="field-control" placeholder="DD-MM-YYYY 00:00" />
            <label class="field-label">Venue</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Home Team</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Away Team</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Umpire 1</label><select class="field-select"><option>Select</option></select>
            <label class="field-label">Umpire 2</label><select class="field-select"><option></option></select>
            <label class="field-label">Umpire 3</label><select class="field-select"><option></option></select>
            <label class="field-label">Match Referee</label><select class="field-select"><option>Select</option></select>
          </div>
          <div>
            <div class="option-split">
              <div class="list-box"><h4>TEAM A - Squad</h4></div>
              <div class="list-box"><h4>Playing XI</h4></div>
              <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">→</div><div class="swap-btn swap-red">←</div></div></div>
              <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">↑</div><div class="swap-btn swap-red">↓</div></div></div>
            </div>
          </div>
          <div>
            <div class="option-split">
              <div class="list-box"><h4>TEAM B - Squad</h4></div>
              <div class="list-box"><h4>Playing XI</h4></div>
              <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">→</div><div class="swap-btn swap-red">←</div></div></div>
              <div class="center-stack"><div class="swapper"><div class="swap-btn swap-green">↑</div><div class="swap-btn swap-red">↓</div></div></div>
            </div>
          </div>
        </div>
        <div class="btn-row" style="justify-content: flex-end;"><button class="btn-main btn-green">Save</button><button class="btn-main btn-yellow">Clear</button><button class="btn-main btn-red">Delete</button></div>
        <div class="btn-row" style="justify-content: flex-start;">
          <a class="btn-main btn-blue" style="text-decoration: none;" href="prototype.html?screen=match-details">Match Details</a>
          <a class="btn-main btn-blue" style="text-decoration: none;" href="index.html">Coding Menu</a>
        </div>
        ${buildTable(["Competition Name", "Match Name", "Match Type", "Team A", "Team B", "Match Status"], [["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE180326", "ODI", "OMAN RED", "OMAN WHITE", "RESUME"], ["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE100326", "ODI", "OMAN RED", "OMAN WHITE", "RESUME"], ["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE050326", "ODI", "OMAN RED", "OMAN WHITE", "COMPLETED"]])}
      </section>
    `,
  },
  "match-details": {
    title: "Match Details",
    back: "prototype.html?screen=match-registration",
    body: `
      <section class="form-screen">
        <div class="btn-row" style="justify-content: flex-end; margin-top: 0;">
          <a class="btn-main btn-green" style="text-decoration: none;" href="prototype.html?screen=match-registration">+ Create Match</a>
        </div>
        ${buildTable(["Competition Name", "Match Name", "Match Type", "Team A", "Team B", "Status"], [["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE180326", "ODI", "OMAN RED", "OMAN WHITE", "RESUME"], ["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE100326", "ODI", "OMAN RED", "OMAN WHITE", "RESUME"], ["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE050326", "ODI", "OMAN RED", "OMAN WHITE", "COMPLETED"], ["OMAN ODI PRACTICE TOURNAMENT 2026", "OMANREDVSOMANWHITE020326", "ODI", "OMAN RED", "OMAN WHITE", "RESUME"]], "min-height: 700px;")}
      </section>
    `,
  },
  reports: {
    title: "CAP Reports",
    back: "home.html",
    body: `
      <section class="reports-screen">
        <aside class="report-sidebar">
          <div class="report-field"><label>Match Type</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Competition</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Match</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Batting Team</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Striker</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Bowler</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Wicket Type</label><select><option>Select</option></select></div>
          <div class="report-field"><label>Runs</label><select><option>Select</option></select></div>
          <div class="report-actions">
            <button class="btn-main btn-green">Show Reports</button>
            <button class="btn-main btn-yellow">Match Report</button>
            <button class="btn-main btn-red">Export Video</button>
            <button class="btn-main btn-red">Play Video</button>
          </div>
          <div class="btn-row" style="margin-top: 8px;"><button class="btn-main btn-blue" style="width:100%;">Select Filter</button></div>
        </aside>
        <div class="report-pane">
          <div class="tab-grid">
            <span>Bowler Vs Batsman</span><span>Report</span><span>Sector Wagon</span><span>Session Report</span><span>Shot Selection</span><span>Wagon Wheel</span>
            <span>Statistics</span><span>Appeal Report</span><span>Batsman KPI</span><span>Batsman Vs Bowler</span><span>Boundary NextBall</span><span>Bowler KPI</span>
          </div>
          <div class="table-empty"></div>
        </div>
      </section>
    `,
  },
  "video-settings": {
    title: "Video Settings",
    back: "home.html",
    body: `
      <section class="video-screen">
        <div>
          <div class="video-preview"></div>
          <div class="btn-row"><button class="btn-main btn-green">Play</button><button class="btn-main btn-green">Overlay</button><button class="btn-main btn-green">Start Capture</button></div>
        </div>
        <div class="video-settings-group">
          <div class="inline-checks"><span>Local video capturing</span></div>
          <button class="btn-main btn-blue">Choose Device</button>
          <input class="field-control" value="CY3014 USB, Analog 02 Capture" />
          <button class="btn-main btn-blue">Choose Video Resolution</button>
          <input class="field-control" value="1024x768 RGB, 24 bit" />
          <div class="inline-checks"><span>Deinterlace</span></div>
          <button class="btn-main btn-blue">Choose Video Input</button>
          <div class="inline-checks"><span>Video Bitrate</span><span>High</span><span>Medium</span><span>Low</span></div>
          <div class="inline-checks"><span>Record Audio</span></div>
          <div class="inline-checks"><span>Graphics Card</span><span>Intel</span><span>NVidia</span></div>
          <div class="btn-row" style="justify-content:flex-start;"><button class="btn-main btn-green">Save</button></div>
        </div>
      </section>
    `,
  },
};

function buildTable(columns, rows, extraStyle = "") {
  const cols = `repeat(${columns.length}, minmax(0, 1fr))`;
  const head = columns.map((col) => `<span>${col}</span>`).join("");
  const body = rows
    .map((row) => `<div class="table-row" style="grid-template-columns:${cols};">${row.map((cell) => `<span>${cell}</span>`).join("")}</div>`)
    .join("");
  return `
    <section class="table-shell" style="${extraStyle}">
      <div class="table-head" style="grid-template-columns:${cols};">${head}</div>
      <div class="table-rows">${body}</div>
    </section>
  `;
}

function getScreenKey() {
  const params = new URLSearchParams(window.location.search);
  const key = params.get("screen");
  if (!key || !screenDefs[key]) return "config-menu";
  return key;
}

function renderScreen() {
  const key = getScreenKey();
  const def = screenDefs[key];
  const titleEl = document.getElementById("screen-title");
  const bodyEl = document.getElementById("screen-body");
  const backEl = document.getElementById("back-link");

  titleEl.textContent = def.title;
  bodyEl.innerHTML = def.body;
  backEl.href = def.back || "home.html";
}

renderScreen();
