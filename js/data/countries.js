// Sheng's "Other countries" list from its Concerts → Location sheet (read via iPhone Mirroring on
// 2026-10-26, spec/sheng-locations.json): 47 countries with their regions and cities, in Sheng's order.
//
// Only the NAMES are used. `count` is the number of listings Sheng showed for the country at that
// time; Klang uses it only to keep Sheng's order and never displays it as a concert count — Klang
// has real feeds for Switzerland only, so every other country (and its cities) has 0 events.
//
// Shape: { id, name, count, regions: [{ name, cities: [...] }], cities: [...], partial?: [...], swiss? }
//   regions — Sheng's region groups (Japanese prefectures, German states, US states …);
//   cities  — cities Sheng lists without a region (its flat list, "other cities", or for the US the
//             main cities its search offered);
//   partial — notes where Sheng's list was longer than what was read: the United States (states
//             below Utah and several states' cities not read), the United Kingdom (North East and
//             Scotland partly read), China ("other cities" below Urumqi not read; Sheng lists Taiwan as a
//             region under China and it is recorded as shown), the Netherlands and Italy (a few
//             0-event towns at the end not read).
// Switzerland's cities are CITIES / EXTRA_CITIES in js/data/cities.js (repo.allCities()).

export const COUNTRIES = [
  { id: 'germany', name: 'Germany', count: 4009, regions: [
    { name: 'Baden-Württemberg', cities: ['Stuttgart', 'Baden-Baden', 'Heidelberg', 'Freiburg', 'Heilbronn', 'Mannheim', 'Ludwigsburg', 'Heidenheim', 'Ravensburg', 'Ulm', 'Karlsruhe', 'Offenburg', 'Villingen-Schwenningen', 'Friedrichshafen', 'Schwetzingen', 'Weikersheim', 'Weingarten', 'Widdern', 'Bad Friedrichshall', 'Bietigheim-Bissingen', 'Maulbronn', 'Schwäbisch Gmünd', 'Waiblingen', 'Wiesloch', 'Alpirsbach', 'Bad Urach', 'Büsingen am Hochrhein', 'Donaueschingen', 'Künzelsau', 'Schwäbisch Hall', 'Sinsheim'] },
    { name: 'Bavaria', cities: ['Munich', 'Elmau', 'Nuremberg', 'Bayreuth', 'Bad Kissingen', 'Regensburg', 'Bamberg', 'Tutzing', 'Garmisch-Partenkirchen', 'Amberg', 'Augsburg', 'Erlangen', 'Blaibach', 'Fürth', 'Kempten', 'Ansbach', 'Aschaffenburg', 'Bad Tölz', 'Baierbrunn', 'Dillingen an der Donau', 'Erding', 'Gräfelfing', 'Ingolstadt', 'Ottobeuren', 'Passau', 'Rosenheim', 'Weiden in der Oberpfalz', 'Bad Bocklet', 'Bad Brückenau', 'Bad Wörishofen', 'Leitheim', 'Neumarkt in der Oberpfalz', 'Roggenburg'] },
    { name: 'Brandenburg', cities: ['Potsdam', 'Chorin', 'Forst (Lausitz)', 'Rheinsberg', 'Trebbin'] },
    { name: 'Hesse', cities: ['Frankfurt', 'Kronberg', 'Wiesbaden', 'Marburg', 'Weilburg', 'Fulda', 'Bad Homburg vor der Höhe', 'Bad Vilbel', 'Cölbe', 'Erbach im Odenwald', 'Giessen', 'Hanau', 'Heppenheim', 'Homberg (Efze)', 'Lauterbach', 'Wißmar', 'Bad Arolsen', 'Bad Hersfeld', 'Birstein', 'Eltville am Rhein', 'Geisenheim', 'Kassel', 'Rüsselsheim am Main'] },
    { name: 'Lower Saxony', cities: ['Hannover', 'Hameln', 'Aurich', 'Papenburg', 'Lindern', 'Lüneburg', 'Oldenburg', 'Thedinghausen'] },
    { name: 'Mecklenburg-Vorpommern', cities: ['Ulrichshusen', 'Wismar', 'Peenemünde', 'Rostock'] },
    { name: 'North Rhine-Westphalia', cities: ['Cologne', 'Essen', 'Dortmund', 'Düsseldorf', 'Wuppertal', 'Herford', 'Paderborn', 'Bad Salzuflen', 'Detmold', 'Bad Oeynhausen', 'Minden', 'Bonn', 'Gütersloh', 'Bochum', 'Duisburg', 'Hamm', 'Herne', 'Mülheim an der Ruhr', 'Münster', 'Bielefeld', 'Höxter', 'Iserlohn', 'Lindlar', 'Lippstadt', 'Monheim am Rhein', 'Neuss', 'Nieheim', 'Steinhagen', 'Viersen', 'Waldbröl', 'Witten', 'Bottrop', 'Brühl', 'Dormagen', 'Hagen', 'Herten', 'Moers', 'Oelde'] },
    { name: 'Rhineland-Palatinate', cities: ['Kaiserslautern', 'Ludwigshafen', 'Mainz', 'Neustadt an der Weinstraße', 'Speyer', 'Koblenz', 'Landau in der Pfalz', 'Worms', 'Wörth am Rhein', 'Pirmasens', 'Zweibrücken', 'Freinsheim', 'Trier'] },
    { name: 'Saxony', cities: ['Dresden', 'Leipzig', 'Chemnitz', 'Görlitz', 'Radebeul'] },
    { name: 'Schleswig-Holstein', cities: ['Lübeck', 'Kiel', 'Altenhof', 'Bad Oldesloe', 'Bad Schwartau', 'Bordesholm', 'Büdelsdorf', 'Elmshorn', 'Eutin', 'Flensburg', 'Friedrichstadt', 'Husum', 'Itzehoe', 'Kaltenkirchen', 'Kellinghusen', 'Meldorf', 'Neumünster', 'Niebüll', 'Nusse', 'Plön', 'Pronstorf', 'Rellingen', 'Rendsburg'] },
    { name: 'Thuringia', cities: ['Weimar', 'Ilmenau', 'Meiningen'] },
  ], cities: ['Berlin', 'Hamburg', 'Bremen', 'Saarbrücken'] },
  { id: 'united-states', name: 'United States', count: 3316, regions: [
    { name: 'Arizona', cities: ['Paradise Valley', 'Prescott', 'Tucson'] },
    { name: 'California', cities: ['Los Angeles', 'San Francisco', 'Costa Mesa', 'San Diego', 'Berkeley', 'La Jolla', 'Stanford', 'Davis', 'Aliso Viejo', 'Pasadena', 'Santa Monica', 'Laguna Beach', 'San Marino', 'Santa Barbara', 'Encinitas', 'Napa', 'Orange', 'Palm Desert', 'Palo Alto', 'San Jose', 'Saratoga', 'Irvine', 'Ojai'] },
    { name: 'Colorado', cities: ['Denver', 'Boulder', 'Beaver Creek', 'Aspen', 'Vail'] },
    { name: 'Connecticut', cities: ['New Haven', 'Storrs', 'West Hartford', 'Falls Village'] },
    { name: 'Florida', cities: ['West Palm Beach', 'Miami', 'Fort Lauderdale', 'St. Petersburg', 'Miami Beach', 'Naples', 'Orlando', 'Sarasota'] },
    { name: 'Georgia', cities: ['Atlanta', 'Athens, Georgia'] },
    { name: 'Illinois', cities: ['Chicago', 'Evanston', 'Urbana', 'Skokie', 'Highland Park', 'Naperville', 'Vernon Hills', 'Winnetka'] },
    { name: 'Indiana', cities: ['Indianapolis', 'Bloomington', 'Carmel', 'Notre Dame', 'West Lafayette'] },
    { name: 'Iowa', cities: ['Iowa City', 'Coralville'] },
    { name: 'Maryland', cities: ['Baltimore', 'North Bethesda', 'College Park', 'Columbia', 'Ellicott City'] },
    { name: 'Massachusetts', cities: ['Boston', 'Cambridge, MA', 'Lenox', 'Worcester', 'Rockport', 'Plymouth', 'Boylston', 'Pittsfield', 'Plainfield', 'Westport', 'Williamstown'] },
    { name: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Beverly Hills'] },
    { name: 'Minnesota', cities: ['Saint Paul', 'Minneapolis'] },
    { name: 'Missouri', cities: ['Kansas City', 'St. Louis'] },
  ], cities: ['New York', 'Philadelphia', 'Seattle', 'Cleveland', 'Raleigh', 'Santa Fe', 'Rochester', 'Salt Lake City', 'Nashville', 'Charlotte', 'Houston', 'Fort Worth', 'Dallas', 'San Antonio', 'Cincinnati', 'Buffalo', 'Portland', 'Washington D.C.', 'Annandale-on-Hudson', 'Chapel Hill', 'Princeton', 'Charlottesville', 'Katonah', 'Alexandria', 'Brookville', 'Oberlin', 'Milwaukee', 'Corvallis', 'Reno', 'Richmond, VA', 'Blacksburg'], partial: ['Nebraska (2 cities)', 'New York (12)', 'North Carolina (8)', 'Ohio (3)', 'Oklahoma (2)', 'Oregon (4)', 'Pennsylvania (5)', 'South Carolina (2)', 'Texas (4)', 'Utah (4)', '…more states below Utah not read'] },
  { id: 'united-kingdom', name: 'United Kingdom', count: 1427, regions: [
    { name: 'South East', cities: ['Lewes', 'Oxford', 'Basingstoke', 'Portsmouth', 'Eastbourne', 'Canterbury', 'Guildford', 'Crawley', 'Reading', 'Winchester', 'Aylesbury', 'Brighton', 'Newbury', 'Milton Keynes'] },
    { name: 'South West', cities: ['Bristol', 'Poole', 'Exeter', 'Weymouth', 'Bradford-on-Avon', 'Bridport', 'Broadwindsor', 'Gillingham', 'Plymouth', 'Salisbury', 'Tewkesbury', 'Wotton-under-Edge', 'Barnstaple', 'Bournemouth', 'Marlborough', 'Truro'] },
    { name: 'East of England', cities: ['Saffron Walden', 'Cambridge', 'Norwich', 'St Albans', 'Bedford', 'Bury St Edmunds', 'Ely', 'Hertford', 'Peterborough', 'Snape', 'Burnham Norton', 'Hatfield'] },
    { name: 'East Midlands', cities: ['Nottingham', 'Leicester', 'Lincoln', 'Stamford', 'Edensor', 'Northampton'] },
    { name: 'West Midlands', cities: ['Birmingham', 'Coventry', 'Great Malvern', 'Stoke-on-Trent', 'Wolverhampton'] },
    { name: 'Yorkshire and the Humber', cities: ['Hull', 'Sheffield', 'Richmond (North Yorkshire)', 'Huddersfield', 'Selby', 'Stokesley', 'Wakefield', 'Grimsby', 'Halifax'] },
    { name: 'North West', cities: ['Manchester', 'Kendal', 'Salford', 'Blackburn', 'Carlisle', 'Maulds Meaburn'] },
    { name: 'North East', cities: ['Gateshead', 'Middlesbrough', 'Hexham', 'Sunderland', 'Alnwick', 'Cullercoats', 'Durham', 'Hartlepool', 'Newcastle upon Tyne', 'Redcar', 'Rothbury', 'Wooler', 'Cotherstone'] },
    { name: 'Scotland', cities: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee', 'Greenock', 'Haddington', 'Inverness', 'St Andrews', 'Airdrie', 'Ayr', 'Dunfermline', 'Hamilton'] },
    { name: 'Wales', cities: ['Cardiff', 'Aberystwyth', 'Bangor', 'St Davids', 'Aberfan', 'Newport', 'Newtown', 'St Asaph'] },
  ], cities: ['London', 'Liverpool', 'Thaxted', 'York', 'Derry-Londonderry', 'Portaferry'], partial: ['North East: 13 of 14 read', 'Scotland: 12 of 23 read (largest first)'] },
  { id: 'austria', name: 'Austria', count: 1189, regions: [], cities: ['Vienna', 'Salzburg', 'Linz', 'Graz', 'Innsbruck', 'Bregenz', 'Melk', 'Wels', 'Eisenstadt', 'Hall in Tirol', 'Klagenfurt', 'Oberschützen', 'Raiding', 'Reinbach im Innkreis', 'Sankt Florian', 'St. Georgen im Attergau', 'Gmunden', 'Grafenegg', 'Reichersberg', 'Sankt Gallen', 'Schwarzenberg'] },
  { id: 'japan', name: 'Japan', count: 1076, regions: [
    { name: 'Iwate', cities: ['Morioka', 'Kamaishi', 'Kuji'] },
    { name: 'Miyagi', cities: ['Natori', 'Sendai'] },
    { name: 'Ibaraki', cities: ['Mito', 'Toride'] },
    { name: 'Saitama', cities: ['Tokorozawa', 'Saitama', 'Kawagoe', 'Kawaguchi'] },
    { name: 'Chiba', cities: ['Ichikawa', 'Urayasu'] },
    { name: 'Tokyo', cities: ['Tokyo', 'Hachioji', 'Akiruno', 'Katsushika', 'Fuchu', 'Komae', 'Tachikawa', 'Tama'] },
    { name: 'Kanagawa', cities: ['Yokohama', 'Kawasaki', 'Hiratsuka', 'Yokosuka'] },
    { name: 'Nagano', cities: ['Nagano', 'Okaya', 'Ina', 'Matsumoto', 'Ueda'] },
    { name: 'Aichi', cities: ['Nagoya', 'Aichi', 'Kariya'] },
    { name: 'Shiga', cities: ['Otsu', 'Moriyama', 'Kusatsu'] },
    { name: 'Osaka', cities: ['Osaka', 'Hirakata'] },
    { name: 'Yamaguchi', cities: ['Kudamatsu', 'Hofu'] },
    { name: 'Fukuoka', cities: ['Fukuoka', 'Kitakyushu', 'Kurume'] },
  ], cities: ['Kyoto', 'Nishinomiya', 'Takasaki', 'Sapporo', 'Niigata', 'Kanazawa', 'Aomori', 'Hiroshima', 'Kumamoto', 'Miyazaki', 'Oita', 'Fukui', 'Hamamatsu', 'Koriyama', 'Matsuyama', 'Tsu', 'Yamagata'] },
  { id: 'china', name: 'China', count: 1035, regions: [
    { name: 'Jiangsu-Zhejiang-Shanghai', cities: ['Shanghai', 'Hangzhou', 'Wuxi', 'Suzhou', 'Nanjing', 'Haimen', 'Wenzhou', 'Changzhou', "Huai'an", 'Changshu', 'Haining', 'Jiangyin', 'Lishui', 'Nantong', 'Ningbo', 'Qidong', 'Quzhou', 'Suqian', 'Taizhou', 'Yixing'] },
    { name: 'Greater Bay Area', cities: ['Shenzhen', 'Guangzhou', 'Hong Kong', 'Macau', 'Dongguan', 'Foshan', 'Zhongshan', 'Zhuhai'] },
    { name: 'Beijing-Tianjin-Hebei', cities: ['Beijing', 'Tianjin', 'Shijiazhuang', 'Tangshan', 'Baoding', 'Hengshui', 'Handan'] },
    { name: 'Taiwan', cities: ['Taipei', 'Kaohsiung', 'Taichung', 'Chiayi', 'Hsinchu', 'Miaoli', 'Tainan', 'Pingtung', 'Yunlin', 'Taoyuan', 'Changhua', 'Yilan', 'Hualien', 'Keelung', 'Kinmen', 'New Taipei', 'Taitung'] },
    { name: 'Sichuan-Chongqing', cities: ['Chengdu', 'Chongqing'] },
  ], cities: ['Guiyang', "Xi'an", 'Wuhan', 'Hohhot', 'Xiamen', 'Changsha', 'Harbin', 'Haikou', 'Hefei', 'Jinan', 'Kunming', 'Nanning', 'Qingdao', 'Weifang', 'Fuzhou', 'Liaocheng', 'Nanchang', 'Shenyang', 'Zibo', 'Binzhou', 'Ganzhou', 'Hengyang', 'Huanggang', 'Lanzhou', 'Liaoyang', "Ma'anshan", 'Ordos', 'Taiyuan', 'Urumqi'], partial: ['other cities: the list continues below Urumqi (not read)', 'Sheng lists Taiwan as a region under China; recorded here exactly as Sheng shows it.'] },
  { id: 'france', name: 'France', count: 1014, regions: [
    { name: 'Île-de-France', cities: ['Paris', 'Boulogne-Billancourt', 'Gennevilliers', 'Versailles', 'Aubervilliers', 'Antony', 'Lieusaint', 'Poissy', 'Romainville', 'Saint-Denis', 'Le Port-Marly', 'Rungis'] },
    { name: 'Auvergne-Rhône-Alpes', cities: ['Lyon', 'Évian-les-Bains', 'Grenoble', 'Villeurbanne', 'Chambéry', 'La Chaise-Dieu', 'La Côte-Saint-André', 'Oullins-Pierre-Bénite', "Saint-Antoine-l'Abbaye"] },
    { name: 'Bourgogne-Franche-Comté', cities: ['Besançon', 'Dijon', 'Montbéliard', 'Dole', 'Sochaux', 'Beaune', 'Vault-de-Lugny', 'Vézelay'] },
    { name: 'Brittany', cities: ['Rennes', 'Fouesnant', 'Guingamp', 'Inzinzac-Lochrist', 'Lesneven', 'Rostrenen', 'Sarzeau', 'Brest', 'Plougonvelin'] },
    { name: 'Grand Est', cities: ['Metz', 'Strasbourg', 'Forbach', 'Nancy', 'Colmar', 'Châlons-en-Champagne', 'Mancieulles', 'Marckolsheim', 'Reims', 'Saint-Dizier', 'Wisches', 'Épernay', 'Froeschwiller', 'Sarrebourg'] },
    { name: 'Hauts-de-France', cities: ['Tourcoing', 'Soissons', 'Amiens', 'Compiègne', 'Lens', 'Lille', 'Neuville-en-Ferrain'] },
    { name: 'Normandy', cities: ['Rouen', 'Caen', 'Hérouville-Saint-Clair', 'Dieppe', "La Lucerne-d'Outremer", 'Rémalard'] },
    { name: 'Nouvelle-Aquitaine', cities: ['Bordeaux', 'Poitiers', 'La Rochelle', 'Saintes', 'Saint-Jean-de-Luz', 'Urrugne'] },
    { name: 'Occitanie', cities: ['Toulouse', 'Souillac'] },
    { name: "Provence-Alpes-Côte d'Azur", cities: ['Aix-en-Provence', 'Avignon', 'Arles', "Cabrières-d'Avignon", "La Roque-d'Anthéron"] },
  ], cities: ['Ajaccio', 'Orléans'] },
  { id: 'netherlands', name: 'Netherlands', count: 920, regions: [], cities: ['Amsterdam', 'Rotterdam', 'Eindhoven', 'Utrecht', 'Enschede', 'Tilburg', 'Haarlem', 'Nijmegen', 'The Hague', 'Groningen', 'Arnhem', 'Zwolle', 'Drachten', 'Leiden', 'Naarden', 'Apeldoorn', 'Leeuwarden', 'Oldenzaal', 'Alkmaar', 'Assen', 'Dinxperlo', 'Doetinchem', 'Hardenberg', 'Maastricht', 'Steenwijk', "'s-Hertogenbosch", 'Breda', 'Delft', 'Emmen', 'Heerlen', 'Lochem', 'Nijverdal', 'Zutphen', 'Aardenburg', 'Capelle aan den IJssel', 'Ede', 'Rhoon', 'Sneek', 'Waddinxveen', 'Almere', 'Hulst', 'Kampen', 'Oss', 'Rhenen', 'Sas van Gent'], partial: ['a few 0-event cities after Sas van Gent not read'] },
  { id: 'italy', name: 'Italy', count: 909, regions: [], cities: ['Milan', 'Rome', 'Naples', 'Turin', 'Genoa', 'Verona', 'Venice', 'Florence', 'Parma', 'Ferrara', 'Trieste', 'Treviso', 'Busseto', 'Trento', 'Venaria Reale', 'Arezzo', 'Belluno', 'Modena', 'Reggio Emilia', 'Bari', 'Bolzano', 'Brescia', 'Camogli', 'Fermo', 'Lodi', 'Martina Franca', 'Palermo', 'Seveso', 'Varese', 'Vicenza', 'Villafranca di Verona', 'Bergamo', 'Borgo San Lorenzo', 'Cernobbio', 'Cremona', 'Laigueglia', 'Merano', 'Monza', 'Pavia', 'Perugia', 'Pisa', 'Rapallo', 'Ravello', 'Rimini', 'Sondalo', 'Stresa'], partial: ['a few 0-event cities after Stresa not read'] },
  { id: 'switzerland', name: 'Switzerland', count: 839, regions: [], cities: [] /* Switzerland: see CITIES (js/data/cities.js) */, swiss: true },
  { id: 'spain', name: 'Spain', count: 751, regions: [], cities: ['Madrid', 'Barcelona', 'Valencia', 'Pamplona', 'Zaragoza', 'Murcia', 'Bilbao', 'Alicante', 'Las Palmas de Gran Canaria', 'San Sebastián', 'Santa Cruz de Tenerife', 'Seville', 'Santander', 'Badajoz', 'Castellón de la Plana', 'Cáceres', 'Lleida', 'Oviedo', 'San Lorenzo de El Escorial', 'Zamora', 'Azpeitia', 'Deba', 'Girona', 'La Puebla de Arganzón', 'Manresa', 'Orio', 'Pollença', 'Sabadell', 'Santiago de Compostela', 'Tolosa', 'Torroella de Montgrí', 'Vic'] },
  { id: 'australia', name: 'Australia', count: 728, regions: [], cities: ['Sydney', 'Melbourne', 'Brisbane', 'Adelaide', 'Perth', 'Canberra', 'Newcastle', 'Geelong', 'Wollongong', 'Dunkeld', 'Margaret River', 'Frankston', 'Eltham', 'Kingscote', 'McLaren Vale', 'Albany', 'Bunbury', 'Cairns', 'Cleveland', 'Fremantle', 'Gladstone', 'Mandurah', 'Somerville', 'Toowoomba'] },
  { id: 'canada', name: 'Canada', count: 475, regions: [], cities: ['Montréal', 'Toronto', 'Vancouver', 'Edmonton', 'Ottawa', 'Calgary', 'Québec City', 'Winnipeg', 'Hamilton, ON', 'North Vancouver', 'Pointe-Claire, QC', 'Almonte', 'Joliette', 'Saint-Irénée'] },
  { id: 'russia', name: 'Russia', count: 409, regions: [], cities: ['Moscow', 'Saint Petersburg', 'Dubna', 'Nizhny Novgorod', 'Severodvinsk', 'Volgograd', 'Vologda', 'Gatchina', 'Gubkin', 'Kazan', 'Klin', 'Samara', 'Stary Oskol', 'Tyumen'] },
  { id: 'belgium', name: 'Belgium', count: 388, regions: [], cities: ['Brussels', 'Antwerp', 'Liège', 'Ghent', 'Bruges', 'Namur', 'Hasselt', 'Leuven', 'Charleroi', 'Hamme', 'Kortrijk', 'Louvain-la-Neuve', 'Malonne', 'Maredsous', 'Mons', 'Turnhout', 'Ypres', 'Maasmechelen', 'Sankt Vith', 'Sint-Truiden'] },
  { id: 'czechia', name: 'Czechia', count: 241, regions: [], cities: ['Prague', 'Karlovy Vary', 'Liberec', 'Litomyšl', 'Brno'] },
  { id: 'finland', name: 'Finland', count: 217, regions: [], cities: ['Helsinki', 'Turku', 'Espoo', 'Tampere', 'Kotka', 'Oulu', 'Kuopio', 'Lahti', 'Jyväskylä', 'Kuusankoski', 'Loviisa', 'Mikkeli', 'Vaasa'] },
  { id: 'sweden', name: 'Sweden', count: 202, regions: [], cities: ['Stockholm', 'Helsingborg', 'Örebro', 'Gävle', 'Norrköping', 'Linköping', 'Kristianstad', 'Ockelbo', 'Söderhamn'] },
  { id: 'south-korea', name: 'South Korea', count: 139, regions: [
    { name: 'Seoul Capital Area', cities: ['Seoul', 'Incheon', 'Seongnam', 'Bucheon', 'Goyang', 'Hwaseong', 'Pyeongtaek'] },
    { name: 'Chungcheong', cities: ['Cheonan', 'Daejeon'] },
    { name: 'Gyeongsang', cities: ['Busan', 'Daegu', 'Tongyeong'] },
  ], cities: ['Yeosu', 'Pyeongchang'] },
  { id: 'luxembourg', name: 'Luxembourg', count: 122, regions: [], cities: ['Luxembourg'] },
  { id: 'portugal', name: 'Portugal', count: 111, regions: [], cities: ['Lisbon', 'Porto', 'Torres Vedras', 'Marvão'] },
  { id: 'denmark', name: 'Denmark', count: 95, regions: [], cities: ['Copenhagen', 'Roskilde', 'Aalborg', 'Esbjerg', 'Helsingør', 'Kolding', 'Viborg', 'Aarhus', 'Fredensborg', 'Klampenborg'] },
  { id: 'hungary', name: 'Hungary', count: 93, regions: [], cities: ['Budapest', 'Pécs', 'Békéscsaba', 'Debrecen', 'Kecskemét', 'Keszthely', 'Miskolc', 'Székesfehérvár', 'Dunaharaszti', 'Jászapáti', 'Sárbogárd'] },
  { id: 'slovakia', name: 'Slovakia', count: 93, regions: [], cities: ['Bratislava', 'Piešťany'] },
  { id: 'norway', name: 'Norway', count: 87, regions: [], cities: ['Oslo', 'Bergen', 'Trondheim', 'Sandnes', 'Stavanger', 'Lofthus', 'Steinkjer'] },
  { id: 'ireland', name: 'Ireland', count: 56, regions: [], cities: ['Dublin', 'Limerick', 'Lismore', 'Cork', 'Drogheda', 'Kilkenny', 'Knock', 'Newport', 'Waterford', 'Wexford', 'Blessington', 'Westport'] },
  { id: 'new-zealand', name: 'New Zealand', count: 55, regions: [], cities: ['Wellington', 'Auckland', 'Christchurch', 'Hamilton', 'Dunedin', 'Nelson', 'Paraparaumu', 'Whanganui', 'Blenheim', 'Cromwell', 'Hastings', 'Invercargill', 'Kerikeri', 'New Plymouth', 'Palmerston North', 'Rotorua', 'Taupō', 'Whangārei', 'Oamaru', 'Queenstown'] },
  { id: 'singapore', name: 'Singapore', count: 54, regions: [], cities: ['Singapore'] },
  { id: 'poland', name: 'Poland', count: 50, regions: [], cities: ['Warsaw', 'Wrocław', 'Katowice', 'Bydgoszcz', 'Gdańsk', 'Kraków'] },
  { id: 'croatia', name: 'Croatia', count: 27, regions: [], cities: ['Zagreb', 'Rovinj', 'Varaždin'] },
  { id: 'estonia', name: 'Estonia', count: 22, regions: [], cities: ['Tallinn', 'Jõhvi', 'Pärnu', 'Haapsalu', 'Tartu'] },
  { id: 'serbia', name: 'Serbia', count: 20, regions: [], cities: ['Belgrade'] },
  { id: 'slovenia', name: 'Slovenia', count: 20, regions: [], cities: ['Ljubljana', 'Maribor'] },
  { id: 'argentina', name: 'Argentina', count: 9, regions: [], cities: ['Buenos Aires'] },
  { id: 'mexico', name: 'Mexico', count: 8, regions: [], cities: ['Mexico City', 'Morelia', 'Guanajuato', 'Tijuana'] },
  { id: 'mauritius', name: 'Mauritius', count: 7, regions: [], cities: ['Quatre Bornes'] },
  { id: 'greece', name: 'Greece', count: 2, regions: [], cities: ['Athens'] },
  { id: 'liechtenstein', name: 'Liechtenstein', count: 2, regions: [], cities: ['Vaduz'] },
  { id: 'latvia', name: 'Latvia', count: 2, regions: [], cities: ['Cēsis', 'Riga', 'Jūrmala', 'Preiļi'] },
  { id: 'vietnam', name: 'Vietnam', count: 2, regions: [], cities: ['Hanoi'] },
  { id: 'bulgaria', name: 'Bulgaria', count: 1, regions: [], cities: ['Sofia', 'Varna'] },
  { id: 'brazil', name: 'Brazil', count: 1, regions: [], cities: ['São Paulo'] },
  { id: 'colombia', name: 'Colombia', count: 1, regions: [], cities: ['Bogotá'] },
  { id: 'lithuania', name: 'Lithuania', count: 1, regions: [], cities: ['Vilnius'] },
  { id: 'peru', name: 'Peru', count: 1, regions: [], cities: ['Lima'] },
  { id: 'romania', name: 'Romania', count: 1, regions: [], cities: ['Bucharest', 'Satu Mare'] },
  { id: 'uruguay', name: 'Uruguay', count: 1, regions: [], cities: ['Montevideo'] },
];

const byId = new Map(COUNTRIES.map((c) => [c.id, c]));
const byName = new Map(COUNTRIES.map((c) => [c.name.toLowerCase(), c]));

// Country by id ('germany') or English name ('Germany').
export const country = (idOrName) => byId.get(idOrName) || byName.get(String(idOrName || '').toLowerCase()) || null;

// Countries other than Switzerland, in Sheng's order.
export const otherCountries = () => COUNTRIES.filter((c) => !c.swiss);

// Every city of a country: region cities first (in region order), then the ungrouped ones.
export function countryCities(c) {
  const x = typeof c === 'string' ? country(c) : c;
  if (!x) return [];
  const seen = new Set();
  const out = [];
  for (const name of [...x.regions.flatMap((r) => r.cities), ...x.cities]) {
    if (!seen.has(name)) { seen.add(name); out.push(name); }
  }
  return out;
}
