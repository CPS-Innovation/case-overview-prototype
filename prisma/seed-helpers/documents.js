const { faker } = require('@faker-js/faker');

const photoTypes = ['JPG', 'PNG'];
const photoNames = ['Evidence photo', 'Scene photographs'];

// Written document names are mapped to the file types they would realistically
// be produced or exchanged as (e.g. call data records as spreadsheets), rather
// than a type picked at random, so the material list doesn't look jarring.
const writtenTypesByName = {
  'Police report': ['PDF'],
  'Witness statement': ['PDF', 'DOCX'],
  'Forensic analysis': ['PDF'],
  'Medical records': ['PDF'],
  'Phone records': ['PDF', 'XLSX'],
  'Bank statements': ['PDF', 'XLSX'],
  'Interview transcript': ['PDF', 'DOCX'],
  'Expert report': ['PDF', 'DOCX'],
  'Custody record': ['PDF'],
  'Chain of custody': ['PDF'],
  'Lab results': ['PDF'],
  'Search warrant': ['PDF'],
};

// Every case must have at least one video document and one photo document,
// since the review and document viewers render a single placeholder video
// for any MP4 document, and a single placeholder photo for any JPG/PNG document.
function generateDocumentsData(documentNames, documentTypes, numDocuments) {
  const writtenTypes = documentTypes.filter((t) => t !== 'MP4' && !photoTypes.includes(t));
  const documentsData = [];

  for (let d = 0; d < numDocuments; d++) {
    const baseName = faker.helpers.arrayElement(documentNames);
    let type;
    if (baseName === 'CCTV Footage') {
      type = 'MP4';
    } else if (photoNames.includes(baseName)) {
      type = faker.helpers.arrayElement(photoTypes);
    } else {
      type = faker.helpers.arrayElement(writtenTypesByName[baseName] || writtenTypes);
    }
    documentsData.push({
      name: `${baseName} ${d + 1}`,
      description: faker.helpers.arrayElement(['This is a random description', 'This is another random description', faker.lorem.sentence()]),
      type,
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

  if (!documentsData.some((doc) => photoTypes.includes(doc.type))) {
    documentsData.push({
      name: `Evidence photo ${numDocuments + 2}`,
      description: faker.helpers.arrayElement(['This is a random description', 'This is another random description', faker.lorem.sentence()]),
      type: 'JPG',
      size: faker.number.int({ min: 50, max: 5000 }),
    });
  }

  return documentsData;
}

module.exports = { generateDocumentsData };
