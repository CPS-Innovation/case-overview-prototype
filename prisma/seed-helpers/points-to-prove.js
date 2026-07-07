const { faker } = require("@faker-js/faker");
const pointsToProveByChargeCode = require("../../app/data/points-to-prove.js");
const statuses = require("../../app/data/case-statuses.js");

// Seeds PointToProve rows for charges belonging to CHARGED defendants only,
// using the legal elements defined per charge code in
// app/data/points-to-prove.js. Runs after all case-generation seeders so it
// picks up charges created anywhere in the seed process, without each
// seed-helper having to create them individually.
//
// Charges for defendants who aren't yet CHARGED (NOT_CHARGED/CHARGES_PENDING)
// deliberately get no points-to-prove — those charges exist only to carry
// custody/statutory time limit dates, and the review offences panel uses
// "has points-to-prove" to decide whether an offence has been confirmed.
async function seedPointsToProve(prisma) {
  const charges = await prisma.charge.findMany({
    where: { defendant: { status: statuses.CHARGED } },
    select: { id: true, chargeCode: true }
  });

  const rows = [];
  charges.forEach(charge => {
    const descriptions = pointsToProveByChargeCode[charge.chargeCode];
    if (!descriptions) return;

    descriptions.forEach((description, index) => {
      rows.push({
        chargeId: charge.id,
        description,
        order: index,
        strength: faker.helpers.weightedArrayElement([
          { value: "Strong", weight: 3 },
          { value: "Weak", weight: 2 },
          { value: "Unknown", weight: 3 }
        ])
      });
    });
  });

  if (rows.length) {
    await prisma.pointToProve.createMany({ data: rows });
  }

  return rows.length;
}

module.exports = { seedPointsToProve };
