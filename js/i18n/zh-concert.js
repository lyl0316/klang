// Simplified Chinese strings for the concert page, Listen/Versions and Save sheets. Keys are the English interface text (see js/i18n.js).
// Shared words (聆听, 曲目, 节目册, 收藏, 想去, 去过…) come from zh-shell.js; preview words (试听, 继续) from zh-player.js.
// Titles, venue and organiser names, work titles and the programme notes are never translated.
export default {
  // header band, action bar
  'Venue to be announced': '场馆待定', 'Duration: ≈ {n} min': '时长：约 {n} 分钟',
  '{zone} time: {when}': '{zone} 当地时间：{when}',
  'Favourite venue: {name}': '喜欢的场馆：{name}', 'Favourite this venue': '喜欢此场馆',
  'This concert has been cancelled. Check with the venue about tickets or a new date.': '这场音乐会已取消。退票或改期事宜请咨询场馆。',
  'Hidden from your lists': '已从你的列表中隐藏', 'Show again': '重新显示',
  'Hidden from your lists — undo in Me › Hidden concerts': '已从你的列表中隐藏，可在“我的 › 已隐藏的音乐会”中恢复',
  'Shown in your lists again': '已重新显示在你的列表中',
  'Concert sections': '音乐会栏目', 'Tickets (opens the organiser’s site)': '购票（打开主办方网站）',
  'Share concert': '分享音乐会',

  // marks + review
  'Saved to My Concerts': '已收藏到“我的音乐会”', 'Removed from Saved': '已取消收藏',
  'Marked as Going': '已标记为“想去”', 'No longer Going': '已取消“想去”',
  'Marked as Attended — add your review': '已标记为“去过”，写下你的评价吧', 'Removed from Attended': '已取消“去过”',
  'This concert was cancelled': '这场音乐会已取消', 'Available once the concert has started': '音乐会开始后可用',
  '{n} out of 5 stars': '{n} 星（满分 5 星）', '{n} star': '{n} 星', '{n} stars': '{n} 星',
  'Your review': '我的评价', 'Write a review': '写评价',
  'Favourite piece: ': '最喜欢的作品：', 'Encores: ': '返场曲目：',
  'Private · saved on this device only': '私密 · 仅保存在此设备上',
  'How was it? Rate it, pick your favourite piece and note the encores. Only you can see it.': '感觉如何？打个分，选出最喜欢的作品，再记下返场曲目。只有你自己能看到。',
  'There’s nothing to review for this date.': '这场演出无需评价。',
  'You haven’t reviewed this performance yet': '你还没有评价这场演出',
  'Mark it as Attended to leave a review': '标记为“去过”后即可写评价',
  'No favourite': '暂不选择', 'e.g. Chopin: Nocturne Op. 9 No. 2': '例如：肖邦《夜曲》Op. 9 No. 2',
  'What stayed with you?': '有什么让你念念不忘？', Rating: '评分', 'Favourite piece': '最喜欢的作品',
  Encores: '返场曲目', 'Private note': '私人笔记', 'Save review': '保存评价', 'Clear review': '清除评价',
  'Review cleared': '评价已清除', 'Review saved': '评价已保存',
  'Stored only on this device · included in your backup': '仅保存在此设备上 · 包含在备份中',

  // listen carousel
  'Loading recordings…': '正在加载录音…', 'Couldn’t load recordings': '无法加载录音', 'Couldn’t load recordings.': '无法加载录音。',
  'Try again': '重试', 'No recording found on Apple Music': '在 Apple Music 上未找到录音', 'Search {app}': '在 {app} 中搜索',
  'Play a 30-second preview of {title}': '试听“{title}”的 30 秒片段',
  'Play a 30-second preview of {title} ({artist})': '试听“{title}”（{artist}）的 30 秒片段',
  'Versions: all recordings of {title}': '版本：“{title}”的全部录音',
  'Play the whole album “{title}” in {app}': '在 {app} 中播放整张专辑“{title}”',
  'In Library': '已在资料库', Add: '添加',
  'Saved in your Library: {title}. Change where it is saved': '已存入资料库：{title}。轻点可更改存放位置',
  'Save {title} to your Library': '将“{title}”存入资料库',
  'Recordings of the programme': '本场曲目的录音',
  Pause: '暂停', 'Loading…': '正在加载…',
  'Preview the whole programme: 30 seconds of each movement, in order': '试听整场曲目：按顺序播放每个乐章的 30 秒片段',
  'Previewing {i} of {n}: {title}': '正在试听（{i}/{n}）：{title}',
  '30-second previews of the whole programme, in order': '按顺序试听整场曲目，每段 30 秒',
  'No previews for this programme': '这场演出的曲目暂无试听',
  'Open in {app}': '在 {app} 中打开',
  'Open the {n} work of the programme in {app}': '在 {app} 中打开本场的 {n} 部作品',
  'Open the {n} works of the programme in {app}': '在 {app} 中打开本场的 {n} 部作品',
  'Plays in full in {app}': '在 {app} 中完整播放', '⏭\uFE0E in the player bar for the next piece': '轻点播放栏中的 ⏭\uFE0E 播放下一首',
  'Add playlist to my Library': '将播放列表添加到我的资料库', '{n} work': '{n} 部作品', '{n} works': '{n} 部作品',
  'Playlist added to your Library': '播放列表已添加到资料库', 'Playlist removed from your Library': '播放列表已从资料库移除',
  // music.js ITUNES_CREDIT and applemusic.js APPLE_CREDIT (shown through t())
  '30-second previews provided courtesy of iTunes. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.':
    '30 秒试听片段由 iTunes 提供。完整作品可在 Apple Music 古典乐或 Apple Music 中播放，需使用你自己的订阅。',
  'Recording details come from Apple’s iTunes Search API. Pieces play in full in Apple Music Classical or Apple Music, with your own subscription.':
    '录音信息来自 Apple 的 iTunes Search API。完整作品可在 Apple Music 古典乐或 Apple Music 中播放，需使用你自己的订阅。',
  'Play {title} in {app}': '在 {app} 中播放“{title}”',

  // program, program book
  'Work to be announced': '作品待公布', '{name} — work page': '{name}——作品页面',
  'Performers and programme to be announced.': '演出者和曲目待公布。', 'Programme to be announced.': '曲目待公布。',
  'From the organiser': '来自主办方', 'Programme notes': '节目说明', 'Listen for ': '聆听要点：',
  'Program book · double-tap for full screen': '节目册 · 轻点两下全屏阅读', 'Chapter {n}: {title}': '第 {n} 章：{title}',
  Chapters: '章节', 'Double-tap for full screen': '轻点两下即可全屏阅读', 'Read the program book full screen': '全屏阅读节目册',

  // podcasts, artists
  '{title} — {show} (Apple Podcasts)': '{title}——{show}（Apple 播客）',
  'Featured artists': '相关艺术家', 'Favourite {name}': '喜欢 {name}',

  // where the listing comes from
  'Listing from {name}': '演出信息来自 {name}', 'Details & tickets': '详情与购票',
  'Details & tickets on the organiser’s site': '在主办方网站查看详情与购票',
  'Facts only; details and tickets on the organiser’s site.': '此处仅列出基本信息，详情与购票请见主办方网站。',
  'Licence: open use, source must be given.': '许可：可自由使用，但须注明来源。',
  'Imported by you': '由你导入', 'Open the original': '查看原始页面',
  'Check times and programme with the organiser.': '请向主办方核对时间和曲目。',

  // report a problem, share sheet
  'This listing comes from {name}’s own website, which Klang reads every day. Klang has no server of its own, so it can’t forward a report.':
    '这条演出信息来自 {name} 的官方网站，Klang 每天读取一次。Klang 没有自己的服务器，因此无法代为转交问题报告。',
  'the organiser': '主办方',
  'You imported this listing on this device from a calendar file or feed, so any mistake is in that source.':
    '这条演出信息是你在此设备上从日历文件或订阅源导入的，如有错误，需在该来源中更正。',
  'Check the date, time and programme on the organiser’s page — copy the details below to send them.':
    '请在主办方页面核对日期、时间和曲目；如需反馈，可拷贝下方信息发送给主办方。',
  'When the organiser corrects its page, Klang shows the change after the next daily update.':
    '主办方更正页面后，Klang 会在下一次每日更新时同步更改。',
  'Or hide this concert so it no longer shows up in your lists.': '你也可以隐藏这场音乐会，它将不再出现在你的列表中。',
  'Check the date, time and programme with the organiser — copy the details below to send them.':
    '请向主办方核对日期、时间和曲目；可拷贝下方信息发送给主办方。',
  'Correct the source calendar or feed, then import it again in Me › Data.': '更正来源日历或订阅源后，在“我的 › 数据”中重新导入。',
  'Copy listing details': '拷贝演出信息', 'Listing details copied': '演出信息已拷贝',
  'Open the original listing': '打开原始演出页面', 'Show this concert again': '重新显示这场音乐会',
  'Hide this concert': '隐藏这场音乐会', 'Manage data': '管理数据', 'Nothing is sent from this page.': '此页面不会发送任何信息。',
  'Add to calendar': '添加到日历', 'Link copied': '链接已拷贝',
  'Couldn’t copy — use the address bar link': '无法拷贝，请使用地址栏中的链接',
  'Calendar file ready': '日历文件已生成', 'Calendar file ready · reminders {days} before': '日历文件已生成 · 将提前 {days}提醒',
  '{title} — {when} (Swiss time), {where}': '{title}——{when}（瑞士时间），{where}',
  '{when} (Swiss time)': '{when}（瑞士时间）', 'Programme: {list}': '曲目：{list}', 'Performers: {list}': '演出者：{list}',
  'Concert not found': '找不到这场音乐会', 'Browse concerts': '浏览音乐会',
  'It may have been removed from the organiser’s listings, or it took place more than 120 days ago.':
    '它可能已从主办方的演出信息中删除，或已结束超过 120 天。',

  // Versions sheet, Listen section (ui/listen.js)
  'Versions · All recordings': '版本 · 全部录音',
  '{n} recording · tap a cover to make it your version': '{n} 个录音版本 · 轻点封面设为你的版本',
  '{n} recordings · tap a cover to make it your version': '{n} 个录音版本 · 轻点封面设为你的版本',
  '{n} recording': '{n} 个录音版本', '{n} recordings': '{n} 个录音版本',
  '{name} (your version)': '{name}（你的版本）', '{name} — make it your version': '{name}，设为你的版本',
  '{name} (chosen version)': '{name}（已选版本）', 'Your version: {artist}': '你的版本：{artist}',
  'Play a 30-second preview of {name}’s recording': '试听 {name} 录音的 30 秒片段',
  'Save {name}’s recording to your Library': '将 {name} 的录音存入资料库',
  'No recordings of this work found on Apple Music.': '在 Apple Music 上未找到这部作品的录音。',
  'Search Apple Music Classical': '搜索 Apple Music 古典乐', 'Search Apple Music': '搜索 Apple Music',
  'Recordings of {title}': '“{title}”的录音', 'All {n} version': '全部 {n} 个版本', 'All {n} versions': '全部 {n} 个版本',
  'Choose a recording': '选择录音版本', Selected: '已选', 'Versions: {count}': '版本：{count}',
  'Open the album in {app}': '在 {app} 中打开专辑', 'Open the album': '打开专辑',
  'Couldn’t load the tracks of this recording.': '无法加载此录音的曲目。', 'No tracks listed for this recording.': '此录音没有列出曲目。',
  'Show fewer': '收起', 'Show all {n} track': '显示全部 {n} 首', 'Show all {n} tracks': '显示全部 {n} 首',
  'Whole album · {n}': '整张专辑 · {n}', 'Only this work': '仅显示此作品',

  // Save sheet (ui/save.js)
  'Save to Library': '存入资料库', 'Album added to your Library': '专辑已添加到资料库',
  'Album removed from your Library': '专辑已从资料库移除', 'Add to a playlist': '添加到播放列表',
  'Added to “{name}”': '已添加到“{name}”', 'Removed from “{name}”': '已从“{name}”中移除',
  '{n} piece': '{n} 首', '{n} pieces': '{n} 首', 'Playlist name': '播放列表名称', 'New playlist name': '新播放列表名称',
  'Added to new playlist “{name}”': '已添加到新播放列表“{name}”', Create: '创建', 'New playlist…': '新建播放列表…',
};

// Credit roles the listings use beyond i18n's shared ZH_ROLES (zh-names.js); pairs like
// "Violin & direction" are put together from the parts (views/concert.js roleText). Opera
// characters and other roles stay as published.
export const ZH_ROLES_MORE = {
  'Music Director': '音乐总监', 'Artistic director': '艺术总监', 'Stage director': '导演', Concertmaster: '乐团首席',
  Leader: '乐团首席', Soloist: '独奏', Dancer: '舞者', Dance: '舞蹈', Presenter: '主持', Host: '主持', Speaker: '朗读',
  Composer: '作曲', 'Viola da gamba': '维奥尔琴', 'Baroque violin': '巴洛克小提琴', Theorbo: '西奥伯琴',
  Cembalo: '羽管键琴', 'Hammond organ': '哈蒙德风琴', 'Electric bass': '电贝斯', 'Electric guitar': '电吉他',
  Drums: '鼓', Mandolin: '曼陀林', Marimba: '马林巴', 'Soprano saxophone': '高音萨克斯管', 'Alto saxophone': '中音萨克斯管',
  'Tenor saxophone': '次中音萨克斯管', 'Baritone saxophone': '上低音萨克斯管', 'Wagner tuba': '瓦格纳大号',
  'Cor anglais': '英国管', direction: '领奏', 'Bass & Double bass': '贝斯、低音提琴',
  Clavichord: '击弦古钢琴', Clavicorde: '击弦古钢琴', Handpan: '手碟', Sommelier: '侍酒师', 'Mise en espace': '舞台呈现',
};
