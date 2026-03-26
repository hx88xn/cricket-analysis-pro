import re

with open('src/index.html', 'r') as f:
    content = f.read()

# Replace footer
old_footer = re.search(r'<footer class="footer">.*</footer>', content, re.DOTALL).group(0)

new_footer = """<footer class="footer">
        <div class="footer-main">
          <div class="pitch-wrap">
            <label class="pitch-radio otw-radio"><input type="radio" name="otw" checked /> OTW</label>
            <label class="pitch-radio rtw-radio"><input type="radio" name="otw" /> RTW</label>
            <label class="pitch-radio cd-radio"><input type="radio" name="otw" /> CD</label>
            
            <label class="pitch-radio blue-dot-radio"><input type="radio" name="otw_blue" checked /> </label>
            <span class="pitch-icon-radio">( )</span>

            <img
              class="pitch-map-img"
              src="assets/pitch-map.png"
              width="776"
              height="596"
              alt="Pitch map: length zones and line; OTW, RTW, CD"
              draggable="false"
            />
          </div>

          <div class="footer-radios">
            <label class="radio-pill"><input type="radio" name="ds" /> DS</label>
            <label class="radio-pill"><input type="radio" name="ds" checked /> LI</label>
            <span class="spacer"></span>
            <label class="radio-pill"><input type="radio" name="btn" /> BTN</label>
            <label class="radio-pill"><input type="radio" name="btn" checked /> UNC</label>
            <div class="select-wrap">
              <select class="dark-select">
                <option>Select</option>
                <option>Option A</option>
                <option>Option B</option>
              </select>
            </div>
            <span class="spacer"></span>
            <label class="radio-pill"><input type="radio" name="wtb" /> WTB</label>
            <label class="radio-pill"><input type="radio" name="wtb" checked /> RS</label>
            <span class="spacer"></span>
            <label class="radio-pill"><input type="radio" name="ff" /> FF</label>
            <label class="radio-pill"><input type="radio" name="ff" checked /> BF</label>
            <span class="spacer"></span>
            <label class="radio-pill"><input type="radio" name="sd" /> SD</label>
            <label class="radio-pill"><input type="radio" name="sd" checked /> CRM</label>
          </div>

          <div class="bowl-panel panel">
            <div class="toggle-row">
              <button type="button" class="toggle active" data-group="pace">Fast</button>
              <button type="button" class="toggle" data-group="pace">Spin</button>
              <label class="mph-label">MPH <input type="text" class="tiny-input" value="82" /></label>
            </div>
            <div class="btn-grid cols-5" id="bowl-grid"></div>
          </div>

          <div class="bat-panel panel">
            <div class="toggle-row">
              <button type="button" class="toggle active" data-group="style">Aggressive</button>
              <button type="button" class="toggle" data-group="style">Defensive</button>
              <label class="mph-label">6's Distance <input type="text" class="tiny-input" value="" placeholder="—" /></label>
            </div>
            <div class="btn-grid cols-5" id="bat-grid"></div>
          </div>

          <div class="keypad-panel panel">
            <button type="button" class="btn btn-block blue keypad-top">OVER THROW</button>
            <div class="keypad-grid" id="keypad"></div>
          </div>
        </div>
      </footer>"""

content = content.replace(old_footer, new_footer)

with open('src/index.html', 'w') as f:
    f.write(content)
