const selfsigned = require('selfsigned');
const fs = require('fs');

(function () {
  let pathCertificates = './certificates/';
  let filenameCertificate = 'ubii.cert.pem';
  let filenamePublic = 'ubii.public-key.pem';
  let filenamePrivate = 'ubii.private-key.pem';

  /*if (
    fs.existsSync(pathCertificates + filenameCertificate) &&
    fs.existsSync(pathCertificates + filenamePublic) &&
    fs.existsSync(pathCertificates + filenamePrivate)
  ) {
    console.info('All certification files already exist. Aborting.');
    return;
  }*/

  let selfsigned = require('selfsigned');
  let attrs = [
    { name: 'commonName', value: 'ubii' },
    { name: 'countryName', value: 'DE' },
    { shortName: 'ST', value: 'Bavaria' },
    { name: 'localityName', value: 'Garching' },
    { name: 'organizationName', value: 'TUM-FAR' },
    { shortName: 'OU', value: 'Test' },
  ];

  let options = {
    days: 365,
    extensions: [
      { name: 'basicConstraints', cA: true },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 6 /* URI */, value: 'https://192.168.178.37:8102/' },
          { type: 6 /* URI */, value: 'https://192.168.178.37/' },
          { type: 6 /* URI */, value: 'https://localhost:12345/' },
          { type: 6 /* URI */, value: 'https://localhost:8102/' },
          { type: 6 /* URI */, value: 'https://localhost:8102/services' },
          { type: 6 /* URI */, value: 'https://localhost' },
          { type: 6 /* URI */, value: 'localhost' },
          { type: 6 /* URI */, value: '192.168.178.37' },
        ],
      },
    ],
  };
  let pems = selfsigned.generate(attrs, options);

  try {
    fs.writeFileSync(pathCertificates + filenameCertificate, pems.cert);
    fs.writeFileSync(pathCertificates + filenamePublic, pems.public);
    fs.writeFileSync(pathCertificates + filenamePrivate, pems.private);
    console.info('All files written.');
  } catch (error) {
    console.info(error);
  }
})();
