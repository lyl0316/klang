// Simplified Chinese strings for the pages area (Discover, work / composer / artist / venue / city pages,
// editorials). Keys are the English interface text (see js/i18n.js). Placeholders stand apart with a
// space; t() closes the gap again when the value is Chinese ("与 {name} 同场" → "与勃拉姆斯同场"), so Latin
// names and numbers keep a space on each side ("与 Michael Zlabinger 同场", "3 场").
// Templates filled with nodes (entity.js tNodes) are not tidied: they keep no space next to {name}.
// Terms another area already translates (the iTunes credit, "{n} cities", "Link copied", roles…) are
// left to that area's file, so that one English text reads the same everywhere.
export default {
  // ---------- Discover ----------
  Editorial: '专栏', Welcome: '欢迎', Tonight: '今晚', Assistant: '助手', 'Ask or search': '提问或搜索',
  'Classical concerts across Switzerland': '瑞士各地的古典音乐会',
  '{n} upcoming': '{n} 场即将上演',
  '{names} at {venue}, {time}.': '{names} · {venue} · {time}',
  '{venue}, {time}.': '{venue} · {time}',
  'Today’s Pick': '今日推荐',
  'Tap a work for details, ▶ for a 30-second preview. Today is {date}, {weekday}': '轻点作品查看详情，轻点 ▶ 试听 30 秒。今天是 {date} {weekday}',
  Popular: '热门', 'Age {n}': '诞辰 {n} 周年', 'On stage in Switzerland today': '今天在瑞士上演', '{weekday} pick': '{weekday}推荐',
  '{n} min': '{n} 分钟',
  Classical: '古典乐',
  'Widely Loved': '广受喜爱', 'Good for newcomers': '适合入门',
  Solo: '独奏', Symphonic: '交响', Chamber: '室内乐', Vocal: '声乐',
  '{n} upcoming performances': '近期 {n} 场演出', 'Not on stage in Switzerland right now': '近期没有在瑞士上演',
  'New on Record': '新唱片', 'New classical albums': '古典新专辑',
  'Tap a cover for 30-second previews; ↗ plays the album in full in {app}.': '轻点封面试听 30 秒片段；轻点 ↗ 在 {app} 中完整播放专辑。',
  'Couldn’t reach the Apple Music chart.': '无法连接 Apple Music 排行榜。', Retry: '重试',
  'New on Record: Apple Music Switzerland classical chart.': '“新唱片”来自 Apple Music 瑞士古典专辑排行榜。',
    'In your Library: {name}. Change where it’s saved': '已在资料库中：{name}。更改收藏位置',
  'Save {name} to your Library': '将 {name} 收藏到资料库',

  // ---------- entity pages: shared ----------
  'Venue to be announced': '场馆待定', 'Venue TBA': '场馆待定',
  'Imported venue': '导入的场馆', 'Small hall': '小厅', 'Concert hall': '音乐厅', 'Opera house': '歌剧院', Church: '教堂', Theatre: '剧院',
  Performer: '演出者', Imported: '已导入',
  'This text is available in English only for now.': '（本文暂仅提供英文版）',
  'Copied to the clipboard': '已拷贝到剪贴板',
  'Couldn’t share — copy the address from the address bar': '无法分享，请从地址栏拷贝网址',
  'Remove {name} from favourites': '将 {name} 从喜欢中移除', 'Add {name} to favourites': '将 {name} 加入喜欢',
  '{name} added to your favourites': '已将 {name} 加入喜欢', '{name} removed from your favourites': '已将 {name} 从喜欢中移除',
  'About {title}': '关于“{title}”', '{kind} not found': '找不到 {kind}',
  'Show all {n}': '显示全部 {n} 场',
  '{n} minutes': '{n} 分钟', '{h} h {m} min': '{h} 小时 {m} 分钟', '{h} hours': '{h} 小时',
  '{n} date': '{n} 场', '{n} dates': '{n} 场',
  '{n} cancelled': '{n} 场已取消',
  // report a problem
  'What’s wrong?': '有什么问题？', 'What should it say? (optional)': '应该怎么写？（选填）', Details: '详细说明',
  'What’s wrong on the page for {name}?': '{name} 页面有什么问题？',
  'Klang has no server, so nothing is sent automatically. Share the report with the venue or whoever publishes the listing.':
    'Klang 没有服务器，不会自动发送任何内容。请把报告分享给场馆或发布演出信息的机构。',
  'Share report': '分享报告',
  'Wrong date or venue': '日期或场馆有误', 'Wrong programme or performers': '曲目或演出者有误', 'Recording doesn’t match': '录音不符',
  'Wrong facts or text': '事实或文字有误', 'Something else': '其他问题',
  // recordings
  'Try again': '重试',
  'Couldn’t load recordings. Check your connection and try again.': '无法加载录音。请检查网络连接后重试。',
  'No recordings found on Apple Music.': '在 Apple Music 上没有找到录音。',
  'Versions · All recordings': '版本 · 全部录音',
  '{n} recording · tap the cover for a 30-second preview': '{n} 个录音 · 轻点封面试听 30 秒',
  '{n} recordings · tap a cover for a 30-second preview': '{n} 个录音 · 轻点封面试听 30 秒',

  // ---------- composer ----------
  'This composer isn’t in Klang’s repertoire.': '这位作曲家不在 Klang 的曲库中。',
  'Explore Works': '探索作品', 'Explore {name}': '探索 {name}',
  'Latest releases': '最新发行', 'Popular among listeners': '听众喜爱',
  'Latest releases of music by {name}': '{name} 作品的最新发行', 'Popular recordings of music by {name}': '{name} 作品的热门录音',
  'No {name} on Swiss stages right now': '{name} 的作品近期没有在瑞士上演',
  'Nothing by {name} is announced in Switzerland at the moment. Add {name} to your favourites and new dates show up under Following in Concerts.':
    '目前瑞士没有公布 {name} 作品的演出。把 {name} 加入喜欢，新的场次就会出现在“音乐会”的“关注”里。',
  '{name} — on stage in Switzerland': '{name} · 瑞士演出',
  'Born {year}': '{year} 年生',
  'Czech lands': '捷克地区', England: '英格兰', USA: '美国',
  Bio: '简介',
  'A full biography of {name} hasn’t been written for Klang yet.': 'Klang 尚未撰写 {name} 的完整简介。',
  // {born} / {died} go in after tidying ("1833年5月7日"), so no space follows them
  '{who} was born {born} and died {died}, aged {age}.': '{who} 于 {born}出生，于 {died}去世，享年 {age} 岁。',
  '{who} was born {born} and is {age}.': '{who} 于 {born}出生，今年 {age} 岁。',
  'Klang’s repertoire includes one work by {name}: {title}{year}.': 'Klang 的曲库收录了 {name} 的一部作品：{title}{year}。',
  'Klang’s repertoire includes {n} works by {name}{span}: {titles}.': 'Klang 的曲库收录了 {name} 的 {n} 部作品{span}：{titles}。',
  ', all from {year}': '，均作于 {year} 年', ', written between {a} and {b}': '，创作于 {a} 至 {b} 年间',
  'On stage in Switzerland: {n} upcoming performances of music by {name} in {cities}; the next is {when} in {city}.':
    '瑞士近期将上演 {name} 的作品 {n} 场，分布在 {cities}；下一场：{when}，{city}。',
  'Most programmed: {title} ({n} concerts).': '上演最多的是 {title}（{n} 场）。',
  'No performances of music by {name} are announced in Switzerland right now.': '目前瑞士没有公布 {name} 作品的演出。',
  // explore
  'By period': '按时期', 'By genre': '按体裁', Related: '相关',
  'No shared programmes yet': '暂无同场节目',
  'No other composer shares an announced Swiss programme with {name} this season.': '本季瑞士已公布的节目中，还没有其他作曲家与 {name} 同场。',
  'Shares {n} programme with {name} in Switzerland this season': '本季在瑞士与{name}同场 {n} 次',
  'Shares {n} programmes with {name} in Switzerland this season': '本季在瑞士与{name}同场 {n} 次',
  'No works in Klang yet': 'Klang 中暂无作品', 'Klang’s repertoire doesn’t list works by {name} yet.': 'Klang 的曲库尚未收录 {name} 的作品。',
  '{n} work': '{n} 部作品', '{n} works': '{n} 部作品',
  // genres
  Symphonies: '交响曲', Concertos: '协奏曲', Orchestral: '管弦乐', 'Chamber Music': '室内乐', Piano: '钢琴', Songs: '艺术歌曲',
  Opera: '歌剧', 'Sacred Works': '宗教作品', 'Other Works': '其他作品',
  'Large-scale works for full orchestra, usually in four movements.': '为完整管弦乐队而作的大型作品，通常分为四个乐章。',
  'A soloist, or a small group of soloists, set against the orchestra.': '一位或几位独奏者与管弦乐队相互对答。',
  'Overtures, tone poems, suites and other music for orchestra.': '序曲、交响诗、组曲等管弦乐作品。',
  'Music for a handful of players, one to a part.': '为少数几位演奏者而作，每个声部一人。',
  'Music for solo piano, from sonatas to sets of short pieces.': '钢琴独奏作品，从奏鸣曲到小品集。',
  'Works for a single unaccompanied instrument.': '为单件无伴奏乐器而作的作品。',
  'Songs and song cycles, for voice with piano or orchestra.': '由钢琴或管弦乐队伴奏的歌曲与声乐套曲。',
  'Works for the stage, sung throughout or with spoken dialogue.': '舞台作品，全剧演唱或穿插说白。',
  'Masses, Passions, oratorios, cantatas and requiems.': '弥撒曲、受难曲、清唱剧、康塔塔和安魂曲。',
  'Works outside the usual categories.': '不属于常见类别的作品。',
  // periods
  'Early years': '早年', 'Middle years': '中年', 'Late years': '晚年', 'Recent years': '近年',
  'From {from} to {to}, when {name} was {a} to {b}.': '{from}—{to} 年，{name} {a} 至 {b} 岁。',
  Weimar: '魏玛', Köthen: '克滕', Leipzig: '莱比锡', 'Esterházy years': '埃斯特哈齐时期', 'London and the late works': '伦敦与晚期作品',
  Salzburg: '萨尔茨堡', Vienna: '维也纳', 'The last years': '最后的岁月', 'Early period': '早期', 'Middle period': '中期', 'Late period': '晚期',
  'Russian period': '俄罗斯时期', 'Neoclassical period': '新古典主义时期', 'Serial period': '序列主义时期',
  'Early works': '早期作品', 'Years of silence': '沉默的岁月', Tintinnabuli: '钟鸣风格',
  'Court organist and later concertmaster to the Duke of Saxe-Weimar: the great organ works and the first cantatas.':
    '任萨克森-魏玛公爵的宫廷管风琴师，后升任乐队首席：伟大的管风琴作品和最早的康塔塔都诞生于此。',
  'Kapellmeister to Prince Leopold of Anhalt-Köthen, a Calvinist court with little use for church music — the years of the suites, sonatas and concertos.':
    '任安哈尔特-克滕的利奥波德亲王的宫廷乐长。这座信奉加尔文宗的宫廷很少需要教堂音乐——组曲、奏鸣曲和协奏曲都出自这些年。',
  'Thomaskantor from 1723: cycles of cantatas for the church year, the Passions, and late summations such as the Goldberg Variations and the Mass in B minor.':
    '1723 年起任莱比锡圣托马斯教堂乐监：为教会年历写下成套的康塔塔和受难曲，晚年又有《哥德堡变奏曲》《b 小调弥撒》等集大成之作。',
  'Almost thirty years as Kapellmeister to the Esterházy princes, with an orchestra of his own to experiment with, far from Vienna.':
    '在远离维也纳的埃斯特哈齐亲王府任宫廷乐长近三十年，手下有一支可以尽情试验的乐团。',
  'Two visits to London (1791–92 and 1794–95) produced the twelve London symphonies; back in Vienna came The Creation and the late quartets.':
    '两次访问伦敦（1791–92 年和 1794–95 年）催生了十二部“伦敦”交响曲；回到维也纳后，又写出了《创世记》和晚期四重奏。',
  'The prodigy years: tours across Europe with his father, then service at the court of the Prince-Archbishop of Salzburg.':
    '神童岁月：随父亲巡演欧洲各地，之后在萨尔茨堡大主教的宫廷任职。',
  'Freelance in Vienna from 1781, writing piano concertos for his own subscription concerts and, in 1786, The Marriage of Figaro.':
    '1781 年起在维也纳做自由音乐家，为自己的预约音乐会创作钢琴协奏曲，并于 1786 年写出《费加罗的婚礼》。',
  'Don Giovanni for Prague, the last three symphonies in the summer of 1788, and in 1791 The Magic Flute, the Clarinet Concerto and the unfinished Requiem.':
    '为布拉格写下《唐璜》，1788 年夏完成最后三部交响曲，1791 年又有《魔笛》、单簧管协奏曲和未完成的《安魂曲》。',
  'From Bonn to Vienna in 1792 — a pupil of Haydn and soon the most talked-about pianist in the city.':
    '1792 年从波恩来到维也纳，师从海顿，很快成为城中最受瞩目的钢琴家。',
  'After the Heiligenstadt Testament of 1802, the “heroic” decade: the Eroica, the Fifth and Seventh Symphonies, the Emperor Concerto and Fidelio.':
    '1802 年写下《海利根施塔特遗嘱》之后，迎来“英雄”的十年：《英雄》交响曲、第五和第七交响曲、《皇帝》协奏曲和《费德里奥》。',
  'Almost completely deaf, Beethoven turned inward: the Ninth Symphony, the Missa solemnis, the last piano sonatas and string quartets.':
    '几乎完全失聪的贝多芬转向内心：第九交响曲、《庄严弥撒》，以及最后的钢琴奏鸣曲和弦乐四重奏。',
  'Rimsky-Korsakov’s pupil, then the Ballets Russes in Paris — The Firebird, Petrushka, The Rite of Spring — and the war years in Switzerland.':
    '师从里姆斯基-科萨科夫，随后在巴黎为俄罗斯芭蕾舞团写下《火鸟》《彼得鲁什卡》《春之祭》，战争年间旅居瑞士。',
  'In France and, from 1939, the United States, Stravinsky reworked older styles, from Pulcinella to The Rake’s Progress.':
    '先在法国，1939 年起在美国，斯特拉文斯基以新手法重塑古老的风格，从《普尔钦奈拉》到《浪子的历程》。',
  'In his seventies he took up twelve-tone writing, in works such as Agon and Threni.': '年过七十，他转向十二音写作，代表作有《阿贡》和《哀歌》。',
  'Neoclassical and serial pieces written in Soviet Estonia, ending with the collage Credo of 1968.':
    '在苏联治下的爱沙尼亚写下新古典和序列音乐作品，以 1968 年的拼贴之作《信经》收尾。',
  'Years of near silence, spent studying Gregorian chant and early polyphony.': '几乎沉默的岁月，潜心研究格里高利圣咏和早期复调。',
  'From Für Alina (1976) on, the bell-like style of triads ringing around a slow melody.': '自《致阿琳娜》（1976）起，三和弦如钟声般环绕缓慢旋律的风格。',

  // ---------- work ----------
  'This work isn’t in Klang’s repertoire.': '这部作品不在 Klang 的曲库中。',
  '~{n} min': '约 {n} 分钟', Recordings: '录音', 'More recordings': '更多录音',
  'Tap a cover for a 30-second preview; ↗ plays the recording in full in {app}.': '轻点封面试听 30 秒；轻点 ↗ 在 {app} 中完整播放录音。',
  'No upcoming performances': '暂无近期演出',
  'This work isn’t on any announced Swiss programme right now. Add it to your favourites to catch new dates.':
    '目前瑞士已公布的节目中没有这部作品。把它加入喜欢，就不会错过新的场次。',
  '{title} — recordings and concerts in Switzerland': '{title} · 录音与瑞士演出',
  'A full listening guide for this work hasn’t been written yet.': '这部作品的完整聆听指南尚未撰写。',
  '{what} dates from {year}, when {name} was about {age}.': '{what} 作于 {year} 年，当时 {name} 约 {age} 岁。',
  '{what} dates from {year}.': '{what} 作于 {year} 年。',
  'A performance lasts about {time}.': '演出时长约 {time}。',
  'On stage in Switzerland: {n} upcoming performances in {cities}; the next is {when} in {city}.':
    '瑞士近期将上演 {n} 场，分布在 {cities}；下一场：{when}，{city}。',
  'No Swiss performances are announced right now. Add the work to your favourites to spot new dates under Following in Concerts.':
    '目前瑞士没有公布这部作品的演出。把它加入喜欢，新的场次就会出现在“音乐会”的“关注”里。',

  // ---------- artist ----------
  'This performer isn’t in the current listings.': '当前演出信息中没有这位演出者。',
  'On tour': '巡演中', 'Artist bio': '艺术家简介',
  'All {n} date': '共 {n} 场', 'All {n} dates': '共 {n} 场', 'Full Itinerary': '完整行程',
  'All times shown in Swiss local time.': '所有时间均为瑞士当地时间。',
  '{city}, {dates} — show the first one': '{city}，{dates}，显示第一场',
  'No upcoming dates': '暂无近期演出',
  '{name} has no announced concerts in Switzerland right now.': '{name} 目前在瑞士没有已公布的演出。',
  '{name} has no announced concerts in Switzerland right now. Add the ensemble to your favourites to catch new dates under Following in Concerts.':
    '{name} 目前在瑞士没有已公布的演出。把这个团体加入喜欢，新的场次就会出现在“音乐会”的“关注”里。',
  '{name} has no announced concerts in Switzerland right now. Add this performer to your favourites to catch new dates under Following in Concerts.':
    '{name} 目前在瑞士没有已公布的演出。把这位演出者加入喜欢，新的场次就会出现在“音乐会”的“关注”里。',
  'Related artists': '相关艺术家', '— {n} concert together': '· 同台 {n} 场', '— {n} concerts together': '· 同台 {n} 场', ', e.g. {title}': '，如 {title}',
  'Albums by {name}': '{name} 的专辑', 'Featured albums': '精选专辑',
  'Upcoming Events': '近期演出', 'Upcoming events': '近期演出',
  'Dates in Switzerland from Klang’s listings, in date order. The route shows each city once, in the order the tour reaches it, with its number of dates; tap a city to jump to its first date.':
    '这里按日期列出 Klang 收录的瑞士演出。路线按巡演到达的先后，每座城市只列一次并标出场次；轻点城市即可跳到它的第一场。',
  'All times are Swiss local time (Europe/Zurich). Cancelled dates stay in the list but are left out of the route and the counts.':
    '所有时间均为瑞士当地时间（欧洲/苏黎世）。已取消的场次仍留在列表中，但不计入路线和场次。',
  '{name} — upcoming dates in Switzerland': '{name} · 瑞士近期演出',
  'Past performances': '过往演出',
  // roles the shared name list doesn't have (opera characters stay as published)
  'Tänzerinnen und Tänzer': '舞者', Dancer: '舞者', Dance: '舞蹈', 'Music Director': '音乐总监',
  Regiemitarbeit: '导演助理', Presenter: '主持', Host: '主持', Actor: '演员', Arranger: '编曲', Evangelist: '福音传道者',
  Concertmaster: '乐团首席', Puppeteer: '木偶师', Drums: '鼓', Dulcimer: '扬琴', Cimbalom: '匈牙利扬琴', 'Cor anglais': '英国管',
  'Electric bass': '电贝斯', 'Electric guitar': '电吉他', 'Hammond organ': '哈蒙德风琴', Mandolin: '曼陀林', Oud: '乌德琴', Duduk: '杜杜克管',
  'Soprano saxophone': '高音萨克斯管', 'Alto saxophone': '中音萨克斯管', 'Tenor saxophone': '次中音萨克斯管', 'Baritone saxophone': '上低音萨克斯管',
  'Wagner tuba': '瓦格纳大号', 'Baroque violin': '巴洛克小提琴', 'Viola da gamba': '维奥尔琴',

  // ---------- venue / city ----------
  'This venue isn’t in the current listings.': '当前演出信息中没有这个场馆。',
  '{n} in the next 30 days': '未来 30 天 {n} 场', '{n} featured': '{n} 场精选', Directions: '路线',
  'Upcoming at this venue': '本场馆近期演出', 'Nothing announced here yet': '这里暂时没有公布演出',
  'Add this venue to your favourites and its new concerts show up under Following in Concerts.': '把这个场馆加入喜欢，它的新演出就会出现在“音乐会”的“关注”里。',
  'More venues in {city}': '{city} 的更多场馆', '{name} — upcoming concerts': '{name} · 近期音乐会',
  'This city isn’t in Klang’s list of Swiss cities.': '这座城市不在 Klang 的瑞士城市列表中。',
  'Canton of {canton} · Switzerland': '{canton} · 瑞士', '{n} this week': '本周 {n} 场', '{n} venue': '{n} 个场馆', '{n} venues': '{n} 个场馆',
  'Browse in Concerts': '在音乐会中浏览', 'No dates': '暂无演出', 'Next concerts': '近期音乐会', 'See all {n} in Concerts': '在音乐会中查看全部 {n} 场',
  'Nothing announced in {city}': '{city} 暂时没有公布演出',
  'Add the city to your favourites and new listings show up under Following in Concerts.': '把这座城市加入喜欢，新的演出就会出现在“音乐会”的“关注”里。',
  'Classical concerts in {city}': '{city} 的古典音乐会',

  // ---------- editorials ----------
  // "N recordings" in an article / its list row (zh-concert's '{n} recordings' means versions of one work)
  'Article recordings: {n}': '{n} 个录音',
  Essay: '随笔', 'On a work': '谈作品', 'On a form': '谈体裁', All: '全部', Mentioned: '提及', Undated: '未注明日期',
  'Editorials are available in English only for now.': '（专栏文章暂仅提供英文版）',
  'This article is available in English only for now.': '（本文暂仅提供英文版）',
  'The first editorials are on their way': '首批专栏即将发布',
  'Essays on works, musical forms and Switzerland’s music cities — written for Klang, with their sources — will appear here.':
    '关于作品、音乐体裁和瑞士音乐城市的专栏文章将在这里发布，均为 Klang 撰写并注明资料来源。',
  'Browse concerts': '浏览音乐会', 'No editorials on {name} yet': '还没有关于 {name} 的专栏',
  'New essays are added regularly. Meanwhile, the others are a good read.': '新文章会定期发布，不妨先读读其他几篇。',
  'All editorials': '全部专栏', 'Filter editorials': '筛选专栏',
  'No editorial is centred on this composer yet.': '还没有以这位作曲家为主题的专栏。', 'Nothing here yet.': '这里还没有内容。',
  'Article not found': '找不到这篇文章', 'It may have been renamed or taken down.': '它可能已被改名或下架。',
  'Play 30-second previews of all {n} recordings in this article': '依次试听本文全部 {n} 个录音（每段 30 秒）',
  'Open in {app}': '在 {app} 中打开', 'Share this article': '分享这篇文章',
  'Remove this article’s playlist from your Library': '从资料库移除本文的播放列表', 'Add this article’s playlist to your Library': '将本文的播放列表添加到资料库',
  'Added to Library · Playlists': '已添加到资料库 · 播放列表', 'Removed from your Library': '已从资料库移除',
  'In this article': '本文涉及',
  '{state}: {title} — Save to Library': '{state}：{title} · 收藏到资料库',
  'Finding a recording…': '正在查找录音…', 'Not found on Apple Music': '在 Apple Music 上未找到',
  'Apple Music is not reachable right now': '暂时无法连接 Apple Music',
  'Live in Switzerland': '瑞士现场', '{name} · live in Switzerland': '{name} · 瑞士现场',
  'The works in this article, on stage in Switzerland:': '本文提到的作品在瑞士的演出：',
  'No Swiss dates announced yet.': '瑞士暂未公布演出日期。',
  END: '全文完', 'Wish for a topic': '许愿话题', 'Recent editorials': '近期专栏',
  'How Klang’s editorials use AI': 'Klang 专栏如何使用 AI', 'Sources:': '资料来源：', '{type} · Published {date}': '{type} · 发表于 {date}',
  'A work, a composer, a city, a form…': '一部作品、一位作曲家、一座城市、一种体裁……', 'Your topic': '你的话题',
  'Write a topic first': '请先写下话题', 'Couldn’t share — copy the text instead': '无法分享，请改为拷贝文字',
  'What should the next editorial be about?': '下一篇专栏应该写什么？',
  'Klang has no server: share the wish with whoever writes for you, or keep it as a note.': 'Klang 没有服务器：你可以把心愿分享给为你写作的人，或留作备忘。',
  'Share wish': '分享心愿',
  'Rate this article': '为本文评分', '{n} star': '{n} 星', '{n} stars': '{n} 星',
  'Rated {n} of 5 · saved on this device': '已评 {n} 星（满分 5 星）· 仅保存在本设备', 'Rating removed': '已移除评分',
  'This editorial was written for Klang with AI assistance and checked against the sources listed at the end of the article.':
    '这篇专栏在 AI 的协助下为 Klang 撰写，并已对照文末列出的资料来源核对。',
  'Dates, catalogue numbers and first performances follow those sources. Recordings are matched live from Apple Music, so the version you hear may differ from the one described — you can pick another version on each work page.':
    '日期、作品编号和首演信息均依据这些资料来源。录音是从 Apple Music 实时匹配的，你听到的版本可能与文中描述的不同——可以在每部作品的页面上换一个版本。',
  'Klang has no accounts and no comments. Your rating and the article playlist stay on this device.': 'Klang 没有账户，也没有评论。你的评分和文章播放列表只保存在本设备上。',
  '{n} source cited for “{title}”.': '“{title}”引用了 {n} 个资料来源。', '{n} sources cited for “{title}”.': '“{title}”引用了 {n} 个资料来源。',
  'Couldn’t copy — use the address bar link': '无法拷贝，请使用地址栏中的链接',
};
