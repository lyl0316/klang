// Simplified Chinese strings for the concerts area. Keys are the English interface text (see js/i18n.js).
// Covers the Concerts tab (views/concerts.js: list, rail, Date / Look back / Location / Type sheets,
// pull to refresh), the shared concert cards and rows (ui/components.js, ui/sheet.js) and the city map
// (views/map.js). Shared words (Date, Location, Today, Going …) are in zh-shell.js.
export default {
  // ----- list -----
  'Jump to month': '跳转到月份',
  'That’s everything up to yesterday.': '截至昨天的音乐会都在这里了。',
  'That’s all the venues have published so far.': '以上是各场馆目前公布的全部演出。',
  '{n} source': '{n} 个来源', '{n} sources': '{n} 个来源',
  'Show all of Switzerland': '查看瑞士全部演出',
  'Back to Switzerland': '返回瑞士',
  'Loading the listings…': '正在加载演出信息…',
  'Check your connection, then pull down to try again.': '请检查网络连接，然后下拉重试。',
  'Try again': '重试',
  'Reset filters': '重置筛选',
  'No concerts match': '没有符合条件的音乐会',
  'Nothing from your favourites in this range. Add more favourite cities, venues, composers or performers.':
    '这段时间里没有与你喜欢的内容相关的音乐会。可以多添加一些喜欢的城市、场馆、作曲家或演出者。',
  'No past concerts here': '这里还没有往期音乐会',
  'Klang keeps the concerts it has listed for {n} days after they take place, so Look back fills up as the days go by.':
    'Klang 会把收录过的音乐会在演出后保留 {n} 天，回顾的内容会随时间逐渐增多。',
  'Back to upcoming concerts': '返回即将上演的音乐会',
  'No concerts in {city} right now': '{city}目前没有音乐会',
  'No concerts in these cities right now': '这些城市目前没有音乐会',
  'Klang reads the venues’ own calendars every day; nothing is listed here at the moment.': 'Klang 每天读取各场馆的官方日程，这里目前没有公布的演出。',
  'Try another date, more cities, or fewer filters.': '试试换个日期、多选几个城市，或减少筛选条件。',
  '{n} concert in total': '共 {n} 场音乐会', '{n} concerts in total': '共 {n} 场音乐会',
  '{label}: {count}': '{label}：{count}',

  // ----- filter chips -----
  '{n} city': '{n} 个城市', '{n} cities': '{n} 个城市',
  '{n} type': '{n} 种类型', '{n} types': '{n} 种类型',
  Type: '类型',
  'Show {n} event': '显示 {n} 场活动', 'Show {n} events': '显示 {n} 场活动',

  // ----- month rail -----
  'Slide left to pick a day': '向左滑动选择日期',
  '{weekday} · release to jump': '{weekday} · 松开即跳转',
  'Release to jump': '松开即跳转',

  // ----- Date sheet -----
  'This browse only · picking a past day enters Look back': '仅影响本次浏览 · 选择过去的日期将进入回顾',
  'Same jump as the rail — the list lands on that day or the nearest with events': '与右侧月份栏的跳转相同：列表会停在这一天，或之后最近有演出的一天',
  'By month': '按月',
  'Previous month': '上个月',
  'Event density': '演出密度',
  'My marks': '我的标记',
  Past: '已过',
  'Pick a date': '选择日期',
  'Jump to {date}': '跳转到 {date}',

  // ----- Look back -----
  'Pick one city to look back': '选择一个城市进行回顾',
  'Only affects this browse · won’t change your followed regions': '仅影响本次浏览 · 不会更改你关注的地区',
  'Klang keeps past concerts for {n} days, back to {date}.': 'Klang 只保留最近 {n} 天的往期音乐会（最早到 {date}）。',
  'No past concerts from {date} yet. Klang keeps the concerts it has listed for {n} days after they take place, so Look back fills up as the days go by.':
    '{date}以来还没有往期音乐会。Klang 会把收录过的音乐会在演出后保留 {n} 天，回顾的内容会随时间逐渐增多。',

  // ----- Location sheet -----
  'Search cities': '搜索城市',
  'Search countries': '搜索国家',
  'This filter won’t change your region settings': '此筛选不会更改你的地区设置',
  'Current country: {country}': '当前国家：{country}',
  'Select all matches': '选择全部匹配项',
  'No city matches': '没有匹配的城市',
  'No country matches': '没有匹配的国家',
  'Other cities': '其他城市',
  Map: '地图',
  'No listings for {country} yet — Klang reads Swiss venues’ own calendars.': '{country}暂时没有演出信息。Klang 目前只读取瑞士各场馆的官方日程。',

  // ----- concert cards (ui/components.js) -----
  'Venue to be announced': '场馆待定',
  Imported: '已导入',
  'Added to your favourites': '已添加到“喜欢”',
  'Removed from your favourites': '已从“喜欢”中移除',
  // roles as the listings publish them (others are in zh-names.js; character names stay as published)
  Performer: '演出者', 'Stage director': '导演', 'Music Director': '音乐总监', 'Musical director': '音乐总监', 'Artistic director': '艺术总监',
  Dancer: '舞者', Dancers: '舞者', Dance: '舞蹈', Host: '主持', Speaker: '朗诵', Arranger: '编曲', Soloist: '独奏',
  direction: '指挥', 'Viola da gamba': '维奥尔琴', Theorbo: '低音鲁特琴', 'Baroque violin': '巴洛克小提琴',
  'Electric bass': '电贝斯', 'Electric guitar': '电吉他', Drums: '鼓',
  'Soprano saxophone': '高音萨克斯管', 'Alto saxophone': '中音萨克斯管', 'Tenor saxophone': '次中音萨克斯管',
  'Baritone saxophone': '上低音萨克斯管', 'Cor anglais': '英国管', 'Wagner tuba': '瓦格纳大号',

  // ----- city map (views/map.js) -----
  '{n} upcoming concert': '{n} 场即将上演的音乐会', '{n} upcoming concerts': '{n} 场即将上演的音乐会',
  'No upcoming concerts': '暂无即将上演的音乐会',
  'No upcoming': '暂无演出',
  'Other towns': '其他城镇',
  'Schematic map of Switzerland. Bubble size shows upcoming concerts per city.': '瑞士示意地图。气泡大小表示各城市即将上演的音乐会数量。',
  'Schematic map · bubble size = upcoming concerts': '示意图 · 气泡越大，即将上演的音乐会越多',
  'Tap a bubble to see a city.': '轻点气泡查看城市。',
  'Clear selection': '取消选择',
  'Next: {when}': '下一场：{when}',
  'City page': '城市页面',
  'By size': '按演出数',
  'By canton': '按州',
  'Not on the map': '未在地图上标出',
  '{city} (favourite)': '{city}（喜欢）',
  'All cities': '全部城市',
  '{n} with concerts': '其中 {n} 个有演出',
};

// ----- places outside Switzerland (Location sheet › Other countries) -----
// Not interface text, so not in the t() dictionary: views/concerts.js looks these up by name.
// Regions as Sheng groups them; cities only where Chinese has an established name (others keep their own).
export const ZH_REGIONS = {
  // Germany
  'Baden-Württemberg': '巴登-符腾堡州', Bavaria: '巴伐利亚州', Brandenburg: '勃兰登堡州', Hesse: '黑森州',
  'Lower Saxony': '下萨克森州', 'Mecklenburg-Vorpommern': '梅克伦堡-前波莫瑞州', 'North Rhine-Westphalia': '北莱茵-威斯特法伦州',
  'Rhineland-Palatinate': '莱茵兰-普法尔茨州', Saxony: '萨克森州', 'Schleswig-Holstein': '石勒苏益格-荷尔斯泰因州', Thuringia: '图林根州',
  // United States
  Arizona: '亚利桑那州', California: '加利福尼亚州', Colorado: '科罗拉多州', Connecticut: '康涅狄格州', Florida: '佛罗里达州',
  Georgia: '佐治亚州', Illinois: '伊利诺伊州', Indiana: '印第安纳州', Iowa: '艾奥瓦州', Maryland: '马里兰州',
  Massachusetts: '马萨诸塞州', Michigan: '密歇根州', Minnesota: '明尼苏达州', Missouri: '密苏里州',
  // United Kingdom
  'South East': '英格兰东南', 'South West': '英格兰西南', 'East of England': '英格兰东部', 'East Midlands': '东米德兰兹',
  'West Midlands': '西米德兰兹', 'Yorkshire and the Humber': '约克郡-亨伯', 'North West': '英格兰西北', 'North East': '英格兰东北',
  Scotland: '苏格兰', Wales: '威尔士',
  // France
  'Île-de-France': '法兰西岛', 'Auvergne-Rhône-Alpes': '奥弗涅-罗讷-阿尔卑斯', 'Bourgogne-Franche-Comté': '勃艮第-弗朗什-孔泰',
  Brittany: '布列塔尼', 'Grand Est': '大东部', 'Hauts-de-France': '上法兰西', Normandy: '诺曼底', 'Nouvelle-Aquitaine': '新阿基坦',
  Occitanie: '奥克西塔尼', "Provence-Alpes-Côte d'Azur": '普罗旺斯-阿尔卑斯-蓝色海岸',
  // Japan
  Iwate: '岩手县', Miyagi: '宫城县', Ibaraki: '茨城县', Saitama: '埼玉县', Chiba: '千叶县', Tokyo: '东京都', Kanagawa: '神奈川县',
  Nagano: '长野县', Aichi: '爱知县', Shiga: '滋贺县', Osaka: '大阪府', Yamaguchi: '山口县', Fukuoka: '福冈县',
  // China (as Sheng groups it)
  'Jiangsu-Zhejiang-Shanghai': '江浙沪', 'Greater Bay Area': '粤港澳大湾区', 'Beijing-Tianjin-Hebei': '京津冀', Taiwan: '台湾',
  'Sichuan-Chongqing': '川渝',
  // South Korea
  'Seoul Capital Area': '首都圈', Chungcheong: '忠清道', Gyeongsang: '庆尚道',
};

export const ZH_PLACES = {
  // China
  Shanghai: '上海', Hangzhou: '杭州', Wuxi: '无锡', Suzhou: '苏州', Nanjing: '南京', Haimen: '海门', Wenzhou: '温州',
  Changzhou: '常州', "Huai'an": '淮安', Changshu: '常熟', Haining: '海宁', Jiangyin: '江阴', Lishui: '丽水', Nantong: '南通',
  Ningbo: '宁波', Qidong: '启东', Quzhou: '衢州', Suqian: '宿迁', Yixing: '宜兴',
  Shenzhen: '深圳', Guangzhou: '广州', 'Hong Kong': '香港', Macau: '澳门', Dongguan: '东莞', Foshan: '佛山', Zhongshan: '中山', Zhuhai: '珠海',
  Beijing: '北京', Tianjin: '天津', Shijiazhuang: '石家庄', Tangshan: '唐山', Baoding: '保定', Hengshui: '衡水', Handan: '邯郸',
  Taipei: '台北', Kaohsiung: '高雄', Taichung: '台中', Chiayi: '嘉义', Hsinchu: '新竹', Miaoli: '苗栗', Tainan: '台南',
  Pingtung: '屏东', Yunlin: '云林', Taoyuan: '桃园', Changhua: '彰化', Yilan: '宜兰', Hualien: '花莲', Keelung: '基隆',
  Kinmen: '金门', 'New Taipei': '新北', Taitung: '台东',
  Chengdu: '成都', Chongqing: '重庆',
  Guiyang: '贵阳', "Xi'an": '西安', Wuhan: '武汉', Hohhot: '呼和浩特', Xiamen: '厦门', Changsha: '长沙', Harbin: '哈尔滨',
  Haikou: '海口', Hefei: '合肥', Jinan: '济南', Kunming: '昆明', Nanning: '南宁', Qingdao: '青岛', Weifang: '潍坊',
  Fuzhou: '福州', Liaocheng: '聊城', Nanchang: '南昌', Shenyang: '沈阳', Zibo: '淄博', Binzhou: '滨州', Ganzhou: '赣州',
  Hengyang: '衡阳', Huanggang: '黄冈', Lanzhou: '兰州', Liaoyang: '辽阳', "Ma'anshan": '马鞍山', Ordos: '鄂尔多斯',
  Taiyuan: '太原', Urumqi: '乌鲁木齐',
  // Japan
  Morioka: '盛冈', Kamaishi: '釜石', Kuji: '久慈', Natori: '名取', Sendai: '仙台', Mito: '水户', Toride: '取手',
  Tokorozawa: '所泽', Saitama: '埼玉', Kawagoe: '川越', Kawaguchi: '川口', Ichikawa: '市川', Urayasu: '浦安',
  Tokyo: '东京', Hachioji: '八王子', Akiruno: '秋留野', Katsushika: '葛饰', Fuchu: '府中', Komae: '狛江', Tachikawa: '立川',
  Tama: '多摩', Yokohama: '横滨', Kawasaki: '川崎', Hiratsuka: '平冢', Yokosuka: '横须贺', Nagano: '长野', Okaya: '冈谷',
  Ina: '伊那', Matsumoto: '松本', Ueda: '上田', Nagoya: '名古屋', Aichi: '爱知', Kariya: '刈谷', Otsu: '大津',
  Moriyama: '守山', Kusatsu: '草津', Osaka: '大阪', Hirakata: '枚方', Kudamatsu: '下松', Hofu: '防府', Fukuoka: '福冈',
  Kitakyushu: '北九州', Kurume: '久留米', Kyoto: '京都', Nishinomiya: '西宫', Takasaki: '高崎', Sapporo: '札幌',
  Niigata: '新潟', Kanazawa: '金泽', Aomori: '青森', Hiroshima: '广岛', Kumamoto: '熊本', Miyazaki: '宫崎', Oita: '大分',
  Fukui: '福井', Hamamatsu: '滨松', Koriyama: '郡山', Matsuyama: '松山', Tsu: '津', Yamagata: '山形',
  // South Korea, Southeast Asia
  Seoul: '首尔', Incheon: '仁川', Seongnam: '城南', Bucheon: '富川', Goyang: '高阳', Hwaseong: '华城', Pyeongtaek: '平泽',
  Cheonan: '天安', Daejeon: '大田', Busan: '釜山', Daegu: '大邱', Tongyeong: '统营', Yeosu: '丽水', Pyeongchang: '平昌',
  Singapore: '新加坡', Hanoi: '河内',
  // Germany
  Berlin: '柏林', Hamburg: '汉堡', Bremen: '不来梅', Saarbrücken: '萨尔布吕肯', Munich: '慕尼黑', Stuttgart: '斯图加特',
  'Baden-Baden': '巴登-巴登', Heidelberg: '海德堡', Freiburg: '弗赖堡', Mannheim: '曼海姆', Ulm: '乌尔姆', Karlsruhe: '卡尔斯鲁厄',
  Nuremberg: '纽伦堡', Bayreuth: '拜罗伊特', Regensburg: '雷根斯堡', Bamberg: '班贝格', Augsburg: '奥格斯堡', Potsdam: '波茨坦',
  Frankfurt: '法兰克福', Wiesbaden: '威斯巴登', Kassel: '卡塞尔', Hannover: '汉诺威', Lübeck: '吕贝克', Kiel: '基尔',
  Cologne: '科隆', Essen: '埃森', Dortmund: '多特蒙德', Düsseldorf: '杜塞尔多夫', Bonn: '波恩', Münster: '明斯特',
  Wuppertal: '伍珀塔尔', Bochum: '波鸿', Duisburg: '杜伊斯堡', Bielefeld: '比勒费尔德', Mainz: '美因茨', Koblenz: '科布伦茨',
  Trier: '特里尔', Dresden: '德累斯顿', Leipzig: '莱比锡', Chemnitz: '开姆尼茨', Weimar: '魏玛', Rostock: '罗斯托克',
  // Austria
  Vienna: '维也纳', Salzburg: '萨尔茨堡', Linz: '林茨', Graz: '格拉茨', Innsbruck: '因斯布鲁克', Bregenz: '布雷根茨',
  Eisenstadt: '艾森施塔特', Klagenfurt: '克拉根福',
  // United Kingdom, Ireland
  London: '伦敦', Oxford: '牛津', Cambridge: '剑桥', Bristol: '布里斯托尔', Brighton: '布莱顿', Manchester: '曼彻斯特',
  Birmingham: '伯明翰', Liverpool: '利物浦', York: '约克', Nottingham: '诺丁汉', Sheffield: '谢菲尔德', Norwich: '诺里奇',
  Edinburgh: '爱丁堡', Glasgow: '格拉斯哥', Aberdeen: '阿伯丁', Cardiff: '加的夫', 'Newcastle upon Tyne': '纽卡斯尔',
  Dublin: '都柏林', Cork: '科克',
  // France, Benelux
  Paris: '巴黎', Versailles: '凡尔赛', Lyon: '里昂', Grenoble: '格勒诺布尔', Bordeaux: '波尔多', Toulouse: '图卢兹',
  Marseille: '马赛', Nice: '尼斯', Strasbourg: '斯特拉斯堡', Lille: '里尔', Dijon: '第戎', Rennes: '雷恩',
  Amsterdam: '阿姆斯特丹', Rotterdam: '鹿特丹', Utrecht: '乌得勒支', 'The Hague': '海牙', Eindhoven: '埃因霍温',
  Brussels: '布鲁塞尔', Antwerp: '安特卫普', Ghent: '根特', Bruges: '布鲁日', Liège: '列日', Luxembourg: '卢森堡',
  // Southern Europe
  Milan: '米兰', Rome: '罗马', Naples: '那不勒斯', Turin: '都灵', Genoa: '热那亚', Verona: '维罗纳', Venice: '威尼斯',
  Florence: '佛罗伦萨', Bologna: '博洛尼亚', Palermo: '巴勒莫', Madrid: '马德里', Barcelona: '巴塞罗那', Valencia: '瓦伦西亚',
  Seville: '塞维利亚', Bilbao: '毕尔巴鄂', Lisbon: '里斯本', Porto: '波尔图', Athens: '雅典',
  // Northern and Eastern Europe
  Copenhagen: '哥本哈根', Oslo: '奥斯陆', Bergen: '卑尔根', Stockholm: '斯德哥尔摩', Helsinki: '赫尔辛基', Tallinn: '塔林',
  Riga: '里加', Vilnius: '维尔纽斯', Warsaw: '华沙', Kraków: '克拉科夫', Wrocław: '弗罗茨瓦夫', Gdańsk: '格但斯克',
  Prague: '布拉格', Brno: '布尔诺', 'Karlovy Vary': '卡罗维发利', Bratislava: '布拉迪斯拉发', Budapest: '布达佩斯',
  Ljubljana: '卢布尔雅那', Zagreb: '萨格勒布', Belgrade: '贝尔格莱德', Sofia: '索非亚', Bucharest: '布加勒斯特',
  Moscow: '莫斯科', 'Saint Petersburg': '圣彼得堡', Kazan: '喀山', Vaduz: '瓦杜兹',
  // Americas
  'New York': '纽约', Boston: '波士顿', Chicago: '芝加哥', 'Los Angeles': '洛杉矶', 'San Francisco': '旧金山',
  'San Diego': '圣迭戈', Philadelphia: '费城', 'Washington D.C.': '华盛顿特区', Seattle: '西雅图', Cleveland: '克利夫兰',
  Detroit: '底特律', Houston: '休斯敦', Dallas: '达拉斯', Miami: '迈阿密', Atlanta: '亚特兰大', Denver: '丹佛',
  Baltimore: '巴尔的摩', Minneapolis: '明尼阿波利斯', 'Saint Paul': '圣保罗', 'St. Louis': '圣路易斯', 'Kansas City': '堪萨斯城',
  Nashville: '纳什维尔', Pittsburgh: '匹兹堡', Princeton: '普林斯顿', 'Salt Lake City': '盐湖城', Milwaukee: '密尔沃基',
  Montréal: '蒙特利尔', Toronto: '多伦多', Vancouver: '温哥华', Ottawa: '渥太华', Calgary: '卡尔加里', 'Québec City': '魁北克城',
  'Mexico City': '墨西哥城', 'Buenos Aires': '布宜诺斯艾利斯', 'São Paulo': '圣保罗', 'Bogotá': '波哥大', Lima: '利马',
  Montevideo: '蒙得维的亚',
  // Oceania, Africa
  Sydney: '悉尼', Melbourne: '墨尔本', Brisbane: '布里斯班', Adelaide: '阿德莱德', Perth: '珀斯', Canberra: '堪培拉',
  Wellington: '惠灵顿', Auckland: '奥克兰', Christchurch: '基督城', 'Quatre Bornes': '卡特尔博尔纳',
};
