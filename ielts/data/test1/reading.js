/* Practice Test 1 — Reading (Academic + General Training) */
(function () {

  /* ================================================================== */
  /*  ACADEMIC READING                                                  */
  /* ================================================================== */
  IELTSData.add('test1', 'readingAcademic', {
    sections: [

      /* ---------------------------------------------- PASSAGE 1 */
      {
        number: 1, heading: 'Questions 1–13',
        overTitle: 'READING PASSAGE 1 — You should spend about 20 minutes on Questions 1–13.',
        title: 'The return of the urban tram',
        paras: [
          { text: 'For most of the twentieth century the tram was a symbol of everything a modern city was trying to leave behind. In 1920 almost every substantial town in Britain, France, Germany and the United States had one; passengers boarded from the middle of the road, the vehicles were slow, and the tracks made the surface treacherous for anything on two wheels. Forty years later they had very largely vanished from the English-speaking world. Britain\'s last first-generation system, in Glasgow, closed in 1962, and the closures were carried through with striking speed compared with mainland Europe, where a majority of German, Czech and Russian cities never abandoned theirs at all.' },
          { text: 'The reasons usually given are financial. Track and overhead wires had to be maintained by the operator, whereas a bus ran on a road maintained by somebody else. A tram could not be diverted around a burst water main, and it occupied road space that motorists increasingly regarded as theirs. In the United States a further explanation has become popular: that a consortium led by General Motors bought up and dismantled streetcar systems in order to sell buses. The consortium existed and was convicted of a conspiracy relating to bus supply, but transport historians generally regard its influence as, at most, a minor factor in a decline that was already well advanced and that occurred just as thoroughly in countries where the consortium never operated.' },
          { text: 'What almost nobody predicted in 1962 was that the tram would come back. Nantes reopened a line in 1985, the first French city to do so, and Grenoble followed two years later. Manchester\'s Metrolink opened in 1992 and now carries more than forty million passengers a year. Strasbourg, whose network opened in 1994, has become the case study that every transport department quotes. There are now more tram and light-rail systems operating in Europe than there were in 1975, and the number is still rising.' },
          { text: 'Three arguments are usually made for them. The first is capacity: a modern articulated vehicle forty-five metres long carries between three hundred and four hundred passengers, which is the load of up to five buses, with one driver instead of five. The second is ride quality — steel wheels on steel rail produce a smoother and quieter journey than rubber on asphalt, and the vehicle cannot swerve, so standing passengers are more comfortable. The third argument is subtler and more contested. Because a tramline is fixed and expensive, developers treat it as permanent in a way that they never treat a bus route, and land values along new lines rise accordingly. Transport economists call this the "rail factor", and it is the reason city authorities are willing to pay for something that is, on any narrow accounting, extravagant.' },
          { text: 'And it is extravagant. Construction in a European city typically costs between twenty-five and forty million pounds a kilometre, three to four times the cost of a segregated busway of similar capacity. A surprising share of that is not track at all: the most expensive single element is often the diversion of buried services, since water mains, sewers, gas pipes and fibre-optic cable cannot be left under a slab that will need to be dug up. Cities that have kept costs down — Bordeaux is the usual example — have done so mainly by accepting a degree of risk over utilities that British procurement rules make difficult.' },
          { text: 'The engineering is only half the story, and Strasbourg is instructive precisely because its planners understood that. The vehicles were specified with a low floor throughout, so that a passenger with a pushchair or a wheelchair steps straight on from a kerb-height platform with no ramp and no gap; this alone cut boarding times by roughly a third. Ticketing was integrated with the buses and the regional trains from the first day. Most importantly, the city closed the historic centre to cars in the same month that the line opened, so that the tram was not merely an alternative to driving but arrived at a moment when driving had become inconvenient. Surveys carried out three years later found that twenty-two per cent of tram users had previously made the same journey by car.' },
          { text: 'None of which means that every scheme succeeds. Edinburgh\'s line, opened in 2014, ran five years late and cost more than twice its original budget, and the political damage was severe enough to delay light-rail proposals in several other British cities. Sheffield\'s Supertram struggled for a decade before patronage recovered. The lesson that the successful cities appear to have learned is that a tram is not a transport project with an urban design element attached; it is an urban design project that happens to move people, and cities that treat it as the former tend to get the costs without the benefits.' }
        ],
        groups: [
          {
            kind: 'tfng',
            title: 'Questions 1–6',
            instructions: 'Do the following statements agree with the information given in Reading Passage 1?\n\n' +
              'Write **TRUE** if the statement agrees with the information, **FALSE** if the statement contradicts ' +
              'the information, or **NOT GIVEN** if there is no information on this.',
            questions: [
              { n: 1, text: 'Tram systems disappeared faster in Britain than in much of continental Europe.', answer: 'TRUE',
                evidence: 'Paragraph 1: "the closures were carried through with striking speed compared with mainland Europe".' },
              { n: 2, text: 'Historians now accept that American streetcar systems were destroyed by a conspiracy of bus manufacturers.', answer: 'FALSE',
                evidence: 'Paragraph 2: historians "regard its influence as, at most, a minor factor".' },
              { n: 3, text: 'Grenoble was the first French city to reopen a tram line.', answer: 'FALSE',
                evidence: 'Paragraph 3: Nantes was first, in 1985; Grenoble followed two years later.' },
              { n: 4, text: 'There are more tramways in Europe today than there were in the mid-1970s.', answer: 'TRUE',
                evidence: 'Paragraph 3: "more tram and light-rail systems operating in Europe than there were in 1975".' },
              { n: 5, text: 'Building a tramway costs less per kilometre than building a segregated busway.', answer: 'FALSE',
                evidence: 'Paragraph 5: "three to four times the cost of a segregated busway of similar capacity".' },
              { n: 6, text: 'The delays to the Edinburgh scheme were caused mainly by disputes with utility companies.', answer: 'NOT GIVEN',
                evidence: 'Paragraph 7 states the line was late and over budget but never gives a cause. Utilities are discussed in paragraph 5 in general terms only.' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 7–13',
            instructions: 'Complete the notes below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'h', text: 'WHY CITIES ARE BUILDING TRAMWAYS AGAIN' },
              { t: 'lead', text: 'Arguments in favour' },
              { t: 'ul', items: [
                'One articulated vehicle can carry the same number of passengers as up to five [[7]].',
                'Because the route cannot easily be changed, developers regard a tramline as [[8]], and land values rise.'
              ] },
              { t: 'lead', text: 'Costs' },
              { t: 'ul', items: [
                'Typical construction cost: £25–[[9]] million per kilometre.',
                'The largest single item is frequently the diversion of buried [[10]].'
              ] },
              { t: 'lead', text: 'Lessons from Strasbourg' },
              { t: 'ul', items: [
                'A [[11]] floor throughout reduced boarding times by about a third.',
                'The centre of the city was closed to [[12]] in the same month the line opened.',
                'After three years, [[13]] per cent of tram passengers had previously driven the same journey.'
              ] }
            ],
            questions: [
              { n: 7, answer: 'buses', evidence: 'Paragraph 4: "the load of up to five buses".' },
              { n: 8, answer: 'permanent', evidence: 'Paragraph 4: "developers treat it as permanent".' },
              { n: 9, answer: '40', accept: ['forty'], evidence: 'Paragraph 5: "between twenty-five and forty million pounds a kilometre".' },
              { n: 10, answer: 'services', evidence: 'Paragraph 5: "the diversion of buried services".' },
              { n: 11, answer: 'low', evidence: 'Paragraph 6: "specified with a low floor throughout".' },
              { n: 12, answer: 'cars', accept: ['private cars'], evidence: 'Paragraph 6: "closed the historic centre to cars".' },
              { n: 13, answer: '22', accept: ['twenty-two'], evidence: 'Paragraph 6: "twenty-two per cent of tram users had previously made the same journey by car".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 2 */
      {
        number: 2, heading: 'Questions 14–26',
        overTitle: 'READING PASSAGE 2 — You should spend about 20 minutes on Questions 14–26.',
        title: 'Reading the rings',
        subtitle: 'How the growth of trees became one of the most precise dating tools in science',
        paras: [
          { label: 'A', text: 'In a temperate climate a tree adds one layer of wood to its trunk each growing season. The cells laid down in spring are large and thin-walled, and appear pale; those laid down as growth slows in late summer are small and dense, and appear dark. The boundary between one year\'s dark wood and the next year\'s pale wood is what we see as a ring. The width of each ring is not fixed: in a warm, wet year the tree may add several millimetres, in a cold or drought-stricken one almost nothing. A trunk is therefore not simply a record of age but a physical archive of the conditions the tree lived through, written at a resolution of a single year.' },
          { label: 'B', text: 'That the archive could be read at all was established almost by accident. Andrew Ellicott Douglass was an astronomer at the Lowell Observatory in Arizona, and his interest in the early 1900s was in whether the eleven-year cycle of sunspots left a detectable signature in the Earth\'s weather. Looking for a long weather record, he turned to the pines growing outside his office. He soon noticed something more important than any solar cycle: the pattern of wide and narrow rings over a run of years was not unique to one tree but shared by every tree in the district, because they had all experienced the same weather. If the pattern was shared, then a sequence of rings could be matched from one piece of timber to another — a procedure he named crossdating — and timber of unknown age could be tied to timber of known age.' },
          { label: 'C', text: 'The consequences were immediate for archaeology. Douglass began with living trees, whose outermost ring was by definition the current year, and worked backwards. He then matched the innermost rings of those trees against the outermost rings of older beams taken from historic buildings, and the innermost rings of those beams against still older timbers recovered from ruins. Each overlap pushed the sequence further into the past, and by 1929 he had assembled a continuous master chronology that allowed the great pueblos of the American Southwest to be dated not to a century but to a year. Chronologies built the same way from oak in Ireland and Germany, and from bristlecone pine in California, now extend back more than eight thousand years without a break.' },
          { label: 'D', text: 'The technique\'s largest contribution, however, has been to another dating method entirely. Radiocarbon dating assumes that the proportion of carbon-14 in the atmosphere has been constant, and when the method was introduced in the late 1940s that assumption was untested. Wood of known calendar age, supplied by dendrochronology, made the test possible — and the assumption turned out to be wrong. Atmospheric carbon-14 has varied considerably, with the result that uncorrected radiocarbon dates from the third millennium BC are several centuries too recent. The correction curve now used by every radiocarbon laboratory in the world is built almost entirely from tree rings, and the recalibration it forced obliged archaeologists to rewrite the chronology of prehistoric Europe.' },
          { label: 'E', text: 'There are, nonetheless, places where the method barely works. It depends on a growing season that stops: a region must have a marked seasonal cycle, whether of temperature or of rainfall, or the tree grows continuously and lays down no boundary at all. Many tropical species produce no usable rings whatever. Even in temperate zones the record can mislead. A tree stressed by drought may skip a year entirely, producing a missing ring, while a tree that suffers a spring frost and then recovers may lay down a second, false ring within a single season. Only by comparing many trees from the same district — never a single specimen — can these anomalies be identified and corrected.' },
          { label: 'F', text: 'Beyond archaeology, tree-ring analysis has become an unexpectedly versatile instrument. Because the chemistry of a ring reflects the atmosphere in the year it formed, rings preserve the fallout of distant volcanic eruptions, allowing events known only from ambiguous historical references to be fixed to an exact year. Art historians use the technique to date the oak panels on which northern European paintings were made, and instrument specialists to test the claims made for old violins. Timber traders now use ring patterns forensically, matching a sawn plank to the region it was felled in, which makes it possible to detect illegally logged hardwood entering a supply chain. A method devised to look for sunspots has ended up in the customs shed.' }
        ],
        groups: [
          {
            kind: 'headings',
            title: 'Questions 14–19',
            instructions: 'Reading Passage 2 has six paragraphs, **A–F**.\n\n' +
              'Choose the correct heading for each paragraph from the list of headings below.',
            optionsTitle: 'List of headings',
            options: [
              { k: 'i', t: 'A tool for checking another dating method' },
              { k: 'ii', t: 'Where the technique cannot easily be used' },
              { k: 'iii', t: 'The accidental origins of a discipline' },
              { k: 'iv', t: 'Uses far beyond archaeology' },
              { k: 'v', t: 'How a single tree records its own history' },
              { k: 'vi', t: 'The rising cost of collecting samples' },
              { k: 'vii', t: 'Overlapping samples to reach further back' },
              { k: 'viii', t: 'A method rejected by archaeologists' },
              { k: 'ix', t: 'Training a new generation of specialists' }
            ],
            questions: [
              { n: 14, text: 'Paragraph A', answer: 'v', evidence: 'A describes how one tree lays down a ring each year and what the width records.' },
              { n: 15, text: 'Paragraph B', answer: 'iii', evidence: 'B: an astronomer looking for sunspots stumbles on crossdating.' },
              { n: 16, text: 'Paragraph C', answer: 'vii', evidence: 'C: matching the inner rings of one sample to the outer rings of an older one, again and again.' },
              { n: 17, text: 'Paragraph D', answer: 'i', evidence: 'D: tree rings provided the calibration curve for radiocarbon dating.' },
              { n: 18, text: 'Paragraph E', answer: 'ii', evidence: 'E: tropical species, missing rings and false rings — the limits of the method.' },
              { n: 19, text: 'Paragraph F', answer: 'iv', evidence: 'F: volcanoes, paintings, violins and the timber trade.' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 20–23',
            instructions: 'Complete the summary below.\n\nChoose **NO MORE THAN TWO WORDS** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'h', text: 'Douglass and the birth of tree-ring dating' },
              { t: 'p', text: 'Douglass was not originally a biologist but an [[20]], and what he wanted to know was whether ' +
                'sunspots affected the weather. He realised that trees growing in the same district shared the same ' +
                'sequence of wide and narrow rings, so that samples could be matched to one another, a procedure he ' +
                'called [[21]]. By joining overlapping samples together he was able to build a continuous ' +
                '[[22]] reaching into the past, and this allowed the ruins of the American Southwest to be dated to a ' +
                'single [[23]] rather than to a century.' }
            ],
            questions: [
              { n: 20, answer: 'astronomer', evidence: 'Paragraph B: "Douglass was an astronomer at the Lowell Observatory".' },
              { n: 21, answer: 'crossdating', accept: ['cross-dating'], evidence: 'Paragraph B: "a procedure he named crossdating".' },
              { n: 22, answer: 'master chronology', accept: ['chronology'], evidence: 'Paragraph C: "a continuous master chronology".' },
              { n: 23, answer: 'year', evidence: 'Paragraph C: "dated not to a century but to a year".' }
            ]
          },
          {
            kind: 'short',
            title: 'Questions 24–26',
            instructions: 'Answer the questions below.\n\nChoose **NO MORE THAN THREE WORDS** from the passage for each answer.',
            maxWords: 3,
            questions: [
              { n: 24, text: 'What must a region have for dendrochronology to work there?',
                answer: 'marked seasonal cycle', accept: ['seasonal cycle', 'a seasonal cycle'],
                evidence: 'Paragraph E: "a region must have a marked seasonal cycle".' },
              { n: 25, text: 'What may cause a tree to produce two rings in one season?',
                answer: 'a spring frost', accept: ['spring frost', 'frost'],
                evidence: 'Paragraph E: "a tree that suffers a spring frost and then recovers may lay down a second, false ring".' },
              { n: 26, text: 'Which past events can rings help to date exactly, according to the passage?',
                answer: 'volcanic eruptions', accept: ['distant volcanic eruptions', 'eruptions'],
                evidence: 'Paragraph F: "rings preserve the fallout of distant volcanic eruptions".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 3 */
      {
        number: 3, heading: 'Questions 27–40',
        overTitle: 'READING PASSAGE 3 — You should spend about 20 minutes on Questions 27–40.',
        title: 'How wise is the crowd?',
        paras: [
          { text: 'Almost every discussion of collective judgement begins in the same place: a country fair in Plymouth in 1906, where the statistician Francis Galton watched eight hundred people pay sixpence each to guess the dressed weight of an ox. No individual guess was correct. But when Galton took the middle value of all the entries he found it lay within one per cent of the true figure, and the result has been retold ever since as proof that a crowd knows more than any of its members.' },
          { text: 'It is worth being precise about what the experiment actually showed, because the retelling has drifted. The figure Galton first published was the median, not the mean; he calculated the mean only later, at a colleague\'s suggestion, and although it happened to be closer still, that was not the result he set out to report. More importantly, the competitors were not a random crowd. Entry cost money, the prizes went to the closest guesses, and a great many of the entrants were butchers and farmers who valued cattle for a living. What Galton had assembled was less a crowd than an unusually well-informed panel with a financial incentive to be right — which is a considerably weaker claim than the one his experiment is usually made to support, though also a more useful one.' },
          { text: 'The modern statement of the idea is James Surowiecki\'s, and his contribution was to specify the conditions under which aggregation works. A crowd, he argued, produces good estimates when its members are diverse in the information they hold, when they judge independently of one another, when knowledge is decentralised so that local and specialist information can enter, and when some mechanism exists to combine the individual answers into a collective one. Remove any of the four and the mechanism degrades. Diversity matters more than sheer numbers: a thousand people who read the same newspaper are, for these purposes, close to a single person, whereas a hundred people with genuinely different sources will usually beat them.' },
          { text: 'The condition that fails most often in practice is independence, and it fails in a way that is difficult to detect from inside. In 2011 Jan Lorenz and colleagues at ETH Zurich asked participants to estimate quantities such as the length of the Swiss border and the number of murders committed in Zurich in a given year. Some estimated in isolation; others were shown the average of the group\'s previous estimates and allowed to revise. Social information caused the range of answers to contract sharply — the group converged, and each participant reported greater confidence in the collective answer. But the collective answer did not become more accurate. In several rounds it drifted further from the truth, because the early estimates that everyone anchored on happened to be poor. Confidence and accuracy came apart, and the group had no way of knowing which it had gained.' },
          { text: 'This is the mechanism behind what economists call an information cascade. Each person, observing what others have already chosen, rationally concludes that their collective behaviour reveals information, and suppresses their own private signal in favour of it. Because each successive person then adds no new information to the pool, a cascade can be started by two or three early judgements and can be entirely wrong without anyone behaving irrationally. Laboratory experiments reproduce cascades reliably, and the architecture of social platforms — visible counts of likes, shares and views, presented before the content itself — makes them substantially more likely than they were when opinion travelled slowly and privately.' },
          { text: 'Two responses to the problem are worth taking seriously. The first is the prediction market, in which participants buy and sell contracts that pay out if an event occurs, so that the price behaves as a continuously updated probability. Markets impose a discipline that surveys do not: a participant who is confidently wrong loses money, and one who has genuine private information has a reason to reveal it. Their record on elections and on corporate forecasting is respectable. It is not, however, decisive; carefully run panels have matched or beaten market prices often enough that anyone claiming markets are simply the best available instrument is going beyond the evidence.' },
          { text: 'The second response attacks the aggregation step itself. Dražen Prelec and colleagues proposed asking respondents two questions instead of one: what they believe, and what they think the majority will say. An answer that is chosen more often than people predict it will be chosen — "surprisingly popular", in their phrase — usually turns out to be correct, because only those with specialist knowledge both hold it and understand why others do not. In tests on questions of geography, medical diagnosis and art attribution, the method outperformed both the simple majority and the confidence-weighted majority. It is an elegant demonstration that the crowd\'s problem is often not ignorance but the drowning of a knowledgeable minority.' },
          { text: 'Running alongside all this is a finding that sits awkwardly with the whole tradition. Philip Tetlock\'s long-running forecasting tournaments established that a small proportion of participants — perhaps two per cent — are consistently and substantially better at predicting geopolitical events than the average of the group, that their advantage persists from year to year, and that it can be improved further by training. If a handful of individuals reliably beat the aggregate, the interesting question is no longer whether crowds are wise but which crowd, combined how, and against what alternative. The honest conclusion is that collective judgement is not a natural property of groups that can be assumed. It is an engineering problem, and like any engineering problem it can be solved well or badly.' }
        ],
        groups: [
          {
            kind: 'ynng',
            title: 'Questions 27–31',
            instructions: 'Do the following statements agree with the claims of the writer in Reading Passage 3?\n\n' +
              'Write **YES** if the statement agrees with the claims of the writer, **NO** if the statement ' +
              'contradicts the claims of the writer, or **NOT GIVEN** if it is impossible to say what the writer ' +
              'thinks about this.',
            questions: [
              { n: 27, text: 'Galton\'s ox experiment is usually described in a way that overstates what it demonstrated.', answer: 'YES',
                evidence: 'Paragraph 2: "the retelling has drifted"; the entrants were "an unusually well-informed panel", "a considerably weaker claim".' },
              { n: 28, text: 'The size of a group matters more than the variety of information its members hold.', answer: 'NO',
                evidence: 'Paragraph 3: "Diversity matters more than sheer numbers".' },
              { n: 29, text: 'Social platforms have made information cascades more likely.', answer: 'YES',
                evidence: 'Paragraph 5: the architecture of social platforms "makes them substantially more likely".' },
              { n: 30, text: 'Prediction markets are the most accurate forecasting instrument currently available.', answer: 'NO',
                evidence: 'Paragraph 6: "anyone claiming markets are simply the best available instrument is going beyond the evidence".' },
              { n: 31, text: 'The "surprisingly popular" method will be adopted by most large organisations.', answer: 'NOT GIVEN',
                evidence: 'Paragraph 7 reports how well the method performs but says nothing about whether it will be taken up.' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 32–36',
            instructions: 'Choose the correct letter, **A**, **B**, **C** or **D**.',
            questions: [
              { n: 32, text: 'What does the writer point out about the figure Galton originally published?',
                options: [{ k: 'A', t: 'It was less accurate than has since been reported.' },
                          { k: 'B', t: 'It was the median rather than the mean.' },
                          { k: 'C', t: 'It was calculated from only part of the entries.' },
                          { k: 'D', t: 'It was corrected by a colleague after publication.' }],
                answer: 'B', evidence: 'Paragraph 2: "The figure Galton first published was the median, not the mean."' },
              { n: 33, text: 'In the ETH Zurich study, seeing other people\'s estimates caused participants to',
                options: [{ k: 'A', t: 'produce a narrower spread of answers.' },
                          { k: 'B', t: 'take much longer over their decisions.' },
                          { k: 'C', t: 'revise their answers only slightly.' },
                          { k: 'D', t: 'become less certain of the group\'s figure.' }],
                answer: 'A', evidence: 'Paragraph 4: "Social information caused the range of answers to contract sharply."' },
              { n: 34, text: 'According to the passage, an information cascade develops because people',
                options: [{ k: 'A', t: 'are unwilling to disagree with a majority in public.' },
                          { k: 'B', t: 'have no private information of their own.' },
                          { k: 'C', t: 'reasonably treat the behaviour of others as evidence.' },
                          { k: 'D', t: 'are influenced by the confidence of the first speaker.' }],
                answer: 'C', evidence: 'Paragraph 5: "Each person… rationally concludes that their collective behaviour reveals information."' },
              { n: 35, text: 'The writer suggests that prediction markets have an advantage over surveys because',
                options: [{ k: 'A', t: 'they attract better-informed participants.' },
                          { k: 'B', t: 'being wrong has a cost for the participant.' },
                          { k: 'C', t: 'they can be updated more frequently.' },
                          { k: 'D', t: 'their results are easier for the public to interpret.' }],
                answer: 'B', evidence: 'Paragraph 6: "a participant who is confidently wrong loses money".' },
              { n: 36, text: 'What does the writer conclude in the final paragraph?',
                options: [{ k: 'A', t: 'Individual experts should be trusted more than groups.' },
                          { k: 'B', t: 'Forecasting tournaments produce the most reliable data.' },
                          { k: 'C', t: 'The wisdom of a crowd has to be deliberately designed.' },
                          { k: 'D', t: 'Training makes little difference to forecasting accuracy.' }],
                answer: 'C', evidence: 'Final sentences: "not a natural property of groups… It is an engineering problem."' }
            ]
          },
          {
            kind: 'matching',
            title: 'Questions 37–40',
            instructions: 'Look at the following statements and the list of people below.\n\n' +
              'Match each statement with the correct person, **A–E**. You may use any letter only once.',
            optionsTitle: 'List of people',
            options: [
              { k: 'A', t: 'Francis Galton' },
              { k: 'B', t: 'James Surowiecki' },
              { k: 'C', t: 'Jan Lorenz' },
              { k: 'D', t: 'Dražen Prelec' },
              { k: 'E', t: 'Philip Tetlock' }
            ],
            questions: [
              { n: 37, text: 'set out the requirements a group must meet before its answers can be trusted', answer: 'B',
                evidence: 'Paragraph 3: Surowiecki "specified the conditions under which aggregation works".' },
              { n: 38, text: 'showed that a group can become more confident without becoming more accurate', answer: 'C',
                evidence: 'Paragraph 4: the Lorenz study — "Confidence and accuracy came apart."' },
              { n: 39, text: 'devised a way of finding the right answer when only a minority holds it', answer: 'D',
                evidence: 'Paragraph 7: the "surprisingly popular" method.' },
              { n: 40, text: 'found that a few individuals consistently outperform the group average', answer: 'E',
                evidence: 'Paragraph 8: Tetlock\'s tournaments — "perhaps two per cent".' }
            ]
          }
        ]
      }
    ]
  });

  /* ================================================================== */
  /*  GENERAL TRAINING READING                                          */
  /* ================================================================== */
  IELTSData.add('test1', 'readingGeneral', {
    sections: [

      /* ---------------------------------------------- SECTION 1 */
      {
        number: 1, heading: 'Questions 1–7', tabLabel: 'S1 · Text A', paletteLabel: 'S1a',
        overTitle: 'SECTION 1 — Questions 1–14. You should spend about 20 minutes on this section.',
        title: 'Text A — Fernlea Lido: summer information',
        paras: [
          { t: 'h', text: 'Opening times (24 May – 14 September)' },
          { text: 'The Lido opens daily at 7.00 a.m. and closes at 8.00 p.m., except on Wednesdays, when the pool closes at 4.00 p.m. for maintenance. The last admission is always forty-five minutes before closing. During the school summer holidays the pool also opens for an early swim from 6.00 a.m. on Mondays and Fridays; this session is for adults only and must be booked online.' },
          { t: 'h', text: 'Charges' },
          { text: 'Adults £6.20; children (5–15) £3.10; under-5s free when accompanied by a swimming adult. A family ticket (two adults and up to three children) costs £16.00 and may be used on any single visit. Season tickets cost £110 for an adult and £58 for a child, and are transferable between members of the same household provided the named holder is present. We no longer accept cash at the gate; payment is by card or through the app.' },
          { t: 'h', text: 'Lanes and lessons' },
          { text: 'Two lanes are roped off for length swimming at all times. On Tuesday and Thursday evenings from 6.00 p.m. the whole pool is given over to the Fernlea Swimming Club and is closed to the general public. Adult beginners\' lessons run on Saturday mornings; these are heavily oversubscribed and there is currently a waiting list of around eight weeks. Children\'s lessons have moved to the indoor pool at Marsh Road for the summer.' },
          { t: 'h', text: 'Please note' },
          { text: 'The water is unheated and the temperature in early June is typically around 17°C. Inflatables are permitted only in the shallow end and only before midday. Barbecues are not allowed anywhere on the site, although the picnic lawn may be used for food brought from home. Lockers take a returnable £1 coin. Dogs are not admitted, with the exception of assistance dogs.' }
        ],
        groups: [{
          kind: 'tfng',
          title: 'Questions 1–7',
          instructions: 'Do the following statements agree with the information given in Text A?\n\n' +
            'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
          questions: [
            { n: 1, text: 'The Lido closes earlier than usual on one day of the week.', answer: 'TRUE',
              evidence: '"except on Wednesdays, when the pool closes at 4.00 p.m."' },
            { n: 2, text: 'Children may attend the early morning swim if an adult comes with them.', answer: 'FALSE',
              evidence: '"this session is for adults only".' },
            { n: 3, text: 'A family ticket can be used more than once.', answer: 'FALSE',
              evidence: '"may be used on any single visit".' },
            { n: 4, text: 'Visitors can pay in cash at the entrance.', answer: 'FALSE',
              evidence: '"We no longer accept cash at the gate."' },
            { n: 5, text: 'Adults who want swimming lessons will have to wait about two months.', answer: 'TRUE',
              evidence: '"a waiting list of around eight weeks".' },
            { n: 6, text: 'The swimming club pays a reduced rate for its use of the pool.', answer: 'NOT GIVEN',
              evidence: 'The text says the club has exclusive use twice a week but says nothing about what it pays.' },
            { n: 7, text: 'Visitors may bring their own food onto the site.', answer: 'TRUE',
              evidence: '"the picnic lawn may be used for food brought from home".' }
          ]
        }]
      },

      {
        number: 1, heading: 'Questions 8–14', tabLabel: 'S1 · Text B', paletteLabel: 'S1b',
        overTitle: 'SECTION 1 (continued)',
        title: 'Text B — Bramble Court: information for new tenants',
        paras: [
          { text: 'Welcome to Bramble Court. Please read this sheet carefully and keep it somewhere you can find it; it answers most of the questions our tenants ask in the first month.' },
          { t: 'h', text: 'Getting in' },
          { text: 'Each flat is issued with two door fobs. Additional fobs cost £15 each and must be ordered through the online portal, not from the caretaker. If you lose a fob, report it the same day so that it can be deactivated. The main door releases automatically between 8.00 a.m. and 6.00 p.m. on weekdays only.' },
          { t: 'h', text: 'Rent and charges' },
          { text: 'Rent is due on the first working day of each month and is collected by standing order. The service charge is billed separately every three months and covers cleaning of the communal areas, the lift contract, buildings insurance and the garden. It does not cover your electricity, which you arrange yourself with a supplier of your choice; the building is on a shared water meter and water is included in the service charge.' },
          { t: 'h', text: 'Repairs' },
          { text: 'Report anything that needs fixing through the portal. Emergencies — a burst pipe, a total loss of power, a lift with someone inside it — should instead be telephoned to the out-of-hours number, 0800 960 4471, at any time of day or night. We aim to attend emergencies within four hours, urgent repairs within three working days and routine repairs within twenty-eight days.' },
          { t: 'h', text: 'Bins and recycling' },
          { text: 'The bin store is behind the bicycle racks. General waste is collected on Tuesdays and recycling on alternate Fridays. Cardboard must be flattened. Bulky items such as furniture cannot be left in the bin store; the council will remove them for a fee if you book a collection.' },
          { t: 'h', text: 'Living alongside your neighbours' },
          { text: 'Please avoid noisy activity between 11.00 p.m. and 7.00 a.m. Musical instruments may be played during the day. Pets are not permitted without written consent, which is normally granted for a cat or a small dog but never for more than one animal. The communal garden is for the use of residents and their guests; barbecues are allowed on the paved terrace only.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 8–14',
          instructions: 'Complete the notes below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from Text B for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'BRAMBLE COURT — NEW TENANT NOTES' },
            { t: 'ul', items: [
              'A replacement door fob costs £[[8]] and is ordered through the portal.',
              'Rent is paid by [[9]] on the first working day of the month.',
              'The service charge is billed every [[10]] months.',
              'Tenants must arrange their own supply of [[11]].',
              'Emergencies should be dealt with within [[12]] hours.',
              'Before being put in the bin store, [[13]] has to be flattened.',
              'Keeping a pet requires [[14]] from the landlord.'
            ] }
          ],
          questions: [
            { n: 8, answer: '15', accept: ['£15', 'fifteen'], evidence: '"Additional fobs cost £15 each."' },
            { n: 9, answer: 'standing order', evidence: '"collected by standing order".' },
            { n: 10, answer: 'three', accept: ['3'], evidence: '"billed separately every three months".' },
            { n: 11, answer: 'electricity', evidence: '"It does not cover your electricity, which you arrange yourself."' },
            { n: 12, answer: 'four', accept: ['4'], evidence: '"We aim to attend emergencies within four hours."' },
            { n: 13, answer: 'cardboard', evidence: '"Cardboard must be flattened."' },
            { n: 14, answer: 'written consent', accept: ['consent'], evidence: '"Pets are not permitted without written consent."' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 2 */
      {
        number: 2, heading: 'Questions 15–20', tabLabel: 'S2 · Text C', paletteLabel: 'S2a',
        overTitle: 'SECTION 2 — Questions 15–27. You should spend about 20 minutes on this section.',
        title: 'Text C — Hybrid working: extract from the staff handbook',
        paras: [
          { text: 'This policy applies to all employees whose role has been designated as hybrid. It does not apply to staff in site-based roles, who are covered by Section 4 of the handbook, or to contractors.' },
          { t: 'h', text: '1. The standard pattern' },
          { text: 'Hybrid employees are expected to work from a company office for a minimum of two days in each working week, one of which must be the team\'s anchor day. Anchor days are set by each head of department and published a term in advance; they exist so that a team can rely on being together for at least one predictable day. Attendance is measured as an average across a rolling four-week period rather than week by week, so a week away at a conference does not need to be made up.' },
          { t: 'h', text: '2. Where you may work' },
          { text: 'On non-office days you may work from your home address as registered with HR, or from any location within the United Kingdom for up to ten working days a year without prior approval. Working from outside the UK requires approval from both your manager and the tax team, must not exceed twenty working days in a tax year, and cannot be used to extend a holiday without a formal request submitted at least six weeks beforehand.' },
          { t: 'h', text: '3. Equipment and expenses' },
          { text: 'The company provides a laptop, a headset and one additional monitor. A desk chair may be claimed up to a value of £250 once every four years, subject to a display screen equipment assessment being completed first. Broadband, heating and electricity at home are not reimbursed. Travel between your home and a company office is a normal commute and is never claimable, including on days when you have been asked to attend at short notice.' },
          { t: 'h', text: '4. Meetings' },
          { text: 'Any meeting with one or more remote participants must be run as a fully remote meeting: everyone joins from their own device, including those sitting in the office. Recording is permitted only with the agreement of all participants and recordings are deleted automatically after ninety days.' },
          { t: 'h', text: '5. Changing your arrangement' },
          { text: 'A permanent change to your working pattern is a change to your contract and must be requested through the flexible working procedure. The company will respond within two months. A temporary variation — for example while recovering from an operation — may be agreed with your manager alone for a period of up to three months.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 15–20',
          instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from Text C for each answer.',
          maxWords: 3,
          blocks: [
            { t: 'ul', items: [
              'One of an employee\'s two office days each week has to be the team\'s [[15]].',
              'Office attendance is calculated as an average over a rolling period of [[16]].',
              'Employees may work elsewhere in the UK for up to [[17]] a year without asking permission first.',
              'A request to work abroad alongside a holiday must be submitted at least [[18]] in advance.',
              'The company will pay up to [[19]] towards a chair, but only after a display screen equipment assessment.',
              'A temporary change to someone\'s working pattern can last no longer than [[20]].'
            ] }
          ],
          questions: [
            { n: 15, answer: 'anchor day', evidence: '"one of which must be the team\'s anchor day".' },
            { n: 16, answer: 'four weeks', accept: ['four-week', '4 weeks'], evidence: '"an average across a rolling four-week period".' },
            { n: 17, answer: 'ten working days', accept: ['10 working days'], evidence: '"up to ten working days a year without prior approval".' },
            { n: 18, answer: 'six weeks', accept: ['6 weeks'], evidence: '"a formal request submitted at least six weeks beforehand".' },
            { n: 19, answer: '£250', accept: ['250'], evidence: '"A desk chair may be claimed up to a value of £250".' },
            { n: 20, answer: 'three months', accept: ['3 months'], evidence: '"for a period of up to three months".' }
          ]
        }]
      },

      {
        number: 2, heading: 'Questions 21–27', tabLabel: 'S2 · Text D', paletteLabel: 'S2b',
        overTitle: 'SECTION 2 (continued)',
        title: 'Text D — Northwood Engineering: the apprenticeship programme',
        paras: [
          { label: 'A', text: 'Northwood has trained apprentices continuously since 1948, and roughly one in five of our current workforce, including two members of the board, joined the company that way. We recruit once a year for a September start, and we take between twelve and eighteen people across four disciplines: mechanical fitting, electrical maintenance, fabrication and technical design.' },
          { label: 'B', text: 'You do not need to have decided which discipline you want. The first eight months are spent in the training school at the Ashby site, where everyone covers the same syllabus: workshop safety, hand skills, measurement and inspection, basic machining, electrical principles and an introduction to our drawing standards. Only at the end of that period, and after a conversation with your training officer, do you commit to a route.' },
          { label: 'C', text: 'Applicants need five GCSEs at grade 4 or above, including mathematics, English and either a science or design and technology. We do not require prior experience and we do not interview on the basis of your grades alone: everyone who meets the minimum is invited to a practical assessment day, and roughly half of the offers we make each year go to candidates who were not in the top half of the academic ranking.' },
          { label: 'D', text: 'Apprentices are employees from day one, with a contract, a pension and twenty-five days of holiday. First-year pay is £19,400, rising to £24,100 in the third year, and there is no fee of any kind for the training or for the qualification. Apprentices who complete the programme and stay with the company for a further two years also receive a completion bonus of £2,000.' },
          { label: 'E', text: 'One day a week during term time is spent at Ashby College studying for a Level 3 diploma, and the company pays for and gives you time off for that day. Attendance is compulsory and is treated exactly as attendance at work; the most common reason for an apprentice getting into difficulty is not failing the assessments but missing college.' },
          { label: 'F', text: 'From the second year you are placed with a production team and paid to do real work, rotating every four months so that you see machining, assembly, quality and maintenance before you finish. Each apprentice has a workplace mentor, who is a serving engineer rather than a manager, and who meets you fortnightly. Mentors volunteer for the role and are given four days of training.' },
          { label: 'G', text: 'Around ninety per cent of our apprentices complete the programme, and of those, more than eighty per cent are still with Northwood five years later. Those who leave most often go to customers or suppliers we work with. We will support an application to a part-time degree once you have completed, and we currently fund fourteen employees through engineering degrees on that basis.' }
        ],
        groups: [{
          kind: 'matching',
          title: 'Questions 21–27',
          instructions: 'Text D has seven paragraphs, **A–G**.\n\nWhich paragraph contains the following information?\n\n' +
            'Write the correct letter, **A–G**. You may use any letter only once.',
          optionsTitle: 'Paragraphs',
          options: [{ k: 'A', t: 'Paragraph A' }, { k: 'B', t: 'Paragraph B' }, { k: 'C', t: 'Paragraph C' },
                    { k: 'D', t: 'Paragraph D' }, { k: 'E', t: 'Paragraph E' }, { k: 'F', t: 'Paragraph F' },
                    { k: 'G', t: 'Paragraph G' }],
          questions: [
            { n: 21, text: 'the qualifications needed to apply', answer: 'C', evidence: 'C: "five GCSEs at grade 4 or above".' },
            { n: 22, text: 'what apprentices earn', answer: 'D', evidence: 'D: "First-year pay is £19,400".' },
            { n: 23, text: 'how long apprentices stay with the company afterwards', answer: 'G', evidence: 'G: "more than eighty per cent are still with Northwood five years later".' },
            { n: 24, text: 'the point at which a specialism is chosen', answer: 'B', evidence: 'B: "Only at the end of that period… do you commit to a route."' },
            { n: 25, text: 'the person who supports an apprentice on the shop floor', answer: 'F', evidence: 'F: the workplace mentor, "a serving engineer rather than a manager".' },
            { n: 26, text: 'the problem that causes most apprentices difficulty', answer: 'E', evidence: 'E: "not failing the assessments but missing college".' },
            { n: 27, text: 'the number of apprentices recruited each year', answer: 'A', evidence: 'A: "between twelve and eighteen people".' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 3 */
      {
        number: 3, heading: 'Questions 28–40', tabLabel: 'Section 3', paletteLabel: 'S3',
        overTitle: 'SECTION 3 — Questions 28–40. You should spend about 20 minutes on this section.',
        title: 'The allotment: a very British institution',
        paras: [
          { label: 'A', text: 'There are about three hundred thousand allotment plots in the United Kingdom, and something in the region of a hundred and seventy thousand people waiting for one. In parts of London the wait can exceed fifteen years, which is longer than many tenants will live at the same address. For a form of land use that most people associate with retirement and runner beans, that is a remarkable level of demand, and it has caught local authorities almost entirely unprepared.' },
          { label: 'B', text: 'The institution is older than it looks. Enclosure of common land through the eighteenth and early nineteenth centuries removed the ability of rural labourers to graze an animal or grow a few vegetables, and allotments were originally a partial compensation for that loss, provided by parishes and by landowners who feared the alternative. The General Enclosure Act of 1845 required that provision be made for "the labouring poor" when common land was enclosed, and the phrase tells you a good deal about how the plots were regarded: as a charitable measure to keep people fed, orderly and out of the alehouse.' },
          { label: 'C', text: 'The modern legal framework arrived after the First World War. The Allotments Act of 1922 gave tenants security against eviction at short notice and, crucially, defined an allotment garden as land cultivated for the consumption of the tenant\'s household — a definition that still governs what may be done on a plot today. The Act of 1925 went further, creating the category of "statutory" allotment land, which a council may not sell or build on without the consent of the Secretary of State. That protection is the single reason a great deal of urban green space has survived.' },
          { label: 'D', text: 'Demand has always been driven by circumstance rather than fashion. The peak came during the Second World War, when the Dig for Victory campaign pushed the number of plots to around one and a half million and domestic gardens and public parks were turned over to vegetables; by 1943 more than half the manual workers in the country were producing some of their own food. What followed was a long collapse. Rising incomes, cheap supermarket produce, the spread of the freezer and, above all, the demand for building land reduced the stock by three-quarters over the next fifty years. Councils sold sites, and because much of the land sold was not statutory, they were entitled to.' },
          { label: 'E', text: 'The reversal since the late 1990s has been sharp and is only partly explained by an interest in food. Surveys of new plot-holders consistently put "food I can trust" some way behind two other motivations: being outdoors doing physical work, and belonging to something. A typical site has a hut, a kettle, an annual show and a committee that argues about the water supply, and for people who have moved to a city without family nearby it is one of the few places where a person in their twenties and a person in their eighties routinely do something together. Several NHS trusts now refer patients to allotment projects under social prescribing schemes, on evidence that is encouraging without yet being conclusive.' },
          { label: 'F', text: 'The waiting lists are not simply a matter of too little land. Traditional plots were sized for a family\'s year-round supply — ten poles, about 250 square metres, which takes something like eight hours a week to keep on top of. Many councils have responded by halving or quartering plots as they become vacant, which multiplies the number of tenants and suits people in full-time work. Long-standing plot-holders are not always pleased, and there is a real argument underneath the grumbling: a quarter plot can feed a household salad, but it cannot feed a household.' },
          { label: 'G', text: 'There is also the question of what the plots are for. A council in the north of England attracted national attention when it began enforcing the cultivation rule strictly, issuing notices to tenants whose plots were more than a quarter uncultivated. Some of those tenants were growing flowers, keeping bees or, in one case, running a sensory garden for a local special school — none of which is straightforwardly "cultivation for the consumption of the household". The rules written in 1922 assume a tenant who needs the calories, and that assumption fits fewer and fewer of the people now queuing up.' },
          { label: 'H', text: 'What almost nobody proposes is more land. Creating new statutory allotments is expensive, slow and politically unrewarding, and the duty on councils to provide plots — which sounds strong, since six registered electors can formally demand provision — is qualified by the phrase "where the council is of the opinion that there is a demand", a form of words that has absorbed a great deal of legal argument. The likeliest future is therefore not a return to the million-and-a-half plots of 1945 but a slow reinvention: smaller plots, shared plots, orchards and growing spaces attached to schools and hospitals, and a gradual loosening of a definition written for a country that no longer exists.' }
        ],
        groups: [
          {
            kind: 'matching',
            title: 'Questions 28–33',
            instructions: 'The text has eight paragraphs, **A–H**.\n\nWhich paragraph contains the following information?\n\n' +
              'Write the correct letter, **A–H**. You may use any letter only once.',
            optionsTitle: 'Paragraphs',
            options: [{ k: 'A', t: 'Paragraph A' }, { k: 'B', t: 'Paragraph B' }, { k: 'C', t: 'Paragraph C' },
                      { k: 'D', t: 'Paragraph D' }, { k: 'E', t: 'Paragraph E' }, { k: 'F', t: 'Paragraph F' },
                      { k: 'G', t: 'Paragraph G' }, { k: 'H', t: 'Paragraph H' }],
            questions: [
              { n: 28, text: 'the reasons people now give for wanting a plot', answer: 'E',
                evidence: 'E: physical work outdoors and belonging come ahead of food.' },
              { n: 29, text: 'a legal protection that has preserved urban open space', answer: 'C',
                evidence: 'C: statutory allotment land cannot be sold without the Secretary of State\'s consent.' },
              { n: 30, text: 'a dispute about what tenants are allowed to grow', answer: 'G',
                evidence: 'G: notices issued over flowers, bees and a sensory garden.' },
              { n: 31, text: 'the length of time people may have to wait', answer: 'A',
                evidence: 'A: "In parts of London the wait can exceed fifteen years."' },
              { n: 32, text: 'why the number of plots fell after the 1940s', answer: 'D',
                evidence: 'D: rising incomes, supermarkets, freezers and demand for building land.' },
              { n: 33, text: 'the effect of dividing plots into smaller units', answer: 'F',
                evidence: 'F: halving and quartering plots multiplies tenants but reduces what each can grow.' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 34–37',
            instructions: 'Choose the correct letter, **A**, **B**, **C** or **D**.',
            questions: [
              { n: 34, text: 'What does the writer say about the original purpose of allotments?',
                options: [{ k: 'A', t: 'They were intended to improve the diet of city workers.' },
                          { k: 'B', t: 'They compensated for the loss of access to common land.' },
                          { k: 'C', t: 'They were created to increase national food production.' },
                          { k: 'D', t: 'They were first provided by central government.' }],
                answer: 'B', evidence: 'Paragraph B: enclosure removed the ability to graze or grow, and allotments were "a partial compensation for that loss".' },
              { n: 35, text: 'According to the text, the 1922 Act is still important today because it',
                options: [{ k: 'A', t: 'fixed the rent councils are allowed to charge.' },
                          { k: 'B', t: 'set the standard size of an allotment plot.' },
                          { k: 'C', t: 'defined what an allotment may be used for.' },
                          { k: 'D', t: 'transferred ownership of sites to tenants.' }],
                answer: 'C', evidence: 'Paragraph C: it "defined an allotment garden as land cultivated for the consumption of the tenant\'s household — a definition that still governs".' },
              { n: 36, text: 'The writer suggests that the argument about plot size',
                options: [{ k: 'A', t: 'is really about what an allotment is for.' },
                          { k: 'B', t: 'has been settled in favour of smaller plots.' },
                          { k: 'C', t: 'matters less than the length of the waiting lists.' },
                          { k: 'D', t: 'is confined to a small number of older tenants.' }],
                answer: 'A', evidence: 'Paragraph F: "there is a real argument underneath the grumbling: a quarter plot can feed a household salad, but it cannot feed a household."' },
              { n: 37, text: 'What does the writer expect to happen in future?',
                options: [{ k: 'A', t: 'Councils will be forced to buy substantial amounts of new land.' },
                          { k: 'B', t: 'Waiting lists will disappear as interest declines again.' },
                          { k: 'C', t: 'The legal duty on councils will be strengthened.' },
                          { k: 'D', t: 'The idea of an allotment will gradually broaden.' }],
                answer: 'D', evidence: 'Paragraph H: "a slow reinvention… a gradual loosening of a definition written for a country that no longer exists."' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 38–40',
            instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the text for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'ul', items: [
                'During the Second World War the [[38]] campaign raised the number of plots to about 1.5 million.',
                'A traditional full plot needs roughly [[39]] of work a week.',
                'A formal demand for allotments can be made by six [[40]].'
              ] }
            ],
            questions: [
              { n: 38, answer: 'Dig for Victory', accept: ['dig for victory'], maxWords: 3,
                evidence: 'Paragraph D: "the Dig for Victory campaign pushed the number of plots to around one and a half million".' },
              { n: 39, answer: 'eight hours', accept: ['8 hours'], evidence: 'Paragraph F: "something like eight hours a week".' },
              { n: 40, answer: 'registered electors', accept: ['electors'], evidence: 'Paragraph H: "six registered electors can formally demand provision".' }
            ]
          }
        ]
      }
    ]
  });
})();
