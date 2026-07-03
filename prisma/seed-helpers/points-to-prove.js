const { faker } = require("@faker-js/faker");
const pointsToProveByChargeCode = require("../../app/data/points-to-prove.js");

// Seeds PointToProve rows for every Charge in the database, using the legal
// elements defined per charge code in app/data/points-to-prove.js. Runs after
// all case-generation seeders so it picks up charges created anywhere in the
// seed process, without each seed-helper having to create them individually.
async function seedPointsToProve(prisma) {
  const charges = await prisma.charge.findMany({ select: { id: true, chargeCode: true } });

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
