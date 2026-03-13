const { faker } = require('@faker-js/faker');
const { generateCaseReference } = require('./identifiers');
const complexities = require('../../app/data/complexities');
const types = require('../../app/data/types');
const ukCities = require('../../app/data/uk-cities');

// Helper: Calculate deadline as end of month + 6 weeks
function calculateDeadline(reviewDate) {
  const date = new Date(reviewDate);

  // Get last day of the month
  const year = date.getFullYear();
  const month = date.getMonth();
  const endOfMonth = new Date(year, month + 1, 0); // Day 0 of next month = last day of current month

  // Add 6 weeks (42 days)
  const deadline = new Date(endOfMonth);
  deadline.setDate(deadline.getDate() + 42);

  // Set time to 11:59pm
  deadline.setHours(23, 59, 0, 0);

  return deadline;
}

// Get max days in a month (handles varying month lengths)
function getMaxDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

async function seedDGAMonths(prisma, defendants) {
  const failureReasonsList = [
    "Breach failure - Charged by Police in breach of the Director's Guidance",
    "Disclosure failure - Disclosable unused material not provided",
    "Disclosure failure - Information about reasonable lines of inquiry insufficient",
    "Disclosure failure - Information about reasonable lines of inquiry not provided",
    "Disclosure failure - Rebuttable presumption material not provided",
    "Disclosure failure - Schedules of unused material not completed correctly",
    "Disclosure failure - Schedules of unused material not provided",
    "Evidential failure - Exhibit",
    "Evidential failure - Forensic",
    "Evidential failure - Medical evidence",
    "Evidential failure - Multi-media BWV not clipped",
    "Evidential failure - Multi-media BWV not in playable format",
    "Evidential failure - Multi-media BWV not provided",
    "Evidential failure - Multi-media CCTV not clipped",
    "Evidential failure - Multi-media CCTV not in playable format",
    "Evidential failure - Multi-media CCTV not provided",
    "Evidential failure - Multi-media Other not clipped",
    "Evidential failure - Multi-media Other not in playable format",
    "Evidential failure - Relevant orders/applications, details not provided",
    "Evidential failure - Statement(s)",
    "Victim and witness failure - Needs of the victim/witness special measures have not been considered or are inadequate",
    "Victim and witness failure - Victim and witness needs (not special measures related)",
    "Victim and witness failure - VPS - no information on whether VPS offered/not provided"
  ];

  const failureReasonDetails = {
    "Breach failure - Charged by Police in breach of the Director's Guidance": "The defendant has been charged with an offence that falls outside the Director's Guidance on charging. The police should have sought advice from a prosecutor before charging in this case.",
    "Disclosure failure - Disclosable unused material not provided": "You have not provided the disclosable unused material listed on the schedule. Items 3, 7 and 12 on the MG6C are missing from the file.",
    "Disclosure failure - Information about reasonable lines of inquiry insufficient": "The information provided about the lines of inquiry conducted is insufficient. You have not explained why CCTV from the adjacent premises was not sought.",
    "Disclosure failure - Information about reasonable lines of inquiry not provided": "You have not provided any information about the reasonable lines of inquiry that were pursued or considered in this case.",
    "Disclosure failure - Rebuttable presumption material not provided": "The material that attracts a rebuttable presumption of disclosure under the Criminal Procedure and Investigations Act 1996 has not been included in the file.",
    "Disclosure failure - Schedules of unused material not completed correctly": "The MG6C schedule has not been completed correctly. Items are listed without sufficient description to allow a prosecutor to assess their relevance to the defence.",
    "Disclosure failure - Schedules of unused material not provided": "No schedule of unused material has been provided with this file. An MG6C must be completed and submitted.",
    "Evidential failure - Exhibit": "The exhibit referred to in the witness statement (exhibit JS/1) has not been included in the file. Please resubmit with the exhibit attached.",
    "Evidential failure - Forensic": "The forensic analysis report referenced in the investigation has not been provided. The DNA comparison results must be included before this matter can proceed.",
    "Evidential failure - Medical evidence": "The medical evidence referenced in the officer's statement has not been included. The A&E records and medical photographs must be provided.",
    "Evidential failure - Multi-media BWV not clipped": "You have provided a 10 minute clip of the BWV but only the section between 1min 20s and 3min 45s is relevant. Please resubmit with only that section.",
    "Evidential failure - Multi-media BWV not in playable format": "The body-worn video file submitted cannot be opened. Please resubmit in a standard playable format such as MP4.",
    "Evidential failure - Multi-media BWV not provided": "Body-worn video was recorded at the scene but has not been included in the file. Please provide the footage referenced in the officer's statement.",
    "Evidential failure - Multi-media CCTV not clipped": "The CCTV footage provided covers an 8 hour period. Only the footage between 22:15 and 22:45 is relevant to this case. Please resubmit with only that section.",
    "Evidential failure - Multi-media CCTV not in playable format": "The CCTV file submitted is in a proprietary format that requires specialist software to view. Please convert and resubmit in a standard playable format.",
    "Evidential failure - Multi-media CCTV not provided": "CCTV footage from the location has been referenced in statements but not provided. Please include the relevant footage from the three cameras identified.",
    "Evidential failure - Multi-media Other not clipped": "The dashcam footage provided covers an excessive period. Please clip to the relevant section only and resubmit.",
    "Evidential failure - Multi-media Other not in playable format": "The audio recording submitted is in a format that cannot be played. Please resubmit in MP3 or WAV format.",
    "Evidential failure - Relevant orders/applications, details not provided": "The restraining order referenced in this case has not been included in the file. A copy of the order with full details of the conditions must be provided.",
    "Evidential failure - Statement(s)": "The witness statement from the independent witness referred to in the officer's account has not been included. This statement is essential to the prosecution case.",
    "Victim and witness failure - Needs of the victim/witness special measures have not been considered or are inadequate": "There is no record that special measures were considered for the vulnerable witness in this case. The MG2 has not been completed.",
    "Victim and witness failure - Victim and witness needs (not special measures related)": "The victim's need for an interpreter has not been addressed. There is no record of arrangements being made for the forthcoming hearing.",
    "Victim and witness failure - VPS - no information on whether VPS offered/not provided": "You have not stated whether the victim was offered the opportunity to complete a Victim Personal Statement."
  };


  // Month configurations
  // October 2025: All completed (past month)
  // November 2025: All completed (past month)
  // December 2025: Mixed states (current month being worked on)
  // casesPerUnit is now per police unit to allow different counts
  // isCompliant: true means cases with DGA but no failure reasons (passed the review)
  const monthConfigs = [
    {
      name: 'October 2025',
      year: 2025,
      month: 9, // 0-indexed, so 9 = October
      policeUnits: [
        { name: 'Metropolitan Police', state: 'completed', sentToPoliceDate: new Date(2025, 10, 5), casesPerUnit: 37 },
        { name: 'Metropolitan Police', state: 'compliant', sentToPoliceDate: new Date(2025, 10, 5), casesPerUnit: 8 },
        { name: 'Thames Valley Police', state: 'completed', sentToPoliceDate: new Date(2025, 10, 3), casesPerUnit: 37 },
        { name: 'Thames Valley Police', state: 'compliant', sentToPoliceDate: new Date(2025, 10, 3), casesPerUnit: 10 },
        { name: 'West Midlands Police', state: 'completed', sentToPoliceDate: new Date(2025, 10, 1), casesPerUnit: 3 },
        { name: 'West Midlands Police', state: 'compliant', sentToPoliceDate: new Date(2025, 10, 1), casesPerUnit: 2 }
      ]
    },
    {
      name: 'November 2025',
      year: 2025,
      month: 10, // 0-indexed, so 10 = November
      policeUnits: [
        { name: 'Metropolitan Police', state: 'completed', sentToPoliceDate: new Date(2025, 11, 5), casesPerUnit: 37 },
        { name: 'Metropolitan Police', state: 'compliant', sentToPoliceDate: new Date(2025, 11, 5), casesPerUnit: 12 },
        { name: 'Thames Valley Police', state: 'completed', sentToPoliceDate: new Date(2025, 11, 3), casesPerUnit: 37 },
        { name: 'Thames Valley Police', state: 'compliant', sentToPoliceDate: new Date(2025, 11, 3), casesPerUnit: 8 },
        { name: 'West Midlands Police', state: 'completed', sentToPoliceDate: new Date(2025, 11, 1), casesPerUnit: 3 },
        { name: 'West Midlands Police', state: 'compliant', sentToPoliceDate: new Date(2025, 11, 1), casesPerUnit: 1 }
      ]
    },
    {
      name: 'December 2025',
      year: 2025,
      month: 11, // 0-indexed, so 11 = December
      policeUnits: [
        { name: 'Metropolitan Police', state: 'not-started', sentToPoliceDate: null, casesPerUnit: 37 },
        { name: 'Metropolitan Police', state: 'compliant', sentToPoliceDate: null, casesPerUnit: 15 },
        { name: 'Thames Valley Police', state: 'not-started', sentToPoliceDate: null, casesPerUnit: 1 },
        { name: 'Thames Valley Police', state: 'in-progress', sentToPoliceDate: new Date(2026, 0, 1), casesPerUnit: 1 },
        { name: 'Thames Valley Police', state: 'completed', sentToPoliceDate: new Date(2026, 0, 1), casesPerUnit: 1 },
        { name: 'Thames Valley Police', state: 'compliant', sentToPoliceDate: new Date(2026, 0, 1), casesPerUnit: 5 },
        { name: 'West Midlands Police', state: 'completed', sentToPoliceDate: new Date(2025, 11, 25), casesPerUnit: 26 },
        { name: 'West Midlands Police', state: 'compliant', sentToPoliceDate: new Date(2025, 11, 25), casesPerUnit: 4 }
      ]
    }
  ];

  // CPS unit to assign cases to (unit 3 is commonly used by test users)
  const cpsUnitId = 3;

  // Fetch police unit records by name to get their IDs
  const policeUnitRecords = await prisma.policeUnit.findMany({
    where: { name: { in: ['Metropolitan Police', 'Thames Valley Police', 'West Midlands Police'] } }
  });
  const policeUnitMap = Object.fromEntries(policeUnitRecords.map(pu => [pu.name, pu.id]));

  let totalCreated = 0;

  for (const monthConfig of monthConfigs) {
    let monthCaseCount = 0;

    for (const policeUnitConfig of monthConfig.policeUnits) {
      const policeUnitName = policeUnitConfig.name;
      const policeUnitId = policeUnitMap[policeUnitName];
      const state = policeUnitConfig.state;
      const sentToPoliceDate = policeUnitConfig.sentToPoliceDate;
      const casesPerUnit = policeUnitConfig.casesPerUnit;

      // Create dedicated cases for this police unit
      for (let i = 0; i < casesPerUnit; i++) {
        // Create a new case specifically for DGA
        const newCase = await prisma.case.create({
          data: {
            reference: generateCaseReference(),
            complexity: faker.helpers.arrayElement(complexities),
            type: faker.helpers.arrayElement(types),
            unitId: cpsUnitId,
            policeUnitId: policeUnitId,
            defendants: { connect: { id: faker.helpers.arrayElement(defendants).id } },
            location: {
              create: {
                name: faker.company.name(),
                line1: faker.location.streetAddress(),
                line2: faker.location.secondaryAddress(),
                town: faker.helpers.arrayElement(ukCities),
                postcode: faker.location.zipCode("WD# #SF"),
              },
            },
          }
        });

        // Set review date to random day in the month
        const maxDay = getMaxDaysInMonth(monthConfig.year, monthConfig.month);
        const reviewDate = new Date(
          monthConfig.year,
          monthConfig.month,
          faker.number.int({ min: 1, max: maxDay })
        );

        // Only non-compliant cases get a deadline for recording dispute outcomes
        const isCompliant = state === 'compliant';
        const recordDisputeOutcomesDeadline = isCompliant ? null : calculateDeadline(reviewDate);

        // Create DGA
        const dga = await prisma.dGA.create({
          data: {
            caseId: newCase.id,
            reason: faker.lorem.sentence(),
            reviewDate: reviewDate,
            recordDisputeOutcomesDeadline: recordDisputeOutcomesDeadline,
            sentToPoliceDate: sentToPoliceDate,
          },
        });

        // Compliant cases have no failure reasons
        if (isCompliant) {
          monthCaseCount++;
          continue;
        }

        // Create 1-5 failure reasons for non-compliant cases
        const numFailureReasons = faker.number.int({ min: 1, max: 5 });
        const selectedReasons = faker.helpers.arrayElements(failureReasonsList, numFailureReasons);

        for (const reason of selectedReasons) {
          let didPoliceDisputeFailure = null;
          let didCpsAcceptDispute = null;

          const shouldHaveOutcome = state === 'completed' || (state === 'in-progress' && faker.datatype.boolean());

          if (shouldHaveOutcome) {
            didPoliceDisputeFailure = faker.helpers.arrayElement(['Yes', 'No']);
            if (didPoliceDisputeFailure === 'Yes') {
              didCpsAcceptDispute = faker.helpers.arrayElement(['Yes', 'No']);
            }
          }

          await prisma.dGAFailureReason.create({
            data: {
              dgaId: dga.id,
              reason: reason,
              didPoliceDisputeFailure: didPoliceDisputeFailure,
              didCpsAcceptDispute: didCpsAcceptDispute,
              details: failureReasonDetails[reason] || null,
              reasonForOutcome: didPoliceDisputeFailure === 'Yes' ? faker.lorem.paragraph() : null,
              discussionMethods: didPoliceDisputeFailure === 'Yes'
                ? faker.helpers.arrayElements(['Email', 'Phone', 'Letter'], faker.number.int({ min: 1, max: 2 })).join(', ')
                : null
            }
          });
        }

        monthCaseCount++;
      }
    }

    totalCreated += monthCaseCount;
  }

  return totalCreated;
}

module.exports = {
  seedDGAMonths
};
