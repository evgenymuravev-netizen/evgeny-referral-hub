/* Practice Test 3 — Reading (Academic + General Training) */
(function () {

  /* ================================================================== */
  /*  ACADEMIC READING                                                  */
  /* ================================================================== */
  IELTSData.add('test3', 'readingAcademic', {
    sections: [

      /* ---------------------------------------------- PASSAGE 1 */
      {
        number: 1, heading: 'Questions 1–13',
        overTitle: 'READING PASSAGE 1 — You should spend about 20 minutes on Questions 1–13.',
        title: 'Looking for silence',
        subtitle: 'Why the disappearance of quiet is now treated as an environmental problem',
        paras: [
          { text: 'In 2005 the acoustic ecologist Gordon Hempton set out to identify places in the continental United States where a listener could hear no human-made sound for fifteen minutes at a time, from before dawn. He found very few. His criterion was not silence in the ordinary sense — the places he was looking for are full of wind, water and birds — but the absence of engines, and by that measure a landscape the size of a continent had almost run out. Aircraft alone are the difficulty: a jet at cruising altitude is audible on the ground across a circle roughly eighty kilometres wide.' },
          { text: 'For most of the twentieth century, noise was regulated as a nuisance, which is to say as an annoyance suffered by individuals who could, in principle, move away. It is now treated rather differently. The World Health Organization\'s European office has estimated that environmental noise costs the region over a million healthy life-years annually, principally through sleep disturbance and cardiovascular disease. The mechanism is not mysterious. A sleeping body still processes sound, and a sudden noise produces a measurable rise in heart rate and a release of stress hormones even when the sleeper does not wake and remembers nothing in the morning. Repeated nightly over years, that response is associated with raised blood pressure and an elevated risk of heart disease.' },
          { text: 'Two findings have been particularly influential. A long-running study around a major European airport found that residents exposed to aircraft noise above a certain nightly threshold had a significantly higher incidence of hypertension than comparable residents further away, after adjusting for income, smoking and air pollution. Separately, work in London schools reported that children in classrooms under a flight path were, on average, several months behind in reading comprehension compared with children in otherwise similar schools in quieter areas — a gap that persisted when social background was controlled for. Neither study establishes cause on its own, but the pattern has been repeated often enough that most public health bodies now treat noise as a genuine exposure rather than a matter of taste.' },
          { text: 'What counts as noise, however, is not simply a matter of decibels. Perceived loudness depends heavily on the meaning a listener attaches to a sound. Studies of "noise annoyance" consistently find that people tolerate the noise of an activity they benefit from or approve of far better than an identical level from a source they resent, and that a sense of control matters more than volume: a neighbour\'s music at 45 decibels can be far more disturbing than a motorway at 55. This is why engineering solutions alone often disappoint. Residents near a new bypass frequently report no improvement even where measurements show a real reduction, because the change is smaller than the shift in what they now expect.' },
          { text: 'Efforts to protect quiet have therefore taken two rather different forms. The first is regulatory and largely technical: quieter road surfaces, restrictions on night flights, the European requirement that large cities produce noise maps and action plans, and rules for electric vehicles, which had to be given artificial sound at low speeds because they were too quiet to be safe. The second is preservationist. In 2019 Hempton\'s organisation certified a valley in New Zealand as the world\'s first "wilderness quiet park", an idea that depends on airlines voluntarily routing around it. Several national parks in the United States now manage their soundscape explicitly, treating audible engine noise as they would litter.' },
          { text: 'There is a reasonable objection to all of this, which is that quiet is easily made into a luxury. The people most exposed to traffic and aircraft noise are, almost everywhere, the people with the least ability to move, and a campaign to preserve silence in remote valleys does nothing for them. The stronger version of the argument runs the other way: if noise is an exposure with measurable health effects, then unequal exposure to it is a health inequality like any other, and the valley is not the point. What the search for quiet places has usefully done is to establish a baseline — a record of what a landscape sounds like without us — against which everywhere else can be measured.' }
        ],
        groups: [
          {
            kind: 'tfng',
            title: 'Questions 1–7',
            instructions: 'Do the following statements agree with the information given in Reading Passage 1?\n\n' +
              'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
            questions: [
              { n: 1, text: 'Hempton was searching for places with no natural sound.', answer: 'FALSE',
                evidence: 'Paragraph 1: "not silence in the ordinary sense — the places he was looking for are full of wind, water and birds".' },
              { n: 2, text: 'A single high-altitude aircraft can be heard over a very wide area.', answer: 'TRUE',
                evidence: 'Paragraph 1: "audible on the ground across a circle roughly eighty kilometres wide".' },
              { n: 3, text: 'People can be physically affected by noise while remaining asleep.', answer: 'TRUE',
                evidence: 'Paragraph 2: heart rate rises and stress hormones are released "even when the sleeper does not wake".' },
              { n: 4, text: 'The airport study proved that aircraft noise causes high blood pressure.', answer: 'FALSE',
                evidence: 'Paragraph 3: "Neither study establishes cause on its own."' },
              { n: 5, text: 'The London school study found the reading gap disappeared once social background was taken into account.', answer: 'FALSE',
                evidence: 'Paragraph 3: "a gap that persisted when social background was controlled for".' },
              { n: 6, text: 'Electric vehicles were required to produce sound for safety reasons.', answer: 'TRUE',
                evidence: 'Paragraph 5: "they were too quiet to be safe".' },
              { n: 7, text: 'The New Zealand quiet park attracts more visitors than similar sites elsewhere.', answer: 'NOT GIVEN',
                evidence: 'Paragraph 5 mentions the certification but says nothing about visitor numbers.' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 8–13',
            instructions: 'Complete the summary below.\n\nChoose **NO MORE THAN TWO WORDS** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'h', text: 'Why noise is now a public health question' },
              { t: 'p', text: 'Noise was formerly regulated as a [[8]], on the assumption that anyone affected could ' +
                'simply move elsewhere. It is now linked to sleep disturbance and [[9]] disease, and is estimated to ' +
                'cost Europe more than a million healthy life-years a year. How disturbing a sound is felt to be does ' +
                'not depend only on its volume: research into noise [[10]] shows that a sense of [[11]] over the source ' +
                'matters a great deal. Responses fall into two groups. Technical measures include quieter road surfaces ' +
                'and a European obligation on large cities to produce [[12]]. Preservation efforts have led some ' +
                'American national parks to treat engine noise in the same way as [[13]].' }
            ],
            questions: [
              { n: 8, answer: 'nuisance', evidence: 'Paragraph 2: "noise was regulated as a nuisance".' },
              { n: 9, answer: 'cardiovascular', accept: ['heart'], evidence: 'Paragraph 2: "sleep disturbance and cardiovascular disease".' },
              { n: 10, answer: 'annoyance', evidence: 'Paragraph 4: \'Studies of "noise annoyance"…\'' },
              { n: 11, answer: 'control', evidence: 'Paragraph 4: "a sense of control matters more than volume".' },
              { n: 12, answer: 'noise maps', accept: ['maps', 'action plans'], evidence: 'Paragraph 5: "the European requirement that large cities produce noise maps and action plans".' },
              { n: 13, answer: 'litter', evidence: 'Paragraph 5: "treating audible engine noise as they would litter".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 2 */
      {
        number: 2, heading: 'Questions 14–26',
        overTitle: 'READING PASSAGE 2 — You should spend about 20 minutes on Questions 14–26.',
        title: 'The longitude problem',
        paras: [
          { text: 'Finding your latitude at sea is straightforward and has been for a very long time: measure the height of the sun at noon, or of the Pole Star at night, consult a table, and you have your distance from the equator to within a few miles. Longitude is a different order of problem, and for three centuries it defeated the best mathematicians in Europe. The reason is that the Earth turns. There is no fixed east–west marker in the sky; the only way to know how far east or west you are is to compare the local time, which you can read from the sun, with the time at some reference place. Every hour of difference is fifteen degrees. To know the time somewhere else, at sea, in 1700, was the whole difficulty.' },
          { text: 'The consequences were not academic. In October 1707 a returning British fleet under Admiral Sir Cloudesley Shovell, believing itself to be safely west of the Isles of Scilly, struck them in fog and lost four ships and around fifteen hundred men. The disaster was one of the worst in British naval history and it concentrated official attention. In 1714 Parliament passed the Longitude Act, offering up to £20,000 — an enormous sum, equivalent to millions today — for a method of determining longitude at sea to within half a degree, and establishing a Board of Longitude to judge the claims.' },
          { text: 'Two serious approaches were in contention, and the difference between them was as much cultural as technical. The astronomical method, favoured by almost the entire scientific establishment, used the Moon. The Moon moves against the background stars fast enough to serve as a clock, and if the angle between it and a known star could be measured accurately, and if tables predicting that angle at a reference location were available, a navigator could calculate the reference time. Isaac Newton, who advised Parliament, considered this the only route with any prospect of success, and Edmond Halley spent much of his career on the necessary observations. The method eventually worked, but each calculation took a trained officer around four hours and depended on tables that did not exist in usable form until Nevil Maskelyne published the first Nautical Almanac in 1767.' },
          { text: 'The mechanical alternative was to carry the reference time with you in a clock. This was widely regarded as impossible. A pendulum is useless on a moving ship; metals expand and contract with temperature, changing the rate of any mechanism; oil thickens in cold and thins in heat; and salt air corrodes everything. Newton dismissed the idea in evidence to Parliament, and he was expressing the consensus rather than an eccentric view.' },
          { text: 'John Harrison was a Lincolnshire carpenter with no formal training who had built clocks out of wood. Between 1730 and 1760 he produced a series of sea clocks that solved these problems one at a time. His first, H1, weighed thirty-four kilograms and used two linked balances so that the motion of the ship affected both equally and cancelled out. He invented a bimetallic strip, in which brass and steel expand at different rates and bend, automatically compensating for temperature. He used lignum vitae, a self-lubricating tropical hardwood, for bearings so that no oil was needed. Then, in his sixties, he abandoned the whole approach and produced H4, which was not a clock at all but a large watch, thirteen centimetres across, running at five beats a second.' },
          { text: 'H4 was tested on a voyage to Jamaica in 1761 and lost 5.1 seconds in eighty-one days, an error in longitude of about one and a quarter nautical miles — well inside the terms of the Act. The Board did not pay. Its chairman by this point was Maskelyne, the Astronomer Royal and the principal advocate of the lunar method, and the Board argued, not unreasonably in principle, that a single watch performing well once proved nothing about whether such watches could be made reliably or in quantity. Harrison was required to hand over his drawings, to surrender H4 and his earlier machines, and to build two more copies. He received payments in stages, and only after a personal appeal to George III did Parliament finally vote him a further sum in 1773, three years before his death. He was never awarded the prize itself.' },
          { text: 'The usual telling of this story is a straightforward one of a craftsman robbed by an academic establishment, and Maskelyne has generally come off badly in it. The historical reality is less satisfying. Both methods were eventually adopted, and for several decades ships carried both, using lunar distances to check the chronometer and the chronometer to avoid the four-hour calculation. What decided the outcome was not the prize but manufacture: Larcum Kendall\'s copy of H4 cost £450, roughly a third of the price of the ship\'s boat, and it was only when John Arnold and Thomas Earnshaw simplified the design for production in the 1780s that a chronometer became something a merchant captain could actually own.' }
        ],
        groups: [
          {
            kind: 'matching',
            title: 'Questions 14–19',
            instructions: 'Look at the following statements and the list of people below.\n\n' +
              'Match each statement with the correct person, **A–F**. You may use any letter only once.',
            optionsTitle: 'List of people',
            options: [
              { k: 'A', t: 'Cloudesley Shovell' }, { k: 'B', t: 'Isaac Newton' },
              { k: 'C', t: 'Nevil Maskelyne' }, { k: 'D', t: 'John Harrison' },
              { k: 'E', t: 'Larcum Kendall' }, { k: 'F', t: 'Thomas Earnshaw' }
            ],
            questions: [
              { n: 14, text: 'told Parliament that a mechanical solution could not work', answer: 'B',
                evidence: 'Paragraph 4: "Newton dismissed the idea in evidence to Parliament."' },
              { n: 15, text: 'produced the tables that made the astronomical method practical', answer: 'C',
                evidence: 'Paragraph 3: "Nevil Maskelyne published the first Nautical Almanac in 1767".' },
              { n: 16, text: 'lost his ships after misjudging his position', answer: 'A',
                evidence: 'Paragraph 2: Shovell\'s fleet struck the Isles of Scilly "believing itself to be safely west".' },
              { n: 17, text: 'invented a device that corrected for changes in temperature', answer: 'D',
                evidence: 'Paragraph 5: Harrison "invented a bimetallic strip".' },
              { n: 18, text: 'made an expensive copy of an existing instrument', answer: 'E',
                evidence: 'Paragraph 7: "Larcum Kendall\'s copy of H4 cost £450".' },
              { n: 19, text: 'redesigned the instrument so that it could be produced in quantity', answer: 'F',
                evidence: 'Paragraph 7: "John Arnold and Thomas Earnshaw simplified the design for production".' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 20–23',
            instructions: 'Choose the correct letter, **A**, **B**, **C** or **D**.',
            questions: [
              { n: 20, text: 'Why is longitude harder to establish than latitude?',
                options: [{ k: 'A', t: 'The instruments required are more delicate.' },
                          { k: 'B', t: 'There is no fixed reference point in the sky.' },
                          { k: 'C', t: 'The calculations involve more variables.' },
                          { k: 'D', t: 'The Earth is not a perfect sphere.' }],
                answer: 'B', evidence: 'Paragraph 1: "There is no fixed east–west marker in the sky."' },
              { n: 21, text: 'What was the main practical drawback of the lunar distance method?',
                options: [{ k: 'A', t: 'It could not be used in daylight.' },
                          { k: 'B', t: 'It required an instrument few ships carried.' },
                          { k: 'C', t: 'Each calculation was extremely time-consuming.' },
                          { k: 'D', t: 'It was inaccurate at high latitudes.' }],
                answer: 'C', evidence: 'Paragraph 3: "each calculation took a trained officer around four hours".' },
              { n: 22, text: 'What was unusual about Harrison\'s final solution, H4?',
                options: [{ k: 'A', t: 'It abandoned the design principles of his earlier machines.' },
                          { k: 'B', t: 'It was built entirely from wood.' },
                          { k: 'C', t: 'It was tested by the Board rather than at sea.' },
                          { k: 'D', t: 'It was cheaper than anything he had made before.' }],
                answer: 'A', evidence: 'Paragraph 5: "he abandoned the whole approach and produced H4, which was not a clock at all but a large watch".' },
              { n: 23, text: 'What does the writer suggest about the Board\'s refusal to pay Harrison?',
                options: [{ k: 'A', t: 'It was entirely the result of Maskelyne\'s hostility.' },
                          { k: 'B', t: 'It had some legitimate justification.' },
                          { k: 'C', t: 'It was based on a misreading of the Longitude Act.' },
                          { k: 'D', t: 'It was reversed as soon as the King intervened.' }],
                answer: 'B', evidence: 'Paragraph 6: "the Board argued, not unreasonably in principle, that a single watch performing well once proved nothing".' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 24–26',
            instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from the passage for each answer.',
            maxWords: 2,
            blocks: [
              { t: 'ul', items: [
                'A difference of one hour between local time and reference time corresponds to [[24]] degrees of longitude.',
                'Harrison avoided the need for oil by making bearings from [[25]].',
                'On the voyage to Jamaica, H4 was slow by only [[26]] seconds in eighty-one days.'
              ] }
            ],
            questions: [
              { n: 24, answer: 'fifteen', accept: ['15'], evidence: 'Paragraph 1: "Every hour of difference is fifteen degrees."' },
              { n: 25, answer: 'lignum vitae', evidence: 'Paragraph 5: "He used lignum vitae, a self-lubricating tropical hardwood, for bearings".' },
              { n: 26, answer: '5.1', evidence: 'Paragraph 6: "lost 5.1 seconds in eighty-one days".' }
            ]
          }
        ]
      },

      /* ---------------------------------------------- PASSAGE 3 */
      {
        number: 3, heading: 'Questions 27–40',
        overTitle: 'READING PASSAGE 3 — You should spend about 20 minutes on Questions 27–40.',
        title: 'Can a city cool itself?',
        paras: [
          { label: 'A', text: 'A large city is measurably warmer than the countryside around it, and has been known to be since Luke Howard measured London\'s temperature against its surroundings in 1818. The effect is largest on still, clear nights, when the difference between the centre of a big city and the fields outside it can exceed eight degrees Celsius. Three mechanisms account for most of it. Dark, dense materials — asphalt, brick, concrete — absorb solar radiation during the day and release it slowly after sunset. Water that would otherwise evaporate from soil and leaves, cooling the air as it does so, is instead carried away by drains within minutes of falling. And the geometry of a street canyon traps outgoing longwave radiation between its walls, so heat that would radiate to the sky bounces sideways instead.' },
          { label: 'B', text: 'The consequences are no longer theoretical. Heat is now the deadliest weather hazard in most temperate countries, ahead of floods and storms, and it kills unevenly. Deaths concentrate among the elderly, the chronically ill and those living alone in top-floor flats without cross-ventilation, and they concentrate geographically in exactly the districts with the least tree cover. In many cities the correlation between neighbourhood tree canopy and historic patterns of housing policy is close enough that a modern heat map can be read as a map of decisions taken eighty years ago.' },
          { label: 'C', text: 'The intervention with the strongest evidence behind it is also the oldest. A mature street tree cools in two ways: it shades the surface beneath it, preventing absorption in the first place, and it transpires, moving water from the soil into the air. A single large tree can move several hundred litres of water on a hot day, and the cooling that represents is equivalent to several domestic air conditioners running continuously. Measured air temperature reductions under significant canopy typically run to two or three degrees, but the reduction in what a body actually experiences — which depends on radiation from surrounding surfaces as much as air temperature — can be more than ten.' },
          { label: 'D', text: 'Trees, however, are slow, thirsty and awkward. The benefit described above comes from a mature specimen, and a newly planted street tree needs fifteen to twenty years to deliver it, assuming it survives; urban mortality rates in the first five years are often above thirty per cent. They need water precisely when water is scarcest, they lift pavements, drop leaves into gutters, obstruct sightlines and shed limbs, and every one of those is a maintenance budget line that competes with the planting budget. Cities that announce large planting targets and then fail to fund watering for the following three summers reliably end up with fewer trees than they started with.' },
          { label: 'E', text: 'Reflective surfaces are the obvious alternative, and the physics is unarguable: a white roof reflects most of the sunlight falling on it and stays dramatically cooler than a dark one, cutting both the building\'s cooling load and its contribution to the surrounding air temperature. Whitewashing roofs is cheap, immediate and requires no maintenance beyond periodic recoating. But the technique has limits that its more enthusiastic advocates pass over. Reflected light has to go somewhere, and at street level a highly reflective wall can increase the radiant heat load on pedestrians even while lowering the air temperature. In colder climates the winter heating penalty offsets a meaningful share of the summer benefit. And a white roof does nothing for a person walking below it.' },
          { label: 'F', text: 'Water offers a third route, and its recent reappearance in urban design owes as much to flooding as to heat. The logic of twentieth-century drainage was to remove rainwater as fast as possible; the logic of "sponge city" design, developed in China and now widely adopted, is to hold it in the ground where it falls — in permeable paving, planted swales, rain gardens and daylighted streams. The flood argument is what gets these schemes funded. The cooling benefit, which comes from having moisture available to evaporate through a heatwave rather than only during the storm, arrives as a by-product, and it is the reason a park with a stream running through it can be several degrees cooler than an identical park without one.' },
          { label: 'G', text: 'There is a version of this discussion that treats it as a menu, in which a city selects the intervention with the best cost-benefit ratio and applies it. That framing is misleading, because the measures interact. Trees planted over permeable ground survive drought that kills trees in sealed pits; a light-coloured surface under a canopy reflects little because little reaches it; a green roof that is not irrigated is a brown roof by August. The cities producing measurable results — Medellín\'s green corridors, Vienna\'s cooling programme, Singapore\'s canopy requirements for new buildings — have combined measures along whole routes rather than distributing them evenly, and have accepted that a continuous shaded path from a housing block to a metro station is worth more than the same number of trees scattered across a borough.' },
          { label: 'H', text: 'Two constraints will shape the next decade. The first is that adaptation is not mitigation: a cooler city still emits, and air conditioning, which is the individual response almost everyone reaches for, warms the street while cooling the room. The second is distributional. Cooling measures raise property values, and a programme that greens a low-income district without any accompanying housing policy can displace precisely the residents it was intended to protect. Neither is an argument against cooling cities. Both are arguments that it cannot be treated as a purely technical exercise, which is how it is usually presented.' }
        ],
        groups: [
          {
            kind: 'matching',
            title: 'Questions 27–32',
            instructions: 'Reading Passage 3 has eight paragraphs, **A–H**.\n\n' +
              'Which paragraph contains the following information?\n\nWrite the correct letter, **A–H**. ' +
              'You may use any letter only once.',
            optionsTitle: 'Paragraphs',
            options: [{ k: 'A', t: 'Paragraph A' }, { k: 'B', t: 'Paragraph B' }, { k: 'C', t: 'Paragraph C' },
                      { k: 'D', t: 'Paragraph D' }, { k: 'E', t: 'Paragraph E' }, { k: 'F', t: 'Paragraph F' },
                      { k: 'G', t: 'Paragraph G' }, { k: 'H', t: 'Paragraph H' }],
            questions: [
              { n: 27, text: 'a risk that a cooling programme may harm the people it aims to help', answer: 'H',
                evidence: 'H: "can displace precisely the residents it was intended to protect".' },
              { n: 28, text: 'the reason a cooling technique is usually paid for on other grounds', answer: 'F',
                evidence: 'F: "The flood argument is what gets these schemes funded."' },
              { n: 29, text: 'a physical explanation of why built-up areas retain heat', answer: 'A',
                evidence: 'A: dark materials, lost evaporation and street canyon geometry.' },
              { n: 30, text: 'evidence that the effects of heat follow historic social patterns', answer: 'B',
                evidence: 'B: "a modern heat map can be read as a map of decisions taken eighty years ago".' },
              { n: 31, text: 'a drawback of one method that its supporters tend to overlook', answer: 'E',
                evidence: 'E: reflected light can raise the radiant load on pedestrians.' },
              { n: 32, text: 'the argument for concentrating measures rather than spreading them out', answer: 'G',
                evidence: 'G: "a continuous shaded path… is worth more than the same number of trees scattered".' }
            ]
          },
          {
            kind: 'ynng',
            title: 'Questions 33–36',
            instructions: 'Do the following statements agree with the claims of the writer in Reading Passage 3?\n\n' +
              'Write **YES**, **NO** or **NOT GIVEN**.',
            questions: [
              { n: 33, text: 'Planting targets are worth little unless money is also committed to looking after the trees.', answer: 'YES',
                evidence: 'Paragraph D: cities that fail to fund watering "reliably end up with fewer trees than they started with".' },
              { n: 34, text: 'Reflective roofs are the most cost-effective way of cooling a city.', answer: 'NO',
                evidence: 'Paragraph E acknowledges the physics but sets out limits; paragraph G rejects the whole "menu" framing.' },
              { n: 35, text: 'Sponge city techniques were originally developed in response to heat.', answer: 'NO',
                evidence: 'Paragraph F: their reappearance "owes as much to flooding as to heat", and the flood argument secures the funding.' },
              { n: 36, text: 'Air conditioning should be banned in new residential buildings.', answer: 'NOT GIVEN',
                evidence: 'Paragraph H notes that air conditioning warms the street, but the writer makes no recommendation about banning it.' }
            ]
          },
          {
            kind: 'gap-bank',
            title: 'Questions 37–40',
            instructions: 'Complete the summary using the list of words, **A–H**, below.',
            optionsTitle: 'Word list',
            options: [
              { k: 'A', t: 'transpiration' }, { k: 'B', t: 'mitigation' }, { k: 'C', t: 'drainage' },
              { k: 'D', t: 'mortality' }, { k: 'E', t: 'radiation' }, { k: 'F', t: 'insulation' },
              { k: 'G', t: 'density' }, { k: 'H', t: 'subsidy' }
            ],
            blocks: [
              { t: 'p', text: 'Street trees lower temperatures both by providing shade and through [[37]], which moves ' +
                'water from the soil into the air. The main obstacle to relying on them is high [[38]] among newly ' +
                'planted specimens during their first years. Reflective roofs work immediately, but reflected ' +
                '[[39]] at street level can make conditions worse for people walking past. The writer also insists ' +
                'that adapting a city to heat must not be confused with [[40]] of the emissions causing it.' }
            ],
            questions: [
              { n: 37, answer: 'A', evidence: 'Paragraph C: "it transpires, moving water from the soil into the air".' },
              { n: 38, answer: 'D', evidence: 'Paragraph D: "urban mortality rates in the first five years are often above thirty per cent".' },
              { n: 39, answer: 'E', evidence: 'Paragraph E: "a highly reflective wall can increase the radiant heat load on pedestrians".' },
              { n: 40, answer: 'B', evidence: 'Paragraph H: "adaptation is not mitigation".' }
            ]
          }
        ]
      }
    ]
  });

  /* ================================================================== */
  /*  GENERAL TRAINING READING                                          */
  /* ================================================================== */
  IELTSData.add('test3', 'readingGeneral', {
    sections: [

      /* ---------------------------------------------- SECTION 1 */
      {
        number: 1, heading: 'Questions 1–7', tabLabel: 'S1 · Text A', paletteLabel: 'S1a',
        overTitle: 'SECTION 1 — Questions 1–14. You should spend about 20 minutes on this section.',
        title: 'Text A — Riverford Park & Ride: passenger information',
        paras: [
          { text: 'Three Park & Ride sites serve the city centre. Buses run every ten minutes from 6.30 a.m. to 8.00 p.m. Monday to Saturday, and every twenty minutes on Sundays and public holidays between 9.00 a.m. and 6.00 p.m.' },
          { t: 'table',
            head: ['Site', 'Spaces', 'Journey time to centre', 'Last bus back'],
            rows: [
              ['Marston (north)', '1,100', '12 minutes', '8.40 p.m.'],
              ['Ferry Lane (east)', '640', '18 minutes', '8.25 p.m.'],
              ['Chalkwell (south)', '820', '15 minutes', '11.15 p.m. (Fri & Sat only: 8.30 p.m. other days)']
            ] },
          { t: 'h', text: 'Fares' },
          { text: 'A return ticket costs £3.20 per vehicle, not per person, and covers the driver and up to five passengers travelling together. Parking itself is free. Children under five travel free. There is no single fare. Tickets are bought from the machine at the stop or on the bus; the machines take cards only, while drivers accept cash but cannot give change of more than £5.' },
          { t: 'h', text: 'Season tickets' },
          { text: 'A monthly season ticket costs £48 and is valid at all three sites. Annual tickets cost £480, which is ten months for the price of twelve. Season tickets are issued to a named person, not to a vehicle, and cannot be shared. Applications are made online and the card is posted within five working days; you may travel using the emailed receipt in the meantime.' },
          { t: 'h', text: 'Please note' },
          { text: 'Vehicles left overnight without a permit may be clamped, and a release fee of £75 applies. Overnight permits are available free of charge at Chalkwell only, for a maximum of three consecutive nights, and must be requested before 4.00 p.m. on the first day. Caravans and vehicles over 3.5 tonnes are not admitted to any site. Bicycles may be carried on the buses outside the hours of 7.30–9.30 a.m. and 4.30–6.30 p.m., subject to space.' }
        ],
        groups: [{
          kind: 'tfng',
          title: 'Questions 1–7',
          instructions: 'Do the following statements agree with the information given in Text A?\n\n' +
            'Write **TRUE**, **FALSE** or **NOT GIVEN**.',
          questions: [
            { n: 1, text: 'Buses run less frequently on Sundays than on weekdays.', answer: 'TRUE',
              evidence: 'Every ten minutes Monday to Saturday; every twenty minutes on Sundays.' },
            { n: 2, text: 'A family of four would pay four separate fares.', answer: 'FALSE',
              evidence: '"£3.20 per vehicle, not per person, and covers the driver and up to five passengers".' },
            { n: 3, text: 'You have to pay to leave a car at a Park & Ride site during the day.', answer: 'FALSE',
              evidence: '"Parking itself is free."' },
            { n: 4, text: 'Ticket machines at the stops do not accept cash.', answer: 'TRUE',
              evidence: '"the machines take cards only".' },
            { n: 5, text: 'An annual season ticket works out cheaper than paying monthly for a year.', answer: 'TRUE',
              evidence: '£480 a year against £48 × 12 = £576 — "ten months for the price of twelve".' },
            { n: 6, text: 'Two people may share the same season ticket if they travel at different times.', answer: 'FALSE',
              evidence: '"issued to a named person… and cannot be shared".' },
            { n: 7, text: 'Overnight parking permits are more popular at Chalkwell than at the other sites.', answer: 'NOT GIVEN',
              evidence: 'Permits are only available at Chalkwell; nothing is said about demand.' }
          ]
        }]
      },

      {
        number: 1, heading: 'Questions 8–14', tabLabel: 'S1 · Text B', paletteLabel: 'S1b',
        overTitle: 'SECTION 1 (continued)',
        title: 'Text B — Adult evening courses: enrolment information',
        paras: [
          { text: 'Courses run for eleven weeks from the last week of September, with a one-week break at the end of October. Most classes meet once a week for two hours between 6.30 p.m. and 8.30 p.m.' },
          { t: 'h', text: 'Choosing a course' },
          { text: 'Where a course is described as "no experience needed", you may join whatever your background. Courses marked "stage 2" assume that you have completed the stage 1 course here or have equivalent experience, and the tutor may ask you a few questions before confirming your place. Two courses — Conversational Spanish and Life Drawing — require you to attend a free taster session before enrolling; these are held on the two Wednesdays before term begins and must be booked.' },
          { t: 'h', text: 'Fees and reductions' },
          { text: 'The standard fee is £145 per course. A reduced fee of £72 applies if you receive a means-tested benefit, and proof must be uploaded at the time of enrolment — we cannot refund the difference afterwards. Fees may be paid in three instalments at no extra cost, but the first must be paid before the first class. Materials are included in every course except Ceramics and Stained Glass, where a materials charge of £40 is collected by the tutor in week one.' },
          { t: 'h', text: 'If you change your mind' },
          { text: 'You may transfer to a different course up to the end of week two, provided there is a place. Refunds are given in full if you withdraw before the course starts, and at fifty per cent up to the end of week three; after that no refund is possible. If we cancel a course because too few people have enrolled — which we decide no later than the Thursday before term — you will be offered a transfer or a full refund.' },
          { t: 'h', text: 'Certificates and progression' },
          { text: 'Attendance certificates are issued to anyone attending at least eight of the eleven sessions and are emailed in the week after the course ends. These are not formal qualifications. Students wishing to progress to accredited study should speak to the guidance team, who hold drop-in sessions every Tuesday from 5.00 to 6.30 p.m. in the main reception.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 8–14',
          instructions: 'Complete the notes below.\n\nChoose **NO MORE THAN TWO WORDS AND/OR A NUMBER** from Text B for each answer.',
          maxWords: 2,
          blocks: [
            { t: 'h', text: 'EVENING COURSES — NOTES' },
            { t: 'ul', items: [
              'Courses last [[8]] weeks, including a break in October.',
              'Spanish and Life Drawing applicants must first attend a [[9]].',
              'The reduced fee is £[[10]], and evidence must be supplied when enrolling.',
              'Fees can be spread over [[11]] payments.',
              'Ceramics and Stained Glass students pay an extra £40 for [[12]].',
              'Withdrawing in week three gives back [[13]] of the fee.',
              'A certificate is issued to anyone who attends at least [[14]] sessions.'
            ] }
          ],
          questions: [
            { n: 8, answer: 'eleven', accept: ['11'], evidence: '"Courses run for eleven weeks".' },
            { n: 9, answer: 'taster session', accept: ['taster'], evidence: '"require you to attend a free taster session before enrolling".' },
            { n: 10, answer: '72', accept: ['£72'], evidence: '"A reduced fee of £72 applies".' },
            { n: 11, answer: 'three', accept: ['3'], evidence: '"Fees may be paid in three instalments".' },
            { n: 12, answer: 'materials', evidence: '"a materials charge of £40 is collected by the tutor".' },
            { n: 13, answer: 'fifty per cent', accept: ['50 per cent', '50%', 'half'], maxWords: 3, evidence: '"at fifty per cent up to the end of week three".' },
            { n: 14, answer: 'eight', accept: ['8'], evidence: '"attending at least eight of the eleven sessions".' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 2 */
      {
        number: 2, heading: 'Questions 15–20', tabLabel: 'S2 · Text C', paletteLabel: 'S2a',
        overTitle: 'SECTION 2 — Questions 15–27. You should spend about 20 minutes on this section.',
        title: 'Text C — Requesting a change to your working pattern',
        paras: [
          { text: 'Any employee may ask for a change to their hours, their working days or their place of work. You do not need to give a reason connected with caring responsibilities, and you do not need a minimum period of service.' },
          { t: 'h', text: 'Making a request' },
          { text: 'Submit the request in writing through the HR portal, stating clearly what change you are asking for and the date you would like it to start. You should also set out what effect you think the change would have on your team and how any difficulties might be handled — requests that address this are approved considerably more often than those that do not. You may make two statutory requests in any twelve-month period.' },
          { t: 'h', text: 'What happens next' },
          { text: 'Your manager will arrange a meeting within fourteen days, and you may bring a colleague or trade union representative. A written decision must be given within two months of the original request unless you agree to extend that period. If the request is refused, the reason must be one of the eight grounds set out in the legislation, such as the burden of additional costs or a detrimental effect on the ability to meet customer demand; "we have never done that here" is not a permitted reason.' },
          { t: 'h', text: 'Trial periods' },
          { text: 'Where a manager is uncertain, we encourage a trial of three months rather than an outright refusal. A trial does not commit either side, but it should be reviewed against agreed measures set down in advance, and the review should be booked at the start of the trial rather than arranged when it ends.' },
          { t: 'h', text: 'If your request is refused' },
          { text: 'You may appeal in writing within fourteen days of the decision. The appeal is heard by a manager who was not involved in the original decision, normally within a further twenty-one days. If you remain dissatisfied you may raise the matter under the grievance procedure, and you may ultimately take a complaint to an employment tribunal, although only on the grounds that the correct process was not followed or that the decision was based on incorrect facts — not that the decision was wrong.' }
        ],
        groups: [{
          kind: 'gap',
          title: 'Questions 15–20',
          instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from Text C for each answer.',
          maxWords: 3,
          blocks: [
            { t: 'ul', items: [
              'An employee may submit [[15]] statutory requests within any twelve-month period.',
              'A meeting must be arranged within [[16]] of the request being made.',
              'A written decision is due within [[17]] unless the employee agrees otherwise.',
              'A refusal has to be based on one of [[18]] set out in law.',
              'Rather than refuse, managers are encouraged to offer a [[19]] of three months.',
              'An appeal is normally heard within a further [[20]].'
            ] }
          ],
          questions: [
            { n: 15, answer: 'two', accept: ['2'], evidence: '"You may make two statutory requests in any twelve-month period."' },
            { n: 16, answer: 'fourteen days', accept: ['14 days'], evidence: '"Your manager will arrange a meeting within fourteen days."' },
            { n: 17, answer: 'two months', accept: ['2 months'], evidence: '"A written decision must be given within two months".' },
            { n: 18, answer: 'eight grounds', accept: ['the eight grounds', '8 grounds'], evidence: '"the reason must be one of the eight grounds set out in the legislation".' },
            { n: 19, answer: 'trial', accept: ['trial period', 'a trial'], evidence: '"we encourage a trial of three months rather than an outright refusal".' },
            { n: 20, answer: 'twenty-one days', accept: ['21 days'], evidence: '"normally within a further twenty-one days".' }
          ]
        }]
      },

      {
        number: 2, heading: 'Questions 21–27', tabLabel: 'S2 · Text D', paletteLabel: 'S2b',
        overTitle: 'SECTION 2 (continued)',
        title: 'Text D — Volunteer stewards: role description',
        paras: [
          { label: 'A', text: 'Stewards are the most visible people at the festival and, for most of the audience, the only members of staff they will speak to. The role is not primarily about safety equipment or radios; it is about being approachable, knowing the answers to the twenty questions you will be asked forty times each, and noticing when something is not right before it becomes a problem.' },
          { label: 'B', text: 'Shifts are six hours long and you are asked to commit to a minimum of three across the weekend, which leaves you the majority of the festival free. Shifts are allocated by the online rota system on a first-come basis two weeks before the event; if you have a strong preference for a particular stage or a particular time, book early rather than emailing us afterwards.' },
          { label: 'C', text: 'In return for three shifts you receive a weekend ticket, camping in the crew field, which is quieter and has its own showers, one hot meal per shift and unlimited tea and coffee. You do not receive a fee. Travel expenses are reimbursed at 25p a mile or the cost of a standard-class rail ticket, up to £60, and you must keep the receipt.' },
          { label: 'D', text: 'Everyone must attend one briefing, which lasts ninety minutes and runs three times on the Thursday and twice on Friday morning. This is not a formality: it covers the evacuation routes, the radio protocol and the specific hazards of the site, which changes every year because the field does. You cannot work a shift without having attended, and we cannot make exceptions however experienced you are.' },
          { label: 'E', text: 'You will be issued with a tabard, a radio, a torch and a lanyard, all of which are returnable at the end of your last shift. A £20 deposit is taken for the radio and refunded when it comes back. Wear boots you can stand in for six hours and bring waterproofs; the site has no hard standing and one wet weekend in three is a reasonable expectation.' },
          { label: 'F', text: 'The single most important rule is that stewards do not intervene physically in any situation, ever. If a crowd is pressing, if someone is behaving aggressively, if you see anything you are not sure about, your job is to report it on the radio and to keep yourself where you can see what is happening. Security staff are trained and insured for physical intervention; you are neither.' },
          { label: 'G', text: 'Many stewards come back year after year, and a number of our paid team began this way. If you want to take on more, the route is to steward two festivals and then apply for the team leader course, which we run each spring. Team leaders manage a group of eight, do the same shifts, and receive a small honorarium.' }
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
            { n: 21, text: 'how to progress to a more senior role', answer: 'G', evidence: 'G: steward twice, then the team leader course.' },
            { n: 22, text: 'a rule that applies regardless of a volunteer\'s experience', answer: 'D', evidence: 'D: "we cannot make exceptions however experienced you are".' },
            { n: 23, text: 'what stewards must not do in a difficult situation', answer: 'F', evidence: 'F: "stewards do not intervene physically in any situation, ever".' },
            { n: 24, text: 'how shifts are distributed', answer: 'B', evidence: 'B: "allocated by the online rota system on a first-come basis".' },
            { n: 25, text: 'an amount of money that is returned later', answer: 'E', evidence: 'E: "A £20 deposit is taken for the radio and refunded".' },
            { n: 26, text: 'what the audience mainly needs from a steward', answer: 'A', evidence: 'A: being approachable and knowing the answers to common questions.' },
            { n: 27, text: 'the limit on what can be claimed for travel', answer: 'C', evidence: 'C: "up to £60, and you must keep the receipt".' }
          ]
        }]
      },

      /* ---------------------------------------------- SECTION 3 */
      {
        number: 3, heading: 'Questions 28–40', tabLabel: 'Section 3', paletteLabel: 'S3',
        overTitle: 'SECTION 3 — Questions 28–40. You should spend about 20 minutes on this section.',
        title: 'What is the high street for now?',
        paras: [
          { label: 'A', text: 'The standard account of what has happened to town centres is that online shopping killed them. It is not wrong, but it is far from complete, and the parts it leaves out are the parts that determine what can be done. Online retail accounts for roughly a quarter of British sales, which is high by international standards but leaves three-quarters of spending still taking place somewhere physical. The question is why so little of it happens on a traditional high street.' },
          { label: 'B', text: 'Part of the answer is a cost structure inherited from a different era. Business rates, the tax on commercial property in the UK, are calculated from rental values and fall much more heavily on a shop with a street frontage than on a distribution shed beside a motorway. A retailer selling the same item through both channels pays substantially more tax to sell it in a town than to post it. This has been described as a subsidy for online retail; a fairer description is that the tax was designed when property value and business value were closely related, and they no longer are.' },
          { label: 'C', text: 'The second factor is the structure of ownership. Many high streets are owned in small parcels by individual landlords, a large number of whom are not local and some of whom are pension funds holding property at a book value they are reluctant to write down. A landlord who accepts a lower rent crystallises a loss on the whole asset; leaving a unit empty for two years can be the rational choice. The consequence is a street where the vacancy rate rises even though there are businesses willing to pay something, and this is precisely the situation in which no individual owner will act first.' },
          { label: 'D', text: 'The third factor is one that surveys reveal but that shop owners tend to dislike hearing. Ask people why they no longer come into town and the most common answers are not about price or range: they are about parking, the state of the pavements, the absence of public toilets and a general feeling that the place is not looked after. These are municipal functions, not retail ones, and they have been cut heavily in most British towns since 2010. A high street is a public space that happens to contain shops, and when the public space degrades, the shops go whatever their offer.' },
          { label: 'E', text: 'What has actually replaced retail, where anything has, is instructive. The categories that have grown are those that cannot be delivered: hairdressers and barbers, nail bars, tattoo studios, gyms, veterinary practices, cafés, dentists, and — the largest single growth category in many towns — food outlets of every kind. Alongside these sit uses that are not commercial at all: libraries relocated into former department stores, NHS diagnostic centres in units that were shoe shops, university buildings, community hubs. The high street is not emptying so much as changing what it is for, and the change is towards services and experiences performed on a person.' },
          { label: 'F', text: 'This transition is being made harder than it needs to be by planning rules written on the assumption that retail was permanent and desirable. For decades, converting a shop to almost anything else required permission that was frequently refused, on the grounds that it would harm the "retail character" of the street — a defence of a use for which there was no longer sufficient demand. Reforms have loosened this considerably in England, but the rules still treat change of use as an exception requiring justification, and the process is slow enough to deter exactly the small operators most likely to take on a difficult unit.' },
          { label: 'G', text: 'The towns that have made progress share three features and they are not the obvious ones. They have some form of coordinated ownership or management, whether a council that has bought the shopping centre, a business improvement district or a community land trust, which allows one party to act for the street rather than for a unit. They have accepted that the retail floorspace of 2005 will never be needed again, and have shrunk the retail core deliberately, concentrating shops in a few streets and converting the periphery to housing rather than allowing dereliction to spread evenly. And they have invested in the unglamorous municipal basics that the surveys keep identifying.' },
          { label: 'H', text: 'None of this restores what was there before, and it is worth being honest that the era of the high street as the principal place where goods were bought has ended and will not return. What is at stake now is different and arguably more important: whether the centre of a town remains somewhere that people who are not shopping have a reason to be. On that question the outcome is genuinely open, and it turns much more on decisions about ownership, tax and public space than on anything a retailer can do.' }
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
              { n: 28, text: 'why an owner may prefer a unit to stay empty', answer: 'C',
                evidence: 'C: accepting a lower rent "crystallises a loss on the whole asset".' },
              { n: 29, text: 'a list of the kinds of business that have increased', answer: 'E',
                evidence: 'E: hairdressers, gyms, dentists, food outlets, and non-commercial uses.' },
              { n: 30, text: 'the reasons the public themselves give for staying away', answer: 'D',
                evidence: 'D: parking, pavements, toilets, "a general feeling that the place is not looked after".' },
              { n: 31, text: 'a tax that treats two ways of selling the same thing differently', answer: 'B',
                evidence: 'B: business rates fall more heavily on a shop than on a distribution shed.' },
              { n: 32, text: 'what successful towns have in common', answer: 'G',
                evidence: 'G: coordinated ownership, a deliberately shrunken retail core, investment in basics.' },
              { n: 33, text: 'regulations that obstructed buildings being used in new ways', answer: 'F',
                evidence: 'F: planning permission for change of use was "frequently refused".' }
            ]
          },
          {
            kind: 'mcq',
            title: 'Questions 34–37',
            instructions: 'Choose the correct letter, **A**, **B**, **C** or **D**.',
            questions: [
              { n: 34, text: 'What does the writer say about the claim that online shopping destroyed town centres?',
                options: [{ k: 'A', t: 'It is inaccurate.' },
                          { k: 'B', t: 'It is true but incomplete.' },
                          { k: 'C', t: 'It applies only to the UK.' },
                          { k: 'D', t: 'It was true in the past but is no longer.' }],
                answer: 'B', evidence: 'Paragraph A: "It is not wrong, but it is far from complete."' },
              { n: 35, text: 'The writer\'s view of business rates is that',
                options: [{ k: 'A', t: 'they were deliberately designed to favour online retailers.' },
                          { k: 'B', t: 'they should be abolished entirely.' },
                          { k: 'C', t: 'they reflect an assumption that no longer holds.' },
                          { k: 'D', t: 'they are too low on out-of-town premises.' }],
                answer: 'C', evidence: 'Paragraph B: "the tax was designed when property value and business value were closely related, and they no longer are".' },
              { n: 36, text: 'According to the text, what characterises the businesses that have grown on high streets?',
                options: [{ k: 'A', t: 'They sell goods that are expensive to post.' },
                          { k: 'B', t: 'They are mostly run by national chains.' },
                          { k: 'C', t: 'They provide something done to a person.' },
                          { k: 'D', t: 'They depend on evening trade.' }],
                answer: 'C', evidence: 'Paragraph E: "the change is towards services and experiences performed on a person".' },
              { n: 37, text: 'What does the writer conclude?',
                options: [{ k: 'A', t: 'High streets will eventually recover their former role.' },
                          { k: 'B', t: 'The future of town centres depends mainly on retailers.' },
                          { k: 'C', t: 'Most towns have already made the necessary changes.' },
                          { k: 'D', t: 'The real question is whether town centres remain public places.' }],
                answer: 'D', evidence: 'Paragraph H: "whether the centre of a town remains somewhere that people who are not shopping have a reason to be".' }
            ]
          },
          {
            kind: 'gap',
            title: 'Questions 38–40',
            instructions: 'Complete the sentences below.\n\nChoose **NO MORE THAN THREE WORDS AND/OR A NUMBER** from the text for each answer.',
            maxWords: 3,
            blocks: [
              { t: 'ul', items: [
                'Around [[38]] of retail sales in Britain take place online.',
                'The problems people complain about are [[39]] rather than retail ones.',
                'Successful towns have concentrated shops in a few streets and turned the edges over to [[40]].'
              ] }
            ],
            questions: [
              { n: 38, answer: 'a quarter', accept: ['one quarter', 'quarter', '25 per cent'], evidence: 'Paragraph A: "Online retail accounts for roughly a quarter of British sales".' },
              { n: 39, answer: 'municipal functions', accept: ['municipal'], evidence: 'Paragraph D: "These are municipal functions, not retail ones."' },
              { n: 40, answer: 'housing', evidence: 'Paragraph G: "converting the periphery to housing".' }
            ]
          }
        ]
      }
    ]
  });
})();
