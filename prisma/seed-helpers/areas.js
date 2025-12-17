const areas = require('../../app/data/areas.js');

async function seedAreas(prisma) {
  await prisma.area.createMany({
    data: areas.map((name) => ({ name }))
  });
  console.log('✅ Areas seeded');
}

module.exports = {
  seedAreas
};
