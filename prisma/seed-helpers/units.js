const units = require('../../app/data/units.js');

async function seedUnits(prisma) {
  await prisma.unit.createMany({
    data: units.map(name => ({ name }))
  });
  console.log(`✅ ${units.length} units seeded`);
}

module.exports = {
  seedUnits
};
