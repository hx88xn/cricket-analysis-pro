/*
 * Where a match's video clips live on disk.
 *
 * The coding screen saves each delivery's capture into
 *   <recordings root>/<tournament>/<match>/…INN<n>-OVER<o>-BALL<b>….<ext>
 * and the Reports screen reads them back to play a ball when it is clicked.
 * Both screens must derive the folder name identically or the lookup silently
 * misses, so the naming lives here once and both pages load this file.
 */
(function () {
  var clean = function (s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); };

  // Per-match folder / filename prefix built from home (teamA) vs away (teamB)
  // and the match date, e.g. "M1NAMIBIAVSOMAN040426" (date = DDMMYY). Sanitised
  // to safe filename characters; the main process re-sanitises before use.
  window.recordingFolderName = function (match) {
    var m = match || {};
    var A = m.teamA || {}, B = m.teamB || {};
    var home = clean(A.name || A.code) || "HOME";
    var away = clean(B.name || B.code) || "AWAY";
    var d = new Date(m.matchDate);
    var date = isNaN(d) ? "" :
      String(d.getDate()).padStart(2, "0") +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getFullYear()).slice(-2);
    var num = String(m.matchNo || (String(m.id || "").match(/\d+/) || [])[0] || "").replace(/^0+/, "");
    return (num ? "M" + num : "") + home + "VS" + away + date;
  };

  // Tournament (competition) folder the match folder nests under. Falls back to
  // UNGROUPED when the match has no competition.
  window.tournamentFolderName = function (match) {
    return clean((match || {}).competitionName) || "UNGROUPED";
  };

  // The folder passed to the recordings IPC calls: "<tournament>/<match>".
  window.recordingFolderPath = function (match) {
    return window.tournamentFolderName(match) + "/" + window.recordingFolderName(match);
  };
})();
