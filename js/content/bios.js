// Short original composer biographies (Read Bio sheet). composerId -> text (paragraphs separated by \n\n).
// Original prose; facts checked against standard reference sources (Grove-style dates, HLS for Swiss links).
const p = (...paras) => paras.join('\n\n');

export const BIOS = {
  bach: p(
    `Johann Sebastian Bach was born in Eisenach in 1685, into a family that had supplied Thuringia with musicians for generations. Orphaned at ten, he grew into a formidable organist — as a young man he travelled more than 400 kilometres to Lübeck, reportedly on foot, to hear Dieterich Buxtehude play. Posts at Arnstadt, Mühlhausen and Weimar followed, then the court of Köthen, where the Brandenburg Concertos and the solo suites for cello and violin took shape.`,
    `From 1723 until his death in 1750 he was Thomaskantor in Leipzig, writing cantatas week after week alongside the great Passions, the Mass in B minor and The Art of Fugue. Known in his lifetime mainly as a keyboard virtuoso, he was half-forgotten afterwards; Mendelssohn’s 1829 revival of the St Matthew Passion began the rediscovery that made him, for many musicians, the foundation of everything.`,
  ),

  handel: p(
    `George Frideric Handel was born in Halle in 1685, the same year as Bach, and briefly studied law before music claimed him. Four years in Italy taught him to write for the voice with Italian ease. A post at the court of Hanover followed, but London, which he first visited in 1710, became his home: he settled there, became a British subject in 1727 and wrote the anthems for George II’s coronation, among them “Zadok the Priest”.`,
    `For three decades he poured out Italian operas — Rinaldo, Giulio Cesare, Alcina — winning and losing fortunes as an impresario. When fashion turned, he reinvented the English oratorio: Messiah, first heard in Dublin in 1742, Israel in Egypt, Judas Maccabaeus. The Water Music and the Music for the Royal Fireworks show his open-air flair. Blind in his last years, he died in London in 1759 and lies in Westminster Abbey.`,
  ),

  vivaldi: p(
    `Antonio Vivaldi was born in Venice in 1678, the son of a barber who played the violin at St Mark’s. Ordained a priest in 1703 — his red hair earned him the nickname “il Prete Rosso” — he soon stopped saying Mass, pleading a chronic chest complaint, and gave himself to music at the Ospedale della Pietà, a Venetian home for foundling girls whose orchestra and choir became famous across Europe.`,
    `He wrote hundreds of concertos, and collections such as L’estro armonico and The Four Seasons, printed in Amsterdam, carried his name far beyond Italy; Bach arranged several of them for keyboard. He was also a prolific opera composer and impresario. Tastes changed, and he died in Vienna in 1741, poor, having gone there in search of imperial patronage. Most of his music was rediscovered only in the twentieth century.`,
  ),

  haydn: p(
    `Joseph Haydn was born in 1732 in Rohrau, a village near the Austro-Hungarian border, the son of a wheelwright. A choirboy at St Stephen’s Cathedral in Vienna, he taught himself composition from treatises once his voice broke. In 1761 he entered the service of the Esterházy princes, and for nearly thirty years, often at their remote palace of Eszterháza, he had an orchestra at his command and, as he put it, no choice but to become original.`,
    `There he shaped the symphony and the string quartet into the forms Mozart and Beethoven inherited — Mozart, a close friend, dedicated six quartets to him, and the young Beethoven took lessons from him. Two triumphant visits to London in the 1790s produced his last twelve symphonies; the oratorios The Creation and The Seasons followed in Vienna, where he died in 1809, during Napoleon’s occupation of the city.`,
  ),

  mozart: p(
    `Wolfgang Amadeus Mozart was born in Salzburg in 1756. His father Leopold, a court violinist, took him and his sister Nannerl across Europe as child prodigies; on the way home from London in 1766 the family spent several weeks in Switzerland, passing through Geneva, Lausanne, Bern and Zurich and giving concerts along the way. Chafing in the service of Salzburg’s archbishop, he left for Vienna in 1781 to live as a freelance pianist, teacher and composer.`,
    `The Vienna decade brought the great piano concertos, the three operas written with Lorenzo Da Ponte — The Marriage of Figaro, Don Giovanni, Così fan tutte — and the last three symphonies, composed in a single summer. He married Constanze Weber in 1782. The Magic Flute was playing to full houses when he fell ill; he died in December 1791, aged 35, leaving his Requiem unfinished.`,
  ),

  beethoven: p(
    `Ludwig van Beethoven was baptised in Bonn on 17 December 1770, the grandson of the electoral Kapellmeister. He moved to Vienna in 1792 to study with Haydn and quickly made his name as a pianist of volcanic improvising power. Around 1798 he noticed the first signs of deafness; in 1802, in the letter known as the Heiligenstadt Testament, he confessed his despair — and resolved to go on composing.`,
    `What followed reshaped music: the Eroica and Fifth symphonies, the Violin Concerto, the opera Fidelio, the Emperor Concerto. By his last years he was almost completely deaf, yet he produced the Ninth Symphony, the Missa solemnis and the late quartets and piano sonatas, music that still sounds ahead of its time. He died in Vienna in March 1827; thousands followed his funeral procession.`,
  ),

  schubert: p(
    `Franz Schubert was born in 1797 in Himmelpfortgrund, then a suburb of Vienna, the son of a schoolmaster. A choirboy in the imperial chapel, he studied with Antonio Salieri, and at seventeen wrote Gretchen am Spinnrade, the first masterpiece among more than six hundred songs; Erlkönig followed a year later. He never held a court post, living instead on publishers’ fees and the generosity of friends.`,
    `Those friends — poets, painters, singers — gathered for “Schubertiads”, evenings devoted to his music. Wider fame came slowly: the only public concert given entirely to his works took place in March 1828. In that final year he wrote the String Quintet, the last three piano sonatas and the songs later published as Schwanengesang. He died that November, aged 31, and was buried near Beethoven, whom he had revered.`,
  ),

  rossini: p(
    `Gioachino Rossini was born in Pesaro on 29 February 1792, to a horn-playing father and a singer mother. He was a star at twenty-one, when Tancredi and L’italiana in Algeri took Venice by storm in 1813; The Barber of Seville, written in a matter of weeks for Rome in 1816, survived a chaotic first night to become one of the most loved comic operas ever written. In Naples he wrote serious operas for the soprano Isabella Colbran, whom he married.`,
    `In Paris he crowned his career with Guillaume Tell (1829), after Schiller’s drama about the Swiss hero; its overture, with an Alpine herdsman’s call on the cor anglais, is now more famous than the opera. Then, at 37, he stopped writing operas. He lived almost forty more years, a celebrated wit and gourmet, composing sacred music and his “Sins of Old Age”, and died at Passy, near Paris, in 1868.`,
  ),

  mendelssohn: p(
    `Felix Mendelssohn was born in Hamburg in 1809, grandson of the philosopher Moses Mendelssohn, and grew up in a cultivated Berlin household. Perhaps no composer since Mozart was so gifted so young: the Octet came at sixteen, the Overture to A Midsummer Night’s Dream at seventeen, and at twenty he conducted Bach’s St Matthew Passion in Berlin, its first performance since the composer’s death.`,
    `Travel fed his music — the Hebrides Overture, the Scottish and Italian symphonies. Switzerland drew him back again and again; he painted its mountains in watercolour, and in 1847, grieving for his sister Fanny, wrote his anguished F minor String Quartet at Interlaken. As conductor of the Leipzig Gewandhaus Orchestra and founder of the city’s conservatory he shaped German musical life. He died in Leipzig that November, aged 38.`,
  ),

  schumann: p(
    `Robert Schumann was born in Zwickau, Saxony, in 1810, the son of a bookseller, and grew up torn between literature and music. He studied law before committing himself to the piano under Friedrich Wieck, until an injury to his right hand ended his hopes as a virtuoso. He turned to composing and to criticism: in 1831 he greeted the young Chopin in print as a genius, and in 1834 he founded the Neue Zeitschrift für Musik, in whose pages he would later hail Brahms.`,
    `In 1840, after a court battle with her father, he married Wieck’s daughter Clara, the finest pianist of her generation. That year he wrote well over a hundred songs, Dichterliebe among them; symphonies and chamber music followed in similar concentrated bursts. Mental illness darkened his last years: after throwing himself into the Rhine in 1854 he entered an asylum at Endenich, near Bonn, where he died in 1856.`,
  ),

  chopin: p(
    `Fryderyk Chopin was born in 1810 at Żelazowa Wola, near Warsaw, to a French father and a Polish mother. A child prodigy, he studied at the Warsaw Conservatory and left Poland at twenty, weeks before the November Uprising of 1830; he never went back. In Paris he became the poet of the salons, preferring intimate gatherings to the concert hall, and earned his living teaching the aristocracy.`,
    `Almost everything he wrote is for piano, and he transformed what the instrument could say: nocturnes and ballades, mazurkas and polonaises steeped in Polish dance, études that are poems as much as exercises. His relationship with the novelist George Sand lasted nearly a decade and included a winter on Mallorca, where he finished the Preludes. He died in Paris in 1849, aged 39, probably of tuberculosis; his heart was taken back to Warsaw.`,
  ),

  liszt: p(
    `Franz Liszt was born in 1811 in Raiding, then in Hungary, and studied in Vienna with Carl Czerny before his family moved to Paris. Hearing Paganini in 1832 spurred him to become the violinist’s equal on the piano. In 1835 he eloped with Countess Marie d’Agoult to Geneva, where their daughter Blandine was born and he taught at the newly founded conservatoire; his Swiss wanderings became the first book of the Années de pèlerinage.`,
    `Through the 1840s he toured Europe as the first superstar pianist, giving some of the earliest solo recitals. Then he settled in Weimar as court music director, created the symphonic poem and championed Wagner, who later married his daughter Cosima. In Rome he took minor orders and became the Abbé Liszt, yet he went on teaching generously, and without fees, to the end. He died in Bayreuth in 1886.`,
  ),

  verdi: p(
    `Giuseppe Verdi was born in 1813 in Le Roncole, near Busseto, the son of an innkeeper. Turned down by the Milan Conservatory, he studied privately with the backing of a Busseto merchant, Antonio Barezzi, whose daughter he married — and within a few years his wife and both their children had died. Nabucco, staged at La Scala in 1842, revived him; its chorus of Hebrew slaves, “Va, pensiero”, became an anthem of Italian longing.`,
    `Rigoletto, Il trovatore and La traviata, written in barely two years, made him the master of Italian opera, and his very name became a slogan of the Risorgimento. Later came Aida, the Requiem in memory of the novelist Manzoni and, in old age, with the poet Arrigo Boito, Otello and the comic Falstaff. He died in Milan in 1901, leaving much of his fortune to a home for retired musicians.`,
  ),

  wagner: p(
    `Richard Wagner was born in Leipzig in 1813 and came to music late and largely self-taught. After lean years in Riga and Paris, Rienzi made his name in Dresden in 1842, and The Flying Dutchman and Tannhäuser had their premieres there — until his part in the 1849 uprising forced him to flee. He spent nearly a decade in exile in Zurich, writing his theoretical essays and beginning the music of the Ring; his love for Mathilde Wesendonck there fed Tristan und Isolde.`,
    `From 1866 to 1872 he lived at Tribschen, on Lake Lucerne, with Cosima von Bülow, Liszt’s daughter, whom he married in 1870; that Christmas morning she woke to the Siegfried Idyll, played on the villa’s staircase. With King Ludwig II’s support he built his own festival theatre at Bayreuth, opened with the Ring in 1876. He died in Venice in 1883; his music’s power, and his writings’ antisemitism, are debated still.`,
  ),

  'johann-strauss': p(
    `Johann Strauss II was born in Vienna in 1825, the son of the city’s reigning dance composer, who did everything he could to stop his son following him. The younger Strauss studied in secret and in 1844 made his debut with his own orchestra at Dommayer’s Casino in Hietzing; after his father’s death in 1849 he merged the two bands and became the undisputed “Waltz King”.`,
    `He toured as far as Russia and the United States, where he conducted gigantic concerts in Boston in 1872. His waltzes — The Blue Danube, Tales from the Vienna Woods, the Emperor Waltz — gave dance music symphonic polish, and his admirers included Brahms and Wagner. Die Fledermaus (1874) and The Gypsy Baron made him the leading figure of Viennese operetta. He died in Vienna in 1899.`,
  ),

  brahms: p(
    `Johannes Brahms was born in Hamburg in 1833, the son of a double-bass player, and as a boy earned money playing the piano in the city’s inns and dance halls. In 1853 the violinist Joseph Joachim sent him to Robert and Clara Schumann; Robert hailed him in print as the coming man of German music, and Clara became his lifelong friend. He settled in Vienna in the 1860s, and Ein deutsches Requiem made his name.`,
    `Cautious and fiercely self-critical, he was 43 when he finally finished his First Symphony; three more followed within a decade. Switzerland mattered to him: three summers by the lake at Thun yielded the Second Violin Sonata, the Third Piano Trio and the Double Concerto, and in 1895 he conducted at the opening of Zurich’s new Tonhalle. He died in Vienna in 1897, less than a year after Clara.`,
  ),

  'saint-saens': p(
    `Camille Saint-Saëns was born in Paris in 1835 and was one of music’s great prodigies: at his formal debut, aged ten, he offered to play any of Beethoven’s sonatas from memory as an encore. Organist of the Madeleine for nearly twenty years, a dazzling pianist and the teacher of Gabriel Fauré, he co-founded the Société nationale de musique in 1871 to champion new French music.`,
    `He wrote in every genre with polish and ease: the opera Samson et Dalila, five piano concertos, Danse macabre, the “Organ” Symphony and The Carnival of the Animals, which he kept private in his lifetime except for “The Swan”. He was also a pioneer of film music, scoring L’Assassinat du duc de Guise in 1908. Restless and curious to the end, he died in Algiers in 1921, aged 86.`,
  ),

  bizet: p(
    `Georges Bizet was born in Paris in 1838 into a musical family and entered the Paris Conservatoire before his tenth birthday. At seventeen he wrote his sunny Symphony in C, which then lay unknown for eighty years — Felix Weingartner conducted its first performance in Basel in 1935. He won the Prix de Rome in 1857 and spent three formative years in Italy.`,
    `Back in Paris he struggled, earning his living arranging other composers’ music and teaching, while The Pearl Fishers and his other operas met only modest success. His incidental music for L’Arlésienne hinted at what was to come. Carmen, premiered at the Opéra-Comique in March 1875, shocked part of its audience with its realism. Bizet died three months later, aged 36, never knowing it would become one of the most performed operas in the world.`,
  ),

  tchaikovsky: p(
    `Pyotr Ilyich Tchaikovsky was born in 1840 in Votkinsk, in the Urals, and trained first as a lawyer, working as a clerk in the Ministry of Justice. He was among the first students of the new St Petersburg Conservatory and from 1866 taught at Moscow’s. A wealthy widow, Nadezhda von Meck, supported him for thirteen years on the understanding that they would never meet.`,
    `After a disastrous marriage in 1877 he fled abroad; three stays at the Villa Richelieu in Clarens, on Lake Geneva, saw work on Eugene Onegin, The Maid of Orleans and the Violin Concerto, written there in under a month in 1878. Swan Lake, The Sleeping Beauty, The Nutcracker, The Queen of Spades and six symphonies made him the most internationally loved Russian composer of his day. He died in St Petersburg in 1893, nine days after conducting the premiere of his Sixth Symphony.`,
  ),

  dvorak: p(
    `Antonín Dvořák was born in 1841 in Nelahozeves, a village on the Vltava north of Prague, where his father kept an inn and a butcher’s shop. For years he played viola in the orchestra of Prague’s Provisional Theatre, partly under Smetana, while composing in obscurity. An Austrian state stipend brought his music to Brahms, who recommended him to his publisher Simrock; the Slavonic Dances of 1878 made him famous almost overnight.`,
    `England took him to its heart, and in 1892 he went to New York as director of the National Conservatory, where he wrote the New World Symphony, the American Quartet and the Cello Concerto. Homesick, he returned to Bohemia in 1895 and turned to tone poems and opera, Rusalka above all. He died in Prague in 1904 and is buried at Vyšehrad.`,
  ),

  grieg: p(
    `Edvard Grieg was born in Bergen in 1843. On the advice of the violinist Ole Bull he was sent at fifteen to the Leipzig Conservatory, an experience he later remembered with mixed feelings. Back in Scandinavia he set out to find a Norwegian voice, drawing on folk melody and the drones of the Hardanger fiddle. His Piano Concerto, written at 24, soon travelled the world.`,
    `He married his cousin, the soprano Nina Hagerup, who inspired many of his finest songs, and wrote incidental music for Ibsen’s Peer Gynt, whose “Morning Mood” and “In the Hall of the Mountain King” became universal. His sixty-six Lyric Pieces brought Norwegian colour into living rooms everywhere. From 1885 he lived at Troldhaugen, his villa by a fjord outside Bergen; he died in the city in 1907.`,
  ),

  puccini: p(
    `Giacomo Puccini was born in Lucca in 1858, heir to four generations of church musicians. As a teenager he reportedly walked to Pisa to see Verdi’s Aida, and settled on opera. He studied at the Milan Conservatory with Amilcare Ponchielli, and Manon Lescaut (1893) brought him his first great success.`,
    `La bohème, Tosca and Madama Butterfly followed — operas that marry long-breathed melody, swift theatrical pacing and finely detailed orchestration, and they remain at the heart of the repertoire. From his villa at Torre del Lago he went duck-hunting, raced motor cars and drove his librettists hard. He died in Brussels in 1924 while being treated for throat cancer, leaving Turandot unfinished; at its premiere Toscanini laid down his baton where Puccini’s music stopped.`,
  ),

  mahler: p(
    `Gustav Mahler was born in 1860 in Kaliště, Bohemia, one of many children of a Jewish distiller and innkeeper, and grew up in Jihlava. After the Vienna Conservatory he climbed through provincial opera houses — Ljubljana, Olomouc, Kassel, Prague, Leipzig, Budapest, Hamburg — to become director of the Vienna Court Opera in 1897, where his ten-year reign transformed standards of performance.`,
    `Conducting filled his seasons, so he composed in summer, in small huts beside Austrian lakes. His symphonies and song cycles try, as he once told Sibelius, to embrace everything: funeral marches and peasant dances, birdsong and military bands. In 1902 he married Alma Schindler. After leaving Vienna he conducted at the Metropolitan Opera and the New York Philharmonic, and came home, gravely ill, to die in Vienna in 1911.`,
  ),

  debussy: p(
    `Claude Debussy was born in 1862 in Saint-Germain-en-Laye, outside Paris, into a modest family, and entered the Paris Conservatoire at ten. He won the Prix de Rome in 1884 but found the Villa Medici stifling. The Javanese gamelan he heard at the 1889 Paris Exposition, the poetry of Mallarmé and Verlaine and the painting of his time pointed him towards a music of colour, harmony and atmosphere rather than development.`,
    `The Prélude à l’après-midi d’un faune (1894) is often called the starting point of modern music; the opera Pelléas et Mélisande (1902) and La Mer confirmed a new voice. His piano works — Estampes, Images, the Préludes — remain pillars of the repertoire. During the First World War he proudly signed his last sonatas “musicien français”. He died of cancer in Paris in March 1918, as German guns shelled the city.`,
  ),

  'richard-strauss': p(
    `Richard Strauss was born in Munich in 1864, the son of the principal horn player of the court orchestra. Taken up by the conductor Hans von Bülow, he made his name with brilliant tone poems — Don Juan, Till Eulenspiegel, Also sprach Zarathustra — then shocked and conquered the opera houses with Salome and Elektra before turning to the Viennese elegance of Der Rosenkavalier, written, like Elektra, with the poet Hugo von Hofmannsthal.`,
    `His conduct under the Nazi regime, which briefly made him president of its music chamber, has long been debated. After the war he and his wife Pauline spent nearly four years in Swiss hotels — at Baden near Zurich, Pontresina and Montreux. Metamorphosen was first performed in Zurich in 1946, and in 1948 he wrote the Four Last Songs. He returned home to Garmisch in 1949 and died there that September.`,
  ),

  sibelius: p(
    `Jean Sibelius was born in 1865 in Hämeenlinna, in a Finland that was then a Grand Duchy of the Russian Empire. Trained as a violinist, he studied in Helsinki, Berlin and Vienna, and found his voice in the Kalevala, Finland’s national epic: Kullervo (1892) made him a national figure, and Finlandia (1899), written amid tensions with Russia, became a symbol of the struggle for independence.`,
    `His seven symphonies grow from small motifs into vast, organic structures, and his Violin Concerto is among the most played of the century. From 1904 he lived at Ainola, a house in the forest near Lake Tuusula. After Tapiola in 1926 he published almost nothing more and destroyed an eighth symphony; the “silence of Järvenpää” lasted three decades, until his death in 1957.`,
  ),

  rachmaninoff: p(
    `Sergei Rachmaninoff was born in 1873 on a family estate in the Novgorod region of Russia and trained at the Moscow Conservatory, graduating with its gold medal. The disastrous premiere of his First Symphony in 1897 plunged him into depression; treatment with the physician Nikolai Dahl helped him back, and the Second Piano Concerto (1901), dedicated to Dahl, restored both his confidence and his fame.`,
    `After the 1917 revolution he left Russia for good and, to support his family, became one of the greatest concert pianists of the century. His summers in the 1930s belonged to Villa Senar, the house he built at Hertenstein on Lake Lucerne, where he wrote the Rhapsody on a Theme of Paganini and his Third Symphony. He spent his last years in the United States and died in Beverly Hills in 1943.`,
  ),

  ravel: p(
    `Maurice Ravel was born in 1875 in Ciboure, in the French Basque country, to a Basque mother and a Swiss father, the engineer and inventor Pierre-Joseph Ravel, who came from Versoix near Geneva. He studied at the Paris Conservatoire, where Fauré taught him composition, but his repeated failure to win the Prix de Rome became a scandal that cost the Conservatoire’s director his job.`,
    `Precise, elegant and intensely private, he was a perfectionist of sound. His works — the String Quartet, Gaspard de la nuit, Daphnis et Chloé, La Valse, Boléro, the two piano concertos — are marvels of colour and craftsmanship, and his orchestration of Mussorgsky’s Pictures at an Exhibition is the version most often played. A neurological illness silenced him in his last years. He died in Paris in 1937.`,
  ),

  bloch: p(
    `Ernest Bloch was born in Geneva in 1880 into a Jewish family. He studied violin with Eugène Ysaÿe in Brussels and composition in Frankfurt and Munich, and his only opera, Macbeth, reached the Opéra-Comique in Paris in 1910. Back in Geneva he taught at the conservatoire and conducted, while beginning a cycle of works that gave voice to his Jewish heritage, among them Schelomo for cello and orchestra.`,
    `In 1916 he went to the United States as conductor for a touring dance company and stayed, becoming the first director of the Cleveland Institute of Music and then head of the San Francisco Conservatory. In the 1930s he lived mostly in Switzerland, at Roveredo in Ticino, where he wrote his Sacred Service; his symphonic fresco Helvetia had already paid tribute to his homeland. He settled on the Oregon coast and died in Portland in 1959.`,
  ),

  bartok: p(
    `Béla Bartók was born in 1881 in Nagyszentmiklós, then in Hungary and now Sânnicolau Mare in Romania. A brilliant pianist, he studied at the Budapest Academy of Music, where he later taught for nearly thirty years. From 1905, with his friend Zoltán Kodály, he travelled from village to village with a phonograph, recording thousands of peasant songs whose rhythms and modes transformed his own music.`,
    `Bluebeard’s Castle, six string quartets, three piano concertos and the teaching pieces of Mikrokosmos made him a central figure of modern music. In Switzerland he found a vital patron in the Basel conductor Paul Sacher, who commissioned the Music for Strings, Percussion and Celesta and the Divertimento, written in 1939 in a chalet at Saanen where Bartók was Sacher’s guest. An opponent of fascism, he emigrated to New York in 1940, where, poor and ill, he wrote the Concerto for Orchestra. He died there in 1945.`,
  ),

  stravinsky: p(
    `Igor Stravinsky was born in 1882 at Oranienbaum, near St Petersburg, the son of a leading bass at the Mariinsky Theatre. He studied law, took private lessons with Rimsky-Korsakov, and with three ballets for Sergei Diaghilev’s Ballets Russes — The Firebird, Petrushka and The Rite of Spring — became the most talked-about composer in Europe. Much of The Rite was written at Clarens, on Lake Geneva.`,
    `Switzerland was his home from 1914 to 1920, mostly at Morges, where he worked on Les Noces and, with the Vaudois writer Charles Ferdinand Ramuz, created L’Histoire du soldat, first performed in Lausanne in 1918 under Ernest Ansermet. He then lived in France and, from 1939, in the United States, moving restlessly from neoclassicism to serial music. He died in New York in 1971 and is buried in Venice.`,
  ),

  martin: p(
    `Frank Martin was born in Geneva in 1890, the youngest of ten children of a Calvinist pastor. Hearing Bach’s St Matthew Passion as a boy of about twelve marked him for life. He studied privately in Geneva rather than at a conservatoire, and for years taught at the institute of Émile Jaques-Dalcroze, whose ideas about rhythm fascinated him; in 1933 he also founded his own music school, the Technicum moderne de musique.`,
    `His mature voice came late, as he neared fifty: Le vin herbé, a chamber oratorio on the Tristan legend, then the Petite symphonie concertante for Paul Sacher and In terra pax for Radio Genève at the end of the war. Golgotha and his Mass for double choir — written in the 1920s but withheld for decades — made him a major sacred composer. He moved to the Netherlands in 1946, taught in Cologne, and died in Naarden in 1974.`,
  ),

  honegger: p(
    `Arthur Honegger was born in Le Havre in 1892 to parents from Zurich, and kept his Swiss citizenship all his life. He studied at the Zurich Conservatory and then at the Paris Conservatoire, and was counted with Milhaud, Poulenc and others among “Les Six” — though his serious, contrapuntal music, rooted in Bach and Beethoven, stood apart from their irreverence.`,
    `Switzerland gave him his breakthrough: Le Roi David, written for René Morax’s open-air Théâtre du Jorat at Mézières in 1921. Pacific 231, his portrait of a locomotive, followed in 1923. In Basel, Paul Sacher commissioned symphonies from him and conducted the first performance of the dramatic oratorio Jeanne d’Arc au bûcher in 1938. Honegger stayed in Paris through the war, wrote his anguished Third Symphony after it, and died there in 1955.`,
  ),

  shostakovich: p(
    `Dmitri Shostakovich was born in St Petersburg in 1906 and studied at the Petrograd Conservatory; his First Symphony, a graduation piece, made him famous at nineteen. His opera Lady Macbeth of the Mtsensk District was a triumph until, in January 1936, an unsigned Pravda editorial headed “Muddle instead of Music” condemned it, and he lived for months expecting arrest.`,
    `His Fifth Symphony (1937) brought rehabilitation, and the Seventh, written partly in besieged Leningrad, became a wartime symbol. Denounced again in 1948, he wrote some music for the drawer and some for the state, and his fifteen symphonies and fifteen string quartets are still searched for hidden meanings — not least the motif D–S–C–H, which spells his initials in German notation. He died in Moscow in 1975.`,
  ),

  messiaen: p(
    `Olivier Messiaen was born in Avignon in 1908, the son of a scholar of English literature and the poet Cécile Sauvage. He entered the Paris Conservatoire as a boy and studied with Paul Dukas and Marcel Dupré. In 1931 he became organist of the Église de la Sainte-Trinité in Paris, a post he held for more than sixty years. Taken prisoner as a soldier in 1940, he wrote the Quartet for the End of Time in a German prison camp.`,
    `A devout Catholic who saw colours when he heard chords, he built a language entirely his own from birdsong, Hindu and ancient Greek rhythms and his “modes of limited transposition”. The Turangalîla-Symphonie, the Catalogue d’oiseaux and the opera Saint François d’Assise are its summits. A great teacher, he counted Boulez, Stockhausen and Xenakis among his students. He died in Clichy, near Paris, in 1992.`,
  ),

  part: p(
    `Arvo Pärt was born in 1935 in Paide, Estonia, and studied at the Tallinn Conservatory while working as a sound engineer for Estonian Radio. His early serial works caused official trouble in the Soviet Union, and after his openly religious collage piece Credo (1968) was censured and then banned, he fell largely silent for years, immersing himself in Gregorian chant and medieval and Renaissance polyphony.`,
    `In 1976 he emerged with a radically simple style he called tintinnabuli, after the ringing of bells: one voice moves stepwise while another sounds only the notes of a single triad. The piano piece Für Alina (1976) was the first; Fratres, Tabula rasa and Spiegel im Spiegel soon followed. In 1980 he emigrated with his family, first to Vienna and then, a year later, to Berlin; he later returned to Estonia, and is today one of the most performed living composers.`,
  ),
};
