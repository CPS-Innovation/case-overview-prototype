async function seedPoliceUnits(prisma) {
  console.log('Seeding police units...');

  const policeUnitNames = [
    'Metropolitan Police',
    'West Midlands Police',
    'Greater Manchester Police',
    'Thames Valley Police',
    'Kent Police',
    'Essex Police',
    'Hampshire Constabulary',
    'West Yorkshire Police',
    'Surrey Police',
    'Sussex Police',
    'Merseyside Police',
    'Hertfordshire Constabulary'
  ];

  const policeUnits = [];

  for (const name of policeUnitNames) {
    const policeUnit = await prisma.policeUnit.create({
      data: { name }
    });
    policeUnits.push(policeUnit);
  }

  console.log(`✅ Created ${policeUnits.length} police units`);
  return policeUnits;
}

module.exports = { seedPoliceUnits };
