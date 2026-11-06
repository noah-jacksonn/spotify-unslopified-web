((scope) => {
  const date = value => {
    if (!value) return null;
    // Date-only metadata represents a local calendar day, not midnight UTC.
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  // Editors and filters use the same local calendar day. Keep the full source
  // timestamp unless the user actually changes that displayed day.
  function day(value) {
    const parsed = date(value);
    if (!parsed) return '';
    return [String(parsed.getFullYear()).padStart(4,'0'), String(parsed.getMonth()+1).padStart(2,'0'), String(parsed.getDate()).padStart(2,'0')].join('-');
  }
  function restore(value) {
    if (value?.kind === 'latest' && Number.isSafeInteger(value.count) && value.count > 0) return {kind:'latest',count:value.count};
    if (value?.kind === 'days' && [7,30,90].includes(value.count)) return {kind:'days',count:value.count};
    if (value?.kind === 'dates' && typeof value.from === 'string' && typeof value.through === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(value.from) && /^\d{4}-\d{2}-\d{2}$/.test(value.through) &&
        date(value.from) && date(value.through) && value.from <= value.through) {
      return {kind:'dates',from:value.from,through:value.through};
    }
    return {kind:'all'};
  }
  const storageKey = (sourceID, playlist) => 'importedSongFilter:' + JSON.stringify([sourceID,playlist]);
  function apply(songs, filter, now = new Date()) {
    const newestFirst = songs.map((song,index) => ({song,index,time:(date(song.createdAt) || date(song.importedAt))?.getTime() ?? -Infinity}))
      .sort((a,b) => (b.time-a.time) || a.index-b.index).map(entry => entry.song);
    if (filter.kind === 'latest') {
      return newestFirst.slice(0,filter.count);
    }
    if (!['days','dates'].includes(filter.kind)) return newestFirst;
    let from, through;
    if (filter.kind === 'days') {
      through = new Date(now.getFullYear(),now.getMonth(),now.getDate());
      from = new Date(through); from.setDate(from.getDate() - filter.count + 1);
    } else { from = date(filter.from); through = date(filter.through); }
    const end = through && new Date(through); if (end) end.setDate(end.getDate()+1);
    return newestFirst.filter(song => { const created = date(song.createdAt); return created && (!from || created >= from) && (!end || created < end); });
  }
  function label(filter) {
    if (filter.kind === 'latest') return 'Latest ' + filter.count;
    if (filter.kind === 'days') return filter.count === 7 ? 'Past week' : 'Past ' + filter.count + ' days';
    return filter.kind === 'dates' ? 'Custom dates' : 'All songs';
  }
  scope.SongFilter = {apply, label, restore, storageKey, day};
  if (typeof module !== 'undefined') module.exports = scope.SongFilter;
})(globalThis);
