import re

with open('src/styles.css', 'r') as f:
    orig = f.read()

# Replace footer-radios
orig = re.sub(
    r'\.footer-radios \{.*?\n\}',
    '''.footer-radios {
  grid-column: 2 / span 2;
  grid-row: 1;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 0 4px;
  font-size: 11px;
  color: var(--muted);
}
.spacer {
  width: 16px;
}''',
    orig,
    flags=re.DOTALL
)

# Replace footer-main
orig = re.sub(
    r'\.footer-main \{\s+display: grid;\s+grid-template-columns: minmax\(0, 1\.2fr\) minmax\(0, 1\.15fr\) minmax\(0, 1\.15fr\) minmax\(130px, 0\.75fr\);\s+gap: 7px;\s+align-items: stretch;\s+min-height: 0;\s+flex: 1;\s+\}',
    '''.footer-main {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(130px, 0.75fr);
  grid-template-rows: auto 1fr;
  gap: 7px;
  align-items: stretch;
  min-height: 0;
  flex: 1;
}''',
    orig
)

# Replace pitch-wrap
orig = re.sub(
    r'\.pitch-wrap \{\s+border: 1px solid var\(--border\);\s+background: #0a0e14;\s+border-radius: 3px;\s+padding: 4px;\s+display: flex;\s+align-items: center;\s+justify-content: center;\s+overflow: hidden;\s+min-height: 0;\s+min-width: 0;\s+\}',
    '''.pitch-wrap {
  grid-column: 1;
  grid-row: 1 / span 2;
  border: 1px solid var(--border);
  background: #0a0e14;
  border-radius: 3px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 0;
  min-width: 0;
}''',
    orig
)

# Append new styles right before @media
new_styles = '''
.pitch-radio {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  z-index: 10;
  cursor: pointer;
  user-select: none;
}
.pitch-radio input {
  accent-color: var(--green-border);
  width: 14px;
  height: 14px;
  margin: 0;
}
.otw-radio {
  top: 6%;
  left: 6%;
}
.rtw-radio {
  top: 6%;
  right: 6%;
}
.cd-radio {
  top: 22%;
  right: 6%;
}
.cd-radio input, .blue-dot-radio input {
  accent-color: var(--blue);
}
.blue-dot-radio {
  top: 40%;
  left: 6%;
}
.pitch-icon-radio {
  position: absolute;
  top: 55%;
  left: 6%;
  color: var(--blue);
  font-weight: 700;
  font-size: 14px;
  z-index: 10;
  letter-spacing: -1px;
}
.bowl-panel {
  grid-column: 2;
  grid-row: 2;
}
.bat-panel {
  grid-column: 3;
  grid-row: 2;
}
.keypad-panel {
  grid-column: 4;
  grid-row: 1 / span 2;
}

'''
orig = orig.replace('@media (max-width: 1400px) {', new_styles + '@media (max-width: 1400px) {')

with open('src/styles.css', 'w') as f:
    f.write(orig)
