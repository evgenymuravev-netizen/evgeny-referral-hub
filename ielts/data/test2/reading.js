/* Practice Test 2 — Reading (Academic + General Training) */
(function () {

  /* ================================================================== */
  /*  ACADEMIC READING                                                  */
  /* ================================================================== */
  IELTSData.add('test2', 'readingAcademic', {
    sections: [

      /* ---------------------------------------------- PASSAGE 1 */
      {
        number: 1, heading: 'Questions 1–13',
        overTitle: 'READING PASSAGE 1 — You should spend about 20 minutes on Questions 1–13.',
        title: 'The animal that builds its own habitat',
        subtitle: 'Why Europe is deliberately reintroducing a rodent it spent five centuries exterminating',
        paras: [
          { text: 'The Eurasian beaver was once found from Spain to Siberia, in numbers that are hard to imagine now. It was hunted for its fur, for its meat, and above all for castoreum, a secretion used in perfume and, because it contains salicylic acid, in medicine. By 1900 the European population had fallen to around twelve hundred animals in eight isolated pockets, and in Britain the species had been gone for perhaps four hundred years. Almost nobody regretted its passing; a beaver was understood to be an obstacle to drainage and a nuisance to fishermen.' },
          { text: 'What changed was not sentiment but hydrology. Through the second half of the twentieth century, European rivers were straightened, deepened and embanked to move water off the land as quickly as possible, and the consequences arrived downstream. A catchment that once held water in a thousand small, messy places now delivered it to towns in a single pulse. Flood defences were raised, and raised again, and the floods continued to get worse. By the 1990s a number of hydrologists had begun to argue that the cheapest thing a government could do about flooding was to slow water down in the uplands — and that there was an animal which did this for nothing.' },
          { text: 'A beaver dam is not a wall. It is a leaky, deliberately porous structure of sticks and mud that holds back a pond and allows water to seep through it continuously. A series of such dams on a small stream converts a fast channel into a staircase of pools and wet ground. Monitoring on a Devon site where a pair was enclosed in 2011 recorded thirteen dams within a few hundred metres, storing around a thousand cubic metres of water. During storms, peak flows leaving the site were on average about thirty per cent lower than those entering it, and the water leaving was measurably cleaner, because sediment and dissolved nitrate had settled out in the ponds.' },
          { text: 'The effects on other species were larger than anyone predicted. Beaver ponds are shallow, sunlit and full of standing dead wood, a combination that has become scarce in managed landscapes. On the Devon site, the number of aquatic invertebrate species roughly tripled, and frog spawn clumps rose from ten in the first year to more than six hundred. Water voles, bats, dragonflies and wading birds all increased. Ecologists describe the beaver as a keystone species: an animal whose effect on a system is out of all proportion to its abundance, because it changes the physical structure of the habitat rather than simply living in it.' },
          { text: 'None of this makes reintroduction straightforward, and the difficulties are almost entirely about people rather than about beavers. A dam on a small watercourse can flood a field, block a culvert or undermine a track, and the losses fall on individual farmers while the flood-risk benefits accrue to a town twenty miles away. Bavaria, which has had beavers since the 1960s and now has more than twenty thousand, deals with this through a network of trained volunteers who respond within days, a state compensation fund, and a straightforward hierarchy of interventions: install a pipe through the dam to lower the water level, or fit a cage around a culvert, and only remove the animals when nothing else has worked.' },
          { text: 'Britain has taken a slower route. Beavers escaped or were released unofficially on the River Tay in Scotland in the early 2000s, and after several years of argument the Scottish government granted the population protected status in 2019 while permitting licensed control. In England, a five-year trial on the River Otter concluded in 2020 that the animals should be allowed to remain, and beavers became a protected species there in 2022. Licensing for wild release, however, remained tightly restricted for several years afterwards, largely because farming organisations wanted a management and compensation system agreed before, rather than after, the animals were in the rivers — a position that the Bavarian experience suggests is entirely reasonable.' }
        ],
        groups: [
          {
            kind: 'tfng',
            title: 'Questions 1–7',
            instructions: 'Do the following statements agree with the information given in Reading Passage 1?\n\n' +
              'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
            questions: [
              { n: 1, text: 'Castoreum was valued for both cosmetic and medical purposes.', answer: 'TRUE',
                evidence: 'Paragraph 1: "used in perfume and… in medicine".' },
              { n: 2, text: 'The disappearance of the beaver from Britain was widely regretted at the time.', answer: 'FALSE',
                evidence: 'Paragraph 1: "Almost nobody regretted its passing."' },
              { n: 3, text: 'River engineering in the twentieth century increased the speed at which water reached towns.', answer: 'TRUE',
                evidence: 'Paragraph 2: straightened and embanked rivers "delivered it to towns in a single pulse".' },
              { n: 4, text: 'Beaver dams are designed to stop water passing through them completely.', answer: 'FALSE',
                evidence: 'Paragraph 3: "a leaky, deliberately porous structure… allows water to seep through it continuously".' },
              { n: 5, text: 'The Devon study found that water leaving the beaver site contained less nitrate.', answer: 'TRUE',
                evidence: 'Paragraph 3: "sediment and dissolved nitrate had settled out in the ponds".' },
              { n: 6, text: 'Bavaria pays farmers more compensation than any other European region.', answer: 'NOT GIVEN',
                evidence: 'Paragraph 5 mentions a compensation fund but makes no comparison with other regions.' },
              { n: 7, text: 'Beavers were deliberately released into the River Tay by the Scottish government.', answer: 'FALSE',
                evidence: 'Paragraph 6: they "escaped or were released unofficially"; the government only later granted protection.' }
            ]
          },
          {
            kind: 'gap-bank',
            title: 'Questions 8–13',
            instructions: 'Complete the summary using the list of words, **A–J**, below.',
            optionsTitle: 'Word list',
            options: [
              { k: 'A', t: 'compensation' }, { k: 'B', t: 'invertebrates' }, { k: 'C', t: 'drainage' },
              { k: 'D', t: 'keystone' }, { k: 'E', t: 'sediment' }, { k: 'F', t: 'volunteers' },
              { k: 'G', t: 'dominant' }, { k: 'H', t: 'culverts' }, { k: 'I', t: 'tourism' }, { k: 'J', t: 'flooding' }
            ],
            blocks: [
              { t: 'h', text: 'Why beavers are being brought back' },
              { t: 'p', text: 'Hydrologists became interested in beavers because their dams slow water down and so reduce ' +
                '[[8]] further downstream. The ponds behind the dams also trap [[9]], which improves water quality. ' +
                'Because a beaver alters the physical structure of a river rather than merely occupying it, ecologists ' +
                'classify it as a [[10]] species: the number of aquatic [[11]] recorded at one English site increased ' +
                'roughly threefold. The main obstacles to reintroduction are social. In Bavaria, problems are handled by ' +
                'trained [[12]] who respond quickly, backed by a state fund that pays [[13]] to landowners who suffer damage.' }
            ],
            questions: [
              { n: 8, answer: 'J', evidence: 'Paragraph 2: slowing water in the uplands was proposed as the cheapest response to flooding.' },
              { n: 9, answer: 'E', evidence: 'Paragraph 3: "sediment and dissolved nitrate had settled out in the ponds".' },
              { n: 10, answer: 'D', evidence: 'Paragraph 4: "Ecologists describe the beaver as a keystone species".' },
              { n: 11, answer: 'B', evidence: 'Paragraph 4: "the number of aquatic invertebrate species roughly tripled".' },
              { n: 12, answer: 'F', evidence: 'Paragraph 5: "a network of trained volunteers who respond within days".' },
              { n: 13, answer: 'A', evidence: 'Paragraph 5: "a state compensation fund".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 2 */
      {
        number: 2, heading: 'Questions 14–26',
        overTitle: 'READING PASSAGE 2 — You should spend about 20 minutes on Questions 14–26.',
        title: 'In search of blue',
        subtitle: 'The most difficult colour in the history of art',
        paras: [
          { label: 'A', text: 'Blue is common in the sky and rare in the ground. Almost every other colour a painter might want can be dug up, ground and mixed with a binder: ochres and umbers from clay, black from charcoal, white from chalk, red from iron oxide or from the crushed bodies of insects. There is no comparably easy blue. The consequence is that for most of human history blue was not simply a colour but an expense, and its distribution across a painting tells you as much about the patron\'s finances as about the artist\'s intentions.' },
          { label: 'B', text: 'The Egyptians solved the problem first, and by manufacture rather than by extraction. Egyptian blue, in production by about 3300 BC, is made by heating sand, lime and a copper compound with a flux to around 900°C — a narrow temperature window, below which nothing happens and above which the product turns green. It is generally regarded as the first synthetic pigment of any kind. The recipe travelled around the Mediterranean, was used on Roman wall paintings, and then disappeared so completely after the fall of the western Empire that it was not identified again until chemists analysed Pompeian frescoes in the nineteenth century.' },
          { label: 'C', text: 'What replaced it in medieval Europe was the most expensive substance a painter ever handled. Ultramarine — the name means "from beyond the sea" — is made from lapis lazuli, and until the eighteenth century essentially all of it came from a single group of mines in what is now north-eastern Afghanistan. Grinding the stone is not enough; that produces a disappointing grey. The pigment has to be separated from the surrounding rock by kneading the powder in a wax and resin dough under warm water, a process that takes days and yields a small fraction of the original weight. At its peak, ultramarine cost more by weight than gold.' },
          { label: 'D', text: 'That cost had a direct effect on what was painted. Contracts between patrons and artists in fifteenth-century Italy routinely specified the grade of ultramarine to be used and where it was to be applied, sometimes down to the florin. Because the Virgin Mary\'s robe was conventionally painted in it, the depth of blue in an altarpiece functioned as a public statement of what a family had been willing to spend. Painters used cheaper azurite underneath and a thin ultramarine glaze on top, and where a commission ran short of money it is often the blue that was left unfinished.' },
          { label: 'E', text: 'The search for a substitute produced, by accident, the first modern synthetic pigment. In Berlin around 1706, a colour maker attempting to produce a red lake used potash that had been contaminated with animal blood, and obtained a deep blue instead. Prussian blue was being sold within a decade at a tiny fraction of the price of ultramarine, and its arrival is visible across European painting: skies deepen, shadows shift from brown towards blue, and the colour becomes available to artists who could never have afforded the alternative. It also travelled: the blues of Hokusai\'s wave prints, made in the 1830s, are imported Prussian blue.' },
          { label: 'F', text: 'Synthetic ultramarine followed in 1826, after the Société d\'Encouragement pour l\'Industrie Nationale in Paris offered a prize of six thousand francs for a process to make it industrially. Jean-Baptiste Guimet claimed it, and the price of the pigment collapsed from something comparable to gold to a few francs a kilogram within a generation. Chemically the synthetic product is nearly identical to the mineral; the difference lies in particle size and regularity, which is why some conservators can still distinguish them under a microscope and why a handful of painters continued to insist on the natural version long after there was any rational reason to.' },
          { label: 'G', text: 'The story has not ended. In 2009 a team at Oregon State University heating manganese oxide to 1200°C in search of new electronic materials pulled out a sample of an unexpected and intense blue. YInMn blue, as it was named after its constituent elements, is the first genuinely new inorganic blue pigment in more than two centuries. It is extremely stable, reflects infrared strongly enough to keep a painted roof measurably cooler, and — like every blue before it — is expensive, which suggests that the relationship between this colour and money is not yet over.' }
        ],
        groups: [
          {
            kind: 'matching',
            title: 'Questions 14–18',
            instructions: 'Reading Passage 2 has seven paragraphs, **A–G**.\n\n' +
              'Which paragraph contains the following information?\n\nWrite the correct letter, **A–G**. ' +
              'You may use any letter only once.',
            optionsTitle: 'Paragraphs',
            options: [{ k: 'A', t: 'Paragraph A' }, { k: 'B', t: 'Paragraph B' }, { k: 'C', t: 'Paragraph C' },
                      { k: 'D', t: 'Paragraph D' }, { k: 'E', t: 'Paragraph E' }, { k: 'F', t: 'Paragraph F' },
                      { k: 'G', t: 'Paragraph G' }],
            questions: [
              { n: 14, text: 'a pigment discovered while researching something unrelated', answer: 'G',
                evidence: 'G: YInMn was found by chemists working on electronic materials.' },
              { n: 15, text: 'a reward offered for solving a manufacturing problem', answer: 'F',
                evidence: 'F: the Paris prize of six thousand francs.' },
              { n: 16, text: 'the reason other colours were easier to obtain than blue', answer: 'A',
                evidence: 'A: ochres, black, white and red can all be dug up or crushed.' },
              { n: 17, text: 'written agreements that controlled how a colour was used', answer: 'D',
                evidence: 'D: contracts specifying the grade of ultramarine and where it should go.' },
              { n: 18, text: 'a technique that was lost for over a thousand years', answer: 'B',
                evidence: 'B: Egyptian blue "disappeared so completely" until the nineteenth century.' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 19–22',
            instructions: 'Choose the correct letter, **A**, **B**, **C** or **D**.',
            questions: [
              { n: 19, text: 'What made the manufacture of Egyptian blue difficult?',
                options: [{ k: 'A', t: 'The raw materials were hard to obtain.' },
                          { k: 'B', t: 'The temperature had to be tightly controlled.' },
                          { k: 'C', t: 'The process produced dangerous fumes.' },
                          { k: 'D', t: 'The colour faded quickly once applied.' }],
                answer: 'B', evidence: 'Paragraph B: "a narrow temperature window, below which nothing happens and above which the product turns green".' },
              { n: 20, text: 'Why is grinding lapis lazuli insufficient to produce ultramarine?',
                options: [{ k: 'A', t: 'The resulting powder is too coarse to paint with.' },
                          { k: 'B', t: 'The stone must first be heated.' },
                          { k: 'C', t: 'The colour produced is dull.' },
                          { k: 'D', t: 'Too much of the stone is wasted.' }],
                answer: 'C', evidence: 'Paragraph C: "that produces a disappointing grey".' },
              { n: 21, text: 'What does the writer say about the appearance of Prussian blue in European art?',
                options: [{ k: 'A', t: 'It was initially rejected by established painters.' },
                          { k: 'B', t: 'It changed the way shadows were painted.' },
                          { k: 'C', t: 'It was used mainly for printing rather than painting.' },
                          { k: 'D', t: 'It proved less durable than ultramarine.' }],
                answer: 'B', evidence: 'Paragraph E: "shadows shift from brown towards blue".' },
              { n: 22, text: 'According to the passage, synthetic and natural ultramarine can be told apart because of',
                options: [{ k: 'A', t: 'a difference in chemical composition.' },
                          { k: 'B', t: 'the way each responds to light.' },
                          { k: 'C', t: 'variations in the size of the particles.' },
                          { k: 'D', t: 'the binders each requires.' }],
                answer: 'C', evidence: 'Paragraph F: "the difference lies in particle size and regularity".' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 23–26',
            instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'ul', items: [
                'Egyptian blue is thought to be the earliest [[23]] pigment ever made.',
                'Almost all lapis lazuli used in Europe came from mines in present-day [[24]].',
                'Painters often applied a layer of [[25]] beneath a thin glaze of ultramarine.',
                'A surface painted with YInMn blue stays cooler because the pigment reflects [[26]].'
              ] }
            ],
            questions: [
              { n: 23, answer: 'synthetic', evidence: 'Paragraph B: "the first synthetic pigment of any kind".' },
              { n: 24, answer: 'Afghanistan', accept: ['north-eastern Afghanistan'], evidence: 'Paragraph C: "a single group of mines in what is now north-eastern Afghanistan".' },
              { n: 25, answer: 'azurite', evidence: 'Paragraph D: "Painters used cheaper azurite underneath".' },
              { n: 26, answer: 'infrared', evidence: 'Paragraph G: "reflects infrared strongly enough to keep a painted roof measurably cooler".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 3 */
      {
        number: 3, heading: 'Questions 27–40',
        overTitle: 'READING PASSAGE 3 — You should spend about 20 minutes on Questions 27–40.',
        title: 'The nudge, twenty years on',
        paras: [
          { text: 'Few ideas have moved from academic seminar to government department as quickly as the nudge. The proposition, set out by Richard Thaler and Cass Sunstein in 2008, is disarmingly modest: since the way a choice is presented always influences the decision, and since there is no neutral way to present it, the people who design choices — the "choice architects" — may as well arrange them so that the predictable errors of ordinary human beings lead to better outcomes. No option is removed and no price is changed. The classic instance is the default: enrol employees in a pension automatically and let them opt out, and participation rises from around sixty per cent to over ninety, because inertia now works in the saver\'s favour rather than against it.' },
          { text: 'Governments were enthusiastic in a way that is unusual for social science. The United Kingdom established a Behavioural Insights Team in 2010, the United States followed, and within a decade more than two hundred such units existed worldwide. The appeal is not difficult to understand: nudges are cheap, they can be implemented without legislation, and they promise results without the political cost of prohibition. Some of the early wins were real and are not disputed. Rewriting tax reminder letters to say that the great majority of people in the recipient\'s area had already paid brought forward substantial sums at essentially no cost, and the redesign of organ donor registration produced measurable increases in sign-ups.' },
          { text: 'Then came the reckoning that has arrived, in turn, for most of experimental psychology. Several of the findings on which the popular case for nudging rested proved fragile. Priming effects — the claim that exposure to words associated with old age makes people walk more slowly — largely failed to replicate. "Ego depletion", the idea that willpower is a finite resource consumed by use, has not survived large multi-laboratory testing. This did not invalidate the whole programme, since defaults and reminders were always its most robust components, but it did make the confident tone of the early popular books look unwise.' },
          { text: 'A more searching criticism came from Stefano DellaVigna and Elizabeth Linos, who in 2022 examined every trial run by two large American nudge units — 126 trials involving 23 million people. Their finding was not that nudges do not work. It was that they work about one-sixth as well as the published academic literature suggests: an average effect of roughly 1.4 percentage points against the 8.7 points implied by papers in journals. The gap is explained almost entirely by publication bias and by the small samples of academic studies. A nudge unit, running a trial on two million people with no incentive to publish only its successes, gets a truer and much smaller number.' },
          { text: 'Nick Chater and George Loewenstein have pressed a different objection, and it is the one that has proved hardest to answer. Their argument is that the popularity of the nudge is itself a political fact with consequences. If a government can be seen to address obesity by changing the position of food in a canteen, the pressure to do the difficult thing — to regulate advertising, to alter subsidies, to confront an industry — is relieved. They call this "i-frame" thinking, focused on the individual, and contend that it has systematically crowded out "s-frame" thinking about systems, sometimes with the active encouragement of industries that would much prefer to be nudged than regulated. On this account the nudge has not failed; it has succeeded as a distraction.' },
          { text: 'There is also the question of what is being nudged towards, and by whom. The same techniques that increase pension saving are used to make subscriptions difficult to cancel and to press users into sharing data they would not knowingly hand over — the practices now labelled "dark patterns" or "sludge". Thaler\'s own formulation, that a nudge must be easy and cheap to avoid and must be intended to make the chooser better off by their own judgement, is a clear enough principle; it is also unenforceable, since only the choice architect knows what was intended. Where the architect is a company optimising for engagement rather than a government optimising for retirement income, the principle offers no protection whatever.' },
          { text: 'What survives is narrower and more useful than the original claims. Defaults remain powerful, reminders work, simplifying a form works, and telling people accurately what their neighbours do works modestly and sometimes backfires. Effects are small, they decay, and they must be measured in the population that will actually experience them rather than borrowed from a study of undergraduates. Perhaps the most valuable legacy is not any particular nudge but the habit the field imposed: running a randomised trial before rolling out a policy, and being willing to publish the result when the answer is that nothing happened. That is a modest inheritance for a movement that once promised to redesign the state, and it is not nothing.' }
        ],
        groups: [
          {
            kind: 'matching',
            title: 'Questions 27–31',
            instructions: 'Look at the following statements and the list of people below.\n\n' +
              'Match each statement with the correct person or people, **A–E**.',
            optionsTitle: 'List of people',
            options: [
              { k: 'A', t: 'Richard Thaler and Cass Sunstein' },
              { k: 'B', t: 'Stefano DellaVigna and Elizabeth Linos' },
              { k: 'C', t: 'Nick Chater and George Loewenstein' },
              { k: 'D', t: 'Richard Thaler (alone)' },
              { k: 'E', t: 'the Behavioural Insights Team' }
            ],
            questions: [
              { n: 27, text: 'argued that presenting a choice neutrally is impossible', answer: 'A',
                evidence: 'Paragraph 1: "since there is no neutral way to present it".' },
              { n: 28, text: 'measured how much smaller real-world effects are than published ones', answer: 'B',
                evidence: 'Paragraph 4: 126 trials, 1.4 points against 8.7.' },
              { n: 29, text: 'claimed that focusing on individuals reduces pressure for structural reform', answer: 'C',
                evidence: 'Paragraph 5: "i-frame" thinking crowding out "s-frame" thinking.' },
              { n: 30, text: 'set out a test for whether an intervention is legitimate', answer: 'D',
                evidence: 'Paragraph 6: "Thaler\'s own formulation, that a nudge must be easy and cheap to avoid…".' },
              { n: 31, text: 'was the first organisation of its kind to be created by a government', answer: 'E',
                evidence: 'Paragraph 2: the UK established its unit in 2010 and "the United States followed".' }
            ]
          },
          {
            kind: 'ynng',
            title: 'Questions 32–36',
            instructions: 'Do the following statements agree with the claims of the writer in Reading Passage 3?\n\n' +
              'Write **YES**, **NO** or **NOT GIVEN**.',
            questions: [
              { n: 32, text: 'The replication problems in psychology showed that the entire nudge programme was worthless.', answer: 'NO',
                evidence: 'Paragraph 3: "This did not invalidate the whole programme."' },
              { n: 33, text: 'The difference between academic and real-world results is mainly due to which studies get published.', answer: 'YES',
                evidence: 'Paragraph 4: "The gap is explained almost entirely by publication bias and by the small samples".' },
              { n: 34, text: 'Thaler\'s test for an acceptable nudge cannot be applied in practice.', answer: 'YES',
                evidence: 'Paragraph 6: "it is also unenforceable, since only the choice architect knows what was intended".' },
              { n: 35, text: 'Governments adopted nudge units too quickly and should have waited for better evidence.', answer: 'NOT GIVEN',
                evidence: 'The writer explains why governments were enthusiastic and criticises the early confident tone, but never says adoption itself was premature.' },
              { n: 36, text: 'The requirement to test policies before adopting them is a worthwhile result of the movement.', answer: 'YES',
                evidence: 'Final paragraph: "the most valuable legacy is… running a randomised trial before rolling out a policy".' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 37–40',
            instructions: 'Complete the summary below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'h', text: 'What is left of the nudge' },
              { t: 'p', text: 'The most reliable technique remains the [[37]], which raises pension participation from about ' +
                '60 per cent to over 90. Reviewing 126 trials, DellaVigna and Linos found an average effect of ' +
                '[[38]] percentage points, roughly a sixth of the figure suggested by journal articles. Critics also ' +
                'point out that the same methods are used commercially in the form of [[39]], which are designed to ' +
                'work against the user\'s interests. The writer concludes that the field\'s main legacy is the practice ' +
                'of running a [[40]] before a policy is introduced.' }
            ],
            questions: [
              { n: 37, answer: 'default', accept: ['the default', 'defaults'], evidence: 'Paragraph 1: "The classic instance is the default".' },
              { n: 38, answer: '1.4', evidence: 'Paragraph 4: "an average effect of roughly 1.4 percentage points".' },
              { n: 39, answer: 'dark patterns', accept: ['sludge'], evidence: 'Paragraph 6: "the practices now labelled \'dark patterns\' or \'sludge\'".' },
              { n: 40, answer: 'randomised trial', accept: ['randomized trial', 'trial'], evidence: 'Final paragraph: "running a randomised trial before rolling out a policy".' }
            ]
          }
        ]
      }
    ]
  });

  /* ================================================================== */
  /*  GENERAL TRAINING READING                                          */
  /* ================================================================== */
  IELTSData.add('test2', 'readingGeneral', {
    sections: [

      /* ---------------------------------------------- SECTION 1 */
      {
        number: 1, heading: 'Questions 1–6', tabLabel: 'S1 · Text A', paletteLabel: 'S1a',
        overTitle: 'SECTION 1 — Questions 1–14. You should spend about 20 minutes on this section.',
        title: 'Text A — Willowbrook Community Centre: hiring a room',
        paras: [
          { text: 'Four rooms are available to hire. All bookings must be made through the online system at least five working days in advance; we cannot take bookings by telephone or at the desk.' },
          { t: 'table',
            head: ['Room', 'Capacity', 'Rate (standard)', 'Rate (local groups)'],
            rows: [
              ['The Hall', '120 seated', '£38 per hour', '£19 per hour'],
              ['Oak Room', '40 seated', '£24 per hour', '£12 per hour'],
              ['Sycamore Room', '18 around a table', '£16 per hour', '£8 per hour'],
              ['Studio', '25 (no chairs)', '£20 per hour', '£10 per hour']
            ] },
          { text: 'The reduced rate applies to registered charities, residents\' associations and any group in which at least three-quarters of members live within the WB postcode area. You will be asked to provide evidence once a year, not at every booking.' },
          { t: 'h', text: 'What is included' },
          { text: 'Tables, chairs, wifi and use of the kitchen are included in all bookings. The Hall has a projector and a sound system; the Oak Room has a screen but you must bring your own laptop and cable. Tea and coffee for up to thirty people can be ordered in advance at £1.20 a head. We do not provide crockery for hot food.' },
          { t: 'h', text: 'Conditions' },
          { text: 'Bookings run from the start of the hour and you must be out of the building by the end of your final hour — this includes clearing up, so allow for it. A refundable deposit of £50 is taken for evening bookings in the Hall. Cancellations made more than seven days ahead are refunded in full; after that, half the fee is retained. The centre is closed on public holidays and for the last week of August.' }
        ],
        groups: [{
          kind: 'tfng',
          title: 'Questions 1–6',
          instructions: 'Do the following statements agree with the information given in Text A?\n\n' +
            'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
          questions: [
            { n: 1, text: 'Rooms can be booked in person at the reception desk.', answer: 'FALSE',
              evidence: '"we cannot take bookings by telephone or at the desk".' },
            { n: 2, text: 'A group must prove its eligibility for the reduced rate every time it books.', answer: 'FALSE',
              evidence: '"evidence once a year, not at every booking".' },
            { n: 3, text: 'Anyone hiring the Oak Room needs to supply their own computer.', answer: 'TRUE',
              evidence: '"the Oak Room has a screen but you must bring your own laptop and cable".' },
            { n: 4, text: 'Time spent tidying up counts as part of the hire period.', answer: 'TRUE',
              evidence: '"you must be out of the building by the end of your final hour — this includes clearing up".' },
            { n: 5, text: 'A booking cancelled four days beforehand is refunded in full.', answer: 'FALSE',
              evidence: 'Full refunds apply only more than seven days ahead; after that half is retained.' },
            { n: 6, text: 'The Studio is the least expensive room to hire.', answer: 'FALSE',
              evidence: 'The Sycamore Room is £16 an hour, cheaper than the Studio at £20.' }
          ]
        }]
      },

      {
        number: 1, heading: 'Questions 7–14', tabLabel: 'S1 · Text B', paletteLabel: 'S1b',
        overTitle: 'SECTION 1 (continued)',
        title: 'Text B — Cycle to Work: a guide for employees',
        paras: [
          { text: 'The Cycle to Work scheme lets you get a bicycle and safety equipment through your employer and pay for it out of your gross salary, which means you do not pay income tax or National Insurance on that amount. Most people save between 28 and 42 per cent of the retail price, depending on their tax band.' },
          { t: 'h', text: 'How it works' },
          { text: 'Choose a bicycle at any participating retailer and ask them for a quotation. Upload the quotation to the staff portal. Once your line manager has approved it — normally within three working days — you will be sent an electronic voucher to take to the shop. The value of the voucher is then deducted from your pay in twelve equal monthly instalments.' },
          { t: 'h', text: 'What you can get' },
          { text: 'Any type of pedal cycle is eligible, including electric bicycles, folding bicycles and cargo bicycles. Safety equipment may be included in the same application: helmets, lights, locks, mudguards, reflective clothing and a pump. Child seats and trailers are allowed. Bicycle computers, turbo trainers and clothing that is not high-visibility are not. There is no upper limit on the value of the package, but requests above £3,000 need finance director approval.' },
          { t: 'h', text: 'Conditions' },
          { text: 'You must use the bicycle for commuting on at least half of the journeys you make on it; there is no requirement to keep records, but the scheme exists for this purpose. Ownership stays with the employer during the hire period. At the end of the twelve months you will be offered the option of extending the hire for a further 36 months at no cost, after which the bicycle becomes yours; taking ownership immediately at 12 months instead attracts a fee set by HMRC.' },
          { t: 'h', text: 'If your circumstances change' },
          { text: 'If you leave the company before the twelve months are up, the outstanding balance is taken from your final salary after tax, so the saving on that portion is lost. If the bicycle is stolen you remain liable for the remaining payments, which is why we strongly recommend adding it to your home insurance. Applications open twice a year, in March and September.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 7–14',
          instructions: 'Complete the notes below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from Text B for each answer.',
          maxWords: 3,
          blocks: [
            { t: 'h', text: 'CYCLE TO WORK — KEY POINTS' },
            { t: 'ul', items: [
              'Typical saving: between [[7]] per cent of the price.',
              'A [[8]] from the shop must be uploaded to the staff portal.',
              'Approval by a line manager usually takes [[9]].',
              'The cost is spread over [[10]] monthly payments.',
              'Items not allowed include turbo trainers and [[11]].',
              'Applications over [[12]] must be approved by the finance director.',
              'The bicycle should be used for [[13]] on at least half of all journeys.',
              'Employees are advised to add the bicycle to their [[14]].'
            ] }
          ],
          questions: [
            { n: 7, answer: '28 and 42', accept: ['28 to 42', '28-42'], evidence: '"between 28 and 42 per cent of the retail price".' },
            { n: 8, answer: 'quotation', accept: ['quote'], evidence: '"ask them for a quotation. Upload the quotation to the staff portal."' },
            { n: 9, answer: 'three working days', accept: ['3 working days'], evidence: '"normally within three working days".' },
            { n: 10, answer: 'twelve', accept: ['12', 'twelve equal'], evidence: '"twelve equal monthly instalments".' },
            { n: 11, answer: 'bicycle computers', accept: ['computers'], evidence: '"Bicycle computers, turbo trainers and clothing that is not high-visibility are not."' },
            { n: 12, answer: '£3,000', accept: ['3000', '£3000', '3,000'], evidence: '"requests above £3,000 need finance director approval".' },
            { n: 13, answer: 'commuting', evidence: '"You must use the bicycle for commuting on at least half of the journeys".' },
            { n: 14, answer: 'home insurance', accept: ['insurance'], evidence: '"we strongly recommend adding it to your home insurance".' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 2 */
      {
        number: 2, heading: 'Questions 15–21', tabLabel: 'S2 · Text C', paletteLabel: 'S2a',
        overTitle: 'SECTION 2 — Questions 15–27. You should spend about 20 minutes on this section.',
        title: 'Text C — Your first two weeks: a guide for new starters',
        paras: [
          { label: 'A', text: 'Nobody expects you to be productive in your first fortnight, and the single most common mistake new starters make is trying to be. The purpose of these two weeks is to understand how work actually moves through this organisation, who decides what, and where the informal knowledge sits. Everything else can wait.' },
          { label: 'B', text: 'Your laptop, security pass and system accounts should all be ready on your first morning. If any of them is not, tell your manager immediately rather than waiting to see whether it resolves itself — IT tickets raised on day one are prioritised, and tickets raised in week three are not. You will need to complete the online security and data protection modules before your accounts are fully enabled; these take about ninety minutes in total.' },
          { label: 'C', text: 'You will be assigned a buddy, who will be someone at roughly your own level in a different team. This is deliberately not your manager and not a formal mentor. A buddy is the person you ask the questions you would feel awkward asking anyone else: where people actually eat lunch, whether that meeting is really compulsory, what the tone of an internal email should be. Buddies are asked to have coffee with you twice in the first two weeks and then as often as suits you both.' },
          { label: 'D', text: 'Your manager will book a one-to-one for the end of week one and another for the end of week two, and then a standing fortnightly slot. Come to the first one with questions rather than a report. By the end of week two the two of you should have written down three objectives for your first three months; these are not performance targets and will not be used in your probation review, which is a separate conversation held at month five.' },
          { label: 'E', text: 'Expenses, holiday and sick leave are all handled in the same portal, and the deadline for submitting expenses is the last working day of the month in which they were incurred. Holiday must be requested at least two weeks in advance except in an emergency. New starters accrue leave from the first day but may not take more than five days before the end of the probation period without written agreement.' },
          { label: 'F', text: 'You will be invited to a great many meetings in your first fortnight, and you should decline about half of them. Ask your buddy or your manager which are genuinely useful. Declining a meeting politely is a normal and expected behaviour here and nobody will think less of you for it; sitting silently in a meeting you did not understand for an hour is a waste of your time and everyone else\'s.' },
          { label: 'G', text: 'Finally, keep a written note of everything that confuses you. In four weeks you will have stopped noticing these things, and your fresh view of where the process is illogical is genuinely valuable — several of the changes we made last year came from new starters\' notes. Send the list to your manager at the end of the first month, unedited.' }
        ],
        groups: [{
          kind: 'matching',
          title: 'Questions 15–21',
          instructions: 'Text C has seven paragraphs, **A–G**.\n\nWhich paragraph contains the following information?\n\n' +
            'Write the correct letter, **A–G**. You may use any letter only once.',
          optionsTitle: 'Paragraphs',
          options: [{ k: 'A', t: 'Paragraph A' }, { k: 'B', t: 'Paragraph B' }, { k: 'C', t: 'Paragraph C' },
                    { k: 'D', t: 'Paragraph D' }, { k: 'E', t: 'Paragraph E' }, { k: 'F', t: 'Paragraph F' },
                    { k: 'G', t: 'Paragraph G' }],
          questions: [
            { n: 15, text: 'advice on refusing invitations', answer: 'F', evidence: 'F: "you should decline about half of them".' },
            { n: 16, text: 'a request to record your early impressions', answer: 'G', evidence: 'G: "keep a written note of everything that confuses you".' },
            { n: 17, text: 'rules about taking time off', answer: 'E', evidence: 'E: holiday must be requested two weeks ahead; five-day limit in probation.' },
            { n: 18, text: 'what a new starter should not attempt to do', answer: 'A', evidence: 'A: "the single most common mistake new starters make is trying to be [productive]".' },
            { n: 19, text: 'the reason for reporting a problem straight away', answer: 'B', evidence: 'B: "IT tickets raised on day one are prioritised".' },
            { n: 20, text: 'when goals for the coming months are agreed', answer: 'D', evidence: 'D: "By the end of week two… three objectives for your first three months".' },
            { n: 21, text: 'the role of a colleague who is not in your team', answer: 'C', evidence: 'C: the buddy, "someone at roughly your own level in a different team".' }
          ]
        }]
      },

      {
        number: 2, heading: 'Questions 22–27', tabLabel: 'S2 · Text D', paletteLabel: 'S2b',
        overTitle: 'SECTION 2 (continued)',
        title: 'Text D — Working safely with display screen equipment',
        paras: [
          { text: 'Anyone who uses a computer for more than an hour a day as a significant part of their normal work is classed as a display screen equipment (DSE) user and is entitled to the arrangements set out below. This applies equally to work done at home.' },
          { t: 'h', text: 'Assessment' },
          { text: 'Every user must complete a self-assessment within four weeks of starting and again whenever their workstation changes significantly — a move to a different desk, a new chair, or a change in the equipment they use. The assessment is done online and takes about twenty minutes. Where it identifies a problem that you cannot resolve yourself, a member of the health and safety team will arrange a face-to-face review, normally within ten working days.' },
          { t: 'h', text: 'Setting up your workstation' },
          { text: 'The top of the screen should be at or just below eye level and roughly an arm\'s length away. Your forearms should be approximately horizontal when typing, and your feet flat on the floor or on a footrest. Position the screen so that windows are to the side rather than in front of or behind you; reflections are the most frequent cause of the eye strain reported to us. Documents you copy from should be at the same height and distance as the screen, which is what a document holder is for.' },
          { t: 'h', text: 'Breaks' },
          { text: 'Short, frequent breaks are considerably more effective than occasional long ones: five minutes away from the screen every hour is better than twenty minutes every three hours. A break does not have to mean stopping work — a task that does not involve a screen counts. Where the work is machine-paced and the user cannot choose when to break, the pattern of breaks must be built into the job design.' },
          { t: 'h', text: 'Eye tests' },
          { text: 'You may request an eye test at the company\'s expense at any time, and one is offered every two years as a matter of course. If the optician states that you need spectacles specifically for screen work — as distinct from a general prescription you would need anyway — the company will contribute up to £70 towards basic frames and lenses. Keep the receipt; claims cannot be processed without one.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 22–27',
          instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from Text D for each answer.',
          maxWords: 3,
          blocks: [
            { t: 'ul', items: [
              'The rules also cover employees who work at [[22]].',
              'A new self-assessment is required within [[23]] of joining the company.',
              'A face-to-face review normally happens within [[24]] of a problem being identified.',
              'The most commonly reported cause of eye strain is [[25]].',
              'Taking [[26]] every hour is more useful than one long break.',
              'The company pays up to [[27]] towards glasses needed only for screen work.'
            ] }
          ],
          questions: [
            { n: 22, answer: 'home', evidence: '"This applies equally to work done at home."' },
            { n: 23, answer: 'four weeks', accept: ['4 weeks'], evidence: '"a self-assessment within four weeks of starting".' },
            { n: 24, answer: 'ten working days', accept: ['10 working days'], evidence: '"normally within ten working days".' },
            { n: 25, answer: 'reflections', evidence: '"reflections are the most frequent cause of the eye strain reported to us".' },
            { n: 26, answer: 'five minutes', accept: ['5 minutes'], evidence: '"five minutes away from the screen every hour".' },
            { n: 27, answer: '£70', accept: ['70'], evidence: '"the company will contribute up to £70".' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 3 */
      {
        number: 3, heading: 'Questions 28–40', tabLabel: 'Section 3', paletteLabel: 'S3',
        overTitle: 'SECTION 3 — Questions 28–40. You should spend about 20 minutes on this section.',
        title: 'The unlikely rise of the paperback',
        paras: [
          { label: 'A', text: 'On 30 July 1935 a publisher called Allen Lane put ten paperback books on sale at sixpence each — the price of a packet of cigarettes. The trade thought he was mad. Cheap paper-covered books already existed and were regarded as disposable rubbish: badly printed reprints of out-of-copyright novels, sold at railway stations and thrown away at the end of the journey. What Lane proposed was different only in one respect, but it was the respect that mattered. His sixpenny books would be good ones.' },
          { label: 'B', text: 'The origin story, which Lane told often enough that it may even be true, is that he spent a weekend with Agatha Christie and, waiting for his train home at Exeter station, found nothing on the bookstall he was willing to read. The economics that followed were brutal and simple. At sixpence there was no margin at all on a print run of a few thousand; the whole thing worked only at seventeen thousand copies per title, which was an enormous gamble in a trade accustomed to editions of two or three thousand.' },
          { label: 'C', text: 'The gamble was saved by an order from a chain of retailers that did not sell books at all. Woolworths took a substantial quantity — the figure usually quoted is sixty-three thousand — reportedly because the buyer\'s wife happened to be in the office and thought the books looked attractive. Whether or not that detail is accurate, the principle was the one Lane had grasped: the market for cheap serious books was not in bookshops, which most people never entered, but in the places where people already were.' },
          { label: 'D', text: 'The design did as much work as the price. The covers carried no illustration: a horizontal band of colour top and bottom, a white band across the middle with the title in Gill Sans, and the little penguin drawn by a junior office worker who had been sent to London Zoo to sketch one. Colour indicated genre — orange for fiction, green for crime, blue for biography, cerise for travel — so that a reader could identify what they wanted from three metres away. The absence of pictures was partly a matter of cost and partly a signal: these were not the sort of books that needed a lurid cover to sell.' },
          { label: 'E', text: 'Within a year the company had sold three million copies, and imitators appeared immediately. What Lane did next was more interesting than the paperback itself. In 1937 he launched Pelican, a list of original non-fiction commissioned specifically for the series and written by serious authors for general readers — the first title was George Bernard Shaw on economics. Pelicans sold in extraordinary numbers to people who had left school at fourteen, and it is not a great exaggeration to say that a generation of British autodidacts was educated by them. During the war, Penguin books were supplied to the armed forces in vast quantities, and the Forces Book Club shaped the reading habits of a cohort who returned home expecting to be able to buy books.' },
          { label: 'F', text: 'The model was not universally admired. Booksellers disliked the tiny margin per copy. Some authors and publishers argued that cheap reprints cannibalised hardback sales, an argument that has been made about every new format since and has usually turned out to be wrong: the paperback largely reached people who were not buying hardbacks at all. There was also a strand of straightforward snobbery, expressed as concern that making difficult books cheap would somehow debase them.' },
          { label: 'G', text: 'What eventually changed the paperback was not opposition but success. As the format became the standard rather than the exception, the reasons for restraint disappeared. Covers acquired photographs, then embossing and foil; the price rose, slowly at first and then steeply, until a mass-market paperback cost roughly what a cheap hardback had once cost in real terms. The typographic austerity that had signalled seriousness in 1935 became, by the 1970s, a design style that could itself be sold at a premium — and Penguin now reissues its own early covers as posters and mugs.' },
          { label: 'H', text: 'The lesson historians of publishing usually draw is that Lane did not invent anything. Paperbacks existed; so did cheap reprints, and so did the idea of a uniform series. What he did was to reject the assumption underneath all of them — that a cheap book must be a bad book — and then to price, design and distribute on the basis of that rejection. It is a reminder that the decisive move in a mature industry is often not a new technology but the abandonment of a belief that everybody in it holds.' }
        ],
        groups: [
          {
            kind: 'headings',
            title: 'Questions 28–33',
            instructions: 'The text has eight paragraphs, **A–H**.\n\nChoose the correct heading for paragraphs **C–H** ' +
              'from the list of headings below.',
            optionsTitle: 'List of headings',
            options: [
              { k: 'i', t: 'Objections from within the trade' },
              { k: 'ii', t: 'An order from an unexpected customer' },
              { k: 'iii', t: 'The real innovation was an assumption discarded' },
              { k: 'iv', t: 'Losing the restraint that made it distinctive' },
              { k: 'v', t: 'How the covers were made to do the selling' },
              { k: 'vi', t: 'A wartime shortage of paper' },
              { k: 'vii', t: 'Expanding from fiction into education' },
              { k: 'viii', t: 'The arithmetic behind the price' },
              { k: 'ix', t: 'Competing formats overseas' }
            ],
            questions: [
              { n: 28, text: 'Paragraph C', answer: 'ii', evidence: 'C: the Woolworths order of sixty-three thousand copies.' },
              { n: 29, text: 'Paragraph D', answer: 'v', evidence: 'D: colour-coded bands, Gill Sans, no illustration.' },
              { n: 30, text: 'Paragraph E', answer: 'vii', evidence: 'E: the Pelican list of original non-fiction.' },
              { n: 31, text: 'Paragraph F', answer: 'i', evidence: 'F: booksellers\' margins, cannibalisation, snobbery.' },
              { n: 32, text: 'Paragraph G', answer: 'iv', evidence: 'G: photographs, foil, rising prices — austerity abandoned.' },
              { n: 33, text: 'Paragraph H', answer: 'iii', evidence: 'H: "he did not invent anything… he rejected the assumption".' }
            ]
          },
          {
            kind: 'tfng',
            title: 'Questions 34–37',
            instructions: 'Do the following statements agree with the information given in the text?\n\n' +
              'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
            questions: [
              { n: 34, text: 'Paper-covered books were a new idea in 1935.', answer: 'FALSE',
                evidence: 'Paragraph A: "Cheap paper-covered books already existed".' },
              { n: 35, text: 'Lane needed to sell about 17,000 copies of a title before it made any money.', answer: 'TRUE',
                evidence: 'Paragraph B: "the whole thing worked only at seventeen thousand copies per title".' },
              { n: 36, text: 'The penguin logo was drawn by a professional illustrator.', answer: 'FALSE',
                evidence: 'Paragraph D: it was drawn by "a junior office worker".' },
              { n: 37, text: 'The claim that cheap editions damage hardback sales has generally proved incorrect.', answer: 'TRUE',
                evidence: 'Paragraph F: "has usually turned out to be wrong".' }
            ]
          },
          {
            kind: 'short',
            title: 'Questions 38–40',
            instructions: 'Answer the questions below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from the text for each answer.',
            maxWords: 3,
            questions: [
              { n: 38, text: 'What colour were the covers of Penguin crime novels?', answer: 'green',
                evidence: 'Paragraph D: "green for crime".' },
              { n: 39, text: 'Which series did Lane launch in 1937?', answer: 'Pelican', accept: ['the Pelican list'],
                evidence: 'Paragraph E: "In 1937 he launched Pelican".' },
              { n: 40, text: 'Where did Lane say he had failed to find anything to read?',
                answer: 'Exeter station', accept: ['at Exeter station', 'the bookstall', 'Exeter'],
                evidence: 'Paragraph B: "waiting for his train home at Exeter station".' }
            ]
          }
        ]
      }
    ]
  });
})();
