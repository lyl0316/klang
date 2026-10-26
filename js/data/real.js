// Real concert listings read from the venues' and orchestras' own websites by tools/feeds
// (facts only, with links back). Interim data file until the daily feed loader ships;
// in cities listed in REAL_CITIES the demo listings are no longer shown.
export const REAL_UPDATED = "2026-10-26T08:30:43+01:00";
export const REAL_SOURCES = [{"name": "Bühnen Bern (Berner Symphonieorchester)", "site": "https://buehnenbern.ch/", "attribution": "Source: Bühnen Bern (buehnenbern.ch)"}, {"name": "Collegium Novum Zürich", "site": "https://cnz.ch/", "attribution": "Source: Collegium Novum Zürich (cnz.ch)"}, {"name": "Grand Théâtre de Genève (Ville de Genève)", "site": "https://www.gtg.ch/", "attribution": "Source: Ville de Genève – Agenda du Grand Théâtre de Genève (opendata.swiss, via OpenAgenda). Licence: open use, source must be given."}, {"name": "Victoria Hall, Genève (Ville de Genève)", "site": "https://victoriahall.geneve.ch/", "attribution": "Source: Ville de Genève – Agenda du Victoria Hall (opendata.swiss, via OpenAgenda). Licence: open use, source must be given."}, {"name": "Luzerner Sinfonieorchester", "site": "https://sinfonieorchester.ch/", "attribution": "Source: Luzerner Sinfonieorchester (sinfonieorchester.ch)"}, {"name": "Lucerne Festival", "site": "https://www.lucernefestival.ch/", "attribution": "Source: Lucerne Festival (lucernefestival.ch)"}, {"name": "Musikkollegium Winterthur", "site": "https://www.musikkollegium.ch/", "attribution": "Source: Musikkollegium Winterthur (musikkollegium.ch)"}, {"name": "L'Orchestre de Chambre de Genève", "site": "https://locg.ch/", "attribution": "Source: L'Orchestre de Chambre de Genève (locg.ch)"}, {"name": "Opéra de Lausanne", "site": "https://www.opera-lausanne.ch/", "attribution": "Source: Opéra de Lausanne (opera-lausanne.ch)"}, {"name": "Opernhaus Zürich", "site": "https://www.opernhaus.ch/", "attribution": "Source: Opernhaus Zürich (opernhaus.ch). Facts only; details and tickets on opernhaus.ch."}, {"name": "Orchestra della Svizzera italiana", "site": "https://www.osi.swiss/", "attribution": "Source: Orchestra della Svizzera italiana (osi.swiss)"}, {"name": "Orchestre de la Suisse Romande", "site": "https://www.osr.ch/", "attribution": "Source: Orchestre de la Suisse Romande (osr.ch)"}, {"name": "Sinfonieorchester Basel", "site": "https://www.sinfonieorchesterbasel.ch/", "attribution": "Source: Sinfonieorchester Basel (sinfonieorchesterbasel.ch)"}, {"name": "Stadtcasino Basel", "site": "https://www.stadtcasino-basel.ch/", "attribution": "Source: Stadtcasino Basel (stadtcasino-basel.ch)"}, {"name": "Tonhalle Zürich", "site": "https://www.tonhalle-orchester.ch/", "attribution": "Source: Tonhalle-Gesellschaft Zürich (tonhalle-orchester.ch / tonhallezuerich.ch)"}, {"name": "Zürcher Kammerorchester", "site": "https://zko.ch/", "attribution": "Source: Zürcher Kammerorchester (zko.ch)"}];
export const REAL_CITIES = ["basel", "bern", "brugg", "chur", "dietikon", "engelberg", "frauenfeld", "fribourg", "geneva", "kriens", "la-chaux-de-fonds", "lausanne", "lucerne", "lugano", "schaffhausen", "sion", "vernier", "winterthur", "zug", "zurich"];
export const REAL = [
{
"id": "real-geneva_victoria_hall-17557955-20261026",
"title": "Ara Malikian «Intruso»",
"series": "Migros-Pour-cent-culturel Classics",
"start": "2026-10-26T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin & Conductor",
"name": "Ara Malikian"
},
{
"role": "Piano",
"name": "Iván «Melón» Lewis"
},
{
"role": "Guitar",
"name": "Dayan Abad"
},
{
"role": "Bass & Double bass",
"name": "Iván Ruiz Machado"
},
{
"role": "Drums",
"name": "Georvis Pico Milán"
}
],
"program": [],
"ticketUrl": "https://migros.infomaniak.events/fr-ch/shop/migros-pour-cent-culturel-classic-2026-2027-EBGNGEVB9H",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/17557955_ara-malikian-intruso-5245285",
"source": "geneva_victoria_hall"
},
{
"id": "real-zko-19498",
"title": "Saisoneröffnung mit Daniel Hope",
"series": "Abo-Konzerte",
"start": "2026-10-27T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Music Director",
"name": "Daniel Hope"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Felix Mendelssohn",
"title": "Sinfonie für Streichorchester Nr. 8 D-Dur, MWV N8 (Fassung mit Bläsern)",
"composerId": "mendelssohn"
},
{
"composer": "Ralph Vaughan Williams",
"title": "The Lark Ascending für Violine und kleines Orchester"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 6 F-Dur, Pastorale, op. 68",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1948",
"sourceUrl": "https://zko.ch/events/saisoneroeffnung-mit-daniel-hope-2026-27/",
"source": "zko"
},
{
"id": "real-lso_luzern-13060",
"title": "Konzert für Familien «Gänseblüemli im Rosengarten»",
"series": null,
"start": "2026-10-28T15:15:00+01:00",
"durationMin": 60,
"cityId": null,
"venueName": "Rachmaninoffs Villa Senar",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Samuel Niederhauser"
},
{
"role": "Violin",
"name": "Agata Lazarczyk"
},
{
"role": "Piano",
"name": "Edward Rushton"
},
{
"role": "Flute",
"name": "Salome Böni"
},
{
"role": "Director",
"name": "Christine Cyris"
}
],
"program": [],
"ticketUrl": "https://www.ticketino.com/de/Event/Familienkonzert-Gaenseblueemli-im-Rosengarten/212708",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/konzert-fuer-familien-gaenseblueemli-im-rosengarten-gastspiel/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2056333",
"title": "Ara Malikian – The Explosive Violinist",
"series": null,
"start": "2026-10-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin & direction",
"name": "Ara Malikian"
},
{
"role": "Piano",
"name": "Iván «Melón» Lewis"
},
{
"role": "Guitar",
"name": "Dayan Abad"
},
{
"role": "Bass & Double bass",
"name": "Iván Ruiz Machado"
},
{
"role": "Percussion",
"name": "Pico Millán"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5641&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/ara-malikian-the-explosive-violinist-2056333/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199830",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-10-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15286&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-10109530-20261028",
"title": "Sir András Schiff; Evgeny Kissin",
"series": "Les Grands Interprètes",
"start": "2026-10-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Sir András Schiff"
},
{
"role": "Piano",
"name": "Evgeny Kissin"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate en ré majeur pour deux pianos, KV 448",
"composerId": "mozart"
},
{
"composer": "Robert Schumann",
"title": "Andante et Variations en si bémol majeur pour deux pianos, op. 46",
"composerId": "schumann"
},
{
"composer": "Robert Schumann",
"title": "Bilder aus Osten, op. 66",
"composerId": "schumann"
},
{
"composer": "Bedřich Smetana",
"title": "La Moldau, extrait de Ma Patrie (version pour quatre mains)"
},
{
"composer": "Antonín Dvořák",
"title": "Danses slaves pour quatre mains, extraits des op. 46 et 72",
"composerId": "dvorak"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/sir-andras-schiff-evgeny-kissin2026",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/10109530_sir-andras-schiff-evgeny-kissin",
"source": "geneva_victoria_hall"
},
{
"id": "real-musikkollegium-9731",
"title": "Zu Gast in Frauenfeld",
"series": null,
"start": "2026-10-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "frauenfeld",
"venueName": "Casino Frauenfeld",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Nils Erik Måseidvåg"
},
{
"role": "Horn",
"name": "Kenneth Henderson"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ouvertüre F-Dur, op. 32 «Märchen von der schönen Melusine»",
"composerId": "mendelssohn"
},
{
"composer": "Richard Strauss",
"title": "Konzert für Horn und Orchester Nr. 1 Es-Dur, op. 11",
"composerId": "richard-strauss"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 6 F-Dur, op. 68 «Pastorale»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/zu-gastfrauenfeld-26-10-28-9731",
"sourceUrl": "https://www.musikkollegium.ch/programm/zu-gastfrauenfeld-26-10-28-9731",
"source": "musikkollegium"
},
{
"id": "real-musikkollegium-10058",
"title": "Kafikammer - Der Trompeter als Alleinunterhalter",
"series": "KafiDia",
"start": "2026-10-29T17:00:00+01:00",
"durationMin": 45,
"cityId": "winterthur",
"venueName": "Kafi Dia",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Trumpet",
"name": "Guillaume Thoraval"
}
],
"program": [],
"ticketUrl": "https://www.musikkollegium.ch/programm/kafikammer-der-trompeter-als-alleinunterhalter-26-10-29-10058",
"sourceUrl": "https://www.musikkollegium.ch/programm/kafikammer-der-trompeter-als-alleinunterhalter-26-10-29-10058",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199831",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-10-29T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15287&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20891",
"title": "KLANGXCHANGE: VON ZWERGPIRATEN UND TRATSCHWELLEN…",
"series": null,
"start": "2026-10-29T19:30:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueName": "Schiffrestaurant Willhelm Tell",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Bass",
"name": "Rueben Mbonambi"
},
{
"role": "Narrator",
"name": "Max Faatz"
},
{
"role": "Trumpet",
"name": "Philipp Hutter"
},
{
"role": "Trumpet",
"name": "Mehdi Missoum"
},
{
"role": "Horn",
"name": "Florian Abächerli"
},
{
"role": "Trombone",
"name": "Simone Maffioletti"
},
{
"role": "Tuba",
"name": "Andrin Lüchinger"
},
{
"role": "Host",
"name": "Hannah Schoepe"
},
{
"role": "Host",
"name": "Pia-Rabea Vornholt"
}
],
"program": [
{
"composer": "Arthur Sullivan",
"title": "The Pirates of Penzance Suite (Arrangement Fen Watkin)"
},
{
"workId": "wagner-dutchman",
"composerId": "wagner"
},
{
"composer": "Antonín Dvořák",
"title": "Sinfonie Nr. 8 G-Dur op. 88 Auszüge für Blechbläserquintett (Arrangement: Craig Garner)",
"composerId": "dvorak"
},
{
"composer": "George Gershwin",
"title": "«I Got Plenty o’ Nuttin’» aus Porgy and Bess"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/klangxchange-kzquva",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/klangxchange-von-zwergpiraten-und-tratschwellen/",
"source": "lso_luzern"
},
{
"id": "real-musikkollegium-10057",
"title": "Kafikammer - Der Trompeter als Alleinunterhalter",
"series": "KafiDia",
"start": "2026-10-29T20:00:00+01:00",
"durationMin": 45,
"cityId": "winterthur",
"venueName": "Kafi Dia",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Trumpet",
"name": "Guillaume Thoraval"
}
],
"program": [],
"ticketUrl": "https://www.musikkollegium.ch/programm/kafikammer-der-trompeter-als-alleinunterhalter-26-10-29-10057",
"sourceUrl": "https://www.musikkollegium.ch/programm/kafikammer-der-trompeter-als-alleinunterhalter-26-10-29-10057",
"source": "musikkollegium"
},
{
"id": "real-ocg-concert-sur-le-pouce-2-20261030",
"title": "Concert sur le pouce #2",
"series": "Concert sur le pouce",
"start": "2026-10-30T12:15:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Bibliothèque de la Cité",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.bm-geneve.ch/notice?id=h%3A%3A7f72f74a-7f48-4599-bba5-2ec555540343&posInSet=33&queryId=N-b54a6d6e-54e4-4fcd-91bd-80648d0b45be",
"sourceUrl": "https://locg.ch/fr/calendrier/concert-sur-le-pouce-2",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200322",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2026-10-30T19:00:00+01:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tarmo Peltokoski"
},
{
"role": "Tamino",
"name": "Magnus Dietrich"
},
{
"role": "Sarastro",
"name": "Tobias Kehrer"
},
{
"role": "Pamina",
"name": "Regula Mühlemann"
},
{
"role": "Königin der Nacht",
"name": "Jasmin Delfs"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Andrew Moore"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15163&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-gitanes-20261030",
"title": "Gitanes",
"series": "Concert à l'abo",
"start": "2026-10-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Mezzo-soprano",
"name": "Isabelle Druet"
},
{
"role": "Tenor",
"name": "Petr Nekoranec"
},
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Leoš Janáček",
"title": "Le Journal d’un disparu (Zápisnìk zmizelého)"
},
{
"composer": "Manuel de Falla",
"title": "L’Amour sorcier (El amor brujo)"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114007",
"sourceUrl": "https://locg.ch/fr/calendrier/gitanes",
"source": "ocg"
},
{
"id": "real-tonhalle-2056338",
"title": "Herbsttournee Schweizer Jugend-Sinfonie-Orchester SJSO: «Nordwärts»",
"series": null,
"start": "2026-10-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Schweizer Jugend-Sinfonie-Orchester SJSO"
},
{
"role": "Conductor",
"name": "Izabelė Jankauskaitė"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "«Norwegische Tänze» op. 35",
"composerId": "grieg"
},
{
"composer": "Einojuhani Rautavaara",
"title": "«Cantus Arcticus», Concerto for Birds and Orchestra"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://www.kulturticket.ch/11617/sjso-schweizer-jugend-sinfonie-orchester/event/2037",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/herbsttournee-schweizer-jugend-sinfonie-orchester-sjso-nordwaerts-2056338/tz/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9215",
"title": "Der kleine Prinz",
"series": "Familienkonzert ab 5 Jahren",
"start": "2026-10-31T15:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Johannes Beranek"
},
{
"role": "Narrator",
"name": "Felix Bierich"
}
],
"program": [
{
"composer": "Stefan Plank",
"title": "Der Kleine Prinz"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/167831/",
"sourceUrl": "https://www.musikkollegium.ch/programm/der-kleine-prinz-26-10-31-9215",
"source": "musikkollegium"
},
{
"id": "real-osr-famille-addams-20261031",
"title": "La Famille Addams",
"series": null,
"start": "2026-10-31T17:00:00+01:00",
"durationMin": 130,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stefan Geiger"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Marc Shaiman",
"title": "The Addams Family"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/famille-addams",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/famille-addams",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199832",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-10-31T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15288&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-basler-gesangverein",
"title": "Basler Gesangverein – Orchestre Musique des Lumières",
"series": "Musiksaal",
"start": "2026-10-31T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Facundo Agudin"
},
{
"role": "Soprano",
"name": "Laurence Guillod"
},
{
"role": "Alto",
"name": "Mirjam Fässler"
},
{
"role": "Tenor",
"name": "Remy Burnens"
},
{
"role": "Bass",
"name": "Alexandre Beuchat"
}
],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/en/event/basler-gesangverein-20262027-stadtcasino-basel-21686057/?affiliate=MWY&utm_campaign=biderundtanner&utm_medium=dp&utm_source=MWY",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/basler-gesangverein/",
"source": "stadtcasino_basel"
},
{
"id": "real-ocg-gitanes-20261031",
"title": "Gitanes",
"series": "Concert à l'abo",
"start": "2026-10-31T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Mezzo-soprano",
"name": "Isabelle Druet"
},
{
"role": "Tenor",
"name": "Petr Nekoranec"
},
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Leoš Janáček",
"title": "Le Journal d’un disparu (Zápisnìk zmizelého)"
},
{
"composer": "Manuel de Falla",
"title": "L’Amour sorcier (El amor brujo)"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229954260355&productId=10229790114007&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/gitanes",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200169",
"title": "Konzert Opera Nova",
"series": "Opera Nova",
"start": "2026-10-31T19:30:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Christian Wolff",
"title": "«Stones»"
},
{
"composer": "John Cage",
"title": "«4′33»"
},
{
"composer": "Cornelius Cardew",
"title": "«Paragraph 7» aus «The Great Learning»"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15456&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/for-trained-and-untrained-musicians/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-marathon-boheme-20261101",
"title": "Marathon Bohême",
"series": null,
"start": "2026-11-01T10:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Restaurant Le Lyrique",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Performer",
"name": "Romain Descharmes"
},
{
"role": "Performer",
"name": "Flore Merlin"
},
{
"role": "Performer",
"name": "Raphaël Merlin"
},
{
"role": "Performer",
"name": "Camille Merckx"
},
{
"role": "Performer",
"name": "Petr Nekoranec"
},
{
"role": "Performer",
"name": "Deborah Nemtanu"
},
{
"role": "Performer",
"name": "Florent Pujuila"
},
{
"role": "Ensemble",
"name": "Quatuor Terpsycordes"
},
{
"role": "Ensemble",
"name": "Solistes de l'OCG"
}
],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229886498239",
"sourceUrl": "https://locg.ch/fr/calendrier/marathon-boheme",
"source": "ocg"
},
{
"id": "real-zko-18581",
"title": "Kammermusik@ZKO — Elegien der Stille",
"series": "Kammermusik@ZKO",
"start": "2026-11-01T11:00:00+01:00",
"durationMin": 60,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Daniel Bard"
},
{
"role": "Violin",
"name": "Daria Zappa Matesic"
},
{
"role": "Viola",
"name": "Frauke Tometten Molino"
},
{
"role": "Cello",
"name": "Guillermo Ortega Santos"
}
],
"program": [
{
"composer": "John Zorn",
"title": "Kol Nidre für Streichquartett d-Moll"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Streichquartett Nr. 15 es-Moll, op. 144"
},
{
"composer": "Ludwig van Beethoven",
"title": "Cavatina: Adagio molto espressivo, aus: Streichquartett Nr. 13 B-Dur, op. 130",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1975",
"sourceUrl": "https://zko.ch/events/kammermusikzko-elegien-der-stille/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-200025",
"title": "3. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2026-11-01T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Rute Fernandes"
},
{
"role": "Oboe",
"name": "Layla Köhler Baratto"
},
{
"role": "Clarinet",
"name": "Martim Barbos"
},
{
"role": "Bassoon",
"name": "Anne Gerstenberger"
},
{
"role": "Horn",
"name": "Irene Lopez del Pozo"
},
{
"role": "Piano",
"name": "Kateryna Tereshchenko"
}
],
"program": [
{
"composer": "Ludwig Thuille",
"title": "Sextett B-Dur op. 6"
},
{
"composer": "Paul Juon",
"title": "Divertimento op. 51"
},
{
"composer": "Theodor Blumer",
"title": "Sextett B-Dur op. 21"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15442&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-3/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-01112026_nob",
"title": "Neues Orchester Basel – Verdi Requiem",
"series": "Musiksaal",
"start": "2026-11-01T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Tschechischer Philharmonischer Chor"
},
{
"role": "Conductor",
"name": "Christian Knüsel"
},
{
"role": "Orchestra",
"name": "Neues Orchester Basel"
}
],
"program": [
{
"composer": "Charles Ives",
"title": "Unanswered Question"
},
{
"workId": "verdi-requiem",
"composerId": "verdi"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Neues-Orchester-Basel/shop/event/175581/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/01112026_nob/",
"source": "stadtcasino_basel"
},
{
"id": "real-geneva_victoria_hall-94547020-20261101",
"title": "Orchestre Symphonique Suisse des Jeunes – «Vers le nord»",
"series": null,
"start": "2026-11-01T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre Symphonique Suisse des Jeunes"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "Danses norvégiennes",
"composerId": "grieg"
},
{
"composer": "Einojuhani Rautavaara",
"title": "Cantus Arcticus, Concerto for Birds and Orchestra"
},
{
"composer": "Jean Sibelius",
"title": "Symphonie n° 5 en mi bémol majeur, op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229301208804",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/94547020_swiss-youth-symphony-orchestra",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200186",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-01T18:00:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15374&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-famille-addams-20261101",
"title": "La Famille Addams",
"series": null,
"start": "2026-11-01T20:15:00+01:00",
"durationMin": 130,
"cityId": null,
"venueName": "Rosey Concert Hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stefan Geiger"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Marc Shaiman",
"title": "The Addams Family"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/famille-addams",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/famille-addams",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200026",
"title": "3. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2026-11-02T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Rute Fernandes"
},
{
"role": "Oboe",
"name": "Layla Köhler Baratto"
},
{
"role": "Clarinet",
"name": "Martim Barbos"
},
{
"role": "Bassoon",
"name": "Anne Gerstenberger"
},
{
"role": "Horn",
"name": "Irene Lopez del Pozo"
},
{
"role": "Piano",
"name": "Kateryna Tereshchenko"
}
],
"program": [
{
"composer": "Ludwig Thuille",
"title": "Sextett B-Dur op. 6"
},
{
"composer": "Paul Juon",
"title": "Divertimento op. 51"
},
{
"composer": "Theodor Blumer",
"title": "Sextett B-Dur op. 21"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15443&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-3/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2070546",
"title": "Cello Magic",
"series": null,
"start": "2026-11-03T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Benedict Klöckner"
},
{
"role": "Piano",
"name": "Danae Dörken"
}
],
"program": [],
"ticketUrl": "https://tickets.benedictkloeckner.de/s/n2Hy60kW",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/cello-magic-2070546/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200187",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-04T19:00:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15375&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-buehnen_bern-lieben-sie-brahms-2026-11-04-1930",
"title": "Lieben Sie Brahms?",
"series": "3. Symphoniekonzert",
"start": "2026-11-04T19:30:00+01:00",
"durationMin": 115,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Konzert für Klavier und Orchester Nr. 1 d-Moll op. 15 (1854–59)",
"composerId": "brahms"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie Nr. 2 D-Dur op. 73 (1877)",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2016&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/lieben-sie-brahms/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2055193",
"title": "Paavo Järvi & Hayato Sumino",
"series": null,
"start": "2026-11-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Hayato Sumino"
}
],
"program": [
{
"composer": "Dieter Ammann",
"title": "«Turn» für Orchester"
},
{
"composer": "Sergej Prokofjew",
"title": "Klavierkonzert Nr. 3 C-Dur op. 26"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonie Nr. 4 C-Dur op. 112, 2. Fassung"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhalleorchester.ch%2Fkonzerte%2Fkalender%2F&event=5579&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-hayato-sumino-2055193/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-04112026_kg",
"title": "Schweizer Jugend-Sinfonie-Orchester",
"series": "KG-Sinfoniekonzerte",
"start": "2026-11-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Schweizer Jugend-Sinfonie-Orchester"
},
{
"role": "Conductor",
"name": "Izabelė Jankauskaitė"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "Norwegische Tänze op. 35 (Orchesterfassung von Hans Sitt)",
"composerId": "grieg"
},
{
"composer": "Einojuhani Rautavaara",
"title": "«Cantus Arcticus» Concerto for Birds and Orchestra op. 61"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://tickets.sinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=203",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/04112026_kg/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9217",
"title": "Bogdan Božović spielt Tschaikowsky",
"series": "Hauskonzert",
"start": "2026-11-05T19:00:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Christoph Koncz"
},
{
"role": "Violin",
"name": "Bogdan Božović"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Konzert für Violine und Orchester D-Dur, op. 35"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 5 c-Moll, op. 67",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/178324/",
"sourceUrl": "https://www.musikkollegium.ch/programm/bogdan-bozovic-spielt-tschaikowsky-26-11-05-9217",
"source": "musikkollegium"
},
{
"id": "real-buehnen_bern-lieben-sie-brahms-2026-11-05-1930",
"title": "Lieben Sie Brahms?",
"series": "3. Symphoniekonzert",
"start": "2026-11-05T19:30:00+01:00",
"durationMin": 115,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Konzert für Klavier und Orchester Nr. 1 d-Moll op. 15 (1854–59)",
"composerId": "brahms"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie Nr. 2 D-Dur op. 73 (1877)",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/bso",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/lieben-sie-brahms/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2055194",
"title": "Paavo Järvi & Hayato Sumino",
"series": null,
"start": "2026-11-05T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Hayato Sumino"
}
],
"program": [
{
"composer": "Dieter Ammann",
"title": "«Turn» für Orchester"
},
{
"composer": "Sergej Prokofjew",
"title": "Klavierkonzert Nr. 3 C-Dur op. 26"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonie Nr. 4 C-Dur op. 112, 2. Fassung"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhalleorchester.ch%2Fkonzerte%2Fkalender%2F&event=5566&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-hayato-sumino-2055194/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-05112026_vosiko",
"title": "Schweizer Jugend-Sinfonie-Orchester",
"series": "Volkssinfoniekonzerte",
"start": "2026-11-05T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Schweizer Jugend-Sinfonie-Orchester"
},
{
"role": "Conductor",
"name": "Izabelė Jankauskaitė"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "Norwegische Tänze op. 35 (Orchesterfassung von Hans Sitt)",
"composerId": "grieg"
},
{
"composer": "Einojuhani Rautavaara",
"title": "«Cantus Arcticus» Concerto for Birds and Orchestra op. 61"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://tickets.volkssinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=208",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/05112026_vosiko/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-beethoven-1-4-5-20261105",
"title": "Cycle Beethoven 1",
"series": "Cycle Beethoven",
"start": "2026-11-05T20:15:00+01:00",
"durationMin": 120,
"cityId": "lausanne",
"venueName": "Théâtre de Beaulieu",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 1 en ut majeur op. 21",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 4 en si bémol majeur op. 60",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 5 en ut mineur op. 67",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-1-4-5",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-1-4-5",
"source": "osr"
},
{
"id": "real-zko-19831",
"title": "ZKO on Tour — 100 Jahre Höngger Zeitung",
"series": "ZKO on Tour",
"start": "2026-11-06T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Katholische Kirche Heilig Geist Höngg",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Arcangelo Corelli",
"title": "Concerto grosso F-Dur, op. 6/2"
},
{
"composer": "Pietro Antonio Locatelli",
"title": "Concerto grosso c-Moll, op. 1/11"
},
{
"composer": "Jean-Marie Leclair",
"title": "Konzert für Violine und Streichorchester a-Moll, op. 7/5"
},
{
"composer": "Franz Schubert",
"title": "Rondo für Violine und Streichorchester A-Dur, D 438",
"composerId": "schubert"
},
{
"composer": "Igor Strawinsky",
"title": "Divertimento, aus: Le baiser de la fée, bearbeitet für Violine und Streichorchester von James Ledger"
}
],
"ticketUrl": "https://eventfrog.ch/de/p/klassik-opern/klassik/zko-konzert-100-jahre-hoengger-zeitung-7438620715186662460.html",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19831",
"source": "zko"
},
{
"id": "real-osr-beethoven-1-4-5-20261106",
"title": "Cycle Beethoven 1",
"series": "Cycle Beethoven",
"start": "2026-11-06T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 1 en ut majeur op. 21",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 4 en si bémol majeur op. 60",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 5 en ut mineur op. 67",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-1-4-5",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-1-4-5",
"source": "osr"
},
{
"id": "real-buehnen_bern-lieben-sie-brahms-2026-11-06-1930",
"title": "Lieben Sie Brahms?",
"series": "3. Symphoniekonzert",
"start": "2026-11-06T19:30:00+01:00",
"durationMin": 115,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Konzert für Klavier und Orchester Nr. 1 d-Moll op. 15 (1854–59)",
"composerId": "brahms"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie Nr. 2 D-Dur op. 73 (1877)",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2171&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/lieben-sie-brahms/",
"source": "buehnen_bern"
},
{
"id": "real-stadtcasino_basel-06112026",
"title": "Orchestre Philharmonique de Radio France",
"series": "AMG Symphonic Gems",
"start": "2026-11-06T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre Philharmonique de Radio France"
},
{
"role": "Conductor",
"name": "Jaap van Zweden"
},
{
"role": "Violin",
"name": "Renaud Capuçon"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Konzert für Violine, Violoncello und Orchester a-Moll op. 102",
"composerId": "brahms"
},
{
"composer": "Hector Berlioz",
"title": "Symphonie fantastique op. 14"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=196",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/06112026/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055195",
"title": "Paavo Järvi & Hayato Sumino",
"series": null,
"start": "2026-11-06T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Hayato Sumino"
}
],
"program": [
{
"composer": "Dieter Ammann",
"title": "«Turn» für Orchester"
},
{
"composer": "Sergej Prokofjew",
"title": "Klavierkonzert Nr. 3 C-Dur op. 26"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonie Nr. 4 C-Dur op. 112, 2. Fassung"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhalleorchester.ch%2Fkonzerte%2Fkalender%2F&event=5592&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-hayato-sumino-2055195/",
"source": "tonhalle"
},
{
"id": "real-osr-fam-beethoven-5-20261107",
"title": "Nom de Code: Beethoven 5",
"series": "Série en famille",
"start": "2026-11-07T11:00:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Presenter",
"name": "Thierry Weber"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 5 en ut mineur op. 67",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/fam-beethoven-5",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/fam-beethoven-5",
"source": "osr"
},
{
"id": "real-ocg-80e-concours-de-geneve-20261107-1430",
"title": "80e Concours de Genève – Demi-Finale 1",
"series": "80e Concours de Genève",
"start": "2026-11-07T14:30:00+01:00",
"durationMin": 120,
"cityId": "vernier",
"venueName": "Concorde espace culture",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/section/evenements/prochains_evenements/direction_d_orchestre_2025_2026",
"sourceUrl": "https://locg.ch/fr/calendrier/80e-concours-de-geneve",
"source": "ocg"
},
{
"id": "real-tonhalle-2071037",
"title": "Herbstkonzert «Feurige Klassik»",
"series": null,
"start": "2026-11-07T15:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Prague Royal Philharmonic"
},
{
"role": "Conductor",
"name": "Heiko Mathias Förster"
},
{
"role": "Piano",
"name": "Sergey Tanin"
},
{
"role": "Cello",
"name": "Emilie Richter"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Ouvertüre zu «La forza del destino»",
"composerId": "verdi"
},
{
"composer": "Robert Schumann",
"title": "Klavierkonzert a-Moll op. 54",
"composerId": "schumann"
},
{
"composer": "Daniel-François-Esprit Auber",
"title": "Ouvertüre zu «La muette de Portici»"
},
{
"composer": "Camille Saint-Saëns",
"title": "Cellokonzert Nr. 1 a-Moll op. 33",
"composerId": "saint-saens"
},
{
"composer": "Nikolaj Rimskij-Korsakow",
"title": "«Capriccio espagnol» op. 34"
}
],
"ticketUrl": "https://www.ticketcorner.ch/en/event/tonhalle-zuerich-grosser-saal-tonhalle-zuerich-22148836/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/herbstkonzert-feurige-klassik-2071037/tz/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2071041",
"title": "Herbstkonzert «Feurige Klassik»",
"series": null,
"start": "2026-11-07T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Prague Royal Philharmonic"
},
{
"role": "Conductor",
"name": "Heiko Mathias Förster"
},
{
"role": "Piano",
"name": "Sergey Tanin"
},
{
"role": "Cello",
"name": "Emilie Richter"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Ouvertüre zu «La forza del destino»",
"composerId": "verdi"
},
{
"composer": "Robert Schumann",
"title": "Klavierkonzert a-Moll op. 54",
"composerId": "schumann"
},
{
"composer": "Daniel-François-Esprit Auber",
"title": "Ouvertüre zu «La muette de Portici»"
},
{
"composer": "Camille Saint-Saëns",
"title": "Cellokonzert Nr. 1 a-Moll op. 33",
"composerId": "saint-saens"
},
{
"composer": "Nikolaj Rimskij-Korsakow",
"title": "«Capriccio espagnol» op. 34"
}
],
"ticketUrl": "https://www.ticketcorner.ch/en/event/tonhalle-zuerich-grosser-saal-tonhalle-zuerich-22148865/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/herbstkonzert-feurige-klassik-2071041/tz/",
"source": "tonhalle"
},
{
"id": "real-ocg-80e-concours-de-geneve-20261107-1900",
"title": "80e Concours de Genève – Demi-Finale 1",
"series": "80e Concours de Genève",
"start": "2026-11-07T19:00:00+01:00",
"durationMin": 120,
"cityId": "vernier",
"venueName": "Concorde espace culture",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/section/evenements/prochains_evenements/direction_d_orchestre_2025_2026",
"sourceUrl": "https://locg.ch/fr/calendrier/80e-concours-de-geneve",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-199797",
"title": "Gabetta & Noseda",
"series": "Philharmonische Konzerte",
"start": "2026-11-07T19:00:00+01:00",
"durationMin": 115,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
}
],
"program": [
{
"composer": "Dieter Ammann",
"title": "«Core» für Orchester"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonisches Konzert für Violoncello und Orchester e-Moll op. 125"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonie Nr. 3 c-Moll op. 44"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15407&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/2-philharmonisches-konzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-07112026_kob",
"title": "Kammerorchester Basel mit Pierre-Laurent Aimard – Einfach oder doppelt",
"series": "Musiksaal",
"start": "2026-11-07T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Pierre-Laurent Aimard"
},
{
"role": "Conductor",
"name": "Pierre Bleuse"
},
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
}
],
"program": [
{
"composer": "Beat Furrer",
"title": "Neues Werk für Orchester (UA, Kompositionsauftrag)"
},
{
"composer": "Béla Bartók",
"title": "Musik für Saiteninstrumente, Schlagzeug und Celesta, Sz 106, BB 114, Paul Sacher zugeeignet",
"composerId": "bartok"
},
{
"composer": "Ludwig van Beethoven",
"title": "Konzert für Klavier und Orchester Nr. 5 in Es-Dur, op. 73",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Kammerorchester_Basel/shop/event/115340/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/07112026_kob/",
"source": "stadtcasino_basel"
},
{
"id": "real-sob-12249",
"title": "SunDay Concert",
"series": "AMG SunDay Concerts",
"start": "2026-11-08T11:00:00+01:00",
"durationMin": 60,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Friederike Starkloff"
},
{
"role": "Conductor",
"name": "Friederike Starkloff"
},
{
"role": "Ensemble",
"name": "Musiker*innen des Sinfonieorchesters Basel"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "12 Contretänze für Orchester, WoO 14",
"composerId": "beethoven"
},
{
"composer": "Arnold Schönberg",
"title": "\"Verklärte Nacht\" op. 4 für Streichorchester (revidierte Fassung von 1943)"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Ein musikalischer Spass, KV 522, \"Dorfmusikanten-Sextett\"",
"composerId": "mozart"
}
],
"ticketUrl": "https://konzerte-basel.ch/programm/sunday-concerts",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/sunday-concert/12249",
"source": "sob"
},
{
"id": "real-lso_luzern-19935",
"title": "KAMMERMUSIK-MATINÉE 1",
"series": "Kammermusik",
"start": "2026-11-08T11:15:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Christina Gallati"
},
{
"role": "Viola",
"name": "Katrin Burger"
},
{
"role": "Cello",
"name": "Sabina Diergarten"
},
{
"role": "Double bass",
"name": "Nikola Major"
},
{
"role": "Piano",
"name": "Petra Besa"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Serenade für Violine, Viola und Cello in D-Dur, op. 8",
"composerId": "beethoven"
},
{
"composer": "Franz Schubert",
"title": "Klavierquintett in A-Dur Forellenquintett, D 667",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-1-ghg3nr",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-1-5/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055202",
"title": "Kammermusik-Matinee",
"series": null,
"start": "2026-11-08T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Isabel Neligan"
},
{
"role": "Violin",
"name": "Noémie Rufer Zumstein"
},
{
"role": "Viola",
"name": "Sarina Zickgraf"
},
{
"role": "Cello",
"name": "Gabriele Ardizzone"
},
{
"role": "Piano",
"name": "Sebastian Tortosa"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Streichtrio c-Moll op. 9 Nr. 3",
"composerId": "beethoven"
},
{
"composer": "Bedřich Smetana",
"title": "Andantino-Presto g-Moll aus «Aus der Heimat» (Bearb. für zwei Violinen und Klavier)"
},
{
"composer": "Gabriel Fauré",
"title": "Klavierquintett Nr. 2 op. 115"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhalleorchester.ch%2Fkonzerte%2Fkalender%2F&event=5617&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-matinee-2055202/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199809",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2026-11-08T13:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Marie Maidowski"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Salvador Villanueva"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Valeriy Murga"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Anthony León"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15172&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-081126_philharmonie_d_solisten_1600",
"title": "Vivaldi - Die vier Jahreszeiten – Philharmonie der Solisten",
"series": "Hans Huber-Saal",
"start": "2026-11-08T16:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie der Solisten"
},
{
"role": "Violin",
"name": "Vladik Otaryan"
},
{
"role": "Conductor",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Die vier Jahreszeiten",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "La Primavera - Der Frühling",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L‘estade - Der Sommer",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L‘autunno - Der Herbst",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L’inverno - Der Winter",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/vivaldi-die-vierjahreszeiten-philharmonie-der-solisten/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/081126_philharmonie_d_solisten_1600/",
"source": "stadtcasino_basel"
},
{
"id": "real-geneva_victoria_hall-62051145-20261108",
"title": "Emmanuel Pahud; Éric Le Sage",
"series": "Les Grands Interprètes",
"start": "2026-11-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Emmanuel Pahud"
},
{
"role": "Piano",
"name": "Éric Le Sage"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate pour violon et piano en si bémol majeur, KV 378 (317d)",
"composerId": "mozart"
},
{
"composer": "Clara Schumann",
"title": "Trois Romances pour violon et piano, op. 22",
"composerId": "schumann"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate pour violon et piano en sol majeur, KV 379 (373a)",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate pour violon et piano en mi mineur, KV 304 (300c)",
"composerId": "mozart"
},
{
"composer": "Robert Schumann",
"title": "Trois Romances pour hautbois et piano, op. 94",
"composerId": "schumann"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate pour violon et piano en ut majeur, KV 296",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/emmanuel-pahud-eric-le-sage2026",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/62051145_emmanuel-pahud-eric-le-sage",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200188",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-08T19:30:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15376&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-081126_philharmonie_d_solisten_2000",
"title": "Vivaldi - Die vier Jahreszeiten – Philharmonie der Solisten",
"series": "Hans Huber-Saal",
"start": "2026-11-08T20:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie der Solisten"
},
{
"role": "Violin",
"name": "Vladik Otaryan"
},
{
"role": "Conductor",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Die vier Jahreszeiten",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "La Primavera - Der Frühling",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L‘estade - Der Sommer",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L‘autunno - Der Herbst",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L’inverno - Der Winter",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/vivaldi-die-vierjahreszeiten-philharmonie-der-solisten/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/081126_philharmonie_d_solisten_2000/",
"source": "stadtcasino_basel"
},
{
"id": "real-ocg-passons-aux-salons-1-20261109",
"title": "Passons aux Salons #1",
"series": "Passons aux Salons",
"start": "2026-11-09T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215267&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-1",
"source": "ocg"
},
{
"id": "real-osr-80-concours-de-geneve-20261109-1430",
"title": "80e Concours de Genève – Demi-finale de Direction d’Orchestre",
"series": null,
"start": "2026-11-09T14:30:00+01:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/80-concours-de-geneve",
"source": "osr"
},
{
"id": "real-osr-80-concours-de-geneve-20261109-1930",
"title": "80e Concours de Genève – Demi-finale de Direction d’Orchestre",
"series": null,
"start": "2026-11-09T19:30:00+01:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/80-concours-de-geneve",
"source": "osr"
},
{
"id": "real-tonhalle-2059168",
"title": "Philharmonie der Solisten / VIVALDI - Die vier Jahreszeiten",
"series": null,
"start": "2026-11-09T20:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie der Solisten"
},
{
"role": "Violin & direction",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "«Le quattro stagioni» (Die vier Jahreszeiten) op. 8",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "La primavera (Der Frühling) RV 269",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L'estate (Der Sommer) RV 315",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L'autunno (Der Herbst) RV 293",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "L'inverno (Der Winter) RV 297",
"composerId": "vivaldi"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Johann Sebastian Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Johannes Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/vivaldi-die-vierjahreszeiten-philharmonie-der-solisten/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/vivaldi-die-vier-jahreszeiten-i-philharmonie-der-solisten-2059168/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200070",
"title": "Liederabend Lise Davidsen",
"series": "Liederabende",
"start": "2026-11-10T19:00:00+01:00",
"durationMin": 105,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Lise Davidsen"
},
{
"role": "Piano",
"name": "James Baillieu"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15433&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/liederabend-lise-davidsen-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-10112026_gfk",
"title": "Quatuor Danel",
"series": "Kammermusik Basel",
"start": "2026-11-10T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Marc Danel"
},
{
"role": "Violin",
"name": "Gilles Millet"
},
{
"role": "Viola",
"name": "Vlad Bogdanas"
},
{
"role": "Cello",
"name": "Yovan Markovitch"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Streichquartett Nr. 1, h-moll, op. 50 (1931)"
},
{
"composer": "Dmitrij Schostakowitsch",
"title": "Streichquartett Nr. 11, f-moll, op. 122 (1966)"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquartett Nr. 14, cis-moll, op. 131 (1826)",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.ticketino.com/de/Event/Kammermusik-Basel-QUATUOR-DANEL/215280",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/10112026_gfk/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-80-concours-de-geneve-2-20261111",
"title": "80e Concours de Genève – Finale de Composition et Finale de Direction d’Orchestre",
"series": null,
"start": "2026-11-11T19:00:00+01:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/80-concours-de-geneve-2",
"source": "osr"
},
{
"id": "real-lso_luzern-19884",
"title": "LIED DER NACHT – MAHLER 7",
"series": "Sinfoniekonzerte",
"start": "2026-11-11T19:30:00+01:00",
"durationMin": 80,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Rustioni"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 7 Lied der Nacht in e-Moll, GMW 47",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/lied-der-nacht-mahler-7-l4jsfk",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/lied-der-nacht-mahler-7/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055210",
"title": "Paavo Järvi mit Mahler",
"series": null,
"start": "2026-11-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 6 a-Moll «Tragische»",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5634&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mahler-2055210/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9207",
"title": "Pintscher & Brahms",
"series": "Abonnementskonzert",
"start": "2026-11-11T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Matthias Pintscher"
},
{
"role": "Piano",
"name": "Conrad Tao"
}
],
"program": [
{
"composer": "Matthias Pintscher",
"title": "«NUR» für Klavier und Kammerorchester"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 e-Moll, op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161588/",
"sourceUrl": "https://www.musikkollegium.ch/programm/pintscher-brahms-26-11-11-9207",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2064418",
"title": "Surprise mit Studierenden der ZHdK",
"series": null,
"start": "2026-11-12T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Voice",
"name": "Suzanna Lukasiewicz"
},
{
"role": "Piano",
"name": "Hanna Maria Meister"
}
],
"program": [
{
"composer": "Alma Mahler-Werfel",
"title": "Lieder",
"composerId": "mahler"
},
{
"composer": "Maria Herz",
"title": "Lieder"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5760&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/surprise-mit-studierenden-der-zhdk-2064418/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19882",
"title": "LIED DER NACHT – MAHLER 7",
"series": "Sinfoniekonzerte",
"start": "2026-11-12T19:30:00+01:00",
"durationMin": 80,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Rustioni"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 7 Lied der Nacht in e-Moll, GMW 47",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/lied-der-nacht-mahler-7-nejdz1",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/lied-der-nacht-mahler-7-2/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055211",
"title": "Paavo Järvi mit Mahler",
"series": null,
"start": "2026-11-12T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 6 a-Moll «Tragische»",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5556&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mahler-2055211/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9208",
"title": "Pintscher & Brahms",
"series": "Abonnementskonzert",
"start": "2026-11-12T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Matthias Pintscher"
},
{
"role": "Piano",
"name": "Conrad Tao"
}
],
"program": [
{
"composer": "Matthias Pintscher",
"title": "«NUR» für Klavier und Kammerorchester"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 e-Moll, op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161590/",
"sourceUrl": "https://www.musikkollegium.ch/programm/pintscher-brahms-26-11-12-9208",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199833",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-11-12T20:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15289&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_grand_theatre-50907746-20261112",
"title": "Lise Davidsen",
"series": null,
"start": "2026-11-12T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Lise Davidsen"
},
{
"role": "Piano",
"name": "James Baillieu"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Lieder sur des poèmes de J. W. von Goethe",
"composerId": "schubert"
}
],
"ticketUrl": "https://www.gtg.ch/saison-26-27/lise-davidsen/",
"sourceUrl": "https://www.gtg.ch/saison-26-27/lise-davidsen/",
"source": "geneva_grand_theatre"
},
{
"id": "real-osi-175645240401618",
"title": "Nelson Görner",
"series": "OSI al LAC",
"start": "2026-11-12T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Nelson Görner"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Piotr Il'ič Čajkovskij",
"title": "Concerto per pianoforte e orchestra n. 1 in si bemolle minore op. 23"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonia n. 2 in re maggiore op. 73",
"composerId": "brahms"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11758",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-11-12-20-00",
"source": "osi"
},
{
"id": "real-osr-80-concours-de-geneve-3-20261113",
"title": "80e Concours de Genève – Finale de Direction d’Orchestre",
"series": null,
"start": "2026-11-13T19:00:00+01:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [],
"ticketUrl": "https://www.concoursgeneve.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/80-concours-de-geneve-3",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199834",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-11-13T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15290&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-1311206_cmb",
"title": "Collegium Musicum Basel – Silvia resoniert nachhallend",
"series": "Musiksaal",
"start": "2026-11-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Silvia Careddu"
},
{
"role": "Conductor",
"name": "Jan Schultsz"
},
{
"role": "Orchestra",
"name": "Collegium Musicum Basel"
}
],
"program": [
{
"composer": "Joseph Haydn",
"title": "Ouvertüre aus «Armida»",
"composerId": "haydn"
},
{
"composer": "François Devienne",
"title": "Konzert für Flöte und Orchester Nr. 7"
},
{
"composer": "André Jolivet",
"title": "Konzert für Flöte und Streichorchester"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 3 F-Dur, op. 90",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/collegium-musicum-basel/collegium-musicum-basel-202627-4124761/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/1311206_cmb/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055215",
"title": "Paavo Järvi mit Mahler",
"series": null,
"start": "2026-11-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 6 a-Moll «Tragische»",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5696&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mahler-2055215/",
"source": "tonhalle"
},
{
"id": "real-zko-19673",
"title": "Wandelkonzert",
"series": null,
"start": "2026-11-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Kunsthaus Zürich Moser Bau",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin & direction",
"name": "Simon Wiener"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Henry Purcell",
"title": "Chaconne, bearbeitet von Benjamin Britten"
},
{
"composer": "Dobrinka Tabakova",
"title": "Organum Light für Streichorchester"
},
{
"composer": "Hermann Suter",
"title": "I. Lento. Sehr ruhig und feierlich – Allegro energico, aus: Streichsextett C-Dur, op. 18"
},
{
"composer": "Luciano Berio",
"title": "Auszüge aus: 34 Duette für zwei Violinen"
},
{
"composer": "Jean Sibelius",
"title": "Duo für Violine und Viola C-Dur",
"composerId": "sibelius"
},
{
"composer": "Edmund Finnis",
"title": "Auszüge aus: Brother für Violine und Viola"
},
{
"composer": "Tomaso Albinoni",
"title": "Sinfonia a quattro F-Dur, T. Mi 13"
},
{
"composer": "Franz Schubert",
"title": "IV. Presto, aus: Streichquartett Nr. 14 d-Moll, Der Tod und das Mädchen, D 810",
"composerId": "schubert"
},
{
"composer": "Peteris Vasks",
"title": "Musica serena für Streichorchester"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1965",
"sourceUrl": "https://zko.ch/events/wandelkonzert-2026-27/",
"source": "zko"
},
{
"id": "real-sob-12056",
"title": "Atriumkonzert – Zuckerfee trifft Tango",
"series": "Kammermusik",
"start": "2026-11-14T15:00:00+01:00",
"durationMin": 60,
"cityId": "basel",
"venueName": "Probezentrum Picassoplatz",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Cellist*innen des SOB"
}
],
"program": [
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Nussknacker-Suite"
},
{
"composer": "Astor Piazzolla",
"title": "\"Invierno Porteno\" aus \"Quatro Estaciones Portenas\""
}
],
"ticketUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/atriumkonzert/12056",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/atriumkonzert/12056",
"source": "sob"
},
{
"id": "real-sob-12057",
"title": "Relaxed Performance – Zuckerfee trifft Tango",
"series": "Kammermusik",
"start": "2026-11-14T17:30:00+01:00",
"durationMin": 60,
"cityId": "basel",
"venueName": "Probezentrum Picassoplatz",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Cellist*innen des SOB"
}
],
"program": [
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Nussknacker-Suite"
},
{
"composer": "Astor Piazzolla",
"title": "\"Invierno Porteno\" aus \"Quatro Estaciones Portenas\""
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229739919615&productId=10229739919485&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/relaxed-performance/12057",
"source": "sob"
},
{
"id": "real-opernhaus_zurich-199835",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2026-11-14T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15291&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9470",
"title": "Mendelssohn Elias",
"series": "Chorkonzert in der Tonhalle Zürich",
"start": "2026-11-14T19:30:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Choir",
"name": "Der Gemischte Chor Zürich"
},
{
"role": "Conductor",
"name": "Joachim Krause"
},
{
"role": "Soprano",
"name": "Susanne Bernhard"
},
{
"role": "Mezzo-soprano",
"name": "Carmen Seibel"
},
{
"role": "Tenor",
"name": "Emanuel Heitz"
},
{
"role": "Bass",
"name": "Markus Eiche"
},
{
"role": "Soprano",
"name": "Friederika Dvir"
},
{
"role": "Mezzo-soprano",
"name": "Joyce Bastos"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "«Elias» Oratorium, op. 70",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.gemischter-chor.ch/mendelssohn-elias/",
"sourceUrl": "https://www.musikkollegium.ch/programm/mendelssohn-elias-26-11-14-9470",
"source": "musikkollegium"
},
{
"id": "real-geneva_victoria_hall-91035054-20261114",
"title": "Orchestre symphonique genevois – Concert de l’automne",
"series": null,
"start": "2026-11-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Lan Anh Nguyen"
},
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Orchestra",
"name": "Orchestre symphonique genevois"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "Concerto pour piano en la mineur, op. 16",
"composerId": "grieg"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie n° 1 en do mineur, op. 68",
"composerId": "brahms"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/91035054_orchestre-symphonique-genevois-9633139",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-199810",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2026-11-15T13:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Marie Maidowski"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Salvador Villanueva"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Valeriy Murga"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Johan Krogius"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15173&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9428",
"title": "Dichterlos - Liederabend mit Mikhail Timoshenko",
"series": "Extrakonzert",
"start": "2026-11-15T17:00:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Baritone",
"name": "Mikhail Timoshenko"
},
{
"role": "Piano",
"name": "Elitsa Desseva"
}
],
"program": [
{
"workId": "schumann-dichterliebe",
"composerId": "schumann"
},
{
"composer": "Othmar Schoeck",
"title": "«Elegie» op.36, Liederzyklus nach Gedichten von Nikolaus Lenau und Joseph von Eichendorff"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163528/",
"sourceUrl": "https://www.musikkollegium.ch/programm/dichterlos-liederabend-mit-mikhail-timoshenko-26-11-15-9428",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055220",
"title": "Kosmos Kammermusik: Zemlinsky Quartett & Lisa Larsson",
"series": "Kosmos Kammermusik",
"start": "2026-11-15T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Zemlinsky Quartet"
},
{
"role": "Violin",
"name": "František Souček"
},
{
"role": "Violin",
"name": "Petr Střížek"
},
{
"role": "Viola",
"name": "Petr Holman"
},
{
"role": "Cello",
"name": "Vladimír Fortin"
},
{
"role": "Soprano",
"name": "Lisa Larsson"
}
],
"program": [
{
"composer": "Clara Schumann",
"title": "«Hommage an Clara» (Arr. Rolf Martinsson, Konzept Lisa Larsson)",
"composerId": "schumann"
},
{
"composer": "Alexander von Zemlinsky",
"title": "«Walzer-Gesänge nach toskanischen Volksliedern» op. 6 (Arr. Rolf Martinsson)"
},
{
"composer": "Robert Schumann",
"title": "Streichquartett a-Moll op. 41 Nr. 1",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5611&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-zemlinsky-quartett-lisa-larsson-2055220/",
"source": "tonhalle"
},
{
"id": "real-opera_lausanne-le-tour-decrou-20261115-1700",
"title": "Le Tour d'écrou",
"series": null,
"start": "2026-11-15T17:00:00+01:00",
"durationMin": 110,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Briger"
},
{
"role": "Stage director",
"name": "Richard Brunel"
},
{
"role": "Le Prologue",
"name": "Rhydian Jenkins"
},
{
"role": "Peter Quint",
"name": "Anthony Gregory"
},
{
"role": "La Gouvernante",
"name": "Keri Fuge"
},
{
"role": "Mrs. Grose",
"name": "Polly Leech"
},
{
"role": "Miss Jessel",
"name": "Elizabeth Karani"
},
{
"role": "Flora",
"name": "Michèle Bréant"
},
{
"role": "Miles",
"name": "Frédéric Brasseur"
},
{
"role": "Miles",
"name": "Thomas Evrard"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Le Tour d'écrou"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098112",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-tour-decrou/",
"source": "opera_lausanne"
},
{
"id": "real-geneva_victoria_hall-37511392-20261115",
"title": "L’Harmonie Nautique, orchestre d’instruments à vent de la Ville de Genève – Concert d’automne",
"series": null,
"start": "2026-11-15T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Rachel Kolly"
},
{
"role": "Conductor",
"name": "Eric Haegi"
},
{
"role": "Orchestra",
"name": "L’Harmonie Nautique"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "La Gazza Ladra, ouverture",
"composerId": "rossini"
},
{
"composer": "Max Bruch",
"title": "Concerto pour violon n° 2 en sol mineur"
},
{
"composer": "Camille Saint-Saëns",
"title": "Introduction et Rondo capriccioso, pour violon et orchestre",
"composerId": "saint-saens"
},
{
"composer": "George Gershwin",
"title": "An American in Paris"
}
],
"ticketUrl": "https://openagenda.com/victoria-hall-client/events/37511392_lharmonie-nautique-orchestre-dinstruments-a-vent-de-la-ville-de-geneve-1653848",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/37511392_lharmonie-nautique-orchestre-dinstruments-a-vent-de-la-ville-de-geneve-1653848",
"source": "geneva_victoria_hall"
},
{
"id": "real-cnz-148",
"title": "Sonderkonzert an der ZHdK: Laboratorium",
"series": null,
"start": "2026-11-15T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "ZHdK, Konzertsaal 3",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Zoi Tsokanou"
},
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Wenjie Hu",
"title": "Animal Kingdom, für Ensemble (2026, Uraufführung)"
},
{
"composer": "Elias Jurgschat",
"title": "was fließt, für Ensemble (2026, Uraufführung)"
},
{
"composer": "Imke Redecker",
"title": "Zerrissen, für Ensemble (2026, Uraufführung)"
},
{
"composer": "Dominik Vogl",
"title": "the landscape listens – shadows – hold their breath, für Ensemble (2026, Uraufführung)"
}
],
"ticketUrl": "https://www.zhdk.ch/veranstaltung/62957",
"sourceUrl": "https://cnz.ch/sonderkonzert-zhdk",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-200189",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-15T19:30:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15377&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9218",
"title": "Tänze aus Galánta",
"series": "Lunch-Konzert",
"start": "2026-11-16T12:15:00+01:00",
"durationMin": 45,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Nils Erik Måseidvåg"
},
{
"role": "Host",
"name": "Nils Erik Måseidvåg"
}
],
"program": [
{
"composer": "Othmar Schoeck",
"title": "«Sommernacht» für Streichorchester, op. 58"
},
{
"composer": "Franz Schreker",
"title": "Intermezzo für Streichorchester, op. 8"
},
{
"composer": "Zoltán Kodály",
"title": "Tänze aus Galánta"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/taenze-aus-galanta-26-11-16-9218",
"sourceUrl": "https://www.musikkollegium.ch/programm/taenze-aus-galanta-26-11-16-9218",
"source": "musikkollegium"
},
{
"id": "real-opera_lausanne-le-tour-decrou-20261117-1900",
"title": "Le Tour d'écrou",
"series": null,
"start": "2026-11-17T19:00:00+01:00",
"durationMin": 110,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Briger"
},
{
"role": "Stage director",
"name": "Richard Brunel"
},
{
"role": "Le Prologue",
"name": "Rhydian Jenkins"
},
{
"role": "Peter Quint",
"name": "Anthony Gregory"
},
{
"role": "La Gouvernante",
"name": "Keri Fuge"
},
{
"role": "Mrs. Grose",
"name": "Polly Leech"
},
{
"role": "Miss Jessel",
"name": "Elizabeth Karani"
},
{
"role": "Flora",
"name": "Michèle Bréant"
},
{
"role": "Miles",
"name": "Frédéric Brasseur"
},
{
"role": "Miles",
"name": "Thomas Evrard"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Le Tour d'écrou"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098112",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-tour-decrou/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2056812",
"title": "Jubiläumskonzert Duo Calva",
"series": null,
"start": "2026-11-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "DuoCalva"
},
{
"role": "Cello",
"name": "Alain Schudel"
},
{
"role": "Cello",
"name": "Daniel Schaerer"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5702&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jubilaeumskonzert-duo-calva-2056812/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200190",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-18T19:00:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15378&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055230",
"title": "Paavo Järvi & Lisa Larsson",
"series": null,
"start": "2026-11-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Lisa Larsson"
}
],
"program": [
{
"composer": "David Philip Hefti",
"title": "«Shifting Ground. Atmosphären für grosses Orchester» (Uraufführung)"
},
{
"composer": "Wilhelm Stenhammar",
"title": "Vier Lieder aus «Idyll und Epigramm» für Sopran und Orchester"
},
{
"composer": "Edvard Grieg",
"title": "Lieder mit Orchester («Fra Monte Pincio», «En Svane», «Jeg elsker dig»)",
"composerId": "grieg"
},
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 5 cis-Moll",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5572&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-lisa-larsson-2055230/",
"source": "tonhalle"
},
{
"id": "real-sob-12237",
"title": "Schicksal",
"series": "Sinfoniekonzert",
"start": "2026-11-18T19:30:00+01:00",
"durationMin": 110,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Truls Mørk"
},
{
"role": "Conductor",
"name": "Robert Trevino"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Dmitri Schostakowitsch",
"title": "Cellokonzert Nr. 1 Es-Dur, op. 107"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Sinfonie Nr. 4 f-Moll, op. 36"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078763&productId=10229721147335&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/schicksal/12237",
"source": "sob"
},
{
"id": "real-cnz-138",
"title": "Aschenstille",
"series": null,
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Brunnenhof, Studio 1",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Steamboat Switzerland"
},
{
"role": "Hammond organ",
"name": "Dominik Blum"
},
{
"role": "Electric bass",
"name": "Marino Pliakas"
},
{
"role": "Percussion",
"name": "Lucas Niggli"
},
{
"role": "Conductor",
"name": "Titus Engel"
},
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Zara Ali",
"title": "Isolation Forest (2023)"
},
{
"composer": "Michael Wertmüller",
"title": "The Exaggeration, für Ensemble und Trio (2026, Uraufführung)"
},
{
"composer": "Anselm McDonnell",
"title": "Retrogressive Thaw Slump, für Ensemble (2026, Uraufführung)"
},
{
"composer": "Steamboat Switzerland",
"title": "Live-Set"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/178951/",
"sourceUrl": "https://cnz.ch/aschenstille",
"source": "cnz"
},
{
"id": "real-zko-19728",
"title": "Feder und Bogen 1: Erich Kästner",
"series": null,
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Narrator",
"name": "Thomas Douglas"
},
{
"role": "Ensemble",
"name": "Musikerinnen und Musiker des Zürcher Kammerorchesters"
}
],
"program": [],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1972",
"sourceUrl": "https://zko.ch/events/feder-und-bogen-1-erich-kaestner/",
"source": "zko"
},
{
"id": "real-osr-motet-100e-20261119",
"title": "Le Motet de Genève",
"series": null,
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Romain Mayor"
},
{
"role": "Nabucco",
"name": "Nikoloz Lagvilava"
},
{
"role": "Abigaille",
"name": "María José Siri"
},
{
"role": "Ismaele",
"name": "Sahy Ratia"
},
{
"role": "Zaccaria",
"name": "Rubén Amoretti"
},
{
"role": "Fenena",
"name": "Carine Séchaye"
},
{
"role": "Il Grand Sacerdote",
"name": "Joe Bertili"
},
{
"role": "Abdallo",
"name": "Oscar Esmerode"
},
{
"role": "Anna",
"name": "Clémence Tilquin"
},
{
"role": "Choir",
"name": "Le Motet de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Nabucco, opéra en quatre parties en version concert",
"composerId": "verdi"
}
],
"ticketUrl": "https://www.motet.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/motet-100e",
"source": "osr"
},
{
"id": "real-musikkollegium-9224",
"title": "Moët Liechti",
"series": "Klassik & Poetry Slam",
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Droujelub Yanakiew"
},
{
"role": "Violin",
"name": "Droujelub Yanakiew"
},
{
"role": "Poetry Slam",
"name": "Moët Liechti"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/169972/",
"sourceUrl": "https://www.musikkollegium.ch/programm/moet-liechti-26-11-19-9224",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055226",
"title": "Paavo Järvi & Lisa Larsson",
"series": null,
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Lisa Larsson"
}
],
"program": [
{
"composer": "David Philip Hefti",
"title": "«Shifting Ground. Atmosphären für grosses Orchester» (Uraufführung)"
},
{
"composer": "Wilhelm Stenhammar",
"title": "Vier Lieder aus «Idyll und Epigramm» für Sopran und Orchester"
},
{
"composer": "Edvard Grieg",
"title": "Lieder mit Orchester («Fra Monte Pincio», «En Svane», «Jeg elsker dig»)",
"composerId": "grieg"
},
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 5 cis-Moll",
"composerId": "mahler"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5550&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-lisa-larsson-2055226/",
"source": "tonhalle"
},
{
"id": "real-buehnen_bern-roma-2026-11-19-1930",
"title": "Roma!",
"series": "4. Symphoniekonzert",
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 110,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Violin",
"name": "Sergey Khachatryan"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Rhiannon Giddens / Michael Abels",
"title": "Ouvertüre zur Oper Omar (2022)"
},
{
"composer": "Jean Sibelius",
"title": "Konzert für Violine und Orchester d-Moll op. 47 (1903 / 04, rev. 1905)",
"composerId": "sibelius"
},
{
"composer": "Ottorino Respighi",
"title": "Fontane di Roma (1916)"
},
{
"composer": "Ottorino Respighi",
"title": "Pini di Roma (1924)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2023&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/roma/",
"source": "buehnen_bern"
},
{
"id": "real-sob-12236",
"title": "Schicksal",
"series": "Sinfoniekonzert",
"start": "2026-11-19T19:30:00+01:00",
"durationMin": 110,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Truls Mørk"
},
{
"role": "Conductor",
"name": "Robert Trevino"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Dmitri Schostakowitsch",
"title": "Cellokonzert Nr. 1 Es-Dur, op. 107"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Sinfonie Nr. 4 f-Moll, op. 36"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078764&productId=10229721147335&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/schicksal/12236",
"source": "sob"
},
{
"id": "real-osi-175649265299426",
"title": "Avi Avital",
"series": "OSI al DOCKS",
"start": "2026-11-19T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Avi Avital"
},
{
"role": "Mandolin",
"name": "Avi Avital"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Béla Bartók",
"title": "Romanian Folk Dances",
"composerId": "bartok"
},
{
"composer": "Johann Nepomuk Hummel",
"title": "Concerto per mandolino in sol maggiore"
},
{
"composer": "Omer Avital",
"title": "Lonely Girl per archi e mandolino"
},
{
"composer": "Anna Clyne",
"title": "Three Sisters concerto per mandolino"
},
{
"composer": "Manuel De Falla",
"title": "Danse Espagnole da La Vida Breve"
},
{
"composer": "Gil Aldema",
"title": "In Chassidic Mood estratti"
},
{
"composer": "Avi Avital",
"title": "Avi's Song per mandolino e archi"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11839",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-11-19-20-00",
"source": "osi"
},
{
"id": "real-musikkollegium-9437",
"title": "Beethoven & Goetz",
"series": "Musik über Mittag",
"start": "2026-11-20T12:15:00+01:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Anzhela Golubyeva Staub"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Cello",
"name": "Franz Ortner"
},
{
"role": "Double bass",
"name": "Josef Gilgenreiner"
},
{
"role": "Piano",
"name": "Martin Lucas Staub"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klavierquartett Es-Dur, WoO 36/1",
"composerId": "beethoven"
},
{
"composer": "Hermann Goetz",
"title": "Klavierquintett c-Moll, op. 16"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/175561/",
"sourceUrl": "https://www.musikkollegium.ch/programm/beethoven-goetz-26-11-20-9437",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199863",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-11-20T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15233&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-nabucco-express-20261120",
"title": "À bord du Nabucco Express",
"series": "Série en famille+",
"start": "2026-11-20T19:00:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Romain Mayor"
},
{
"role": "Soprano",
"name": "Maria José Siri"
},
{
"role": "Choir",
"name": "Le Motet de Genève"
},
{
"role": "Presenter",
"name": "Geoffroy Perruchoud"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Extraits de l’opéra Nabucco",
"composerId": "verdi"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/nabucco-express",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/nabucco-express",
"source": "osr"
},
{
"id": "real-lso_luzern-19085",
"title": "CSS Benefizkonzert mit Alice Sara Ott",
"series": "Sinfoniekonzerte",
"start": "2026-11-20T19:30:00+01:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
},
{
"role": "Conductor",
"name": "Martin Rajna"
},
{
"role": "Piano",
"name": "Alice Sara Ott"
}
],
"program": [
{
"composer": "Carl Maria von Weber",
"title": "Ouvertüre «Der Freischütz»"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klavierkonzert Nr. 4 G-Dur, op. 58",
"composerId": "beethoven"
},
{
"composer": "Antonín Dvořák",
"title": "Sinfonie Nr. 8 in G-Dur, op. 88",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/css-benefizkonzert-hlsin6",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/css-benefizkonzert/",
"source": "lso_luzern"
},
{
"id": "real-lucerne_festival-2436",
"title": "Jörg Widmann | Antoine Tamestit | Sir András Schiff",
"series": "Lucerne Festival Forward 2026 · Schumannliebe 1",
"start": "2026-11-20T19:30:00+01:00",
"durationMin": 120,
"cityId": null,
"venueName": "Kammermusiksaal KKV, Vitznau",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Clarinet",
"name": "Jörg Widmann"
},
{
"role": "Viola",
"name": "Antoine Tamestit"
},
{
"role": "Piano",
"name": "Sir András Schiff"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Märchenerzählungen op. 132. Vier Stücke für Klarinette, Viola und Klavier",
"composerId": "schumann"
},
{
"composer": "Robert Schumann",
"title": "Variationen über ein eigenes Thema Es-Dur WoO 24 Geistervariationen",
"composerId": "schumann"
},
{
"composer": "György Kurtág",
"title": "Hommage à R. Sch. für Klarinette, Viola und Klavier op. 15d"
},
{
"composer": "Robert Schumann",
"title": "Märchenbilder op. 113. Vier Stücke für Viola und Klavier",
"composerId": "schumann"
},
{
"composer": "Jörg Widmann",
"title": "Es war einmal … Fünf Stücke im Märchenton für Klarinette, Viola und Klavier"
}
],
"ticketUrl": "https://shop.lucernefestival.ch/selection/event/date?productId=10229850658486&lang=de",
"sourceUrl": "https://www.lucernefestival.ch/de/programm/jorg-widmann-antoine-tamestit-sir-andras-schiff/2436",
"source": "lucerne_festival"
},
{
"id": "real-tonhalle-2056366",
"title": "Messa da Requiem",
"series": null,
"start": "2026-11-20T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Oratorienchor Zürich"
},
{
"role": "Choir",
"name": "Vokalensemble Ars Canora"
},
{
"role": "Orchestra",
"name": "Camerata Cantabile"
},
{
"role": "Conductor",
"name": "Stephan Fuchs"
},
{
"role": "Soprano",
"name": "Marysol Schalit"
},
{
"role": "Mezzo-soprano",
"name": "Claude Eichenberger"
},
{
"role": "Tenor",
"name": "Remy Burnens"
},
{
"role": "Bass",
"name": "Seth Carico"
}
],
"program": [
{
"workId": "verdi-requiem",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5708&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/messa-da-requiem-2056366/tz/",
"source": "tonhalle"
},
{
"id": "real-buehnen_bern-roma-2026-11-20-1930",
"title": "Roma!",
"series": "4. Symphoniekonzert",
"start": "2026-11-20T19:30:00+01:00",
"durationMin": 110,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Violin",
"name": "Sergey Khachatryan"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Rhiannon Giddens / Michael Abels",
"title": "Ouvertüre zur Oper Omar (2022)"
},
{
"composer": "Jean Sibelius",
"title": "Konzert für Violine und Orchester d-Moll op. 47 (1903 / 04, rev. 1905)",
"composerId": "sibelius"
},
{
"composer": "Ottorino Respighi",
"title": "Fontane di Roma (1916)"
},
{
"composer": "Ottorino Respighi",
"title": "Pini di Roma (1924)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2188&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/roma/",
"source": "buehnen_bern"
},
{
"id": "real-opera_lausanne-le-tour-decrou-20261120-2000",
"title": "Le Tour d'écrou",
"series": null,
"start": "2026-11-20T20:00:00+01:00",
"durationMin": 110,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Briger"
},
{
"role": "Stage director",
"name": "Richard Brunel"
},
{
"role": "Le Prologue",
"name": "Rhydian Jenkins"
},
{
"role": "Peter Quint",
"name": "Anthony Gregory"
},
{
"role": "La Gouvernante",
"name": "Keri Fuge"
},
{
"role": "Mrs. Grose",
"name": "Polly Leech"
},
{
"role": "Miss Jessel",
"name": "Elizabeth Karani"
},
{
"role": "Flora",
"name": "Michèle Bréant"
},
{
"role": "Miles",
"name": "Frédéric Brasseur"
},
{
"role": "Miles",
"name": "Thomas Evrard"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Le Tour d'écrou"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098112",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-tour-decrou/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-199812",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2026-11-21T11:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Thalia Cook-Hansen"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Tautvydas Slizauskas"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Valeriy Murga"
},
{
"role": "Herzkönigin",
"name": "Marcela Rahal"
},
{
"role": "Der verrückte Hutmacher",
"name": "Anthony León"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15175&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20134",
"title": "KONZERT FÜR FAMILIEN «TRANQUILLA TRAMPELTREU»",
"series": null,
"start": "2026-11-21T11:00:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Actor",
"name": "Vicky Papailiou"
},
{
"role": "Horn",
"name": "Florian Abächerli"
},
{
"role": "Flute",
"name": "Ronja Macholdt"
},
{
"role": "Oboe",
"name": "Andrea Bischoff"
},
{
"role": "Clarinet",
"name": "Vincent Hering"
},
{
"role": "Bassoon",
"name": "Barış Önel"
},
{
"role": "Director",
"name": "Dominique Regli-Lohri"
}
],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/konzert-fur-familien-tranquilla-trampeltreu-sb526j",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/konzert-fuer-familien-tranquilla-trampeltreu-2/",
"source": "lso_luzern"
},
{
"id": "real-lso_luzern-20427",
"title": "KONZERT FÜR FAMILIEN «TRANQUILLA TRAMPELTREU»",
"series": null,
"start": "2026-11-21T15:00:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Actor",
"name": "Vicky Papailiou"
},
{
"role": "Horn",
"name": "Florian Abächerli"
},
{
"role": "Flute",
"name": "Ronja Macholdt"
},
{
"role": "Clarinet",
"name": "Vincent Hering"
},
{
"role": "Oboe",
"name": "Andrea Bischoff"
},
{
"role": "Bassoon",
"name": "Barış Önel"
},
{
"role": "Director",
"name": "Dominique Regli-Lohri"
}
],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/konzert-fur-familien-tranquilla-trampeltreu-kopi-b96z10?useEmbed=tru",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/konzert-fuer-familien-tranquilla-trampeltreu-3/",
"source": "lso_luzern"
},
{
"id": "real-lucerne_festival-2433",
"title": "Ensemble des Lucerne Festival Contemporary Orchestra (LFCO) | Jörg Widmann | Christian Jost | Fatma Said | Matthias Goerne",
"series": "Lucerne Festival Forward 2026 · Schumannliebe 2",
"start": "2026-11-21T17:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Ensemble des Lucerne Festival Contemporary Orchestra (LFCO)"
},
{
"role": "Conductor",
"name": "Christian Jost"
},
{
"role": "Conductor",
"name": "Jörg Widmann"
},
{
"role": "Soprano",
"name": "Fatma Said"
},
{
"role": "Baritone",
"name": "Matthias Goerne"
}
],
"program": [
{
"composer": "Christian Jost",
"title": "Dichterliebe für Sopran und Ensemble, nach Robert Schumanns Dichterliebe op. 48"
},
{
"composer": "Jörg Widmann",
"title": "Schumannliebe für Bariton und Ensemble. Instrumentation von Robert Schumanns Dichterliebe op. 48"
}
],
"ticketUrl": "https://shop.lucernefestival.ch/selection/event/date?productId=10229850658487&lang=de",
"sourceUrl": "https://www.lucernefestival.ch/de/programm/ensemble-des-lucerne-festival-contemporary-orchestra-lfco-jorg-widmann-christian-jost-fatma-said-matthias-goerne/2433",
"source": "lucerne_festival"
},
{
"id": "real-opernhaus_zurich-200191",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-21T19:00:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15379&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-82147454-20261121",
"title": "Gewandhausorchester Leipzig",
"series": "Migros-Pour-cent-culturel Classics",
"start": "2026-11-21T19:30:00+01:00",
"durationMin": 90,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Andris Nelsons"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
},
{
"role": "Orchestra",
"name": "Gewandhausorchester Leipzig"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Concerto pour violoncelle en si mineur, op. 104",
"composerId": "dvorak"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie nº 1 en ut mineur, op. 68",
"composerId": "brahms"
}
],
"ticketUrl": "https://migros.infomaniak.events/fr-ch/shop/migros-pour-cent-culturel-classic-2026-2027-EBGNGEVB9H",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/82147454_5415858",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2056369",
"title": "Promenade ins Schicksal",
"series": null,
"start": "2026-11-21T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Akademisches Orchester Zürich"
},
{
"role": "Conductor",
"name": "Lukas Meister"
}
],
"program": [
{
"composer": "Pjotr I. Tschaikowsky",
"title": "Sinfonie Nr. 4 f-Moll op. 36"
},
{
"composer": "Modest Mussorgsky",
"title": "«Bilder einer Ausstellung» (Orchesterfassung Maurice Ravel)"
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/promenade-ins-schicksal-2056369/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/promenade-ins-schicksal-2056369/tz/",
"source": "tonhalle"
},
{
"id": "real-lucerne_festival-2437",
"title": "Johanna Summer",
"series": "Lucerne Festival Forward 2026 · Schumannliebe 3",
"start": "2026-11-21T21:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Johanna Summer"
}
],
"program": [],
"ticketUrl": "https://shop.lucernefestival.ch/selection/event/date?productId=10229857775955&lang=de",
"sourceUrl": "https://www.lucernefestival.ch/de/programm/johanna-summer/2437",
"source": "lucerne_festival"
},
{
"id": "real-opera_lausanne-le-tour-decrou-20261122-1500",
"title": "Le Tour d'écrou",
"series": null,
"start": "2026-11-22T15:00:00+01:00",
"durationMin": 110,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Briger"
},
{
"role": "Stage director",
"name": "Richard Brunel"
},
{
"role": "Le Prologue",
"name": "Rhydian Jenkins"
},
{
"role": "Peter Quint",
"name": "Anthony Gregory"
},
{
"role": "La Gouvernante",
"name": "Keri Fuge"
},
{
"role": "Mrs. Grose",
"name": "Polly Leech"
},
{
"role": "Miss Jessel",
"name": "Elizabeth Karani"
},
{
"role": "Flora",
"name": "Michèle Bréant"
},
{
"role": "Miles",
"name": "Frédéric Brasseur"
},
{
"role": "Miles",
"name": "Thomas Evrard"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Le Tour d'écrou"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098112",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-tour-decrou/",
"source": "opera_lausanne"
},
{
"id": "real-lucerne_festival-2438",
"title": "Jörg Widmann | Solist*innen des Lucerne Festival Contemporary Orchestra (LFCO)",
"series": "Lucerne Festival Forward 2026 · Schumannliebe 4",
"start": "2026-11-22T16:30:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Speaker",
"name": "Jörg Widmann"
},
{
"role": "Ensemble",
"name": "Solist*innen des Lucerne Festival Contemporary Orchestra (LFCO)"
},
{
"role": "Violin",
"name": "Aris Streisfeld"
},
{
"role": "Violin",
"name": "Szuhwa Wu"
},
{
"role": "Viola",
"name": "SoHui Yun"
},
{
"role": "Cello",
"name": "Adya Khanna Fontenla"
},
{
"role": "Clarinet",
"name": "Gustavo A. Domínguez Ojalvo"
},
{
"role": "Piano",
"name": "Oliver Triendl"
}
],
"program": [
{
"composer": "Jörg Widmann",
"title": "Fieberphantasie für Klavier, Streichquartett und Klarinette"
}
],
"ticketUrl": "https://shop.lucernefestival.ch/selection/event/date?productId=10229857775956&lang=de",
"sourceUrl": "https://www.lucernefestival.ch/de/programm/jorg-widmann-solistinnen-des-lucerne-festival-contemporary-orchestra-lfco/2438",
"source": "lucerne_festival"
},
{
"id": "real-geneva_victoria_hall-41597957-20261122",
"title": "La Truite de Schubert",
"series": "Concert du dimanche",
"start": "2026-11-22T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Charlotte Bozzi"
},
{
"role": "Piano",
"name": "Jean-Paul Pruna"
},
{
"role": "Violin",
"name": "Pierre Fouchenneret"
},
{
"role": "Viola",
"name": "Marie-Barbara Berlaud"
},
{
"role": "Cello",
"name": "Thomas Ravez"
},
{
"role": "Double bass",
"name": "Yann Dubost"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Die Forelle, op. 32 D 550",
"composerId": "schubert"
},
{
"composer": "Franz Schubert",
"title": "Quintette en la majeur, D 667 « La Truite »",
"composerId": "schubert"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489258",
"sourceUrl": "https://openagenda.com/victoria-hall/events/41597957_la-truite-de-schubert",
"source": "geneva_victoria_hall"
},
{
"id": "real-stadtcasino_basel-philharmonische-orchester-basel",
"title": "Philharmonisches Orchester Basel – VIRTUOSO",
"series": "Musiksaal",
"start": "2026-11-22T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Dmitry Smirnov"
},
{
"role": "Conductor",
"name": "Leonardo Muzii"
},
{
"role": "Orchestra",
"name": "Philharmonisches Orchester Basel"
}
],
"program": [
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Violinkonzert D-Dur, Op. 35"
},
{
"composer": "Antonin Dvorak",
"title": "Sinfonie Nr. 7, d-moll, Op. 70",
"composerId": "dvorak"
}
],
"ticketUrl": "https://eventfrog.ch/de/p/klassik-opern/klassik/sinfoniekonzert-sonntag-22-november-2026-7495030856190279763.html",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/philharmonische-orchester-basel/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2056699",
"title": "Rezital Alexandra Dovgan",
"series": null,
"start": "2026-11-22T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Alexandra Dovgan"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Toccata e-Moll BWV 914",
"composerId": "bach"
},
{
"composer": "Franz Schubert",
"title": "Klaviersonate c-Moll D 958",
"composerId": "schubert"
},
{
"composer": "Frédéric Chopin",
"title": "Barcarolle Fis-Dur op. 60",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Klaviersonate Nr. 3 h-Moll op. 58",
"composerId": "chopin"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5648&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/rezital-alexandra-dovgan-2056699/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199948",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-11-22T18:00:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15272&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lucerne_festival-2439",
"title": "Lucerne Festival Contemporary Orchestra (LFCO) | SWR Vokalensemble | Heinz Holliger",
"series": "Lucerne Festival Forward 2026 · Schumannliebe 5",
"start": "2026-11-22T18:30:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Lucerne Festival Contemporary Orchestra (LFCO)"
},
{
"role": "Choir",
"name": "SWR Vokalensemble"
},
{
"role": "Conductor",
"name": "Heinz Holliger"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Nachtlied für Chor und Orchester op. 108",
"composerId": "schumann"
},
{
"composer": "Aribert Reimann",
"title": "Sieben Fragmente für Orchester in memoriam Robert Schumann"
},
{
"composer": "György Kurtág / Heinz Holliger",
"title": "Drei kleine Stücke für grosses Orchester. Orchestertranskriptionen der Stücke … für Heinz …, In memoriam Anna Holliger und Anna Holliger in memoriam"
},
{
"composer": "Heinz Holliger",
"title": "Gesänge der Frühe nach Schumann und Hölderlin für Chor, Orchester und Tonband"
}
],
"ticketUrl": "https://shop.lucernefestival.ch/selection/event/date?productId=10229850658488&lang=de",
"sourceUrl": "https://www.lucernefestival.ch/de/programm/lucerne-festival-contemporary-orchestra-lfco-swr-vokalensemble-heinz-holliger/2439",
"source": "lucerne_festival"
},
{
"id": "real-ocg-2-passons-aux-salons-20261123",
"title": "Passons aux Salons #2",
"series": "Passons aux Salons",
"start": "2026-11-23T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215268&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/2-passons-aux-salons",
"source": "ocg"
},
{
"id": "real-tonhalle-2056702",
"title": "Gewandhausorchester – Meister der Romantik",
"series": null,
"start": "2026-11-23T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Gewandhausorchester Leipzig"
},
{
"role": "Conductor",
"name": "Andris Nelsons"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Cellokonzert h-Moll op. 104",
"composerId": "dvorak"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 1 c-Moll op. 68",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5646&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/gewandhausorchester-meister-der-romantik-2056702/tz/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9399",
"title": "Eroica",
"series": "Hauskonzert",
"start": "2026-11-24T19:00:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "argovia philharmonic"
},
{
"role": "Conductor",
"name": "Josep Vicent"
},
{
"role": "Voice",
"name": "Ginesa Ortega"
},
{
"role": "Dancer",
"name": "David Romero"
}
],
"program": [
{
"composer": "Manuel de Falla",
"title": "«El amor brujo» Gitanería"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 3 Es-Dur, op. 55 «Eroica»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/172568/",
"sourceUrl": "https://www.musikkollegium.ch/programm/eroica-26-11-24-9399",
"source": "musikkollegium"
},
{
"id": "real-zko-19502",
"title": "Bostridge, Bloxham & Goldscheider",
"series": "Abo-Konzerte",
"start": "2026-11-24T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jonathan Bloxham"
},
{
"role": "Tenor",
"name": "Ian Bostridge"
},
{
"role": "Horn",
"name": "Ben Goldscheider"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Henry Purcell",
"title": "Abdelazer, or The Moor’s Revenge. Suite, Z 570"
},
{
"composer": "Anna Clyne",
"title": "Sirens für Horn und Streichorchester (Schweizer Erstaufführung)"
},
{
"composer": "Henry Purcell",
"title": "Suite aus Dido and Aeneas, Z 626 / Z 730"
},
{
"composer": "Benjamin Britten",
"title": "Serenade für Tenor, Horn und Streichorchester, op. 31"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1949",
"sourceUrl": "https://zko.ch/events/bostridge-bloxham-goldscheider/",
"source": "zko"
},
{
"id": "real-osr-beethoven-2-3-20261125",
"title": "Cycle Beethoven 2",
"series": "Cycle Beethoven",
"start": "2026-11-25T19:30:00+01:00",
"durationMin": 115,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 2 en ré majeur op. 36",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 3 en mi bémol majeur op. 55, 'Héroïque'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"source": "osr"
},
{
"id": "real-opera_lausanne-agrippina-20261125-2000",
"title": "Agrippina",
"series": "Opéra en version concert",
"start": "2026-11-25T20:00:00+01:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thibault Noally"
},
{
"role": "Violin",
"name": "Thibault Noally"
},
{
"role": "Agrippina",
"name": "Magdalena Kožená"
},
{
"role": "Poppea",
"name": "Julia Lezhneva"
},
{
"role": "Ottone",
"name": "Christophe Dumaux"
},
{
"role": "Nerone",
"name": "Adèle Charvet"
},
{
"role": "Claudio",
"name": "Nicolas Brooymans"
},
{
"role": "Pallante",
"name": "Adrien Fournaison"
},
{
"role": "Narciso",
"name": "Paul Figuier"
},
{
"role": "Lesbo",
"name": "Matthieu Walendzik"
},
{
"role": "Ensemble",
"name": "Les Accents"
}
],
"program": [
{
"composer": "Georg Friedrich Hændel",
"title": "Agrippina"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098117",
"sourceUrl": "https://www.opera-lausanne.ch/show/agrippina/",
"source": "opera_lausanne"
},
{
"id": "real-osi-205101241972345",
"title": "Lunch with OSI",
"series": "be connected",
"start": "2026-11-26T12:30:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Sinfonia n. 9 in do maggiore D 944 La Grande",
"composerId": "schubert"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11846",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-11-26-12-30",
"source": "osi"
},
{
"id": "real-musikkollegium-10061",
"title": "Kafikammer - Zeitreise mit dem Fagott",
"series": "KafiDia",
"start": "2026-11-26T17:00:00+01:00",
"durationMin": 45,
"cityId": "winterthur",
"venueName": "Kafi Dia",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Bassoon",
"name": "Valeria Curti"
},
{
"role": "Piano",
"name": "Sharon Prushansky"
}
],
"program": [],
"ticketUrl": "https://www.musikkollegium.ch/programm/kafikammer-zeitreise-mit-dem-fagott-26-11-26-10061",
"sourceUrl": "https://www.musikkollegium.ch/programm/kafikammer-zeitreise-mit-dem-fagott-26-11-26-10061",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199949",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-11-26T19:00:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15368&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-beethoven-2-3-20261126",
"title": "Cycle Beethoven 2",
"series": "Cycle Beethoven",
"start": "2026-11-26T19:30:00+01:00",
"durationMin": 115,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 2 en ré majeur op. 36",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 3 en mi bémol majeur op. 55, 'Héroïque'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"source": "osr"
},
{
"id": "real-tonhalle-2056708",
"title": "Patricia Kopatchinskaja & Fazıl Say",
"series": null,
"start": "2026-11-26T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Patricia Kopatchinskaja"
},
{
"role": "Piano",
"name": "Fazıl Say"
}
],
"program": [
{
"composer": "Karol Szymanowski",
"title": "Mythen «Trois Poèmes» op. 30"
},
{
"composer": "Fazıl Say",
"title": "Sonate für Violine und Klavier Nr. 3 op. 119"
},
{
"composer": "Patricia Kopatchinskaja",
"title": "«UniSolo»"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sonate für Violine und Klavier Nr. 9 A-Dur op. 47 «Kreutzer»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.meisterinterpreten.ch/webshop/webticket/seatmap?eventId=232",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/patricia-kopatchinskaja-fazil-say-2056708/tz/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-10060",
"title": "Kafikammer - Zeitreise mit dem Fagott",
"series": "KafiDia",
"start": "2026-11-26T20:00:00+01:00",
"durationMin": 45,
"cityId": "winterthur",
"venueName": "Kafi Dia",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Bassoon",
"name": "Valeria Curti"
},
{
"role": "Piano",
"name": "Sharon Prushansky"
}
],
"program": [],
"ticketUrl": "https://www.musikkollegium.ch/programm/kafikammer-zeitreise-mit-dem-fagott-26-11-26-10060",
"sourceUrl": "https://www.musikkollegium.ch/programm/kafikammer-zeitreise-mit-dem-fagott-26-11-26-10060",
"source": "musikkollegium"
},
{
"id": "real-osi-175657233962741",
"title": "Maria Dueñas",
"series": "OSI al LAC",
"start": "2026-11-26T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Violin",
"name": "Maria Dueñas"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Concerto per violino e orchestra in re maggiore op. 77",
"composerId": "brahms"
},
{
"composer": "Franz Schubert",
"title": "Sinfonia n. 9 in do maggiore D 944 La Grande",
"composerId": "schubert"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11759",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-11-26-20-00",
"source": "osi"
},
{
"id": "real-ocg-concert-sur-le-pouce-3-20261127",
"title": "Concert sur le pouce #3",
"series": "Concert sur le pouce",
"start": "2026-11-27T12:15:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Bibliothèque de la Cité",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://locg.ch/fr/calendrier/concert-sur-le-pouce-3",
"sourceUrl": "https://locg.ch/fr/calendrier/concert-sur-le-pouce-3",
"source": "ocg"
},
{
"id": "real-osr-beethoven-2-3-20261127",
"title": "Cycle Beethoven 2",
"series": "Cycle Beethoven",
"start": "2026-11-27T19:30:00+01:00",
"durationMin": 115,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 2 en ré majeur op. 36",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 3 en mi bémol majeur op. 55, 'Héroïque'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven-2-3",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199864",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-11-27T19:30:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15234&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199814",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2026-11-28T11:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Marie Maidowski"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Salvador Villanueva"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Andrew Moore"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Johan Krogius"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15177&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9289",
"title": "WunderBär! mit Lorenz Pauli",
"series": "Familienkonzert ab 7 Jahren",
"start": "2026-11-28T15:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Choir",
"name": "Kammerchor Konservatorium Winterthur"
},
{
"role": "Choir",
"name": "Jugendkonzertchor Konservatorium Winterthur Junge Stimmen Konservatorium Winterthur"
},
{
"role": "Chorus master",
"name": "Philipp Klahm"
},
{
"role": "Conductor",
"name": "Philipp Klahm"
},
{
"role": "Narrator",
"name": "Lorenz Pauli"
},
{
"role": "Tenor",
"name": "Benedikt Kristjánsson"
},
{
"role": "Alto",
"name": "Ulrike Malotta"
},
{
"role": "Bass",
"name": "Georg Gädker"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163336/",
"sourceUrl": "https://www.musikkollegium.ch/programm/werbaer-mit-lorenz-pauli-26-11-28-9289",
"source": "musikkollegium"
},
{
"id": "real-ocg-concertissimo-20261128",
"title": "Concertissimo !",
"series": "Hommage à Géza Anda",
"start": "2026-11-28T18:00:00+01:00",
"durationMin": 90,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Illia Ovcharenko"
},
{
"role": "Piano",
"name": "Julian Trevelyan"
},
{
"role": "Piano",
"name": "Daumants Liepins"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concerto pour piano n°23, KV 488",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concerto pour piano n°24, KV 491",
"composerId": "mozart"
},
{
"composer": "Ludwig van Beethoven",
"title": "Concerto pour piano n°2",
"composerId": "beethoven"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229886498234",
"sourceUrl": "https://locg.ch/fr/calendrier/concertissimo",
"source": "ocg"
},
{
"id": "real-stadtcasino_basel-281126_sinfonietta",
"title": "Basel Sinfonietta – Jenseits Messiaen",
"series": "Musiksaal",
"start": "2026-11-28T19:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Titus Engel"
},
{
"role": "Orchestra",
"name": "Basel Sinfonietta"
}
],
"program": [
{
"composer": "Olivier Messiaen",
"title": "«Éclairs sur l’au-delà…»",
"composerId": "messiaen"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Basel_Sinfonietta/shop/event/168916/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/281126_sinfonietta/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-200192",
"title": "Rachmaninow – Die drei Opern",
"series": "Hauptbühne",
"start": "2026-11-28T19:00:00+01:00",
"durationMin": 200,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Francesca",
"name": "Elena Stikhina"
},
{
"role": "Paolo",
"name": "Bekhzod Davronov"
},
{
"role": "Lanciotto Malatesta",
"name": "Vladislav Sulimsky"
},
{
"role": "Dante",
"name": "Alexey Dolgov"
},
{
"role": "Aleko",
"name": "Vladislav Sulimsky"
},
{
"role": "Der Baron",
"name": "Vladislav Sulimsky"
},
{
"role": "Vergil",
"name": "Ain Anger"
},
{
"role": "Junger Mann",
"name": "Bekhzod Davronov"
},
{
"role": "Albert",
"name": "Dmytro Popov"
},
{
"role": "Alter Mann",
"name": "Ain Anger"
},
{
"role": "Der Herzog",
"name": "Pavel Yankovsky"
},
{
"role": "Zemifira",
"name": "Elena Stikhina"
},
{
"role": "Geldverleiher",
"name": "Alexey Dolgov"
},
{
"role": "Alte Frau",
"name": "Dominika Stefańska"
},
{
"role": "Iwan",
"name": "Stanislav Vorobyov"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Dmitri Tcherniakov"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15380&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rachmaninov-die-drei-opern/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056715",
"title": "Abo-Konzert #2 – Licht(t)räume",
"series": "Abo-Konzert #2",
"start": "2026-11-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Zürich"
},
{
"role": "Conductor",
"name": "Esther Hoppe"
},
{
"role": "Piano",
"name": "Ronald Brautigam"
}
],
"program": [
{
"composer": "Edward Elgar",
"title": "Introduction und Allegro op. 47"
},
{
"composer": "Sally Beamish",
"title": "Klavierkonzert Nr. 1 «Hill Stanzas»"
},
{
"composer": "Johannes van Bree",
"title": "Allegro für vier Streichquartette"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Klavierkonzert Nr. 9 Es-Dur KV 271 «Jeunhomme»",
"composerId": "mozart"
}
],
"ticketUrl": "https://shop.e-guma.ch/camerata-zuerich/de/events/2-lichttraeume-tonhalle-zuerich-1449473",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/abo-konzert-2-licht-t-raeume-2056715/tz/",
"source": "tonhalle"
},
{
"id": "real-osr-grande-fantaisie-20261129",
"title": "Grande Fantaisie",
"series": "Série Musique de chambre",
"start": "2026-11-29T11:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "conservatoire-geneve",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Caroline Baeriswyl"
},
{
"role": "Violin",
"name": "Yuwen Zhu"
},
{
"role": "Viola",
"name": "Verena Schweizer"
},
{
"role": "Cello",
"name": "Yao Jin"
},
{
"role": "Piano",
"name": "Meglena Tzaneva"
}
],
"program": [
{
"composer": "Rita Strohl",
"title": "Quatuor pour deux violons, alto et violoncelle"
},
{
"composer": "Rita Strohl",
"title": "Grande Fantaisie – Quintette pour piano, deux violons, alto et violoncelle"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/grande-fantaisie",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/grande-fantaisie",
"source": "osr"
},
{
"id": "real-tonhalle-2056720",
"title": "MS Benefizkonzert",
"series": null,
"start": "2026-11-29T11:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Schweiz"
},
{
"role": "Conductor",
"name": "Howard Griffiths"
},
{
"role": "Violin",
"name": "Ilva Eigus"
},
{
"role": "Piano",
"name": "Alexandra Dovgan"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Konzert für Violine, Klavier und Streichorchester d-Moll",
"composerId": "mendelssohn"
},
{
"composer": "Pjotr I. Tschaikowsky",
"title": "Serenade für Streichorchester C-Dur op. 48"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5751&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/ms-benefizkonzert-2056720/tz/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19934",
"title": "KAMMERMUSIK-MATINÉE 2",
"series": "Kammermusik",
"start": "2026-11-29T11:15:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Anne-Laure Pantillon"
},
{
"role": "Oboe",
"name": "Andrey Cholokyan"
},
{
"role": "Bassoon",
"name": "Sevgi Varol"
},
{
"role": "Piano",
"name": "Estelle Lustenberger"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Trio für Flöte, Fagott und Klavier, WoO 37",
"composerId": "beethoven"
},
{
"composer": "Francis Poulenc",
"title": "Trio für Oboe, Fagott und Klavier, FP 43"
},
{
"composer": "Arthur Honegger",
"title": "Concerto da Camera für Flöte, Englischhorn und Klavier, H 196",
"composerId": "honegger"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-2-j1t8ne?useEmbed=true",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-2-5/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199865",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-11-29T13:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15235&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9287",
"title": "Bach Weihnachtsoratorium",
"series": "Adventskonzert",
"start": "2026-11-29T17:00:00+01:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Choir",
"name": "Kammerchor Konservatorium Winterthur"
},
{
"role": "Choir",
"name": "Jugendkonzertchor Konservatorium Winterthur Junge Stimmen Konservatorium Winterthur"
},
{
"role": "Chorus master",
"name": "Philipp Klahm"
},
{
"role": "Conductor",
"name": "Philipp Klahm"
},
{
"role": "Soprano",
"name": "Yerin Mira"
},
{
"role": "Alto",
"name": "Ulrike Malotta"
},
{
"role": "Tenor",
"name": "Benedikt Kristjánsson"
},
{
"role": "Bass",
"name": "Georg Gädker"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Teil 1: «Jauchzet, frohlocket, auf, preiset die Tage» (zum 1. Weihnachtstag)",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Teil 3: «Herrscher des Himmels, erhöre das Lallen» (zum 27. Dezember)",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Teil 5: «Ehre sei dir, Gott, gesungen» (zum 1. Sonntag nach Neujahr)",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Teil 6: «Herr, wenn die stolzen Feinde schnauben» (zum 6. Januar, Epiphanias)",
"composerId": "bach"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163337/",
"sourceUrl": "https://www.musikkollegium.ch/programm/bach-weihnachtsoratorium-26-11-29-9287",
"source": "musikkollegium"
},
{
"id": "real-geneva_victoria_hall-27763749-20261129",
"title": "Gli Angeli Genève – Bach Absolu",
"series": null,
"start": "2026-11-29T17:00:00+01:00",
"durationMin": 105,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Bass & Conductor",
"name": "Stephan MacLeod"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Concertos Brandebourgeois, Ouvertures, Ich habe genug",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229291414925",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/27763749_gli-angeli-geneve-964257",
"source": "geneva_victoria_hall"
},
{
"id": "real-stadtcasino_basel-29112026_nob",
"title": "Neues Orchester Basel – Nordischer Zauber",
"series": "Musiksaal",
"start": "2026-11-29T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cor anglais",
"name": "Cosimo Conti"
},
{
"role": "Orchestra",
"name": "Neues Orchester Basel"
}
],
"program": [
{
"composer": "Edvard Grieg",
"title": "Sinfonische Tänze",
"composerId": "grieg"
},
{
"composer": "Jean Sibelius",
"title": "Der Schwan von Tuonela",
"composerId": "sibelius"
},
{
"composer": "Nils Wilhelm Gade",
"title": "Nachklänge von Ossian"
},
{
"composer": "Nils Wilhelm Gade",
"title": "im Dialog mit archaischer Musik aus Grönland"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Neues-Orchester-Basel/shop/event/175584/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/29112026_nob/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2056723",
"title": "«Classical Highlights» Adventskonzert – Masterinterpreten Opus 47",
"series": null,
"start": "2026-11-29T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Thüringen Philharmonie Gotha-Eisenach"
},
{
"role": "Conductor",
"name": "Dionysis Grammenos"
},
{
"role": "Violin",
"name": "Maria Solozobova"
},
{
"role": "Flute",
"name": "Tommaso Benciolini"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "«Die Geschöpfe des Prometheus» op. 43",
"composerId": "beethoven"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Violine und Orchester Nr. 5 A-Dur KV 219",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Flötenkonzert G-Dur KV 313",
"composerId": "mozart"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 1 C-Dur op. 21",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.ticketino.com/de/event/masterinterpreten-opus-47-adventskonzert/211336",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/classical-highlights-adventskonzert-masterinterpreten-opus-47-2056723/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200200",
"title": "Das Rheingold",
"series": "Hauptbühne",
"start": "2026-11-29T20:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Donner",
"name": "Daniel Schmutzhard"
},
{
"role": "Froh",
"name": "Johan Krogius"
},
{
"role": "Loge",
"name": "Matthias Klink"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Freia",
"name": "Kiandra Howarth"
},
{
"role": "Erda",
"name": "Noa Beinart"
},
{
"role": "Alberich",
"name": "Christopher Purves"
},
{
"role": "Mime",
"name": "Wolfgang Ablinger-Sperrhacke"
},
{
"role": "Fasolt",
"name": "David Steffens"
},
{
"role": "Fafner",
"name": "Brent Michael Smith"
},
{
"role": "Wellgunde",
"name": "Marcela Rahal"
},
{
"role": "Flosshilde",
"name": "Siena Licht Miller"
},
{
"role": "Woglinde",
"name": "Victoria Randem"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Das Rheingold",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15157&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/das-rheingold/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-3-passons-aux-salons-20261130",
"title": "Passons aux Salons #3",
"series": "Passons aux Salons",
"start": "2026-11-30T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215269&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/3-passons-aux-salons",
"source": "ocg"
},
{
"id": "real-stadtcasino_basel-301126_anna_netrebko",
"title": "Anna Netrebko – Debüt in Basel",
"series": "Musiksaal",
"start": "2026-11-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/event/anna-netrebko-2026-stadtcasino-basel-20930360/?affiliate=AE2",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/301126_anna_netrebko/",
"source": "stadtcasino_basel"
},
{
"id": "real-geneva_victoria_hall-58400249-20261130",
"title": "Opéra Carmen de Bizet",
"series": null,
"start": "2026-11-30T19:30:00+01:00",
"durationMin": 150,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre Concertus"
},
{
"role": "Choir",
"name": "Ensemble Vocal Orphée"
},
{
"role": "Choir",
"name": "Chœur d’enfants"
},
{
"role": "Conductor",
"name": "Matthieu Schweyer"
},
{
"role": "Carmen",
"name": "Nora Sourouzian"
},
{
"role": "Don José",
"name": "Louis Zaitoun"
},
{
"role": "Micaëla",
"name": "Karine Mkrtchyan"
},
{
"role": "Escamillo",
"name": "Sacha Michon"
},
{
"role": "Frasquita",
"name": "Larissa Rosanoff"
},
{
"role": "Mercédès",
"name": "Armine Mkrtchyan"
},
{
"role": "Moralès",
"name": "Alexandre Diakoff"
},
{
"role": "Zuniga",
"name": "Jérémie Brocard"
},
{
"role": "Le Dancaïre",
"name": "Lucio Fersurella"
},
{
"role": "Le Remendado",
"name": "Xan White"
}
],
"program": [
{
"workId": "bizet-carmen",
"composerId": "bizet"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/58400249_opera-carmen-de-bizet-orchestre-concertus-ensemble-vocal-orphee-et-choeur-denfants-matthieu-schweyer-direction",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055262",
"title": "Série jeunes: Javus Quartett",
"series": "Série jeunes",
"start": "2026-11-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Javus Quartett"
},
{
"role": "Violin",
"name": "Marie-Therese Schwöllinger"
},
{
"role": "Violin",
"name": "Alexandra Moser"
},
{
"role": "Viola",
"name": "Marvin Stark"
},
{
"role": "Cello",
"name": "Oscar Hagen"
}
],
"program": [
{
"composer": "Haydn",
"title": "",
"composerId": "haydn"
},
{
"composer": "Bacewicz",
"title": ""
},
{
"composer": "Mendelssohn Bartholdy",
"title": "",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5623&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/serie-jeunes-javus-quartett-2055262/",
"source": "tonhalle"
},
{
"id": "real-zko-19505",
"title": "Daniel Hope – Barocker Advent",
"series": "Abo-Konzerte",
"start": "2026-12-01T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Music Director",
"name": "Daniel Hope"
},
{
"role": "Violin",
"name": "Daria Zappa Matesic"
},
{
"role": "Cello",
"name": "Nicola Mosca"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Carl Philipp Emanuel Bach",
"title": "Sinfonie e-Moll, Wq. 177",
"composerId": "bach"
},
{
"composer": "Georg Philipp Telemann",
"title": "Konzert für Violine und Streichorchester a-Moll, TWV 51:a1"
},
{
"composer": "Alessandro Marcello",
"title": "Konzert für Oboe und Streichorchester d-Moll (Fassung für Violine und Streichorchester)"
},
{
"composer": "Antonio Vivaldi",
"title": "Konzert für zwei Violinen, Violoncello und Streichorchester d-Moll, RV 565, aus: L’Estro Armonico, op. 3",
"composerId": "vivaldi"
},
{
"composer": "Arcangelo Corelli",
"title": "Concerto grosso g-Moll, Fatto per la Notte di Natale, op. 6/8"
},
{
"composer": "Georg Philipp Telemann",
"title": "Suite g-Moll, La Musette, TWV 55:g1"
},
{
"composer": "Francesco Saverio Geminiani",
"title": "Concerto grosso Nr. 5 g-Moll, H.136"
},
{
"composer": "Johann Sebastian Bach",
"title": "Konzert für Violine und Streichorchester a-Moll, BWV 1041",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1950",
"sourceUrl": "https://zko.ch/events/daniel-hope-barocker-advent/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199950",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-12-02T19:00:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15369&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-24116871-20261202",
"title": "Hayato Sumino",
"series": "Les Grands Interprètes",
"start": "2026-12-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Hayato Sumino"
}
],
"program": [
{
"composer": "Frédéric Chopin",
"title": "Scherzo n° 1 en si mineur, op. 20",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Étude, op. 25 n° 1, «Harpe éolienne»",
"composerId": "chopin"
},
{
"composer": "Hayato Sumino",
"title": "Lydian Harp"
},
{
"composer": "Frédéric Chopin / Hayato Sumino",
"title": "Postlude «Goutte de pluie»",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Sonate pour piano n° 2 en si bémol mineur, op. 35",
"composerId": "chopin"
},
{
"composer": "Camille Saint-Saëns",
"title": "Danse macabre, op. 40",
"composerId": "saint-saens"
},
{
"composer": "Frédéric Chopin",
"title": "Trois Mazurkas, op. 59",
"composerId": "chopin"
},
{
"composer": "Thomas Adès",
"title": "Mazurka, op. 27 n° 2"
},
{
"composer": "Frédéric Chopin",
"title": "Étude, op. 10 n° 5, «Touche noire»",
"composerId": "chopin"
},
{
"composer": "Hayato Sumino",
"title": "White Keys"
},
{
"composer": "Hayato Sumino",
"title": "Polonaise imaginaire"
},
{
"composer": "Frédéric Chopin",
"title": "Étude, op. 25 n° 11, «Vent d’hiver»",
"composerId": "chopin"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/hayoto-sumino2026",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/24116871_hayato-sumino",
"source": "geneva_victoria_hall"
},
{
"id": "real-lso_luzern-19889",
"title": "ODE AN DIE FREUDE – BEETHOVEN 9",
"series": "Sinfoniekonzerte",
"start": "2026-12-02T19:30:00+01:00",
"durationMin": 75,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Soprano",
"name": "Masabane Cecilia Rangwanasha"
},
{
"role": "Mezzo-soprano",
"name": "Rachel Frenkel"
},
{
"role": "Tenor",
"name": "Mauro Peter"
},
{
"role": "Baritone",
"name": "Yannick Debus"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
},
{
"role": "Chorus master",
"name": "Nico Köhs"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 9 in d-Moll, op. 125",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/ode-an-die-freude-beethoven-9-5nbvy2",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/ode-an-die-freude-beethoven-9-2/",
"source": "lso_luzern"
},
{
"id": "real-stadtcasino_basel-02122026-amg-solistenabende",
"title": "Sergey Khachatryan & Lusine Khachatryan",
"series": "AMG Solistenabende",
"start": "2026-12-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Sergey Khachatryan"
},
{
"role": "Piano",
"name": "Lusine Khachatryan"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Sonate für Violine und Cembalo A-Dur, BWV 1015",
"composerId": "bach"
},
{
"composer": "Ferruccio Busoni",
"title": "Sonate Nr. 2 für Violine und Klavier e-Moll, op. 36a"
},
{
"composer": "Eduard Baghdasaryan",
"title": "Rhapsodie für Violine und Klavier"
},
{
"composer": "Maurice Ravel",
"title": "Tzigane",
"composerId": "ravel"
},
{
"composer": "Maurice Ravel",
"title": "Konzert-Rhapsodie für Violine und Klavier",
"composerId": "ravel"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=222",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/02122026-amg-solistenabende/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2056729",
"title": "TOUR #14 «Swiss Romance»",
"series": null,
"start": "2026-12-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Swiss Orchestra"
},
{
"role": "Conductor",
"name": "Lena-Lisa Wüstendörfer"
},
{
"role": "Baritone",
"name": "Thomas Hampson"
}
],
"program": [
{
"composer": "Schubert",
"title": "",
"composerId": "schubert"
},
{
"composer": "Strong",
"title": ""
},
{
"composer": "Mahler",
"title": "",
"composerId": "mahler"
},
{
"composer": "Raff",
"title": ""
},
{
"composer": "Mendelssohn Bartholdy",
"title": "",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://swissorchestra.ticketino.com/de/home/214746",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/tour-14-swiss-romance-2056729/tz/",
"source": "tonhalle"
},
{
"id": "real-zko-19920",
"title": "ZKO on Tour — Daniel Hope – Klassik Forum Chur",
"series": "ZKO on Tour",
"start": "2026-12-02T19:30:00+01:00",
"durationMin": 90,
"cityId": "chur",
"venueId": "theater-chur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Music Director",
"name": "Daniel Hope"
},
{
"role": "Violin",
"name": "Daria Zappa Matesic"
},
{
"role": "Cello",
"name": "Nicola Mosca"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Carl Philipp Emanuel Bach",
"title": "Sinfonie e-Moll, Wq. 177",
"composerId": "bach"
},
{
"composer": "Georg Philipp Telemann",
"title": "Konzert für Violine und Streichorchester a-Moll, TWV 51:a1"
},
{
"composer": "Alessandro Marcello",
"title": "Konzert für Oboe und Streichorchester d-Moll (Fassung für Violine und Streichorchester)"
},
{
"composer": "Antonio Vivaldi",
"title": "Konzert für zwei Violinen, Violoncello und Streichorchester d-Moll, RV 565, aus: L’Estro Armonico, op. 3",
"composerId": "vivaldi"
},
{
"composer": "Arcangelo Corelli",
"title": "Concerto grosso g-Moll, Fatto per la Notte di Natale, op. 6/8"
},
{
"composer": "Georg Philipp Telemann",
"title": "Suite g-Moll, La Musette, TWV 55:g1"
},
{
"composer": "Francesco Saverio Geminiani",
"title": "Concerto grosso Nr. 5 g-Moll, H.136"
},
{
"composer": "Johann Sebastian Bach",
"title": "Konzert für Violine und Streichorchester a-Moll, BWV 1041",
"composerId": "bach"
}
],
"ticketUrl": "https://zko.ch/?post_type=noisa_events&p=19920",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19920",
"source": "zko"
},
{
"id": "real-tonhalle-2055602",
"title": "Kammermusik-Lunchkonzert",
"series": null,
"start": "2026-12-03T12:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Trio Sola"
},
{
"role": "Violin",
"name": "Peter McGuire"
},
{
"role": "Viola",
"name": "Antonia Siegers-Reid"
},
{
"role": "Cello",
"name": "Ioana Geangalau-Donoukaras"
},
{
"role": "Violin",
"name": "Elisabeth Harringer-Pignat"
},
{
"role": "Piano",
"name": "Hendrik Heilmann"
}
],
"program": [
{
"composer": "Thorvaldsdottir",
"title": ""
},
{
"composer": "Juon",
"title": ""
},
{
"composer": "Honegger",
"title": "",
"composerId": "honegger"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5601&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-lunchkonzert-2055602/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2056733",
"title": "Anastasia Kobekina: Von Vivaldi bis Haydn",
"series": null,
"start": "2026-12-03T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Münchener Kammerorchester"
},
{
"role": "Cello",
"name": "Anastasia Kobekina"
}
],
"program": [
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
},
{
"composer": "Monteverdi",
"title": ""
},
{
"composer": "Sollima",
"title": ""
},
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Haydn",
"title": "",
"composerId": "haydn"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5649&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/anastasia-kobekina-von-vivaldi-bis-haydn-2056733/tz/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19890",
"title": "BEETHOVEN PUR – ORCHESTER, KLAVIER, CHOR",
"series": "Sinfoniekonzerte",
"start": "2026-12-03T19:30:00+01:00",
"durationMin": 80,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lars Corijn"
},
{
"role": "Piano",
"name": "David Fray"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zur Oper Coriolan, op. 62",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Fantasie für Klavier, Chor und Orchester Chorfantasie in c-Moll, op. 80",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klavierkonzert Nr. 3 in c-Moll, op. 37",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/beethoven-pur-klavier-chor-azix7s",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/beethoven-pur-klavier-chor/",
"source": "lso_luzern"
},
{
"id": "real-buehnen_bern-scheherazade-2026-12-03-1930",
"title": "Scheherazade",
"series": "5. Symphoniekonzert",
"start": "2026-12-03T19:30:00+01:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Violin",
"name": "Renaud Capuçon"
},
{
"role": "Cello",
"name": "Edgar Moreau"
},
{
"role": "Piano",
"name": "Hélène Mercier"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Konzert für Klavier, Violine, Violoncello und Orchester C-Dur op. 56 «Tripelkonzert» (1803 / 04)",
"composerId": "beethoven"
},
{
"composer": "Nikolai Rimski-Korsakow",
"title": "Scheherazade. Symphonische Suite op. 35 (1888)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2024&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/scheherazade/",
"source": "buehnen_bern"
},
{
"id": "real-opernhaus_zurich-200201",
"title": "Das Rheingold",
"series": "Hauptbühne",
"start": "2026-12-04T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Donner",
"name": "Daniel Schmutzhard"
},
{
"role": "Froh",
"name": "Johan Krogius"
},
{
"role": "Loge",
"name": "Matthias Klink"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Freia",
"name": "Kiandra Howarth"
},
{
"role": "Erda",
"name": "Noa Beinart"
},
{
"role": "Alberich",
"name": "Christopher Purves"
},
{
"role": "Mime",
"name": "Wolfgang Ablinger-Sperrhacke"
},
{
"role": "Fasolt",
"name": "David Steffens"
},
{
"role": "Fafner",
"name": "Brent Michael Smith"
},
{
"role": "Wellgunde",
"name": "Marcela Rahal"
},
{
"role": "Flosshilde",
"name": "Siena Licht Miller"
},
{
"role": "Woglinde",
"name": "Victoria Randem"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Das Rheingold",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15166&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/das-rheingold/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9219",
"title": "Hommage an Klaus Huber",
"series": "Hauskonzert",
"start": "2026-12-04T19:00:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Cello",
"name": "Flurin Cuonz"
},
{
"role": "Baritone",
"name": "David Eggert"
},
{
"role": "Countertenor",
"name": "Elmar Hauser"
},
{
"role": "Clarinet",
"name": "Sérgio Fernandes Pires"
}
],
"program": [
{
"composer": "Henry Purcell",
"title": "«When I am laid in Earth» Lament der Dido aus der Oper «Dido und Aeneas»"
},
{
"composer": "Klaus Huber",
"title": "«Ein Hauch von Unzeit III» (Plainte sur la perte de la réflexion musicale)"
},
{
"composer": "Antonio Vivaldi",
"title": "Sinfonia h-Moll «Al Santo Sepolcro» RV 169",
"composerId": "vivaldi"
},
{
"composer": "Olivier Messiaen",
"title": "«Abîme des oiseaux»",
"composerId": "messiaen"
},
{
"composer": "Henry Purcell",
"title": "Chacony g-Moll, Z 730"
},
{
"composer": "Klaus Huber",
"title": "«Die Seele muss vom Reittier steigen...» Kammerkonzert für Violoncello, Baryton, Contratenor und 37 Instrumentalisten mit Fragmenten eines Gedichts von Mahmoud Darwisch"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161665/",
"sourceUrl": "https://www.musikkollegium.ch/programm/hommage-an-klaus-huber-26-12-04-9219",
"source": "musikkollegium"
},
{
"id": "real-buehnen_bern-scheherazade-2026-12-04-1930",
"title": "Scheherazade",
"series": "5. Symphoniekonzert",
"start": "2026-12-04T19:30:00+01:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Violin",
"name": "Renaud Capuçon"
},
{
"role": "Cello",
"name": "Edgar Moreau"
},
{
"role": "Piano",
"name": "Hélène Mercier"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Konzert für Klavier, Violine, Violoncello und Orchester C-Dur op. 56 «Tripelkonzert» (1803 / 04)",
"composerId": "beethoven"
},
{
"composer": "Nikolai Rimski-Korsakow",
"title": "Scheherazade. Symphonische Suite op. 35 (1888)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2189&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/scheherazade/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2056736",
"title": "Swiss Charity Concert 2026",
"series": null,
"start": "2026-12-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Praga Camerata Symphonic Orchestra"
},
{
"role": "Conductor",
"name": "Victor Dijon von Monteton"
},
{
"role": "Violin",
"name": "Koh Gabriel Kameda"
},
{
"role": "Piano",
"name": "Akari Bastiaens"
}
],
"program": [
{
"composer": "Williams",
"title": ""
},
{
"composer": "Alan Menken",
"title": ""
},
{
"composer": "Grieg",
"title": "",
"composerId": "grieg"
},
{
"composer": "Dvořák",
"title": "",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5754&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/swiss-charity-concert-2026-2056736/tz/",
"source": "tonhalle"
},
{
"id": "real-osr-dansez-maintenant-20261205",
"title": "Eh bien! Dansez maintenant",
"series": "Série en famille",
"start": "2026-12-05T11:00:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Béran"
},
{
"role": "Narrator",
"name": "Joan Mompart"
},
{
"role": "Orchestra",
"name": "Orchestre du Collège de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Vladimir Cosma",
"title": "« Eh bien ! Dansez maintenant », divertissement d’après les fables de La Fontaine"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/dansez-maintenant",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/dansez-maintenant",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199951",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-12-05T19:00:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15370&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19886",
"title": "ODE AN DIE FREUDE – BEETHOVEN 9",
"series": "Sinfoniekonzerte",
"start": "2026-12-05T19:30:00+01:00",
"durationMin": 75,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Soprano",
"name": "Masabane Cecilia Rangwanasha"
},
{
"role": "Mezzo-soprano",
"name": "Rachel Frenkel"
},
{
"role": "Tenor",
"name": "Mauro Peter"
},
{
"role": "Baritone",
"name": "Yannick Debus"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
},
{
"role": "Chorus master",
"name": "Nico Köhs"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 9 in d-Moll, op. 125",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/ode-an-die-freude-beethoven-9-99r06c",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/ode-an-die-freude-beethoven-9/",
"source": "lso_luzern"
},
{
"id": "real-osi-205102159182513",
"title": "Concerto di Natale",
"series": "OSI a Bellinzona",
"start": "2026-12-05T20:00:00+01:00",
"durationMin": 120,
"cityId": null,
"venueName": "Cattedrale delle Officine FFS",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Coro Calicantus"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-12-05-20-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-12-05-20-00",
"source": "osi"
},
{
"id": "real-sob-12225",
"title": "Adventskonzert",
"series": "Sinfoniekonzert",
"start": "2026-12-06T11:00:00+01:00",
"durationMin": 90,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Lilit Davtyan"
},
{
"role": "Choir",
"name": "Mädchenkantorei Basel"
},
{
"role": "Conductor",
"name": "Anna Handler"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, Introduktion"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 1. Akt, Nr. 1 Szene"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 1. Akt, Nr. 2 Walzer"
},
{
"composer": "Nikolai A. Rimski-Korsakow",
"title": "Arie des Schneeflöckchens aus der Oper \"Schneeflöckchen\" op. 12"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Motette \"Exsultate, jubilate\" F-Dur, KV 165 für Sopran und Orchester",
"composerId": "mozart"
},
{
"composer": "Sergei Rachmaninow",
"title": "\"Vocalise\" op. 34 Nr. 14, aus \"14 Romanzen\""
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 2. Akt, Nr. 10 Szene"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 2. Akt, Nr. 13 Tanz der kleinen Schwäne"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 3. Akt, Nr. 23 Mazurka"
},
{
"composer": "Max Reger",
"title": "\"Mariä Wiegenlied\" op. 76 Nr. 52, aus \"Schlichte Weisen\""
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 4.Akt, Nr. 28 Szene"
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Schwanensee op. 20, 4. Akt, Nr. 29 Finale"
},
{
"composer": "Adolphe Charles Adam",
"title": "\"Cantique de Nöel\""
},
{
"composer": "Florian Walser",
"title": "Weihnachtsmedley"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229728164988&productId=10229728266302&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/adventskonzert/12225",
"source": "sob"
},
{
"id": "real-geneva_victoria_hall-92233577-20261206-1100",
"title": "Orchestre des Nations – Mère Royaume – Concert pour petits et grands",
"series": null,
"start": "2026-12-06T11:00:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Antoine Marguier"
},
{
"role": "Mère Royaume",
"name": "Capucine Keller"
},
{
"role": "Orchestra",
"name": "Orchestre des Nations"
}
],
"program": [
{
"composer": "Robert Clerc",
"title": "Mère Royaume"
}
],
"ticketUrl": "https://openagenda.com/victoria-hall/events/92233577_orchestre-des-nations-67781",
"sourceUrl": "https://openagenda.com/victoria-hall/events/92233577_orchestre-des-nations-67781",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200028",
"title": "4. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2026-12-06T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Viola",
"name": "Alexander Tatarinov, Valentyna Pryshlyak"
},
{
"role": "Cello",
"name": "Alexander Gropper, Seiji Yokota"
}
],
"program": [
{
"composer": "Johan Svendsen",
"title": "Oktett für Streicher A-Dur, op. 3"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Zwei Stücke für Streichoktett op. 11"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15444&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-4/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-92233577-20261206-1330",
"title": "Orchestre des Nations – Mère Royaume – Concert pour petits et grands",
"series": null,
"start": "2026-12-06T13:30:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Antoine Marguier"
},
{
"role": "Mère Royaume",
"name": "Capucine Keller"
},
{
"role": "Orchestra",
"name": "Orchestre des Nations"
}
],
"program": [
{
"composer": "Robert Clerc",
"title": "Mère Royaume"
}
],
"ticketUrl": "https://openagenda.com/victoria-hall/events/92233577_orchestre-des-nations-67781",
"sourceUrl": "https://openagenda.com/victoria-hall/events/92233577_orchestre-des-nations-67781",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-199815",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2026-12-06T14:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Thalia Cook-Hansen"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Tautvydas Slizauskas"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Andrew Moore"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Anthony León"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15178&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9449",
"title": "Schubert & Brahms",
"series": "Music for a While",
"start": "2026-12-06T14:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueName": "Sammlung Oskar Reinhart Am Römerholz",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Loewe Quartett"
},
{
"role": "Violin",
"name": "Bastian Loewe"
},
{
"role": "Violin",
"name": "Livia Berchtold"
},
{
"role": "Viola",
"name": "Jürg Dähler"
},
{
"role": "Viola",
"name": "Juan Carlos Escobar"
},
{
"role": "Cello",
"name": "Milena Marena"
},
{
"role": "Cello",
"name": "Anikó Illényi"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Quartettsatz c-Moll, D 703",
"composerId": "schubert"
},
{
"composer": "Johannes Brahms",
"title": "Sextett für zwei Violinen, zwei Violen und zwei Violoncelli Nr. 2 G-Dur, op. 36",
"composerId": "brahms"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/177755/",
"sourceUrl": "https://www.musikkollegium.ch/programm/schubert-brahms-26-12-06-9449",
"source": "musikkollegium"
},
{
"id": "real-cnz-144",
"title": "Voltaire-Konzert N° 7: Farzia Fallah im Gespräch",
"series": null,
"start": "2026-12-06T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Cabaret Voltaire",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cor anglais",
"name": "Matthias Arter"
}
],
"program": [
{
"composer": "Farzia Fallah",
"title": "Canti solisti per una possibilità, für Englischhorn (2025, Uraufführung)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179952/",
"sourceUrl": "https://cnz.ch/voltaire-7",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-199866",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-12-06T20:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15236&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200029",
"title": "4. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2026-12-07T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Viola",
"name": "Alexander Tatarinov, Valentyna Pryshlyak"
},
{
"role": "Cello",
"name": "Alexander Gropper, Seiji Yokota"
}
],
"program": [
{
"composer": "Johan Svendsen",
"title": "Oktett für Streicher A-Dur, op. 3"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Zwei Stücke für Streichoktett op. 11"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15445&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-4/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-08122026",
"title": "La Cetra Barockorchester & Vokalensemble Basel",
"series": "AMG Symphonic Gems",
"start": "2026-12-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "La Cetra Barockorchester & Vokalensemble Basel"
},
{
"role": "Conductor",
"name": "Andrea Marcon"
},
{
"role": "Soprano",
"name": "Miriam Feuersinger"
},
{
"role": "Soprano",
"name": "Lea Müller"
},
{
"role": "Alto",
"name": "Beth Taylor"
},
{
"role": "Tenor",
"name": "Jacob Lawrence"
},
{
"role": "Bass",
"name": "José Coca Loza"
}
],
"program": [
{
"composer": "Arcangelo Corelli",
"title": "Concerto per la Notte di Natale"
},
{
"composer": "Johann Christoph Pez",
"title": "Concerto pastorale F-Dur"
},
{
"composer": "Domenico Scarlatti",
"title": "Salve Regina"
},
{
"composer": "Johann Sebastian Bach",
"title": "Magnificat D-Dur BWV 243",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=197",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/08122026/",
"source": "stadtcasino_basel"
},
{
"id": "real-stadtcasino_basel-081226_gfk",
"title": "Magdalena Kožená und Malcolm Martineau",
"series": "Kammermusik Basel",
"start": "2026-12-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Mezzo-soprano",
"name": "Magdalena Kožená"
},
{
"role": "Piano",
"name": "Malcolm Martineau"
}
],
"program": [],
"ticketUrl": "https://www.ticketino.com/de/Event/Kammermusik-Basel-LIEDERABEND-MAGDALENA-KOZENA/215282",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/081226_gfk/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9229",
"title": "Antje Weithaas & Leo McFall",
"series": "Abonnementskonzert",
"start": "2026-12-09T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Leo McFall"
},
{
"role": "Violin",
"name": "Antje Weithaas"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Suite on English Folk Tunes, op. 90 «A Time There Was...»"
},
{
"composer": "Béla Bartók",
"title": "Konzert für Violine und Orchester Nr. 1",
"composerId": "bartok"
},
{
"composer": "Robert Schumann",
"title": "Sinfonie Nr. 3 Es-Dur, op. 97 «Rheinische»",
"composerId": "schumann"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161604/",
"sourceUrl": "https://www.musikkollegium.ch/programm/antje-weithaas-leo-mcfall-26-12-09-9229",
"source": "musikkollegium"
},
{
"id": "real-stadtcasino_basel-09122026_kg",
"title": "Jenaer Philhamonie",
"series": "KG-Sinfoniekonzerte",
"start": "2026-12-09T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Simon Gaudenz"
},
{
"role": "Soprano",
"name": "Christina Landshamer"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Ouvertüre «Othello» op. 93",
"composerId": "dvorak"
},
{
"workId": "rstrauss-four-last-songs",
"composerId": "richard-strauss"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 e-Moll op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.sinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=204",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/09122026_kg/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9231",
"title": "Antje Weithaas & Leo McFall",
"series": "Abonnementskonzert",
"start": "2026-12-10T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Leo McFall"
},
{
"role": "Violin",
"name": "Antje Weithaas"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Suite on English Folk Tunes, op. 90 «A Time There Was...»"
},
{
"composer": "Béla Bartók",
"title": "Konzert für Violine und Orchester Nr. 1",
"composerId": "bartok"
},
{
"composer": "Robert Schumann",
"title": "Sinfonie Nr. 3 Es-Dur, op. 97 «Rheinische»",
"composerId": "schumann"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161605/",
"sourceUrl": "https://www.musikkollegium.ch/programm/antje-weithaas-leo-mcfall-26-12-10-9231",
"source": "musikkollegium"
},
{
"id": "real-stadtcasino_basel-10122026_vosiko",
"title": "Jenaer Philhamonie",
"series": "Volkssinfoniekonzerte",
"start": "2026-12-10T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Simon Gaudenz"
},
{
"role": "Soprano",
"name": "Christina Landshamer"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Ouvertüre «Othello» op. 93",
"composerId": "dvorak"
},
{
"workId": "rstrauss-four-last-songs",
"composerId": "richard-strauss"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 e-Moll op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.volkssinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=209",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/10122026_vosiko/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-199952",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-12-10T20:00:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15371&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osi-175658217699612",
"title": "Francesco Piemontesi",
"series": "OSI al LAC",
"start": "2026-12-10T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Otto Nicolai",
"title": "Le allegre comari di Windsor ouverture"
},
{
"composer": "Ludwig van Beethoven",
"title": "Concerto per pianoforte e orchestra n. 4 in sol maggiore op. 58",
"composerId": "beethoven"
},
{
"composer": "Giuseppe Verdi",
"title": "Macbeth ballabili dall’Atto III",
"composerId": "verdi"
},
{
"composer": "Piotr Il'ič Čajkovskij",
"title": "Romeo e Giulietta ouverture-fantasia in si minore per orchestra"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11760",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-12-10-20-00",
"source": "osi"
},
{
"id": "real-ocg-concert-sur-le-pouce-4-20261211",
"title": "Concert sur le pouce #4",
"series": "Concert sur le pouce",
"start": "2026-12-11T12:15:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Bibliothèque de la Cité",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.bm-geneve.ch/notice?id=h%3A%3A20f23641-2981-46c5-91d7-627f38262db7&queryId=f3c18f67-8cfb-4957-bd00-33856f71e6f0&posInSet=9",
"sourceUrl": "https://locg.ch/fr/calendrier/concert-sur-le-pouce-4",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200081",
"title": "Manon Lescaut",
"series": "Hauptbühne",
"start": "2026-12-11T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Francesco Ivan Ciampa"
},
{
"role": "Manon Lescaut",
"name": "Sonya Yoncheva"
},
{
"role": "Lescaut",
"name": "Lauri Vasar"
},
{
"role": "Il cavaliere Des Grieux",
"name": "Joshua Guerrero"
},
{
"role": "Geronte di Ravoir",
"name": "Shavleg Armasi"
},
{
"role": "Edmondo",
"name": "Daniel Norman"
},
{
"role": "Un musico",
"name": "Marcela Rahal"
},
{
"role": "Il maestro di ballo",
"name": "Salvador Villanueva"
},
{
"role": "Ninetta",
"name": "Tautvydas Slizauskas"
},
{
"role": "Un comandante",
"name": "Theodore McAlindon"
},
{
"role": "L'oste",
"name": "Valeriy Murga"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "Manon Lescaut",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15246&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/manon-lescaut/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055616",
"title": "Galakonzert Freundeskreis",
"series": null,
"start": "2026-12-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
},
{
"role": "Performer",
"name": "Mari Eriksmoen"
},
{
"role": "Performer",
"name": "Álvaro Zambrano"
},
{
"role": "Performer",
"name": "Lucie Horsch"
},
{
"role": "Performer",
"name": "Leonardo Cortellazzi"
},
{
"role": "Performer",
"name": "Enrico Marabelli"
},
{
"role": "Performer",
"name": "André Morsch"
}
],
"program": [
{
"composer": "Rossini",
"title": "",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/galakonzert-freundeskreis-2055616/",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/galakonzert-freundeskreis-2055616/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9426",
"title": "Meet Milena Marena",
"series": "Feierabend-Konzert",
"start": "2026-12-12T17:30:00+01:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Leo McFall"
},
{
"role": "Cello",
"name": "Milena Marena"
},
{
"role": "Host",
"name": "Gabiz Reichert"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Konzert für Violoncello und Orchester a-Moll, op. 129",
"composerId": "schumann"
},
{
"composer": "Joseph Haydn",
"title": "Sinfonie Nr. 96 D-Dur, Hob I:96 «The Miracle»",
"composerId": "haydn"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/meet-milena-marena-26-12-12-9426",
"sourceUrl": "https://www.musikkollegium.ch/programm/meet-milena-marena-26-12-12-9426",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055618",
"title": "Jan Willem de Vriend mit Rossini",
"series": null,
"start": "2026-12-12T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
},
{
"role": "Performer",
"name": "Mari Eriksmoen"
},
{
"role": "Performer",
"name": "Álvaro Zambrano"
},
{
"role": "Performer",
"name": "Lucie Horsch"
},
{
"role": "Performer",
"name": "Leonardo Cortellazzi"
},
{
"role": "Performer",
"name": "Enrico Marabelli"
},
{
"role": "Performer",
"name": "André Morsch"
}
],
"program": [
{
"composer": "Rossini",
"title": "",
"composerId": "rossini"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5583&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jan-willem-de-vriend-mit-rossini-2055618/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200202",
"title": "Das Rheingold",
"series": "Hauptbühne",
"start": "2026-12-12T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Donner",
"name": "Daniel Schmutzhard"
},
{
"role": "Froh",
"name": "Johan Krogius"
},
{
"role": "Loge",
"name": "Matthias Klink"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Freia",
"name": "Kiandra Howarth"
},
{
"role": "Erda",
"name": "Noa Beinart"
},
{
"role": "Alberich",
"name": "Christopher Purves"
},
{
"role": "Mime",
"name": "Wolfgang Ablinger-Sperrhacke"
},
{
"role": "Fasolt",
"name": "David Steffens"
},
{
"role": "Fafner",
"name": "Brent Michael Smith"
},
{
"role": "Wellgunde",
"name": "Marcela Rahal"
},
{
"role": "Flosshilde",
"name": "Siena Licht Miller"
},
{
"role": "Woglinde",
"name": "Victoria Randem"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Das Rheingold",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15164&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/das-rheingold/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19891",
"title": "ADVENTSMATINÉE MIT KIAN SOLTANI & TSCHAIKOWSKYS NUSSKNACKER",
"series": "Sinfoniekonzerte",
"start": "2026-12-13T11:00:00+01:00",
"durationMin": 90,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Aivis Greters"
},
{
"role": "Cello",
"name": "Kian Soltani"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Cellokonzert in h-Moll, op. 104",
"composerId": "dvorak"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Nussknacker-Suite, op. 71a"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/adventsmatinee-mit-kian-soltani-tschaikowskys-nu-ed3lzm",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/advents-matinee-mit-kian-soltani-tschaikowskys-nussknacker/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199867",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-12-13T14:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15237&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-50654815-20261213",
"title": "Alcina, opéra de Francesca Caccini",
"series": "Concert du dimanche",
"start": "2026-12-13T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Emiliano Gonzalez Toro"
},
{
"role": "Conductor",
"name": "Mathilde Etienne"
},
{
"role": "Bass-baritone",
"name": "Benoît Capt"
},
{
"role": "Soprano",
"name": "Mathilde Etienne"
},
{
"role": "Soprano",
"name": "Cristina Fanelli"
},
{
"role": "Contralto",
"name": "Lorrie Garcia"
},
{
"role": "Tenor",
"name": "Emiliano Gonzalez Toro"
},
{
"role": "Soprano",
"name": "Yerin Mira"
},
{
"role": "Tenor",
"name": "Jordan Mouaissia"
},
{
"role": "Mezzo-soprano",
"name": "Natalie Pérez"
},
{
"role": "Mezzo-soprano",
"name": "Pauline Sabatier"
},
{
"role": "Tenor",
"name": "Juan Sancho"
},
{
"role": "Mezzo-soprano",
"name": "Alix Le Saux"
}
],
"program": [
{
"composer": "Francesca Caccini",
"title": "La liberazione di Ruggiero dall'isola d'Alcina"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489259",
"sourceUrl": "https://openagenda.com/victoria-hall/events/50654815_alcina-opera-de-francesca-caccini",
"source": "geneva_victoria_hall"
},
{
"id": "real-musikkollegium-9444",
"title": "Beethoven & Goetz",
"series": "Kammermusik Liebestrasse",
"start": "2026-12-13T17:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueName": "Liebestrasse",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Anzhela Golubyeva Staub"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Cello",
"name": "Franz Ortner"
},
{
"role": "Double bass",
"name": "Josef Gilgenreiner"
},
{
"role": "Piano",
"name": "Martin Lucas Staub"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klavierquartett Es-Dur, WoO 36/1",
"composerId": "beethoven"
},
{
"composer": "Hermann Goetz",
"title": "Klavierquintett c-Moll, op. 16"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179107/",
"sourceUrl": "https://www.musikkollegium.ch/programm/beethoven-goetz-26-12-13-9444",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055622",
"title": "Jan Willem de Vriend mit Rossini",
"series": null,
"start": "2026-12-13T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
},
{
"role": "Performer",
"name": "Mari Eriksmoen"
},
{
"role": "Performer",
"name": "Álvaro Zambrano"
},
{
"role": "Performer",
"name": "Lucie Horsch"
},
{
"role": "Performer",
"name": "Leonardo Cortellazzi"
},
{
"role": "Performer",
"name": "Enrico Marabelli"
},
{
"role": "Performer",
"name": "André Morsch"
}
],
"program": [
{
"composer": "Rossini",
"title": "",
"composerId": "rossini"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5587&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jan-willem-de-vriend-mit-rossini-2055622/",
"source": "tonhalle"
},
{
"id": "real-osr-les-noces-de-figaro-20261213",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-13T17:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199953",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-12-13T20:30:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15372&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-4-20261214",
"title": "Passons aux Salons #4",
"series": "Passons aux Salons",
"start": "2026-12-14T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215270&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-4",
"source": "ocg"
},
{
"id": "real-stadtcasino_basel-14122026_kob",
"title": "Kammerorchester Basel mit Isabelle Faust und Kristian Bezuidenhout – Mozartkugeln",
"series": "Musiksaal",
"start": "2026-12-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Isabelle Faust"
},
{
"role": "Fortepiano",
"name": "Kristian Bezuidenhout"
},
{
"role": "Conductor",
"name": "Kristian Bezuidenhout"
},
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate für Hammerklavier und Violine in G-Dur KV, 379",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Violine und Orchester Nr. 2 in D-Dur, KV 211",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Rondo für Violine und Orchester in C-Dur, KV 373",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonie Nr. 40 in g-Moll, KV 550",
"composerId": "mozart"
},
{
"composer": "Joseph Martin Kraus",
"title": "Ouvertüre zur Schauspielmusik «Olympie» (Trauerspiel von Johan Henrik Kellgren nach Voltaire) VB 133",
"composerId": "martin"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Kammerorchester_Basel/shop/event/162215/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/14122026_kob/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-200079",
"title": "Liederabend Bryn Terfel",
"series": "Liederabende",
"start": "2026-12-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Patrick Rimes"
},
{
"role": "Bass-baritone",
"name": "Bryn Terfel"
}
],
"program": [
{
"composer": "Sänger",
"title": "innen des Internationalen Opernstudios"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15434&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/liederabend-bryn-terfel-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055625",
"title": "Orgelrezital: Wayne Marshall",
"series": null,
"start": "2026-12-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Organ",
"name": "Wayne Marshall"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Hakim",
"title": ""
},
{
"composer": "Messiaen",
"title": "",
"composerId": "messiaen"
},
{
"composer": "Mulet",
"title": ""
},
{
"composer": "Baker",
"title": ""
},
{
"composer": "Franck",
"title": ""
},
{
"composer": "Marshall",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5699&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orgelrezital-wayne-marshall-2055625/",
"source": "tonhalle"
},
{
"id": "real-osr-les-noces-de-figaro-20261215",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-15T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200082",
"title": "Manon Lescaut",
"series": "Hauptbühne",
"start": "2026-12-15T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Francesco Ivan Ciampa"
},
{
"role": "Manon Lescaut",
"name": "Sonya Yoncheva"
},
{
"role": "Lescaut",
"name": "Lauri Vasar"
},
{
"role": "Il cavaliere Des Grieux",
"name": "Joshua Guerrero"
},
{
"role": "Geronte di Ravoir",
"name": "Shavleg Armasi"
},
{
"role": "Edmondo",
"name": "Daniel Norman"
},
{
"role": "Un musico",
"name": "Marcela Rahal"
},
{
"role": "Il maestro di ballo",
"name": "Salvador Villanueva"
},
{
"role": "Ninetta",
"name": "Tautvydas Slizauskas"
},
{
"role": "Un comandante",
"name": "Theodore McAlindon"
},
{
"role": "L'oste",
"name": "Valeriy Murga"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "Manon Lescaut",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15247&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/manon-lescaut/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9400",
"title": "Purcell, Haydn, Britten",
"series": "Hauskonzert",
"start": "2026-12-15T19:00:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Winterthurer Streichquartett"
},
{
"role": "Violin",
"name": "Bogdan Božović"
},
{
"role": "Violin",
"name": "Francesco Sica"
},
{
"role": "Viola",
"name": "Jürg Dähler"
},
{
"role": "Cello",
"name": "Flurin Cuonz"
}
],
"program": [
{
"composer": "Henry Purcell",
"title": "Chacony g-Moll, Z 730, arrangiert für Streichquartett von Benjamin Britten"
},
{
"composer": "Joseph Haydn",
"title": "Streichquartett C-Dur, op. 54/2",
"composerId": "haydn"
},
{
"composer": "Benjamin Britten",
"title": "Streichquartett Nr. 2 C-Dur, op. 36"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/173498/",
"sourceUrl": "https://www.musikkollegium.ch/programm/purcell-haydn-britten-26-12-15-9400",
"source": "musikkollegium"
},
{
"id": "real-lso_luzern-19897",
"title": "Weihnachtssingen «AN DIE FREUDE»",
"series": "Sinfoniekonzerte",
"start": "2026-12-16T18:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lars Corijn"
},
{
"role": "Choir",
"name": "Luzerner Mädchenchor und Luzerner Sängerknaben"
},
{
"role": "Chorus master",
"name": "Eberhard Rex"
},
{
"role": "Choir",
"name": "Nachwuchschöre der Luzerner Kantorei"
},
{
"role": "Chorus master",
"name": "Tabea Schöll"
},
{
"role": "Choir",
"name": "Konzertchor Klangwerk Luzern"
},
{
"role": "Chorus master",
"name": "Moana N. Labbate"
},
{
"role": "Choir",
"name": "ChorTon Vokalensemble"
},
{
"role": "Chorus master",
"name": "Gerhard Unternährer"
},
{
"role": "Director",
"name": "Philipp Lossau"
},
{
"role": "Puppeteer",
"name": "Janna Mohr"
},
{
"role": "Puppeteer",
"name": "Christoph Levermann"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "John Rutter",
"title": "Auszüge aus Mass of the Children – Kyrie, Gloria"
},
{
"composer": "John Rutter",
"title": "«Blow, Blow, thou Winter Wind» aus Five Meditations for Orchestra"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 9 in d-Moll, op. 125, Ausschnitt aus Satz IV (Finale) «Ode an die Freude»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/an-die-freude-weihnachtssingen-fur-kinder-fmilie-egsmxx",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/an-die-freude/",
"source": "lso_luzern"
},
{
"id": "real-sob-12220",
"title": "1001 Nacht",
"series": "Sinfoniekonzert",
"start": "2026-12-16T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Friederike Starkloff"
},
{
"role": "Horn",
"name": "Zora Slokar"
},
{
"role": "Conductor",
"name": "Katharina Wincor"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ouvertüre \"Die Hebriden\", op. 26",
"composerId": "mendelssohn"
},
{
"composer": "Ethel Smyth",
"title": "Konzert für Violine, Horn und Orchester"
},
{
"composer": "Nikolai A. Rimski-Korsakow",
"title": "\"Scheherazade\", op. 35"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078765&productId=10229721147336&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/1001-nacht/12220",
"source": "sob"
},
{
"id": "real-stadtcasino_basel-161226rs",
"title": "David Khrikuli",
"series": "AMG Rising Stars",
"start": "2026-12-16T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "David Khrikuli"
}
],
"program": [
{
"composer": "Johannes Brahms",
"title": "Vier Klavierstücke op. 119",
"composerId": "brahms"
},
{
"composer": "Robert Schumann",
"title": "Kreisleriana op. 16",
"composerId": "schumann"
},
{
"composer": "Frédéric Chopin",
"title": "Walzer op. 42 As-Dur",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Mazurka op. 41 Nr. 4 cis-Moll",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Mazurka op. 56 Nr. 2 C-Dur",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Mazurka op. 17 Nr. 4 a-Moll",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Sonate Nr. 3 h-Moll op. 58",
"composerId": "chopin"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=239",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/161226rs/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-199954",
"title": "Elektra",
"series": "Hauptbühne",
"start": "2026-12-16T19:30:00+01:00",
"durationMin": 110,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lorenzo Viotti"
},
{
"role": "Klytämnestra",
"name": "Tanja Ariane Baumgartner"
},
{
"role": "Elektra",
"name": "Miina-Liisa Värelä"
},
{
"role": "Chrysothemis",
"name": "Sara Jakubiak"
},
{
"role": "Aegisth",
"name": "John Daszak"
},
{
"role": "Orest",
"name": "Gábor Bretz"
},
{
"role": "Der Pfleger des Orest",
"name": "Brent Michael Smith"
},
{
"role": "Die Vertraute",
"name": "Mariam Suleiman"
},
{
"role": "Die Schleppträgerin",
"name": "Hannah McKay"
},
{
"role": "Ein junger Diener",
"name": "Nathan Haller"
},
{
"role": "Ein alter Diener",
"name": "Valeriy Murga"
},
{
"role": "Die Aufseherin",
"name": "Melanie Diener"
},
{
"role": "Die erste Magd",
"name": "Dominika Stefańska"
},
{
"role": "Die zweite Magd",
"name": "Cashlin Oostindië"
},
{
"role": "Die dritte Magd",
"name": "Irène Friedli"
},
{
"role": "Die vierte Magd",
"name": "Natália Tuznik"
},
{
"role": "Die fünfte Magd",
"name": "Sonja Herranen"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Zusatzchor der Oper Zürich"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Elektra",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15373&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/elektra-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-majestueux-brahms-20261216",
"title": "Majestueux Brahms",
"series": "Série O",
"start": "2026-12-16T19:30:00+01:00",
"durationMin": 130,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Pablo Heras-Casado"
},
{
"role": "Violin",
"name": "Patricia Kopatchinskaja"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Igor Stravinski",
"title": "Pulcinella, suite pour orchestre"
},
{
"composer": "Dimitri Chostakovitch",
"title": "Concerto pour violon et orchestre N° 2 en ut dièse mineur op. 129"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie N° 4 en mi mineur op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/majestueux-brahms",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/majestueux-brahms",
"source": "osr"
},
{
"id": "real-lso_luzern-19892",
"title": "«FREUDE, SCHÖNER GÖTTERFUNKEN»",
"series": "Sinfoniekonzerte",
"start": "2026-12-16T19:30:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lars Corijn"
},
{
"role": "Choir",
"name": "Luzerner Mädchenchor und Luzerner Sängerknaben"
},
{
"role": "Chorus master",
"name": "Eberhard Rex"
},
{
"role": "Choir",
"name": "Konzertchor Klangwerk Luzern"
},
{
"role": "Chorus master",
"name": "Moana N. Labbate"
},
{
"role": "Choir",
"name": "ChorTon Vokalensemble"
},
{
"role": "Chorus master",
"name": "Gerhard Unternährer"
},
{
"role": "Viola",
"name": "Madeleine Burkhalter"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zur Oper Fidelio, op. 72",
"composerId": "beethoven"
},
{
"composer": "John Rutter",
"title": "Mass of the Children"
},
{
"composer": "John Rutter",
"title": "«Blow, Blow, thou Winter Wind» aus Five Meditations for Orchestra"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 9 in d-Moll, op. 125, Ausschnitt aus Satz IV (Finale) «Ode an die Freude»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/freude-schoner-gotterfunke-weihnachtliches-sinfo-bcx8lx",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/freude-schoener-goetterfunken/",
"source": "lso_luzern"
},
{
"id": "real-geneva_grand_theatre-19808698-20261216",
"title": "Lea Desandre",
"series": null,
"start": "2026-12-16T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Mezzo-soprano",
"name": "Lea Desandre"
},
{
"role": "Lute",
"name": "Thomas Dunford"
}
],
"program": [],
"ticketUrl": "https://www.gtg.ch/saison-26-27/lea-desandre/",
"sourceUrl": "https://www.gtg.ch/saison-26-27/lea-desandre/",
"source": "geneva_grand_theatre"
},
{
"id": "real-tonhalle-2055632",
"title": "Orchester-Lunchkonzert mit Jan Willem de Vriend",
"series": "Orchester-Lunchkonzert",
"start": "2026-12-17T12:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Händel",
"title": "",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5606&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orchester-lunchkonzert-mit-jan-willem-de-vriend-2055632/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200203",
"title": "Das Rheingold",
"series": "Hauptbühne",
"start": "2026-12-17T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Donner",
"name": "Daniel Schmutzhard"
},
{
"role": "Froh",
"name": "Johan Krogius"
},
{
"role": "Loge",
"name": "Matthias Klink"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Freia",
"name": "Kiandra Howarth"
},
{
"role": "Erda",
"name": "Noa Beinart"
},
{
"role": "Alberich",
"name": "Christopher Purves"
},
{
"role": "Mime",
"name": "Wolfgang Ablinger-Sperrhacke"
},
{
"role": "Fasolt",
"name": "David Steffens"
},
{
"role": "Fafner",
"name": "Brent Michael Smith"
},
{
"role": "Wellgunde",
"name": "Marcela Rahal"
},
{
"role": "Flosshilde",
"name": "Siena Licht Miller"
},
{
"role": "Woglinde",
"name": "Victoria Randem"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Das Rheingold",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15165&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/das-rheingold/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-les-noces-de-figaro-20261217",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-17T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-sob-12219",
"title": "1001 Nacht",
"series": "Sinfoniekonzert",
"start": "2026-12-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Friederike Starkloff"
},
{
"role": "Horn",
"name": "Zora Slokar"
},
{
"role": "Conductor",
"name": "Katharina Wincor"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ouvertüre \"Die Hebriden\", op. 26",
"composerId": "mendelssohn"
},
{
"composer": "Ethel Smyth",
"title": "Konzert für Violine, Horn und Orchester"
},
{
"composer": "Nikolai A. Rimski-Korsakow",
"title": "\"Scheherazade\", op. 35"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078766&productId=10229721147336&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/1001-nacht/12219",
"source": "sob"
},
{
"id": "real-tonhalle-2055633",
"title": "Jan Willem de Vriend & Kebyart Saxophone Quartet",
"series": null,
"start": "2026-12-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
},
{
"role": "Ensemble",
"name": "Kebyart"
},
{
"role": "Soprano saxophone",
"name": "Pere Méndez"
},
{
"role": "Alto saxophone",
"name": "Victor Serra"
},
{
"role": "Tenor saxophone",
"name": "Robert Seara"
},
{
"role": "Baritone saxophone",
"name": "Daniel Miguel"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
},
{
"composer": "Händel",
"title": "",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5596&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jan-willem-de-vriend-kebyart-saxophone-quartet-2055633/",
"source": "tonhalle"
},
{
"id": "real-osr-majestueux-brahms-20261217",
"title": "Majestueux Brahms",
"series": "Série S",
"start": "2026-12-17T19:30:00+01:00",
"durationMin": 130,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Pablo Heras-Casado"
},
{
"role": "Violin",
"name": "Patricia Kopatchinskaja"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Igor Stravinski",
"title": "Pulcinella, suite pour orchestre"
},
{
"composer": "Dimitri Chostakovitch",
"title": "Concerto pour violon et orchestre N° 2 en ut dièse mineur op. 129"
},
{
"composer": "Johannes Brahms",
"title": "Symphonie N° 4 en mi mineur op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/majestueux-brahms",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/majestueux-brahms",
"source": "osr"
},
{
"id": "real-zko-19675",
"title": "Weihnachtskonzerte",
"series": null,
"start": "2026-12-17T19:30:00+01:00",
"durationMin": 90,
"cityId": "zurich",
"venueId": "fraumunster-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "André Fischer"
},
{
"role": "Soprano",
"name": "Mirjam Wernli"
},
{
"role": "Mezzo-soprano",
"name": "Anne Heffner"
},
{
"role": "Tenor",
"name": "Andrés Montilla Acurero"
},
{
"role": "Bass-baritone",
"name": "Markus Volpert"
},
{
"role": "Choir",
"name": "Zürcher Konzertchor"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Jan Pieterszoon Sweelinck",
"title": "Hodie Christus natus est"
},
{
"composer": "Cristòfer Taltabull",
"title": "Ecce panis angelorum"
},
{
"composer": "Jan Dismas Zelenka",
"title": "Hipocondrie, ZWV 187"
},
{
"composer": "Jan Dismas Zelenka",
"title": "Ecce nunc benedicite, ZWV 99"
},
{
"composer": "Johann Kuhnau",
"title": "Magnificat C-Dur"
},
{
"composer": "César Franck",
"title": "III. Credo, V. Panis angelicus und VI. Agnus dei, aus: Messe solennelle A-Dur, op. 12"
},
{
"composer": "Carl Philipp Emanuel Bach",
"title": "Heilig, Wq. 217",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1966",
"sourceUrl": "https://zko.ch/events/zko-weihnachtskonzerte-2026-27/",
"source": "zko"
},
{
"id": "real-osr-les-noces-de-figaro-20261218",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-18T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Jared Mac Werlein"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200083",
"title": "Manon Lescaut",
"series": "Hauptbühne",
"start": "2026-12-18T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Francesco Ivan Ciampa"
},
{
"role": "Manon Lescaut",
"name": "Sonya Yoncheva"
},
{
"role": "Lescaut",
"name": "Lauri Vasar"
},
{
"role": "Il cavaliere Des Grieux",
"name": "Joshua Guerrero"
},
{
"role": "Geronte di Ravoir",
"name": "Shavleg Armasi"
},
{
"role": "Edmondo",
"name": "Daniel Norman"
},
{
"role": "Un musico",
"name": "Marcela Rahal"
},
{
"role": "Il maestro di ballo",
"name": "Salvador Villanueva"
},
{
"role": "Ninetta",
"name": "Tautvydas Slizauskas"
},
{
"role": "Un comandante",
"name": "Theodore McAlindon"
},
{
"role": "L'oste",
"name": "Valeriy Murga"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "Manon Lescaut",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15248&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/manon-lescaut/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9429",
"title": "West Side Story",
"series": "Film & Musik",
"start": "2026-12-18T19:00:00+01:00",
"durationMin": 180,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Anthony Gabriele"
}
],
"program": [],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3224",
"sourceUrl": "https://www.musikkollegium.ch/programm/west-side-story-26-12-18-9429",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055630",
"title": "Jan Willem de Vriend & Kebyart Saxophone Quartet",
"series": null,
"start": "2026-12-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Jan Willem de Vriend"
},
{
"role": "Ensemble",
"name": "Kebyart"
},
{
"role": "Soprano saxophone",
"name": "Pere Méndez"
},
{
"role": "Alto saxophone",
"name": "Victor Serra"
},
{
"role": "Tenor saxophone",
"name": "Robert Seara"
},
{
"role": "Baritone saxophone",
"name": "Daniel Miguel"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
},
{
"composer": "Händel",
"title": "",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5561&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jan-willem-de-vriend-kebyart-saxophone-quartet-2055630/",
"source": "tonhalle"
},
{
"id": "real-zko-19676",
"title": "Weihnachtskonzerte",
"series": null,
"start": "2026-12-18T19:30:00+01:00",
"durationMin": 90,
"cityId": "zurich",
"venueId": "fraumunster-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "André Fischer"
},
{
"role": "Soprano",
"name": "Mirjam Wernli"
},
{
"role": "Mezzo-soprano",
"name": "Anne Heffner"
},
{
"role": "Tenor",
"name": "Andrés Montilla Acurero"
},
{
"role": "Bass-baritone",
"name": "Markus Volpert"
},
{
"role": "Choir",
"name": "Zürcher Konzertchor"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Jan Pieterszoon Sweelinck",
"title": "Hodie Christus natus est"
},
{
"composer": "Cristòfer Taltabull",
"title": "Ecce panis angelorum"
},
{
"composer": "Jan Dismas Zelenka",
"title": "Hipocondrie, ZWV 187"
},
{
"composer": "Jan Dismas Zelenka",
"title": "Ecce nunc benedicite, ZWV 99"
},
{
"composer": "Johann Kuhnau",
"title": "Magnificat C-Dur"
},
{
"composer": "César Franck",
"title": "III. Credo, V. Panis angelicus und VI. Agnus dei, aus: Messe solennelle A-Dur, op. 12"
},
{
"composer": "Carl Philipp Emanuel Bach",
"title": "Heilig, Wq. 217",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1967",
"sourceUrl": "https://zko.ch/events/zko-weihnachtskonzerte-2026/",
"source": "zko"
},
{
"id": "real-ocg-eternel-beethoven-20261219",
"title": "Éternel Beethoven",
"series": null,
"start": "2026-12-19T18:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "La Psalette de Genève"
},
{
"role": "Conductor",
"name": "Steve Dunn"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Messe en ut majeur",
"composerId": "beethoven"
},
{
"composer": "Morten Lauridsen",
"title": "Lux Aeterna"
}
],
"ticketUrl": "https://locg.ch/fr/calendrier/eternel-beethoven",
"sourceUrl": "https://locg.ch/fr/calendrier/eternel-beethoven",
"source": "ocg"
},
{
"id": "real-tonhalle-2056739",
"title": "Weihnachtliche Sternstunden",
"series": null,
"start": "2026-12-19T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Stuttgarter Philharmoniker"
},
{
"role": "Conductor",
"name": "Juya Shin"
},
{
"role": "Violin",
"name": "Maria Solozobova"
},
{
"role": "Piano",
"name": "Congyu Wang"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Tschaikowsky",
"title": ""
}
],
"ticketUrl": "https://www.ticketino.com/de/event/masterinterpreten-opus-48-weihnachtskonzert/211337",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/weihnachtliche-sternstunden-2056739/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199868",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-12-19T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15238&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9430",
"title": "West Side Story",
"series": "Film & Musik",
"start": "2026-12-19T19:00:00+01:00",
"durationMin": 180,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Anthony Gabriele"
}
],
"program": [],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3225",
"sourceUrl": "https://www.musikkollegium.ch/programm/west-side-story-26-12-19-9430",
"source": "musikkollegium"
},
{
"id": "real-stadtcasino_basel-terra_nova_collective",
"title": "Terra Nova Collective – Kammerorchesterkonzert",
"series": "Hans Huber-Saal",
"start": "2026-12-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Vlad Weverbergh"
},
{
"role": "Clarinet",
"name": "Vlad Weverbergh"
}
],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/noapp/event/kammerorchester-basel-terra-nova-collective-stadtcasino-basel-21817873/?affiliate=MWY&utm_campaign=biderundtanner&utm_source=MWY&utm_medium=dp",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/terra_nova_collective/",
"source": "stadtcasino_basel"
},
{
"id": "real-stadtcasino_basel-20122026",
"title": "Chamber Academy Basel",
"series": "AMG SunDay Concerts",
"start": "2026-12-20T11:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Meesun Hong Coleman"
},
{
"role": "Mezzo-soprano",
"name": "Tanja Ariane Baumgartner"
}
],
"program": [
{
"composer": "Arcangelo Corelli",
"title": "Concerto Grosso op. 6, Nr. 8, Fatto per la notte di Natale"
},
{
"composer": "Johann Sebastian Bach",
"title": "Bereite dich, Zion (BWV 248, Teil II) aus dem Weihnachtsoratorium",
"composerId": "bach"
},
{
"composer": "Georg Friedrich Händel",
"title": "He Shall Feed His Flock (HWV 56) aus dem Messiah",
"composerId": "handel"
},
{
"composer": "Georg Friedrich Händel",
"title": "Verdi, Prati (HWV 132)",
"composerId": "handel"
},
{
"composer": "Alessandro Scarlatti",
"title": "Dormi, O fulmine guerra aus Il Giuditta"
},
{
"composer": "Johannes Brahms",
"title": "Streichquintett G-Dur, Op. 111, arrangiert für Streichorchester",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=217",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/20122026/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9431",
"title": "West Side Story",
"series": "Film & Musik",
"start": "2026-12-20T14:30:00+01:00",
"durationMin": 180,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Anthony Gabriele"
}
],
"program": [],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3226",
"sourceUrl": "https://www.musikkollegium.ch/programm/west-side-story-26-12-20-9431",
"source": "musikkollegium"
},
{
"id": "real-osr-les-noces-de-figaro-20261220",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-20T15:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opera_lausanne-giuditta-20261220-1700",
"title": "Giuditta",
"series": null,
"start": "2026-12-20T17:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Rösner"
},
{
"role": "Stage director",
"name": "Pierre-André Weitz"
},
{
"role": "Giuditta",
"name": "Camille Schnoor"
},
{
"role": "Anita",
"name": "Sandrine Buendia"
},
{
"role": "Octavio",
"name": "Julien Henric"
},
{
"role": "Manuel, Lord Barrymore, Son Altesse",
"name": "Nicolas Rivenq"
},
{
"role": "Séraphin",
"name": "Jean Miannay"
},
{
"role": "Marcelin, l'Attaché, Ibrahim, un Chanteur de rue",
"name": "Christophe Gay"
},
{
"role": "Jean Cévenol",
"name": "Jacques Verzier"
},
{
"role": "L'Hôtelier, le Maître d'hôtel",
"name": "Rodolphe Briand"
},
{
"role": "Le Garçon de restaurant, un Chanteur de rue, un Sous-officier, un Pêcheur",
"name": "Pierre Lebon"
},
{
"role": "Lolitta/Le chasseur de l’Alcazar",
"name": "Christina Koubbi"
},
{
"role": "L’acheteur",
"name": "Mohamed Haidar"
},
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Anass Ismat"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Giuditta"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098113",
"sourceUrl": "https://www.opera-lausanne.ch/show/giuditta/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2056742",
"title": "Händel, Messiah",
"series": null,
"start": "2026-12-20T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Schweizer Jugendchor"
},
{
"role": "Orchestra",
"name": "La Cetra Barockorchester Basel"
},
{
"role": "Conductor",
"name": "Nicolas Fink"
}
],
"program": [
{
"composer": "Händel",
"title": "",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5658&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/haendel-messiah-2056742/tz/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-74703095-20261220",
"title": "Violonissimo & Camerata Contrepoint – With Love – Concert de gala",
"series": null,
"start": "2026-12-20T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Contrepoint"
},
{
"role": "Violin",
"name": "Nathaniel Shapiro"
},
{
"role": "Viola",
"name": "Barry Shapiro"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Symphonie concertante pour violon, alto et orchestre",
"composerId": "mozart"
},
{
"composer": "Antonio Vivaldi",
"title": "L’Hiver (Les Quatre Saisons)",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://openagenda.com/victoria-hall-client/events/74703095_violonissimo-camerata-contrepoint",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/74703095_violonissimo-camerata-contrepoint",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200279",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2026-12-20T18:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15273&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-5-20261221",
"title": "Passons aux Salons #5",
"series": "Passons aux Salons",
"start": "2026-12-21T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215271&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-5",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200259",
"title": "2. La Scintilla Konzert",
"series": "La Scintilla",
"start": "2026-12-21T19:00:00+01:00",
"durationMin": 100,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Boris Begelman"
},
{
"role": "Soprano",
"name": "Giulia Semenzato"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
}
],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "",
"composerId": "handel"
},
{
"composer": "Antonio Vivaldi",
"title": "",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15466&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/scintilla-konzert-2/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-giuditta-20261222-1900",
"title": "Giuditta",
"series": null,
"start": "2026-12-22T19:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Rösner"
},
{
"role": "Stage director",
"name": "Pierre-André Weitz"
},
{
"role": "Giuditta",
"name": "Camille Schnoor"
},
{
"role": "Anita",
"name": "Sandrine Buendia"
},
{
"role": "Octavio",
"name": "Julien Henric"
},
{
"role": "Manuel, Lord Barrymore, Son Altesse",
"name": "Nicolas Rivenq"
},
{
"role": "Séraphin",
"name": "Jean Miannay"
},
{
"role": "Marcelin, l'Attaché, Ibrahim, un Chanteur de rue",
"name": "Christophe Gay"
},
{
"role": "Jean Cévenol",
"name": "Jacques Verzier"
},
{
"role": "L'Hôtelier, le Maître d'hôtel",
"name": "Rodolphe Briand"
},
{
"role": "Le Garçon de restaurant, un Chanteur de rue, un Sous-officier, un Pêcheur",
"name": "Pierre Lebon"
},
{
"role": "Lolitta/Le chasseur de l’Alcazar",
"name": "Christina Koubbi"
},
{
"role": "L’acheteur",
"name": "Mohamed Haidar"
},
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Anass Ismat"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Giuditta"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098113",
"sourceUrl": "https://www.opera-lausanne.ch/show/giuditta/",
"source": "opera_lausanne"
},
{
"id": "real-osr-les-noces-de-figaro-20261222",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-22T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200084",
"title": "Manon Lescaut",
"series": "Hauptbühne",
"start": "2026-12-22T19:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Francesco Ivan Ciampa"
},
{
"role": "Manon Lescaut",
"name": "Sonya Yoncheva"
},
{
"role": "Lescaut",
"name": "Lauri Vasar"
},
{
"role": "Il cavaliere Des Grieux",
"name": "Joshua Guerrero"
},
{
"role": "Geronte di Ravoir",
"name": "Shavleg Armasi"
},
{
"role": "Edmondo",
"name": "Daniel Norman"
},
{
"role": "Un musico",
"name": "Marcela Rahal"
},
{
"role": "Il maestro di ballo",
"name": "Salvador Villanueva"
},
{
"role": "Ninetta",
"name": "Tautvydas Slizauskas"
},
{
"role": "Un comandante",
"name": "Theodore McAlindon"
},
{
"role": "L'oste",
"name": "Valeriy Murga"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "Manon Lescaut",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15249&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/manon-lescaut/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056745",
"title": "Die grosse Weihnachtsgala",
"series": null,
"start": "2026-12-22T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie Baden-Baden"
},
{
"role": "Choir",
"name": "Tschechischer Philharmonischer Chor Brno"
},
{
"role": "Narrator",
"name": "Dani Fohrler"
},
{
"role": "Conductor",
"name": "Manfred Obrecht"
},
{
"role": "Soprano",
"name": "Laura Ulloa"
},
{
"role": "Mezzo-soprano",
"name": "Josy Santos"
}
],
"program": [
{
"composer": "Händel",
"title": "",
"composerId": "handel"
},
{
"composer": "Martini",
"title": ""
},
{
"composer": "Adam",
"title": ""
},
{
"composer": "Svoboda",
"title": ""
},
{
"composer": "Silvestri",
"title": ""
},
{
"composer": "Christmas",
"title": ""
},
{
"composer": "Alex North & Hy Zaret",
"title": ""
},
{
"composer": "Anderson",
"title": ""
},
{
"composer": "Stolz",
"title": ""
},
{
"composer": "Williams",
"title": ""
},
{
"composer": "Feliciano",
"title": ""
},
{
"composer": "Gruber",
"title": ""
}
],
"ticketUrl": "https://www.obrassoconcerts.ch/programm/die-grosse-weihnachtsgala",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/die-grosse-weihnachtsgala-2056745/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200280",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2026-12-23T20:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15305&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-93338607-20261224",
"title": "Concert de Noël: chants de Noël, classique, airs et duo d’opéra, jazz et improvisations avec les artistes de Concertus",
"series": null,
"start": "2026-12-24T11:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie-culture.geneve.ch/",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/93338607_concert-de-noel-chants-de-noel-classique-airs-et-duo-dopera-jazz-improvisations-avec-les-artistes-de-concertus-orchestre-choeur-et-solistes",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055644",
"title": "Festtags-Matinee",
"series": null,
"start": "2026-12-26T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Horn & Wagner tuba",
"name": "Pascal Deuber"
},
{
"role": "Horn",
"name": "Robert Teutsch"
},
{
"role": "Violin",
"name": "Eliza Wong"
},
{
"role": "Violin",
"name": "Josef Gazsi"
},
{
"role": "Viola",
"name": "Juan Carlos Escobar Ossa"
},
{
"role": "Cello",
"name": "Sandro Meszaros"
}
],
"program": [
{
"composer": "Häussler",
"title": ""
},
{
"composer": "Koetsier",
"title": ""
},
{
"composer": "Webern",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5631&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/festtags-matinee-2055644/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200085",
"title": "Manon Lescaut",
"series": "Hauptbühne",
"start": "2026-12-26T13:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Francesco Ivan Ciampa"
},
{
"role": "Manon Lescaut",
"name": "Sonya Yoncheva"
},
{
"role": "Lescaut",
"name": "Lauri Vasar"
},
{
"role": "Il cavaliere Des Grieux",
"name": "Joshua Guerrero"
},
{
"role": "Geronte di Ravoir",
"name": "Shavleg Armasi"
},
{
"role": "Edmondo",
"name": "Daniel Norman"
},
{
"role": "Un musico",
"name": "Marcela Rahal"
},
{
"role": "Il maestro di ballo",
"name": "Salvador Villanueva"
},
{
"role": "Ninetta",
"name": "Tautvydas Slizauskas"
},
{
"role": "Un comandante",
"name": "Theodore McAlindon"
},
{
"role": "L'oste",
"name": "Valeriy Murga"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "Manon Lescaut",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15250&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/manon-lescaut/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-les-noces-de-figaro-20261226",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-26T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199869",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-12-26T19:30:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15239&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200302",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2026-12-27T13:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15150&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-giuditta-20261227-1500",
"title": "Giuditta",
"series": null,
"start": "2026-12-27T15:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Rösner"
},
{
"role": "Stage director",
"name": "Pierre-André Weitz"
},
{
"role": "Giuditta",
"name": "Camille Schnoor"
},
{
"role": "Anita",
"name": "Sandrine Buendia"
},
{
"role": "Octavio",
"name": "Julien Henric"
},
{
"role": "Manuel, Lord Barrymore, Son Altesse",
"name": "Nicolas Rivenq"
},
{
"role": "Séraphin",
"name": "Jean Miannay"
},
{
"role": "Marcelin, l'Attaché, Ibrahim, un Chanteur de rue",
"name": "Christophe Gay"
},
{
"role": "Jean Cévenol",
"name": "Jacques Verzier"
},
{
"role": "L'Hôtelier, le Maître d'hôtel",
"name": "Rodolphe Briand"
},
{
"role": "Le Garçon de restaurant, un Chanteur de rue, un Sous-officier, un Pêcheur",
"name": "Pierre Lebon"
},
{
"role": "Lolitta/Le chasseur de l’Alcazar",
"name": "Christina Koubbi"
},
{
"role": "L’acheteur",
"name": "Mohamed Haidar"
},
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Anass Ismat"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Giuditta"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098113",
"sourceUrl": "https://www.opera-lausanne.ch/show/giuditta/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2056748",
"title": "Die grosse Giuseppe Verdi Gala",
"series": null,
"start": "2026-12-27T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Chor und Orchester der Opera Polska"
},
{
"role": "Conductor",
"name": "Marcin Wolniewski"
}
],
"program": [],
"ticketUrl": "https://www.actnews.ch/events/die-grosse-giuseppe-verdi-gala-2026",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/die-grosse-giuseppe-verdi-gala-2056748/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199870",
"title": "Romeo und Julia",
"series": "Hauptbühne",
"start": "2026-12-27T20:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Romeo und Julia"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15240&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-und-julia-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-les-noces-de-figaro-20261228",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-28T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Jared Mac Werlein"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-opera_lausanne-giuditta-20261229-1900",
"title": "Giuditta",
"series": null,
"start": "2026-12-29T19:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Rösner"
},
{
"role": "Stage director",
"name": "Pierre-André Weitz"
},
{
"role": "Giuditta",
"name": "Camille Schnoor"
},
{
"role": "Anita",
"name": "Sandrine Buendia"
},
{
"role": "Octavio",
"name": "Julien Henric"
},
{
"role": "Manuel, Lord Barrymore, Son Altesse",
"name": "Nicolas Rivenq"
},
{
"role": "Séraphin",
"name": "Jean Miannay"
},
{
"role": "Marcelin, l'Attaché, Ibrahim, un Chanteur de rue",
"name": "Christophe Gay"
},
{
"role": "Jean Cévenol",
"name": "Jacques Verzier"
},
{
"role": "L'Hôtelier, le Maître d'hôtel",
"name": "Rodolphe Briand"
},
{
"role": "Le Garçon de restaurant, un Chanteur de rue, un Sous-officier, un Pêcheur",
"name": "Pierre Lebon"
},
{
"role": "Lolitta/Le chasseur de l’Alcazar",
"name": "Christina Koubbi"
},
{
"role": "L’acheteur",
"name": "Mohamed Haidar"
},
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Anass Ismat"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Giuditta"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098113",
"sourceUrl": "https://www.opera-lausanne.ch/show/giuditta/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-200281",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2026-12-29T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15306&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-les-noces-de-figaro-20261229",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-29T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-geneva_victoria_hall-9713065-20261229",
"title": "Le grand gala de Giuseppe Verdi – Les plus belles scènes des grands opéras de Verdi",
"series": null,
"start": "2026-12-29T19:30:00+01:00",
"durationMin": 150,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/event/die-grosse-giuseppe-verdi-gala-2026-victoria-hall-21244261/?affiliate=AE2",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/9713065_le-grand-gala-de-giuseppe-verdi-3962912",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055650",
"title": "Silvesterkonzert mit Wayne Marshall",
"series": null,
"start": "2026-12-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Wayne Marshall"
}
],
"program": [
{
"composer": "Gershwin",
"title": ""
},
{
"composer": "Ellington",
"title": ""
},
{
"composer": "Bernstein",
"title": ""
},
{
"composer": "Tschaikowsky",
"title": ""
},
{
"composer": "Farrington",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5700&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/silvesterkonzert-mit-wayne-marshall-2055650/",
"source": "tonhalle"
},
{
"id": "real-zko-19687",
"title": "Silvesterkonzert mit Asya Fateyeva & Tjasha Gafner",
"series": null,
"start": "2026-12-31T17:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Saxophone",
"name": "Asya Fateyeva"
},
{
"role": "Harp",
"name": "Tjasha Gafner"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Germaine Tailleferre",
"title": "Concertino für Harfe und Orchester"
},
{
"composer": "Alexander Glasunow",
"title": "Konzert für Saxophon und Streichorchester Es-Dur, op. 109"
},
{
"composer": "Sergei Prokofjew",
"title": "Sinfonie Nr. 1, Klassische, op. 25"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Auszüge aus: Der Nussknacker, op. 71, bearbeitet für Saxophon und Orchester von Wolf Kerschek"
}
],
"ticketUrl": "https://www.kkl-luzern.ch/",
"sourceUrl": "https://zko.ch/events/silvesterkonzert-mit-asya-fateyeva-tjasha-gafner/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-200303",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2026-12-31T18:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15151&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-osi-205103850176693",
"title": "San Silvestro",
"series": "Concerti straordinari",
"start": "2026-12-31T18:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Anna Vinnitskaya"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Felix Mendelssohn",
"title": "Sogno di una notte di mezza estate ouverture",
"composerId": "mendelssohn"
},
{
"composer": "Alexander Borodin",
"title": "Il principe Igor Danze polovesiane per orchestra"
},
{
"composer": "Sergej Rachmaninov",
"title": "Rapsodia su un tema di Paganini (Capriccio 24) per pianoforte e orchestra op. 43"
},
{
"composer": "Witold Lutosławski",
"title": "Variazioni su un tema di Paganini per pianoforte e orchestra"
}
],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-12-31-18-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2026-12-31-18-00",
"source": "osi"
},
{
"id": "real-sob-12208",
"title": "Silvesterkonzert",
"series": "Sinfoniekonzert",
"start": "2026-12-31T18:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Chelsea Zurflüh"
},
{
"role": "Conductor",
"name": "Giampaolo Bisanti"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Gioacchino Rossini",
"title": "Ouvertüre zu \"La Cenerentola\"",
"composerId": "rossini"
},
{
"composer": "Amy Beach",
"title": "\"Extase\", Lied für Sopran und Orchester, op. 21 Nr. 2"
},
{
"composer": "Ethel Smyth",
"title": "\"Heinrich, du Starker, du Guter\" und \"O glaub mir\", Arien aus \"Der Wald\""
},
{
"composer": "Jeanine Tesori",
"title": "\"The Girl in 14G\""
},
{
"composer": "Gaetano Donizetti",
"title": "Ouvertüre zu \"Don Pasquale\""
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Polonaise aus \"Eugen Onegin\""
},
{
"composer": "Ambroise Thomas",
"title": "\"Je suis Titania\", Arie aus \"Mignon\""
},
{
"composer": "Charles Gounod",
"title": "\"Ah! Je veux vivre\", Arie aus \"Roméo et Juliette\""
},
{
"composer": "Manuel de Falla",
"title": "\"Danza ritual del fuego\", aus dem Ballett \"El amor brujo\""
},
{
"composer": "Gerónimo Giménez",
"title": "Polaca Nr. 4 \"Me llaman la primorosa...\", Arie aus \"El barbero de Sevilla\""
},
{
"workId": "jstrauss-fledermaus",
"composerId": "johann-strauss"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229728164989&productId=10229728266303&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/silvesterkonzert/12208",
"source": "sob"
},
{
"id": "real-opera_lausanne-giuditta-20261231-1900",
"title": "Giuditta",
"series": null,
"start": "2026-12-31T19:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Rösner"
},
{
"role": "Stage director",
"name": "Pierre-André Weitz"
},
{
"role": "Giuditta",
"name": "Camille Schnoor"
},
{
"role": "Anita",
"name": "Sandrine Buendia"
},
{
"role": "Octavio",
"name": "Julien Henric"
},
{
"role": "Manuel, Lord Barrymore, Son Altesse",
"name": "Nicolas Rivenq"
},
{
"role": "Séraphin",
"name": "Jean Miannay"
},
{
"role": "Marcelin, l'Attaché, Ibrahim, un Chanteur de rue",
"name": "Christophe Gay"
},
{
"role": "Jean Cévenol",
"name": "Jacques Verzier"
},
{
"role": "L'Hôtelier, le Maître d'hôtel",
"name": "Rodolphe Briand"
},
{
"role": "Le Garçon de restaurant, un Chanteur de rue, un Sous-officier, un Pêcheur",
"name": "Pierre Lebon"
},
{
"role": "Lolitta/Le chasseur de l’Alcazar",
"name": "Christina Koubbi"
},
{
"role": "L’acheteur",
"name": "Mohamed Haidar"
},
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Anass Ismat"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Giuditta"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098113",
"sourceUrl": "https://www.opera-lausanne.ch/show/giuditta/",
"source": "opera_lausanne"
},
{
"id": "real-osr-les-noces-de-figaro-20261231",
"title": "Les Noces de Figaro",
"series": null,
"start": "2026-12-31T19:00:00+01:00",
"durationMin": 210,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marta Gardolinska"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Le Comte Almaviva",
"name": "Jarrett Ott"
},
{
"role": "La Comtesse Almaviva",
"name": "Siobhan Stagg"
},
{
"role": "Suzanne",
"name": "Lauranne Oliva"
},
{
"role": "Figaro",
"name": "Philippe Sly"
},
{
"role": "Chérubin",
"name": "Benedetta Torre"
},
{
"role": "Marceline",
"name": "Monica Bacelli"
},
{
"role": "Bartholo",
"name": "Laurent Naouri"
},
{
"role": "Bazile / Don Curzio",
"name": "Glen Cunningham"
},
{
"role": "Antonio",
"name": "Jared Mac Werlein"
},
{
"role": "Barberine",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/les-noces-de-figaro",
"source": "osr"
},
{
"id": "real-tonhalle-2055653",
"title": "Silvesterkonzert mit Wayne Marshall",
"series": null,
"start": "2026-12-31T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Wayne Marshall"
}
],
"program": [
{
"composer": "Gershwin",
"title": ""
},
{
"composer": "Ellington",
"title": ""
},
{
"composer": "Bernstein",
"title": ""
},
{
"composer": "Tschaikowsky",
"title": ""
},
{
"composer": "Farrington",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5701&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/silvesterkonzert-mit-wayne-marshall-2055653/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200111",
"title": "Fuchs & Jordan",
"series": "Hauptbühne",
"start": "2027-01-01T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Jordan"
},
{
"role": "Soprano",
"name": "Julie Fuchs"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15463&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/neujahrskonzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19901",
"title": "FESTLICHES NEUJAHRSKONZERT – «ABOUT LAST NIGHT»",
"series": "Sinfoniekonzerte",
"start": "2027-01-01T17:00:00+01:00",
"durationMin": 115,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Vincenzo Milletarì"
},
{
"role": "Mezzo-soprano",
"name": "Marina Viotti"
},
{
"role": "Bass",
"name": "Mark Kurmanbayev"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Ouvertüre zur Oper L’Italiana in Algeri",
"composerId": "rossini"
},
{
"composer": "Gioachino Rossini",
"title": "Arie «Cruda sorte» aus der Oper L’Italiana in Algeri",
"composerId": "rossini"
},
{
"composer": "Georges Bizet",
"title": "Arie «Séguedille» aus der Oper Carmen",
"composerId": "bizet"
},
{
"composer": "Georges Bizet",
"title": "Arie «Votre Toast» aus der Oper Carmen",
"composerId": "bizet"
},
{
"composer": "Erik Satie",
"title": "«Je te veux»"
},
{
"composer": "Arthur Hamilton",
"title": "«Cry Me a River»"
},
{
"composer": "Norbert Glanzberg",
"title": "«Padam, Padam»"
},
{
"composer": "Jacques Offenbach",
"title": "«Galop infernal» («Höllen-Cancan») aus der Operette Orpheus in der Unterwelt"
},
{
"composer": "Jacques Offenbach",
"title": "«Je t’adore brigand» aus der Operette La Périchole"
},
{
"composer": "William Bolcom",
"title": "«Song of Black Max» aus Cabaret Songs"
},
{
"composer": "Sergei Rachmaninow",
"title": "Arie «Ves’ tabor spit» aus der Oper Aleko"
},
{
"composer": "Camille Saint-Saëns",
"title": "Arie «Mon cœur s’ouvre à ta voix» aus der Oper Samson et Dalila, op. 47",
"composerId": "saint-saens"
},
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
},
{
"workId": "jstrauss-fledermaus",
"composerId": "johann-strauss"
},
{
"composer": "Johann Strauss II",
"title": "Kaiserwalzer, op. 437",
"composerId": "johann-strauss"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/festliches-neujahrskonzert-about-last-night-hg0zdu",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/festliches-neujahrskonzert-about-last-night/",
"source": "lso_luzern"
},
{
"id": "real-stadtcasino_basel-01012027_nob",
"title": "Neues Orchester Basel – Festliches Neujahrskonzert",
"series": "Musiksaal",
"start": "2027-01-01T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christian Knüsel"
},
{
"role": "Orchestra",
"name": "Neues Orchester Basel"
}
],
"program": [
{
"composer": "Leonard Bernstein",
"title": "Candide Ouvertüre"
},
{
"composer": "Aram Chatschaturjan",
"title": "Maskerade Suite"
},
{
"composer": "Nikolai Andrejewitsch Rimski-Korsakow",
"title": "Capriccio Espagnol"
},
{
"composer": "Johann Strauss",
"title": "Sphärenklänge Walzer",
"composerId": "johann-strauss"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Neues-Orchester-Basel/shop/event/175613/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/01012027_nob/",
"source": "stadtcasino_basel"
},
{
"id": "real-zko-19508",
"title": "Neujahrskonzert mit Asya Fateyeva & Tjasha Gafner",
"series": "Abo-Konzerte",
"start": "2027-01-01T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Saxophone",
"name": "Asya Fateyeva"
},
{
"role": "Harp",
"name": "Tjasha Gafner"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Germaine Tailleferre",
"title": "Concertino für Harfe und Orchester"
},
{
"composer": "Alexander Glasunow",
"title": "Konzert für Saxophon und Streichorchester Es-Dur, op. 109"
},
{
"composer": "Sergei Prokofjew",
"title": "Sinfonie Nr. 1, Klassische, op. 25"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Auszüge aus: Der Nussknacker, op. 71, bearbeitet für Saxophon und Orchester von Wolf Kerschek"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/selectseat?eventId=1951",
"sourceUrl": "https://zko.ch/events/neujahrskonzert-mit-asya-fateyeva-tjasha-gafner/",
"source": "zko"
},
{
"id": "real-buehnen_bern-rachmaninow-bittet-zum-tanz-2027-01-01-1700",
"title": "Neujahrskonzert: Rachmaninow bittet zum Tanz",
"series": "Extrakonzert",
"start": "2027-01-01T17:00:00+01:00",
"durationMin": 90,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Piano",
"name": "Kirill Gerstein"
},
{
"role": "Piano",
"name": "Katia Skanavi"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Joan Tower",
"title": "Fanfare for the Uncommon Woman Nr. 4 (1992)"
},
{
"composer": "Francis Poulenc",
"title": "Konzert für zwei Klaviere und Orchester d-Moll FP 61 (1932)"
},
{
"composer": "Sergej Rachmaninow",
"title": "Symphonische Tänze op. 45 (1940)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2305&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/rachmaninow-bittet-zum-tanz/",
"source": "buehnen_bern"
},
{
"id": "real-sob-12207",
"title": "Neujahrskonzert",
"series": "Sinfoniekonzert",
"start": "2027-01-01T18:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "theater-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Chelsea Zurflüh"
},
{
"role": "Conductor",
"name": "Giampaolo Bisanti"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Amy Beach",
"title": "\"Extase\", Lied für Sopran und Orchester, op. 21 Nr. 2"
},
{
"composer": "Ethel Smyth",
"title": "\"Heinrich, du Starker, du Guter\" und \"O glaub mir\", Arien aus \"Der Wald\""
},
{
"composer": "Jeanine Tesori",
"title": "\"The Girl in 14G\""
},
{
"composer": "Gaetano Donizetti",
"title": "Ouvertüre zu \"Don Pasquale\""
},
{
"composer": "Pjotr Iljitsch Tschaikowski",
"title": "Polonaise aus \"Eugen Onegin\""
},
{
"composer": "Ambroise Thomas",
"title": "\"Je suis Titania\", Arie aus \"Mignon\""
},
{
"composer": "Charles Gounod",
"title": "\"Ah! Je veux vivre\", Arie aus \"Roméo et Juliette\""
},
{
"composer": "Manuel de Falla",
"title": "\"Danza ritual del fuego\", aus dem Ballett \"El amor brujo\""
},
{
"composer": "Gerónimo Giménez",
"title": "Polaca Nr. 4 \"Me llaman la primorosa...\", Arie aus \"El barbero de Sevilla\""
},
{
"workId": "jstrauss-fledermaus",
"composerId": "johann-strauss"
}
],
"ticketUrl": "https://www.theater-basel.ch/de/kalender",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/neujahrskonzert/12207",
"source": "sob"
},
{
"id": "real-opernhaus_zurich-200282",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-01T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15307&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19900",
"title": "FESTLICHES NEUJAHRSKONZERT – «ABOUT LAST NIGHT»",
"series": "Sinfoniekonzerte",
"start": "2027-01-02T11:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Vincenzo Milletarì"
},
{
"role": "Mezzo-soprano",
"name": "Marina Viotti"
},
{
"role": "Bass",
"name": "Mark Kurmanbayev"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Ouvertüre zur Oper L’Italiana in Algeri",
"composerId": "rossini"
},
{
"composer": "Gioachino Rossini",
"title": "Arie «Cruda sorte» aus der Oper L’Italiana in Algeri",
"composerId": "rossini"
},
{
"composer": "Georges Bizet",
"title": "Arie «Séguedille» aus der Oper Carmen",
"composerId": "bizet"
},
{
"composer": "Georges Bizet",
"title": "Arie «Votre Toast» aus der Oper Carmen",
"composerId": "bizet"
},
{
"composer": "Erik Satie",
"title": "«Je te veux»"
},
{
"composer": "Arthur Hamilton",
"title": "«Cry Me a River»"
},
{
"composer": "Norbert Glanzberg",
"title": "«Padam, Padam»"
},
{
"composer": "Jacques Offenbach",
"title": "«Galop infernal» («Höllen-Cancan») aus der Operette Orpheus in der Unterwelt"
},
{
"composer": "Jacques Offenbach",
"title": "«Je t’adore brigand» aus der Operette La Périchole"
},
{
"composer": "William Bolcom",
"title": "«Song of Black Max» aus Cabaret Songs"
},
{
"composer": "Sergei Rachmaninow",
"title": "Arie «Ves’ tabor spit» aus der Oper Aleko"
},
{
"composer": "Camille Saint-Saëns",
"title": "Arie «Mon cœur s’ouvre à ta voix» aus der Oper Samson et Dalila, op. 47",
"composerId": "saint-saens"
},
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
},
{
"workId": "jstrauss-fledermaus",
"composerId": "johann-strauss"
},
{
"composer": "Johann Strauss II",
"title": "Kaiserwalzer, op. 437",
"composerId": "johann-strauss"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/neujahrskonzert-mit-der-familieabout-last-night-2ckzwq",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/festliches-neujahrskonzert-about-last-night-2/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199816",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2027-01-02T14:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Thalia Cook-Hansen"
},
{
"role": "Herzogin / Raupe",
"name": "Gary Martin"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Tautvydas Slizauskas"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Andrew Moore"
},
{
"role": "Herzkönigin",
"name": "Marcela Rahal"
},
{
"role": "Der verrückte Hutmacher",
"name": "Lukas Siebert"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15179&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-buehnen_bern-rachmaninow-bittet-zum-tanz-2027-01-02-1700",
"title": "Neujahrskonzert: Rachmaninow bittet zum Tanz",
"series": "Extrakonzert",
"start": "2027-01-02T17:00:00+01:00",
"durationMin": 90,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Piano",
"name": "Kirill Gerstein"
},
{
"role": "Piano",
"name": "Katia Skanavi"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Joan Tower",
"title": "Fanfare for the Uncommon Woman Nr. 4 (1992)"
},
{
"composer": "Francis Poulenc",
"title": "Konzert für zwei Klaviere und Orchester d-Moll FP 61 (1932)"
},
{
"composer": "Sergej Rachmaninow",
"title": "Symphonische Tänze op. 45 (1940)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2306&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/rachmaninow-bittet-zum-tanz/",
"source": "buehnen_bern"
},
{
"id": "real-opernhaus_zurich-200112",
"title": "Fuchs & Jordan",
"series": "Hauptbühne",
"start": "2027-01-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Jordan"
},
{
"role": "Soprano",
"name": "Julie Fuchs"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15464&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/neujahrskonzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-02012027_philharmonie_d_solisten",
"title": "Vivaldi - Die vier Jahreszeiten – Philharmonie der Solisten",
"series": "Musiksaal",
"start": "2027-01-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Die vier Jahreszeiten",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/vivaldi-die-vierjahreszeiten-philharmonie-der-solisten/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/02012027_philharmonie_d_solisten/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-200283",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-03T13:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15308&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-030127_i_tempi",
"title": "Kammerorchester I TEMPI – Neujahrskonzert",
"series": "Musiksaal",
"start": "2027-01-03T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Trumpet",
"name": "Simon Höfele"
},
{
"role": "Conductor",
"name": "Gevorg Gharabekyan"
},
{
"role": "Orchestra",
"name": "Kammerorchester I TEMPI"
}
],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Arrival of the Queen of Sheba",
"composerId": "handel"
},
{
"composer": "Tomaso Giovanni Albinoni",
"title": "Konzert für Trompete und Streicher in B-Dur Op. 7 Nr. 3"
},
{
"composer": "Antonio Vivaldi",
"title": "Concerto für Streicher in g-Moll RV 156",
"composerId": "vivaldi"
},
{
"composer": "Johann Baptist Georg Neruda",
"title": "Konzert für Trompete und Streicher in Es-Dur"
},
{
"composer": "Astor Piazzolla",
"title": "Oblivion & Libertango"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Serenade für Streichorchester in C-Dur op. 48"
}
],
"ticketUrl": "https://www.ticketino.com/de/seatmap/213831",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/030127_i_tempi/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-200304",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2027-01-03T20:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15152&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2059171",
"title": "Philharmonie der Solisten / VIVALDI - Die vier Jahreszeiten",
"series": null,
"start": "2027-01-04T20:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie der Solisten"
},
{
"role": "Violin & direction",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/vivaldi-die-vierjahreszeiten-philharmonie-der-solisten/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/vivaldi-die-vier-jahreszeiten-i-philharmonie-der-solisten-2059171/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200284",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-06T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15309&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055657",
"title": "Kammermusik-Lunchkonzert",
"series": null,
"start": "2027-01-07T12:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Sabine Poyé Morel"
},
{
"role": "Oboe & Cor anglais",
"name": "Martin Frutiger"
},
{
"role": "Clarinet",
"name": "Calogero Palermo"
},
{
"role": "Bassoon",
"name": "Matthias Rácz"
}
],
"program": [
{
"composer": "Lauber",
"title": ""
},
{
"composer": "Honegger",
"title": "",
"composerId": "honegger"
},
{
"composer": "Odermatt",
"title": ""
},
{
"composer": "Strawinsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5602&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-lunchkonzert-2055657/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200305",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2027-01-07T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15153&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9719",
"title": "Zu Gast in Brugg",
"series": null,
"start": "2027-01-07T19:30:00+01:00",
"durationMin": 120,
"cityId": "brugg",
"venueId": "stadtkirche-brugg",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Cello",
"name": "Pablo Ferrández"
}
],
"program": [
{
"composer": "Richard Dubugnon",
"title": "Caprice VI «à l'espagnole» op. 72/6, Auftragswerk des Musikkollegium Winterthur, Uraufführung"
},
{
"composer": "Edward Elgar",
"title": "Konzert für Violoncello und Orchester e-Moll, op. 85"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Sinfonie Nr. 5 d-Moll, op. 107 «Reformation»",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Stretta-Concerts/shop/event/181304/",
"sourceUrl": "https://www.musikkollegium.ch/programm/zu-gastbrugg-27-01-07-9719",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199818",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2027-01-08T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Marie Maidowski"
},
{
"role": "Herzogin / Raupe",
"name": "Ruben Drole"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Salvador Villanueva"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Valeriy Murga"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Anthony León"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15181&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056763",
"title": "Von Engelstimmen und Tastenzauber",
"series": null,
"start": "2027-01-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Empyrean Orchestra"
},
{
"role": "Choir",
"name": "Zürcher Sängerknaben"
},
{
"role": "Conductor",
"name": "Kevin Griffiths"
},
{
"role": "Piano",
"name": "Justus Friedrich Eichhorn"
}
],
"program": [
{
"composer": "Vaughan Williams",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Mendelssohn Bartholdy",
"title": "",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5739&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/von-engelstimmen-und-tastenzauber-2056763/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200285",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-09T19:30:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15310&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19689",
"title": "Kammermusik@ZKO — Nel profondo",
"series": "Kammermusik@ZKO",
"start": "2027-01-10T11:00:00+01:00",
"durationMin": 60,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Inès Morin"
},
{
"role": "Viola",
"name": "Ryszard Groblewski"
},
{
"role": "Cello",
"name": "Anna Tyka Nyffenegger"
},
{
"role": "Double bass",
"name": "Seon-Deok Baik"
},
{
"role": "Piano",
"name": "Benjamin Engeli"
}
],
"program": [
{
"composer": "Johann Nepomuk Hummel",
"title": "Klavierquintett es-Moll, op. 87"
},
{
"composer": "Ralph Vaughan Williams",
"title": "Klavierquintett c-Moll"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1976",
"sourceUrl": "https://zko.ch/events/kammermusikzko-nel-profondo/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199819",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2027-01-10T14:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Marie Maidowski"
},
{
"role": "Herzogin / Raupe",
"name": "Gary Martin"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Salvador Villanueva"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Andrew Moore"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Lukas Siebert"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15182&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-23372228-20270110",
"title": "Philharmonie der Solisten | VIVALDI – Les Quatre Saisons",
"series": null,
"start": "2027-01-10T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie der Solisten"
},
{
"role": "Conductor & Violin",
"name": "Vladik Otaryan"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Le Quattro Stagioni, op. 8 – La Primavera (RV 269) – L’Estate (RV 315) – L’Autunno (RV 293) – L’Inverno (RV 297)",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketcorner.ch/event/vivaldi-die-vier-jahreszeiten-philharmonie-der-solisten-victoria-hall-21991737/",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/23372228_philharmonie-der-solisten",
"source": "geneva_victoria_hall"
},
{
"id": "real-musikkollegium-9435",
"title": "Verteufelt verhext",
"series": "Neujahrskonzert WJSO",
"start": "2027-01-10T17:00:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Winterthurer JugendSinfonieOrchester"
},
{
"role": "Conductor",
"name": "Simon Wenger"
},
{
"role": "Violin",
"name": "Ingolf Turban"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/172263/",
"sourceUrl": "https://www.musikkollegium.ch/programm/verteufelt-verhext-27-01-10-9435",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200306",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2027-01-10T20:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15154&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-6-20270111",
"title": "Passons aux Salons #6",
"series": "Passons aux Salons",
"start": "2027-01-11T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215272&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-6",
"source": "ocg"
},
{
"id": "real-lso_luzern-20492",
"title": "Le Piano Symphonique 2027 – Martha Argerich Eröffnungskonzert",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-11T19:00:00+01:00",
"durationMin": 105,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Martha Argerich"
},
{
"role": "Piano",
"name": "Tianyao Lyu"
},
{
"role": "Piano",
"name": "Giorgi Gigashvili"
},
{
"role": "Conductor",
"name": "Gregory Ahss"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Konzertstück für Klavier und Orchester in G-Dur, op. 92",
"composerId": "schumann"
},
{
"composer": "Robert Schumann",
"title": "Konzert-Allegro mit Introduktion für Klavier und Orchester in d-Moll, op. 134",
"composerId": "schumann"
},
{
"composer": "Robert Schumann",
"title": "Klavierkonzert in a-Moll, op. 54",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/eroffnungskonzert-des-klavierfestivals-mit-marth-6jabt6",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/eroeffnungskonzert-des-klavierfestivals-mit-martha-argerich/",
"source": "lso_luzern"
},
{
"id": "real-geneva_victoria_hall-60428975-20270111",
"title": "Daniil Trifonov",
"series": "Les Grands Interprètes",
"start": "2027-01-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Daniil Trifonov"
}
],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Suite en mi majeur, HWV 430",
"composerId": "handel"
},
{
"composer": "Igor Stravinsky",
"title": "Sonate pour piano",
"composerId": "stravinsky"
},
{
"composer": "Franz Schubert",
"title": "Fantaisie en ut majeur, D 760, «Wanderer-Fantasie»",
"composerId": "schubert"
},
{
"composer": "Juan Francisco García",
"title": "Sambumbia (Rhapsodie dominicaine)"
},
{
"composer": "Heitor Villa-Lobos",
"title": "Valsa da dor, W. 316"
},
{
"composer": "Alberto Ginastera",
"title": "Milonga, op. 3 n° 1"
},
{
"composer": "Daniil Trifonov",
"title": "Tango"
},
{
"composer": "Rafael Bullumba Landestoy",
"title": "Estudio en zamba"
},
{
"composer": "Mozart Camargo Guarnieri",
"title": "Dança negra",
"composerId": "mozart"
},
{
"composer": "Heitor Villa-Lobos",
"title": "Bachianas brasileiras n° 4"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/daniil-trifonov2027",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/60428975_daniil-trifonov-3837152",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055674",
"title": "Série jeunes: Kevin Chen",
"series": "Série jeunes",
"start": "2027-01-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Kevin Chen"
}
],
"program": [
{
"composer": "Chopin",
"title": "",
"composerId": "chopin"
},
{
"composer": "Skrjabin",
"title": ""
},
{
"composer": "Liszt",
"title": "",
"composerId": "liszt"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5624&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/serie-jeunes-kevin-chen-2055674/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19932",
"title": "HAYATO SUMINO – CHOPIN ORBIT & RHAPSODY IN BLUE",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-12T19:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Hayato Sumino"
},
{
"role": "Ensemble",
"name": "Solistinnen und Solisten des Luzerner Sinfonieorchesters"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Danse macabre, op. 40",
"composerId": "saint-saens"
},
{
"composer": "Frédéric Chopin",
"title": "Auszüge aus dem Album Chopin Orbit",
"composerId": "chopin"
},
{
"workId": "ravel-bolero",
"composerId": "ravel"
},
{
"composer": "Hayato Sumino",
"title": "Recollection für Klavier und Streichquintett"
},
{
"composer": "Astor Piazzolla",
"title": "«Primavera porteña» aus Cuatro estaciones porteñas, arr. José Bragato"
},
{
"composer": "George Gershwin",
"title": "Rhapsody in Blue"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/hayato-sumino-chopin-7auoqg",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/hayato-sumino-chopin/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-200286",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-12T20:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15311&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200307",
"title": "Die lustige Witwe",
"series": "Hauptbühne",
"start": "2027-01-13T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giedrė Šlekytė"
},
{
"role": "Baron Mirko Zeta",
"name": "Ruben Drole"
},
{
"role": "Valencienne",
"name": "Serafina Starke"
},
{
"role": "Graf Danilo Danilowitsch",
"name": "Pavol Breslik"
},
{
"role": "Hanna Glawari",
"name": "Diana Damrau"
},
{
"role": "Camille de Rosillon",
"name": "Andrew Owens"
},
{
"role": "Vicomte Cascada",
"name": "Rafael Rojas"
},
{
"role": "Raoul de Saint-Brioche",
"name": "Tautvydas Slizauskas"
},
{
"role": "Bogdanowitsch",
"name": "Lazar Parezanin"
},
{
"role": "Sylviane",
"name": "Thalia Cook-Hansen"
},
{
"role": "Kromow",
"name": "Guram Margvelashvili"
},
{
"role": "Olga",
"name": "Hannah McKay"
},
{
"role": "Pritschitsch",
"name": "Bowen Ding"
},
{
"role": "Njegus",
"name": "Barbara Grimm"
},
{
"role": "Praškowia",
"name": "Cashlin Oostindië"
},
{
"role": "Dancers",
"name": "Sina Friedli"
},
{
"role": "Dancers",
"name": "Sara Peña"
},
{
"role": "Dancers",
"name": "Sara Pennella"
},
{
"role": "Dancers",
"name": "Natalia López Toledano"
},
{
"role": "Dancers",
"name": "Evelyn Tritto"
},
{
"role": "Dancers",
"name": "Martina Balzamo"
},
{
"role": "Dancers",
"name": "Roberto Tallarigo"
},
{
"role": "Dancers",
"name": "Pietro Cono Genova"
},
{
"role": "Dancers",
"name": "Alessio Urzetta"
},
{
"role": "Dancers",
"name": "Daniele Romano"
},
{
"role": "Dancers",
"name": "Armando Rossi"
},
{
"role": "Dancers",
"name": "Daniel Kubr"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Barrie Kosky"
},
{
"role": "Choreographer",
"name": "Kim Duddy"
}
],
"program": [
{
"composer": "Franz Lehár",
"title": "Die lustige Witwe"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15155&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-lustige-witwe/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-21013",
"title": "YUNCHAN LIM, MARTHA ARGERICH & MIKHAIL PLETNEV",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-13T19:00:00+01:00",
"durationMin": 140,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Martha Argerich"
},
{
"role": "Piano",
"name": "Mikhail Pletnev"
},
{
"role": "Conductor",
"name": "Mikhail Pletnev"
},
{
"role": "Piano",
"name": "Yunchan Lim"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Sinfonie Nr. 7 Die Unvollendete in h-Moll, D 759, transkribiert für zwei Klaviere von Mikhail Pletnev",
"composerId": "schubert"
},
{
"composer": "Franz Liszt",
"title": "Klavierkonzert Nr. 2 in A-Dur, S 125",
"composerId": "liszt"
},
{
"composer": "Sergei Rachmaninow",
"title": "Sinfonische Tänze, op. 45"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/yunchan-lim-martha-argerich-mikhail-pletnev-1pn61x",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/yunchan-lim-martha-argerich-mikhail-pletnev/",
"source": "lso_luzern"
},
{
"id": "real-osr-concert-2027-20270113",
"title": "Concert de l'An",
"series": "Concert des Amis de l'OSR",
"start": "2027-01-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Karen Kamensek"
},
{
"role": "Soprano",
"name": "Juliana Grigoryan"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Ouverture de La Forza del Destino",
"composerId": "verdi"
},
{
"composer": "Giuseppe Verdi",
"title": "Otello, Ballabili (ballet de l’acte III)",
"composerId": "verdi"
},
{
"composer": "Giuseppe Verdi",
"title": "Otello, air de Desdémone de l’acte IV ‘Ave Maria’",
"composerId": "verdi"
},
{
"composer": "Francesco Cilea",
"title": "Adriana Lecouvreur, air d’Adriana de l’acte I ‘Ecco : respiro appena ... Io son l'umile ancella’"
},
{
"composer": "Giacomo Puccini",
"title": "Preludio sinfonico",
"composerId": "puccini"
},
{
"composer": "Giacomo Puccini",
"title": "Madama Butterfly, air de Cio-Cio-San de l’acte II ‘Un bel di vedremo…’",
"composerId": "puccini"
},
{
"composer": "Georges Bizet",
"title": "Carmen, N°1 Prélude de la Suite N° 1",
"composerId": "bizet"
},
{
"composer": "Georges Bizet",
"title": "Carmen, Habanera, air de Carmen de l’acte I N° 4 ‘ L’Amour est un oiseau rebelle…’",
"composerId": "bizet"
},
{
"composer": "Bedrich Smetana",
"title": "Ouverture de La Fiancée vendue"
},
{
"composer": "Antonin Dvorák",
"title": "Russalka, Ode à la lune, op. 114",
"composerId": "dvorak"
},
{
"composer": "Nikolaï Rimski-Korsakov",
"title": "La Fiancée du tsar, scène et air de Martha de l’acte IV ‘Ach, schau doch da…’"
},
{
"composer": "Richart Strauss",
"title": "Intermezzo, Träumerei am Kamin, Interlude symphonique N° 2"
},
{
"composer": "Richart Strauss",
"title": "Morgen, Lied pour soprano et orchestre, op. 27 N° 4"
},
{
"composer": "Franz Lehár",
"title": "Giuditta, air‚ ‘Meine Lippen, sie küssen...‘"
},
{
"composer": "Jules Massenet",
"title": "Le Cid, suite de ballet, N° 1 Castillane"
},
{
"composer": "Pablo Luna",
"title": "El Niño Judio, air de Concha \"De España vengo\""
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/concert-2027",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/concert-2027",
"source": "osr"
},
{
"id": "real-tonhalle-2055669",
"title": "Gianandrea Noseda & Hilary Hahn",
"series": null,
"start": "2027-01-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Violin",
"name": "Hilary Hahn"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Prokofjew",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5573&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/gianandrea-noseda-hilary-hahn-2055669/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-13012027_maurice_steger",
"title": "Maurice Steger & Friends",
"series": "AMG Solistenabende",
"start": "2027-01-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=223",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/13012027_maurice_steger/",
"source": "stadtcasino_basel"
},
{
"id": "real-lso_luzern-21026",
"title": "LUNCHKONZERT MIT ANNA GENIUSHENE",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-14T12:00:00+01:00",
"durationMin": 70,
"cityId": "lucerne",
"venueName": "HOTEL SCHWEIZERHOF LUZERN, ZEUGHEERSAAL",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Anna Geniushene"
}
],
"program": [
{
"composer": "Sergei Prokofjew",
"title": "Sarkasmen, op. 17"
},
{
"composer": "Sergei Prokofjew",
"title": "Klaviersonate Nr. 4 in c-Moll, op. 29"
},
{
"composer": "Giuseppe Verdi",
"title": "«Miserere» aus der Oper Il Trovatore",
"composerId": "verdi"
},
{
"composer": "Franz Liszt",
"title": "Danza sacra e duetto finale d’Aida, S 436",
"composerId": "liszt"
},
{
"composer": "Igor Strawinsky",
"title": "Drei Fragmente aus Der Feuervogel"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/lunchkonzert-mit-anna-geniushene-az4iqz",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/lunchkonzert-mit-anna-geniushene/",
"source": "lso_luzern"
},
{
"id": "real-lso_luzern-21029",
"title": "MARTHA ARGERICH & FRIENDS – SCHUMANN UND RACHMANINOW",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-14T19:00:00+01:00",
"durationMin": 150,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Martha Argerich"
},
{
"role": "Piano",
"name": "Dong Hyek Lim"
},
{
"role": "Violin",
"name": "Janine Jansen"
},
{
"role": "Cello",
"name": "Mischa Maisky"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "15 Variationen mit Fuge Eroica-Variationen in Es-Dur für Klavier, op. 35",
"composerId": "beethoven"
},
{
"composer": "Robert Schumann",
"title": "Klavierquintett in Es-Dur, op. 44",
"composerId": "schumann"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Concertino in a-Moll für zwei Klaviere, op. 94"
},
{
"composer": "Sergei Rachmaninow",
"title": "Sinfonische Tänze, op. 45"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/martha-argerich-friends-h39881",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/martha-argerich-friends-schumann-und-rachmaninow/",
"source": "lso_luzern"
},
{
"id": "real-ocg-espagne-intime-20270114",
"title": "Espagne intime",
"series": null,
"start": "2027-01-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Harpsichord",
"name": "Benjamin Alard"
},
{
"role": "Dance",
"name": "Israel Galván"
}
],
"program": [
{
"composer": "Manuel de Falla",
"title": "Concierto para clavicémbalo, flauta, oboe, clarinete, violín y violonchelo"
},
{
"composer": "José Maria Sánchez-Verdú",
"title": "Las ínsulas extrañas para clavicémbalo, flauta, oboe, clarinete, violín y violonchelo"
}
],
"ticketUrl": "https://infomaniak.events/fr-ch/shop/4LW9JPCJ1G/events/1619676",
"sourceUrl": "https://locg.ch/fr/calendrier/espagne-intime",
"source": "ocg"
},
{
"id": "real-cnz-139",
"title": "Flüchtige Gesänge",
"series": null,
"start": "2027-01-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Brunnenhof, Studio 1",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Sarah Maria Sun"
},
{
"role": "Saxophone",
"name": "Sascha Armbruster"
},
{
"role": "Conductor",
"name": "Zoi Tsokanou"
},
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Ann Cleare",
"title": "on magnetic fields, für Ensemble (2012)"
},
{
"composer": "Thomas Kessler",
"title": "Flüchtige Gesänge, für Sopran und Ensemble (2012)"
},
{
"composer": "Lucia Ronchetti",
"title": "Forward and downward, turning neither to the left nor to the right (2013)"
},
{
"composer": "Sergej Newski",
"title": "Cansiòn, für Stimme, Saxofon und Ensemble (2019)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179731/",
"sourceUrl": "https://cnz.ch/fluechtige-gesaenge",
"source": "cnz"
},
{
"id": "real-tonhalle-2055672",
"title": "Gianandrea Noseda & Hilary Hahn",
"series": null,
"start": "2027-01-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Violin",
"name": "Hilary Hahn"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Prokofjew",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5567&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/gianandrea-noseda-hilary-hahn-2055672/",
"source": "tonhalle"
},
{
"id": "real-osi-175693300633907",
"title": "Paolo Basso",
"series": "OSI al DOCKS",
"start": "2027-01-14T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Trevino"
},
{
"role": "Sommelier",
"name": "Paolo Basso"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Maurice Ravel",
"title": "Le tombeau de Couperin suite per orchestra, Prélude e Forlane",
"composerId": "ravel"
},
{
"composer": "Georges Bizet",
"title": "Sinfonia n. 1 (1. Mov.)",
"composerId": "bizet"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonia n. 2 (IV mov.)",
"composerId": "beethoven"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonia n. 3 (II, III e IV mov.)",
"composerId": "brahms"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11840",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-01-14-20-00",
"source": "osi"
},
{
"id": "real-osr-concert-2027-20270114",
"title": "Concert de l'An",
"series": "Série Lausanne",
"start": "2027-01-14T20:15:00+01:00",
"durationMin": 120,
"cityId": "lausanne",
"venueName": "Théâtre de Beaulieu",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Karen Kamensek"
},
{
"role": "Soprano",
"name": "Juliana Grigoryan"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Ouverture de La Forza del Destino",
"composerId": "verdi"
},
{
"composer": "Giuseppe Verdi",
"title": "Otello, Ballabili (ballet de l’acte III)",
"composerId": "verdi"
},
{
"composer": "Giuseppe Verdi",
"title": "Otello, air de Desdémone de l’acte IV ‘Ave Maria’",
"composerId": "verdi"
},
{
"composer": "Francesco Cilea",
"title": "Adriana Lecouvreur, air d’Adriana de l’acte I ‘Ecco : respiro appena ... Io son l'umile ancella’"
},
{
"composer": "Giacomo Puccini",
"title": "Preludio sinfonico",
"composerId": "puccini"
},
{
"composer": "Giacomo Puccini",
"title": "Madama Butterfly, air de Cio-Cio-San de l’acte II ‘Un bel di vedremo…’",
"composerId": "puccini"
},
{
"composer": "Georges Bizet",
"title": "Carmen, N°1 Prélude de la Suite N° 1",
"composerId": "bizet"
},
{
"composer": "Georges Bizet",
"title": "Carmen, Habanera, air de Carmen de l’acte I N° 4 ‘ L’Amour est un oiseau rebelle…’",
"composerId": "bizet"
},
{
"composer": "Bedrich Smetana",
"title": "Ouverture de La Fiancée vendue"
},
{
"composer": "Antonin Dvorák",
"title": "Russalka, Ode à la lune, op. 114",
"composerId": "dvorak"
},
{
"composer": "Nikolaï Rimski-Korsakov",
"title": "La Fiancée du tsar, scène et air de Martha de l’acte IV ‘Ach, schau doch da…’"
},
{
"composer": "Richart Strauss",
"title": "Intermezzo, Träumerei am Kamin, Interlude symphonique N° 2"
},
{
"composer": "Richart Strauss",
"title": "Morgen, Lied pour soprano et orchestre, op. 27 N° 4"
},
{
"composer": "Franz Lehár",
"title": "Giuditta, air‚ ‘Meine Lippen, sie küssen...‘"
},
{
"composer": "Jules Massenet",
"title": "Le Cid, suite de ballet, N° 1 Castillane"
},
{
"composer": "Pablo Luna",
"title": "El Niño Judio, air de Concha \"De España vengo\""
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/concert-2027",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/concert-2027",
"source": "osr"
},
{
"id": "real-lso_luzern-21040",
"title": "LUNCHKONZERT MIT TIANYAO LYU",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-15T12:00:00+01:00",
"durationMin": 70,
"cityId": "lucerne",
"venueName": "HOTEL SCHWEIZERHOF LUZERN, ZEUGHEERSAAL",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Tianyao Lyu"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Sechs Variationen über ein Schweizer Lied in F-Dur, WoO 64",
"composerId": "beethoven"
},
{
"workId": "chopin-preludes",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "XV Sostenuto in Des-Dur",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "_",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Scherzo Nr. 4 in E-Dur, op. 54",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "I Mazurka in a-Moll",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "II Mazurka in As-Dur",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "III Mazurka in fis-Moll",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Barcarolle in Fis-Dur, op. 60",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Nocturnes, op. 62",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "I Nr. 1 in H-Dur",
"composerId": "chopin"
},
{
"composer": "Frédéric Chopin",
"title": "Variationen über «Là ci darem la mano» in B-Dur für Klavier, op. 2",
"composerId": "chopin"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/lunchkonzert-surprise-2y2w1v",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/lunchkonzert-surprise/",
"source": "lso_luzern"
},
{
"id": "real-zko-19677",
"title": "Maria Lassnig & Edvard Munch",
"series": null,
"start": "2027-01-15T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Kunsthaus Zürich Chipperfield-Bau",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin & direction",
"name": "Pablo Hernán Benedí"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2016",
"sourceUrl": "https://zko.ch/events/maria-lassnig-edvard-munch/",
"source": "zko"
},
{
"id": "real-lso_luzern-21045",
"title": "BRAD MEHLDAU – FANTASY, FOURTEEN REVERIES & WELTPREMIERE",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-15T19:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Brad Mehldau"
}
],
"program": [
{
"composer": "Brad Mehldau",
"title": "Fourteen Reveries"
},
{
"composer": "Brad Mehldau",
"title": "The Fifteenth Reverie"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/helene-grimaud-das-letzte-testament-kopie-bmk3bf",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/bradmehldau-fantasy-fourteenreveries-weltpremiere/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055676",
"title": "Klavierrezital: Khatia Buniatishvili",
"series": null,
"start": "2027-01-15T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Khatia Buniatishvili"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5680&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/klavierrezital-khatia-buniatishvili-2055676/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200287",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-15T19:30:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alexander Soddy"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15312&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-21050",
"title": "LUNCHKONZERT MIT SOPHIA LIU",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-16T12:00:00+01:00",
"durationMin": 70,
"cityId": "lucerne",
"venueName": "HOTEL SCHWEIZERHOF LUZERN, ZEUGHEERSAAL",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Sophia Liu"
}
],
"program": [
{
"composer": "Charles-Valentin Alkan",
"title": "Le Preux, op. 17"
},
{
"composer": "Charles-Valentin Alkan",
"title": "12 Etüden in allen Moll-Tonarten, op. 39 X Allegretto alla barbaresca"
},
{
"composer": "Charles-Valentin Alkan",
"title": "Recueil de Chants, op. 65 VI Barcarolle"
},
{
"composer": "Charles-Valentin Alkan",
"title": "12 Etüden in allen Moll-Tonarten, op. 39"
},
{
"composer": "Charles-Valentin Alkan",
"title": "XII Le Festin d’Ésope. Allegretto senza licenza quantunque"
},
{
"composer": "Frédéric Chopin",
"title": "Polonaise Héroïque in As-Dur, op. 53",
"composerId": "chopin"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Nussknacker-Suite, op. 71a, arr. Mikhail Pletnev"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Die Jahreszeiten, op. 37a"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "VI Juni: Barcarole"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "VIII August: Die Ernte"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "IX September: Jagdlied"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "XI November: Troika"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "XII Dezember: Weihnachten"
},
{
"composer": "Mili Balakirew",
"title": "Islamey – Orientalische Fantasie, op. 18"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/lunchkonzert-mit-sophia-liu-e184uz",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/lunchkonzert-mit-sophia-liu/",
"source": "lso_luzern"
},
{
"id": "real-lso_luzern-21055",
"title": "MARTHA ARGERICH & CHARLES DUTOIT – JUBILÄUMSGALA",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-16T19:00:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Martha Argerich"
},
{
"role": "Conductor",
"name": "Charles Dutoit"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Frédéric Chopin",
"title": "Klavierkonzert Nr. 1 in e-Moll, op. 11",
"composerId": "chopin"
},
{
"composer": "Igor Strawinsky",
"title": "Petruschka, Ballett in vier Bildern (Originalfassung, 1911)"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/martha-argerich-charles-dutoit-jubilaumsgala-af8ssg",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/martha-argerich-charles-dutoit-jubilaeumsgala/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199799",
"title": "Trifonov & Järvi",
"series": "Philharmonische Konzerte",
"start": "2027-01-16T19:30:00+01:00",
"durationMin": 90,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Daniil Trifonov"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Klavierkonzert Nr. 2 g-Moll op. 16"
},
{
"composer": "Sergej Prokofjew",
"title": "Sinfonie Nr. 7 cis-Moll op. 131"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15408&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/3-philharmonisches-konzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-21059",
"title": "MISCHA MAISKY & JUNGE TALENTE",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-17T11:00:00+01:00",
"durationMin": 130,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Mischa Maisky"
},
{
"role": "Cello",
"name": "Mischa Maisky"
},
{
"role": "Piano",
"name": "Max Yinuo Lu"
},
{
"role": "Violin",
"name": "Hans Christian Aavik"
},
{
"role": "Violin",
"name": "Pauline van der Rest"
},
{
"role": "Viola",
"name": "Amira Abouzahra"
}
],
"program": [],
"ticketUrl": "https://sinfonieorchester.ch/de/veranstaltung/mischa-maisky-junge-talente/",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/mischa-maisky-junge-talente/",
"source": "lso_luzern"
},
{
"id": "real-osr-mozart-brahms-20270117",
"title": "Mozart & Brahms",
"series": "Série Musique de chambre",
"start": "2027-01-17T11:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "conservatoire-geneve",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Roman Filipov"
},
{
"role": "Violin",
"name": "Sidonie Bougamont"
},
{
"role": "Viola",
"name": "Elçim Özdemir"
},
{
"role": "Viola",
"name": "Frédéric Kirch"
},
{
"role": "Cello",
"name": "Lionel Cottet"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Quintette à cordes N° 4 en sol mineur KV 516",
"composerId": "mozart"
},
{
"composer": "Johannes Brahms",
"title": "Quintette à cordes à deux altos N° 2 en sol majeur op. 111",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mozart-brahms",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mozart-brahms",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199820",
"title": "Alice im Wunderland",
"series": "Hauptbühne",
"start": "2027-01-17T14:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Richter"
},
{
"role": "Alice",
"name": "Thalia Cook-Hansen"
},
{
"role": "Herzogin / Raupe",
"name": "Gary Martin"
},
{
"role": "Herzkönig",
"name": "Christian Tintori"
},
{
"role": "Märzhase / Zwiddeldei",
"name": "Tautvydas Slizauskas"
},
{
"role": "Schlafmaus / Zwiddeldum",
"name": "Valeriy Murga"
},
{
"role": "Herzkönigin",
"name": "Irène Friedli"
},
{
"role": "Der verrückte Hutmacher",
"name": "Anthony León"
},
{
"role": "Das weisse Kaninchen",
"name": "Daniel Hajdu"
},
{
"role": "Grinsekatze",
"name": "Kjell Brutscheidt"
},
{
"role": "Köchin",
"name": "Ursula Wiederkehr"
},
{
"role": "Froschpage",
"name": "Helen Wills"
},
{
"role": "Fischpage",
"name": "Olivia Minder"
},
{
"role": "Choir",
"name": "Kinderchor der Oper Zürich"
},
{
"role": "Choir",
"name": "SoprAlti der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Nadja Loschky"
}
],
"program": [
{
"composer": "Pierangelo Valtinoni",
"title": "Alice im Wunderland"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15183&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/alice-im-wunderland/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-21061",
"title": "FESTIVALFINALE: DANIIL TRIFONOV – WANDERER, TANGO & BACHIANAS BRASILEIRAS",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-01-17T17:00:00+01:00",
"durationMin": 150,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Daniil Trifonov"
}
],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Suite Nr. 5 in E-Dur, HWV 430",
"composerId": "handel"
},
{
"composer": "Igor Strawinsky",
"title": "Klaviersonate"
},
{
"composer": "Franz Schubert",
"title": "Fantasie Wanderer-Fantasie in C-Dur, D 760",
"composerId": "schubert"
},
{
"composer": "Juan Francisco García",
"title": "Sambumbia Nr. 1 (Rapsodia Dominicana)"
},
{
"composer": "Heitor Villa-Lobos",
"title": "Valsa da Dor, W 316"
},
{
"composer": "Bullumba Landestoy",
"title": "Vals de Santo Domingo"
},
{
"composer": "Alberto Ginastera",
"title": "Milonga, op. 3/1"
},
{
"composer": "Daniil Trifonov",
"title": "Tango"
},
{
"composer": "Bullumba Landestoy",
"title": "Estudio en Samba"
},
{
"composer": "Camargo Guarnieri",
"title": "Dança negra"
},
{
"composer": "Heitor Villa-Lobos",
"title": "Bachianas Brasileiras Nr. 4, W 264"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/festivalfinale-mit-daniil-trifonov-p55w2j",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/festivalfinale-daniil-trifonov-wanderer-tango-bachianas-brasileiras/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055678",
"title": "Kosmos Kammermusik: Trio Hoppe Poltéra Brautigam",
"series": "Kosmos Kammermusik",
"start": "2027-01-17T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Trio Hoppe Poltéra Brautigam"
},
{
"role": "Violin",
"name": "Esther Hoppe"
},
{
"role": "Cello",
"name": "Christian Poltéra"
},
{
"role": "Fortepiano",
"name": "Ronald Brautigam"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5612&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-trio-hoppe-poltera-brautigam-2055678/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-82926939-20270117",
"title": "Chœur et Orchestre Les Musiciens du Louvre",
"series": "Migros-Pour-cent-culturel Classics",
"start": "2027-01-17T18:00:00+01:00",
"durationMin": 90,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marc Minkowski"
},
{
"role": "Soprano",
"name": "Lydia Hoen Tjore"
},
{
"role": "Mezzo-soprano",
"name": "Sun-Ly Pierce"
},
{
"role": "Tenor",
"name": "Lunga Eric Hallam"
},
{
"role": "Bass",
"name": "Alex Rosen"
},
{
"role": "Orchestra",
"name": "Chœur et Orchestre Les Musiciens du Louvre"
}
],
"program": [
{
"composer": "Wilhelm Friedemann Bach",
"title": "Adagio e fuga en ré mineur, F. 65",
"composerId": "bach"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Requiem en ré mineur, K. 626",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Ave verum corpus en ré majeur, K. 618",
"composerId": "mozart"
}
],
"ticketUrl": "https://migros.infomaniak.events/fr-ch/shop/migros-pour-cent-culturel-classic-2026-2027-EBGNGEVB9H",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/82926939_choeur-et-orchestre-les-musiciens-du-louvre",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200171",
"title": "Konzert Opera Nova",
"series": "Opera Nova",
"start": "2027-01-17T18:00:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Éliane Radigue",
"title": ""
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15458&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/deep-underground/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-17012027_rs",
"title": "Juan-José Peña Aguirre & Nicolas Comi",
"series": "AMG Rising Stars",
"start": "2027-01-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Juan-José Peña Aguirre"
},
{
"role": "Piano",
"name": "Nicolas Comi"
}
],
"program": [
{
"composer": "Josef Suk",
"title": "«Liebeslied» op. 7 Nr. 1"
},
{
"composer": "Johannes Brahms",
"title": "Ungarischer Tanz Nr. 7 A-Dur",
"composerId": "brahms"
},
{
"composer": "Joseph Achron",
"title": "«Hebräische Melodie» op. 33"
},
{
"composer": "Manuel de Falla",
"title": "Jota aus «Suite populaire espagnole»"
},
{
"composer": "Claude Debussy",
"title": "La plus que lente",
"composerId": "debussy"
},
{
"composer": "Henryk Wieniawski",
"title": "Scherzo-Tarantelle g-Moll op. 16"
},
{
"composer": "Piotr Iljitsch Tschaikowsky",
"title": "«Souvenir d’un lieu cher» op. 42"
},
{
"composer": "Claude Debussy",
"title": "Violinsonate g-Moll",
"composerId": "debussy"
},
{
"composer": "Maurice Ravel",
"title": "«Tzigane», Rapsodie de concert",
"composerId": "ravel"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=240",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/17012027_rs/",
"source": "stadtcasino_basel"
},
{
"id": "real-ocg-passons-aux-salons-7-20270118",
"title": "Passons aux Salons #7",
"series": "Passons aux Salons",
"start": "2027-01-18T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215273&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-7",
"source": "ocg"
},
{
"id": "real-tonhalle-2056814",
"title": "Les Musiciens du Louvre – Mozarts Requiem",
"series": null,
"start": "2027-01-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Chœur et orchestre Les Musiciens du Louvre"
},
{
"role": "Conductor",
"name": "Marc Minkowski"
},
{
"role": "Soprano",
"name": "Lydia Hoen Tjore"
},
{
"role": "Mezzo-soprano",
"name": "Sun-Ly Pierce"
},
{
"role": "Tenor",
"name": "Lunga Eric Hallam"
},
{
"role": "Bass",
"name": "Alex Rosen"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5645&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/les-musiciens-du-louvre-mozarts-requiem-2056814/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200288",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-19T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15313&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19511",
"title": "Gabriela Montero & Simon Höfele",
"series": "Abo-Konzerte",
"start": "2027-01-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Gabriela Montero"
},
{
"role": "Trumpet",
"name": "Simon Höfele"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Ruth Gipps",
"title": "Cringlemire Garden. Impressionen für Streichorchester, op. 39"
},
{
"composer": "Leoš Janáček",
"title": "Idylle für Streichorchester"
},
{
"composer": "Sergei Prokofjew",
"title": "Visions fugitives, op. 22, bearbeitet für Streichorchester von Rudolf Barschai"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Konzert für Klavier, Trompete und Streichorchester c-Moll, op. 35"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1952",
"sourceUrl": "https://zko.ch/events/gabriela-montero-simon-hoefele/",
"source": "zko"
},
{
"id": "real-stadtcasino_basel-190127_gfk",
"title": "Trio con Brio Copenhagen",
"series": "Kammermusik Basel",
"start": "2027-01-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Hong Soo-Jin"
},
{
"role": "Cello",
"name": "Hong Soo-Kyung"
},
{
"role": "Piano",
"name": "Jens Elvekjær"
},
{
"role": "Piano",
"name": "Frank Martin"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klaviertrio Nr. 1, Es-dur, op. 1, Nr. 1 (1793/94)",
"composerId": "beethoven"
},
{
"composer": "Johannes Brahms",
"title": "Klaviertrio Nr. 1, H-dur, op. 8, 2. Fassung (1854/89)",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.ticketino.com/de/Event/Kammermusik-Basel-TRIO-CON-BRIO-COPENHAGEN/215283",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/190127_gfk/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-mahler7-20270120",
"title": "Chant de la nuit",
"series": "Série O",
"start": "2027-01-20T19:30:00+01:00",
"durationMin": 140,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jonathan Nott"
},
{
"role": "Violin",
"name": "Janine Jansen"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Richard Dubugnon",
"title": "Sonnenring, concerto pour violon et orchestre inspiré par des tableaux d’Adolf Wölfli (création suisse)"
},
{
"composer": "Gustav Mahler",
"title": "Symphonie N° 7 en mi mineur, 'Chant de la nuit'",
"composerId": "mahler"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mahler7",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mahler7",
"source": "osr"
},
{
"id": "real-sob-12195",
"title": "Freiheit",
"series": "Sinfoniekonzert",
"start": "2027-01-20T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Conductor",
"name": "Renaud Capuçon"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klavierkonzert Nr. 5 Es-Dur, op. 73, \"Emperor\"",
"composerId": "beethoven"
},
{
"composer": "Richard Wagner",
"title": "\"Siegfried-Idyll\" E-Dur, WWV 103",
"composerId": "wagner"
},
{
"composer": "Richard Strauss",
"title": "Vier sinfonische Zwischenspiele aus \"Intermezzo\", TrV 246a",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078767&productId=10229721147337&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/freiheit/12195",
"source": "sob"
},
{
"id": "real-tonhalle-2055686",
"title": "tonhalleCRUSH",
"series": null,
"start": "2027-01-21T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5681&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/tonhallecrush-2055686/",
"source": "tonhalle"
},
{
"id": "real-osr-mahler7-20270121",
"title": "Chant de la nuit",
"series": "Série S",
"start": "2027-01-21T19:30:00+01:00",
"durationMin": 140,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jonathan Nott"
},
{
"role": "Violin",
"name": "Janine Jansen"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Richard Dubugnon",
"title": "Sonnenring, concerto pour violon et orchestre inspiré par des tableaux d’Adolf Wölfli (création suisse)"
},
{
"composer": "Gustav Mahler",
"title": "Symphonie N° 7 en mi mineur, 'Chant de la nuit'",
"composerId": "mahler"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mahler7",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/mahler7",
"source": "osr"
},
{
"id": "real-sob-12194",
"title": "Freiheit",
"series": "Sinfoniekonzert",
"start": "2027-01-21T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Francesco Piemontesi"
},
{
"role": "Conductor",
"name": "Renaud Capuçon"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klavierkonzert Nr. 5 Es-Dur, op. 73, \"Emperor\"",
"composerId": "beethoven"
},
{
"composer": "Richard Wagner",
"title": "\"Siegfried-Idyll\" E-Dur, WWV 103",
"composerId": "wagner"
},
{
"composer": "Richard Strauss",
"title": "Vier sinfonische Zwischenspiele aus \"Intermezzo\", TrV 246a",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078768&productId=10229721147337&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/freiheit/12194",
"source": "sob"
},
{
"id": "real-buehnen_bern-schumann-am-rhein-2027-01-21-1930",
"title": "Schumann am Rhein",
"series": "6. Symphoniekonzert",
"start": "2027-01-21T19:30:00+01:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Constantinos Carydis"
},
{
"role": "Cello",
"name": "Friedrich Thiele"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Periklis Koukos",
"title": "Adagio für Streicher (1993)"
},
{
"composer": "Robert Schumann",
"title": "Konzert für Violoncello und Orchester a-Moll op. 129 (1850)",
"composerId": "schumann"
},
{
"composer": "Minas Borboudakis",
"title": "Katharsis für Orchester (2002, Orchesterfassung 2026, Uraufführung, Auftragswerk von Bühnen Bern)"
},
{
"composer": "Robert Schumann",
"title": "Symphonie Nr. 3 Es-Dur op. 97 «Rheinische» (1850)",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2033&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/schumann-am-rhein/",
"source": "buehnen_bern"
},
{
"id": "real-zko-19808",
"title": "ZKO on Tour — Gabriela Montero & Simon Höfele",
"series": "ZKO on Tour",
"start": "2027-01-21T19:30:00+01:00",
"durationMin": 90,
"cityId": "zug",
"venueId": "theater-casino-zug",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Gabriela Montero"
},
{
"role": "Trumpet",
"name": "Simon Höfele"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Ruth Gipps",
"title": "Cringlemire Garden. Impressionen für Streichorchester, op. 39"
},
{
"composer": "Leoš Janáček",
"title": "Idylle für Streichorchester"
},
{
"composer": "Sergei Prokofjew",
"title": "Visions fugitives, op. 22, bearbeitet für Streichorchester von Rudolf Barschai"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Konzert für Klavier, Trompete und Streichorchester c-Moll, op. 35"
}
],
"ticketUrl": "https://festspiele-mv.de/alle-konzerte/konzerte/program/vivaldi-recomposed?tx_plumcodeprogram_programlist%5Bseason%5D=2&cHash=ca51190859567f056b694889f2456ee0",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19808",
"source": "zko"
},
{
"id": "real-osi-175694853669087",
"title": "Tini Thing Helseth",
"series": "OSI al DOCKS",
"start": "2027-01-21T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tini Thing Helseth"
},
{
"role": "Trumpet",
"name": "Tini Thing Helseth"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Geirr Tveitt",
"title": "Velkomne med aera per tromba e orchestra"
},
{
"composer": "Woijciech Kilar",
"title": "Orawa per orchestra d’archi"
},
{
"composer": "Aaron Copland",
"title": "Quiet City per corno inglese, tromba e archi"
},
{
"composer": "Sergej Prokov’ef",
"title": "Sinfonia n. 1 in re maggiore op 24 Classica"
},
{
"composer": "Igor Stravinskij",
"title": "Pastorale, vers. per tromba e archi"
},
{
"composer": "Darius Milhaud",
"title": "Scaramouche suite per tromba e orchestra"
},
{
"composer": "Gabriel Fauré",
"title": "Pavane per orchestra in fa diesis minore op. 50"
},
{
"composer": "Astor Piazzolla",
"title": "Adios Nonino (arr.)"
},
{
"composer": "Lili Boulanger",
"title": "Nocturne per tromba e archi (arr. Storlökken)"
},
{
"composer": "Nadia Boulanger",
"title": "Lux aeterna per tromba e archi (arr. Storlökken)"
},
{
"composer": "Astor Piazzolla",
"title": "Libertango per tromba e orchestra"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11841",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-01-21-20-00",
"source": "osi"
},
{
"id": "real-ocg-concert-sur-le-pouce-5-20270122",
"title": "Concert sur le pouce #5",
"series": "Concert sur le pouce",
"start": "2027-01-22T12:15:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Bibliothèque de la Cité",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.bm-geneve.ch/notice?id=h%3A%3Afdf24ef6-4bd1-4099-9391-0d5b59c4ae4e&queryId=f3c18f67-8cfb-4957-bd00-33856f71e6f0&posInSet=7",
"sourceUrl": "https://locg.ch/fr/calendrier/concert-sur-le-pouce-5",
"source": "ocg"
},
{
"id": "real-stadtcasino_basel-220127_cmb",
"title": "Collegium Musicum Basel – ARD-Preisgewinner jubilieren triumphierend",
"series": "Musiksaal",
"start": "2027-01-22T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Benjamin Reiners"
},
{
"role": "Orchestra",
"name": "Collegium Musicum Basel"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Sinfonie Nr. 3 D-Dur, D200",
"composerId": "schubert"
},
{
"composer": "Franz Schubert",
"title": "Werke für Fagott und Schlagzeug",
"composerId": "schubert"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/collegium-musicum-basel/collegium-musicum-basel-202627-4124761/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/220127_cmb/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055685",
"title": "Paavo Järvi & Frank Peter Zimmermann",
"series": null,
"start": "2027-01-22T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Frank Peter Zimmermann"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Hindemith",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5562&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-frank-peter-zimmermann-2055685/",
"source": "tonhalle"
},
{
"id": "real-buehnen_bern-schumann-am-rhein-2027-01-22-1930",
"title": "Schumann am Rhein",
"series": "6. Symphoniekonzert",
"start": "2027-01-22T19:30:00+01:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Constantinos Carydis"
},
{
"role": "Cello",
"name": "Friedrich Thiele"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Periklis Koukos",
"title": "Adagio für Streicher (1993)"
},
{
"composer": "Robert Schumann",
"title": "Konzert für Violoncello und Orchester a-Moll op. 129 (1850)",
"composerId": "schumann"
},
{
"composer": "Minas Borboudakis",
"title": "Katharsis für Orchester (2002, Orchesterfassung 2026, Uraufführung, Auftragswerk von Bühnen Bern)"
},
{
"composer": "Robert Schumann",
"title": "Symphonie Nr. 3 Es-Dur op. 97 «Rheinische» (1850)",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2205&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/schumann-am-rhein/",
"source": "buehnen_bern"
},
{
"id": "real-ocg-apotheoses-20270122",
"title": "Apothéoses",
"series": "Concert à l'abo",
"start": "2027-01-22T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor & Cello",
"name": "Raphaël Merlin"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Henri Duparc",
"title": "Aux Étoiles"
},
{
"composer": "Dmitri Chostakovitch",
"title": "Premier Concerto pour violoncelle, op. 107"
},
{
"composer": "Ludwig van Beethoven",
"title": "7e Symphonie, op. 92",
"composerId": "beethoven"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114008",
"sourceUrl": "https://locg.ch/fr/calendrier/apotheoses",
"source": "ocg"
},
{
"id": "real-tonhalle-2055683",
"title": "Paavo Järvi & Frank Peter Zimmermann",
"series": null,
"start": "2027-01-23T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Frank Peter Zimmermann"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Hindemith",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5584&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-frank-peter-zimmermann-2055683/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200289",
"title": "La traviata",
"series": "Hauptbühne",
"start": "2027-01-23T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Dmitry Matvienko"
},
{
"role": "Violetta Valéry",
"name": "Martina Russomanno"
},
{
"role": "Alfredo Germont",
"name": "Bekhzod Davronov"
},
{
"role": "Giorgio Germont",
"name": "Roman Burdenko"
},
{
"role": "Flora Bervoix",
"name": "Siena Licht Miller"
},
{
"role": "Annina",
"name": "Liliana Nikiteanu"
},
{
"role": "Gastone",
"name": "Anthony León"
},
{
"role": "Baron Douphol",
"name": "Evan Gray"
},
{
"role": "Marchese d'Obigny",
"name": "Stanislav Vorobyov"
},
{
"role": "Doktor Grenvil",
"name": "Mikayel Sargsyan"
},
{
"role": "Giuseppe",
"name": "Martin Zysset"
},
{
"role": "Ein Bote",
"name": "Lazar Parezanin"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Christof Loy"
},
{
"role": "Choreographer",
"name": "Javier Pérez"
}
],
"program": [
{
"workId": "verdi-traviata",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15314&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-traviata-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19938",
"title": "KAMMERMUSIK-MATINÉE 3",
"series": "Kammermusik",
"start": "2027-01-24T11:15:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Samuel Niederhauser"
},
{
"role": "Cello",
"name": "Heiner Reich"
},
{
"role": "Cello",
"name": "Sebastian Diezig"
},
{
"role": "Cello",
"name": "Jonas Vischi"
},
{
"role": "Cello",
"name": "Ruth Eichenseher"
},
{
"role": "Cello",
"name": "Beat Feigenwinter"
},
{
"role": "Cello",
"name": "Joachim Müller-Crepon"
}
],
"program": [
{
"composer": "Nach dem Requiem",
"title": "Im Schatten von Beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-3-fnb2pi",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-3-4/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-200290",
"title": "Die Walküre",
"series": "Hauptbühne",
"start": "2027-01-24T16:00:00+01:00",
"durationMin": 300,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Siegmund",
"name": "Eric Cutler"
},
{
"role": "Hunding",
"name": "Christof Fischesser"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Sieglinde",
"name": "Ekaterina Gubanova"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Brünnhilde",
"name": "Camilla Nylund"
},
{
"role": "Helmwige",
"name": "Dorothea Herbert"
},
{
"role": "Gerhilde",
"name": "Iulia Maria Dan"
},
{
"role": "Ortlinde",
"name": "Natália Tuznik"
},
{
"role": "Waltraute",
"name": "Cashlin Oostindië"
},
{
"role": "Siegrune",
"name": "Marcela Rahal"
},
{
"role": "Rossweisse",
"name": "Siena Licht Miller"
},
{
"role": "Grimgerde",
"name": "Dominika Stefańska"
},
{
"role": "Schwertleite",
"name": "Dora Jana Klarić"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Die Walküre",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15189&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-walkuere/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-32916428-20270124",
"title": "Création mondiale",
"series": "Concert du dimanche",
"start": "2027-01-24T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Franck Marcon"
}
],
"program": [
{
"composer": "Nicolas Bolens",
"title": "L’intime… comme l’Eau du Temps"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489260",
"sourceUrl": "https://openagenda.com/victoria-hall/events/32916428_creation-mondiale",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055687",
"title": "Paavo Järvi & Frank Peter Zimmermann",
"series": null,
"start": "2027-01-24T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Frank Peter Zimmermann"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Hindemith",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5588&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-frank-peter-zimmermann-2055687/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-240127_sinfonietta",
"title": "Basel Sinfonietta – Ukraine und Europa",
"series": "Musiksaal",
"start": "2027-01-24T19:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Susanne Blumenthal"
},
{
"role": "Orchestra",
"name": "Basel Sinfonietta"
}
],
"program": [
{
"composer": "Kristine Tjøgersen",
"title": "«Between Trees» | CH"
},
{
"composer": "Anna Korsun",
"title": "«In einem anderen Raum» | CH"
},
{
"composer": "Ezko Kikoutchi",
"title": "«INOCHI 命» | UA"
},
{
"composer": "Stefania Turkevych",
"title": "Symphonisches Gedicht «La Vita» | UA"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Basel_Sinfonietta/shop/event/156709/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/240127_sinfonietta/",
"source": "stadtcasino_basel"
},
{
"id": "real-ocg-passons-aux-salons-7-204-20270125",
"title": "Passons aux Salons #8",
"series": "Passons aux Salons",
"start": "2027-01-25T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215274&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-7-204",
"source": "ocg"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270127-1500",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-01-27T15:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2055697",
"title": "Paavo Järvi mit Mozarts Requiem",
"series": null,
"start": "2027-01-27T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Katharina Konradi"
},
{
"role": "Alto",
"name": "Marie Henriette Reinhold"
},
{
"role": "Tenor",
"name": "Benjamin Bruns"
},
{
"role": "Bass",
"name": "Tareq Nazmi"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Strawinsky",
"title": ""
},
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5574&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mozarts-requiem-2055697/",
"source": "tonhalle"
},
{
"id": "real-zko-19732",
"title": "Feder und Bogen 2: Olga Tokarczuk",
"series": null,
"start": "2027-01-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Narrator",
"name": "Thomas Douglas"
},
{
"role": "Ensemble",
"name": "Musikerinnen und Musiker des Zürcher Kammerorchesters"
}
],
"program": [],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1973",
"sourceUrl": "https://zko.ch/events/feder-und-bogen-2-olga-tokarczuk/",
"source": "zko"
},
{
"id": "real-lso_luzern-19902",
"title": "GEMEINSCHAFTSKONZERT IM RAHMEN DES MUSIKFESTIVALS «SZENENWECHSEL»",
"series": "Sinfoniekonzerte",
"start": "2027-01-28T19:30:00+01:00",
"durationMin": 75,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Duncan Ward"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Cécile Marti",
"title": "«Seven Towers – 1» aus dem siebenteiligen Zyklus Seven Towers für Orchester"
},
{
"composer": "Sergei Rachmaninow",
"title": "Sinfonie Nr. 2 in e-Moll, op. 27"
}
],
"ticketUrl": "https://sinfonieorchester.ch/de/veranstaltung/gemeinschaftskonzert-im-rahmen-des-musikfestivals-szenenwechsel/",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/gemeinschaftskonzert-im-rahmen-des-musikfestivals-szenenwechsel/",
"source": "lso_luzern"
},
{
"id": "real-stadtcasino_basel-mizmorim-voice-soul",
"title": "Mizmorim Festival – Voice of the Soul",
"series": "Hans Huber-Saal",
"start": "2027-01-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Ilya Gringolts"
},
{
"role": "Conductor",
"name": "Ilya Gringolts"
},
{
"role": "Cello",
"name": "Enrico Dindo"
},
{
"role": "Ensemble",
"name": "Mizmorim Festival Ensemble"
}
],
"program": [
{
"composer": "Hana Ajiashvili",
"title": "Projections für Streichensemble (2026)"
},
{
"composer": "Mieczysław Weinberg",
"title": "Concertino für Violoncello und Streichorchester op. 43a (1948)"
},
{
"composer": "Mieczysław Weinberg",
"title": "Concertino für Violine und Streichorchester op. 42 (1948)"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Streichersinfonie Nr. 12 in g-Moll MWV N12 (1823)",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/mizmorim-voice-soul/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/mizmorim-voice-soul/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055696",
"title": "Paavo Järvi mit Mozarts Requiem",
"series": null,
"start": "2027-01-28T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Katharina Konradi"
},
{
"role": "Alto",
"name": "Marie Henriette Reinhold"
},
{
"role": "Tenor",
"name": "Benjamin Bruns"
},
{
"role": "Bass",
"name": "Tareq Nazmi"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Strawinsky",
"title": ""
},
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5709&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mozarts-requiem-2055696/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9432",
"title": "Rezital Sol Gabetta",
"series": "Extrakonzert",
"start": "2027-01-28T19:30:00+01:00",
"durationMin": 130,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Piano",
"name": "Bertrand Chamayou"
}
],
"program": [
{
"composer": "Benjamin Britten",
"title": "Sonate für Violoncello und Klavier C-Dur, op. 65"
},
{
"composer": "Edvard Grieg",
"title": "Sonate für Violoncello und Klavier a-Moll, op. 36",
"composerId": "grieg"
},
{
"composer": "Witold Lutosławski",
"title": "Grave, Metamorphosen für Violoncello und Klavier"
},
{
"composer": "Sergej Rachmaninoff",
"title": "Sonate für Violoncello und Klavier g-Moll, op. 19",
"composerId": "rachmaninoff"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163529/",
"sourceUrl": "https://www.musikkollegium.ch/programm/rezital-sol-gabetta-27-01-28-9432",
"source": "musikkollegium"
},
{
"id": "real-osi-175707545714899",
"title": "Maxim Rysanov",
"series": "OSI al DOCKS",
"start": "2027-01-28T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Maxim Rysanov"
},
{
"role": "Viola",
"name": "Maxim Rysanov"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Osvaldo Golijov",
"title": "Tenebrae"
},
{
"composer": "John Woolrich",
"title": "Ulysses Awakes per viola e 10 archi"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Adagio e Fuga in do minore per orchestra d’archi",
"composerId": "mozart"
},
{
"composer": "Leonid Desyatnikov",
"title": "Reflections on a folk song per 19 archi e viola obbligata"
},
{
"composer": "Grazyna Bacewicz",
"title": "Concerto per orchestra d’archi"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11842",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-01-28-20-00",
"source": "osi"
},
{
"id": "real-musikkollegium-9438",
"title": "Schubert & Schoeck",
"series": "Musik über Mittag",
"start": "2027-01-29T12:15:00+01:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Sarastro Quartett"
},
{
"role": "Violin",
"name": "Ralph Orendain"
},
{
"role": "Violin",
"name": "Roman Conrad"
},
{
"role": "Viola",
"name": "Marie-Luise Hermann"
},
{
"role": "Cello",
"name": "Lehel Donath"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Streichquartett g-Moll, D 173",
"composerId": "schubert"
},
{
"composer": "Othmar Schoeck",
"title": "Streichquartett Nr. 2 C-Dur, op. 37"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/176241/",
"sourceUrl": "https://www.musikkollegium.ch/programm/schubert-schoeck-27-01-29-9438",
"source": "musikkollegium"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270129-1900",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-01-29T19:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2055698",
"title": "Paavo Järvi mit Mozarts Requiem",
"series": null,
"start": "2027-01-29T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Katharina Konradi"
},
{
"role": "Alto",
"name": "Marie Henriette Reinhold"
},
{
"role": "Tenor",
"name": "Benjamin Bruns"
},
{
"role": "Bass",
"name": "Tareq Nazmi"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Strawinsky",
"title": ""
},
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5597&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-mozarts-requiem-2055698/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9407",
"title": "Joglo auf Schatzsuche",
"series": "Familienkonzert ab 4 Jahren",
"start": "2027-01-30T15:00:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueName": "Konservatorium Winterthur, Konzertsaal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Oboe",
"name": "Marietta Burri-Bosshart"
},
{
"role": "Bassoon",
"name": "Magdalena Nägeli-Peter"
},
{
"role": "Clarinet",
"name": "Ruth Suppiger"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179261/",
"sourceUrl": "https://www.musikkollegium.ch/programm/joglo-auf-schatzsuche-27-01-30-9407",
"source": "musikkollegium"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270130-1500",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-01-30T15:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2056820",
"title": "Abo-Konzert #4 – Amor et Psyche",
"series": "Abo-Konzert #4",
"start": "2027-01-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Zürich"
},
{
"role": "Conductor",
"name": "Esther Hoppe"
},
{
"role": "Soprano",
"name": "Maayan Licht"
}
],
"program": [
{
"composer": "Purcell",
"title": ""
},
{
"composer": "Wolf",
"title": ""
},
{
"composer": "Verdi",
"title": "",
"composerId": "verdi"
}
],
"ticketUrl": "https://shop.e-guma.ch/camerata-zuerich/de/events/4-amor-et-psyche-tonhalle-zuerich-2679499",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/abo-konzert-4-amor-et-psyche-2056820/tz/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-mizmorim-eine-blume-fur-tabea",
"title": "Mizmorim Festival – Eine Blume für Tabea",
"series": "Hans Huber-Saal",
"start": "2027-01-30T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Joseph Joachim",
"title": "Hebräische Melodien nach Eindrücken der Byron‘schen Gesänge op. 9 für Viola und Klavier (1855)"
},
{
"composer": "György Kurtág",
"title": "Aus Games, Signs & Messages für Viola solo"
},
{
"composer": "György Kurtág",
"title": "«In nomine – all ongharese»"
},
{
"composer": "György Kurtág",
"title": "«… eine Blume für Tabea …»"
},
{
"composer": "György Kurtág",
"title": "«Kromatikus feleselös»"
},
{
"composer": "Frank Bridge",
"title": "Lament für zwei Violas (1911)"
},
{
"composer": "Menachem Wiesenberg",
"title": "Monodialogue. A Fantasy for Viola Solo (1999)"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Quintett Nr. 2 B-Dur für zwei Violinen, zwei Violen und Violoncello, op. 87 (1845)",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/mizmorim-eine-blume-fur-tabea/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/mizmorim-eine-blume-fur-tabea/",
"source": "stadtcasino_basel"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270131-1100",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-01-31T11:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-200031",
"title": "5. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-01-31T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Maya Kadosh, Daniel Kagerer"
},
{
"role": "Viola",
"name": "Natalia Mosca"
},
{
"role": "Cello",
"name": "Xavier Pignat"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Streichquartett Nr. 12 c-Moll",
"composerId": "schubert"
},
{
"composer": "Franz Schubert",
"title": "Streichquartett Nr. 14 d-Moll, D 810 «Der Tod und das Mädchen»",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15446&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-5/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200291",
"title": "Die Walküre",
"series": "Hauptbühne",
"start": "2027-01-31T14:00:00+01:00",
"durationMin": 300,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Siegmund",
"name": "Eric Cutler"
},
{
"role": "Hunding",
"name": "Christof Fischesser"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Sieglinde",
"name": "Ekaterina Gubanova"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Brünnhilde",
"name": "Camilla Nylund"
},
{
"role": "Helmwige",
"name": "Dorothea Herbert"
},
{
"role": "Gerhilde",
"name": "Iulia Maria Dan"
},
{
"role": "Ortlinde",
"name": "Natália Tuznik"
},
{
"role": "Waltraute",
"name": "Cashlin Oostindië"
},
{
"role": "Siegrune",
"name": "Marcela Rahal"
},
{
"role": "Rossweisse",
"name": "Siena Licht Miller"
},
{
"role": "Grimgerde",
"name": "Dominika Stefańska"
},
{
"role": "Schwertleite",
"name": "Dora Jana Klarić"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Die Walküre",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15190&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-walkuere/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2059219",
"title": "Amandine Beyer: Frozen Venice",
"series": null,
"start": "2027-01-31T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Gli Incogniti"
},
{
"role": "Baroque violin & direction",
"name": "Amandine Beyer"
}
],
"program": [
{
"composer": "Marcello",
"title": ""
},
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5650&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/amandine-beyer-frozen-venice-2059219/tz/",
"source": "tonhalle"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270131-1700",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-01-31T17:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-stadtcasino_basel-310127_kit_armstrong",
"title": "Le Concert Olympique mit Kit Armstrong",
"series": "AMG Solistenabende",
"start": "2027-01-31T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Kit Armstrong"
},
{
"role": "Conductor",
"name": "Jan Caeyers"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Präludium und Fuge Nr. 2 c-Moll BWV 847 aus WTK Band I",
"composerId": "bach"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klavierkonzert Nr. 4 G-Dur op. 58",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sonate f-Moll op. 57 «Appassionata»",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 5 c-Moll op. 67",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=224",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/310127_kit_armstrong/",
"source": "stadtcasino_basel"
},
{
"id": "real-ocg-passons-aux-salons-8-20270201",
"title": "Passons aux Salons #9",
"series": "Passons aux Salons",
"start": "2027-02-01T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215275&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-8",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200032",
"title": "5. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-02-01T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Maya Kadosh, Daniel Kagerer"
},
{
"role": "Viola",
"name": "Natalia Mosca"
},
{
"role": "Cello",
"name": "Xavier Pignat"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Streichquartett Nr. 12 c-Moll",
"composerId": "schubert"
},
{
"composer": "Franz Schubert",
"title": "Streichquartett Nr. 14 d-Moll, D 810 «Der Tod und das Mädchen»",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15447&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-5/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-01022027_k128",
"title": "Guarneri Trio Prag – 40 Jahre in ursprünglicher Besetzung",
"series": "Kammermusik um halb acht",
"start": "2027-02-01T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Variationen Es-Dur op. 44",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Trio D-Dur op.70/1 „Geister“",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Trio B-Dur op. 97 „Erzherzog“",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.ticketcorner.ch/event/kammermusik-um-halb-acht-202627-stadtcasino-basel-21795136/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/01022027_k128/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055701",
"title": "Série jeunes: Petar Pejčić",
"series": "Série jeunes",
"start": "2027-02-01T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Petar Pejčić"
},
{
"role": "Piano",
"name": "Nour Ayadi"
}
],
"program": [
{
"composer": "Prokofjew",
"title": ""
},
{
"composer": "Boulanger",
"title": ""
},
{
"composer": "Rostropowitsch",
"title": ""
},
{
"composer": "Schostakowitsch",
"title": ""
},
{
"composer": "Piazzolla",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5625&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/serie-jeunes-petar-pejcic-2055701/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-020227_gfk",
"title": "Quatuor Modigliani",
"series": "Kammermusik Basel",
"start": "2027-02-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Amaury Coeytaux"
},
{
"role": "Violin",
"name": "Loïc Rio"
},
{
"role": "Viola",
"name": "Laurent Marfaing"
},
{
"role": "Cello",
"name": "François Kieffer"
}
],
"program": [
{
"composer": "Kryštof Mařatka",
"title": "AMEDEA - visage de jeune fille"
},
{
"composer": "Joseph Haydn",
"title": "Streichquartett Nr. 81, G-dur, op. 77, Nr. 1, Hob. III:81 (1799)",
"composerId": "haydn"
},
{
"composer": "Robert Schumann",
"title": "Streichquartett Nr. 3, A-dur, op. 41/3, Felix Mendelssohn-Bartholdy gewidmet (1842)",
"composerId": "schumann"
}
],
"ticketUrl": "https://www.ticketino.com/de/Event/Kammermusik-Basel-QUATUOR-MODIGLIANI/215284",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/020227_gfk/",
"source": "stadtcasino_basel"
},
{
"id": "real-stadtcasino_basel-02022027_royal_philharmonic",
"title": "Royal Philharmonic Orchestra mit Rafał Blechacz",
"series": "AMG Symphonic Gems",
"start": "2027-02-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Royal Philhamonic Orchestra"
},
{
"role": "Conductor",
"name": "Vasily Petrenko"
},
{
"role": "Piano",
"name": "Rafał Blechacz"
}
],
"program": [
{
"composer": "Frédéric Chopin",
"title": "Klavierkonzert Nr. 2 f-Moll op. 21",
"composerId": "chopin"
},
{
"composer": "Igor Strawinsky",
"title": "Feuervogel-Suite (Version 1945)"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=198",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/02022027_royal_philharmonic/",
"source": "stadtcasino_basel"
},
{
"id": "real-opera_lausanne-le-cochon-enchante-20270203-1500",
"title": "Le Cochon enchanté",
"series": "Jeune public",
"start": "2027-02-03T15:00:00+01:00",
"durationMin": 75,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Anthony Fournier"
},
{
"role": "Stage director",
"name": "Joan Mompart"
},
{
"role": "Mab, Adélaïde",
"name": "Emma Delannoy"
},
{
"role": "Dot, Le Jour",
"name": "Lisa Tourniaire"
},
{
"role": "Flora",
"name": "Julia Deit-Ferrand"
},
{
"role": "Le Livre du destin, La Vieille Femme, Mme Vent du Nord",
"name": "Carine Séchaye"
},
{
"role": "Le Roi de l'Est, Lune",
"name": "Maxence Billiemaz"
},
{
"role": "Le Roi de l'Ouest, Soleil",
"name": "Ambroise Divaret"
},
{
"role": "Le Roi Hildebrand, M. Vent du Nord",
"name": "Vincent Casagrande"
},
{
"role": "Pig, le Cochon",
"name": "Joshua Morris"
},
{
"role": "Orchestra",
"name": "Musiciens de l’HEMU et de la HEM"
}
],
"program": [
{
"composer": "Jonathan Dove",
"title": "Le Cochon enchanté"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098121",
"sourceUrl": "https://www.opera-lausanne.ch/show/le-cochon-enchante/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-200292",
"title": "Die Walküre",
"series": "Hauptbühne",
"start": "2027-02-03T17:30:00+01:00",
"durationMin": 300,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Siegmund",
"name": "Eric Cutler"
},
{
"role": "Hunding",
"name": "Christof Fischesser"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Sieglinde",
"name": "Ekaterina Gubanova"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Brünnhilde",
"name": "Camilla Nylund"
},
{
"role": "Helmwige",
"name": "Dorothea Herbert"
},
{
"role": "Gerhilde",
"name": "Iulia Maria Dan"
},
{
"role": "Ortlinde",
"name": "Natália Tuznik"
},
{
"role": "Waltraute",
"name": "Cashlin Oostindië"
},
{
"role": "Siegrune",
"name": "Marcela Rahal"
},
{
"role": "Rossweisse",
"name": "Siena Licht Miller"
},
{
"role": "Grimgerde",
"name": "Dominika Stefańska"
},
{
"role": "Schwertleite",
"name": "Dora Jana Klarić"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Die Walküre",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15191&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-walkuere/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9233",
"title": "Der Feuervogel",
"series": "Abonnementskonzert",
"start": "2027-02-03T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Claire Levacher"
},
{
"role": "Piano",
"name": "Claire Huangci"
}
],
"program": [
{
"composer": "Emmanuel Chabrier",
"title": "«Fête polonaise» aus «Le Roi malgré lui»"
},
{
"composer": "Sergej Prokofieff",
"title": "Konzert für Klavier und Orchester Nr. 3 C-Dur, op. 26"
},
{
"composer": "Igor Strawinsky",
"title": "«Der Feuervogel» Ballett-Suite"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161611/",
"sourceUrl": "https://www.musikkollegium.ch/programm/der-feuervogel-27-02-03-9233",
"source": "musikkollegium"
},
{
"id": "real-stadtcasino_basel-030227_kg",
"title": "Sinfonieorchester Basel",
"series": "KG-Sinfoniekonzerte",
"start": "2027-02-03T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
},
{
"role": "Conductor",
"name": "Shira Samuels-Shragg"
},
{
"role": "Piano",
"name": "Paul Lecocq"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Coriolan-Ouvertüre op. 62",
"composerId": "beethoven"
},
{
"composer": "Camille Saint-Saëns",
"title": "Klavierkonzert Nr. 2 g-Moll op. 22",
"composerId": "saint-saens"
},
{
"composer": "Louise Farrenc",
"title": "Sinfonie Nr. 3 g-Moll op. 36"
}
],
"ticketUrl": "https://tickets.sinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=205",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/030227_kg/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055713",
"title": "Tugan Sokhiev & Lukas Sternath",
"series": null,
"start": "2027-02-03T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Piano",
"name": "Lukas Sternath"
}
],
"program": [
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
},
{
"composer": "Berlioz",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5580&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/tugan-sokhiev-lukas-sternath-2055713/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2055714",
"title": "Orchester-Lunchkonzert mit Tugan Sokhiev",
"series": "Orchester-Lunchkonzert",
"start": "2027-02-04T12:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Tugan Sokhiev"
}
],
"program": [
{
"composer": "Berlioz",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5607&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orchester-lunchkonzert-mit-tugan-sokhiev-2055714/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9235",
"title": "Der Feuervogel",
"series": "Abonnementskonzert",
"start": "2027-02-04T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Claire Levacher"
},
{
"role": "Piano",
"name": "Claire Huangci"
}
],
"program": [
{
"composer": "Emmanuel Chabrier",
"title": "«Fête polonaise» aus «Le Roi malgré lui»"
},
{
"composer": "Sergej Prokofieff",
"title": "Konzert für Klavier und Orchester Nr. 3 C-Dur, op. 26"
},
{
"composer": "Igor Strawinsky",
"title": "«Der Feuervogel» Ballett-Suite"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161612/",
"sourceUrl": "https://www.musikkollegium.ch/programm/der-feuervogel-27-02-04-9235",
"source": "musikkollegium"
},
{
"id": "real-buehnen_bern-romeo-und-julia-27-2027-02-04-1930",
"title": "Romeo und Julia",
"series": "7. Symphoniekonzert",
"start": "2027-02-04T19:30:00+01:00",
"durationMin": 110,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Anna Vinnitskaya"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Wojciech Kilar",
"title": "Orawa für Streichorchester (1986)"
},
{
"composer": "Sergej Prokofjew",
"title": "Konzert für Klavier und Orchester Nr. 2 g-Moll Op. 16 (1912/13, rev. 1923)"
},
{
"composer": "Sergej Prokofjew",
"title": "Suite aus Romeo und Julia (1935/36, Auszüge aus den Ballett-Suiten Nr. 1 Op. 64a, Nr. 2 Op. 64b und Nr. 3 Op. 101, zusammengestellt von Krzysztof Urbański)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2036&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/romeo-und-julia-27/",
"source": "buehnen_bern"
},
{
"id": "real-stadtcasino_basel-040227_vosiko",
"title": "Sinfonieorchester Basel",
"series": "Volkssinfoniekonzerte",
"start": "2027-02-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
},
{
"role": "Conductor",
"name": "Shira Samuels-Shragg"
},
{
"role": "Piano",
"name": "Paul Lecocq"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Coriolan-Ouvertüre op. 62",
"composerId": "beethoven"
},
{
"composer": "Camille Saint-Saëns",
"title": "Klavierkonzert Nr. 2 g-Moll op. 22",
"composerId": "saint-saens"
},
{
"composer": "Louise Farrenc",
"title": "Sinfonie Nr. 3 g-Moll op. 36"
}
],
"ticketUrl": "https://tickets.volkssinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=210",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/040227_vosiko/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055715",
"title": "Tugan Sokhiev & Lukas Sternath",
"series": null,
"start": "2027-02-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Piano",
"name": "Lukas Sternath"
}
],
"program": [
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
},
{
"composer": "Berlioz",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5557&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/tugan-sokhiev-lukas-sternath-2055715/",
"source": "tonhalle"
},
{
"id": "real-osi-175708396065712",
"title": "Manu Delago",
"series": "OSI al DOCKS",
"start": "2027-02-04T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Lars Mlekusch"
},
{
"role": "Handpan",
"name": "Manu Delago"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Manu Delago",
"title": "Silver Kobalt, Down to the summit per orchestra"
},
{
"composer": "Manu Delago",
"title": "Parasol Peak per handpan e orchestra"
},
{
"composer": "Manu Delago",
"title": "The carpenter bee transformed per marimba e orchestra d’archi"
},
{
"composer": "Manu Delago",
"title": "Environ us per handpan, percussioni e orchestra"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11843",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-02-04-20-00",
"source": "osi"
},
{
"id": "real-musikkollegium-9239",
"title": "Meet Claire Huangci & friends",
"series": "Feierabend-Konzert",
"start": "2027-02-05T17:30:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Claire Huangci"
},
{
"role": "Violin",
"name": "Franziska Hölscher"
},
{
"role": "Cello",
"name": "Harriet Krijgh"
},
{
"role": "Host",
"name": "Gabiz Reichert"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "«D'un matin de printemps» Fassung für Klaviertrio"
},
{
"composer": "Claude Debussy",
"title": "Klaviertrio G-Dur",
"composerId": "debussy"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Klaviertrio c-Moll, op. 66",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/meet-claire-huangci-friends-27-02-05-9239",
"sourceUrl": "https://www.musikkollegium.ch/programm/meet-claire-huangci-friends-27-02-05-9239",
"source": "musikkollegium"
},
{
"id": "real-buehnen_bern-romeo-und-julia-27-2027-02-05-1930",
"title": "Romeo und Julia",
"series": "7. Symphoniekonzert",
"start": "2027-02-05T19:30:00+01:00",
"durationMin": 110,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Anna Vinnitskaya"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Wojciech Kilar",
"title": "Orawa für Streichorchester (1986)"
},
{
"composer": "Sergej Prokofjew",
"title": "Konzert für Klavier und Orchester Nr. 2 g-Moll Op. 16 (1912/13, rev. 1923)"
},
{
"composer": "Sergej Prokofjew",
"title": "Suite aus Romeo und Julia (1935/36, Auszüge aus den Ballett-Suiten Nr. 1 Op. 64a, Nr. 2 Op. 64b und Nr. 3 Op. 101, zusammengestellt von Krzysztof Urbański)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2206&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/romeo-und-julia-27/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2063655",
"title": "Un poco ANIMATO",
"series": null,
"start": "2027-02-05T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonieorchester Tifico"
},
{
"role": "Conductor",
"name": "Christof Brunner"
}
],
"program": [
{
"composer": "Hans Zimmer & John Powell",
"title": ""
},
{
"composer": "Menken",
"title": ""
},
{
"composer": "Ottman",
"title": ""
},
{
"composer": "Hisaishi",
"title": ""
},
{
"composer": "Broughton",
"title": ""
},
{
"composer": "Leigh Harline & Ned Washington",
"title": ""
},
{
"composer": "Churchill",
"title": ""
},
{
"composer": "Howard",
"title": ""
},
{
"composer": "Elfman",
"title": ""
},
{
"composer": "Powell",
"title": ""
},
{
"composer": "Goldsmith",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/un-poco-animato-2063655/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/un-poco-animato-2063655/tz/",
"source": "tonhalle"
},
{
"id": "real-opera_lausanne-concours-voix-nouvelles-20270205-2000",
"title": "Voix Nouvelles",
"series": "Finale régionale du concours de chant",
"start": "2027-02-05T20:00:00+01:00",
"durationMin": 120,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Marie-Cécile Bertheau"
}
],
"program": [],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229288578945",
"sourceUrl": "https://www.opera-lausanne.ch/show/concours-voix-nouvelles/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-200293",
"title": "Die Walküre",
"series": "Hauptbühne",
"start": "2027-02-06T18:00:00+01:00",
"durationMin": 300,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianandrea Noseda"
},
{
"role": "Siegmund",
"name": "Eric Cutler"
},
{
"role": "Hunding",
"name": "Christof Fischesser"
},
{
"role": "Wotan",
"name": "Michael Volle"
},
{
"role": "Sieglinde",
"name": "Ekaterina Gubanova"
},
{
"role": "Fricka",
"name": "Claudia Mahnke"
},
{
"role": "Brünnhilde",
"name": "Camilla Nylund"
},
{
"role": "Helmwige",
"name": "Dorothea Herbert"
},
{
"role": "Gerhilde",
"name": "Iulia Maria Dan"
},
{
"role": "Ortlinde",
"name": "Natália Tuznik"
},
{
"role": "Waltraute",
"name": "Cashlin Oostindië"
},
{
"role": "Siegrune",
"name": "Marcela Rahal"
},
{
"role": "Rossweisse",
"name": "Siena Licht Miller"
},
{
"role": "Grimgerde",
"name": "Dominika Stefańska"
},
{
"role": "Schwertleite",
"name": "Dora Jana Klarić"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Director",
"name": "Andreas Homoki"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Die Walküre",
"composerId": "wagner"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15192&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-walkuere/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-le-voyage-a-reims-20270206",
"title": "Le Voyage à Reims",
"series": null,
"start": "2027-02-06T19:30:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Corinna",
"name": "Melissa Petit"
},
{
"role": "Madame Cortese",
"name": "Salome Jicia"
},
{
"role": "La Comtesse de Folleville",
"name": "Sabine Devieilhe"
},
{
"role": "La Marquise Melibea",
"name": "Teresa Iervolino"
},
{
"role": "Le Comte de Libenskof",
"name": "Maxim Mironov"
},
{
"role": "Le Chevalier Belfiore",
"name": "Jack Swanson"
},
{
"role": "Lord Sidney",
"name": "Michael Mofidian"
},
{
"role": "Don Alvaro",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Le Baron de Trombonok",
"name": "Michele Govi"
},
{
"role": "Don Profondo",
"name": "Nicola Alaimo"
},
{
"role": "Don Prudenzio",
"name": "Jared Mac Werlein"
},
{
"role": "Maddalena",
"name": "Varduhi Khachatryan"
},
{
"role": "Modestina",
"name": "Magali Duceau-Berly"
},
{
"role": "Don Luigino",
"name": "Rémi Garin"
},
{
"role": "Gelsomino / Zefirino",
"name": "José Pazos"
},
{
"role": "Antonio",
"name": "Rodrigo Garcia"
},
{
"role": "Delia",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Le Voyage à Reims",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/le-voyage-a-reims",
"source": "osr"
},
{
"id": "real-tonhalle-2063414",
"title": "Sergey Katchatryan & Alexandre Kantarow",
"series": null,
"start": "2027-02-06T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Sergey Katchatryan"
},
{
"role": "Piano",
"name": "Alexandre Kantorow"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
},
{
"composer": "Debussy",
"title": "",
"composerId": "debussy"
},
{
"composer": "Babadschanian",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/sergey-katchatryan-alexandre-kantarow-2063414/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/sergey-katchatryan-alexandre-kantarow-2063414/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200034",
"title": "6. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-02-07T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Clarinet",
"name": "Filipa Nunes"
},
{
"role": "Violin",
"name": "Hanna Weinmeister, Maya Kadosh"
},
{
"role": "Viola",
"name": "Maria Clément"
},
{
"role": "Cello",
"name": "Seiji Yokota"
},
{
"role": "Piano",
"name": "Kateryna Tereshchenko"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Ouvertüre über hebräische Themen op. 34 für Klarinette, Streichquartett, Klavier"
},
{
"composer": "Aaron Copland",
"title": "Sextet für Klarinette, Streichquartett, Klavier"
},
{
"composer": "Darius Milhaud",
"title": "La Création du Monde op. 81a (Kammerfas- sung für Klarinette, zwei Violinen, Violoncello und Klavier)"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15448&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-6/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055690",
"title": "Kammermusik-Matinee",
"series": null,
"start": "2027-02-07T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Isabelle Lambelet"
},
{
"role": "Viola",
"name": "Héctor Cámara Ruiz"
},
{
"role": "Cello",
"name": "Gabriele Ardizzone"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Françaix",
"title": ""
},
{
"composer": "Dohnányi",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5618&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-matinee-2055690/",
"source": "tonhalle"
},
{
"id": "real-cnz-145",
"title": "Voltaire-Konzert N° 8: Michael Maierhof im Gespräch",
"series": null,
"start": "2027-02-07T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Cabaret Voltaire",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Percussion",
"name": "Brian Archinal"
}
],
"program": [
{
"composer": "Michael Maierhof",
"title": "splitting 24, für Schlagzeug (2012/13)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179953/",
"sourceUrl": "https://cnz.ch/voltaire-8",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-199930",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-07T18:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15315&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-10-20270208",
"title": "Passons aux Salons #10",
"series": "Passons aux Salons",
"start": "2027-02-08T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215276&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-10",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200035",
"title": "6. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-02-08T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Clarinet",
"name": "Filipa Nunes"
},
{
"role": "Violin",
"name": "Hanna Weinmeister, Maya Kadosh"
},
{
"role": "Viola",
"name": "Maria Clément"
},
{
"role": "Cello",
"name": "Seiji Yokota"
},
{
"role": "Piano",
"name": "Kateryna Tereshchenko"
}
],
"program": [
{
"composer": "Sergej Prokofjew",
"title": "Ouvertüre über hebräische Themen op. 34 für Klarinette, Streichquartett, Klavier"
},
{
"composer": "Aaron Copland",
"title": "Sextet für Klarinette, Streichquartett, Klavier"
},
{
"composer": "Darius Milhaud",
"title": "La Création du Monde op. 81a (Kammerfas- sung für Klarinette, zwei Violinen, Violoncello und Klavier)"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15449&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-6/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2070528",
"title": "Kammermusik mit Oboe",
"series": null,
"start": "2027-02-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Oboe",
"name": "Leonid Surkov"
},
{
"role": "Violin",
"name": "Dmitry Smirnov"
},
{
"role": "Viola",
"name": "Julia Izabela Wawrowska"
},
{
"role": "Cello",
"name": "Sandro Meszaros"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Yun",
"title": ""
},
{
"composer": "Maconchy",
"title": ""
},
{
"composer": "Druschetzky",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/kammermusik-mit-oboe-2070528/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/kammermusik-mit-oboe-2070528/tz/",
"source": "tonhalle"
},
{
"id": "real-osr-le-voyage-a-reims-20270208",
"title": "Le Voyage à Reims",
"series": null,
"start": "2027-02-08T19:30:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Corinna",
"name": "Melissa Petit"
},
{
"role": "Madame Cortese",
"name": "Salome Jicia"
},
{
"role": "La Comtesse de Folleville",
"name": "Sabine Devieilhe"
},
{
"role": "La Marquise Melibea",
"name": "Teresa Iervolino"
},
{
"role": "Le Comte de Libenskof",
"name": "Maxim Mironov"
},
{
"role": "Le Chevalier Belfiore",
"name": "Jack Swanson"
},
{
"role": "Lord Sidney",
"name": "Michael Mofidian"
},
{
"role": "Don Alvaro",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Le Baron de Trombonok",
"name": "Michele Govi"
},
{
"role": "Don Profondo",
"name": "Nicola Alaimo"
},
{
"role": "Don Prudenzio",
"name": "Jared Mac Werlein"
},
{
"role": "Maddalena",
"name": "Varduhi Khachatryan"
},
{
"role": "Modestina",
"name": "Magali Duceau-Berly"
},
{
"role": "Don Luigino",
"name": "Rémi Garin"
},
{
"role": "Gelsomino / Zefirino",
"name": "José Pazos"
},
{
"role": "Antonio",
"name": "Rodrigo Garcia"
},
{
"role": "Delia",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Le Voyage à Reims",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/le-voyage-a-reims",
"source": "osr"
},
{
"id": "real-zko-19514",
"title": "Alena Baeva",
"series": "Abo-Konzerte",
"start": "2027-02-09T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Alena Baeva"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Jean Sibelius",
"title": "Impromptu für Streichorchester, op. 5",
"composerId": "sibelius"
},
{
"composer": "Othmar Schoeck",
"title": "Sommernacht. Pastorales Intermezzo für Streichorchester, op. 58"
},
{
"composer": "Jean Sibelius",
"title": "Andantino und III. Alla gavotta, aus: Sechs Humoresken für Violine und Orchester, opp. 87 und 89",
"composerId": "sibelius"
},
{
"composer": "Fanny Hensel-Mendelssohn",
"title": "Streichquartett Es-Dur (Fassung für Streichorchester)",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn",
"title": "Konzert für Violine und Streichorchester d-Moll, MWV O3",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1953",
"sourceUrl": "https://zko.ch/events/alena-baeva/",
"source": "zko"
},
{
"id": "real-ocg-symphonie-africaine-20270209",
"title": "Symphonie africaine",
"series": null,
"start": "2027-02-09T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Voice",
"name": "Angélique Kidjo"
},
{
"role": "Orchestra",
"name": "l'Orchestre des Alpes et du Léman"
}
],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229836316589",
"sourceUrl": "https://locg.ch/fr/calendrier/symphonie-africaine",
"source": "ocg"
},
{
"id": "real-osr-le-voyage-a-reims-20270210",
"title": "Le Voyage à Reims",
"series": null,
"start": "2027-02-10T19:30:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Corinna",
"name": "Melissa Petit"
},
{
"role": "Madame Cortese",
"name": "Salome Jicia"
},
{
"role": "La Comtesse de Folleville",
"name": "Sabine Devieilhe"
},
{
"role": "La Marquise Melibea",
"name": "Teresa Iervolino"
},
{
"role": "Le Comte de Libenskof",
"name": "Maxim Mironov"
},
{
"role": "Le Chevalier Belfiore",
"name": "Jack Swanson"
},
{
"role": "Lord Sidney",
"name": "Michael Mofidian"
},
{
"role": "Don Alvaro",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Le Baron de Trombonok",
"name": "Michele Govi"
},
{
"role": "Don Profondo",
"name": "Nicola Alaimo"
},
{
"role": "Don Prudenzio",
"name": "Jared Mac Werlein"
},
{
"role": "Maddalena",
"name": "Varduhi Khachatryan"
},
{
"role": "Modestina",
"name": "Magali Duceau-Berly"
},
{
"role": "Don Luigino",
"name": "Rémi Garin"
},
{
"role": "Gelsomino / Zefirino",
"name": "José Pazos"
},
{
"role": "Antonio",
"name": "Rodrigo Garcia"
},
{
"role": "Delia",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Le Voyage à Reims",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/le-voyage-a-reims",
"source": "osr"
},
{
"id": "real-tonhalle-2055743",
"title": "Semyon Bychkov mit Bruckner",
"series": null,
"start": "2027-02-10T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Semyon Bychkov"
}
],
"program": [
{
"composer": "Bruckner",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5575&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/semyon-bychkov-mit-bruckner-2055743/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199931",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-11T19:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15316&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055744",
"title": "Semyon Bychkov mit Bruckner",
"series": null,
"start": "2027-02-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Semyon Bychkov"
}
],
"program": [
{
"composer": "Bruckner",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5552&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/semyon-bychkov-mit-bruckner-2055744/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200214",
"title": "Roméo et Juliette",
"series": "Hauptbühne",
"start": "2027-02-12T19:00:00+01:00",
"durationMin": 175,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christopher Franklin"
},
{
"role": "Juliette",
"name": "Juliana Grigoryan"
},
{
"role": "Roméo",
"name": "Juan Diego Flórez"
},
{
"role": "Frère Laurent",
"name": "Brent Michael Smith"
},
{
"role": "Le Comte Capulet",
"name": "Andrew Moore"
},
{
"role": "Mercutio",
"name": "Gregory Feldmann"
},
{
"role": "Stéphano",
"name": "Martina Baroni"
},
{
"role": "Tybalt",
"name": "Anthony León"
},
{
"role": "Gertrude",
"name": "Irène Friedli"
},
{
"role": "Le Comte Paris",
"name": "Lazar Parezanin"
},
{
"role": "Gregorio",
"name": "Evan Gray"
},
{
"role": "Benvolio",
"name": "Tautvydas Slizauskas"
},
{
"role": "Le Duc de Vérone",
"name": "Christian Valle"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Ted Huffman"
},
{
"role": "Choreographer",
"name": "Pim Veulings"
}
],
"program": [
{
"composer": "Charles Gounod",
"title": "Roméo et Juliette"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15256&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-et-juliette/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-le-voyage-a-reims-20270212",
"title": "Le Voyage à Reims",
"series": null,
"start": "2027-02-12T19:30:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Corinna",
"name": "Melissa Petit"
},
{
"role": "Madame Cortese",
"name": "Salome Jicia"
},
{
"role": "La Comtesse de Folleville",
"name": "Sabine Devieilhe"
},
{
"role": "La Marquise Melibea",
"name": "Teresa Iervolino"
},
{
"role": "Le Comte de Libenskof",
"name": "Maxim Mironov"
},
{
"role": "Le Chevalier Belfiore",
"name": "Jack Swanson"
},
{
"role": "Lord Sidney",
"name": "Michael Mofidian"
},
{
"role": "Don Alvaro",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Le Baron de Trombonok",
"name": "Michele Govi"
},
{
"role": "Don Profondo",
"name": "Nicola Alaimo"
},
{
"role": "Don Prudenzio",
"name": "Jared Mac Werlein"
},
{
"role": "Maddalena",
"name": "Varduhi Khachatryan"
},
{
"role": "Modestina",
"name": "Magali Duceau-Berly"
},
{
"role": "Don Luigino",
"name": "Rémi Garin"
},
{
"role": "Gelsomino / Zefirino",
"name": "José Pazos"
},
{
"role": "Antonio",
"name": "Rodrigo Garcia"
},
{
"role": "Delia",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Le Voyage à Reims",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/le-voyage-a-reims",
"source": "osr"
},
{
"id": "real-tonhalle-2059165",
"title": "Rachmaninoff Trio",
"series": null,
"start": "2027-02-12T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Alexey Botvinov"
},
{
"role": "Violin",
"name": "Stefan Tarara"
},
{
"role": "Cello",
"name": "Anzhe Zuo"
}
],
"program": [
{
"composer": "Rachmaninow",
"title": ""
},
{
"composer": "Franck",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5769&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/rachmaninoff-trio-2059165/tz/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2056831",
"title": "Stadtharmonie Zürich Oerlikon-Seebach",
"series": null,
"start": "2027-02-13T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Stadtharmonie Zürich Oerlikon-Seebach"
},
{
"role": "Conductor",
"name": "Carlo Balmelli"
}
],
"program": [
{
"composer": "Maslanka",
"title": ""
},
{
"composer": "Wehr",
"title": ""
},
{
"composer": "Horne",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/stadtharmonie-zuerich-oerlikon-seebach-2056831/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/stadtharmonie-zuerich-oerlikon-seebach-2056831/tz/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19941",
"title": "KAMMERMUSIK-MATINÉE 4",
"series": "Kammermusik",
"start": "2027-02-14T11:15:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Maciej Burdzy"
},
{
"role": "Violin",
"name": "Jordi Rodriguez Cayuelas"
},
{
"role": "Viola",
"name": "José Batista"
},
{
"role": "Cello",
"name": "Jonas Vischi"
},
{
"role": "Conductor",
"name": "Jonathan Bloxham"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Streichquintett in C-Dur, D 956",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-4-e8qchm",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-4-4/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199801",
"title": "Sorita & Lyniv",
"series": "Philharmonische Konzerte",
"start": "2027-02-14T11:15:00+01:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Oksana Lyniv"
},
{
"role": "Piano",
"name": "Kyōhei Sorita"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
}
],
"program": [
{
"composer": "Frédéric Chopin",
"title": "Klavierkonzert Nr. 1 e-Moll op. 11",
"composerId": "chopin"
},
{
"composer": "John Adams",
"title": "«Harmonielehre» für Orchester"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15409&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/4-philharmonisches-konzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-le-voyage-a-reims-20270214",
"title": "Le Voyage à Reims",
"series": null,
"start": "2027-02-14T15:00:00+01:00",
"durationMin": 165,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jader Bignamini"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Corinna",
"name": "Melissa Petit"
},
{
"role": "Madame Cortese",
"name": "Salome Jicia"
},
{
"role": "La Comtesse de Folleville",
"name": "Sabine Devieilhe"
},
{
"role": "La Marquise Melibea",
"name": "Teresa Iervolino"
},
{
"role": "Le Comte de Libenskof",
"name": "Maxim Mironov"
},
{
"role": "Le Chevalier Belfiore",
"name": "Jack Swanson"
},
{
"role": "Lord Sidney",
"name": "Michael Mofidian"
},
{
"role": "Don Alvaro",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Le Baron de Trombonok",
"name": "Michele Govi"
},
{
"role": "Don Profondo",
"name": "Nicola Alaimo"
},
{
"role": "Don Prudenzio",
"name": "Jared Mac Werlein"
},
{
"role": "Maddalena",
"name": "Varduhi Khachatryan"
},
{
"role": "Modestina",
"name": "Magali Duceau-Berly"
},
{
"role": "Don Luigino",
"name": "Rémi Garin"
},
{
"role": "Gelsomino / Zefirino",
"name": "José Pazos"
},
{
"role": "Antonio",
"name": "Rodrigo Garcia"
},
{
"role": "Delia",
"name": "Fanny Soyer"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Gioachino Rossini",
"title": "Le Voyage à Reims",
"composerId": "rossini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/le-voyage-a-reims",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199932",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-14T19:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15317&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20406",
"title": "KLANGXCHANGE: KAMMERMUSIK TRIFFT AUF GESPRÄCH 3",
"series": null,
"start": "2027-02-14T19:30:00+01:00",
"durationMin": 120,
"cityId": "lucerne",
"venueName": "Hotel Beau Séjour",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/klangxchange-hotel-beau-sejour-u0mk56",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/klangxchange-kammermusik-trifft-auf-gespraech-3/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2056838",
"title": "Sir John Eliot Gardiner: Bach, Messe h-Moll",
"series": null,
"start": "2027-02-15T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "The Constellation Choir & Orchestra"
},
{
"role": "Conductor",
"name": "Sir John Eliot Gardiner"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5651&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/sir-john-eliot-gardiner-bach-messe-h-moll-2056838/tz/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19904",
"title": "VON GOTHAM ZUR AUSSTELLUNG – ELFMAN & MUSSORGSKY",
"series": "Sinfoniekonzerte",
"start": "2027-02-17T19:30:00+01:00",
"durationMin": 95,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Aurel Dawidiuk"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Danny Elfman",
"title": "Cellokonzert (Schweizer Erstaufführung)"
},
{
"composer": "Modest Mussorgsky",
"title": "Bilder einer Ausstellung"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/von-gotham-zur-ausstellung-elfman-mussorgsky-qj5chk",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/von-gotham-zur-ausstellung-elfman-mussorgsky/",
"source": "lso_luzern"
},
{
"id": "real-musikkollegium-9405",
"title": "Beethoven & Haydn mit Enrico Onofri",
"series": "Hauskonzert",
"start": "2027-02-18T19:00:00+01:00",
"durationMin": 100,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Enrico Onofri"
},
{
"role": "Violin",
"name": "Francesco Sica"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zum Trauerspiel «Coriolan» c-Moll, op. 62",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Romanze für Violine und Orchester Nr. 1 G-Dur, op.40",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Romanze für Violine und Orchester Nr. 2 F-Dur, op. 50",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zur Ballettmusik «Die Geschöpfe des Prometheus» op. 43",
"composerId": "beethoven"
},
{
"composer": "Per Nørgård",
"title": "«Pastoral» für Streichorchester"
},
{
"composer": "Joseph Haydn",
"title": "Sinfonie Nr. 100 G-Dur, Hob I:100 «Militär»",
"composerId": "haydn"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179409/",
"sourceUrl": "https://www.musikkollegium.ch/programm/beethoven-haydn-mit-enrico-onofri-27-02-18-9405",
"source": "musikkollegium"
},
{
"id": "real-buehnen_bern-dvoraks-siebte-2027-02-18-1930",
"title": "Dvořáks Siebte",
"series": "8. Symphoniekonzert",
"start": "2027-02-18T19:30:00+01:00",
"durationMin": 90,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Witold Lutosławski",
"title": "Konzert für Violoncello und Orchester (1969/70)"
},
{
"composer": "Antonín Dvořák",
"title": "Symphonie Nr. 7 d-Moll op. 70 (1884/85)",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2039&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/dvoraks-siebte/",
"source": "buehnen_bern"
},
{
"id": "real-lso_luzern-19903",
"title": "VON GOTHAM ZUR AUSSTELLUNG – ELFMAN & MUSSORGSKY",
"series": "Sinfoniekonzerte",
"start": "2027-02-18T19:30:00+01:00",
"durationMin": 95,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Aurel Dawidiuk"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Danny Elfman",
"title": "Cellokonzert (Schweizer Erstaufführung)"
},
{
"composer": "Modest Mussorgsky",
"title": "Bilder einer Ausstellung"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/von-gotham-zur-ausstellung-elfman-mussorgsky-ie4jpb",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/von-gotham-zur-ausstellung-elfman-mussorgsky-2/",
"source": "lso_luzern"
},
{
"id": "real-osi-175711071452247",
"title": "Isabelle Faust",
"series": "OSI al LAC",
"start": "2027-02-18T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giovanni Antonini"
},
{
"role": "Violin",
"name": "Isabelle Faust"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Ouverture in do maggiore in stile italiano D 591",
"composerId": "schubert"
},
{
"composer": "Giovanni Battista Viotti",
"title": "Concerto per violino e orchestra n. 22 in la minore"
},
{
"composer": "Franz Schubert",
"title": "Sinfonia n. 6 in do maggiore D 589 La Piccola",
"composerId": "schubert"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11762",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-02-18-20-00",
"source": "osi"
},
{
"id": "real-buehnen_bern-dvoraks-siebte-2027-02-19-1930",
"title": "Dvořáks Siebte",
"series": "8. Symphoniekonzert",
"start": "2027-02-19T19:30:00+01:00",
"durationMin": 90,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Witold Lutosławski",
"title": "Konzert für Violoncello und Orchester (1969/70)"
},
{
"composer": "Antonín Dvořák",
"title": "Symphonie Nr. 7 d-Moll op. 70 (1884/85)",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2207&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/dvoraks-siebte/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2063619",
"title": "Mozart Requiem",
"series": null,
"start": "2027-02-19T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie Baden-Baden"
},
{
"role": "Choir",
"name": "Arcis-Vocalisten München"
},
{
"role": "Conductor",
"name": "Manfred Obrecht"
},
{
"role": "Piano",
"name": "Teo Gheorghiu"
},
{
"role": "Soprano",
"name": "Amelia Scicolone"
},
{
"role": "Mezzo-soprano",
"name": "Maria Riccarda Wesseling"
},
{
"role": "Tenor",
"name": "Nikolaus Pfannkuch"
},
{
"role": "Bass",
"name": "Thomas Gropper"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://www.obrassoconcerts.ch/programm/mozart-requiem",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/mozart-requiem-2063619/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200215",
"title": "Roméo et Juliette",
"series": "Hauptbühne",
"start": "2027-02-19T20:00:00+01:00",
"durationMin": 175,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christopher Franklin"
},
{
"role": "Juliette",
"name": "Juliana Grigoryan"
},
{
"role": "Roméo",
"name": "Juan Diego Flórez"
},
{
"role": "Frère Laurent",
"name": "Brent Michael Smith"
},
{
"role": "Le Comte Capulet",
"name": "Andrew Moore"
},
{
"role": "Mercutio",
"name": "Gregory Feldmann"
},
{
"role": "Stéphano",
"name": "Martina Baroni"
},
{
"role": "Tybalt",
"name": "Anthony León"
},
{
"role": "Gertrude",
"name": "Irène Friedli"
},
{
"role": "Le Comte Paris",
"name": "Lazar Parezanin"
},
{
"role": "Gregorio",
"name": "Evan Gray"
},
{
"role": "Benvolio",
"name": "Tautvydas Slizauskas"
},
{
"role": "Le Duc de Vérone",
"name": "Christian Valle"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Ted Huffman"
},
{
"role": "Choreographer",
"name": "Pim Veulings"
}
],
"program": [
{
"composer": "Charles Gounod",
"title": "Roméo et Juliette"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15257&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-et-juliette/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199933",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-20T19:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15318&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-210227_i_tempi",
"title": "Kammerorchester I TEMPI – Preisträgerkonzert",
"series": "Musiksaal",
"start": "2027-02-21T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gevorg Gharabekyan"
},
{
"role": "Orchestra",
"name": "Kammerorchester I TEMPI"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Vier Jahreszeiten",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "Weitere virtuose Werke",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "(Das definitive Programm wird nach dem Wettbewerb im zweiten Halbjahr 2026 bekannt gegeben.)",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.ticketino.com/de/seatmap/213832",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/210227_i_tempi/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-200216",
"title": "Roméo et Juliette",
"series": "Hauptbühne",
"start": "2027-02-21T19:00:00+01:00",
"durationMin": 175,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christopher Franklin"
},
{
"role": "Juliette",
"name": "Juliana Grigoryan"
},
{
"role": "Roméo",
"name": "Juan Diego Flórez"
},
{
"role": "Frère Laurent",
"name": "Brent Michael Smith"
},
{
"role": "Le Comte Capulet",
"name": "Andrew Moore"
},
{
"role": "Mercutio",
"name": "Gregory Feldmann"
},
{
"role": "Stéphano",
"name": "Martina Baroni"
},
{
"role": "Tybalt",
"name": "Anthony León"
},
{
"role": "Gertrude",
"name": "Irène Friedli"
},
{
"role": "Le Comte Paris",
"name": "Lazar Parezanin"
},
{
"role": "Gregorio",
"name": "Evan Gray"
},
{
"role": "Benvolio",
"name": "Tautvydas Slizauskas"
},
{
"role": "Le Duc de Vérone",
"name": "Christian Valle"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Ted Huffman"
},
{
"role": "Choreographer",
"name": "Pim Veulings"
}
],
"program": [
{
"composer": "Charles Gounod",
"title": "Roméo et Juliette"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15258&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-et-juliette/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-11-20270222",
"title": "Passons aux Salons #11",
"series": "Passons aux Salons",
"start": "2027-02-22T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215277&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-11",
"source": "ocg"
},
{
"id": "real-stadtcasino_basel-230227_gfk",
"title": "Berliner Solisten Sextett",
"series": "Kammermusik Basel",
"start": "2027-02-23T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Mirijam Contzen"
},
{
"role": "Violin",
"name": "Latica Honda-Rosenberg"
},
{
"role": "Viola",
"name": "Hartmut Rohde"
},
{
"role": "Viola",
"name": "Nora Chastain"
},
{
"role": "Cello",
"name": "Jens Peter Maintz"
},
{
"role": "Cello",
"name": "Konstantin Heidrich"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Streichquintett C-dur, op. 29 (1800/01)",
"composerId": "beethoven"
},
{
"composer": "Richard Strauss",
"title": "Vorspiel für Streichsextett zur Oper «Capriccio», F-dur, op. 85 (1940–41)",
"composerId": "richard-strauss"
},
{
"composer": "Erich Wolfgang Korngold",
"title": "Streichsextett D-dur, op. 10 (1914)"
}
],
"ticketUrl": "https://www.ticketino.com/de/Event/Kammermusik-Basel-BERLINER-SOLISTEN-SEXTETT/215285",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/230227_gfk/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-199934",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-24T19:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15319&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9241",
"title": "FINTANGO mit Martin Fröst",
"series": "Abonnementskonzert",
"start": "2027-02-24T19:30:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Christoph Koncz"
},
{
"role": "Clarinet",
"name": "Martin Fröst"
}
],
"program": [
{
"composer": "Heinz Karl Gruber",
"title": "«FINTango» für Klarinette und grosses Kammerorchester"
},
{
"composer": "Franz Schubert",
"title": "Sinfonie Nr. 8 C-Dur, D 944 «Grosse»",
"composerId": "schubert"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/162208/",
"sourceUrl": "https://www.musikkollegium.ch/programm/fintango-mit-martin-froest-27-02-24-9241",
"source": "musikkollegium"
},
{
"id": "real-osr-o5-l4-20270224",
"title": "Rêves de violon",
"series": "Série O",
"start": "2027-02-24T19:30:00+01:00",
"durationMin": 100,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Bertrand de Billy"
},
{
"role": "Violin",
"name": "Alexandra Conunova"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Cécile Chaminade",
"title": "Callirhoë, suite d’orchestre op. 37"
},
{
"composer": "Camille Saint-Saëns",
"title": "Concerto pour violon et orchestre N° 3 en si mineur op. 61",
"composerId": "saint-saens"
},
{
"composer": "Josef Suk",
"title": "Pohádka, op. 16"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/o5-l4",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/o5-l4",
"source": "osr"
},
{
"id": "real-sob-12177",
"title": "Titan",
"series": "Sinfoniekonzert",
"start": "2027-02-24T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Clarinet",
"name": "Rossana Rossignoli"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Geoffrey Gordon",
"title": "Bonus Track \"Salt\" (Auftragskomposition / Uraufführung)"
},
{
"composer": "Geoffrey Gordon",
"title": "\"Icarus\" für Klarinette und Orchester (Auftragskomposition / Uraufführung)"
},
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 1 D-Dur \"Titan\"",
"composerId": "mahler"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078769&productId=10229721147338&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/titan/12177",
"source": "sob"
},
{
"id": "real-stadtcasino_basel-24022027_virgile_barthe",
"title": "Virgile Barthe",
"series": "AMG Rising Stars",
"start": "2027-02-24T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Guitar",
"name": "Virgile Barthe"
}
],
"program": [
{
"composer": "Luis de Narváez",
"title": "Seis diferencias"
},
{
"composer": "Luis de Narváez",
"title": "sobre «O gloriosa Domina»"
},
{
"composer": "Dietrich Buxtehude",
"title": "Suite e-Moll (arr. Julian Bream)"
},
{
"composer": "Dietrich Buxtehude",
"title": "Allemande – Courante – Sarabande – Gigue"
},
{
"composer": "Domenico Scarlatti",
"title": "Sonate K 213 / L 108 (arr. Claudio Giuliani)"
},
{
"composer": "Domenico Scarlatti",
"title": "Sonate K 491 / L 164 (arr. David Russel)"
},
{
"composer": "Domenico Scarlatti",
"title": "Sonate K 32 / L 423 (arr. Fabio Zanon)"
},
{
"composer": "Domenico Scarlatti",
"title": "Sonate K 492 / L 14 (arr. Gérard Abiton)"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Aus den «Liedern ohne Worte»:",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Allegretto tranquillo op. 30 Nr. 6",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "«Venezianisches Gondellied» (arr. Virgile Barthe)",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Moderato op. 19 Nr. 4 (arr. Virgile Barthe)",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Andante sostenuto op. 19 Nr. 6",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "“Venezianisches Gondellied” (arr. Dusan Bogdanovic)",
"composerId": "mendelssohn"
},
{
"composer": "Isaac Albéniz",
"title": "«Evocación» aus «Iberia», Heft 1 (arr. Javier Riba)"
},
{
"composer": "Isaac Albéniz",
"title": "«Asturias» aus der «Suite española» op. 47 (arr. Virgile Barthe)"
},
{
"composer": "Isaac Albéniz",
"title": "«Rumores de la Caleta»"
},
{
"composer": "Isaac Albéniz",
"title": "Nr. 6 aus «Recuerdos de viaje» op. 71 (arr. David Russell)"
},
{
"composer": "Isaac Albéniz",
"title": "«Torre Bermeja»"
},
{
"composer": "Isaac Albéniz",
"title": "Nr. 12 aus «12 Piezas características» op. 92 (arr. Virgile Barthe)"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=241",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/24022027_virgile_barthe/",
"source": "stadtcasino_basel"
},
{
"id": "real-osi-205105155326360",
"title": "Lunch with OSI",
"series": "be connected",
"start": "2027-02-25T12:30:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Trevino"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Anton Bruckner",
"title": "Sinfonia n. 5 in si bemolle maggiore"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11847",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-02-25-12-30",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-199987",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-02-25T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Jonas Kaufmann"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15412&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9243",
"title": "FINTANGO mit Martin Fröst",
"series": "Abonnementskonzert",
"start": "2027-02-25T19:30:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Christoph Koncz"
},
{
"role": "Clarinet",
"name": "Martin Fröst"
}
],
"program": [
{
"composer": "Heinz Karl Gruber",
"title": "«FINTango» für Klarinette und grosses Kammerorchester"
},
{
"composer": "Franz Schubert",
"title": "Sinfonie Nr. 8 C-Dur, D 944 «Grosse»",
"composerId": "schubert"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/162209/",
"sourceUrl": "https://www.musikkollegium.ch/programm/fintango-mit-martin-froest-27-02-25-9243",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055754",
"title": "Hannu Lintu & Carolin Widmann",
"series": null,
"start": "2027-02-25T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Hannu Lintu"
},
{
"role": "Violin",
"name": "Carolin Widmann"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Strawinsky",
"title": ""
},
{
"composer": "Sibelius",
"title": "",
"composerId": "sibelius"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5568&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/hannu-lintu-carolin-widmann-2055754/",
"source": "tonhalle"
},
{
"id": "real-ocg-hommage-marguerite-roesgen-champion-20270225",
"title": "Hommage à Marguerite Roesgen-Champion",
"series": null,
"start": "2027-02-25T19:30:00+01:00",
"durationMin": 120,
"cityId": "fribourg",
"venueId": "equilibre-fribourg",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Harpsichord",
"name": "Benjamin Alard"
},
{
"role": "Mezzo-soprano",
"name": "Ambroisine Bré"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Jean-Philippe Rameau",
"title": "Ouverture des Fêtes d’Hébé"
},
{
"composer": "Louis-Nicolas Clérambault",
"title": "Médée (extraits), arr. de Marguerite Roesgen-Champion"
},
{
"composer": "Joseph Haydn",
"title": "Concerto pour clavecin, Hob. XVIII: 11",
"composerId": "haydn"
},
{
"composer": "Marguerite Roesgen-Champion",
"title": "Trois pièces pour orchestre, Aquarelles pour clavecin et orchestre, Cinq poèmes pour voix et orchestre"
},
{
"composer": "Maurice Ravel",
"title": "Le Tombeau de Couperin",
"composerId": "ravel"
}
],
"ticketUrl": "https://locg.ch/fr/calendrier/hommage-marguerite-roesgen-champion",
"sourceUrl": "https://locg.ch/fr/calendrier/hommage-marguerite-roesgen-champion",
"source": "ocg"
},
{
"id": "real-sob-12176",
"title": "Titan",
"series": "Sinfoniekonzert",
"start": "2027-02-25T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Clarinet",
"name": "Rossana Rossignoli"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Geoffrey Gordon",
"title": "Bonus Track \"Salt\" (Auftragskomposition / Uraufführung)"
},
{
"composer": "Geoffrey Gordon",
"title": "\"Icarus\" für Klarinette und Orchester (Auftragskomposition / Uraufführung)"
},
{
"composer": "Gustav Mahler",
"title": "Sinfonie Nr. 1 D-Dur \"Titan\"",
"composerId": "mahler"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078770&productId=10229721147338&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/titan/12176",
"source": "sob"
},
{
"id": "real-osi-175713640767359",
"title": "Pablo Ferrández",
"series": "OSI al LAC",
"start": "2027-02-25T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Trevino"
},
{
"role": "Cello",
"name": "Pablo Ferrández"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Concerto per violoncello e orchestra in si minore op. 104",
"composerId": "dvorak"
},
{
"composer": "Anton Bruckner",
"title": "Sinfonia n. 5 in si bemolle maggiore"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11763",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-02-25-20-00",
"source": "osi"
},
{
"id": "real-osr-o5-l4-20270225",
"title": "Rêves de violon",
"series": "Série Lausanne",
"start": "2027-02-25T20:15:00+01:00",
"durationMin": 100,
"cityId": "lausanne",
"venueName": "Théâtre de Beaulieu",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Bertrand de Billy"
},
{
"role": "Violin",
"name": "Alexandra Conunova"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Cécile Chaminade",
"title": "Callirhoë, suite d’orchestre op. 37"
},
{
"composer": "Camille Saint-Saëns",
"title": "Concerto pour violon et orchestre N° 3 en si mineur op. 61",
"composerId": "saint-saens"
},
{
"composer": "Josef Suk",
"title": "Pohádka, op. 16"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/o5-l4",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/o5-l4",
"source": "osr"
},
{
"id": "real-tonhalle-2055757",
"title": "Sonic Matter: Hannu Lintu & Carolin Widmann",
"series": "Sonic Matter",
"start": "2027-02-26T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Hannu Lintu"
},
{
"role": "Violin",
"name": "Carolin Widmann"
},
{
"role": "Performer",
"name": "Nikel"
},
{
"role": "Percussion",
"name": "Brian Archinal"
},
{
"role": "Electric guitar",
"name": "Yaron Deutsch"
},
{
"role": "Piano",
"name": "Antoine Françoise"
},
{
"role": "Saxophone",
"name": "Patrick Stadler"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Nemtsov",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5593&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/sonic-matter-hannu-lintu-carolin-widmann-2055757/",
"source": "tonhalle"
},
{
"id": "real-ocg-integrales-des-suites-pour-violoncelle-de-bach-20270227",
"title": "Intégrales des Suites pour violoncelle de Bach",
"series": null,
"start": "2027-02-27T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Restaurant Le Lyrique",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Raphaël Merlin"
}
],
"program": [
{
"composer": "Jean-Sébastien Bach",
"title": "Suites pour violoncelle, BWV 1007-1012",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229886305556&productId=10229886498247&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/integrales-des-suites-pour-violoncelle-de-bach",
"source": "ocg"
},
{
"id": "real-ocg-integrales-des-suites-pour-violoncelle-de-bach-20270228",
"title": "Intégrales des Suites pour violoncelle de Bach",
"series": null,
"start": "2027-02-28T11:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Restaurant Le Lyrique",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Raphaël Merlin"
}
],
"program": [
{
"composer": "Jean-Sébastien Bach",
"title": "Suites pour violoncelle, BWV 1007-1012",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229886305557&productId=10229886498247&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/integrales-des-suites-pour-violoncelle-de-bach",
"source": "ocg"
},
{
"id": "real-lso_luzern-20138",
"title": "KONZERT FÜR FAMILIEN «DIE KLEINE HEXE» WIEDERAUFNAHME",
"series": null,
"start": "2027-02-28T11:00:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Anne-Laure Pantillon"
},
{
"role": "Oboe",
"name": "Salomo Schweizer"
},
{
"role": "Bassoon",
"name": "Adam Plšek"
},
{
"role": "Double bass",
"name": "Nikola Major"
},
{
"role": "Performer",
"name": "Judith Michel"
},
{
"role": "Soprano",
"name": "Bettina Gfeller"
},
{
"role": "Director",
"name": "Christine Cyris"
},
{
"role": "Arranger",
"name": "Edward Rushton"
}
],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/konzert-fur-familien-die-kleine-hexe-lpz0ti",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/konzert-fuer-familien-die-kleine-hexe-wiederaufnahme/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199935",
"title": "Doctor Atomic",
"series": "Hauptbühne",
"start": "2027-02-28T13:00:00+01:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Elim Chan"
},
{
"role": "Robert Oppenheimer",
"name": "Leigh Melrose"
},
{
"role": "General Leslie Groves",
"name": "Xiaomeng Zhang"
},
{
"role": "Edward Teller",
"name": "Matthew Rose"
},
{
"role": "Robert R. Wilson",
"name": "Mauro Peter"
},
{
"role": "Frank Hubbard",
"name": "Yannick Debus"
},
{
"role": "Captain James Nolan",
"name": "Nathan Haller"
},
{
"role": "Pasqualita",
"name": "Dominika Stefańska"
},
{
"role": "Kitty Oppenheimer",
"name": "Julia Bullock"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Vanessa Beecroft"
},
{
"role": "Choreographer",
"name": "Josh Johnson"
}
],
"program": [
{
"composer": "John Adams",
"title": "Doctor Atomic"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15320&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/doctor-atomic/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20434",
"title": "KONZERT FÜR FAMILIEN «DIE KLEINE HEXE» WIEDERAUFNAHME",
"series": null,
"start": "2027-02-28T15:00:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Anne-Laure Pantillon"
},
{
"role": "Oboe",
"name": "Salomo Schweizer"
},
{
"role": "Bassoon",
"name": "Adam Plšek"
},
{
"role": "Double bass",
"name": "Nikola Major"
},
{
"role": "Performer",
"name": "Judith Michel"
},
{
"role": "Soprano",
"name": "Bettina Gfeller"
},
{
"role": "Director",
"name": "Christine Cyris"
},
{
"role": "Arranger",
"name": "Edward Rushton"
}
],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/konzert-fur-familien-die-kleine-hexe-ka2mym",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/konzert-fuer-familien-die-kleine-hexe-wiederaufnahme-2/",
"source": "lso_luzern"
},
{
"id": "real-geneva_victoria_hall-78604929-20270228",
"title": "Beatrice Berrut",
"series": "Concert du dimanche",
"start": "2027-02-28T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano & Voice",
"name": "Beatrice Berrut"
},
{
"role": "Electric bass",
"name": "Nadir Graa"
}
],
"program": [],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489261",
"sourceUrl": "https://openagenda.com/victoria-hall/events/78604929_beatrice-berrut-6187091",
"source": "geneva_victoria_hall"
},
{
"id": "real-stadtcasino_basel-28022027_nob",
"title": "Neues Orchester Basel – Freiheit",
"series": "Musiksaal",
"start": "2027-02-28T17:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christian Knüsel"
},
{
"role": "Orchestra",
"name": "Neue Orchester Basel"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Gran Partita KV 361",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Briefe",
"composerId": "mozart"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Neues-Orchester-Basel/shop/event/175624/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/28022027_nob/",
"source": "stadtcasino_basel"
},
{
"id": "real-opernhaus_zurich-199988",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-02-28T20:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Jonas Kaufmann"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15413&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-12-20270301",
"title": "Passons aux Salons #12",
"series": "Passons aux Salons",
"start": "2027-03-01T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215278&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-12",
"source": "ocg"
},
{
"id": "real-tonhalle-2056894",
"title": "María Dueñas & Andrés Orozco-Estrada",
"series": null,
"start": "2027-03-01T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Filarmónica Joven de Colombia"
},
{
"role": "Conductor",
"name": "Andrés Orozco-Estrada"
},
{
"role": "Violin",
"name": "María Dueñas"
}
],
"program": [
{
"composer": "Lalo",
"title": ""
},
{
"composer": "Strawinsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5652&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/maria-duenas-andres-orozco-estrada-2056894/tz/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2056852",
"title": "Die Seele spricht – Beethovens berühmteste Violinsonaten mit Argerich",
"series": null,
"start": "2027-03-02T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Maria Solozobova"
},
{
"role": "Piano",
"name": "Martha Argerich"
},
{
"role": "Piano",
"name": "Cristina Marton-Argerich"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Schubert",
"title": "",
"composerId": "schubert"
}
],
"ticketUrl": "https://www.ticketino.com/de/event/masterinterpreten-opus-49-winterkonzert-mit-martha-argerich/215368",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/die-seele-spricht-beethovens-beruehmteste-violinsonaten-mit-argerich-2056852/tz/",
"source": "tonhalle"
},
{
"id": "real-ocg-messe-en-si-20270302",
"title": "Messe en si",
"series": "Concert à l'abo",
"start": "2027-03-02T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stephan MacLeod"
},
{
"role": "Soprano",
"name": "Dorothee Mields"
},
{
"role": "Soprano",
"name": "Aleksandra Lewandowska"
},
{
"role": "Alto",
"name": "Alex Potter"
},
{
"role": "Tenor",
"name": "Thomas Hobbs"
},
{
"role": "Bass",
"name": "Matthew Brook"
},
{
"role": "Choir",
"name": "Gli Angeli"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Jean-Sébastien Bach",
"title": "Messe en si mineur, BWV 232",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114009",
"sourceUrl": "https://locg.ch/fr/calendrier/messe-en-si",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200217",
"title": "Roméo et Juliette",
"series": "Hauptbühne",
"start": "2027-03-02T20:00:00+01:00",
"durationMin": 175,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christopher Franklin"
},
{
"role": "Juliette",
"name": "Juliana Grigoryan"
},
{
"role": "Roméo",
"name": "Juan Diego Flórez"
},
{
"role": "Frère Laurent",
"name": "Brent Michael Smith"
},
{
"role": "Le Comte Capulet",
"name": "Andrew Moore"
},
{
"role": "Mercutio",
"name": "Gregory Feldmann"
},
{
"role": "Stéphano",
"name": "Martina Baroni"
},
{
"role": "Tybalt",
"name": "Omer Kobiljak"
},
{
"role": "Gertrude",
"name": "Irène Friedli"
},
{
"role": "Le Comte Paris",
"name": "Lazar Parezanin"
},
{
"role": "Gregorio",
"name": "Evan Gray"
},
{
"role": "Benvolio",
"name": "Tautvydas Slizauskas"
},
{
"role": "Le Duc de Vérone",
"name": "Christian Valle"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Ted Huffman"
},
{
"role": "Choreographer",
"name": "Pim Veulings"
}
],
"program": [
{
"composer": "Charles Gounod",
"title": "Roméo et Juliette"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15259&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-et-juliette/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2063418",
"title": "Musical Marathon: Anastasia Voltchok & Friends",
"series": null,
"start": "2027-03-03T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Anastasia Voltchok"
},
{
"role": "Piano",
"name": "Stefan Szypura"
},
{
"role": "Piano",
"name": "David Chen"
},
{
"role": "Piano",
"name": "Lucas Chiche"
},
{
"role": "Clarinet",
"name": "Andrei Ryazantsev"
},
{
"role": "Violin",
"name": "Jana Ozolina"
},
{
"role": "Violin",
"name": "Wojciech Niedziołka"
},
{
"role": "Violin",
"name": "Lora Markova"
},
{
"role": "Violin",
"name": "Diana Adamyan"
},
{
"role": "Viola",
"name": "Polina Pirogova"
},
{
"role": "Viola",
"name": "Tilman Sandvoss"
},
{
"role": "Cello",
"name": "Jiayi Liu"
},
{
"role": "Cello",
"name": "Antoni Wojciechowski"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Stefan Szypura",
"title": ""
},
{
"composer": "Lucas Chiche",
"title": ""
},
{
"composer": "David Chen",
"title": ""
},
{
"composer": "Prokofjew",
"title": ""
},
{
"composer": "Ravel",
"title": "",
"composerId": "ravel"
},
{
"composer": "Addinsell",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/musical-marathon-anastasia-voltchok-friends-2063418/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/musical-marathon-anastasia-voltchok-friends-2063418/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199989",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-03-03T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Jonas Kaufmann"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15414&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-230327_k128",
"title": "Adorno Quartett",
"series": "Kammermusik um halb acht",
"start": "2027-03-03T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Giuseppe Puccini",
"title": "Crisantemi",
"composerId": "puccini"
},
{
"composer": "Giorgio Federico Ghedini",
"title": "Quartet No.1"
},
{
"composer": "Franz Schubert",
"title": "Quartett d-Moll op. post. D 810 «Der Tod und das Mädchen»",
"composerId": "schubert"
}
],
"ticketUrl": "https://www.ticketcorner.ch/event/kammermusik-um-halb-acht-202627-stadtcasino-basel-21795157/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/230327_k128/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9255",
"title": "Mozart & Enescu",
"series": "Hauskonzert",
"start": "2027-03-04T19:00:00+01:00",
"durationMin": 90,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Winterthurer Streichquartett"
},
{
"role": "Violin",
"name": "Bogdan Božović"
},
{
"role": "Violin",
"name": "Francesco Sica"
},
{
"role": "Violin",
"name": "Ralph Orendain"
},
{
"role": "Violin",
"name": "Anzhela Golubyeva Staub"
},
{
"role": "Viola",
"name": "Jürg Dähler"
},
{
"role": "Viola",
"name": "Chie Tanaka"
},
{
"role": "Cello",
"name": "Flurin Cuonz"
},
{
"role": "Cello",
"name": "Carolin Eychmüller"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Streichquartett Nr. 23 F-Dur, KV 590",
"composerId": "mozart"
},
{
"composer": "George Enescu",
"title": "Streichoktett C-Dur, op. 7"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/171377/",
"sourceUrl": "https://www.musikkollegium.ch/programm/mozart-enescu-27-03-04-9255",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2056899",
"title": "Ode an Zürich: 200 Jahre ohne Beethoven",
"series": null,
"start": "2027-03-04T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Ensemble Symphonique de Genève"
},
{
"role": "Conductor",
"name": "Sergey Ostrovsky"
},
{
"role": "Piano",
"name": "Lucas Chiche"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5740&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/ode-an-zuerich-200-jahre-ohne-beethoven-2056899/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200218",
"title": "Roméo et Juliette",
"series": "Hauptbühne",
"start": "2027-03-05T19:30:00+01:00",
"durationMin": 175,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Christopher Franklin"
},
{
"role": "Juliette",
"name": "Juliana Grigoryan"
},
{
"role": "Roméo",
"name": "Juan Diego Flórez"
},
{
"role": "Frère Laurent",
"name": "Brent Michael Smith"
},
{
"role": "Le Comte Capulet",
"name": "Andrew Moore"
},
{
"role": "Mercutio",
"name": "Gregory Feldmann"
},
{
"role": "Stéphano",
"name": "Martina Baroni"
},
{
"role": "Tybalt",
"name": "Omer Kobiljak"
},
{
"role": "Gertrude",
"name": "Irène Friedli"
},
{
"role": "Le Comte Paris",
"name": "Lazar Parezanin"
},
{
"role": "Gregorio",
"name": "Evan Gray"
},
{
"role": "Benvolio",
"name": "Tautvydas Slizauskas"
},
{
"role": "Le Duc de Vérone",
"name": "Christian Valle"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Ted Huffman"
},
{
"role": "Choreographer",
"name": "Pim Veulings"
}
],
"program": [
{
"composer": "Charles Gounod",
"title": "Roméo et Juliette"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15260&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/romeo-et-juliette/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-05032027_yulianna_avdeeva",
"title": "Yulianna Avdeeva",
"series": "AMG Solistenabende",
"start": "2027-03-05T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Yulianna Avdeeva"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Das Wohltemperierte Klavier, Band I",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=225",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/05032027_yulianna_avdeeva/",
"source": "stadtcasino_basel"
},
{
"id": "real-stadtcasino_basel-06032027_la_cetra",
"title": "La Cetra Basel – Beethoven im Originalklang",
"series": "Musiksaal",
"start": "2027-03-06T19:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "La Cetra Barockorchester Basel"
},
{
"role": "Conductor",
"name": "Andrea Marcon"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/LCBO-LCVE/shop/event/176559/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/06032027_la_cetra/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055761",
"title": "Orpheum Konzert",
"series": null,
"start": "2027-03-06T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Marin Alsop"
},
{
"role": "Piano",
"name": "Tsotne Zedginidze"
},
{
"role": "Violin",
"name": "Hana Chang"
},
{
"role": "Cello",
"name": "Lionel Martin"
}
],
"program": [
{
"composer": "Strawinsky",
"title": ""
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
},
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5729&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orpheum-konzert-2055761/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-sarah-coponat",
"title": "Sarah Coponat – Klavierabend",
"series": "Hans Huber-Saal",
"start": "2027-03-06T20:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://sarahcoponat.com/billetterie/stadtcasino-2027-03-06",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/sarah-coponat/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-ainsi-la-nuit-20270307",
"title": "Ainsi la nuit",
"series": "Série Musique de chambre",
"start": "2027-03-07T11:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "conservatoire-geneve",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Cristian Zimmerman"
},
{
"role": "Violin",
"name": "Leonid Baranov"
},
{
"role": "Viola",
"name": "Jarita Ng"
},
{
"role": "Cello",
"name": "Lucas Henry"
}
],
"program": [
{
"composer": "Jacques Hétu",
"title": "Quatuor à cordes N° 2 op. 50"
},
{
"composer": "Jennifer Higdon",
"title": "Voices, pour quatuor à cordes"
},
{
"composer": "Henri Dutilleux",
"title": "Ainsi la nuit, pour quatuor à cordes"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ainsi-la-nuit",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ainsi-la-nuit",
"source": "osr"
},
{
"id": "real-lso_luzern-19944",
"title": "KAMMERMUSIK-MATINÉE 5",
"series": "Kammermusik",
"start": "2027-03-07T11:15:00+01:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Patrizia Pacozzi"
},
{
"role": "Violin",
"name": "Hae Jin Park"
},
{
"role": "Viola",
"name": "Natascha Sprzagala"
},
{
"role": "Viola",
"name": "Madeleine Burkhalter"
},
{
"role": "Cello",
"name": "Jonas Vischi"
}
],
"program": [
{
"composer": "Alexander von Zemlinsky",
"title": "Zwei Sätze für Streichquintett"
},
{
"composer": "Anton Bruckner",
"title": "Streichquintett in F-Dur, WAB 112"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquintett in c-Moll, op. 104",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-5-1tk7pj",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-5-5/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055765",
"title": "Kammermusik-Matinee",
"series": null,
"start": "2027-03-07T11:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Andreas Janke"
},
{
"role": "Violin",
"name": "Yukiko Ishibashi"
},
{
"role": "Viola",
"name": "Katja Fuchs"
},
{
"role": "Cello",
"name": "Mattia Zappa"
},
{
"role": "Piano",
"name": "Hendrik Heilmann"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5619&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-matinee-2055765/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199990",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-03-07T13:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Jonas Kaufmann"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15415&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-la-fille-du-far-west-20270307",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-07T17:00:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-opera_lausanne-les-capulet-et-les-montaigu-20270307-1700",
"title": "Les Capulet et les Montaigu",
"series": null,
"start": "2027-03-07T17:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Stage director",
"name": "Joe Hill-Gibbins"
},
{
"role": "Giulietta",
"name": "Marie Lys"
},
{
"role": "Romeo",
"name": "Marina Viotti"
},
{
"role": "Tebaldo",
"name": "Julien Dran"
},
{
"role": "Lorenzo",
"name": "Manuel Fuentes"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"composer": "Vincenzo Bellini",
"title": "Les Capulet et les Montaigu"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098114",
"sourceUrl": "https://www.opera-lausanne.ch/show/les-capulet-et-les-montaigu/",
"source": "opera_lausanne"
},
{
"id": "real-ocg-messe-en-ut-20270307",
"title": "Messe en ut",
"series": null,
"start": "2027-03-07T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Cerle Bach"
},
{
"role": "Conductor",
"name": "Natacha Casagrande"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Messe en ut mineur",
"composerId": "mozart"
}
],
"ticketUrl": "https://locg.ch/fr/calendrier/messe-en-ut",
"sourceUrl": "https://locg.ch/fr/calendrier/messe-en-ut",
"source": "ocg"
},
{
"id": "real-tonhalle-2056902",
"title": "Philharmonia Orchestra London – Klangkraft",
"series": null,
"start": "2027-03-07T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonia Orchestra London"
},
{
"role": "Conductor",
"name": "Esa-Pekka Salonen"
},
{
"role": "Violin",
"name": "Johan Dalene"
}
],
"program": [
{
"composer": "Sibelius",
"title": "",
"composerId": "sibelius"
},
{
"composer": "Lindberg",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5643&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/philharmonia-orchestra-london-klangkraft-2056902/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199911",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-07T20:00:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15199&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056771",
"title": "Jugend Sinfonieorchester Zürich",
"series": null,
"start": "2027-03-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Jugend Sinfonieorchester Zürich"
},
{
"role": "Conductor",
"name": "David Bruchez-Lalli"
},
{
"role": "Cello",
"name": "Anita Leuzinger"
}
],
"program": [
{
"composer": "Elgar",
"title": ""
},
{
"composer": "Tschaikowsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5733&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/jugend-sinfonieorchester-zuerich-2056771/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-080327_kob",
"title": "Kammerorchester Basel – Der Clan",
"series": "Musiksaal",
"start": "2027-03-08T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Isabelle Faust"
},
{
"role": "Fortepiano",
"name": "Kristian Bezuidenhout"
},
{
"role": "Conductor",
"name": "Kristian Bezuidenhout"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sonate für Hammerklavier und Violine in G-Dur KV, 379",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Violine und Orchester Nr. 2 in D-Dur, KV 211",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Rondo für Violine und Orchester in C-Dur, KV 373",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonie Nr. 40 in g-Moll, KV 550",
"composerId": "mozart"
},
{
"composer": "Joseph Martin Kraus",
"title": "Ouvertüre zur Schauspielmusik «Olympie» (Trauerspiel von Johan Henrik Kellgren nach Voltaire) VB 133",
"composerId": "martin"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Kammerorchester_Basel/shop/event/147198/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/080327_kob/",
"source": "stadtcasino_basel"
},
{
"id": "real-opera_lausanne-les-capulet-et-les-montaigu-20270309-1900",
"title": "Les Capulet et les Montaigu",
"series": null,
"start": "2027-03-09T19:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Stage director",
"name": "Joe Hill-Gibbins"
},
{
"role": "Giulietta",
"name": "Marie Lys"
},
{
"role": "Romeo",
"name": "Marina Viotti"
},
{
"role": "Tebaldo",
"name": "Julien Dran"
},
{
"role": "Lorenzo",
"name": "Manuel Fuentes"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"composer": "Vincenzo Bellini",
"title": "Les Capulet et les Montaigu"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098114",
"sourceUrl": "https://www.opera-lausanne.ch/show/les-capulet-et-les-montaigu/",
"source": "opera_lausanne"
},
{
"id": "real-zko-19522",
"title": "Daniel Hope spielt Piazzolla",
"series": "Abo-Konzerte",
"start": "2027-03-09T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Music Director",
"name": "Daniel Hope"
},
{
"role": "Cello & Harp",
"name": "Nicola Mosca"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Max Bruch",
"title": "Serenade nach schwedischen Melodien für Streichorchester"
},
{
"composer": "Martin Wettstein",
"title": "Terribilis. Konzert für Violoncello, Harfe, Streichorchester und Perkussion (Uraufführung)",
"composerId": "martin"
},
{
"composer": "Carl Nielsen",
"title": "Kleine Suite für Streichorchester, op. 1"
},
{
"composer": "Astor Piazzolla",
"title": "Las cuatro estaciones porteñas, bearbeitet für Violine und Streichorchester von Leonid Desyatnikov"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1954",
"sourceUrl": "https://zko.ch/events/daniel-hope-spielt-piazzolla/",
"source": "zko"
},
{
"id": "real-geneva_victoria_hall-88418756-20270309",
"title": "Gautier Capuçon; Mirabelle Kajenjeri",
"series": "Les Grands Interprètes",
"start": "2027-03-09T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Gautier Capuçon"
},
{
"role": "Piano",
"name": "Mirabelle Kajenjeri"
}
],
"program": [
{
"composer": "Claude Debussy",
"title": "Sonate pour violoncelle et piano en ré mineur",
"composerId": "debussy"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Sonate pour violoncelle et piano n° 2 en ré majeur, op. 58",
"composerId": "mendelssohn"
},
{
"composer": "Robert Schumann",
"title": "3 Fantasiestücke, op. 73 (version pour violoncelle et piano)",
"composerId": "schumann"
},
{
"composer": "Johannes Brahms",
"title": "Sonate pour violoncelle et piano n° 2 en fa majeur, op. 99",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/gautier-capucon-mirabelle-kajenjeri2027",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/88418756_gautier-capucon-mirabelle-kajenjeri",
"source": "geneva_victoria_hall"
},
{
"id": "real-osr-la-fille-du-far-west-20270309",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-09T19:30:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199912",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-10T19:00:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15200&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-beethoven6-20270310",
"title": "Cycle Beethoven 3",
"series": "Cycle Beethoven",
"start": "2027-03-10T19:30:00+01:00",
"durationMin": 105,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Piano",
"name": "Mao Fujita"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Concerto pour piano et orchestre N° 4 en sol majeur op. 58",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 6 en fa majeur op. 68, 'Pastorale'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"source": "osr"
},
{
"id": "real-tonhalle-2055770",
"title": "Paavo Järvi & Lisa Batiashvili",
"series": null,
"start": "2027-03-10T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Lisa Batiashvili"
}
],
"program": [
{
"composer": "Debussy",
"title": "",
"composerId": "debussy"
},
{
"composer": "Szymanowski",
"title": ""
},
{
"composer": "Dvořák",
"title": "",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5581&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-lisa-batiashvili-2055770/",
"source": "tonhalle"
},
{
"id": "real-cnz-140",
"title": "Bruchlinien",
"series": null,
"start": "2027-03-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Brunnenhof, Studio 1",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Mateusz Szczepkowski"
},
{
"role": "Trumpet",
"name": "Jens Bracher"
},
{
"role": "Conductor",
"name": "Enno Poppe"
},
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Iris ter Schiphorst",
"title": "The Fall of the House of Usher, für Trompete und Ensemble (2014)"
},
{
"composer": "Tobias Krebs",
"title": "Neues Werk, für Ensemble (2027, Uraufführung)"
},
{
"composer": "Enno Poppe",
"title": "Scherben, für Ensemble (2000/08)"
},
{
"composer": "Agata Zubel",
"title": "Violinkonzert (2014)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179733/",
"sourceUrl": "https://cnz.ch/bruchlinien",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-214298",
"title": "Brückenschlagkonzert Festival Alte Musik",
"series": null,
"start": "2027-03-11T19:30:00+01:00",
"durationMin": 150,
"cityId": "zurich",
"venueName": "Johanneskirche",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Harpsichord & direction",
"name": "Alberto Miguélez Rouco"
},
{
"role": "Orchestra",
"name": "Los Elementos"
}
],
"program": [],
"ticketUrl": "https://altemusik.ch/festivalprogramm-vox-feminae/",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/brueckenschlagkonzert/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-la-fille-du-far-west-20270311",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-11T19:30:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-tonhalle-2055774",
"title": "Paavo Järvi & Lisa Batiashvili",
"series": null,
"start": "2027-03-11T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Lisa Batiashvili"
}
],
"program": [
{
"composer": "Debussy",
"title": "",
"composerId": "debussy"
},
{
"composer": "Szymanowski",
"title": ""
},
{
"composer": "Dvořák",
"title": "",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5553&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-lisa-batiashvili-2055774/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-99438449-20270311",
"title": "Gli Angeli Genève – Passion selon saint Jean",
"series": null,
"start": "2027-03-11T20:00:00+01:00",
"durationMin": 135,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Bass & Conductor",
"name": "Stephan MacLeod"
},
{
"role": "Evangelist",
"name": "Guy Cutting"
},
{
"role": "Soprano",
"name": "Aleksandra Lewandowska"
},
{
"role": "Soprano",
"name": "Zoë Brookshaw"
},
{
"role": "Alto",
"name": "Christopher Lowery"
},
{
"role": "Tenor",
"name": "Thomas Hobbs"
},
{
"role": "Bass",
"name": "Drew Santini"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Passion selon saint Jean",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229291414926",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/99438449_gli-angeli-geneve-3630303",
"source": "geneva_victoria_hall"
},
{
"id": "real-osi-175714677421238",
"title": "Roberto González-Monjas",
"series": "OSI al LAC",
"start": "2027-03-11T20:00:00+01:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Baritone",
"name": "Huw Montague Rendall"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Othello ouverture op. 93",
"composerId": "dvorak"
},
{
"composer": "Gustav Mahler",
"title": "Rückert-Lieder per voce e orchestra",
"composerId": "mahler"
},
{
"composer": "Gustav Mahler",
"title": "Blumine",
"composerId": "mahler"
},
{
"composer": "Antonín Dvořák",
"title": "The Water Goblin poema sinfonico op. 107",
"composerId": "dvorak"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11764",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-03-11-20-00",
"source": "osi"
},
{
"id": "real-stadtcasino_basel-120327_cmb",
"title": "Collegium Musicum Basel – Ella streicht Saiten",
"series": "Musiksaal",
"start": "2027-03-12T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Ella van Poucke"
},
{
"role": "Conductor",
"name": "Benjamin Reiners"
},
{
"role": "Orchestra",
"name": "Collegium Musicum Basel"
}
],
"program": [
{
"composer": "Maurice Ravel",
"title": "Le Tombeau de Couperin",
"composerId": "ravel"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Konzert für Violoncello und Orchester Nr. 2 g-Moll, op. 126"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 8 F-Dur, op. 93",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.ticketcorner.ch/artist/collegium-musicum-basel/collegium-musicum-basel-202627-4124761/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/120327_cmb/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-beethoven6-20270312",
"title": "Cycle Beethoven 3",
"series": null,
"start": "2027-03-12T19:30:00+01:00",
"durationMin": 105,
"cityId": "la-chaux-de-fonds",
"venueId": "salle-de-musique-lcdf",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Piano",
"name": "Mao Fujita"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Concerto pour piano et orchestre N° 4 en sol majeur op. 58",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 6 en fa majeur op. 68, 'Pastorale'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199913",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-12T19:30:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15201&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055773",
"title": "Paavo Järvi & Lisa Batiashvili",
"series": null,
"start": "2027-03-12T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Violin",
"name": "Lisa Batiashvili"
}
],
"program": [
{
"composer": "Debussy",
"title": "",
"composerId": "debussy"
},
{
"composer": "Szymanowski",
"title": ""
},
{
"composer": "Dvořák",
"title": "",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5563&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-lisa-batiashvili-2055773/",
"source": "tonhalle"
},
{
"id": "real-ocg-la-route-de-la-soie-20270312",
"title": "La Route de la Soie",
"series": "Concert à l'abo",
"start": "2027-03-12T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Fazil Say"
},
{
"role": "Conductor",
"name": "Mattia Bornati"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Fazil Say",
"title": "Silk road, op. 4"
},
{
"composer": "Fazil Say",
"title": "Symphonie de chambre, op. 62"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concerto n° 23 en la majeur, KV 488",
"composerId": "mozart"
}
],
"ticketUrl": "http://billetterie.locg.ch/selection/event/date?productId=10229790114010",
"sourceUrl": "https://locg.ch/fr/calendrier/la-route-de-la-soie",
"source": "ocg"
},
{
"id": "real-opera_lausanne-les-capulet-et-les-montaigu-20270312-2000",
"title": "Les Capulet et les Montaigu",
"series": null,
"start": "2027-03-12T20:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Stage director",
"name": "Joe Hill-Gibbins"
},
{
"role": "Giulietta",
"name": "Marie Lys"
},
{
"role": "Romeo",
"name": "Marina Viotti"
},
{
"role": "Tebaldo",
"name": "Julien Dran"
},
{
"role": "Lorenzo",
"name": "Manuel Fuentes"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"composer": "Vincenzo Bellini",
"title": "Les Capulet et les Montaigu"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098114",
"sourceUrl": "https://www.opera-lausanne.ch/show/les-capulet-et-les-montaigu/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2056908",
"title": "Sol Gabetta & Bertrand Chamayou",
"series": null,
"start": "2027-03-13T18:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Piano",
"name": "Bertrand Chamayou"
}
],
"program": [
{
"composer": "Britten",
"title": ""
},
{
"composer": "Grieg",
"title": "",
"composerId": "grieg"
},
{
"composer": "Lutosławski",
"title": ""
},
{
"composer": "Rachmaninow",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5653&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/sol-gabetta-bertrand-chamayou-2056908/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199823",
"title": "Ascanio in Alba",
"series": "Hauptbühne",
"start": "2027-03-13T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Harpsichord & direction",
"name": "Christophe Rousset"
},
{
"role": "Venere",
"name": "Mélissa Petit"
},
{
"role": "Ascanio",
"name": "Alisa Kolosova"
},
{
"role": "Silvia",
"name": "Anna El-Khashem"
},
{
"role": "Aceste, Priester der Venus",
"name": "Anle Gou"
},
{
"role": "Fauno",
"name": "Eleonora Bellocci"
},
{
"role": "Choir",
"name": "Chorzuzüger:innen"
},
{
"role": "Orchestra",
"name": "Les Talens Lyriques"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Ascanio in Alba",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15300&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ascanio-in-alba/",
"source": "opernhaus_zurich"
},
{
"id": "real-geneva_victoria_hall-6560151-20270313",
"title": "Orpheus Chamber Orchestra",
"series": "Migros-Pour-cent-culturel Classics",
"start": "2027-03-13T19:30:00+01:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Saxophone & Conductor",
"name": "Branford Marsalis"
},
{
"role": "Orchestra",
"name": "Orpheus Chamber Orchestra"
}
],
"program": [],
"ticketUrl": "https://migros.infomaniak.events/fr-ch/shop/migros-pour-cent-culturel-classic-2026-2027-EBGNGEVB9H",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/6560151_orpheus-chamber-orchestra",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200199",
"title": "Rezital Jean Rondeau",
"series": null,
"start": "2027-03-13T20:00:00+01:00",
"durationMin": 70,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Harpsichord",
"name": "Jean Rondeau"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Präludium aus der Suite für Laute c-Moll BWV 997",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Partita Nr. 2 c-Moll BWV 826",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Partita Nr. 4 D-Dur BWV 828",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Chaconne aus der Partita für Violine Nr. 2 d-Moll BWV 1004",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15507&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rezital-jean-rondeau/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-la-fille-du-far-west-20270314",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-14T15:00:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-opera_lausanne-les-capulet-et-les-montaigu-20270314-1500",
"title": "Les Capulet et les Montaigu",
"series": null,
"start": "2027-03-14T15:00:00+01:00",
"durationMin": 180,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Stage director",
"name": "Joe Hill-Gibbins"
},
{
"role": "Giulietta",
"name": "Marie Lys"
},
{
"role": "Romeo",
"name": "Marina Viotti"
},
{
"role": "Tebaldo",
"name": "Julien Dran"
},
{
"role": "Lorenzo",
"name": "Manuel Fuentes"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"composer": "Vincenzo Bellini",
"title": "Les Capulet et les Montaigu"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098114",
"sourceUrl": "https://www.opera-lausanne.ch/show/les-capulet-et-les-montaigu/",
"source": "opera_lausanne"
},
{
"id": "real-zko-19678",
"title": "Zürich Barock mit Rachel Podger",
"series": null,
"start": "2027-03-14T15:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin & direction",
"name": "Rachel Podger"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Charles Avison",
"title": "Concerto grosso Nr. 6 D-Dur nach Cembalosonaten von Domenico Scarlatti"
},
{
"composer": "Georg Friedrich Händel",
"title": "Concerto grosso g-Moll, op. 6/6, HWV 324",
"composerId": "handel"
},
{
"composer": "Domenico Gallo",
"title": "Sonate Nr. 12 g-Moll, La Follia, aus: Suonate a Quattro"
},
{
"composer": "Georg Friedrich Händel",
"title": "Concerto grosso F-Dur, op. 6/2, HWV 320",
"composerId": "handel"
},
{
"composer": "Johann Sebastian Bach",
"title": "Suite für Violine und Streichorchester Nr. 2 a-Moll, BWV 1067a",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1971",
"sourceUrl": "https://zko.ch/events/zuerich-barock-mit-rachel-podger/",
"source": "zko"
},
{
"id": "real-stadtcasino_basel-14032027_voltchock_friends",
"title": "Anastasia Voltchok & Friends",
"series": "SunDay Concerts",
"start": "2027-03-14T16:00:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Daniil Rumiantsev"
},
{
"role": "Clarinet",
"name": "Andrei Riazantsev"
},
{
"role": "Harp",
"name": "Julia Lopuszynska"
},
{
"role": "Violin",
"name": "Lora Markova"
},
{
"role": "Violin",
"name": "Wojciech Niedziółka"
},
{
"role": "Viola",
"name": "Polina Pirogova"
},
{
"role": "Viola",
"name": "Tilman Sandvoss"
},
{
"role": "Cello",
"name": "Jiayi Liu"
},
{
"role": "Cello",
"name": "Antoni Wojciechowski"
}
],
"program": [
{
"composer": "Jana Ozolina",
"title": "Diana Adamyan"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Aus dem Klavierkonzert Nr. 2 – 2. Satz"
},
{
"composer": "Maurice Ravel",
"title": "Introduction et Allegro für Harfe, Streichquartett, Flöte und Klarinette",
"composerId": "ravel"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Aus dem Klavierkonzert F-Dur KV 413 – 1. Satz",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Aus dem Quintett für Streicher und Klarinette KV 581 – Sätze 2 und 4",
"composerId": "mozart"
},
{
"composer": "Sergej Prokofjew",
"title": "Ouvertüre über hebräische Themen für Klavier, Streichquartett und Klarinette"
},
{
"composer": "Richard Addinsell",
"title": "Warsaw Concerto (arr. für Klavier und Streichquintett)"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/seatmap?eventId=218",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/14032027_voltchock_friends/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9445",
"title": "Basel Horn Sound",
"series": "Kammermusik Liebestrasse",
"start": "2027-03-14T17:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueName": "Liebestrasse",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Horn",
"name": "Florian Hasenfratz Leonie Steppe Oskar Szathmàry"
},
{
"role": "Horn",
"name": "Eloy Tamò"
},
{
"role": "Piano",
"name": "Eloy Tamò"
}
],
"program": [
{
"composer": "Constantin Homilius",
"title": "Hornquartett B-Dur, op. 38"
},
{
"composer": "Paul Dukas",
"title": "Villanelle für Horn und Klavier"
},
{
"composer": "Camille Saint-Saëns",
"title": "Romanze für Horn und Klavier, op. 36",
"composerId": "saint-saens"
},
{
"composer": "Reinhold Glière",
"title": "Vier Stücke für Horn und Klavier, op. 35"
},
{
"composer": "Paul Hindemith",
"title": "Sonate für vier Hörner"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179108/",
"sourceUrl": "https://www.musikkollegium.ch/programm/basel-horn-so-27-03-14-9445",
"source": "musikkollegium"
},
{
"id": "real-geneva_victoria_hall-14817626-20270314",
"title": "La Passion selon saint Matthieu",
"series": "Concert du dimanche",
"start": "2027-03-14T17:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Leonardo García-Alarcón"
},
{
"role": "Choir",
"name": "Chœur de Chambre de Namur"
},
{
"role": "Choir",
"name": "Maîtrise du Conservatoire populaire de musique, danse et théâtre de Genève"
},
{
"role": "Chorus master",
"name": "Magali Dami"
},
{
"role": "Chorus master",
"name": "Fruzsina Szuromi"
},
{
"role": "Soprano",
"name": "Sophie Junker"
},
{
"role": "Alto",
"name": "Hugh Cutting"
},
{
"role": "Tenor (Évangéliste)",
"name": "Valerio Contaldo"
},
{
"role": "Tenor",
"name": "Laurence Kilsby"
},
{
"role": "Bass (Jésus)",
"name": "Alex Rosen"
},
{
"role": "Bass (Pilate)",
"name": "Andreas Wolf"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Passion selon saint Matthieu, BWV 244",
"composerId": "bach"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489262",
"sourceUrl": "https://openagenda.com/victoria-hall/events/14817626_la-passion-selon-saint-matthieu-254349",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200207",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-14T18:00:00+01:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15420&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-13-20270315",
"title": "Passons aux Salons #13",
"series": "Passons aux Salons",
"start": "2027-03-15T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215279&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-13",
"source": "ocg"
},
{
"id": "real-cnz-150",
"title": "Bruchlinien: Gastspiel bei der SMC Lausanne",
"series": null,
"start": "2027-03-15T19:00:00+01:00",
"durationMin": 120,
"cityId": "lausanne",
"venueName": "BCV Concert Hall",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Mateusz Szczepkowski"
},
{
"role": "Trumpet",
"name": "Jens Bracher"
},
{
"role": "Conductor",
"name": "Enno Poppe"
},
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Iris ter Schiphorst",
"title": "The Fall of the House of Usher, für Trompete und Ensemble (2014)"
},
{
"composer": "Tobias Krebs",
"title": "Neues Werk, für Ensemble (2027, Uraufführung)"
},
{
"composer": "Enno Poppe",
"title": "Scherben, für Ensemble (2000/08)"
},
{
"composer": "Agata Zubel",
"title": "Violinkonzert (2014)"
}
],
"ticketUrl": "https://www.smclausanne.ch/",
"sourceUrl": "https://cnz.ch/bruchlinien-gastspiel-smc",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-200075",
"title": "Liederabend Jakub Józef Orliński",
"series": "Liederabende",
"start": "2027-03-15T19:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "recital",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15435&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/liederabend-jakub-jozef-orlinski/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-beethoven6-20270315",
"title": "Cycle Beethoven 3",
"series": "AMG Symphonic Gems",
"start": "2027-03-15T19:30:00+01:00",
"durationMin": 105,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Piano",
"name": "Mao Fujita"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Concerto pour piano et orchestre N° 4 en sol majeur op. 58",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 6 en fa majeur op. 68, 'Pastorale'",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven6",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199914",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-16T19:00:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15202&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199918",
"title": "c-Moll-Messe",
"series": "Hauptbühne",
"start": "2027-03-17T19:00:00+01:00",
"durationMin": 60,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15405&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/c-moll-messe/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9249",
"title": "Barbara Hannigan",
"series": "Abonnementskonzert",
"start": "2027-03-17T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Barbara Hannigan"
},
{
"role": "Soprano",
"name": "Barbara Hannigan"
}
],
"program": [
{
"composer": "Igor Strawinsky",
"title": "Konzert für Kammerorchester Es-Dur «Dumbarton Oaks»"
},
{
"composer": "Benjamin Britten",
"title": "«Les illuminations» op. 18 für hohe Stimme und Streichorchester, Text von Arthur Rimbaud"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 4 B-Dur, op. 60",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161690/",
"sourceUrl": "https://www.musikkollegium.ch/programm/barbara-hannigan-27-03-17-9249",
"source": "musikkollegium"
},
{
"id": "real-lso_luzern-19905",
"title": "LEIDENSCHAFT – RACHMANINOW & TSCHAIKOWSKY",
"series": "Sinfoniekonzerte",
"start": "2027-03-17T19:30:00+01:00",
"durationMin": 105,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Piano",
"name": "Nikolai Lugansky"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Sergei Rachmaninow",
"title": "Klavierkonzert Nr. 2 in c-Moll, op. 18"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Sinfonie Nr. 6 Pathétique in h-Moll, op. 74"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/leidenschaft-rachmaninow-tschaikowsky-lii8ej",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/leidenschaft-rachmaninow-tschaikowsky/",
"source": "lso_luzern"
},
{
"id": "real-osr-la-fille-du-far-west-20270317",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-17T19:30:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-tonhalle-2055780",
"title": "Paavo Järvi & Giorgi Gigashvili",
"series": null,
"start": "2027-03-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Giorgi Gigashvili"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Ravel",
"title": "",
"composerId": "ravel"
},
{
"composer": "Stenhammar",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5576&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-giorgi-gigashvili-2055780/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-17032027_kg",
"title": "Sinfonieorchester Basel",
"series": "KG-Sinfoniekonzerte",
"start": "2027-03-17T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Ensemble",
"name": "Solistinnen und Solisten der Musikhochschule Basel"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Stabat Mater op. 58",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.sinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=206",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/17032027_kg/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2060118",
"title": "Orchester-Lunchkonzert mit Paavo Järvi",
"series": "Orchester-Lunchkonzert",
"start": "2027-03-18T12:15:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
}
],
"program": [
{
"composer": "Stenhammar",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5608&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orchester-lunchkonzert-mit-paavo-jaervi-2060118/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200179",
"title": "BRISK - Konzert",
"series": "Spiegelsaal",
"start": "2027-03-18T17:00:00+01:00",
"durationMin": 60,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15474&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/konzert-zhdk-brisk-ensemblewettbewerb/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199915",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-18T19:00:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15203&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9251",
"title": "Barbara Hannigan",
"series": "Abonnementskonzert",
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Barbara Hannigan"
},
{
"role": "Soprano",
"name": "Barbara Hannigan"
}
],
"program": [
{
"composer": "Igor Strawinsky",
"title": "Konzert für Kammerorchester Es-Dur «Dumbarton Oaks»"
},
{
"composer": "Benjamin Britten",
"title": "«Les illuminations» op. 18 für hohe Stimme und Streichorchester, Text von Arthur Rimbaud"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 4 B-Dur, op. 60",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161691/",
"sourceUrl": "https://www.musikkollegium.ch/programm/barbara-hannigan-27-03-18-9251",
"source": "musikkollegium"
},
{
"id": "real-lso_luzern-20165",
"title": "LEIDENSCHAFT – RACHMANINOW & TSCHAIKOWSKY",
"series": "Sinfoniekonzerte",
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 105,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Piano",
"name": "Nikolai Lugansky"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Sergei Rachmaninow",
"title": "Klavierkonzert Nr. 2 in c-Moll, op. 18"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Sinfonie Nr. 6 Pathétique in h-Moll, op. 74"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/leidenschaft-rachmaninow-tschaikowsky-kb2ckk",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/leidenschaft-rachmaninow-tschaikowsky-2/",
"source": "lso_luzern"
},
{
"id": "real-buehnen_bern-la-valse-2027-03-18-1930",
"title": "La Valse",
"series": "9. Symphoniekonzert",
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 75,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Eva Ollikainen"
},
{
"role": "Violin",
"name": "Gil Shaham"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Samuel Barber",
"title": "Konzert für Violine und Orchester op. 14 (1939)"
},
{
"workId": "rstrauss-rosenkavalier",
"composerId": "richard-strauss"
},
{
"composer": "Maurice Ravel",
"title": "La Valse. Poème chorégraphique (1919/20)",
"composerId": "ravel"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2047&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/la-valse/",
"source": "buehnen_bern"
},
{
"id": "real-geneva_victoria_hall-248416-20270318",
"title": "Nelson Goerner",
"series": "Les Grands Interprètes",
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Nelson Goerner"
}
],
"program": [
{
"composer": "Leoš Janáček",
"title": "Dans les brumes"
},
{
"composer": "Robert Schumann",
"title": "Kinderszenen, op. 15",
"composerId": "schumann"
},
{
"composer": "Robert Schumann",
"title": "Toccata, op. 7",
"composerId": "schumann"
},
{
"composer": "Ludwig van Beethoven",
"title": "Variations Diabelli, op. 120",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/nelson-goerner2027",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/248416_nelson-goerner-2495571",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055782",
"title": "Paavo Järvi & Giorgi Gigashvili",
"series": null,
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Giorgi Gigashvili"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Ravel",
"title": "",
"composerId": "ravel"
},
{
"composer": "Stenhammar",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5598&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-giorgi-gigashvili-2055782/",
"source": "tonhalle"
},
{
"id": "real-stadtcasino_basel-18032027_vosiko",
"title": "Sinfonieorchester Basel",
"series": "Volkssinfoniekonzerte",
"start": "2027-03-18T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Ensemble",
"name": "Solistinnen und Solisten der Musikhochschule Basel"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Stabat Mater op. 58",
"composerId": "dvorak"
}
],
"ticketUrl": "https://tickets.volkssinfoniekonzerte.ch/webshop/webticket/seatmap?eventId=211",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/18032027_vosiko/",
"source": "stadtcasino_basel"
},
{
"id": "real-musikkollegium-9439",
"title": "Luise Adolpha Le Beau",
"series": "Musik über Mittag",
"start": "2027-03-19T12:15:00+01:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Ryoko Suguri"
},
{
"role": "Violin",
"name": "Pascal Druey"
},
{
"role": "Viola",
"name": "Giulietta Mariani"
},
{
"role": "Cello",
"name": "Flurin Cuonz"
},
{
"role": "Double bass",
"name": "Kristof Zambo"
}
],
"program": [
{
"composer": "Luise Adolpha Le Beau",
"title": "Streichquartett g-Moll, op. 34"
},
{
"composer": "Luise Adolpha Le Beau",
"title": "Streichquintett, op. 54"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/175565/",
"sourceUrl": "https://www.musikkollegium.ch/programm/luise-adolpha-le-beau-27-03-19-9439",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200208",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-19T19:00:00+01:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15421&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-buehnen_bern-la-valse-2027-03-19-1930",
"title": "La Valse",
"series": "9. Symphoniekonzert",
"start": "2027-03-19T19:30:00+01:00",
"durationMin": 75,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Eva Ollikainen"
},
{
"role": "Violin",
"name": "Gil Shaham"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Samuel Barber",
"title": "Konzert für Violine und Orchester op. 14 (1939)"
},
{
"workId": "rstrauss-rosenkavalier",
"composerId": "richard-strauss"
},
{
"composer": "Maurice Ravel",
"title": "La Valse. Poème chorégraphique (1919/20)",
"composerId": "ravel"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2208&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/la-valse/",
"source": "buehnen_bern"
},
{
"id": "real-musikkollegium-9253",
"title": "Zu Gast in Schaffhausen",
"series": "Abonnementskonzert",
"start": "2027-03-19T19:30:00+01:00",
"durationMin": 105,
"cityId": "schaffhausen",
"venueId": "st-johann-schaffhausen",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Barbara Hannigan"
},
{
"role": "Soprano",
"name": "Barbara Hannigan"
}
],
"program": [
{
"composer": "Igor Strawinsky",
"title": "Konzert für Kammerorchester Es-Dur «Dumbarton Oaks»"
},
{
"composer": "Benjamin Britten",
"title": "«Les illuminations» op. 18 für hohe Stimme und Streichorchester, Text von Arthur Rimbaud"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 4 B-Dur, op. 60",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.stadttheater-sh.ch/event/5-sh-klassik-konzert-26-27-6q9zh3",
"sourceUrl": "https://www.musikkollegium.ch/programm/zu-gastschaffhausen-27-03-19-9253",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055781",
"title": "tonhalleLATE – classic meets electronic",
"series": null,
"start": "2027-03-19T22:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Giorgi Gigashvili"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Ravel",
"title": "",
"composerId": "ravel"
},
{
"composer": "Emanuel Meshvinski",
"title": ""
},
{
"composer": "Kollektiv Packungsbeilage",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5730&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/tonhallelate-classic-meets-electronic-2055781/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199824",
"title": "Ascanio in Alba",
"series": "Hauptbühne",
"start": "2027-03-20T19:00:00+01:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Harpsichord & direction",
"name": "Christophe Rousset"
},
{
"role": "Venere",
"name": "Mélissa Petit"
},
{
"role": "Ascanio",
"name": "Alisa Kolosova"
},
{
"role": "Silvia",
"name": "Anna El-Khashem"
},
{
"role": "Aceste, Priester der Venus",
"name": "Anle Gou"
},
{
"role": "Fauno",
"name": "Eleonora Bellocci"
},
{
"role": "Choir",
"name": "Chorzuzüger:innen"
},
{
"role": "Orchestra",
"name": "Les Talens Lyriques"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Ascanio in Alba",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15304&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ascanio-in-alba/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056915",
"title": "Abo-Konzert #5 – Polyptyque",
"series": "Abo-Konzert #5",
"start": "2027-03-20T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Zürich"
},
{
"role": "Violin & direction",
"name": "Esther Hoppe"
},
{
"role": "Harpsichord",
"name": "Vital Julian Frey"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Martin",
"title": "",
"composerId": "martin"
},
{
"composer": "Dubugnon",
"title": ""
}
],
"ticketUrl": "https://shop.e-guma.ch/camerata-zuerich/de/events/5-polyptyque-tonhalle-zuerich-4872682",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/abo-konzert-5-polyptyque-2056915/tz/",
"source": "tonhalle"
},
{
"id": "real-osr-la-fille-du-far-west-20270320",
"title": "La Fille du Far West",
"series": null,
"start": "2027-03-20T19:30:00+01:00",
"durationMin": 160,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Minnie",
"name": "Anastasia Bartoli"
},
{
"role": "Jack Rance",
"name": "Pavel Yankovski"
},
{
"role": "Dick Johnson (Ramerrez)",
"name": "Arturo Chacón-Cruz"
},
{
"role": "Nick",
"name": "Enrico Casari"
},
{
"role": "Ashby",
"name": "Lorenzo Mazzucchelli"
},
{
"role": "Sonora",
"name": "Damien Gastl"
},
{
"role": "Trin",
"name": "Glen Cunningham"
},
{
"role": "Sid",
"name": "Vladimir Kazakov"
},
{
"role": "Bello",
"name": "Nicolas Carré"
},
{
"role": "Harry",
"name": "Satriya Krisna"
},
{
"role": "Joe",
"name": "Marin Yonchev"
},
{
"role": "Happy",
"name": "Igor Gnidii"
},
{
"role": "Larkens",
"name": "Jared Mac Werlein"
},
{
"role": "Jake Wallace",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Billy Jackrabbit",
"name": "Joshua Morris"
},
{
"role": "Wowkle",
"name": "Carine Séchaye"
},
{
"role": "Jose Castro",
"name": "Marc Mazuir"
},
{
"role": "Un postillon",
"name": "Jaime Caicompai"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La Fille du Far West",
"composerId": "puccini"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/la-fille-du-far-west",
"source": "osr"
},
{
"id": "real-musikkollegium-9450",
"title": "Schoeck & Mendelssohn",
"series": "Music for a While",
"start": "2027-03-21T14:00:00+01:00",
"durationMin": 75,
"cityId": "winterthur",
"venueName": "Sammlung Oskar Reinhart Am Römerholz",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Cécile Vonderwahl"
},
{
"role": "Violin",
"name": "Beata Checko-Zimmermann"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Cello",
"name": "Seraphina Rufer"
},
{
"role": "Soprano",
"name": "Mélanie Adami"
}
],
"program": [
{
"composer": "Othmar Schoeck",
"title": "Streichquartett Nr. 1 D-Dur, op. 23"
},
{
"composer": "Aribert Reimann",
"title": "«....oder soll es Tod bedeuten?» Acht Lieder und ein Fragment für Sopran und Streichquartett von Felix Mendelssohn Bartholdy"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/177759/",
"sourceUrl": "https://www.musikkollegium.ch/programm/schoeck-mendelssohn-27-03-21-9450",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200269",
"title": "Te Deum",
"series": "Hauptbühne",
"start": "2027-03-21T14:00:00+01:00",
"durationMin": 75,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15299&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/te-deum/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2061996",
"title": "Kosmos Kammermusik: Lisa Batiashvili & Giorgi Gigashvili",
"series": "Kosmos Kammermusik",
"start": "2027-03-21T17:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Lisa Batiashvili"
},
{
"role": "Piano",
"name": "Giorgi Gigashvili"
}
],
"program": [
{
"composer": "Bardanashvili",
"title": ""
},
{
"composer": "Bartók",
"title": "",
"composerId": "bartok"
},
{
"composer": "Franck",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5613&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-giorgi-gigashvili-lisa-batiashvili-2061996/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199916",
"title": "La clemenza di Tito",
"series": "Hauptbühne",
"start": "2027-03-21T19:30:00+01:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gianluca Capuano"
},
{
"role": "Tito Vespasiano\\n",
"name": "Giovanni Sala"
},
{
"role": "Vitellia\\n",
"name": "Alexandra Marcellier"
},
{
"role": "Servilia\\n",
"name": "Yewon Han"
},
{
"role": "Sesto\\n",
"name": "Cecilia Bartoli"
},
{
"role": "Annio\\n",
"name": "Anna Tetruashvili"
},
{
"role": "Publio\\n",
"name": "Andrew Moore"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Orchestra",
"name": "Orchestra La Scintilla"
},
{
"role": "Director",
"name": "Damiano Michieletto"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "La clemenza di Tito",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15204&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-clemenza-di-tito-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-14-211-20270322",
"title": "Passons aux Salons #14",
"series": "Passons aux Salons",
"start": "2027-03-22T12:30:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215280&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-14-211",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200209",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-23T19:00:00+01:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15422&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-230327_kob",
"title": "Kammerorchester Basel – Schumanns Passion",
"series": "Musiksaal",
"start": "2027-03-23T19:30:00+01:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Soprano",
"name": "Rowan Pierce"
},
{
"role": "Alto",
"name": "Henriette Gödde"
},
{
"role": "Tenor",
"name": "Patrick Grahl"
},
{
"role": "Bass",
"name": "Markus Eiche"
},
{
"role": "Bass",
"name": "Tobias Berndt"
},
{
"role": "Choir",
"name": "Gaechinger Cantorey"
},
{
"role": "Conductor",
"name": "Hans-Christoph Rademann"
},
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Johannes-Passion, BWV 245, in der Bearbeitung von Robert Schumann (Düsseldorf 1851)",
"composerId": "bach"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Kammerorchester_Basel/shop/event/175793/#event",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/230327_kob/",
"source": "stadtcasino_basel"
},
{
"id": "real-osr-faust-helene-20270324",
"title": "Faust et Hélène",
"series": "Série R",
"start": "2027-03-24T19:30:00+01:00",
"durationMin": 100,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniel Harding"
},
{
"role": "Mezzo-soprano",
"name": "Fleur Barron"
},
{
"role": "Tenor",
"name": "Andrew Staples"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"workId": "debussy-faune",
"composerId": "debussy"
},
{
"composer": "Claude Debussy",
"title": "La Mer, trois esquisses symphoniques pour orchestre",
"composerId": "debussy"
},
{
"composer": "Lili Boulanger",
"title": "Faust et Hélène, épisode lyrique d’après le second Faust de Goethe pour soli et orchestre"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/faust-helene",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/faust-helene",
"source": "osr"
},
{
"id": "real-ocg-thais-20270324",
"title": "Thaïs",
"series": "Concert à l'abo",
"start": "2027-03-24T20:00:00+01:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marc Leroy-Calatayud"
},
{
"role": "Thaïs",
"name": "Amina Edris"
},
{
"role": "Athanaël",
"name": "Lionel Lhote"
},
{
"role": "Nicias",
"name": "Pene Pati"
},
{
"role": "Palémon",
"name": "Marc Scoffoni"
},
{
"role": "La Charmeuse",
"name": "Emma Delannoy"
},
{
"role": "Crobyle",
"name": "Roxane Macaudière"
},
{
"role": "Myrtale",
"name": "Louna Simon"
},
{
"role": "Albine",
"name": "Marie Bokatola"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genéve"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Jules Massenet",
"title": "Thaïs, opéra en 3 actes"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790113997",
"sourceUrl": "https://locg.ch/fr/calendrier/thais",
"source": "ocg"
},
{
"id": "real-musikkollegium-9257",
"title": "Meet the Strings",
"series": "Feierabend-Konzert",
"start": "2027-03-25T17:30:00+01:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Bogdan Božović"
},
{
"role": "Host",
"name": "Bogdan Božović"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "«Der Tod und das Mädchen» D 810, arrangiert für Streichorchester von Gustav Mahler",
"composerId": "schubert"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/meet-the-strings-27-03-25-9257",
"sourceUrl": "https://www.musikkollegium.ch/programm/meet-the-strings-27-03-25-9257",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200210",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-25T19:00:00+01:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15423&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055803",
"title": "Brahms: Ein deutsches Requiem",
"series": null,
"start": "2027-03-25T19:30:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Joachim Krause"
},
{
"role": "Soprano",
"name": "Susanne Langbein"
},
{
"role": "Baritone",
"name": "Werner Van Mechelen"
},
{
"role": "Choir",
"name": "Der Gemischte Chor Zürich"
}
],
"program": [
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/brahms-ein-deutsches-requiem-2055803/",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/brahms-ein-deutsches-requiem-2055803/",
"source": "tonhalle"
},
{
"id": "real-osr-faust-helene-20270325",
"title": "Faust et Hélène",
"series": "Série S",
"start": "2027-03-25T19:30:00+01:00",
"durationMin": 100,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniel Harding"
},
{
"role": "Mezzo-soprano",
"name": "Fleur Barron"
},
{
"role": "Tenor",
"name": "Andrew Staples"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"workId": "debussy-faune",
"composerId": "debussy"
},
{
"composer": "Claude Debussy",
"title": "La Mer, trois esquisses symphoniques pour orchestre",
"composerId": "debussy"
},
{
"composer": "Lili Boulanger",
"title": "Faust et Hélène, épisode lyrique d’après le second Faust de Goethe pour soli et orchestre"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/faust-helene",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/faust-helene",
"source": "osr"
},
{
"id": "real-tonhalle-2055804",
"title": "Brahms: Ein deutsches Requiem",
"series": null,
"start": "2027-03-26T16:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Joachim Krause"
},
{
"role": "Soprano",
"name": "Susanne Langbein"
},
{
"role": "Baritone",
"name": "Werner Van Mechelen"
},
{
"role": "Choir",
"name": "Der Gemischte Chor Zürich"
}
],
"program": [
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/brahms-ein-deutsches-requiem-2055804/",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/brahms-ein-deutsches-requiem-2055804/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19907",
"title": "BEETHOVENS 200. TODESTAG – RUDOLF BUCHBINDER SPIELT BEETHOVEN",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-03-26T19:30:00+01:00",
"durationMin": 115,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Rudolf Buchbinder"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klaviersonate Nr. 3 in C-Dur, op. 2/3",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klaviersonate Nr. 14 Mondscheinsonate in cis-Moll, op. 27/2",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klaviersonate Nr. 30 in E-Dur, op. 109",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Klaviersonate Nr. 23 Appassionata in f-Moll, op. 57",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/beethovens-200-todestag-rudolf-buchbinder-spielt-ex5y0f",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/an-beethovens-200-todestag-rudolf-buchbinder-spielt-beethoven/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2056000",
"title": "Bach: Matthäuspassion",
"series": null,
"start": "2027-03-27T18:00:00+01:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Collegium 1704"
},
{
"role": "Choir",
"name": "Collegium Vocale 1704"
},
{
"role": "Conductor",
"name": "Václav Luks"
},
{
"role": "Tenor",
"name": "Eric Stoklossa"
},
{
"role": "Bass",
"name": "Matthias Winckhler"
},
{
"role": "Soprano",
"name": "Céline Scheen"
},
{
"role": "Soprano",
"name": "Tereza Zimková"
},
{
"role": "Alto",
"name": "Luciana Mancini"
},
{
"role": "Alto",
"name": "Aneta Petrasová"
},
{
"role": "Tenor",
"name": "Jan Petryka"
},
{
"role": "Tenor",
"name": "Ondřej Holub"
},
{
"role": "Bass",
"name": "Krešimir Stražanac"
},
{
"role": "Bass",
"name": "Tomáš Šelc"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5659&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/bach-matthaeuspassion-2056000/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200211",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-27T19:00:00+01:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15424&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19908",
"title": "NATUR & GLAUBE – BEETHOVENS PASTORALE UND C-DUR-MESSE",
"series": "Sinfoniekonzerte",
"start": "2027-03-28T11:00:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Maxime Pascal"
},
{
"role": "Soprano",
"name": "Elvira Margarian"
},
{
"role": "Soprano",
"name": "Marcela Rahal"
},
{
"role": "Bass",
"name": "Rueben Mbonambi"
},
{
"role": "Tenor",
"name": "Hwapyeong Gwon"
},
{
"role": "Choir",
"name": "Collegium Vocale zu Franziskanern Luzern"
},
{
"role": "Chorus master",
"name": "Ulrike Grosch"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 6 Pastorale in F-Dur, op. 68",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Messe in C-Dur, op. 86",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/natur-glaube-beethovens-pastorale-und-c-dur-mess-gouw7d",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/natur-glaube-beethovens-pastorale-und-c-dur-messe/",
"source": "lso_luzern"
},
{
"id": "real-stadtcasino_basel-sofia-metropolitan-orchestra",
"title": "Sofia Metropolitan Orchestra – Werke von Ravel, Beethoven, Mozart, Bach & Rossini",
"series": "Musiksaal",
"start": "2027-03-28T17:00:00+02:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Zukernik"
},
{
"role": "Orchestra",
"name": "Sofia Metropolitan Orchestra"
}
],
"program": [
{
"workId": "ravel-bolero",
"composerId": "ravel"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 5",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Mondscheinsonate",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Für Elise",
"composerId": "beethoven"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Ouvertüre zu «Die Hochzeit des Figaro»",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Rondo alla turca",
"composerId": "mozart"
},
{
"composer": "Johann Sebastian Bach",
"title": "Air aus der Orchestersuite Nr. 3",
"composerId": "bach"
},
{
"composer": "Gioachino Rossini",
"title": "Ouvertüre zu «Der Barbier von Sevilla»",
"composerId": "rossini"
}
],
"ticketUrl": "https://tickets.concert-media.com/checkout-service/schema?productId=24&l=de",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/sofia-metropolitan-orchestra/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055811",
"title": "Festtags-Matinee",
"series": null,
"start": "2027-03-29T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Baritone",
"name": "Felix Gygli"
},
{
"role": "Violin",
"name": "Christopher Whiting"
},
{
"role": "Violin",
"name": "Peter McGuire"
},
{
"role": "Viola",
"name": "Katarzyna Kitrasiewicz-Łosiewicz"
},
{
"role": "Cello",
"name": "Sasha Neustroev"
},
{
"role": "Piano",
"name": "Elaine Fukunaga"
}
],
"program": [
{
"composer": "Copland",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Bridge",
"title": ""
},
{
"composer": "Schickele",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5632&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/festtags-matinee-2055811/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200212",
"title": "Rinaldo",
"series": "Hauptbühne",
"start": "2027-03-29T19:30:00+02:00",
"durationMin": 195,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Rinaldo",
"composerId": "handel"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15425&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/rinaldo-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9247",
"title": "Orgelkonzerte im Stadthaus",
"series": "Hauskonzert",
"start": "2027-04-01T19:00:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Nils Erik Måseidvåg"
},
{
"role": "Organ",
"name": "Christian Schmitt"
},
{
"role": "Host",
"name": "Lion Gallusser"
}
],
"program": [
{
"composer": "Georg Friedrich Händel",
"title": "Konzert für Orgel und Orchester g-Moll, op.4/3, HWV 291",
"composerId": "handel"
},
{
"composer": "Paul Hindemith",
"title": "Konzert für Orgel und Orchester"
},
{
"composer": "Johann Sebastian Bach",
"title": "Toccata und Fuge d-Moll, BWV 565",
"composerId": "bach"
},
{
"composer": "Maximilian Schnaus",
"title": "«Signals» für Pedal solo"
},
{
"composer": "César Franck",
"title": "Grande pièce symphonique, op. 17"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/167841/",
"sourceUrl": "https://www.musikkollegium.ch/programm/orgelkonzerte-im-stadthaus-27-04-01-9247",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200323",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2027-04-02T19:00:00+02:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Tamino",
"name": "Johan Krogius"
},
{
"role": "Sarastro",
"name": "Brent Michael Smith"
},
{
"role": "Pamina",
"name": "Kathrin Zukowski"
},
{
"role": "Königin der Nacht",
"name": "Alina Wunderlin"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Evan Gray"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15167&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-pietro-massa",
"title": "Chopin Plus – Ein Klavierabend mit Pietro Massa",
"series": "Hans Huber-Saal",
"start": "2027-04-02T19:30:00+02:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "recital",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/event/pietro-massa-2027-stadtcasino-basel-21567711/",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/pietro-massa/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2056923",
"title": "Rezital Grigory Sokolov",
"series": null,
"start": "2027-04-02T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Grigory Sokolov"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5654&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/rezital-grigory-sokolov-2056923/tz/",
"source": "tonhalle"
},
{
"id": "real-opera_lausanne-recital-huw-montague-rendall-20270402-2000",
"title": "Récital Huw Montague Rendall",
"series": null,
"start": "2027-04-02T20:00:00+02:00",
"durationMin": 120,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Baritone",
"name": "Huw Montague Rendall"
},
{
"role": "Piano",
"name": "Carrie-Ann Matheson"
}
],
"program": [
{
"composer": "Vaughan Williams",
"title": ""
},
{
"composer": "Dove",
"title": ""
},
{
"composer": "Schönberg",
"title": ""
},
{
"composer": "Mahler",
"title": "",
"composerId": "mahler"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098123",
"sourceUrl": "https://www.opera-lausanne.ch/show/recital-huw-montague-rendall/",
"source": "opera_lausanne"
},
{
"id": "real-musikkollegium-9258",
"title": "Was denkst du, Ozean? - Viel Meer",
"series": "Familienkonzert ab 5 Jahren",
"start": "2027-04-03T15:00:00+02:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Nils Erik Måseidvåg"
},
{
"role": "Narrator",
"name": "Sabine Bierich"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161641/",
"sourceUrl": "https://www.musikkollegium.ch/programm/was-denkst-du-ozean-viel-meer-27-04-03-9258",
"source": "musikkollegium"
},
{
"id": "real-lso_luzern-19946",
"title": "KAMMERMUSIK-MATINÉE 6",
"series": "Kammermusik",
"start": "2027-04-04T11:15:00+02:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Brandon Garbot"
},
{
"role": "Violin",
"name": "Hae Jin Park"
},
{
"role": "Viola",
"name": "Olga Kowalczyk"
}
],
"program": [
{
"composer": "Franz Schubert",
"title": "Quartettsatz in c-Moll, D 703",
"composerId": "schubert"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquartett Nr. 7 Rasumowsky in F-Dur, op. 59/1",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-6-zcmzxr",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-6-4/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-199991",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-04-04T19:30:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Martin Muehle"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15416&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-stadtcasino_basel-040427_concert_olympique",
"title": "Le Concert Olympique mit Arnold Schoenberg Chor und Kit Armstrong",
"series": "AMG Symphonic Gems",
"start": "2027-04-04T19:30:00+02:00",
"durationMin": 120,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Jan Caeyers"
},
{
"role": "Choir",
"name": "Arnold Schoenberg Chor"
},
{
"role": "Piano",
"name": "Kit Armstrong"
},
{
"role": "Soprano",
"name": "Lenneke Ruiten"
},
{
"role": "Alto",
"name": "Ulrike Meyer"
},
{
"role": "Tenor",
"name": "Simon Bode"
},
{
"role": "Baritone",
"name": "Äneas Humm"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Präludium und Fuge Nr. 2 c-Moll BWV 847",
"composerId": "bach"
},
{
"composer": "Ludwig van Beethoven",
"title": "3 Bagatellen aus op. 119 (Nr. 2 C-Dur, Nr. 4 A-Dur, Nr. 8 C-Dur)",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Fantasie für Klavier, Chor und Orchester c-Moll op. 80",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 9 d-Moll op. 125LE",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.konzerte-basel.ch/webshop/webticket/shop?event=201",
"sourceUrl": "https://www.stadtcasino-basel.ch/de/programm/veranstaltungen/040427_concert_olympique/",
"source": "stadtcasino_basel"
},
{
"id": "real-tonhalle-2055828",
"title": "Série jeunes: Dmitry Yudin",
"series": "Série jeunes",
"start": "2027-04-05T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Dmitry Yudin"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Schulhoff",
"title": ""
},
{
"composer": "Reger",
"title": ""
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5626&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/serie-jeunes-dmitry-yudin-2055828/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-filmmusik-live-von-hans-zimmer-bis-john-williams",
"title": "Filmmusik Live – Von Hans Zimmer bis John Williams",
"series": null,
"start": "2027-04-06T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Philharmonie Leipzig"
},
{
"role": "Conductor",
"name": "Prof. Michael Koehler"
},
{
"role": "Violin",
"name": "Holger Engelhardt"
},
{
"role": "Presenter",
"name": "Roman Petermann"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5638&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/filmmusik-live-von-hans-zimmer-bis-john-williams/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199992",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-04-07T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Martin Muehle"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15417&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2067869",
"title": "1812: Abschied – Das Ende einer Ära",
"series": null,
"start": "2027-04-07T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Le Concert Olympique"
},
{
"role": "Conductor",
"name": "Jan Caeyers"
},
{
"role": "Piano",
"name": "Kit Armstrong"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/1812-abschied-das-ende-einer-aera-2067869/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/1812-abschied-das-ende-einer-aera-2067869/tz/",
"source": "tonhalle"
},
{
"id": "real-sob-12155",
"title": "Drama",
"series": "Sinfoniekonzert",
"start": "2027-04-07T19:30:00+02:00",
"durationMin": 105,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Narrator",
"name": "Tobias Moretti"
},
{
"role": "Soprano",
"name": "Anna Juniki"
},
{
"role": "Conductor",
"name": "Bertrand de Billy"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Henri Dutilleux",
"title": "Sinfonie Nr. 2 \"Le Double\""
},
{
"composer": "Ludwig van Beethoven",
"title": "Musik zu Goethes Trauerspiel \"Egmont\", op. 84",
"composerId": "beethoven"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078771&productId=10229721147339&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/drama/12155",
"source": "sob"
},
{
"id": "real-musikkollegium-9261",
"title": "Josef Špaček spielt Dvořák",
"series": "Abonnementskonzert",
"start": "2027-04-07T19:30:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Violin",
"name": "Josef Špaček"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Konzert für Violine und Orchester a-Moll, op. 53",
"composerId": "dvorak"
},
{
"composer": "Antonín Dvořák",
"title": "«Othello» Konzertouvertüre, op. 93",
"composerId": "dvorak"
},
{
"composer": "Antonín Dvořák",
"title": "«Der Wassermann» Sinfonische Dichtung, op. 107",
"composerId": "dvorak"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163511/",
"sourceUrl": "https://www.musikkollegium.ch/programm/josef-spacek-spielt-dvorak-27-04-07-9261",
"source": "musikkollegium"
},
{
"id": "real-osi-205107708437905",
"title": "Lunch with OSI",
"series": "be connected",
"start": "2027-04-08T12:30:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Igor Stravinskij",
"title": "L’uccello di fuoco suite dal balletto per orchestra op. 20"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11849",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-04-08-12-30",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-200324",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2027-04-08T19:30:00+02:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Tamino",
"name": "Johan Krogius"
},
{
"role": "Sarastro",
"name": "Brent Michael Smith"
},
{
"role": "Pamina",
"name": "Kathrin Zukowski"
},
{
"role": "Königin der Nacht",
"name": "Alina Wunderlin"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Evan Gray"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15168&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-sob-12154",
"title": "Drama",
"series": "Sinfoniekonzert",
"start": "2027-04-08T19:30:00+02:00",
"durationMin": 105,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Narrator",
"name": "Tobias Moretti"
},
{
"role": "Soprano",
"name": "Anna Juniki"
},
{
"role": "Conductor",
"name": "Bertrand de Billy"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Henri Dutilleux",
"title": "Sinfonie Nr. 2 \"Le Double\""
},
{
"composer": "Ludwig van Beethoven",
"title": "Musik zu Goethes Trauerspiel \"Egmont\", op. 84",
"composerId": "beethoven"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078772&productId=10229721147339&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/drama/12154",
"source": "sob"
},
{
"id": "real-musikkollegium-9263",
"title": "Josef Špaček spielt Dvořák",
"series": "Abonnementskonzert",
"start": "2027-04-08T19:30:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Violin",
"name": "Josef Špaček"
}
],
"program": [
{
"composer": "Antonín Dvořák",
"title": "Konzert für Violine und Orchester a-Moll, op. 53",
"composerId": "dvorak"
},
{
"composer": "Antonín Dvořák",
"title": "«Othello» Konzertouvertüre, op. 93",
"composerId": "dvorak"
},
{
"composer": "Antonín Dvořák",
"title": "«Der Wassermann» Sinfonische Dichtung, op. 107",
"composerId": "dvorak"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163512/",
"sourceUrl": "https://www.musikkollegium.ch/programm/josef-spacek-spielt-dvorak-27-04-08-9263",
"source": "musikkollegium"
},
{
"id": "real-osi-175715631901023",
"title": "Alexander Malofeev",
"series": "OSI al LAC",
"start": "2027-04-08T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Alexander Malofeev"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Coriolano ouverture",
"composerId": "beethoven"
},
{
"composer": "Edvard Grieg",
"title": "Concerto per pianoforte e orchestra in la minore op. 16",
"composerId": "grieg"
},
{
"composer": "Igor Stravinskij",
"title": "L’uccello di fuoco suite dal balletto per orchestra op. 20"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11765",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-04-08-20-00",
"source": "osi"
},
{
"id": "real-geneva_victoria_hall-15905932-20270409",
"title": "Brahms: Concerto pour piano n° 1 et Symphonie n° 4",
"series": null,
"start": "2027-04-09T19:30:00+02:00",
"durationMin": 90,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Peace Philharmonic Orchestra"
},
{
"role": "Piano & Conductor",
"name": "Nikolay Khozyainov"
}
],
"program": [],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229293710863",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/15905932_3758732",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2056930",
"title": "Jubiläumskonzert 50 Classical Highlights",
"series": null,
"start": "2027-04-09T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sofia Philharmonic Orchestra"
},
{
"role": "Conductor",
"name": "Nayden Todorov"
},
{
"role": "Violin",
"name": "Maria Solozobova"
},
{
"role": "Cello",
"name": "Meehae Ryo"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Paganini",
"title": ""
},
{
"composer": "Saint-Saëns",
"title": "",
"composerId": "saint-saens"
},
{
"composer": "Mendelssohn Bartholdy",
"title": "",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.ticketino.com/de/event/masterinterpreten-opus-50-jubilaeumskonzert/215389",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/jubilaeumskonzert-50-classical-highlights-2056930/tz/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2055835",
"title": "Rudolf Buchbinder mit Beethoven",
"series": null,
"start": "2027-04-10T18:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Piano & direction",
"name": "Rudolf Buchbinder"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5585&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/rudolf-buchbinder-mit-beethoven-2055835/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199993",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-04-10T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Martin Muehle"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Aksel Daveyan"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15418&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200037",
"title": "7. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-04-11T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15450&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-7/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055837",
"title": "Rudolf Buchbinder mit Beethoven",
"series": null,
"start": "2027-04-11T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Piano & direction",
"name": "Rudolf Buchbinder"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5589&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/rudolf-buchbinder-mit-beethoven-2055837/",
"source": "tonhalle"
},
{
"id": "real-osi-205108787444802",
"title": "Tournée OSI",
"series": "OSI in Tournée",
"start": "2027-04-11T17:00:00+02:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Piano",
"name": "Alexander Malofeev"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Coriolano ouverture",
"composerId": "beethoven"
},
{
"composer": "Edvard Grieg",
"title": "Concerto per pianoforte e orchestra in la minore op. 16",
"composerId": "grieg"
},
{
"composer": "Igor Stravinskij",
"title": "L’uccello di fuoco suite dal balletto per orchestra op. 20"
}
],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-04-11-17-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-04-11-17-00",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-200270",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-04-11T20:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15214&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9427",
"title": "Bogdan Božović & Alasdair Beatson",
"series": "Lunch-Konzert",
"start": "2027-04-12T12:15:00+02:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Bogdan Božović"
},
{
"role": "Violin",
"name": "Bogdan Božović"
},
{
"role": "Piano",
"name": "Alasdair Beatson"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Sonate für Violine und Klavier F-Dur, MWV Q26",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Konzert für Violine, Klavier und Streicher d-Moll",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/bogdan-bozovic-alasdair-beatson-27-04-12-9427",
"sourceUrl": "https://www.musikkollegium.ch/programm/bogdan-bozovic-alasdair-beatson-27-04-12-9427",
"source": "musikkollegium"
},
{
"id": "real-ocg-passons-aux-salons-15-20270412",
"title": "Passons aux Salons #15",
"series": "Passons aux Salons",
"start": "2027-04-12T12:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215281&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-15",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200038",
"title": "7. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-04-12T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15451&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-7/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056933",
"title": "Hayato Sumino: Ravel & Eigenes",
"series": null,
"start": "2027-04-12T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
},
{
"role": "Conductor",
"name": "Pierre Bleuse"
},
{
"role": "Piano",
"name": "Hayato Sumino"
}
],
"program": [
{
"composer": "Ravel",
"title": "",
"composerId": "ravel"
},
{
"composer": "Sumino",
"title": ""
},
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5655&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/hayato-sumino-ravel-eigenes-2056933/tz/",
"source": "tonhalle"
},
{
"id": "real-zko-19517",
"title": "Julia Hagen",
"series": "Abo-Konzerte",
"start": "2027-04-13T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Julia Hagen"
},
{
"role": "Violin & direction",
"name": "Pablo Hernán Benedí"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Joseph Bologne",
"title": "Ouvertüre, aus: L’amant anonyme"
},
{
"composer": "Joseph Haydn",
"title": "Konzert für Violoncello und Orchester Nr. 1 C-Dur, Hob. VIIb:1",
"composerId": "haydn"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquartett Nr. 16 F-Dur, op. 135 (Fassung für Streichorchester)",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1955",
"sourceUrl": "https://zko.ch/events/julia-hagen/",
"source": "zko"
},
{
"id": "real-ocg-un-requiem-allemand-20270413",
"title": "Un Requiem allemand",
"series": "Concert à l'abo",
"start": "2027-04-13T20:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Soprano",
"name": "Erika Baikoff"
},
{
"role": "Baritone",
"name": "Christian Immler"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"workId": "brahms-requiem",
"composerId": "brahms"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114011",
"sourceUrl": "https://locg.ch/fr/calendrier/un-requiem-allemand",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200271",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-04-14T19:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15215&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19910",
"title": "ARTHUR WASER PREISTRÄGER KONZERT",
"series": "Sinfoniekonzerte",
"start": "2027-04-14T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "John Storgårds"
},
{
"role": "Performer",
"name": "Martina Meola"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Fréderic Chopin",
"title": "Klavierkonzert Nr. 2 f-moll op. 21",
"composerId": "chopin"
},
{
"composer": "Erich Wolfgang Korngold",
"title": "Sinfonie in Fis-Dur, op. 40"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/arthur-waser-preistrager-konzert-mndpqo",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/arthur-waser-preistraeger-konzert-2/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055849",
"title": "Kammermusik-Lunchkonzert",
"series": null,
"start": "2027-04-15T12:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Isabel Neligan"
},
{
"role": "Viola",
"name": "Sarina Zickgraf"
},
{
"role": "Cello",
"name": "Sandro Meszaros"
},
{
"role": "Piano",
"name": "Hendrik Heilmann"
}
],
"program": [
{
"composer": "Hensel",
"title": ""
},
{
"composer": "Mendelssohn Bartholdy",
"title": "",
"composerId": "mendelssohn"
},
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5603&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-lunchkonzert-2055849/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9267",
"title": "Quasi una fantasia",
"series": "Hauskonzert",
"start": "2027-04-15T19:00:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Francesco Cagnasso"
},
{
"role": "Violin",
"name": "Rahel Cunz"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Ouvertüre zum Dramatischen Gedicht «Manfred» nach Lord Byron, op. 115",
"composerId": "schumann"
},
{
"composer": "Arthur Honegger",
"title": "«Pastorale d'été» Poème symphonique",
"composerId": "honegger"
},
{
"composer": "Max E. Keller",
"title": "«Signale» für Orchester, Auftragskomposition des Musikkollegium Winterthur, Uraufführung"
},
{
"composer": "Othmar Schoeck",
"title": "Konzert für Violine und Orchester B-Dur, op. 21 «Quasi una fantasia»"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161637/",
"sourceUrl": "https://www.musikkollegium.ch/programm/quasi-una-fantasia-27-04-15-9267",
"source": "musikkollegium"
},
{
"id": "real-lso_luzern-19909",
"title": "ARTHUR WASER PREISTRÄGER KONZERT",
"series": "Sinfoniekonzerte",
"start": "2027-04-15T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "John Storgårds"
},
{
"role": "Performer",
"name": "Martina Meola"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Fréderic Chopin",
"title": "Klavierkonzert Nr. 2 f-moll op. 21",
"composerId": "chopin"
},
{
"composer": "Erich Wolfgang Korngold",
"title": "Sinfonie in Fis-Dur, op. 40"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/arthur-waser-preistrager-konzert-2doirn",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/arthur-waser-preistraeger-konzert/",
"source": "lso_luzern"
},
{
"id": "real-buehnen_bern-feuervogel-2027-04-15-1930",
"title": "Feuervogel",
"series": "10. Symphoniekonzert",
"start": "2027-04-15T19:30:00+02:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Modest Mussorgsky",
"title": "Eine Nacht auf dem kahlen Berge (1867), vervollständigt und orchestriert von Nikolai Rimski-Korsakow (1886)"
},
{
"composer": "Dmitrij Schostakowitsch",
"title": "Konzert für Violoncello und Orchester Nr. 1 Es-Dur op. 107 (1959)"
},
{
"composer": "Igor Strawinsky",
"title": "Der Feuervogel (L’Oiseau de feu). Ballettsuite für grosses Orchester (1909 /10, 1945)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2053&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/feuervogel/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2055844",
"title": "Santtu-Matias Rouvali & Vivi Vassileva",
"series": null,
"start": "2027-04-15T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Santtu-Matias Rouvali"
},
{
"role": "Percussion",
"name": "Vivi Vassileva"
}
],
"program": [
{
"composer": "Aho",
"title": ""
},
{
"composer": "Sibelius",
"title": "",
"composerId": "sibelius"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5569&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/santtu-matias-rouvali-vivi-vassileva-2055844/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-51351555-20270415",
"title": "Yulianna Avdeeva",
"series": "Les Grands Interprètes",
"start": "2027-04-15T19:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Yulianna Avdeeva"
}
],
"program": [
{
"composer": "Johann Sebastian Bach",
"title": "Fantaisie chromatique et fugue en ré mineur, BWV 903",
"composerId": "bach"
},
{
"composer": "Ludwig van Beethoven",
"title": "Fantaisie en sol mineur, op. 77",
"composerId": "beethoven"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sonate pour piano n° 23 en fa mineur, op. 57, «Appassionata»",
"composerId": "beethoven"
},
{
"composer": "Maurice Ravel",
"title": "Pavane pour une infante défunte",
"composerId": "ravel"
},
{
"composer": "Maurice Ravel",
"title": "Valses nobles et sentimentales",
"composerId": "ravel"
},
{
"composer": "Maurice Ravel",
"title": "La Valse",
"composerId": "ravel"
}
],
"ticketUrl": "https://www.grandsinterpretes.ch/event/yulianna-avdeeva2027",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/51351555_yulianna-avdeeva-3819557",
"source": "geneva_victoria_hall"
},
{
"id": "real-musikkollegium-9440",
"title": "Sehnsucht Italien",
"series": "Musik über Mittag",
"start": "2027-04-16T12:15:00+02:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Rustem Monasypov"
},
{
"role": "Violin",
"name": "Anzhela Golubyeva Staub"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Viola",
"name": "Giulietta Mariani"
},
{
"role": "Cello",
"name": "Anikó Illényi"
},
{
"role": "Cello",
"name": "Franz Ortner"
}
],
"program": [
{
"composer": "Luigi Boccherini",
"title": "Quintettino C-Dur «La musica notturna delle strade di Madrid» op. 30/6"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Streichsextett d-Moll, op. 70 «Souvenir de Florence»"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/176605/",
"sourceUrl": "https://www.musikkollegium.ch/programm/sehnsucht-italien-27-04-16-9440",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199994",
"title": "La fanciulla del west",
"series": "Hauptbühne",
"start": "2027-04-16T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Marco Armiliato"
},
{
"role": "Minnie",
"name": "Anja Kampe"
},
{
"role": "Dick Johnson",
"name": "Martin Muehle"
},
{
"role": "Jack Rance",
"name": "Tomasz Konieczny"
},
{
"role": "Nick",
"name": "Stephan Rügamer"
},
{
"role": "Sonora",
"name": "Vladyslav Tlushch"
},
{
"role": "Ashby",
"name": "Stanislav Vorobyov"
},
{
"role": "Jake Wallace",
"name": "Brent Michael Smith"
},
{
"role": "Trin",
"name": "Johan Krogius"
},
{
"role": "Sid",
"name": "Guram Margvelashvili"
},
{
"role": "Bello",
"name": "Steffan Lloyd Owen"
},
{
"role": "Harry",
"name": "Nathan Haller"
},
{
"role": "Happy",
"name": "Bowen Ding"
},
{
"role": "Larkens",
"name": "Theodore McAlindon"
},
{
"role": "Billy Jackrabbit",
"name": "Mikayel Sargsyan"
},
{
"role": "Wowkle",
"name": "Marcela Rahal"
},
{
"role": "José Castro",
"name": "Evan Gray"
},
{
"role": "Ein Postillion",
"name": "Salvador Villanueva"
},
{
"role": "Joe",
"name": "Rafael Rojas"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Ensemble",
"name": "ShowTalentNetwork"
},
{
"role": "Director",
"name": "Lydia Steier"
}
],
"program": [
{
"composer": "Giacomo Puccini",
"title": "La fanciulla del west",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15419&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la-fanciulla-del-west-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-buehnen_bern-feuervogel-2027-04-16-1930",
"title": "Feuervogel",
"series": "10. Symphoniekonzert",
"start": "2027-04-16T19:30:00+02:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Modest Mussorgsky",
"title": "Eine Nacht auf dem kahlen Berge (1867), vervollständigt und orchestriert von Nikolai Rimski-Korsakow (1886)"
},
{
"composer": "Dmitrij Schostakowitsch",
"title": "Konzert für Violoncello und Orchester Nr. 1 Es-Dur op. 107 (1959)"
},
{
"composer": "Igor Strawinsky",
"title": "Der Feuervogel (L’Oiseau de feu). Ballettsuite für grosses Orchester (1909 /10, 1945)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2209&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/feuervogel/",
"source": "buehnen_bern"
},
{
"id": "real-lso_luzern-20407",
"title": "KLANGXCHANGE: KAMMERMUSIK TRIFFT AUF GESPRÄCH 4",
"series": null,
"start": "2027-04-16T19:30:00+02:00",
"durationMin": 120,
"cityId": "lucerne",
"venueName": "Bourbaki Panorama Luzern",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/klangxchange-5wr205?useEmbed=tru",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/klangxchange-kammermusik-trifft-auf-gespraech-4/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055846",
"title": "Santtu-Matias Rouvali & Vivi Vassileva",
"series": null,
"start": "2027-04-16T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Santtu-Matias Rouvali"
},
{
"role": "Percussion",
"name": "Vivi Vassileva"
}
],
"program": [
{
"composer": "Aho",
"title": ""
},
{
"composer": "Sibelius",
"title": "",
"composerId": "sibelius"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5594&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/santtu-matias-rouvali-vivi-vassileva-2055846/",
"source": "tonhalle"
},
{
"id": "real-zko-19927",
"title": "ZKO on Tour — Klassik Forum Chur – Julia Hagen",
"series": "ZKO on Tour",
"start": "2027-04-16T19:30:00+02:00",
"durationMin": 90,
"cityId": "chur",
"venueId": "theater-chur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Julia Hagen"
},
{
"role": "Violin & direction",
"name": "Pablo Hernán Benedí"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Joseph Bologne",
"title": "Ouvertüre, aus: L’amant anonyme"
},
{
"composer": "Joseph Haydn",
"title": "Konzert für Violoncello und Orchester Nr. 1 C-Dur, Hob. VIIb:1",
"composerId": "haydn"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquartett Nr. 16 F-Dur, op. 135 (Fassung für Streichorchester)",
"composerId": "beethoven"
}
],
"ticketUrl": "https://zko.ch/?post_type=noisa_events&p=19927",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19927",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-200272",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-04-17T19:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15216&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-nocturne-20270418",
"title": "Nocturne",
"series": "Série Musique de chambre",
"start": "2027-04-18T11:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "conservatoire-geneve",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Sarah Rumer"
},
{
"role": "Flute",
"name": "Jona Venturi"
},
{
"role": "Piano",
"name": "Audrey Vigoureux"
},
{
"role": "Violin",
"name": "Yumiko Awano"
},
{
"role": "Violin",
"name": "Eleonora Ryndina"
},
{
"role": "Viola",
"name": "Theresa Horejsi"
},
{
"role": "Cello",
"name": "Léonard Frey-Maibach"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "Nocturne, pour quatuor à cordes"
},
{
"composer": "Amy Beach",
"title": "Thème et variations pour flûte et quatuor à cordes en la mineur op. 80"
},
{
"composer": "Mel Bonis",
"title": "Suite en trio pour deux flûtes et piano op. 59"
},
{
"composer": "Germaine Tailleferre",
"title": "Quatuor à cordes"
},
{
"composer": "Mel Bonis",
"title": "Fantaisie en septuor op. 72"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/nocturne",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/nocturne",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200325",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2027-04-18T13:00:00+02:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Tamino",
"name": "Johan Krogius"
},
{
"role": "Sarastro",
"name": "Brent Michael Smith"
},
{
"role": "Pamina",
"name": "Kathrin Zukowski"
},
{
"role": "Königin der Nacht",
"name": "Alina Wunderlin"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Evan Gray"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15169&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9446",
"title": "Mondscheinsonate",
"series": "Kammermusik Liebestrasse",
"start": "2027-04-18T17:00:00+02:00",
"durationMin": 90,
"cityId": "winterthur",
"venueName": "Liebestrasse",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Anton Gerzenberg"
}
],
"program": [
{
"composer": "Alexander Skrjabin",
"title": "Sonate Nr. 6, op. 62"
},
{
"composer": "György Ligeti",
"title": "Etüde Nr. 9 «Vertige»"
},
{
"composer": "Alexander Skrjabin",
"title": "«Vers la flamme» op. 72"
},
{
"composer": "György Ligeti",
"title": "Etüde Nr. 6 «Automne à Varsovie»"
},
{
"composer": "Sergej Prokofieff",
"title": "Toccata d-Moll, op. 11"
},
{
"composer": "György Ligeti",
"title": "Etüde Nr. 13 «L'escalier du diable»"
},
{
"composer": "Sergej Prokofieff",
"title": "«Suggestion diabolique» op. 4/4"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sonate Nr. 14 cis-Moll, op. 27/2 «Mondschein»",
"composerId": "beethoven"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179109/",
"sourceUrl": "https://www.musikkollegium.ch/programm/mondscheinsonate-27-04-18-9446",
"source": "musikkollegium"
},
{
"id": "real-zko-19924",
"title": "ZKO on Tour — LAC Lugano Arte e Cultura - Julia Hagen",
"series": "ZKO on Tour",
"start": "2027-04-18T17:00:00+02:00",
"durationMin": 105,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Cello",
"name": "Julia Hagen"
},
{
"role": "Violin & direction",
"name": "Pablo Hernán Benedí"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Joseph Bologne",
"title": "Ouvertüre, aus: L’amant anonyme"
},
{
"composer": "Joseph Haydn",
"title": "Konzert für Violoncello und Orchester Nr. 1 C-Dur, Hob. VIIb:1",
"composerId": "haydn"
},
{
"composer": "Ludwig van Beethoven",
"title": "Streichquartett Nr. 16 F-Dur, op. 135 (Fassung für Streichorchester)",
"composerId": "beethoven"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/seatmap?eventId=11657",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19924",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199803",
"title": "Balanas & Peltokoski",
"series": "Philharmonische Konzerte",
"start": "2027-04-18T19:30:00+02:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15429&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/5-philharmonisches-konzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-16-20270419",
"title": "Passons aux Salons #16",
"series": "Passons aux Salons",
"start": "2027-04-19T12:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215282&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-16",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200326",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2027-04-20T19:00:00+02:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Tamino",
"name": "Johan Krogius"
},
{
"role": "Sarastro",
"name": "Brent Michael Smith"
},
{
"role": "Pamina",
"name": "Kathrin Zukowski"
},
{
"role": "Königin der Nacht",
"name": "Alina Wunderlin"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Evan Gray"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15170&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056954",
"title": "Peter Bence Symphonic – Tastenfeuerwerk",
"series": null,
"start": "2027-04-20T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Sinfonietta de Lausanne"
},
{
"role": "Piano",
"name": "Peter Bence"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5642&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/peter-bence-symphonic-tastenfeuerwerk-2056954/tz/",
"source": "tonhalle"
},
{
"id": "real-ocg-amours-interdites-20270420",
"title": "Amours interdites",
"series": "Concert à l'abo",
"start": "2027-04-20T20:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Ensemble",
"name": "Quatuor Tana"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Gabriel Fauré",
"title": "Pelléas et Mélisande, suite symphonique, op. 80"
},
{
"composer": "Raphaël Merlin",
"title": "Eléa, pour quatuor à cordes et orchestre, op. 1 (Création en Suisse et co-commande de l’Orchestre de Chambre de Genève et du Quatuor Tana)"
},
{
"composer": "Juan Arroyo",
"title": "Création, pour quatuor à cordes et orchestre*"
},
{
"composer": "Piotr Ilitch Tchaïkovski",
"title": "Roméo et Juliette, Ouverture-fantaisie, TH 42"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114012",
"sourceUrl": "https://locg.ch/fr/calendrier/amours-interdites",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200273",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-04-21T19:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15217&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9269",
"title": "Kristian Bezuidenhout spielt Mozart",
"series": "Abonnementskonzert",
"start": "2027-04-21T19:30:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Bogdan Božović"
},
{
"role": "Piano",
"name": "Kristian Bezuidenhout"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Klavier und Orchester Nr. 9 Es-Dur, KV 271 «Jenamy»",
"composerId": "mozart"
},
{
"composer": "George Enescu",
"title": "Streichoktett C-Dur, op. 7"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163493/",
"sourceUrl": "https://www.musikkollegium.ch/programm/kristian-bezuidenhout-spielt-mozart-27-04-21-9269",
"source": "musikkollegium"
},
{
"id": "real-musikkollegium-9271",
"title": "Kristian Bezuidenhout spielt Mozart",
"series": "Abonnementskonzert",
"start": "2027-04-22T19:30:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Bogdan Božović"
},
{
"role": "Piano",
"name": "Kristian Bezuidenhout"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Klavier und Orchester Nr. 9 Es-Dur, KV 271 «Jenamy»",
"composerId": "mozart"
},
{
"composer": "George Enescu",
"title": "Streichoktett C-Dur, op. 7"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163494/",
"sourceUrl": "https://www.musikkollegium.ch/programm/kristian-bezuidenhout-spielt-mozart-27-04-22-9271",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200295",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-04-22T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15501&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-osi-175716446477733",
"title": "Bomsori",
"series": "OSI al LAC",
"start": "2027-04-22T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Duncan Ward"
},
{
"role": "Violin",
"name": "Bomsori"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Genoveva ouverture in do minore",
"composerId": "schumann"
},
{
"composer": "Felix Mendelssohn",
"title": "Concerto per violino e orchestra in mi minore op. 64",
"composerId": "mendelssohn"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonia n. 2 in re maggiore op. 43",
"composerId": "sibelius"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11766",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-04-22-20-00",
"source": "osi"
},
{
"id": "real-osr-ballet-russe-20270422",
"title": "Ballet russe",
"series": "Série Lausanne",
"start": "2027-04-22T20:15:00+02:00",
"durationMin": 135,
"cityId": "lausanne",
"venueName": "Théâtre de Beaulieu",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Cello",
"name": "Michiaki Ueno"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Hector Berlioz",
"title": "Carnaval romain, ouverture caractéristique op. 9"
},
{
"composer": "Antonín Dvorák",
"title": "Concerto pour violoncelle et orchestre en si mineur op. 104",
"composerId": "dvorak"
},
{
"composer": "Piotr Ilyitch Tchaïkovski",
"title": "Le Lac des cygnes, suite (assemblée par Tugan Sokhiev)"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ballet-russe",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ballet-russe",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200327",
"title": "Die Zauberflöte",
"series": "Hauptbühne",
"start": "2027-04-23T19:00:00+02:00",
"durationMin": 190,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Erina Yashima"
},
{
"role": "Tamino",
"name": "Johan Krogius"
},
{
"role": "Sarastro",
"name": "Brent Michael Smith"
},
{
"role": "Pamina",
"name": "Kathrin Zukowski"
},
{
"role": "Königin der Nacht",
"name": "Alina Wunderlin"
},
{
"role": "Papageno",
"name": "Yannick Debus"
},
{
"role": "Papagena",
"name": "Mariam Suleiman"
},
{
"role": "Erste Dame",
"name": "Hannah McKay"
},
{
"role": "Zweite Dame",
"name": "Karima El Demerdasch"
},
{
"role": "Dritte Dame",
"name": "Dominika Stefańska"
},
{
"role": "Monostatos",
"name": "Nathan Haller"
},
{
"role": "Sprecher",
"name": "Evan Gray"
},
{
"role": "Zweiter Priester",
"name": "Salvador Villanueva"
},
{
"role": "Erster Geharnischter",
"name": "Rafael Rojas"
},
{
"role": "Zweiter Geharnischter",
"name": "Theodore McAlindon"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choir",
"name": "Chor der Oper Zürich"
},
{
"role": "Director",
"name": "Daniele Finzi Pasca"
},
{
"role": "Choreographer",
"name": "Maria Bonzanigo"
}
],
"program": [
{
"workId": "mozart-magic-flute",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15171&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/die-zauberfloete-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-ballet-russe-20270423",
"title": "Ballet russe",
"series": "Série R",
"start": "2027-04-23T19:30:00+02:00",
"durationMin": 135,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Cello",
"name": "Michiaki Ueno"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Hector Berlioz",
"title": "Carnaval romain, ouverture caractéristique op. 9"
},
{
"composer": "Antonín Dvorák",
"title": "Concerto pour violoncelle et orchestre en si mineur op. 104",
"composerId": "dvorak"
},
{
"composer": "Piotr Ilyitch Tchaïkovski",
"title": "Le Lac des cygnes, suite (assemblée par Tugan Sokhiev)"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ballet-russe",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/ballet-russe",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200296",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-04-23T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15502&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200274",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-04-24T19:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15218&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200297",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-04-24T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15503&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19690",
"title": "Kammermusik@ZKO — London Calling",
"series": "Kammermusik@ZKO",
"start": "2027-04-25T11:00:00+02:00",
"durationMin": 60,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Jana Karsko"
},
{
"role": "Violin",
"name": "Kio Seiler"
},
{
"role": "Cello",
"name": "Nicola Mosca"
},
{
"role": "Theorbo",
"name": "Emanuele Forni"
},
{
"role": "Harpsichord",
"name": "Sebastian Wienand"
}
],
"program": [
{
"composer": "Francesco Saverio Geminiani",
"title": "Auld Bob Morrice, aus: A Treatise of Good Taste in the Art of Musick"
},
{
"composer": "Georg Friedrich Händel",
"title": "III. Passacaille, aus: Triosonate G-Dur, HWV 399",
"composerId": "handel"
},
{
"composer": "Francesco Barsanti",
"title": "Logan Water, aus: A Collection of Old Scots Tunes"
},
{
"composer": "Francesco Saverio Geminiani",
"title": "Sonate für Violoncello und Basso continuo a-Moll, H.108"
},
{
"composer": "James Oswald",
"title": "«Sae merry as we twa ha’e been», aus: A Collection of the Best Old Scotch and English Songs"
},
{
"composer": "Felice Giardini",
"title": "Duett für zwei Violinen, op. 2/6"
},
{
"composer": "Johann Christian Bach",
"title": "Konzert für Cembalo und Orchester D-Dur, 1/6, W.C54",
"composerId": "bach"
},
{
"composer": "Georg Friedrich Händel",
"title": "Hornpipe D-Dur, HWV 356",
"composerId": "handel"
},
{
"composer": "James Oswald",
"title": "The Braes of Balandine, aus: A Collection of 43 Scots Tunes with Variations"
},
{
"composer": "Giuseppe Sammartini",
"title": "Triosonate g-Moll, op. 3/5"
},
{
"composer": "Francesco Saverio Geminiani",
"title": "Triosonate F-Dur, The Last Time I Came O’er the Moor, aus: A Treatise of Good Taste in the Art of Musick"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1977",
"sourceUrl": "https://zko.ch/events/kammermusikzko-london-calling/",
"source": "zko"
},
{
"id": "real-tonhalle-2055857",
"title": "Kammermusik-Matinee",
"series": null,
"start": "2027-04-25T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Peter McGuire"
},
{
"role": "Violin",
"name": "Elisabeth Harringer-Pignat"
},
{
"role": "Viola",
"name": "Antonia Siegers-Reid"
},
{
"role": "Cello",
"name": "Sandro Meszaros"
},
{
"role": "Cello",
"name": "Christian Proske"
}
],
"program": [
{
"composer": "Janáček",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5620&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-matinee-2055857/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-60750717-20270425",
"title": "Caravan",
"series": "Concert du dimanche",
"start": "2027-04-25T17:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
}
],
"program": [
{
"workId": "debussy-la-mer",
"composerId": "debussy"
},
{
"composer": "Duke Ellington",
"title": "Caravan"
},
{
"composer": "Duke Ellington",
"title": "Take the “A” train"
},
{
"composer": "Antonio Carlos Jobim",
"title": "Wave"
},
{
"composer": "Brad Mehldau",
"title": "Madrid"
},
{
"composer": "Michel Petrucciani",
"title": "Looking up"
},
{
"composer": "Dizzy Gillespie",
"title": "Night in Tunisia"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/api/1/redirect/product?id=10229292489263",
"sourceUrl": "https://openagenda.com/victoria-hall/events/60750717_caravan",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055853",
"title": "Konzertchor Harmonie Zürich",
"series": null,
"start": "2027-04-25T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Peter Kennel"
},
{
"role": "Soprano",
"name": "Chelsea Zurflüh"
},
{
"role": "Organ",
"name": "Martin Heini"
},
{
"role": "Choir",
"name": "Konzertchor Harmonie Zürich"
}
],
"program": [
{
"composer": "Poulenc",
"title": ""
},
{
"composer": "Rutter",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5662&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/konzertchor-harmonie-2055853/",
"source": "tonhalle"
},
{
"id": "real-opera_lausanne-pelleas-et-melisande-20270425-1700",
"title": "Pelléas et Mélisande",
"series": null,
"start": "2027-04-25T17:00:00+02:00",
"durationMin": 195,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Laurent Campellone"
},
{
"role": "Stage director",
"name": "Emmanuelle Bastet"
},
{
"role": "Pelléas",
"name": "Jonathan McGovern"
},
{
"role": "Mélisande",
"name": "Tamara Bounazou"
},
{
"role": "Golaud",
"name": "Damien Pass"
},
{
"role": "Arkel",
"name": "Patrick Bolleire"
},
{
"role": "Geneviève",
"name": "Marie-Laure Garnier"
},
{
"role": "Yniold",
"name": "Brenda Poupard"
},
{
"role": "Le Docteur",
"name": "Olivier Gourdy"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Guillaume Rault"
}
],
"program": [
{
"composer": "Claude Debussy",
"title": "Pelléas et Mélisande",
"composerId": "debussy"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098115",
"sourceUrl": "https://www.opera-lausanne.ch/show/pelleas-et-melisande/",
"source": "opera_lausanne"
},
{
"id": "real-cnz-146",
"title": "Voltaire-Konzert N° 9: Aregnaz Martirosyan im Gespräch",
"series": null,
"start": "2027-04-25T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Cabaret Voltaire",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Rahel Cunz"
},
{
"role": "Piano",
"name": "Stefan Wirth"
}
],
"program": [
{
"composer": "Aregnaz Martirosyan",
"title": "Neues Werk, für Violine und Klavier (2027, Uraufführung)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179956",
"sourceUrl": "https://cnz.ch/voltaire-9",
"source": "cnz"
},
{
"id": "real-opernhaus_zurich-199957",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-04-25T18:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15357&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200261",
"title": "3. La Scintilla Konzert",
"series": "La Scintilla",
"start": "2027-04-26T19:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15467&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/scintilla-konzert-3/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2056964",
"title": "Junge Klänge, Grosse Meister",
"series": null,
"start": "2027-04-26T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Empyrean Orchestra"
},
{
"role": "Choir",
"name": "CoroVivo"
},
{
"role": "Performer",
"name": "SwissMusiKids"
},
{
"role": "Ensemble",
"name": "Empyrean Academy"
},
{
"role": "Conductor",
"name": "Kevin Griffiths"
},
{
"role": "Cello",
"name": "Emilie Richter"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
},
{
"composer": "Vivaldi",
"title": "",
"composerId": "vivaldi"
},
{
"composer": "Haydn",
"title": "",
"composerId": "haydn"
},
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Händel",
"title": "",
"composerId": "handel"
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5741&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/junge-klaenge-grosse-meister-2056964/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199958",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-04-27T19:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15358&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-pelleas-et-melisande-20270427-1900",
"title": "Pelléas et Mélisande",
"series": null,
"start": "2027-04-27T19:00:00+02:00",
"durationMin": 195,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Laurent Campellone"
},
{
"role": "Stage director",
"name": "Emmanuelle Bastet"
},
{
"role": "Pelléas",
"name": "Jonathan McGovern"
},
{
"role": "Mélisande",
"name": "Tamara Bounazou"
},
{
"role": "Golaud",
"name": "Damien Pass"
},
{
"role": "Arkel",
"name": "Patrick Bolleire"
},
{
"role": "Geneviève",
"name": "Marie-Laure Garnier"
},
{
"role": "Yniold",
"name": "Brenda Poupard"
},
{
"role": "Le Docteur",
"name": "Olivier Gourdy"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Guillaume Rault"
}
],
"program": [
{
"composer": "Claude Debussy",
"title": "Pelléas et Mélisande",
"composerId": "debussy"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098115",
"sourceUrl": "https://www.opera-lausanne.ch/show/pelleas-et-melisande/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-200298",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-04-27T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15504&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-rachmaninoff-20270428",
"title": "100% Rachmaninoff",
"series": "Série O",
"start": "2027-04-28T19:30:00+02:00",
"durationMin": 130,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Piano",
"name": "Yefim Bronfman"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Sergeï Rachmaninoff",
"title": "Concerto pour piano et orchestre N° 3 en ré mineur op. 30",
"composerId": "rachmaninoff"
},
{
"composer": "Sergeï Rachmaninoff",
"title": "Symphonie N° 2 en mi mineur op. 27",
"composerId": "rachmaninoff"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"source": "osr"
},
{
"id": "real-osr-rachmaninoff-20270429",
"title": "100% Rachmaninoff",
"series": "Série S",
"start": "2027-04-29T19:30:00+02:00",
"durationMin": 130,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Piano",
"name": "Yefim Bronfman"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Sergeï Rachmaninoff",
"title": "Concerto pour piano et orchestre N° 3 en ré mineur op. 30",
"composerId": "rachmaninoff"
},
{
"composer": "Sergeï Rachmaninoff",
"title": "Symphonie N° 2 en mi mineur op. 27",
"composerId": "rachmaninoff"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"source": "osr"
},
{
"id": "real-tonhalle-2056967",
"title": "14. Orchesterkooperation der Zürcher Hochschule der Künste und der Haute école de musique de Genève",
"series": null,
"start": "2027-04-29T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchester der Zürcher Hochschule der Künste (ZHdK)"
},
{
"role": "Orchestra",
"name": "Orchestre de la Haute école de musique de Genève"
},
{
"role": "Conductor",
"name": "Mario Venzago"
}
],
"program": [
{
"composer": "Schoeck",
"title": ""
},
{
"composer": "Suk",
"title": ""
}
],
"ticketUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/14-orchesterkooperation-der-zuercher-hochschule-der-kuenste-und-der-haute-ecole-de-musique-de-geneve-2056967/",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/14-orchesterkooperation-der-zuercher-hochschule-der-kuenste-und-der-haute-ecole-de-musique-de-geneve-2056967/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199959",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-04-29T19:30:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15359&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-rachmaninoff-20270430",
"title": "100% Rachmaninoff",
"series": null,
"start": "2027-04-30T19:30:00+02:00",
"durationMin": 130,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Tugan Sokhiev"
},
{
"role": "Piano",
"name": "Yefim Bronfman"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Sergeï Rachmaninoff",
"title": "Concerto pour piano et orchestre N° 3 en ré mineur op. 30",
"composerId": "rachmaninoff"
},
{
"composer": "Sergeï Rachmaninoff",
"title": "Symphonie N° 2 en mi mineur op. 27",
"composerId": "rachmaninoff"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/rachmaninoff",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-200299",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-04-30T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15505&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-pelleas-et-melisande-20270430-2000",
"title": "Pelléas et Mélisande",
"series": null,
"start": "2027-04-30T20:00:00+02:00",
"durationMin": 195,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Laurent Campellone"
},
{
"role": "Stage director",
"name": "Emmanuelle Bastet"
},
{
"role": "Pelléas",
"name": "Jonathan McGovern"
},
{
"role": "Mélisande",
"name": "Tamara Bounazou"
},
{
"role": "Golaud",
"name": "Damien Pass"
},
{
"role": "Arkel",
"name": "Patrick Bolleire"
},
{
"role": "Geneviève",
"name": "Marie-Laure Garnier"
},
{
"role": "Yniold",
"name": "Brenda Poupard"
},
{
"role": "Le Docteur",
"name": "Olivier Gourdy"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Guillaume Rault"
}
],
"program": [
{
"composer": "Claude Debussy",
"title": "Pelléas et Mélisande",
"composerId": "debussy"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098115",
"sourceUrl": "https://www.opera-lausanne.ch/show/pelleas-et-melisande/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-199960",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-02T13:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15360&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-pelleas-et-melisande-20270502-1500",
"title": "Pelléas et Mélisande",
"series": null,
"start": "2027-05-02T15:00:00+02:00",
"durationMin": 195,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Laurent Campellone"
},
{
"role": "Stage director",
"name": "Emmanuelle Bastet"
},
{
"role": "Pelléas",
"name": "Jonathan McGovern"
},
{
"role": "Mélisande",
"name": "Tamara Bounazou"
},
{
"role": "Golaud",
"name": "Damien Pass"
},
{
"role": "Arkel",
"name": "Patrick Bolleire"
},
{
"role": "Geneviève",
"name": "Marie-Laure Garnier"
},
{
"role": "Yniold",
"name": "Brenda Poupard"
},
{
"role": "Le Docteur",
"name": "Olivier Gourdy"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Guillaume Rault"
}
],
"program": [
{
"composer": "Claude Debussy",
"title": "Pelléas et Mélisande",
"composerId": "debussy"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098115",
"sourceUrl": "https://www.opera-lausanne.ch/show/pelleas-et-melisande/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-199995",
"title": "Le nozze di Figaro",
"series": "Hauptbühne",
"start": "2027-05-02T19:30:00+02:00",
"durationMin": 205,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15228&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/le-nozze-di-figaro/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200300",
"title": "Werckmeister Harmonien",
"series": null,
"start": "2027-05-02T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "Opernhaus im Quartier",
"type": "mixed",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15506&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/werckmeister-harmonien/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-17-20270503",
"title": "Passons aux Salons #17",
"series": "Passons aux Salons",
"start": "2027-05-03T12:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215283&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-17",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-200195",
"title": "Requiem pour Ophélie",
"series": "Hauptbühne",
"start": "2027-05-04T19:00:00+02:00",
"durationMin": 100,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15301&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/requiem-pour-ophelie/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2063421",
"title": "Emmanuel Pahud & Nelson Goerner",
"series": null,
"start": "2027-05-04T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Emmanuel Pahud"
},
{
"role": "Piano",
"name": "Nelson Goerner"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Prokofjew",
"title": ""
},
{
"composer": "Schumann",
"title": "",
"composerId": "schumann"
},
{
"composer": "Strauss",
"title": ""
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/emmanuel-pahud-nelson-goerner-2063421/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/emmanuel-pahud-nelson-goerner-2063421/tz/",
"source": "tonhalle"
},
{
"id": "real-ocg-conversations-viennoises-20270504",
"title": "Conversations viennoises",
"series": "Concert à l'abo",
"start": "2027-05-04T20:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor & Bassoon",
"name": "Sophie Dervaux"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concerto pour basson, KV 191",
"composerId": "mozart"
},
{
"composer": "Joseph Haydn",
"title": "Symphonie n° 104 « Londres »",
"composerId": "haydn"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114013",
"sourceUrl": "https://locg.ch/fr/calendrier/conversations-viennoises",
"source": "ocg"
},
{
"id": "real-tonhalle-2056979",
"title": "Orchestre de Paris – Gautier Capuçon spielt Max Richter",
"series": null,
"start": "2027-05-05T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestre de Paris"
},
{
"role": "Conductor",
"name": "Andrés Orozco-Estrada"
},
{
"role": "Cello",
"name": "Gautier Capuçon"
}
],
"program": [
{
"composer": "Richter",
"title": ""
},
{
"composer": "Tschaikowsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5644&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/orchestre-de-paris-gautier-capucon-spielt-max-richter-2056979/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199996",
"title": "Le nozze di Figaro",
"series": "Hauptbühne",
"start": "2027-05-06T13:00:00+02:00",
"durationMin": 205,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15229&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/le-nozze-di-figaro/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055860",
"title": "Kosmos Kammermusik: Belcea Quartet",
"series": "Kosmos Kammermusik",
"start": "2027-05-06T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Belcea Quartet"
},
{
"role": "Violin",
"name": "Corina Belcea"
},
{
"role": "Cello",
"name": "Antoine Lederlin"
},
{
"role": "Viola",
"name": "Krzysztof Chorzelski"
},
{
"role": "Violin",
"name": "Suyeon Kang"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5664&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-belcea-quartet-2055860/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199961",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-06T20:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15361&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9463",
"title": "Angels in America",
"series": "Oper",
"start": "2027-05-07T19:00:00+02:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Ensemble",
"name": "Internationales Opernstudio IOS"
},
{
"role": "Conductor",
"name": "Oscar Jockel"
},
{
"role": "Director",
"name": "Angela Denoke"
}
],
"program": [
{
"composer": "Péter Eötvös",
"title": "Angels in America"
}
],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3246",
"sourceUrl": "https://www.musikkollegium.ch/programm/angelsamerica-27-05-07-9463",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200196",
"title": "Requiem pour Ophélie",
"series": "Hauptbühne",
"start": "2027-05-07T19:00:00+02:00",
"durationMin": 100,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15302&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/requiem-pour-ophelie/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055863",
"title": "Kosmos Kammermusik: Quatuor Ébène",
"series": "Kosmos Kammermusik",
"start": "2027-05-07T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Quatuor Ébène"
},
{
"role": "Violin",
"name": "Pierre Colombet"
},
{
"role": "Violin",
"name": "Gabriel Le Magadure"
},
{
"role": "Viola",
"name": "Marie Chilemme"
},
{
"role": "Cello",
"name": "Yuya Okamoto"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5665&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-quatuor-ebene-2055863/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2055864",
"title": "Kosmos Kammermusik: Belcea Quartet",
"series": "Kosmos Kammermusik",
"start": "2027-05-08T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Belcea Quartet"
},
{
"role": "Violin",
"name": "Corina Belcea"
},
{
"role": "Cello",
"name": "Antoine Lederlin"
},
{
"role": "Viola",
"name": "Krzysztof Chorzelski"
},
{
"role": "Violin",
"name": "Suyeon Kang"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5666&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-belcea-quartet-2055864/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2055865",
"title": "Kosmos Kammermusik: Quatuor Ébène",
"series": "Kosmos Kammermusik",
"start": "2027-05-08T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Quatuor Ébène"
},
{
"role": "Violin",
"name": "Pierre Colombet"
},
{
"role": "Violin",
"name": "Gabriel Le Magadure"
},
{
"role": "Viola",
"name": "Marie Chilemme"
},
{
"role": "Cello",
"name": "Yuya Okamoto"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5667&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-quatuor-ebene-2055865/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199997",
"title": "Le nozze di Figaro",
"series": "Hauptbühne",
"start": "2027-05-08T19:00:00+02:00",
"durationMin": 205,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15230&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/le-nozze-di-figaro/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200040",
"title": "8. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-05-09T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15452&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-8/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19949",
"title": "KAMMERMUSIK-MATINÉE 7",
"series": "Kammermusik",
"start": "2027-05-09T11:15:00+02:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Lisa Schatzman"
},
{
"role": "Viola",
"name": "José Batista"
},
{
"role": "Cello",
"name": "Samuel Niederhauser"
},
{
"role": "Double bass",
"name": "Randy Barboza"
},
{
"role": "Clarinet",
"name": "Stojan Krkuleski"
},
{
"role": "Bassoon",
"name": "Barış Önel"
},
{
"role": "Horn",
"name": "Florian Abächerli"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Till Eulenspiegels lustige Streiche, op. 28 (arrangiert für Violine, Kontrabass, Klarinette, Fagott und Horn)",
"composerId": "richard-strauss"
},
{
"composer": "Anton Webern",
"title": "Streichtrio, op. 20"
},
{
"composer": "Ludwig van Beethoven",
"title": "Septett in Es-Dur, op. 20",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-7-njiohq",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-7-5/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055866",
"title": "Kosmos Kammermusik: Belcea Quartet",
"series": "Kosmos Kammermusik",
"start": "2027-05-09T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Belcea Quartet"
},
{
"role": "Violin",
"name": "Corina Belcea"
},
{
"role": "Cello",
"name": "Antoine Lederlin"
},
{
"role": "Viola",
"name": "Krzysztof Chorzelski"
},
{
"role": "Violin",
"name": "Suyeon Kang"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5668&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-belcea-quartet-2055866/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200197",
"title": "Requiem pour Ophélie",
"series": "Hauptbühne",
"start": "2027-05-09T14:00:00+02:00",
"durationMin": 100,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15303&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/requiem-pour-ophelie/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9464",
"title": "Angels in America",
"series": "Oper",
"start": "2027-05-09T14:30:00+02:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Ensemble",
"name": "Internationales Opernstudio IOS"
},
{
"role": "Conductor",
"name": "Oscar Jockel"
},
{
"role": "Director",
"name": "Angela Denoke"
}
],
"program": [
{
"composer": "Péter Eötvös",
"title": "Angels in America"
}
],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3247",
"sourceUrl": "https://www.musikkollegium.ch/programm/angelsamerica-27-05-09-9464",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055867",
"title": "Kosmos Kammermusik: Quatuor Ébène",
"series": "Kosmos Kammermusik",
"start": "2027-05-09T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Quatuor Ébène"
},
{
"role": "Violin",
"name": "Pierre Colombet"
},
{
"role": "Violin",
"name": "Gabriel Le Magadure"
},
{
"role": "Viola",
"name": "Marie Chilemme"
},
{
"role": "Cello",
"name": "Yuya Okamoto"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5614&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kosmos-kammermusik-quatuor-ebene-2055867/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199962",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-09T19:30:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15362&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-passons-aux-salons-18-20270510",
"title": "Passons aux Salons #18",
"series": "Passons aux Salons",
"start": "2027-05-10T12:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "Les Salons",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://billetterie.locg.ch/selection/event/seat?perfId=10229796215284&productId=10229790114032&lang=fr",
"sourceUrl": "https://locg.ch/fr/calendrier/passons-aux-salons-18",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-209222",
"title": "8. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-05-10T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15453&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-8/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-daphnis-chloe-20270512",
"title": "Daphnis et Chloé",
"series": "Série R",
"start": "2027-05-12T19:30:00+02:00",
"durationMin": 110,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alan Gilbert"
},
{
"role": "Piano",
"name": "Beatrice Rana"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "D’un soir triste, pour orchestre"
},
{
"composer": "Robert Schumann",
"title": "Concerto pour piano et orchestre en la mineur op. 54",
"composerId": "schumann"
},
{
"composer": "Claude Debussy",
"title": "Jeux, poème dansé",
"composerId": "debussy"
},
{
"composer": "Maurice Ravel",
"title": "Daphnis et Chloé, suite N° 2",
"composerId": "ravel"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/daphnis-chloe",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/daphnis-chloe",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199963",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-12T19:30:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15363&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-metamorphoses-20270512",
"title": "Métamorphoses",
"series": null,
"start": "2027-05-12T19:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Raphaël Merlin"
},
{
"role": "Violin",
"name": "Pierre Fouchenneret"
},
{
"role": "Viola",
"name": "Élise Vaschalde"
},
{
"role": "Piano",
"name": "Simon Zaoui"
},
{
"role": "Ensemble",
"name": "Solistes de l'OCG"
}
],
"program": [
{
"composer": "Richard Strauss",
"title": "Métamorphoses, (version en septuor), op. 142",
"composerId": "richard-strauss"
},
{
"composer": "Ludwig van Beethoven",
"title": "3e Symphonie, (transcription pour quatuor avec piano de Ferdinand Ries)",
"composerId": "beethoven"
}
],
"ticketUrl": "https://infomaniak.events/fr-ch/shop/4LW9JPCJ1G/events/1619890",
"sourceUrl": "https://locg.ch/fr/calendrier/metamorphoses",
"source": "ocg"
},
{
"id": "real-lso_luzern-19912",
"title": "SCHWEIZER REFERENZEN – WAGNER, BRITTEN & BRAHMS",
"series": "Sinfoniekonzerte",
"start": "2027-05-12T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Violin",
"name": "Vilde Frang"
},
{
"role": "Viola",
"name": "Lawrence Power"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Siegfried-Idyll, W W V 103",
"composerId": "wagner"
},
{
"composer": "Benjamin Britten",
"title": "Doppelkonzert für Violine und Viola in h-Moll"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 in e-Moll, op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/schweizer-referenzen-wagner-britten-brahms-igyanb",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/schweizer-referenzen-wagner-britten-brahms/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-200275",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-05-13T19:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15219&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-daphnis-chloe-20270513",
"title": "Daphnis et Chloé",
"series": "Série S",
"start": "2027-05-13T19:30:00+02:00",
"durationMin": 110,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alan Gilbert"
},
{
"role": "Piano",
"name": "Beatrice Rana"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "D’un soir triste, pour orchestre"
},
{
"composer": "Robert Schumann",
"title": "Concerto pour piano et orchestre en la mineur op. 54",
"composerId": "schumann"
},
{
"composer": "Claude Debussy",
"title": "Jeux, poème dansé",
"composerId": "debussy"
},
{
"composer": "Maurice Ravel",
"title": "Daphnis et Chloé, suite N° 2",
"composerId": "ravel"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/daphnis-chloe",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/daphnis-chloe",
"source": "osr"
},
{
"id": "real-zko-19729",
"title": "Feder und Bogen 3: Heinrich Heine",
"series": null,
"start": "2027-05-13T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Narrator",
"name": "Thomas Douglas"
},
{
"role": "Ensemble",
"name": "Musikerinnen und Musiker des Zürcher Kammerorchesters"
}
],
"program": [],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1974",
"sourceUrl": "https://zko.ch/events/feder-und-bogen-3-heinrich-heine/",
"source": "zko"
},
{
"id": "real-tonhalle-2055874",
"title": "Paavo Järvi & Wayne Marshall",
"series": null,
"start": "2027-05-13T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Organ",
"name": "Wayne Marshall"
},
{
"role": "Soprano",
"name": "Mari Eriksmoen"
},
{
"role": "Mezzo-soprano",
"name": "Catriona Morison"
},
{
"role": "Tenor",
"name": "Sebastian Kohlhepp"
},
{
"role": "Baritone",
"name": "Audun Iversen"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Marshall",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5558&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-wayne-marshall-2055874/",
"source": "tonhalle"
},
{
"id": "real-lso_luzern-19911",
"title": "SCHWEIZER REFERENZEN – WAGNER, BRITTEN & BRAHMS",
"series": "Sinfoniekonzerte",
"start": "2027-05-13T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Diego Ceretta"
},
{
"role": "Violin",
"name": "Vilde Frang"
},
{
"role": "Viola",
"name": "Lawrence Power"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Richard Wagner",
"title": "Siegfried-Idyll, W W V 103",
"composerId": "wagner"
},
{
"composer": "Benjamin Britten",
"title": "Doppelkonzert für Violine und Viola in h-Moll"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 4 in e-Moll, op. 98",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/schweizer-referenzen-wagner-britten-brahms-xv6anm",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/schweizer-referenzen-wagner-britten-brahms-2/",
"source": "lso_luzern"
},
{
"id": "real-musikkollegium-9433",
"title": "Frühlingskonzert",
"series": "Benefizkonzert Allegro",
"start": "2027-05-14T18:30:00+02:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Nils Erik Måseidvåg"
},
{
"role": "Violin",
"name": "Bastian Loewe"
},
{
"role": "Viola",
"name": "Chie Tanaka"
}
],
"program": [
{
"composer": "Caroline Shaw",
"title": "Entr'acte für Streicher"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonia Concertante für Violine, Viola und Orchester Es-Dur, KV 364",
"composerId": "mozart"
},
{
"composer": "Carl Nielsen",
"title": "Sinfonie Nr. 1 g-Moll, op. 7"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/173504/",
"sourceUrl": "https://www.musikkollegium.ch/programm/fruehlingskonzert-27-05-14-9433",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199964",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-14T19:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15364&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055876",
"title": "Paavo Järvi & Wayne Marshall",
"series": null,
"start": "2027-05-14T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Organ",
"name": "Wayne Marshall"
},
{
"role": "Soprano",
"name": "Mari Eriksmoen"
},
{
"role": "Mezzo-soprano",
"name": "Catriona Morison"
},
{
"role": "Tenor",
"name": "Sebastian Kohlhepp"
},
{
"role": "Baritone",
"name": "Audun Iversen"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Marshall",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5564&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-wayne-marshall-2055876/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9265",
"title": "Kücük Prens",
"series": "Freikonzert",
"start": "2027-05-15T15:00:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Johannes Beranek"
},
{
"role": "Narrator",
"name": "Burhan Öçal"
}
],
"program": [
{
"composer": "Stefan Plank",
"title": "Der Kleine Prinz"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/kuecuek-prens-27-05-15-9265",
"sourceUrl": "https://www.musikkollegium.ch/programm/kuecuek-prens-27-05-15-9265",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055873",
"title": "Paavo Järvi & Wayne Marshall",
"series": null,
"start": "2027-05-15T18:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Organ",
"name": "Wayne Marshall"
},
{
"role": "Soprano",
"name": "Mari Eriksmoen"
},
{
"role": "Mezzo-soprano",
"name": "Catriona Morison"
},
{
"role": "Tenor",
"name": "Sebastian Kohlhepp"
},
{
"role": "Baritone",
"name": "Audun Iversen"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Marshall",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5677&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-wayne-marshall-2055873/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199998",
"title": "Le nozze di Figaro",
"series": "Hauptbühne",
"start": "2027-05-15T19:00:00+02:00",
"durationMin": 205,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15231&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/le-nozze-di-figaro/",
"source": "opernhaus_zurich"
},
{
"id": "real-osi-175719205506546",
"title": "Sol Gabetta",
"series": "OSI a Pentecoste",
"start": "2027-05-15T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Giovanni Antonini"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Franz Joseph Haydn",
"title": "Sinfonia n. 44 in mi minore Funebre",
"composerId": "haydn"
},
{
"composer": "Antonín Kraft",
"title": "Concerto per violoncello e orchestra n. 1 in do maggiore"
},
{
"composer": "Franz Joseph Haydn",
"title": "Sinfonia n. 103 in mi bemolle maggiore Col rullo di timpano",
"composerId": "haydn"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11844",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-05-15-20-00",
"source": "osi"
},
{
"id": "real-osi-175719924763850",
"title": "Kristian Bezuidenhout",
"series": "OSI a Pentecoste",
"start": "2027-05-16T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Kristian Bezuidenhout"
},
{
"role": "Piano",
"name": "Kristian Bezuidenhout"
},
{
"role": "Cello",
"name": "Sol Gabetta"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [
{
"composer": "Franz Joseph Haydn",
"title": "Concerto per violoncello e orchestra n. 1 in do maggiore",
"composerId": "haydn"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concerto per pianoforte e orchestra n. 9 in mi bemolle maggiore KV 271 Jeunehomme",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonia n. 36 in do maggiore KV 425 Linz",
"composerId": "mozart"
}
],
"ticketUrl": "https://shop.luganolac.ch/webshop/webticket/shop?event=11845",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-05-16-20-00",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-199965",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-17T14:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15365&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200276",
"title": "Tosca",
"series": "Hauptbühne",
"start": "2027-05-17T20:00:00+02:00",
"durationMin": 155,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-tosca",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15220&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/tosca/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9465",
"title": "Angels in America",
"series": "Oper",
"start": "2027-05-19T19:00:00+02:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Ensemble",
"name": "Internationales Opernstudio IOS"
},
{
"role": "Conductor",
"name": "Oscar Jockel"
},
{
"role": "Director",
"name": "Angela Denoke"
}
],
"program": [
{
"composer": "Péter Eötvös",
"title": "Angels in America"
}
],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3248",
"sourceUrl": "https://www.musikkollegium.ch/programm/angelsamerica-27-05-19-9465",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199999",
"title": "Le nozze di Figaro",
"series": "Hauptbühne",
"start": "2027-05-19T19:00:00+02:00",
"durationMin": 205,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Le nozze di Figaro",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15232&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/le-nozze-di-figaro/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9401",
"title": "Solist:innen der ZHdK",
"series": "Hauskonzert",
"start": "2027-05-20T19:00:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Performer",
"name": "Zwei Solist:innen der Zürcher Hochschule der Künste ZHdK"
},
{
"role": "Conductor",
"name": "Simon Clausse"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ouvertüre h-Moll, op. 26 «Die Hebriden»",
"composerId": "mendelssohn"
},
{
"composer": "",
"title": "Zwei Solokonzerte nach Wahl der Solist:innen"
},
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zum Trauerspiel «Egmont» op. 84",
"composerId": "beethoven"
},
{
"composer": "Pjotr Iljitsch Tschaikowsky",
"title": "Polonaise aus der Oper «Eugen Onegin» op. 42"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161680/",
"sourceUrl": "https://www.musikkollegium.ch/programm/solistinnen-der-zhdk-27-05-20-9401",
"source": "musikkollegium"
},
{
"id": "real-cnz-141",
"title": "Voces",
"series": null,
"start": "2027-05-20T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Brunnenhof, Studio 1",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Collegium Novum Zürich"
}
],
"program": [
{
"composer": "Germán Toro Pérez",
"title": "Rulfo/voces III (2004)"
},
{
"composer": "Oxana Omelchuk",
"title": "Nocturne (2020)"
},
{
"composer": "Zara Ali",
"title": "thermo_doxa (2024)"
},
{
"composer": "Eric Wubbels",
"title": "Neues Werk, für Klavier solo (2027, Uraufführung)"
},
{
"composer": "Joanna Wozny",
"title": "Die Spur der Welle (2023)"
},
{
"composer": "Léo Collin",
"title": "Corals (2019)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179739/",
"sourceUrl": "https://cnz.ch/voces",
"source": "cnz"
},
{
"id": "real-ocg-vents-dest-20270520",
"title": "Vents d'Est",
"series": "Concert à l'abo",
"start": "2027-05-20T20:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "bfm-geneve",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gergely Madaras"
},
{
"role": "Piano",
"name": "Mariam Batsashvili"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "György Ligeti",
"title": "Concert Românesc"
},
{
"composer": "Franz Liszt",
"title": "Totentanz",
"composerId": "liszt"
},
{
"composer": "Charlotte Bray",
"title": "Arc of the Vanishing Star"
},
{
"composer": "Zoltán Kodály",
"title": "Danses de Galánta"
}
],
"ticketUrl": "https://billetterie.locg.ch/selection/event/date?productId=10229790114014",
"sourceUrl": "https://locg.ch/fr/calendrier/vents-dest",
"source": "ocg"
},
{
"id": "real-musikkollegium-9441",
"title": "Summer Music",
"series": "Musik über Mittag",
"start": "2027-05-21T12:15:00+02:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Dimitri Vecchi"
},
{
"role": "Oboe",
"name": "Leonid Surkov"
},
{
"role": "Clarinet",
"name": "Sérgio Fernandes Pires"
},
{
"role": "Horn",
"name": "Jennifer Aynilian Druey"
}
],
"program": [
{
"composer": "Samuel Barber",
"title": "«Summer Music» op. 31 für Bläserquintett"
},
{
"composer": "David Maslanka",
"title": "Bläserquintett Nr. 2"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Walzer Nr. 2 aus der Suite für Varieté-Orchester, arrangiert für Bläserquintett"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/175570/",
"sourceUrl": "https://www.musikkollegium.ch/programm/summer-music-27-05-21-9441",
"source": "musikkollegium"
},
{
"id": "real-musikkollegium-9466",
"title": "Angels in America",
"series": "Oper",
"start": "2027-05-21T19:00:00+02:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Ensemble",
"name": "Internationales Opernstudio IOS"
},
{
"role": "Conductor",
"name": "Oscar Jockel"
},
{
"role": "Director",
"name": "Angela Denoke"
}
],
"program": [
{
"composer": "Péter Eötvös",
"title": "Angels in America"
}
],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3249",
"sourceUrl": "https://www.musikkollegium.ch/programm/angelsamerica-27-05-21-9466",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199966",
"title": "L'elisir d'amore",
"series": "Hauptbühne",
"start": "2027-05-21T19:00:00+02:00",
"durationMin": 160,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "L'elisir d'amore"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15366&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/lelisir-damore/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055890",
"title": "Freundeskreis-Konzert",
"series": null,
"start": "2027-05-21T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Julia Kleiter"
},
{
"role": "Alto",
"name": "Wiebke Lehmkuhl"
},
{
"role": "Tenor",
"name": "Maximilian Schmitt"
},
{
"role": "Bass",
"name": "Christof Fischesser"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/freundeskreis-konzert-2055890/",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/freundeskreis-konzert-2055890/",
"source": "tonhalle"
},
{
"id": "real-osr-harry-potter-cine-concert-20270521",
"title": "Harry Potter à l’École des Sorciers",
"series": null,
"start": "2027-05-21T19:30:00+02:00",
"durationMin": 180,
"cityId": "geneva",
"venueName": "Arena Genève",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Ludwig Wicki"
},
{
"role": "Chorus master",
"name": "Romain Mayor"
},
{
"role": "Choir",
"name": "Le Motet de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "John Williams",
"title": "Harry Potter and the Sorcerer’s Stone™ in Concert"
}
],
"ticketUrl": "https://www.ticketcorner.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/harry-potter-cine-concert",
"source": "osr"
},
{
"id": "real-lso_luzern-19914",
"title": "POÈME DE L’EXTASE – RACHMANINOW 3 & JAMES GAFFIGAN",
"series": "Sinfoniekonzerte",
"start": "2027-05-21T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "James Gaffigan"
},
{
"role": "Piano",
"name": "Kirill Gerstein"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Sergei Rachmaninow",
"title": "Klavierkonzert Nr. 3 in d-Moll, op. 30"
},
{
"composer": "Igor Strawinsky",
"title": "Chant du Rossignol"
},
{
"composer": "Alexander Scriabin",
"title": "Le Poème de l’Extase, op. 54"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/poeme-de-lextase-rachmaninov-3-james-gaffigan-3mll3r",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/poeme-de-lextase-rachmaninow-3-james-gaffigan-2/",
"source": "lso_luzern"
},
{
"id": "real-osr-harry-potter-cine-concert-20270522",
"title": "Harry Potter à l’École des Sorciers",
"series": null,
"start": "2027-05-22T14:00:00+02:00",
"durationMin": 180,
"cityId": "geneva",
"venueName": "Arena Genève",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Ludwig Wicki"
},
{
"role": "Chorus master",
"name": "Romain Mayor"
},
{
"role": "Choir",
"name": "Le Motet de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "John Williams",
"title": "Harry Potter and the Sorcerer’s Stone™ in Concert"
}
],
"ticketUrl": "https://www.ticketcorner.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/harry-potter-cine-concert",
"source": "osr"
},
{
"id": "real-tonhalle-2055892",
"title": "Paavo Järvi mit Beethovens Missa Solemnis",
"series": null,
"start": "2027-05-22T18:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Julia Kleiter"
},
{
"role": "Alto",
"name": "Wiebke Lehmkuhl"
},
{
"role": "Tenor",
"name": "Maximilian Schmitt"
},
{
"role": "Bass",
"name": "Christof Fischesser"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5586&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-beethovens-missa-solemnis-2055892/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199875",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-05-22T19:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15245&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19913",
"title": "POÈME DE L’EXTASE – RACHMANINOW 3 & JAMES GAFFIGAN",
"series": "Sinfoniekonzerte",
"start": "2027-05-22T19:30:00+02:00",
"durationMin": 110,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "James Gaffigan"
},
{
"role": "Piano",
"name": "Kirill Gerstein"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Sergei Rachmaninow",
"title": "Klavierkonzert Nr. 3 in d-Moll, op. 30"
},
{
"composer": "Igor Strawinsky",
"title": "Chant du Rossignol"
},
{
"composer": "Alexander Scriabin",
"title": "Le Poème de l’Extase, op. 54"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/poeme-de-lextase-rachmaninov-3-james-gaffigan-nfbjlw",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/poeme-de-lextase-rachmaninow-3-james-gaffigan/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-200061",
"title": "Kinderopernorcherster",
"series": "Hauptbühne",
"start": "2027-05-23T11:15:00+02:00",
"durationMin": 80,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15508&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055893",
"title": "Paavo Järvi mit Beethovens Missa Solemnis",
"series": null,
"start": "2027-05-23T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Soprano",
"name": "Julia Kleiter"
},
{
"role": "Alto",
"name": "Wiebke Lehmkuhl"
},
{
"role": "Tenor",
"name": "Maximilian Schmitt"
},
{
"role": "Bass",
"name": "Christof Fischesser"
},
{
"role": "Choir",
"name": "Zürcher Sing-Akademie"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5590&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-mit-beethovens-missa-solemnis-2055893/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9467",
"title": "Angels in America",
"series": "Oper",
"start": "2027-05-23T19:00:00+02:00",
"durationMin": 150,
"cityId": "winterthur",
"venueId": "theater-winterthur",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Ensemble",
"name": "Internationales Opernstudio IOS"
},
{
"role": "Conductor",
"name": "Oscar Jockel"
},
{
"role": "Director",
"name": "Angela Denoke"
}
],
"program": [
{
"composer": "Péter Eötvös",
"title": "Angels in America"
}
],
"ticketUrl": "https://tickets.theaterwinterthur.ch/webshop/webticket/seatmap?eventId=3250",
"sourceUrl": "https://www.musikkollegium.ch/programm/angelsamerica-27-05-23-9467",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199940",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-05-23T19:00:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15193&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055900",
"title": "Série jeunes: Intergeese Trió",
"series": "Série jeunes",
"start": "2027-05-24T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Intergeese Trió"
},
{
"role": "Cimbalom",
"name": "Áron Horváth"
},
{
"role": "Double bass",
"name": "Lőrinc Ágoston Mohácsy"
},
{
"role": "Percussion",
"name": "Zoltán Fekete"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5627&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/serie-jeunes-intergeese-trio-2055900/",
"source": "tonhalle"
},
{
"id": "real-zko-19523",
"title": "Claire Huangci & Thomas Dausgaard",
"series": "Abo-Konzerte",
"start": "2027-05-25T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Thomas Dausgaard"
},
{
"role": "Piano",
"name": "Claire Huangci"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonie Nr. 35 D-Dur, Haffner, KV 385",
"composerId": "mozart"
},
{
"composer": "Clara Schumann",
"title": "Konzert für Klavier und Orchester a-Moll, op. 7",
"composerId": "schumann"
},
{
"composer": "Frédéric Chopin",
"title": "Variationen über «La ci darem la mano» für Klavier und Orchester, op. 2",
"composerId": "chopin"
},
{
"composer": "Ludwig van Beethoven",
"title": "Sinfonie Nr. 2 D-Dur, op. 36",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1956",
"sourceUrl": "https://zko.ch/events/claire-huangci-thomas-dausgaard/",
"source": "zko"
},
{
"id": "real-osr-beethoven7-20270526",
"title": "Cycle Beethoven 4",
"series": "Cycle Beethoven",
"start": "2027-05-26T19:30:00+02:00",
"durationMin": 105,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Violin",
"name": "Vilde Frang"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Concerto pour violon et orchestre en ré mineur",
"composerId": "schumann"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 7 en la majeur op. 92",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"source": "osr"
},
{
"id": "real-musikkollegium-9273",
"title": "Jakob Lehmann dirigiert Sibelius",
"series": "Abonnementskonzert",
"start": "2027-05-26T19:30:00+02:00",
"durationMin": 110,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Jakob Lehmann"
},
{
"role": "Viola",
"name": "Jürg Dähler"
}
],
"program": [
{
"composer": "Jean Sibelius",
"title": "Cassazione, op. 6",
"composerId": "sibelius"
},
{
"composer": "Philippe Racine",
"title": "«Cinq visages de la nuit» Musik für Viola und Orchester, Auftragswerk des Musikkollegium Winterthur, Uraufführung"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur, op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163483/",
"sourceUrl": "https://www.musikkollegium.ch/programm/jakob-lehmann-dirigiert-sibelius-27-05-26-9273",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199941",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-05-27T19:00:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15194&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055914",
"title": "Cristian Măcelaru & Julia Fischer",
"series": null,
"start": "2027-05-27T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Cristian Măcelaru"
},
{
"role": "Violin",
"name": "Julia Fischer"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Chatschaturjan",
"title": ""
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5554&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/cristian-macelaru-julia-fischer-2055914/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9275",
"title": "Jakob Lehmann dirigiert Sibelius",
"series": "Abonnementskonzert",
"start": "2027-05-27T19:30:00+02:00",
"durationMin": 110,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Jakob Lehmann"
},
{
"role": "Viola",
"name": "Jürg Dähler"
}
],
"program": [
{
"composer": "Jean Sibelius",
"title": "Cassazione, op. 6",
"composerId": "sibelius"
},
{
"composer": "Philippe Racine",
"title": "«Cinq visages de la nuit» Musik für Viola und Orchester, Auftragswerk des Musikkollegium Winterthur, Uraufführung"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur, op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/163484/",
"sourceUrl": "https://www.musikkollegium.ch/programm/jakob-lehmann-dirigiert-sibelius-27-05-27-9275",
"source": "musikkollegium"
},
{
"id": "real-osr-beethoven7-20270527",
"title": "Cycle Beethoven 4",
"series": "Cycle Beethoven",
"start": "2027-05-27T20:15:00+02:00",
"durationMin": 105,
"cityId": "lausanne",
"venueName": "Théâtre de Beaulieu",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Violin",
"name": "Vilde Frang"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Concerto pour violon et orchestre en ré mineur",
"composerId": "schumann"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 7 en la majeur op. 92",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"source": "osr"
},
{
"id": "real-musikkollegium-9277",
"title": "Meet Jakob Lehmann",
"series": "Feierabend-Konzert",
"start": "2027-05-28T17:30:00+02:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Jakob Lehmann"
},
{
"role": "Host",
"name": "Gabiz Reichert"
}
],
"program": [
{
"composer": "Jean Sibelius",
"title": "Cassazione, op. 6",
"composerId": "sibelius"
},
{
"composer": "Jean Sibelius",
"title": "«Der Schwan von Tuonela» op. 22/2",
"composerId": "sibelius"
},
{
"composer": "Jean Sibelius",
"title": "Sinfonie Nr. 5 Es-Dur, op. 82",
"composerId": "sibelius"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/meet-jakob-lehmann-27-05-28-9277",
"sourceUrl": "https://www.musikkollegium.ch/programm/meet-jakob-lehmann-27-05-28-9277",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-199876",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-05-28T19:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15274&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055916",
"title": "Cristian Măcelaru & Julia Fischer",
"series": null,
"start": "2027-05-28T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Cristian Măcelaru"
},
{
"role": "Violin",
"name": "Julia Fischer"
}
],
"program": [
{
"composer": "Ammann",
"title": ""
},
{
"composer": "Chatschaturjan",
"title": ""
},
{
"composer": "Brahms",
"title": "",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5595&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/cristian-macelaru-julia-fischer-2055916/",
"source": "tonhalle"
},
{
"id": "real-osr-beethoven7-20270528",
"title": "Cycle Beethoven 4",
"series": "Cycle Beethoven",
"start": "2027-05-28T19:30:00+02:00",
"durationMin": 105,
"cityId": "sion",
"venueName": "Noda BCVS",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Daniele Gatti"
},
{
"role": "Violin",
"name": "Vilde Frang"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Robert Schumann",
"title": "Concerto pour violon et orchestre en ré mineur",
"composerId": "schumann"
},
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie N° 7 en la majeur op. 92",
"composerId": "beethoven"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/beethoven7",
"source": "osr"
},
{
"id": "real-geneva_victoria_hall-69945202-20270528",
"title": "Grigory Sokolov",
"series": "Les Grands Interprètes",
"start": "2027-05-28T19:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Grigory Sokolov"
}
],
"program": [],
"ticketUrl": "https://www.grandsinterpretes.ch/event/grigory-sokolov-2027",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/69945202_grigory-sokolov-1714897",
"source": "geneva_victoria_hall"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270528-2000",
"title": "Don Giovanni",
"series": null,
"start": "2027-05-28T20:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-osr-destination-zoopolis-20270529",
"title": "Destination Zoopolis",
"series": "Série en famille",
"start": "2027-05-29T11:00:00+02:00",
"durationMin": 60,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Martyna Szymczak"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Anne-Claire Rey-Bellet",
"title": "Zélie-Chansons animalières"
},
{
"workId": "saint-saens-carnival",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/destination-zoopolis",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/destination-zoopolis",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199805",
"title": "Viotti",
"series": "Philharmonische Konzerte",
"start": "2027-05-29T19:30:00+02:00",
"durationMin": 180,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15430&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/6-philharmonisches-konzert-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-cuivres-en-liberte-20270530",
"title": "Cuivres en liberté",
"series": "Série Musique de chambre",
"start": "2027-05-30T11:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "conservatoire-geneve",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Trombone",
"name": "Alexandre Faure"
},
{
"role": "Trombone",
"name": "Matteo de Luca"
},
{
"role": "Trombone",
"name": "Vincent Métrailler"
},
{
"role": "Trombone",
"name": "Andrea Bandini"
},
{
"role": "Tuba",
"name": "Ross Knight"
}
],
"program": [],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/cuivres-en-liberte",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/cuivres-en-liberte",
"source": "osr"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270530-1700",
"title": "Don Giovanni",
"series": null,
"start": "2027-05-30T17:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-opernhaus_zurich-199942",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-05-30T19:30:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15195&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055932",
"title": "Klavierrezital: Igor Levit",
"series": null,
"start": "2027-05-30T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Igor Levit"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5671&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/klavierrezital-igor-levit-2055932/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-217770",
"title": "Kinderopernorcherster",
"series": "Hauptbühne",
"start": "2027-05-31T10:00:00+02:00",
"durationMin": 80,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200072",
"title": "Liederabend Julie Fuchs",
"series": "Liederabende",
"start": "2027-05-31T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "recital",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15436&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/liederabend-julie-fuchs-2/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055933",
"title": "Klavierrezital: Igor Levit",
"series": null,
"start": "2027-05-31T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Igor Levit"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5672&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/klavierrezital-igor-levit-2055933/",
"source": "tonhalle"
},
{
"id": "real-ocg-requiem-20270601",
"title": "Requiem",
"series": null,
"start": "2027-06-01T18:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Choir",
"name": "Chœur de Pontverre"
},
{
"role": "Conductor",
"name": "Marie-Isabelle Pernoud"
},
{
"role": "Orchestra",
"name": "L'Orchestre de Chambre de Genève"
}
],
"program": [
{
"workId": "mozart-requiem",
"composerId": "mozart"
}
],
"ticketUrl": "https://locg.ch/fr/calendrier/requiem",
"sourceUrl": "https://locg.ch/fr/calendrier/requiem",
"source": "ocg"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270601-1900",
"title": "Don Giovanni",
"series": null,
"start": "2027-06-01T19:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2057000",
"title": "Regula Mühlemann: Rossini, Donizetti & Bellini",
"series": null,
"start": "2027-06-01T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
},
{
"role": "Conductor",
"name": "Yi-Chen Lin"
},
{
"role": "Soprano",
"name": "Regula Mühlemann"
}
],
"program": [
{
"composer": "Rossini",
"title": "",
"composerId": "rossini"
},
{
"composer": "Bellini",
"title": ""
},
{
"composer": "Delibes",
"title": ""
},
{
"composer": "Verdi",
"title": "",
"composerId": "verdi"
},
{
"composer": "Donizetti",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5656&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/regula-muehlemann-rossini-donizetti-bellini-2057000/tz/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9402",
"title": "Concours Géza Anda",
"series": "Hauskonzert",
"start": "2027-06-02T19:00:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Gergely Madaras"
},
{
"role": "Piano",
"name": "Sechs Halbfinalist:innen des Concours Géza Anda"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161873/",
"sourceUrl": "https://www.musikkollegium.ch/programm/concours-geza-anda-27-06-02-9402",
"source": "musikkollegium"
},
{
"id": "real-musikkollegium-9403",
"title": "Concours Géza Anda",
"series": "Hauskonzert",
"start": "2027-06-03T19:00:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Gergely Madaras"
},
{
"role": "Piano",
"name": "Sechs Halbfinalist:innen des Concours Géza Anda"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161874/",
"sourceUrl": "https://www.musikkollegium.ch/programm/concours-geza-anda-27-06-03-9403",
"source": "musikkollegium"
},
{
"id": "real-zko-19692",
"title": "ZKO-Festival — Bachrauschen mit Ksenija Sidorova",
"series": "ZKO-Festival",
"start": "2027-06-03T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Accordion",
"name": "Ksenija Sidorova"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Carl Philipp Emanuel Bach",
"title": "Sinfonie A-Dur, Wq. 182/4",
"composerId": "bach"
},
{
"composer": "Johann Sebastian Bach",
"title": "Konzert für Klavier und Streichorchester Nr. 1 d-Moll, BWV 1052 (Fassung für Akkordeon und Streichorchester)",
"composerId": "bach"
},
{
"composer": "Sergey Akhunov",
"title": "Adagio: Prayer for Peace für Streichorchester"
},
{
"composer": "Sergey Akhunov",
"title": "Chaconne. Konzert für Akkordeon, Streichorchester und Perkussion"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2008",
"sourceUrl": "https://zko.ch/events/zko-festival-bachrauschen/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199943",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-06-04T18:00:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15196&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19696",
"title": "ZKO-Festival — Von Venedig nach Buenos Aires mit Ksenija Sidorova",
"series": "ZKO-Festival",
"start": "2027-06-04T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": null,
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Accordion",
"name": "Ksenija Sidorova"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "Concerto ripieno A-Dur, RV 158",
"composerId": "vivaldi"
},
{
"composer": "Antonio Vivaldi",
"title": "Konzert für Laute und Streichorchester D-Dur, RV 93 (Fassung für Gitarre und Streichorchester)",
"composerId": "vivaldi"
},
{
"composer": "Astor Piazzolla",
"title": "Aconcagua. Konzert für Bandoneon, Streichorchester, Perkussion, Harfe und Klavier"
},
{
"composer": "Astor Piazzolla",
"title": "Escualo für Gitarre und Akkordeon"
},
{
"composer": "Astor Piazzolla",
"title": "Hommage à Liège. Konzert für Gitarre, Bandoneon und Streichorchester"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2009",
"sourceUrl": "https://zko.ch/events/zko-festival-von-venedig-nach-buenos-aires/",
"source": "zko"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270604-2000",
"title": "Don Giovanni",
"series": null,
"start": "2027-06-04T20:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-geneva_victoria_hall-83485959-20270604",
"title": "Gli Angeli Genève – Crépuscules viennois",
"series": null,
"start": "2027-06-04T20:00:00+02:00",
"durationMin": 90,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stephan MacLeod"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie n° 7 en la majeur, op. 92",
"composerId": "beethoven"
},
{
"composer": "Franz Schubert",
"title": "Eine kleine Trauermusik",
"composerId": "schubert"
},
{
"composer": "Franz Schubert",
"title": "Symphonie inachevée en si mineur",
"composerId": "schubert"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229291414927",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/83485959_gli-angeli-geneve-9628798",
"source": "geneva_victoria_hall"
},
{
"id": "real-musikkollegium-9278",
"title": "Click'n Drums",
"series": "Familienkonzert ab 5 Jahren",
"start": "2027-06-05T15:00:00+02:00",
"durationMin": 75,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Quatuor Beat"
},
{
"role": "Percussion",
"name": "Gabriel Benlolo Hervé Trovel Jérôme Guicherd Laurent Fraiche"
}
],
"program": [
{
"composer": "Quatuor Beat",
"title": "Click'n Drums"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/167835/",
"sourceUrl": "https://www.musikkollegium.ch/programm/clickn-drums-27-06-05-9278",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2055941",
"title": "Concours Géza Anda – Schlusskonzert",
"series": null,
"start": "2027-06-05T18:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Mikhail Pletnev"
},
{
"role": "Performer",
"name": "Finalist*innen des Concours Géza Anda"
}
],
"program": [],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5547&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/concours-geza-anda-schlusskonzert-2055941/",
"source": "tonhalle"
},
{
"id": "real-zko-19699",
"title": "ZKO-Festival — Cinema Paradiso mit Ksenija Sidorova",
"series": "ZKO-Festival",
"start": "2027-06-05T19:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Accordion",
"name": "Ksenija Sidorova"
},
{
"role": "Violin & direction",
"name": "Daniel Bard"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Nino Rota",
"title": "Konzert für Streichorchester"
},
{
"composer": "Nino Rota",
"title": "Auszüge aus: La Strada, bearbeitet für Akkordeon und Streichorchester von George Morton"
},
{
"composer": "Nino Rota",
"title": "Auszüge aus: 8½, bearbeitet für Akkordeon und Streichorchester von George Morton"
},
{
"composer": "Luis Bacalov",
"title": "Auszüge aus: Il Postino, bearbeitet für Akkordeon und Streichorchester von George Morton"
},
{
"composer": "Bernard Herrmann",
"title": "Psycho-Suite für Streichorchester"
},
{
"composer": "Erik Satie",
"title": "Gymnopédie Nr. 1, bearbeitet für Akkordeon solo von Ksenija Sidorova"
},
{
"composer": "Yann Tiersen",
"title": "Auszüge aus: Le fabuleux déstin d’Amélie Poulain, bearbeitet für Akkordeon und Streichorchester von George Morton"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Auszüge aus: Suite für Varieté-Orchester, bearbeitet für Akkordeon und Streichorchester von George Morton"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2010",
"sourceUrl": "https://zko.ch/events/zko-festival-cinema-paradiso/",
"source": "zko"
},
{
"id": "real-zko-19703",
"title": "ZKO-Festival — Meisterwerke",
"series": "ZKO-Festival",
"start": "2027-06-06T11:00:00+02:00",
"durationMin": 60,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Anna Tchinaeva"
},
{
"role": "Viola",
"name": "Manuel Nägeli"
},
{
"role": "Cello",
"name": "Anna Tyka Nyffenegger"
},
{
"role": "Piano",
"name": "Dmitri Demjashkin"
}
],
"program": [
{
"composer": "Gustav Mahler",
"title": "Klavierquartett",
"composerId": "mahler"
},
{
"composer": "Johannes Brahms",
"title": "Klavierquartett Nr. 3 c-Moll, op. 60",
"composerId": "brahms"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2011",
"sourceUrl": "https://zko.ch/events/zko-festival-meisterwerke/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-200042",
"title": "9. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-06-06T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15454&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-9/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199877",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-06T14:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15275&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19707",
"title": "ZKO-Festival — Time to Tango mit Ksenija Sidorova",
"series": "ZKO-Festival",
"start": "2027-06-06T14:30:00+02:00",
"durationMin": 90,
"cityId": "zurich",
"venueName": "ZKO-Haus",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Accordion",
"name": "Ksenija Sidorova"
},
{
"role": "Violin",
"name": "Simon Wiener"
},
{
"role": "Violin",
"name": "Silviya Savova-Hartkamp"
},
{
"role": "Viola",
"name": "Frauke Tometten Molino"
},
{
"role": "Cello",
"name": "Guillermo Ortega Santos"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Adagio und Rondo für Glasharfe und Ensemble c-Moll, KV 617",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Allegro moderato, aus: Streichquartett Nr. 23 F-Dur, KV 590",
"composerId": "mozart"
},
{
"composer": "Sergey Akhunov",
"title": "Two Keys to One Brodsky’s Poem"
},
{
"composer": "Franck Angelis",
"title": "Fantasie über das Thema Chiquilín de Bachín von Astor Piazzolla"
},
{
"composer": "Pietro Roffi",
"title": "Nocturne: A Kind of Lullaby of Times We Have Not Yet Lived"
},
{
"composer": "Astor Piazzolla",
"title": "Five Tango Sensations"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=2012",
"sourceUrl": "https://zko.ch/events/zko-festival-time-to-tango/",
"source": "zko"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270606-1500",
"title": "Don Giovanni",
"series": null,
"start": "2027-06-06T15:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-musikkollegium-9447",
"title": "Summer Music",
"series": "Kammermusik Liebestrasse",
"start": "2027-06-06T17:00:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueName": null,
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Dimitri Vecchi"
},
{
"role": "Oboe",
"name": "Leonid Surkov"
},
{
"role": "Clarinet",
"name": "Sérgio Fernandes Pires"
},
{
"role": "Horn",
"name": "Jennifer Aynilian Druey"
}
],
"program": [
{
"composer": "Samuel Barber",
"title": "«Summer Music» op. 31 für Bläserquintett"
},
{
"composer": "David Maslanka",
"title": "Bläserquintett Nr. 2"
},
{
"composer": "Dmitri Schostakowitsch",
"title": "Walzer Nr. 2 aus der Suite für Varieté-Orchester, arrangiert für Bläserquintett"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/179110/",
"sourceUrl": "https://www.musikkollegium.ch/programm/summer-music-27-06-06-9447",
"source": "musikkollegium"
},
{
"id": "real-cnz-147",
"title": "Voltaire-Konzert N° 10: Aline Sarah Müller im Gespräch",
"series": null,
"start": "2027-06-06T17:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Cabaret Voltaire",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Trombone",
"name": "Stephen Menotti"
},
{
"role": "Harp",
"name": "Manon Pierrehumbert"
}
],
"program": [
{
"composer": "Aline Sarah Müller",
"title": "Neues Werk, für Posaune und Harfe"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179954/",
"sourceUrl": "https://cnz.ch/voltaire-10",
"source": "cnz"
},
{
"id": "real-tonhalle-2063777",
"title": "Rolando Villazón & Xavier de Maistre - Serenata Latina",
"series": null,
"start": "2027-06-06T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Tenor",
"name": "Rolando Villazón"
},
{
"role": "Harp",
"name": "Xavier de Maistre"
}
],
"program": [],
"ticketUrl": "https://www.ticketcorner.ch/artist/rolando-villazon/?affiliate=PPN#calendar-start=2027-06",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/rolando-villazon-xavier-de-maistre-serenata-latina-2063777/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199944",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-06-06T20:00:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15197&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-musikkollegium-9281",
"title": "Die vier Jahreszeiten",
"series": "¡Adiós, Roberto!",
"start": "2027-06-07T12:15:00+02:00",
"durationMin": 60,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Violin",
"name": "Roberto González-Monjas"
}
],
"program": [
{
"composer": "Antonio Vivaldi",
"title": "«Le Quattro Stagione» («Die vier Jahreszeiten») Violinkonzerte op. 8/1-4",
"composerId": "vivaldi"
}
],
"ticketUrl": "https://www.musikkollegium.ch/programm/die-vier-jahreszeiten-27-06-07-9281",
"sourceUrl": "https://www.musikkollegium.ch/programm/die-vier-jahreszeiten-27-06-07-9281",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200043",
"title": "9. Kammerkonzert",
"series": "Kammerkonzerte",
"start": "2027-06-07T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15455&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kammerkonzert-9/",
"source": "opernhaus_zurich"
},
{
"id": "real-opera_lausanne-don-giovanni-2-20270608-1900",
"title": "Don Giovanni",
"series": null,
"start": "2027-06-08T19:00:00+02:00",
"durationMin": 200,
"cityId": "lausanne",
"venueId": "opera-de-lausanne",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Corinna Niemeyer"
},
{
"role": "Stage director",
"name": "Andrea Bernard"
},
{
"role": "Don Giovanni",
"name": "Alessandro Luongo"
},
{
"role": "Leporello",
"name": "Ossian Huskinson"
},
{
"role": "Donna Anna",
"name": "Monika Buczkowska-Ward"
},
{
"role": "Donna Elvira",
"name": "Andrea Cueva Molnar"
},
{
"role": "Don Ottavio",
"name": "Trystan Llŷr Griffiths"
},
{
"role": "Zerlina",
"name": "Désirée Giove"
},
{
"role": "Masetto",
"name": "Mattia Venni"
},
{
"role": "Le Commandeur",
"name": "Julien Ségol"
},
{
"role": "Orchestra",
"name": "Orchestre de Chambre de Lausanne"
},
{
"role": "Choir",
"name": "Chœur de l’Opéra de Lausanne"
},
{
"role": "Chorus master",
"name": "Jacopo Facchini"
}
],
"program": [
{
"workId": "mozart-don-giovanni",
"composerId": "mozart"
}
],
"ticketUrl": "https://opl.shop.secutix.com/selection/event/date?productId=10229284098116",
"sourceUrl": "https://www.opera-lausanne.ch/show/don-giovanni-2/",
"source": "opera_lausanne"
},
{
"id": "real-tonhalle-2057012",
"title": "Sophie Branson interpretiert Tschaikowski",
"series": null,
"start": "2027-06-08T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Ensemble Symphonique de Genève"
},
{
"role": "Conductor",
"name": "Sergey Ostrovsky"
},
{
"role": "Violin",
"name": "Sophie Branson"
}
],
"program": [
{
"composer": "Bartók",
"title": "",
"composerId": "bartok"
},
{
"composer": "Tschaikowsky",
"title": ""
},
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5742&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/sophie-branson-interpretiert-tschaikowski-2057012/tz/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9404",
"title": "La nature mit Roberto González-Monjas",
"series": "¡Adiós, Roberto!",
"start": "2027-06-09T19:00:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Host",
"name": "Roberto González-Monjas"
}
],
"program": [],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161625/",
"sourceUrl": "https://www.musikkollegium.ch/programm/la-nature-mit-roberto-gonzalez-monjas-27-06-09-9404",
"source": "musikkollegium"
},
{
"id": "real-tonhalle-2063424",
"title": "Klavierabend Rafal Blechacz",
"series": null,
"start": "2027-06-09T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Rafał Blechacz"
}
],
"program": [
{
"composer": "Bach",
"title": "",
"composerId": "bach"
},
{
"composer": "Chopin",
"title": "",
"composerId": "chopin"
}
],
"ticketUrl": "https://tonhallezuerich.ch/konzerte/kalender/klavierabend-rafal-blechacz-2063424/tz/",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/klavierabend-rafal-blechacz-2063424/tz/",
"source": "tonhalle"
},
{
"id": "real-geneva_victoria_hall-21316789-20270609",
"title": "Gli Angeli Genève – Iphigénie en Tauride",
"series": null,
"start": "2027-06-09T20:00:00+02:00",
"durationMin": 150,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stephan MacLeod"
},
{
"role": "Soprano",
"name": "Tamara Bounazou"
},
{
"role": "Tenor",
"name": "Antonin Rondepierre"
},
{
"role": "Baritone",
"name": "Thomas Dolié"
},
{
"role": "Bass",
"name": "Edwin Fardini"
}
],
"program": [
{
"composer": "Christoph Willibald Gluck",
"title": "Iphigénie en Tauride"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229291414929",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/21316789_gli-angeli-geneve-9021211",
"source": "geneva_victoria_hall"
},
{
"id": "real-tonhalle-2055944",
"title": "Kammermusik-Lunchkonzert",
"series": null,
"start": "2027-06-10T12:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Mezzo-soprano",
"name": "Isabel Pfefferkorn"
},
{
"role": "Violin",
"name": "Andreas Janke"
},
{
"role": "Violin",
"name": "Eliza Wong"
},
{
"role": "Viola",
"name": "Ryszard Groblewski"
},
{
"role": "Viola",
"name": "Héctor Cámara Ruiz"
},
{
"role": "Cello",
"name": "Paul Handschke"
},
{
"role": "Cello",
"name": "Benjamin Nyffenegger"
},
{
"role": "Double bass",
"name": "Wies de Boevé"
}
],
"program": [
{
"composer": "Wagner",
"title": "",
"composerId": "wagner"
},
{
"composer": "Strauss",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5604&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-lunchkonzert-2055944/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199878",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-10T19:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15276&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20408",
"title": "KLANGXCHANGE: KAMMERMUSIK TRIFFT AUF GESPRÄCH 5",
"series": null,
"start": "2027-06-10T19:30:00+02:00",
"durationMin": 120,
"cityId": "lucerne",
"venueName": "Neubad (Pool) Luzern",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/klangxchange-neubad-aoosmm",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/klangxchange-kammermusik-trifft-auf-gespraech-5/",
"source": "lso_luzern"
},
{
"id": "real-buehnen_bern-wahl-verwandtschaft-2027-06-10-1930",
"title": "Wahlverwandtschaft",
"series": "11. Symphoniekonzert",
"start": "2027-06-10T19:30:00+02:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alevtina Ioffe"
},
{
"role": "Piano",
"name": "Alexander Malofeev"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "D’un matin de printemps (1917/18)"
},
{
"composer": "Sergej Prokofjew",
"title": "Konzert für Klavier und Orchester Nr. 3 C-Dur op. 26 (1917–21)"
},
{
"composer": "Sergej Prokofjew",
"title": "Symphonie Nr. 7 cis-Moll op. 131 (1951/52)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2061&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/wahl-verwandtschaft/",
"source": "buehnen_bern"
},
{
"id": "real-opernhaus_zurich-199945",
"title": "Don Pasquale",
"series": "Hauptbühne",
"start": "2027-06-11T19:00:00+02:00",
"durationMin": 145,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Gaetano Donizetti",
"title": "Don Pasquale"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15198&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don-pasquale/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19915",
"title": "HÉLÈNE GRIMAUD – DAS LETZTE TESTAMENT",
"series": "Klavierfestival Le Piano Symphonique",
"start": "2027-06-11T19:30:00+02:00",
"durationMin": 115,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "recital",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Piano",
"name": "Hélène Grimaud"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Klaviersonate Nr. 32 in c-Moll, op. 111",
"composerId": "beethoven"
},
{
"composer": "Franz Schubert",
"title": "Klaviersonate Nr. 21 in B-Dur, D 960",
"composerId": "schubert"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/helene-grimaud-das-letzte-testament-w74nwu",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/helene-grimaud-das-letzte-testament/",
"source": "lso_luzern"
},
{
"id": "real-opernhaus_zurich-200173",
"title": "Konzert Opera Nova",
"series": "Opera Nova",
"start": "2027-06-11T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15457&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/revised-music-for-low-budget-symphony-orchestra/",
"source": "opernhaus_zurich"
},
{
"id": "real-ocg-que-personne-ne-sache-ou-nous-sommes-20270611",
"title": "Que personne ne sache où nous sommes",
"series": null,
"start": "2027-06-11T19:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Silvina Peruglia"
},
{
"role": "Mezzo-soprano",
"name": "Katarina Bradić"
},
{
"role": "Baritone",
"name": "Benjamin Appl"
},
{
"role": "Orchestra",
"name": "L’Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Arnold Schoenberg",
"title": "Verklärte Nacht op. 4"
},
{
"composer": "Gustav Mahler",
"title": "Lieder eines fahrenden Gesellen",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Die stille Stadt (Fünf Lieder - livre 1)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Laue Sommernacht (Fünf Lieder - livre 1)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Licht in der Nacht (Vier Lieder - livre 2)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Waldseligkeit (Vier Lieder -livre 2)",
"composerId": "mahler"
}
],
"ticketUrl": "https://infomaniak.events/fr-ch/shop/4LW9JPCJ1G/event/1620011/",
"sourceUrl": "https://locg.ch/fr/calendrier/que-personne-ne-sache-ou-nous-sommes",
"source": "ocg"
},
{
"id": "real-buehnen_bern-wahl-verwandtschaft-2027-06-11-1930",
"title": "Wahlverwandtschaft",
"series": "11. Symphoniekonzert",
"start": "2027-06-11T19:30:00+02:00",
"durationMin": 105,
"cityId": "bern",
"venueId": "casino-bern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Alevtina Ioffe"
},
{
"role": "Piano",
"name": "Alexander Malofeev"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Lili Boulanger",
"title": "D’un matin de printemps (1917/18)"
},
{
"composer": "Sergej Prokofjew",
"title": "Konzert für Klavier und Orchester Nr. 3 C-Dur op. 26 (1917–21)"
},
{
"composer": "Sergej Prokofjew",
"title": "Symphonie Nr. 7 cis-Moll op. 131 (1951/52)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2210&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/wahl-verwandtschaft/",
"source": "buehnen_bern"
},
{
"id": "real-musikkollegium-9434",
"title": "Kammermusik mit Roberto González-Monjas",
"series": "¡Adiós, Roberto!",
"start": "2027-06-12T19:30:00+02:00",
"durationMin": 105,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Roberto González-Monjas"
},
{
"role": "Violin",
"name": "Rahel Cunz"
},
{
"role": "Violin",
"name": "Bastian Loewe"
},
{
"role": "Violin",
"name": "Francesco Sica"
},
{
"role": "Violin",
"name": "Beata Checko-Zimmermann"
},
{
"role": "Violin",
"name": "Rustem Monasypov"
},
{
"role": "Viola",
"name": "Jürg Dähler"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Viola",
"name": "Giulietta Mariani"
},
{
"role": "Cello",
"name": "Flurin Cuonz"
},
{
"role": "Cello",
"name": "Milena Marena"
},
{
"role": "Cello",
"name": "Anikó Illényi"
},
{
"role": "Double bass",
"name": "Egmont Rath"
},
{
"role": "Double bass",
"name": "Josef Gilgenreiner"
},
{
"role": "Flute",
"name": "Dimitri Vecchi"
},
{
"role": "Flute",
"name": "Nolwenn Bargin"
},
{
"role": "Clarinet",
"name": "Sérgio Fernandes Pires"
},
{
"role": "Clarinet",
"name": "Armon Stecher"
},
{
"role": "Harp",
"name": "Selina Cuonz"
},
{
"role": "Piano",
"name": "Dominic Chamot"
}
],
"program": [
{
"composer": "Maurice Ravel",
"title": "«Introduction et Allegro» für Harfe, Flöte, Klarinette und Streichquartett",
"composerId": "ravel"
},
{
"composer": "Gabriel Fauré",
"title": "Klavierquartett Nr. 1 c-Moll, op. 15"
},
{
"composer": "Paul Dukas",
"title": "«Der Zauberlehrling» arrangiert für Kammerensemble von Ian Farrington"
},
{
"composer": "Tōru Takemitsu",
"title": "«Toward the Sea III» für Altflöte und Harfe"
},
{
"composer": "Olli Mustonen",
"title": "Nonetto II"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161626/",
"sourceUrl": "https://www.musikkollegium.ch/programm/kammermusik-mit-roberto-gonzalez-monjas-27-06-12-9434",
"source": "musikkollegium"
},
{
"id": "real-ocg-que-personne-ne-sache-ou-nous-sommes-20270612",
"title": "Que personne ne sache où nous sommes",
"series": null,
"start": "2027-06-12T19:30:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueName": "La Cité Bleue",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Silvina Peruglia"
},
{
"role": "Mezzo-soprano",
"name": "Katarina Bradić"
},
{
"role": "Baritone",
"name": "Benjamin Appl"
},
{
"role": "Orchestra",
"name": "L’Orchestre de Chambre de Genève"
}
],
"program": [
{
"composer": "Arnold Schoenberg",
"title": "Verklärte Nacht op. 4"
},
{
"composer": "Gustav Mahler",
"title": "Lieder eines fahrenden Gesellen",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Die stille Stadt (Fünf Lieder - livre 1)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Laue Sommernacht (Fünf Lieder - livre 1)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Licht in der Nacht (Vier Lieder - livre 2)",
"composerId": "mahler"
},
{
"composer": "Alma Mahler",
"title": "Waldseligkeit (Vier Lieder -livre 2)",
"composerId": "mahler"
}
],
"ticketUrl": "https://infomaniak.events/fr-ch/shop/4LW9JPCJ1G/event/1620012/",
"sourceUrl": "https://locg.ch/fr/calendrier/que-personne-ne-sache-ou-nous-sommes",
"source": "ocg"
},
{
"id": "real-opernhaus_zurich-199879",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-12T19:30:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15277&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19916",
"title": "UNSER GASTSPIEL IN ENGELBERG",
"series": "Tourneen",
"start": "2027-06-12T19:30:00+02:00",
"durationMin": 95,
"cityId": "engelberg",
"venueName": "Kursaal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Violin",
"name": "Lisa Schatzman"
},
{
"role": "Violin",
"name": "Sarang Seohyun Kim"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Streichersinfonie Nr. 10 in h-Moll, MW V N 10",
"composerId": "mendelssohn"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Concertone für zwei Violinen und Orchester in C-Dur, KV 190 (186e)",
"composerId": "mozart"
},
{
"composer": "Camille Saint-Saëns",
"title": "Introduction et rondo capriccioso in a-Moll, op. 28",
"composerId": "saint-saens"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Serenade Nr. 13 Eine kleine Nachtmusik für Streicher in G-Dur, KV 525",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/gastspiel-in-engelberg-klassikmomente-kopie-auo5tl",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/unser-gastspiel-in-engelberg/",
"source": "lso_luzern"
},
{
"id": "real-osi-205110787275425",
"title": "Io, tu e l'OSI",
"series": "be connected",
"start": "2027-06-12T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Béran"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-12-20-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-12-20-00",
"source": "osi"
},
{
"id": "real-osi-205112234790044",
"title": "Io, tu e l'OSI",
"series": "be connected",
"start": "2027-06-13T11:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueId": "lac-lugano",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Béran"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-13-11-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-13-11-00",
"source": "osi"
},
{
"id": "real-lso_luzern-19951",
"title": "KAMMERMUSIK-MATINÉE 8",
"series": "Kammermusik",
"start": "2027-06-13T11:15:00+02:00",
"durationMin": 120,
"cityId": "kriens",
"venueName": "Orchesterhaus",
"type": "chamber",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/kammermusik-matinee-8-4e0jw5",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/kammermusik-matinee-8-3/",
"source": "lso_luzern"
},
{
"id": "real-geneva_victoria_hall-55434876-20270613",
"title": "Gli Angeli Genève – De l’ombre à la forme",
"series": null,
"start": "2027-06-13T17:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Stephan MacLeod"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Symphonie n° 4 en si bémol majeur, op. 60",
"composerId": "beethoven"
},
{
"composer": "Luciano Berio",
"title": "Rendering"
},
{
"composer": "Joseph Haydn",
"title": "Symphonie n° 49 en fa mineur, «La Passione»",
"composerId": "haydn"
}
],
"ticketUrl": "https://billetterie-culture.geneve.ch/selection/event/date?productId=10229291414930",
"sourceUrl": "https://openagenda.com/victoria-hall-client/events/55434876_gli-angeli-geneve-8044674",
"source": "geneva_victoria_hall"
},
{
"id": "real-opernhaus_zurich-200227",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-13T18:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15381&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199880",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-15T19:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15278&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199852",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-06-16T19:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15222&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-sob-13738",
"title": "Heldenleben",
"series": "Sinfoniekonzert",
"start": "2027-06-16T19:30:00+02:00",
"durationMin": 110,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Saxophone",
"name": "Adrian Tully"
},
{
"role": "Saxophone",
"name": "Alexander Doroshkevich"
},
{
"role": "Saxophone",
"name": "Taewook Ahn"
},
{
"role": "Saxophone",
"name": "Annegret Tully"
},
{
"role": "Ensemble",
"name": "sonic.art"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zu \"Leonore\" (Fidelio) Nr. 3, op. 72b",
"composerId": "beethoven"
},
{
"composer": "Elena Firsowa",
"title": "Konzert für Saxophonquartett und Orchester, op. 206"
},
{
"composer": "Helena Winkelman",
"title": "Bonus Track \"After the Hunt: The Heavens\" (Auftragskomposition / Uraufführung)"
},
{
"composer": "Richard Strauss",
"title": "Ein Heldenleben, op. 40",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078773&productId=10229721147340&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/heldenleben/13738",
"source": "sob"
},
{
"id": "real-lso_luzern-19918",
"title": "JANINE JANSEN & TIMOTHY RIDOUT SPIELEN MOZART",
"series": "Sinfoniekonzerte",
"start": "2027-06-16T19:30:00+02:00",
"durationMin": 105,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Violin",
"name": "Janine Jansen"
},
{
"role": "Viola",
"name": "Timothy Ridout"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonia concertante für Violine und Viola in Es-Dur, KV 364",
"composerId": "mozart"
},
{
"composer": "Frederick Delius",
"title": "«The Walk to the Paradise Garden» aus der Oper A Village Romeo and Juliet"
},
{
"composer": "Sergei Prokofjew",
"title": "Romeo und Julia-Suite in der Fassung von Michael Sanderling, op. 64"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/janine-jansen-timothy-ridout-spielen-mozart-lyhlhd",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/janine-jansen-timothy-ridout-spielen-mozart/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055952",
"title": "Paavo Järvi & Khatia Buniatishvili",
"series": null,
"start": "2027-06-16T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Khatia Buniatishvili"
}
],
"program": [
{
"composer": "Grieg",
"title": "",
"composerId": "grieg"
},
{
"composer": "Tschaikowsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5582&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-khatia-buniatishvili-2055952/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9283",
"title": "¡Adiós, Roberto!",
"series": null,
"start": "2027-06-16T19:30:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Baritone",
"name": "Andrè Schuen"
}
],
"program": [
{
"composer": "Othmar Schoeck",
"title": "«Sommernacht» für Streichorchester, op. 58"
},
{
"composer": "Gustav Mahler",
"title": "Fünf Lieder nach Texten von Friedrich Rückert",
"composerId": "mahler"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 1 c-Moll, op. 68",
"composerId": "brahms"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161619/",
"sourceUrl": "https://www.musikkollegium.ch/programm/adios-roberto-27-06-16-9283",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200228",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-17T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15382&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-sob-12122",
"title": "Heldenleben",
"series": "Sinfoniekonzert",
"start": "2027-06-17T19:30:00+02:00",
"durationMin": 110,
"cityId": "basel",
"venueId": "stadtcasino-basel",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Saxophone",
"name": "Adrian Tully"
},
{
"role": "Saxophone",
"name": "Alexander Doroshkevich"
},
{
"role": "Saxophone",
"name": "Taewook Ahn"
},
{
"role": "Saxophone",
"name": "Annegret Tully"
},
{
"role": "Ensemble",
"name": "sonic.art"
},
{
"role": "Conductor",
"name": "Markus Poschner"
},
{
"role": "Orchestra",
"name": "Sinfonieorchester Basel"
}
],
"program": [
{
"composer": "Ludwig van Beethoven",
"title": "Ouvertüre zu \"Leonore\" (Fidelio) Nr. 3, op. 72b",
"composerId": "beethoven"
},
{
"composer": "Elena Firsowa",
"title": "Konzert für Saxophonquartett und Orchester, op. 206"
},
{
"composer": "Helena Winkelman",
"title": "Bonus Track \"After the Hunt: The Heavens\" (Auftragskomposition / Uraufführung)"
},
{
"composer": "Richard Strauss",
"title": "Ein Heldenleben, op. 40",
"composerId": "richard-strauss"
}
],
"ticketUrl": "https://shop.sinfonieorchesterbasel.ch/selection/event/seat?perfId=10229721078774&productId=10229721147340&lang=de",
"sourceUrl": "https://www.sinfonieorchesterbasel.ch/de/konzerte/heldenleben/12122",
"source": "sob"
},
{
"id": "real-lso_luzern-19917",
"title": "JANINE JANSEN & TIMOTHY RIDOUT SPIELEN MOZART",
"series": "Sinfoniekonzerte",
"start": "2027-06-17T19:30:00+02:00",
"durationMin": 105,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Violin",
"name": "Janine Jansen"
},
{
"role": "Viola",
"name": "Timothy Ridout"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonia concertante für Violine und Viola in Es-Dur, KV 364",
"composerId": "mozart"
},
{
"composer": "Frederick Delius",
"title": "«The Walk to the Paradise Garden» aus der Oper A Village Romeo and Juliet"
},
{
"composer": "Sergei Prokofjew",
"title": "Romeo und Julia-Suite in der Fassung von Michael Sanderling, op. 64"
}
],
"ticketUrl": "https://tickets.sinfonieorchester.ch/checkout/janine-jansen-timothy-ridout-spielen-mozart-qv78nb",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/janine-jansen-timothy-ridout-spielen-mozart-2/",
"source": "lso_luzern"
},
{
"id": "real-tonhalle-2055948",
"title": "Paavo Järvi & Khatia Buniatishvili",
"series": null,
"start": "2027-06-17T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Paavo Järvi"
},
{
"role": "Piano",
"name": "Khatia Buniatishvili"
}
],
"program": [
{
"composer": "Grieg",
"title": "",
"composerId": "grieg"
},
{
"composer": "Tschaikowsky",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5676&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/paavo-jaervi-khatia-buniatishvili-2055948/",
"source": "tonhalle"
},
{
"id": "real-musikkollegium-9285",
"title": "¡Adiós, Roberto!",
"series": null,
"start": "2027-06-17T19:30:00+02:00",
"durationMin": 120,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Musikkollegium Winterthur"
},
{
"role": "Conductor",
"name": "Roberto González-Monjas"
},
{
"role": "Baritone",
"name": "Andrè Schuen"
}
],
"program": [
{
"composer": "Othmar Schoeck",
"title": "«Sommernacht» für Streichorchester, op. 58"
},
{
"composer": "Gustav Mahler",
"title": "Fünf Lieder nach Texten von Friedrich Rückert",
"composerId": "mahler"
},
{
"composer": "Johannes Brahms",
"title": "Sinfonie Nr. 1 c-Moll, op. 68",
"composerId": "brahms"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/161620/",
"sourceUrl": "https://www.musikkollegium.ch/programm/adios-roberto-27-06-17-9285",
"source": "musikkollegium"
},
{
"id": "real-osr-cest-vous-2027-20270618",
"title": "L'OSR c'est vous!",
"series": "Concert gratuit",
"start": "2027-06-18T19:00:00+02:00",
"durationMin": 120,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Philippe Béran"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [],
"ticketUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/osr-cest-vous-2027",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/osr-cest-vous-2027",
"source": "osr"
},
{
"id": "real-opernhaus_zurich-199853",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-06-18T19:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15223&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-osi-205112551726391",
"title": "Guzzo Giovanni",
"series": "OSI in San Biagio",
"start": "2027-06-18T20:00:00+02:00",
"durationMin": 120,
"cityId": null,
"venueName": "Chiesa San Biagio",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Guzzo Giovanni"
},
{
"role": "Violin",
"name": "Guzzo Giovanni"
},
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-18-20-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-18-20-00",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-199836",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2027-06-19T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15292&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200064",
"title": "Kinderopernorcherster",
"series": null,
"start": "2027-06-19T19:00:00+02:00",
"durationMin": 80,
"cityId": "winterthur",
"venueId": "stadthaus-winterthur",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15511&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-20323",
"title": "Das Klassik Open Air auf dem Europaplatz 2027",
"series": "Sinfoniekonzerte",
"start": "2027-06-19T20:00:00+02:00",
"durationMin": 120,
"cityId": "lucerne",
"venueName": "Europaplatz",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Michael Sanderling"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [],
"ticketUrl": "https://sinfonieorchester.ch/de/veranstaltung/das-klassik-open-air-auf-dem-europaplatz-2/",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/das-klassik-open-air-auf-dem-europaplatz-2/",
"source": "lso_luzern"
},
{
"id": "real-musikkollegium-9451",
"title": "Arriaga & Piazzolla",
"series": "Music for a While",
"start": "2027-06-20T14:00:00+02:00",
"durationMin": 75,
"cityId": "winterthur",
"venueName": "Sammlung Oskar Reinhart Am Römerholz",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Nuancen Streichquartett"
},
{
"role": "Violin",
"name": "Beata Checko-Zimmermann"
},
{
"role": "Violin",
"name": "Carolina Mazalesky"
},
{
"role": "Viola",
"name": "Ivona Krapikaite"
},
{
"role": "Cello",
"name": "Seraphina Rufer"
}
],
"program": [
{
"composer": "Juan Crisóstomo de Arriaga",
"title": "Streichquartett Nr. 1 d-Moll"
},
{
"composer": "Astor Piazzolla",
"title": "«Las Cuatro Estaciones Porteñas» (Die vier Jahreszeiten von Buenos Aires) für Streichquartett"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Musikkollegium_Winterthur/shop/event/177769/",
"sourceUrl": "https://www.musikkollegium.ch/programm/arriaga-piazzolla-27-06-20-9451",
"source": "musikkollegium"
},
{
"id": "real-opernhaus_zurich-200229",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-20T14:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15383&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200065",
"title": "Kinderopernorcherster",
"series": null,
"start": "2027-06-20T17:00:00+02:00",
"durationMin": 80,
"cityId": "dietikon",
"venueName": "Stadthalle Dietikon",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15512&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2057020",
"title": "«Mozart pur» mit Alexandra Dovgan",
"series": null,
"start": "2027-06-21T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Kammerorchester Basel"
},
{
"role": "Concertmaster",
"name": "Julia Schröder"
},
{
"role": "Piano",
"name": "Alexandra Dovgan"
}
],
"program": [
{
"composer": "Mozart",
"title": "",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Ftonhallezuerich.ch%2Fhome-tz%2Fkonzerte%2Fkalender%2F&event=5657&language=de",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/mozart-pur-mit-alexandra-dovgan-2057020/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199837",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2027-06-22T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15293&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-lso_luzern-19919",
"title": "SOLISTINNEN- & SOLISTEN-KONZERT DER HOCHSCHULE LUZERN",
"series": "Sinfoniekonzerte",
"start": "2027-06-22T19:30:00+02:00",
"durationMin": 120,
"cityId": "lucerne",
"venueId": "kkl-luzern",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Bar Avni"
},
{
"role": "Violin",
"name": "Kristian Mráček"
},
{
"role": "Violin",
"name": "José Rubio"
},
{
"role": "Violin",
"name": "Nathan Stiefel"
},
{
"role": "Percussion",
"name": "Eleonora Kostina"
},
{
"role": "Orchestra",
"name": "Luzerner Sinfonieorchester"
}
],
"program": [
{
"composer": "Josef Suk",
"title": "Fantasie für Violine und Orchester in g-Moll, op. 24"
},
{
"composer": "Fazıl Say",
"title": "Konzert für Schlagzeug und Orchester, op. 77"
},
{
"composer": "Samuel Barber",
"title": "Konzert für Violine und Orchester"
},
{
"composer": "José White Lafitte",
"title": "Violinkonzert in fis-Moll"
}
],
"ticketUrl": "https://sinfonieorchester.ch/de/veranstaltung/solistinnen-solisten-konzert-der-hochschule-luzern/",
"sourceUrl": "https://sinfonieorchester.ch/de/veranstaltung/solistinnen-solisten-konzert-der-hochschule-luzern/",
"source": "lso_luzern"
},
{
"id": "real-zko-19526",
"title": "Saisonabschluss mit Kristian Bezuidenhout & Daniel Hope",
"series": "Abo-Konzerte",
"start": "2027-06-22T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Music Director",
"name": "Daniel Hope"
},
{
"role": "Piano",
"name": "Kristian Bezuidenhout"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [
{
"composer": "Felix Mendelssohn",
"title": "Sinfonie für Streichorchester Nr. 10 h-Moll, MWV N10",
"composerId": "mendelssohn"
},
{
"composer": "Felix Mendelssohn",
"title": "Konzert für Violine, Klavier und Streichorchester d-Moll, MWV O4",
"composerId": "mendelssohn"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Konzert für Klavier und Orchester Nr. 13 C-Dur, KV 415",
"composerId": "mozart"
},
{
"composer": "Wolfgang Amadeus Mozart",
"title": "Sinfonie Nr. 29 A-Dur, KV 201",
"composerId": "mozart"
}
],
"ticketUrl": "https://tickets.zko.ch/webshop/webticket/shop?event=1957",
"sourceUrl": "https://zko.ch/events/saisonabschluss-mit-kristian-bezuidenhout-daniel-hope/",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199854",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-06-23T19:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15224&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055962",
"title": "Mirga Gražinytė-Tyla & Beatrice Rana",
"series": null,
"start": "2027-06-23T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Mirga Gražinytė-Tyla"
},
{
"role": "Piano",
"name": "Beatrice Rana"
}
],
"program": [
{
"composer": "Weinberg",
"title": ""
},
{
"composer": "Rachmaninow",
"title": ""
},
{
"composer": "Vaughan Williams",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5577&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/mirga-grazinyte-tyla-beatrice-rana-2055962/",
"source": "tonhalle"
},
{
"id": "real-tonhalle-2055961",
"title": "Orchester-Lunchkonzert mit Mirga Gražinytė-Tyla",
"series": "Orchester-Lunchkonzert",
"start": "2027-06-24T12:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Mirga Gražinytė-Tyla"
}
],
"program": [
{
"composer": "Weinberg",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5609&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/orchester-lunchkonzert-mit-mirga-grazinyte-tyla-2055961/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200230",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-24T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15384&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-candide-20270624",
"title": "Candide",
"series": null,
"start": "2027-06-24T19:30:00+02:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Guillaume Tourniaire"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Pangloss / Martin",
"name": "Lambert Wilson"
},
{
"role": "Candide",
"name": "Michael Porter"
},
{
"role": "Cunégonde",
"name": "Kathryn Lewek"
},
{
"role": "La Vieille Dame",
"name": "Natalie Dessay"
},
{
"role": "Maximilien",
"name": "Jared Mac Werlein"
},
{
"role": "Le Capitaine",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Paquette",
"name": "Fanny Soyer"
},
{
"role": "Le Gouverneur / Vanderdendur",
"name": "Glen Cunningham"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Leonard Bernstein",
"title": "Candide"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/candide",
"source": "osr"
},
{
"id": "real-buehnen_bern-carmina-burana-2027-06-24-1930",
"title": "Carmina Burana",
"series": "12. Symphoniekonzert",
"start": "2027-06-24T19:30:00+02:00",
"durationMin": 75,
"cityId": "bern",
"venueId": "casino-bern",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Soprano",
"name": "Juliana Zara"
},
{
"role": "Tenor",
"name": "Angel Raii Gomez"
},
{
"role": "Baritone",
"name": "Jonathan McGovern"
},
{
"role": "Choir",
"name": "Philharmonischer Chor Warschau"
},
{
"role": "Choir",
"name": "Solothurner Singknaben"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Carl Orff",
"title": "Carmina Burana. Cantiones profanæ cantoribus et choris cantandæ comitantibus instrumentis atque imaginibus magicis für drei Solostimmen, Chor und Orchester (1934–36)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2067&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/carmina-burana/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2055965",
"title": "Mirga Gražinytė-Tyla & Beatrice Rana",
"series": null,
"start": "2027-06-24T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Mirga Gražinytė-Tyla"
},
{
"role": "Piano",
"name": "Beatrice Rana"
}
],
"program": [
{
"composer": "Weinberg",
"title": ""
},
{
"composer": "Rachmaninow",
"title": ""
},
{
"composer": "Vaughan Williams",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5559&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/mirga-grazinyte-tyla-beatrice-rana-2055965/",
"source": "tonhalle"
},
{
"id": "real-cnz-142",
"title": "Schallspuren – CNZ Do.it.yourself",
"series": null,
"start": "2027-06-24T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueName": "Brunnenhof, Studio 1",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "CNZ-Do.it.yourself-Ensemble"
},
{
"role": "Conductor",
"name": "Jacques Demierre"
}
],
"program": [
{
"composer": "Jacques Demierre",
"title": "The bell sounding at the collapse of the bronze mountain, für Publikumsensemble (2027, Uraufführung)"
}
],
"ticketUrl": "https://442hz.com/de/ensembles/Collegium-Novum-Zurich/shop/event/179741/",
"sourceUrl": "https://cnz.ch/schallspuren",
"source": "cnz"
},
{
"id": "real-osi-205113284144503",
"title": "Solisti del CSI",
"series": "Concerti straordinari",
"start": "2027-06-24T20:00:00+02:00",
"durationMin": 120,
"cityId": "lugano",
"venueName": "Docks",
"type": "mixed",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Orchestra della Svizzera italiana"
}
],
"program": [],
"ticketUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-24-20-00",
"sourceUrl": "https://www.osi.swiss/concerti/tutti-i-concerti/2027-06-24-20-00",
"source": "osi"
},
{
"id": "real-opernhaus_zurich-199881",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-25T19:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15279&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-osr-candide-20270625",
"title": "Candide",
"series": null,
"start": "2027-06-25T19:30:00+02:00",
"durationMin": 180,
"cityId": "geneva",
"venueId": "victoria-hall",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Guillaume Tourniaire"
},
{
"role": "Chorus master",
"name": "Mark Biggins"
},
{
"role": "Pangloss / Martin",
"name": "Lambert Wilson"
},
{
"role": "Candide",
"name": "Michael Porter"
},
{
"role": "Cunégonde",
"name": "Kathryn Lewek"
},
{
"role": "La Vieille Dame",
"name": "Natalie Dessay"
},
{
"role": "Maximilien",
"name": "Jared Mac Werlein"
},
{
"role": "Le Capitaine",
"name": "Georgiy Derbas-Richter"
},
{
"role": "Paquette",
"name": "Fanny Soyer"
},
{
"role": "Le Gouverneur / Vanderdendur",
"name": "Glen Cunningham"
},
{
"role": "Choir",
"name": "Chœur du Grand Théâtre de Genève"
},
{
"role": "Orchestra",
"name": "Orchestre de la Suisse Romande"
}
],
"program": [
{
"composer": "Leonard Bernstein",
"title": "Candide"
}
],
"ticketUrl": "https://www.gtg.ch/",
"sourceUrl": "https://www.osr.ch/fr/concerts-billets/concerts/evenement/concert/candide",
"source": "osr"
},
{
"id": "real-buehnen_bern-carmina-burana-2027-06-25-1930",
"title": "Carmina Burana",
"series": "12. Symphoniekonzert",
"start": "2027-06-25T19:30:00+02:00",
"durationMin": 75,
"cityId": "bern",
"venueId": "casino-bern",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Krzysztof Urbański"
},
{
"role": "Soprano",
"name": "Juliana Zara"
},
{
"role": "Tenor",
"name": "Angel Raii Gomez"
},
{
"role": "Baritone",
"name": "Jonathan McGovern"
},
{
"role": "Choir",
"name": "Philharmonischer Chor Warschau"
},
{
"role": "Choir",
"name": "Solothurner Singknaben"
},
{
"role": "Orchestra",
"name": "Berner Symphonieorchester"
}
],
"program": [
{
"composer": "Carl Orff",
"title": "Carmina Burana. Cantiones profanæ cantoribus et choris cantandæ comitantibus instrumentis atque imaginibus magicis für drei Solostimmen, Chor und Orchester (1934–36)"
}
],
"ticketUrl": "https://tickets.buehnenbern.ch/webshop/webticket/seatmap?eventId=2211&el=true&language=de",
"sourceUrl": "https://buehnenbern.ch/spielplan/programm/carmina-burana/",
"source": "buehnen_bern"
},
{
"id": "real-tonhalle-2057029",
"title": "Abo-Konzert #7 – Im Spiegel der Zeit",
"series": "Abo-Konzert #7",
"start": "2027-06-26T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Camerata Zürich"
},
{
"role": "Conductor",
"name": "Esther Hoppe"
},
{
"role": "Piano",
"name": "Ronald Brautigam"
}
],
"program": [
{
"composer": "Dean",
"title": ""
},
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
}
],
"ticketUrl": "https://shop.e-guma.ch/camerata-zuerich/de/events/7-im-spiegel-der-zeit-tonhalle-zuerich-1344873",
"sourceUrl": "https://tonhallezuerich.ch/konzerte/kalender/abo-konzert-7-im-spiegel-der-zeit-2057029/tz/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199882",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-26T20:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15280&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055967",
"title": "Kammermusik-Matinee",
"series": null,
"start": "2027-06-27T11:15:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "chamber",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Flute",
"name": "Sabine Poyé Morel"
},
{
"role": "Ensemble",
"name": "Ilios Quartett"
},
{
"role": "Violin",
"name": "Thomas García"
},
{
"role": "Violin",
"name": "Seiko Périsset-Morishita"
},
{
"role": "Viola",
"name": "Paul Westermayer"
},
{
"role": "Cello",
"name": "Anita Federli-Rutz"
},
{
"role": "Piano",
"name": "Mariko Takahashi García"
}
],
"program": [
{
"composer": "Beethoven",
"title": "",
"composerId": "beethoven"
},
{
"composer": "Schädler",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5621&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/kammermusik-matinee-2055967/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199883",
"title": "See the music, hear the dance",
"series": "Hauptbühne",
"start": "2027-06-27T14:00:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Gábor Káli"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Justin Peck"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
},
{
"role": "Choreographer",
"name": "George Balanchine"
}
],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15281&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/see-the-music-hear-the-dance/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200231",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-27T20:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15385&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200073",
"title": "Liederabend Elīna Garanča",
"series": "Liederabende",
"start": "2027-06-28T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "recital",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15437&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/liederabend-elina-garanca-1/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199838",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2027-06-29T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15294&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200232",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-06-30T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15386&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055974",
"title": "Filmsinfonik: Chaplins «Goldrausch»",
"series": "Filmsinfonik",
"start": "2027-06-30T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Frank Strobel"
}
],
"program": [
{
"composer": "Chaplin",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5636&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/filmsinfonik-chaplins-goldrausch-2055974/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-199936",
"title": "Don Carlo",
"series": "Hauptbühne",
"start": "2027-07-01T19:00:00+02:00",
"durationMin": 210,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Don Carlo",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15210&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don_carlo/",
"source": "opernhaus_zurich"
},
{
"id": "real-tonhalle-2055973",
"title": "Filmsinfonik: Chaplins «Goldrausch»",
"series": "Filmsinfonik",
"start": "2027-07-01T19:30:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "tonhalle-zurich-kleiner-saal",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Orchestra",
"name": "Tonhalle-Orchester Zürich"
},
{
"role": "Conductor",
"name": "Frank Strobel"
}
],
"program": [
{
"composer": "Chaplin",
"title": ""
}
],
"ticketUrl": "https://tickets.tonhallezuerich.ch/webshop/webticket/shop?entry_page=https%3A%2F%2Fwww.tonhalle-orchester.ch%2Fkonzerte%2Fkalender%2F&event=5635&language=de",
"sourceUrl": "https://www.tonhalle-orchester.ch/konzerte/kalender/filmsinfonik-chaplins-goldrausch-2055973/",
"source": "tonhalle"
},
{
"id": "real-opernhaus_zurich-200233",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-07-02T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15387&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199839",
"title": "Ein Sommernachtstraum",
"series": "Hauptbühne",
"start": "2027-07-03T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Conductor",
"name": "Robert Houssart"
},
{
"role": "Orchestra",
"name": "Orchester der Oper Zürich"
},
{
"role": "Choreographer",
"name": "Cathy Marston"
}
],
"program": [
{
"composer": "Felix Mendelssohn Bartholdy",
"title": "Ein Sommernachtstraum",
"composerId": "mendelssohn"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15295&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ein-sommernachtstraum/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199855",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-07-04T14:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15225&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-222801",
"title": "Kinderopernorcherster",
"series": null,
"start": "2027-07-04T18:00:00+02:00",
"durationMin": 60,
"cityId": "zurich",
"venueName": "Sechseläutenplatz",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/kinderopernorcherster/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200113",
"title": "Open-Air-Konzert",
"series": null,
"start": "2027-07-04T20:30:00+02:00",
"durationMin": 100,
"cityId": "zurich",
"venueName": "Sechseläutenplatz",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://www.opernhaus.ch/spielplan/kalendarium/open-air-konzert/",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/open-air-konzert/",
"source": "opernhaus_zurich"
},
{
"id": "real-zko-19929",
"title": "Galakonzert Internationales Opernstudio Zürich",
"series": "Hauptbühne",
"start": "2027-07-05T19:00:00+02:00",
"durationMin": 120,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [
{
"role": "Ensemble",
"name": "Sängerinnen und Sänger des Internationalen Opernstudios"
},
{
"role": "Conductor",
"name": "Adrian Kelly"
},
{
"role": "Orchestra",
"name": "Zürcher Kammerorchester"
}
],
"program": [],
"ticketUrl": "https://www.opernhaus.ch/spielplan/kalendarium/ios-galakonzert/2026-2027",
"sourceUrl": "https://zko.ch/?post_type=noisa_events&p=19929",
"source": "zko"
},
{
"id": "real-opernhaus_zurich-199937",
"title": "Don Carlo",
"series": "Hauptbühne",
"start": "2027-07-06T19:00:00+02:00",
"durationMin": 210,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Don Carlo",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15211&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don_carlo/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199856",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-07-07T19:00:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15226&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199938",
"title": "Don Carlo",
"series": "Hauptbühne",
"start": "2027-07-08T19:00:00+02:00",
"durationMin": 210,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Don Carlo",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15212&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don_carlo/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-200234",
"title": "Samson et Dalila",
"series": "Hauptbühne",
"start": "2027-07-09T19:00:00+02:00",
"durationMin": 165,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Camille Saint-Saëns",
"title": "Samson et Dalila",
"composerId": "saint-saens"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15388&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/samson-et-dalila/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199857",
"title": "La bohème",
"series": "Hauptbühne",
"start": "2027-07-10T19:30:00+02:00",
"durationMin": 150,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"workId": "puccini-boheme",
"composerId": "puccini"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15227&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/la_boheme/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199807",
"title": "Gringolts & Corti & Fischer",
"series": "Philharmonische Konzerte",
"start": "2027-07-11T11:15:00+02:00",
"durationMin": 135,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "orchestral",
"featured": false,
"status": "scheduled",
"credits": [],
"program": [],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15431&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/7-philharmonisches-konzert/",
"source": "opernhaus_zurich"
},
{
"id": "real-opernhaus_zurich-199939",
"title": "Don Carlo",
"series": "Hauptbühne",
"start": "2027-07-11T18:00:00+02:00",
"durationMin": 210,
"cityId": "zurich",
"venueId": "opernhaus-zurich",
"type": "vocal-opera",
"featured": true,
"status": "scheduled",
"credits": [],
"program": [
{
"composer": "Giuseppe Verdi",
"title": "Don Carlo",
"composerId": "verdi"
}
],
"ticketUrl": "https://tickets.opernhaus.ch/webshop/webticket/shop?event=15213&language=de",
"sourceUrl": "https://www.opernhaus.ch/spielplan/kalendarium/don_carlo/",
"source": "opernhaus_zurich"
}
];
