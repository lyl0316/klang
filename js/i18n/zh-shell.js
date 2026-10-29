// Simplified Chinese: shared vocabulary used across the app (tabs, dock, common buttons, dates).
// Area files (zh-concerts.js, zh-pages.js, zh-personal.js, zh-player.js) add screen-specific strings.
// Terminology follows Apple's Chinese UI where Apple has a term (资料库, 播放全部, 播客, 分享).
export default {
  // tabs & shell
  Discover: '发现', Concerts: '音乐会', Activity: '动态', Library: '资料库', Search: '搜索', Me: '我的',
  'Nothing playing': '未在播放', Back: '返回', Close: '关闭', Done: '完成', Cancel: '取消', Confirm: '确认',
  Share: '分享', 'Share…': '分享…', 'Copy link': '拷贝链接', Save: '收藏', Saved: '已收藏', Remove: '移除',
  Delete: '删除', Edit: '编辑', Rename: '重命名', More: '更多', 'Show all': '显示全部', 'See all': '查看全部',
  'Load more': '加载更多', Settings: '设置', Notifications: '通知', 'Report a problem': '报告问题',
  // days
  Today: '今天', Tomorrow: '明天', Yesterday: '昨天', 'This weekend': '本周末', 'This week': '本周',
  'Next week': '下周', 'Next month': '下个月',
  // concert vocabulary
  Concert: '音乐会', Program: '曲目', 'Program book': '节目册', Notes: '导赏', Podcasts: '播客', Ticket: '购票',
  Tickets: '购票', Listen: '聆听', Versions: '版本', 'Play all': '播放全部', Going: '想去', Attended: '去过',
  Ended: '已结束', Cancelled: '已取消', Featured: '精选', 'Featured only': '仅看精选', Favourites: '喜欢',
  Favourite: '喜欢', Following: '关注', Follow: '关注', Date: '日期', Location: '地点', 'All types': '全部类型',
  'Look back': '回顾', Switzerland: '瑞士', 'Other countries': '其他国家', 'Select all': '全选',
  Composer: '作曲家', Composers: '作曲家', Work: '作品', Works: '作品', Artist: '艺术家', Artists: '艺术家',
  Performers: '演出者', Venue: '场馆', Venues: '场馆', City: '城市', Cities: '城市', Album: '专辑', Albums: '专辑',
  Playlist: '播放列表', Playlists: '播放列表', 'Recently added': '最近添加', Editorials: '专栏',
  'Listening guide': '聆听指南', 'Read Bio': '阅读简介',
  // apple
  'Apple Music': 'Apple Music', 'Apple Music Classical': 'Apple Music 古典乐',
  'Play in Apple Music Classical': '在 Apple Music 古典乐中播放', 'Play in Apple Music': '在 Apple Music 中播放',
  // language setting
  Language: '语言', Automatic: '自动',
  // app shell (main.js)
  Main: '主导航', 'Current tab': '当前标签页', 'Now listening': '正在聆听', 'Show details': '显示详情',
  'Something went wrong': '出错了', 'Could not open this page': '无法打开此页面',
  'Now listening: {title}. Show details': '正在聆听：{title}。显示详情',
  'Opened in {app}': '已在 {app} 中打开', 'Open {title} again in {app}': '在 {app} 中再次打开“{title}”',
  'Next: {title}, in {app}': '下一首：“{title}”，在 {app} 中打开',
  'Nothing playing — tap Listen on a work or concert to play it in {app}': '未在播放。在作品或音乐会页面轻点“聆听”，即可在 {app} 中播放。',
  // real listings (feed.js) — shared wording for attribution and refresh
  'Up to date': '已是最新', '{n} new concert': '{n} 场新音乐会', '{n} new concerts': '{n} 场新音乐会',
  '{n} concert': '{n} 场音乐会', '{n} concerts': '{n} 场音乐会', '{n} event': '{n} 场活动', '{n} events': '{n} 场活动',
  'Source: {name}': '来源：{name}', 'Listings from {name}': '演出信息来自 {name}',
  'Updated {date}': '更新于 {date}', 'Could not load the listings': '无法加载演出信息',
  'Real listings from the venues’ and orchestras’ own websites, updated daily.': '演出信息来自各场馆和乐团的官方网站，每日更新。',
  'No concerts here yet': '这里暂时没有音乐会',
  'Klang has no listings outside Switzerland yet.': 'Klang 暂时只有瑞士的演出信息。',
  'Klang also lists the main cities of Austria, Germany, France and Italy. Tap one to browse it; your region stays the same.':
    'Klang 也收录奥地利、德国、法国和意大利主要城市的演出。点按即可浏览，你的地区设置不变。',
};
