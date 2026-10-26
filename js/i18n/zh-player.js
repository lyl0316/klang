// Simplified Chinese strings for the player area. Keys are the English interface text (see js/i18n.js).
// Previews (ui/preview.js, ui/player.js playAllButton), the dock's mini player (main.js) and the
// Now-listening view (ui/player.js). Work and track titles inside sentences go in 《》.
export default {
  // ▶ Preview / Apple Music Classical ↗ (ui/preview.js)
  Preview: '试听', Resume: '继续', 'Play a 30-second preview': '试听 30 秒片段', 'No preview for this recording': '此录音没有试听片段',
  'Couldn’t load the preview': '无法加载试听', Open: '打开', 'Play {title} in full in {app}': '在 {app} 中完整播放《{title}》',
  'Preview {title}': '试听《{title}》', 'No previews for these pieces': '这些作品没有试听片段',
  'Preview the whole list, 30 seconds of each piece': '依次试听全部作品，每首 30 秒',

  // mini player (main.js)
  '30-second preview': '30 秒试听', 'Preview · {time} left': '试听 · 剩余 {time}', 'Preview paused': '试听已暂停',
  'Pause the preview': '暂停试听', 'Play the preview': '播放试听', 'Preview: {title}. Show details': '试听：《{title}》。显示详情',
  'Next preview': '下一段试听', 'Next preview: {title}': '下一段试听：《{title}》',

  // Now listening view (ui/player.js)
  'Close Now listening': '关闭“正在聆听”', 'Up next': '接下来', 'Cover of {title}': '《{title}》的封面', Recording: '录音',
  'Play in full in {app}': '在 {app} 中完整播放', 'Save {title} to your Library': '将《{title}》收藏到资料库',
  'Preview stopped': '已停止试听', 'Stop preview': '停止试听',
  'Play in {app}': '在 {app} 中播放', 'Play {title} in {app}': '在 {app} 中播放《{title}》',
  'Plays in full in {app} with your subscription.': '使用你的订阅在 {app} 中完整播放。',
  'Pieces now open in {app}': '作品将在 {app} 中打开', 'Use {app} instead': '改用 {app}',
  'Whole album': '整张专辑', 'Play the whole album {album} in {app}': '在 {app} 中播放整张专辑《{album}》',
  'Now listening cleared': '已清除“正在聆听”', 'Clear Now listening': '清除“正在聆听”',
  'That was the last piece of this run.': '这是本轮播放的最后一首。',

  // Apple's credits (music.js ITUNES_CREDIT, applemusic.js APPLE_CREDIT)
  '30-second previews provided courtesy of iTunes. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.':
    '30 秒试听片段由 iTunes 提供。完整作品可在 Apple Music 古典乐或 Apple Music 中收听，需使用你自己的订阅。',
  'Recording details come from Apple’s iTunes Search API. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.':
    '录音信息来自 Apple 的 iTunes Search API。完整作品可在 Apple Music 古典乐或 Apple Music 中收听，需使用你自己的订阅。',
};
