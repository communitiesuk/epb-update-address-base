const isCertifiableAddress = require('../../address_base_import/filter-by-classification')

const defaultGoodEntry = {
  CLASS: 'RD02', // detached house
  COUNTRY: 'E' // England
}

const countries = {
  E: 'England',
  W: 'Wales',
  S: 'Scotland',
  N: 'Northern Ireland',
  L: 'the Channel Islands',
  M: 'the Isle of Man',
  J: 'an unassigned country'
}

describe('filter out non-EPC related location classifications', () => {
  Object.entries({
    C: true, // Commercial
    CR01: true, // Bank
    CC10: false, // Recycling site
    CC11: false, // CCTV
    CL06QS: false, // Racquet sports facility (= mostly tennis courts)
    CL09: false, // Beach hut
    CR11: false, // ATM
    CT01HT: false, // Heliport / helipad
    CT02: false, // Bus shelter
    CT03: true, // Car / coach parking sites
    CT05: false, // Marina
    CT06: false, // Mooring
    CT07: false, // Railway asset
    CT09: false, // Transport track / way
    CT11: false, // Transport-related architecture
    CT12: false, // Overnight lorry park
    CT13: false, // Harbour / port / dock / dockyard
    CU01: false, // Electricity Sub Station
    CU02: false, // Landfill
    CU11: false, // Telephone box
    CU12: false, // Dam
    CZ01: false, // Advertising hoarding
    CZ02: false, // Information signage
    CZ03: false, // Traffic information signage
    L: false, // Land
    LB99PI: true, // Pavilion / changing room
    M: true, // Military
    O: false, // Other
    P: false, // Parent shell
    PP: true, // Parent property
    PS: false, // Parent street record
    R: true, // Residential
    RD02: true, // Detached house
    RC: false, // Car park space
    RD07: false, // House boat
    RG02: false, // Garage/ lock-up
    U: true, // Unclassified
    Z: false, // Object of interest
    ZM01OB: false, // Obelisk
    ZM04: true, // Castle / historic ruin
    ZS: true, // Stately home
    ZV01: true, // Cellar
    ZW99: true, // Place of worship
    '': true,
    B: true
  }).forEach(([classCode, isAccepted]) => {
    it(`when given an AddressBase entry with a class that starts with ${classCode}`, () => {
      expect(isCertifiableAddress({ ...defaultGoodEntry, ...{ CLASS: classCode } })).toBe(isAccepted)
    })
  })
})

describe('filter out addresses', () => {
  Object.entries({
    E: true, // England
    W: true, // Wales
    S: false, // Scotland
    N: true, // Northern Ireland
    L: false, // Channel Islands
    M: false, // Isle of Man
    J: true // an unassigned country
  }).forEach(([countryCode, isAccepted]) => {
    it(`when given an AddressBase entry with a country code denoting it is in ${countries[countryCode]}`, () => {
      expect(isCertifiableAddress({ ...defaultGoodEntry, ...{ COUNTRY: countryCode } })).toBe(isAccepted)
    })
  })
})
