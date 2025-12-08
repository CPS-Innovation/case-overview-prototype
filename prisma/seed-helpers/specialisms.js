const specialisms = require('../../app/data/specialisms.js');

async function seedSpecialisms(prisma) {
  await prisma.specialism.createMany({
    data: specialisms.map((name) => ({ name }))
  });
  console.log('✅ Specialisms seeded');
}

module.exports = {
  seedSpecialisms
};
