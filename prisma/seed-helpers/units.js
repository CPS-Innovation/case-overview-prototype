const units = require('../../app/data/units.js');

/**
 * Maps unit names to their area names based on naming patterns
 */
function getAreaNameForUnit(unitName) {
  if (!unitName) return null;

  // Dorset
  if (unitName.includes('Dorset Magistrates Court')) {
    return 'Dorset';
  }

  // Hampshire and Isle of White
  if (
    unitName.includes('Hampshire Magistrates Court') ||
    unitName.includes('Wessex Crown Court') ||
    unitName.includes('Wessex RASSO') ||
    unitName.includes('Wessex CCU') ||
    unitName.includes('Wessex Fraud')
  ) {
    return 'Hampshire and Isle of White';
  }

  // Wiltshire
  if (unitName.includes('Wiltshire Magistrates Court')) {
    return 'Wiltshire';
  }

  // North Yorkshire
  if (
    unitName.includes('North Yorkshire Crown Court') ||
    unitName.includes('North Yorkshire Magistrates Court')
  ) {
    return 'North Yorkshire';
  }

  // South Yorkshire
  if (
    unitName.includes('South Yorkshire Crown Court') ||
    unitName.includes('South Yorkshire Magistrates Court')
  ) {
    return 'South Yorkshire';
  }

  // West Yorkshire
  if (
    unitName.includes('West Yorkshire Crown Court') ||
    unitName.includes('West Yorkshire Magistrates Court') ||
    unitName.includes('Yorkshire and Humberside CCU') ||
    unitName.includes('Yorkshire and Humberside RASSO')
  ) {
    return 'West Yorkshire';
  }

  // Humberside
  if (
    unitName.includes('Humberside South Yorkshire RASSO') ||
    unitName.includes('Humberside Crown Court') ||
    unitName.includes('Humberside Magistrates Court')
  ) {
    return 'Humberside';
  }

  return null;
}

async function seedUnits(prisma) {
  // First, create all units
  await prisma.unit.createMany({
    data: units.map(name => ({ name }))
  });
  console.log(`✅ ${units.length} units seeded`);

  // Then, link each unit to its area
  const areas = await prisma.area.findMany();
  const areaMap = new Map(areas.map(area => [area.name, area.id]));

  for (const unitName of units) {
    const areaName = getAreaNameForUnit(unitName);
    if (areaName && areaMap.has(areaName)) {
      await prisma.unit.updateMany({
        where: { name: unitName },
        data: { areaId: areaMap.get(areaName) }
      });
    }
  }
  console.log('✅ Units linked to areas');
}

module.exports = {
  seedUnits
};
