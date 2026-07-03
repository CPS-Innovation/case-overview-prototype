const { faker } = require('@faker-js/faker');

// Every case must have at least one video document, since the review and
// document viewers render a single placeholder video for any MP4 document.
function generateDocumentsData(documentNames, documentTypes, numDocuments) {
  const nonVideoTypes = documentTypes.filter((t) => t !== 'MP4');
  const documentsData = [];

  for (let d = 0; d < numDocuments; d++) {
    const baseName = faker.helpers.arrayElement(documentNames);
    documentsData.push({
      name: `${baseName} ${d + 1}`,
      description: faker.helpers.arrayElement(['This is a random description', 'This is another random description', faker.lorem.sentence()]),
      type: baseName === 'CCTV Footage' ? 'MP4' : faker.helpers.arrayElement(nonVideoTypes),
      size: faker.number.int({ min: 50, max: 5000 }),
    });
  }

  if (!documentsData.some((doc) => doc.type === 'MP4')) {
    documentsData.push({
      name: `CCTV Footage ${numDocuments + 1}`,
      description: faker.helpers.arrayElement(['This is a random description', 'This is another random description', faker.lorem.sentence()]),
      type: 'MP4',
      size: faker.number.int({ min: 50, max: 5000 }),
    });
  }

  return documentsData;
}

module.exports = { generateDocumentsData };
