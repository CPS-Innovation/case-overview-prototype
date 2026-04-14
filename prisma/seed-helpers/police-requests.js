const { faker } = require('@faker-js/faker');

const ITEM_DESCRIPTIONS = [
  'Missing MG3',
  'No disclosure schedule (MG6C)',
  'No supervisors\' comments',
  'Missing suspect\'s previous convictions',
  'CCTV footage not provided',
  'Body-worn camera footage missing',
  'Witness statements incomplete',
  'Medical report not provided',
  'No summary of interview',
  'Missing exhibits list',
  'Third party material not provided',
  'Missing victim impact statement',
  'Forensic report not included',
  'No DV checklist',
  'Missing MG11s'
];

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function seedPoliceRequests(prisma) {
  const allCases = await prisma.case.findMany({
    select: { id: true },
    skip: 50,
    take: 200,
  });

  const shuffled = faker.helpers.shuffle(allCases);
  const selectedCases = shuffled.slice(0, 60);

  let count = 0;

  for (let i = 0; i < selectedCases.length; i++) {
    const caseId = selectedCases[i].id;
    const scenario = i % 5;

    if (scenario === 0) {
      // Sent: future deadline, no items received
      const sentDate = daysAgo(faker.number.int({ min: 5, max: 14 }));
      const deadline = daysFromNow(faker.number.int({ min: 7, max: 21 }));
      const items = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate,
          deadline,
          items: { create: items.map(description => ({ description })) },
        },
      });
      count++;
    } else if (scenario === 1) {
      // Overdue: past deadline, no items received
      const sentDate = daysAgo(faker.number.int({ min: 28, max: 56 }));
      const deadline = daysAgo(faker.number.int({ min: 7, max: 21 }));
      const items = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 5 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate,
          deadline,
          items: { create: items.map(description => ({ description })) },
        },
      });
      count++;
    } else if (scenario === 2) {
      // Partially received
      const sentDate = daysAgo(faker.number.int({ min: 14, max: 28 }));
      const deadline = daysFromNow(faker.number.int({ min: 3, max: 14 }));
      const allItems = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 3, max: 5 }));
      const receivedCount = Math.ceil(allItems.length / 2);
      const receivedDate = daysAgo(faker.number.int({ min: 2, max: 7 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate,
          deadline,
          items: {
            create: allItems.map((description, idx) => ({
              description,
              receivedDate: idx < receivedCount ? receivedDate : null,
            })),
          },
        },
      });
      count++;
    } else if (scenario === 3) {
      // All received
      const sentDate = daysAgo(faker.number.int({ min: 21, max: 42 }));
      const deadline = new Date(sentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
      const receivedDate = daysAgo(faker.number.int({ min: 3, max: 14 }));
      const items = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate,
          deadline,
          items: { create: items.map(description => ({ description, receivedDate })) },
        },
      });
      count++;
    } else {
      // Multiple requests: one received, one outstanding
      const sent1 = daysAgo(60);
      const deadline1 = new Date(sent1.getTime() + 14 * 24 * 60 * 60 * 1000);
      const received1 = new Date(sent1.getTime() + 10 * 24 * 60 * 60 * 1000);
      const items1 = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 3 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate: sent1,
          deadline: deadline1,
          items: { create: items1.map(description => ({ description, receivedDate: received1 })) },
        },
      });

      const sent2 = daysAgo(faker.number.int({ min: 5, max: 14 }));
      const deadline2 = daysFromNow(faker.number.int({ min: 7, max: 14 }));
      const items2 = faker.helpers.arrayElements(ITEM_DESCRIPTIONS, faker.number.int({ min: 2, max: 4 }));

      await prisma.policeRequest.create({
        data: {
          caseId,
          sentDate: sent2,
          deadline: deadline2,
          items: { create: items2.map(description => ({ description })) },
        },
      });
      count += 2;
    }
  }

  return count;
}

module.exports = { seedPoliceRequests };
